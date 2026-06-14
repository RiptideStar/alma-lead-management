from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.lead import Lead, LeadState
from app.models.user import User
from app.schemas.lead import LeadListResponse, LeadPatchRequest, LeadRead
from app.services import leads as lead_service
from app.services.email.factory import get_email_backend
from app.services.email.notifications import LeadEmailData, send_lead_emails
from app.services.storage.factory import get_storage

router = APIRouter(prefix="/leads")


def _build_storage_key(lead_id: uuid.UUID, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"{lead_id}.{ext}"


# ---- Public: create lead ----

@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(
    background_tasks: BackgroundTasks,
    first_name: str = Form(..., min_length=1, max_length=100),
    last_name: str = Form(..., min_length=1, max_length=100),
    email: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Defined as a sync `def` on purpose: FastAPI runs it in a threadpool, so the
    # blocking DB + file I/O below does not stall the event loop.
    settings = get_settings()

    # Validate email format (simple)
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Invalid email address")

    # Read file contents (sync read of the SpooledTemporaryFile)
    data = resume.file.read()
    size_bytes = len(data)

    # Validate file
    error = lead_service.validate_resume(
        filename=resume.filename or "",
        content_type=resume.content_type or "",
        size_bytes=size_bytes,
        max_bytes=settings.max_upload_size_bytes,
    )
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    # Store the file under a key derived from the lead id (stable + collision-free)
    storage = get_storage()
    lead_id = uuid.uuid4()
    storage_key = _build_storage_key(lead_id, resume.filename or "upload.bin")
    storage.save(storage_key, data, resume.content_type or "application/octet-stream")

    # Persist the lead, reusing the same id so the resume key matches the lead id
    lead = lead_service.create_lead(
        db,
        lead_id=lead_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        resume_filename=resume.filename or "upload",
        resume_content_type=resume.content_type or "application/octet-stream",
        resume_size_bytes=size_bytes,
        resume_storage_key=storage_key,
    )

    # --- CRITICAL: extract primitives BEFORE the session closes ---
    lead_email_data = LeadEmailData(
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        resume_filename=lead.resume_filename,
        created_at=lead.created_at.strftime("%Y-%m-%d %H:%M UTC") if lead.created_at else "",
    )

    email_backend = get_email_backend()

    # Schedule background emails — only primitives cross the session boundary
    background_tasks.add_task(
        send_lead_emails,
        email_backend,
        settings,
        lead_email_data,
    )

    return LeadRead.model_validate(lead)


# ---- Protected: list leads ----

@router.get("", response_model=LeadListResponse)
def list_leads(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    state: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if state and state not in (LeadState.PENDING.value, LeadState.REACHED_OUT.value):
        raise HTTPException(status_code=422, detail=f"Invalid state: {state}")

    items, total = lead_service.list_leads(db, skip=skip, limit=limit, state=state, search=search)
    return LeadListResponse(
        items=[LeadRead.model_validate(l) for l in items],
        total=total,
        skip=skip,
        limit=limit,
    )


# ---- Protected: get lead ----

@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadRead.model_validate(lead)


# ---- Protected: patch lead state ----

@router.patch("/{lead_id}", response_model=LeadRead)
def patch_lead(
    lead_id: uuid.UUID,
    body: LeadPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    try:
        updated = lead_service.patch_lead_state(db, lead, body.state, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return LeadRead.model_validate(updated)


# ---- Protected: download resume ----

@router.get("/{lead_id}/resume")
def download_resume(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    storage = get_storage()
    if not storage.exists(lead.resume_storage_key):
        raise HTTPException(status_code=404, detail="Resume file not found in storage")

    data = storage.open(lead.resume_storage_key)

    return StreamingResponse(
        io.BytesIO(data),
        media_type=lead.resume_content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{lead.resume_filename}"',
        },
    )

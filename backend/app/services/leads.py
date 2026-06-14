from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadState


ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "txt"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_resume(filename: str, content_type: str, size_bytes: int, max_bytes: int) -> Optional[str]:
    """Return an error string if invalid, else None."""
    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        return f"File type '.{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
    # Also check content type (but be permissive — browsers may send application/octet-stream)
    if content_type not in ALLOWED_CONTENT_TYPES and content_type != "application/octet-stream":
        # Soft check: if extension is fine, allow it (browser inconsistencies)
        pass
    if size_bytes > max_bytes:
        return f"File too large ({size_bytes} bytes). Max: {max_bytes} bytes."
    return None


def create_lead(
    db: Session,
    *,
    lead_id: Optional[uuid.UUID] = None,
    first_name: str,
    last_name: str,
    email: str,
    resume_filename: str,
    resume_content_type: str,
    resume_size_bytes: int,
    resume_storage_key: str,
) -> Lead:
    lead = Lead(
        id=lead_id or uuid.uuid4(),
        first_name=first_name,
        last_name=last_name,
        email=email,
        state=LeadState.PENDING.value,
        resume_filename=resume_filename,
        resume_content_type=resume_content_type,
        resume_size_bytes=resume_size_bytes,
        resume_storage_key=resume_storage_key,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead(db: Session, lead_id: uuid.UUID) -> Optional[Lead]:
    return db.get(Lead, lead_id)


def list_leads(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    state: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[List[Lead], int]:
    q = db.query(Lead)

    if state:
        q = q.filter(Lead.state == state)

    if search:
        term = f"%{search.lower()}%"
        q = q.filter(
            or_(
                func.lower(Lead.first_name).like(term),
                func.lower(Lead.last_name).like(term),
                func.lower(Lead.email).like(term),
            )
        )

    total = q.count()
    items = q.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def patch_lead_state(
    db: Session,
    lead: Lead,
    new_state: LeadState,
    actor_id: uuid.UUID,
) -> Lead:
    """
    Transition lead.state. Only PENDING -> REACHED_OUT is valid.
    Caller must check for 409 before calling (or handle the ValueError).
    """
    if lead.state == LeadState.REACHED_OUT.value:
        raise ValueError("Lead is already REACHED_OUT")
    if new_state != LeadState.REACHED_OUT:
        raise ValueError("Only PENDING -> REACHED_OUT transition is allowed")

    lead.state = LeadState.REACHED_OUT.value
    lead.reached_out_at = datetime.now(timezone.utc)
    lead.reached_out_by_id = actor_id
    # Manually set updated_at since onupdate won't fire without an explicit update on some dialects
    lead.updated_at = datetime.now(timezone.utc)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

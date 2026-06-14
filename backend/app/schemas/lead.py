from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.lead import LeadState


class LeadRead(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    state: str
    resume_filename: str
    resume_content_type: str
    resume_size_bytes: int
    created_at: datetime
    updated_at: datetime
    reached_out_at: Optional[datetime] = None
    # resume_storage_key intentionally excluded

    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    items: List[LeadRead]
    total: int
    skip: int
    limit: int


class LeadPatchRequest(BaseModel):
    state: LeadState

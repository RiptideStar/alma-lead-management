"""
Email notification logic for lead creation.

IMPORTANT: This module must NOT touch the database.
All lead data is passed in as plain primitives (a dict/dataclass), not ORM objects.
This is intentional — it runs in a BackgroundTask after the request-scoped DB
session has been closed.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from app.services.email.base import EmailBackend, EmailMessage

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates" / "email"


def _get_jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=True,
    )


@dataclass
class LeadEmailData:
    """Plain-primitive representation of a lead for email rendering."""
    first_name: str
    last_name: str
    email: str
    resume_filename: str
    created_at: str  # pre-formatted string


def send_lead_emails(
    backend: EmailBackend,
    settings,  # app.core.config.Settings
    lead_data: LeadEmailData,
) -> None:
    """
    Send two emails on lead creation:
    1. Prospect confirmation → lead_data.email
    2. Attorney notification → settings.lead_notification_email
    """
    env = _get_jinja_env()
    ctx = {
        "first_name": lead_data.first_name,
        "last_name": lead_data.last_name,
        "email": lead_data.email,
        "resume_filename": lead_data.resume_filename,
        "created_at": lead_data.created_at,
        "internal_app_url": settings.INTERNAL_APP_URL,
    }

    # --- 1. Prospect confirmation ---
    prospect_html = env.get_template("prospect_confirmation.html").render(**ctx)
    prospect_txt = env.get_template("prospect_confirmation.txt").render(**ctx)
    try:
        backend.send(
            EmailMessage(
                to=lead_data.email,
                subject="We received your application",
                html=prospect_html,
                text=prospect_txt,
                from_addr=settings.EMAIL_FROM,
            )
        )
    except Exception:
        logger.exception("Failed to send prospect confirmation email to %s", lead_data.email)

    # --- 2. Attorney notification ---
    attorney_html = env.get_template("attorney_notification.html").render(**ctx)
    attorney_txt = env.get_template("attorney_notification.txt").render(**ctx)
    notification_addr = settings.lead_notification_email
    try:
        backend.send(
            EmailMessage(
                to=notification_addr,
                subject=f"New lead: {lead_data.first_name} {lead_data.last_name}",
                html=attorney_html,
                text=attorney_txt,
                from_addr=settings.EMAIL_FROM,
            )
        )
    except Exception:
        logger.exception("Failed to send attorney notification email to %s", notification_addr)

from __future__ import annotations

import logging

from app.services.email.base import EmailBackend, EmailMessage

logger = logging.getLogger(__name__)


class ConsoleEmailBackend(EmailBackend):
    def send(self, message: EmailMessage) -> None:
        logger.info(
            "=== [ConsoleEmailBackend] ===\n"
            "To: %s\n"
            "Subject: %s\n"
            "--- TEXT ---\n%s\n"
            "--- HTML ---\n%s\n"
            "============",
            message.to,
            message.subject,
            message.text,
            message.html,
        )

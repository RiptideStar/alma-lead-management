from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.services.email.base import EmailBackend


@lru_cache
def get_email_backend() -> EmailBackend:
    settings = get_settings()
    backend = settings.EMAIL_BACKEND.lower()
    if backend == "smtp":
        from app.services.email.smtp_backend import SMTPEmailBackend
        return SMTPEmailBackend(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
            from_addr=settings.EMAIL_FROM,
        )
    elif backend == "console":
        from app.services.email.console_backend import ConsoleEmailBackend
        return ConsoleEmailBackend()
    else:
        raise ValueError(f"Unknown EMAIL_BACKEND: {backend!r}")

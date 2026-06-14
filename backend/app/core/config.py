from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database (native dev → compose `db` exposed on host port 5433; Docker overrides to db:5432)
    DATABASE_URL: str = "postgresql+psycopg://alma:alma@localhost:5433/alma"

    # Auth
    JWT_SECRET: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # Attorney seed
    ATTORNEY_EMAIL: str = "attorney@alma.com"
    ATTORNEY_PASSWORD: str = "almapassword"
    ATTORNEY_NAME: str = "Alex Attorney"

    # Email
    EMAIL_BACKEND: str = "smtp"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = False
    EMAIL_FROM: str = "Alma Leads <no-reply@alma.com>"
    LEAD_NOTIFICATION_EMAIL: str = ""

    # Storage
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Misc
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    INTERNAL_APP_URL: str = "http://localhost:3000/admin/leads"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def lead_notification_email(self) -> str:
        """Default to attorney email when empty."""
        return self.LEAD_NOTIFICATION_EMAIL.strip() or self.ATTORNEY_EMAIL

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()

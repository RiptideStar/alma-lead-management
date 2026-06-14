"""
Seed script: creates the attorney user if not present.
Idempotent — safe to run multiple times.

Usage:
  python -m app.seed                      (from backend/)
  Or called automatically via app lifespan.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_engine
from app.core.security import hash_password
from app.models.user import User

logger = logging.getLogger(__name__)


def seed(db: Session, settings=None) -> None:
    if settings is None:
        settings = get_settings()

    existing = db.query(User).filter(User.email == settings.ATTORNEY_EMAIL).first()
    if existing:
        logger.info("Attorney user already exists: %s", settings.ATTORNEY_EMAIL)
        return

    user = User(
        email=settings.ATTORNEY_EMAIL,
        name=settings.ATTORNEY_NAME,
        hashed_password=hash_password(settings.ATTORNEY_PASSWORD),
        is_active=True,
    )
    db.add(user)
    db.commit()
    logger.info("Seeded attorney user: %s", settings.ATTORNEY_EMAIL)


def run_seed() -> None:
    """Entry point for `python -m app.seed`."""
    from sqlalchemy.orm import sessionmaker
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        seed(db, settings)


if __name__ == "__main__":
    run_seed()

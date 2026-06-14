from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB engine, run seed. Shutdown: nothing."""
    settings = get_settings()
    init_engine(settings.DATABASE_URL)

    from app.seed import seed

    factory = get_session_factory()
    db = factory()
    try:
        seed(db, settings)
    except Exception:
        logger.exception("Seed failed (non-fatal)")
    finally:
        db.close()

    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Alma Lead Management API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS: allow configured origins (public form)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from app.api.routes.auth import router as auth_router
    from app.api.routes.health import router as health_router
    from app.api.routes.leads import router as leads_router

    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(leads_router, prefix="/api")

    return app


app = create_app()

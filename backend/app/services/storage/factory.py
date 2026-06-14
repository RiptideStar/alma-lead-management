from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.services.storage.base import StorageBackend


@lru_cache
def get_storage() -> StorageBackend:
    settings = get_settings()
    backend = settings.STORAGE_BACKEND.lower()
    if backend == "local":
        from app.services.storage.local import LocalStorageBackend
        return LocalStorageBackend(settings.UPLOAD_DIR)
    elif backend == "s3":
        from app.services.storage.s3 import S3StorageBackend
        bucket = getattr(settings, "S3_BUCKET", "alma-uploads")
        prefix = getattr(settings, "S3_PREFIX", "resumes/")
        return S3StorageBackend(bucket=bucket, prefix=prefix)
    else:
        raise ValueError(f"Unknown STORAGE_BACKEND: {backend!r}")

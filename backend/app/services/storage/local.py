from __future__ import annotations

import os
from pathlib import Path

from app.services.storage.base import StorageBackend


class LocalStorageBackend(StorageBackend):
    def __init__(self, upload_dir: str):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # key may include subdirs; keep it flat by using the key as filename
        return self.upload_dir / key

    def save(self, key: str, data: bytes, content_type: str) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def open(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def exists(self, key: str) -> bool:
        return self._path(key).exists()

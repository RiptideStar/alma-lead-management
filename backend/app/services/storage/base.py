from __future__ import annotations

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes, content_type: str) -> str:
        """Store data under key. Returns the key."""

    @abstractmethod
    def open(self, key: str) -> bytes:
        """Read and return file contents."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Return True if key exists."""

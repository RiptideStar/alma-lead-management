from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str
    from_addr: Optional[str] = None


class EmailBackend(ABC):
    @abstractmethod
    def send(self, message: EmailMessage) -> None:
        """Send an email."""

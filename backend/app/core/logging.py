from __future__ import annotations

import logging
import sys
from contextvars import ContextVar, Token
from typing import Sequence

from pythonjsonlogger import jsonlogger

from .config import get_settings

_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


class RequestIDFilter(logging.Filter):
    """Attach request_id (if available) to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_ctx.get() or "-"
        return True


class StaticFieldsFilter(logging.Filter):
    """Inject constant metadata into every JSON log entry."""

    def __init__(self, *, service: str, env: str, version: str) -> None:
        super().__init__()
        self._service = service
        self._env = env
        self._version = version

    def filter(self, record: logging.LogRecord) -> bool:
        record.service = self._service
        record.env = self._env
        record.version = self._version
        return True


def set_request_id(request_id: str | None) -> Token[str | None]:
    """Store the active request ID so logging can include it."""
    return _request_id_ctx.set(request_id)


def reset_request_id(token: Token[str | None]) -> None:
    """Restore the previous request ID at the end of a request."""
    _request_id_ctx.reset(token)


DEFAULT_KEYS: Sequence[str] = (
    "levelname",
    "asctime",
    "name",
    "message",
    "request_id",
    "service",
    "env",
    "version",
)


def _build_formatter() -> jsonlogger.JsonFormatter:
    format_str = " ".join(f"%({key})s" for key in DEFAULT_KEYS)
    return jsonlogger.JsonFormatter(format_str, rename_fields={"asctime": "timestamp"})


def init_logger() -> None:
    """Initialise root logging with structured JSON output."""
    settings = get_settings()
    root = logging.getLogger()

    if root.handlers:
        return  # Already configured.

    root.setLevel(settings.log_level.upper())

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_build_formatter())
    handler.addFilter(RequestIDFilter())
    handler.addFilter(
        StaticFieldsFilter(service=settings.app_name, env=settings.env, version=settings.version)
    )
    root.addHandler(handler)

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        child = logging.getLogger(name)
        child.handlers = root.handlers
        child.setLevel(root.level)

    logging.getLogger("httpx").setLevel(logging.WARNING)

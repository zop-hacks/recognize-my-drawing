from __future__ import annotations

import uuid
from typing import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from core.logging import reset_request_id, set_request_id


def _resolve_request_id(request: Request) -> str:
    header_val = request.headers.get("X-Request-ID")
    if header_val:
        return header_val
    return str(uuid.uuid4())


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Generate (or reuse) a request ID and expose it in logs and responses."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = _resolve_request_id(request)
        token = set_request_id(request_id)
        request.state.request_id = request_id

        try:
            response = await call_next(request)
        finally:
            reset_request_id(token)

        response.headers["X-Request-ID"] = request_id
        return response

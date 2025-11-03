import logging
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import status as st_status

from .exceptions import BaseAPIException

log = logging.getLogger(__name__)


def _request_id_from(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def to_problem_json(exc: BaseAPIException, request_id: str | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"error": {"code": exc.error_code, "message": exc.detail}}
    if request_id:
        payload["error"]["request_id"] = request_id
    return payload


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(BaseAPIException)
    async def base_api_exception_handler(request: Request, exc: BaseAPIException):
        log.warning(f"{exc.error_code}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=to_problem_json(exc, _request_id_from(request)),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        log.error("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=st_status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Unexpected server error",
                    "request_id": _request_id_from(request),
                }
            },
        )

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import AppError, ErrorResponse

logger = logging.getLogger(__name__)

_REQUEST_PARTS = {"body", "query", "path"}
_HTTP_CODES = {404: "not_found", 405: "method_not_allowed"}


def _error_response(status_code: int, detail: str, code: str) -> JSONResponse:
    body = ErrorResponse(detail=detail, code=code)
    return JSONResponse(status_code=status_code, content=body.model_dump())


def summarize_validation_errors(errors: Sequence[Any]) -> str:
    parts: list[str] = []
    for error in errors:
        loc = list(error["loc"])
        if loc and loc[0] in _REQUEST_PARTS:
            loc = loc[1:]
        message = str(error["msg"]).removeprefix("Value error, ")
        field = ".".join(str(part) for part in loc)
        parts.append(f"{field}: {message}" if field else message)
    return "; ".join(parts)


async def handle_app_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return _error_response(exc.status_code, exc.detail, exc.code)


async def handle_validation_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    return _error_response(422, summarize_validation_errors(exc.errors()), "validation_error")


async def handle_http_exception(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _HTTP_CODES.get(exc.status_code, "http_error")
    return _error_response(exc.status_code, str(exc.detail), code)


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return _error_response(500, "Internal server error", "internal_error")


def register_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(Exception, handle_unexpected_error)

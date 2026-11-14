"""Consistent error envelope: {"detail": str, "code": str, "errors": [...]}."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("campusloop")


class AppError(Exception):
    """Business-rule failure raised by service modules."""

    def __init__(self, message: str, status_code: int = 400, code: str = "bad_request", errors=None):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.errors = errors or []
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND, "not_found")


class ForbiddenError(AppError):
    def __init__(self, message: str = "You are not allowed to perform this action"):
        super().__init__(message, status.HTTP_403_FORBIDDEN, "forbidden")


class AuthError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "unauthorized")


class ConflictError(AppError):
    def __init__(self, message: str = "This action conflicts with the current state"):
        super().__init__(message, status.HTTP_409_CONFLICT, "conflict")


class ValidationError(AppError):
    def __init__(self, message: str = "Invalid input", errors=None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, "validation_error", errors)


def error_body(message: str, code: str = "error", errors=None) -> dict:
    return {"detail": message, "code": code, "errors": errors or []}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.message, exc.code, exc.errors),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        errors = [
            {"field": ".".join(str(part) for part in err.get("loc", []) if part != "body"),
             "message": err.get("msg", "Invalid value")}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_body("Please check the highlighted fields.", "validation_error", errors),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        code = "unauthorized" if exc.status_code == 401 else "http_error"
        if exc.status_code == 404:
            code = "not_found"
        if exc.status_code == 403:
            code = "forbidden"
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(status_code=exc.status_code, content=error_body(message, code))

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # pragma: no cover - safety net
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_body("Something went wrong on our side. Please try again.", "server_error"),
        )

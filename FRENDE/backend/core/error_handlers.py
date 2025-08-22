"""
Global exception handlers for the Frende backend application.
Provides consistent error response formatting and logging.
"""

import logging
import traceback
from typing import Dict, Any, Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import settings
from core.exceptions import (
    FrendeException, ValidationError, AuthenticationError, PermissionError,
    ResourceNotFoundError, DatabaseError, ExternalServiceError, RateLimitError,
    WebSocketError, ConfigurationError, AIError, FileUploadError, MatchError, TaskError
)
from core.logging_config import get_logger, log_error
from core.sentry import capture_exception, set_request_context

logger = get_logger("error")

def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a standardized error response"""
    response = {
        "error": error_code,
        "message": message,
        "status_code": status_code,
        "timestamp": None  # Will be set by logging
    }
    
    if details:
        response["details"] = details
    
    if request_id:
        response["request_id"] = request_id
    
    # Add additional context in development
    if settings.DEBUG:
        response["debug"] = {
            "environment": settings.ENVIRONMENT,
            "debug_mode": settings.DEBUG
        }
    
    return response

async def handle_frende_exception(request: Request, exc: FrendeException) -> JSONResponse:
    """Handle Frende custom exceptions"""
    # Get request ID from request state
    request_id = getattr(request.state, "request_id", None)
    user_id = getattr(request.state, "user_id", None)
    
    # Set request context for Sentry
    set_request_context(
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        user_id=user_id,
    )
    
    # Capture exception in Sentry
    capture_exception(exc, {
        "exception_type": type(exc).__name__,
        "error_code": exc.error_code,
        "status_code": exc.status_code,
    })
    
    # Log the error with context
    log_error(
        logger,
        exc,
        context={
            "request_id": request_id,
            "user_id": user_id,
            "path": request.url.path,
            "method": request.method,
            "client_ip": get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "status_code": exc.status_code,
            "error_code": exc.error_code
        }
    )
    
    # Create error response
    response_data = create_error_response(
        status_code=exc.status_code,
        error_code=exc.error_code,
        message=exc.message,
        details=exc.details,
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )

async def handle_validation_error(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle validation errors with field-specific details"""
    return await handle_frende_exception(request, exc)

async def handle_authentication_error(request: Request, exc: AuthenticationError) -> JSONResponse:
    """Handle authentication errors"""
    return await handle_frende_exception(request, exc)

async def handle_permission_error(request: Request, exc: PermissionError) -> JSONResponse:
    """Handle permission errors"""
    return await handle_frende_exception(request, exc)

async def handle_resource_not_found_error(request: Request, exc: ResourceNotFoundError) -> JSONResponse:
    """Handle resource not found errors"""
    return await handle_frende_exception(request, exc)

async def handle_database_error(request: Request, exc: DatabaseError) -> JSONResponse:
    """Handle database errors"""
    return await handle_frende_exception(request, exc)

async def handle_external_service_error(request: Request, exc: ExternalServiceError) -> JSONResponse:
    """Handle external service errors"""
    return await handle_frende_exception(request, exc)

async def handle_rate_limit_error(request: Request, exc: RateLimitError) -> JSONResponse:
    """Handle rate limit errors with retry information"""
    response_data = await handle_frende_exception(request, exc)
    
    # Add retry-after header if specified
    if exc.details.get("retry_after"):
        response_data.headers["Retry-After"] = str(exc.details["retry_after"])
    
    return response_data

async def handle_websocket_error(request: Request, exc: WebSocketError) -> JSONResponse:
    """Handle WebSocket errors"""
    return await handle_frende_exception(request, exc)

async def handle_configuration_error(request: Request, exc: ConfigurationError) -> JSONResponse:
    """Handle configuration errors"""
    return await handle_frende_exception(request, exc)

async def handle_ai_error(request: Request, exc: AIError) -> JSONResponse:
    """Handle AI service errors"""
    return await handle_frende_exception(request, exc)

async def handle_file_upload_error(request: Request, exc: FileUploadError) -> JSONResponse:
    """Handle file upload errors"""
    return await handle_frende_exception(request, exc)

async def handle_match_error(request: Request, exc: MatchError) -> JSONResponse:
    """Handle matching errors"""
    return await handle_frende_exception(request, exc)

async def handle_task_error(request: Request, exc: TaskError) -> JSONResponse:
    """Handle task errors"""
    return await handle_frende_exception(request, exc)

async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions"""
    request_id = getattr(request.state, "request_id", None)
    user_id = getattr(request.state, "user_id", None)
    
    # Log the error
    log_error(
        logger,
        exc,
        context={
            "request_id": request_id,
            "user_id": user_id,
            "path": request.url.path,
            "method": request.method,
            "client_ip": get_client_ip(request),
            "status_code": exc.status_code
        }
    )
    
    # Create error response
    response_data = create_error_response(
        status_code=exc.status_code,
        error_code="HTTP_ERROR",
        message=exc.detail,
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )

async def handle_starlette_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle Starlette HTTP exceptions"""
    request_id = getattr(request.state, "request_id", None)
    
    # Log the error
    log_error(
        logger,
        exc,
        context={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "client_ip": get_client_ip(request),
            "status_code": exc.status_code
        }
    )
    
    # Create error response
    response_data = create_error_response(
        status_code=exc.status_code,
        error_code="HTTP_ERROR",
        message=str(exc.detail),
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )

async def handle_generic_exception(request: Request, exc: Exception) -> JSONResponse:
    """Handle all other exceptions"""
    request_id = getattr(request.state, "request_id", None)
    user_id = getattr(request.state, "user_id", None)
    
    # Log the error with full traceback
    log_error(
        logger,
        exc,
        context={
            "request_id": request_id,
            "user_id": user_id,
            "path": request.url.path,
            "method": request.method,
            "client_ip": get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "traceback": traceback.format_exc()
        }
    )
    
    # Create error response
    message = "Internal server error"
    if settings.DEBUG:
        message = f"Internal server error: {str(exc)}"
    
    response_data = create_error_response(
        status_code=500,
        error_code="INTERNAL_SERVER_ERROR",
        message=message,
        request_id=request_id
    )
    
    # Add debug information in development
    if settings.DEBUG:
        response_data["debug"] = {
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc()
        }
    
    return JSONResponse(
        status_code=500,
        content=response_data
    )

def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for forwarded headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to client host
    return request.client.host if request.client else "unknown"

def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app"""
    
    # Register custom exception handlers
    app.add_exception_handler(ValidationError, handle_validation_error)
    app.add_exception_handler(AuthenticationError, handle_authentication_error)
    app.add_exception_handler(PermissionError, handle_permission_error)
    app.add_exception_handler(ResourceNotFoundError, handle_resource_not_found_error)
    app.add_exception_handler(DatabaseError, handle_database_error)
    app.add_exception_handler(ExternalServiceError, handle_external_service_error)
    app.add_exception_handler(RateLimitError, handle_rate_limit_error)
    app.add_exception_handler(WebSocketError, handle_websocket_error)
    app.add_exception_handler(ConfigurationError, handle_configuration_error)
    app.add_exception_handler(AIError, handle_ai_error)
    app.add_exception_handler(FileUploadError, handle_file_upload_error)
    app.add_exception_handler(MatchError, handle_match_error)
    app.add_exception_handler(TaskError, handle_task_error)
    
    # Register generic exception handlers
    app.add_exception_handler(HTTPException, handle_http_exception)
    app.add_exception_handler(StarletteHTTPException, handle_starlette_http_exception)
    app.add_exception_handler(Exception, handle_generic_exception)
    
    logger.info("Exception handlers registered successfully") 
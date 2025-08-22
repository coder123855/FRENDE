"""
Sentry configuration for the Frende backend application.
Provides error tracking, performance monitoring, and user context.
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
from typing import Optional, Dict, Any

from core.config import settings


def init_sentry() -> None:
    """Initialize Sentry SDK with configuration"""
    if not settings.SENTRY_DSN:
        return
    
    # Configure Sentry integrations
    integrations = [
        FastApiIntegration(),
        SqlalchemyIntegration(),
        HttpxIntegration(),
        LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR
        ),
    ]
    
    # Initialize Sentry SDK
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.APP_VERSION,
        debug=settings.DEBUG,
        traces_sample_rate=1.0 if settings.DEBUG else 0.1,
        profiles_sample_rate=1.0 if settings.DEBUG else 0.1,
        integrations=integrations,
        before_send=before_send,
        before_breadcrumb=before_breadcrumb,
    )


def before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter and modify events before sending to Sentry"""
    # Don't send events in development unless explicitly configured
    if settings.DEBUG and not settings.SENTRY_DEBUG_ENABLED:
        return None
    
    # Filter out certain error types if needed
    if "exception" in event:
        exception = event["exception"]["values"][0]
        if exception.get("type") in ["KeyboardInterrupt", "SystemExit"]:
            return None
    
    # Add custom context
    event.setdefault("tags", {})
    event["tags"]["service"] = "frende-backend"
    event["tags"]["deployment"] = settings.ENVIRONMENT
    
    return event


def before_breadcrumb(crumb: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter and modify breadcrumbs before sending to Sentry"""
    # Filter out sensitive data from breadcrumbs
    if "data" in crumb:
        sensitive_keys = ["password", "token", "secret", "key"]
        for key in sensitive_keys:
            if key in crumb["data"]:
                crumb["data"][key] = "[REDACTED]"
    
    return crumb


def set_user_context(user_id: Optional[int] = None, username: Optional[str] = None) -> None:
    """Set user context for Sentry events"""
    if user_id:
        sentry_sdk.set_user({
            "id": str(user_id),
            "username": username,
        })


def set_request_context(request_id: Optional[str] = None, **kwargs) -> None:
    """Set request context for Sentry events"""
    if request_id:
        sentry_sdk.set_tag("request_id", request_id)
    
    for key, value in kwargs.items():
        sentry_sdk.set_tag(key, value)


def capture_exception(error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
    """Capture an exception with additional context"""
    if context:
        with sentry_sdk.configure_scope() as scope:
            for key, value in context.items():
                scope.set_tag(key, value)
    
    sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", context: Optional[Dict[str, Any]] = None) -> None:
    """Capture a message with additional context"""
    if context:
        with sentry_sdk.configure_scope() as scope:
            for key, value in context.items():
                scope.set_tag(key, value)
    
    sentry_sdk.capture_message(message, level=level)


def start_transaction(name: str, operation: str = "http.request") -> Any:
    """Start a performance transaction"""
    return sentry_sdk.start_transaction(
        name=name,
        op=operation,
    )


def set_extra_context(key: str, value: Any) -> None:
    """Set extra context for Sentry events"""
    sentry_sdk.set_extra(key, value)

"""
Enhanced logging configuration for the Frende backend application.
Provides structured logging with environment-specific formats and multiple loggers.
"""

import logging
import logging.handlers
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

from core.config import settings

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "client_ip"):
            log_entry["client_ip"] = record.client_ip
        if hasattr(record, "response_time"):
            log_entry["response_time"] = record.response_time
        if hasattr(record, "status_code"):
            log_entry["status_code"] = record.status_code
        
        return json.dumps(log_entry)

class TextFormatter(logging.Formatter):
    """Text formatter for development logging"""
    
    def __init__(self):
        super().__init__(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    def format(self, record: logging.LogRecord) -> str:
        # Add extra context to message
        extra_info = []
        if hasattr(record, "user_id"):
            extra_info.append(f"user_id={record.user_id}")
        if hasattr(record, "request_id"):
            extra_info.append(f"request_id={record.request_id}")
        if hasattr(record, "client_ip"):
            extra_info.append(f"client_ip={record.client_ip}")
        if hasattr(record, "response_time"):
            extra_info.append(f"response_time={record.response_time}ms")
        if hasattr(record, "status_code"):
            extra_info.append(f"status_code={record.status_code}")
        
        if extra_info:
            record.msg = f"{record.msg} | {' | '.join(extra_info)}"
        
        return super().format(record)

def setup_logging() -> None:
    """Setup comprehensive logging configuration"""
    
    # Create logs directory if it doesn't exist
    if settings.LOG_FILE_PATH:
        log_path = Path(settings.LOG_FILE_PATH)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Determine log format based on environment
    if settings.is_production() or settings.LOG_FORMAT == "json":
        formatter = JSONFormatter()
    else:
        formatter = TextFormatter()
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.get_log_level())
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if configured)
    if settings.LOG_FILE_PATH:
        file_handler = logging.handlers.RotatingFileHandler(
            settings.LOG_FILE_PATH,
            maxBytes=settings.get_log_rotation_size_bytes(),
            backupCount=settings.LOG_ROTATION_COUNT
        )
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Configure specific loggers
    configure_component_loggers(formatter)

def configure_component_loggers(formatter: logging.Formatter) -> None:
    """Configure loggers for different components"""
    
    # API logger
    api_logger = logging.getLogger("api")
    api_logger.setLevel(settings.get_log_level())
    
    # Database logger
    db_logger = logging.getLogger("database")
    db_logger.setLevel(settings.get_log_level())
    
    # WebSocket logger
    ws_logger = logging.getLogger("websocket")
    ws_logger.setLevel(settings.get_log_level())
    
    # Security logger
    security_logger = logging.getLogger("security")
    security_logger.setLevel(settings.get_security_log_level())
    
    # Performance logger
    perf_logger = logging.getLogger("performance")
    perf_logger.setLevel(settings.get_log_level())
    
    # Error logger
    error_logger = logging.getLogger("error")
    error_logger.setLevel(settings.get_log_level())

def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name"""
    return logging.getLogger(name)

def log_with_context(logger: logging.Logger, level: int, message: str, **context: Any) -> None:
    """Log a message with additional context"""
    extra = {}
    for key, value in context.items():
        if hasattr(logging.LogRecord, key):
            # Use a different attribute name to avoid conflicts
            extra[f"extra_{key}"] = value
        else:
            extra[key] = value
    
    logger.log(level, message, extra=extra)

def log_request(logger: logging.Logger, request_id: str, method: str, path: str, 
                user_id: Optional[int] = None, client_ip: Optional[str] = None) -> None:
    """Log an incoming request"""
    log_with_context(
        logger, logging.INFO,
        f"Request: {method} {path}",
        request_id=request_id,
        user_id=user_id,
        client_ip=client_ip
    )

def log_response(logger: logging.Logger, request_id: str, status_code: int, 
                response_time: float, user_id: Optional[int] = None) -> None:
    """Log a response"""
    level = logging.WARNING if status_code >= 400 else logging.INFO
    log_with_context(
        logger, level,
        f"Response: {status_code} ({response_time:.2f}ms)",
        request_id=request_id,
        status_code=status_code,
        response_time=response_time,
        user_id=user_id
    )

def log_database_query(logger: logging.Logger, query: str, params: Dict[str, Any], 
                      execution_time: float, user_id: Optional[int] = None) -> None:
    """Log a database query"""
    level = logging.WARNING if execution_time > settings.SLOW_QUERY_THRESHOLD_MS else logging.DEBUG
    log_with_context(
        logger, level,
        f"Database query: {query[:100]}{'...' if len(query) > 100 else ''} ({execution_time:.2f}ms)",
        query=query,
        params=params,
        execution_time=execution_time,
        user_id=user_id
    )

def log_websocket_event(logger: logging.Logger, event_type: str, user_id: int, 
                       room_id: Optional[str] = None, message: Optional[str] = None) -> None:
    """Log a WebSocket event"""
    log_with_context(
        logger, logging.INFO,
        f"WebSocket {event_type}",
        event_type=event_type,
        user_id=user_id,
        room_id=room_id,
        message=message[:100] + "..." if message and len(message) > 100 else message
    )

def log_performance(logger: logging.Logger, operation: str, duration: float, 
                   user_id: Optional[int] = None, **context: Any) -> None:
    """Log performance metrics"""
    level = logging.WARNING if duration > settings.API_RESPONSE_TIME_THRESHOLD_MS else logging.INFO
    log_with_context(
        logger, level,
        f"Performance: {operation} took {duration:.2f}ms",
        operation=operation,
        duration=duration,
        user_id=user_id,
        **context
    )

def log_error(logger: logging.Logger, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
    """Log an error with context"""
    log_with_context(
        logger, logging.ERROR,
        f"Error: {str(error)}",
        error_type=type(error).__name__,
        error_message=str(error),
        **(context or {})
    ) 
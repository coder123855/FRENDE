"""
Custom exception classes for the Frende backend application.
Provides structured error handling with proper inheritance hierarchy.
"""

from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status

class FrendeException(Exception):
    """Base exception for all Frende application errors"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, 
                 status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.status_code = status_code
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON response"""
        return {
            "error": self.error_code,
            "message": self.message,
            "status_code": self.status_code,
            "details": self.details
        }

class ValidationError(FrendeException):
    """Raised when input validation fails"""
    
    def __init__(self, message: str, field: Optional[str] = None, 
                 invalid_value: Optional[Any] = None, valid_values: Optional[List[Any]] = None):
        details = {}
        if field:
            details["field"] = field
        if invalid_value is not None:
            details["invalid_value"] = invalid_value
        if valid_values:
            details["valid_values"] = valid_values
        
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class AuthenticationError(FrendeException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication failed", 
                 reason: Optional[str] = None):
        details = {}
        if reason:
            details["reason"] = reason
        
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )

class PermissionError(FrendeException):
    """Raised when user lacks permission to perform an action"""
    
    def __init__(self, message: str = "Permission denied", 
                 required_permission: Optional[str] = None,
                 user_permissions: Optional[List[str]] = None):
        details = {}
        if required_permission:
            details["required_permission"] = required_permission
        if user_permissions:
            details["user_permissions"] = user_permissions
        
        super().__init__(
            message=message,
            error_code="PERMISSION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )

class ResourceNotFoundError(FrendeException):
    """Raised when a requested resource is not found"""
    
    def __init__(self, message: str = "Resource not found", 
                 resource_type: Optional[str] = None,
                 resource_id: Optional[str] = None):
        details = {}
        if resource_type:
            details["resource_type"] = resource_type
        if resource_id:
            details["resource_id"] = resource_id
        
        super().__init__(
            message=message,
            error_code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )

class UserNotFoundError(ResourceNotFoundError):
    """Raised when a user is not found"""
    
    def __init__(self, message: str = "User not found", user_id: Optional[int] = None):
        super().__init__(
            message=message,
            resource_type="user",
            resource_id=str(user_id) if user_id else None
        )
        self.user_id = user_id

class MatchNotFoundError(ResourceNotFoundError):
    """Raised when a match is not found"""
    
    def __init__(self, message: str = "Match not found", match_id: Optional[int] = None):
        super().__init__(
            message=message,
            resource_type="match",
            resource_id=str(match_id) if match_id else None
        )
        self.match_id = match_id

class TaskNotFoundError(ResourceNotFoundError):
    """Raised when a task is not found"""
    
    def __init__(self, message: str = "Task not found", task_id: Optional[int] = None):
        super().__init__(
            message=message,
            resource_type="task",
            resource_id=str(task_id) if task_id else None
        )
        self.task_id = task_id

class DatabaseError(FrendeException):
    """Raised when database operations fail"""
    
    def __init__(self, message: str = "Database operation failed", 
                 operation: Optional[str] = None,
                 table: Optional[str] = None,
                 constraint: Optional[str] = None):
        details = {}
        if operation:
            details["operation"] = operation
        if table:
            details["table"] = table
        if constraint:
            details["constraint"] = constraint
        
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

class ExternalServiceError(FrendeException):
    """Raised when external service calls fail"""
    
    def __init__(self, message: str = "External service error", 
                 service: Optional[str] = None,
                 endpoint: Optional[str] = None,
                 status_code: Optional[int] = None):
        details = {}
        if service:
            details["service"] = service
        if endpoint:
            details["endpoint"] = endpoint
        if status_code:
            details["external_status_code"] = status_code
        
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )

class RateLimitError(FrendeException):
    """Raised when rate limiting is exceeded"""
    
    def __init__(self, message: str = "Rate limit exceeded", 
                 limit: Optional[int] = None,
                 window: Optional[str] = None,
                 retry_after: Optional[int] = None):
        details = {}
        if limit:
            details["limit"] = limit
        if window:
            details["window"] = window
        if retry_after:
            details["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_ERROR",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details
        )

class WebSocketError(FrendeException):
    """Raised when WebSocket operations fail"""
    
    def __init__(self, message: str = "WebSocket error", 
                 event_type: Optional[str] = None,
                 room_id: Optional[str] = None,
                 user_id: Optional[int] = None):
        details = {}
        if event_type:
            details["event_type"] = event_type
        if room_id:
            details["room_id"] = room_id
        if user_id:
            details["user_id"] = user_id
        
        super().__init__(
            message=message,
            error_code="WEBSOCKET_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class ConfigurationError(FrendeException):
    """Raised when configuration is invalid or missing"""
    
    def __init__(self, message: str = "Configuration error", 
                 missing_keys: Optional[List[str]] = None,
                 invalid_values: Optional[Dict[str, Any]] = None):
        details = {}
        if missing_keys:
            details["missing_keys"] = missing_keys
        if invalid_values:
            details["invalid_values"] = invalid_values
        
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

class AIError(FrendeException):
    """Raised when AI service operations fail"""
    
    def __init__(self, message: str = "AI service error", 
                 service: Optional[str] = None,
                 prompt: Optional[str] = None,
                 tokens_used: Optional[int] = None):
        details = {}
        if service:
            details["service"] = service
        if prompt:
            details["prompt"] = prompt[:100] + "..." if len(prompt) > 100 else prompt
        if tokens_used:
            details["tokens_used"] = tokens_used
        
        super().__init__(
            message=message,
            error_code="AI_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

class FileUploadError(FrendeException):
    """Raised when file upload operations fail"""
    
    def __init__(self, message: str = "File upload error", 
                 file_name: Optional[str] = None,
                 file_size: Optional[int] = None,
                 allowed_types: Optional[List[str]] = None,
                 max_size: Optional[int] = None):
        details = {}
        if file_name:
            details["file_name"] = file_name
        if file_size:
            details["file_size"] = file_size
        if allowed_types:
            details["allowed_types"] = allowed_types
        if max_size:
            details["max_size"] = max_size
        
        super().__init__(
            message=message,
            error_code="FILE_UPLOAD_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class MatchError(FrendeException):
    """Raised when matching operations fail"""
    
    def __init__(self, message: str = "Matching error", 
                 user_id: Optional[int] = None,
                 match_id: Optional[int] = None,
                 reason: Optional[str] = None):
        details = {}
        if user_id:
            details["user_id"] = user_id
        if match_id:
            details["match_id"] = match_id
        if reason:
            details["reason"] = reason
        
        super().__init__(
            message=message,
            error_code="MATCH_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class TaskError(FrendeException):
    """Raised when task-related operations fail"""
    def __init__(self, message: str, task_id: Optional[int] = None, match_id: Optional[int] = None):
        super().__init__(message)
        self.task_id = task_id
        self.match_id = match_id

class InsufficientCoinsError(FrendeException):
    """Raised when user doesn't have enough coins for an operation"""
    def __init__(self, message: str, required_coins: Optional[int] = None, current_coins: Optional[int] = None):
        super().__init__(message)
        self.required_coins = required_coins
        self.current_coins = current_coins

class NoAvailableSlotsError(FrendeException):
    """Raised when user has no available slots for matching"""
    def __init__(self, message: str, user_id: Optional[int] = None):
        super().__init__(message)
        self.user_id = user_id

class MatchNotPendingError(FrendeException):
    """Raised when trying to accept/reject a match that's not in pending status"""
    def __init__(self, message: str, match_id: Optional[int] = None):
        super().__init__(message)
        self.match_id = match_id

class UserNotInMatchError(FrendeException):
    """Raised when a user tries to perform an operation on a match they're not part of"""
    def __init__(self, message: str, user_id: Optional[int] = None, match_id: Optional[int] = None):
        super().__init__(message)
        self.user_id = user_id
        self.match_id = match_id

class MatchRequestNotFoundError(ResourceNotFoundError):
    """Raised when a match request is not found"""
    
    def __init__(self, message: str = "Match request not found", request_id: Optional[int] = None):
        super().__init__(
            message=message,
            resource_type="match_request",
            resource_id=str(request_id) if request_id else None
        )
        self.request_id = request_id

class DuplicateRequestError(FrendeException):
    """Raised when trying to create a duplicate match request"""
    
    def __init__(self, message: str = "Duplicate match request", 
                 sender_id: Optional[int] = None,
                 receiver_id: Optional[int] = None):
        details = {}
        if sender_id:
            details["sender_id"] = sender_id
        if receiver_id:
            details["receiver_id"] = receiver_id
        
        super().__init__(
            message=message,
            error_code="DUPLICATE_REQUEST_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class QueueEntryNotFoundError(ResourceNotFoundError):
    """Raised when a queue entry is not found"""
    
    def __init__(self, message: str = "Queue entry not found", user_id: Optional[int] = None):
        super().__init__(
            message=message,
            resource_type="queue_entry",
            resource_id=str(user_id) if user_id else None
        )
        self.user_id = user_id

# Exception mapping for common HTTP status codes
EXCEPTION_MAPPING = {
    400: ValidationError,
    401: AuthenticationError,
    403: PermissionError,
    404: ResourceNotFoundError,
    429: RateLimitError,
    500: DatabaseError,
    502: ExternalServiceError,
} 
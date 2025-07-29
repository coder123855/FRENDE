"""
Combined middleware stack for the Frende backend application.
Integrates all middleware components in the correct order.
"""

from starlette.types import ASGIApp

from core.security_middleware import create_security_middleware_stack
from core.logging_middleware import create_logging_middleware_stack

def create_middleware_stack(app: ASGIApp) -> ASGIApp:
    """
    Create a complete middleware stack with all components.
    
    Order of middleware (last applied = first executed):
    1. Logging middleware (RequestID, UserContext, RequestSize, Performance, Logging)
    2. Security middleware (SecurityHeaders, RateLimit, RequestSize, SecurityMonitoring, CORSValidation)
    3. CORS middleware (applied separately in main.py)
    """
    
    # Apply logging middleware first (innermost)
    app = create_logging_middleware_stack(app)
    
    # Apply security middleware (outermost)
    app = create_security_middleware_stack(app)
    
    return app 
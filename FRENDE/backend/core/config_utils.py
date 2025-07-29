"""
Configuration utilities for the Frende backend application.
Provides helper functions for environment detection, configuration validation,
and testing utilities.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
from core.config import settings

logger = logging.getLogger(__name__)

def get_environment_info() -> Dict[str, Any]:
    """
    Get comprehensive environment information for debugging and monitoring.
    
    Returns:
        Dict containing environment information
    """
    return {
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "host": settings.HOST,
        "port": settings.PORT,
        "database_url": _mask_sensitive_data(settings.DATABASE_URL),
        "log_level": settings.LOG_LEVEL,
        "log_format": settings.LOG_FORMAT,
        "cors_origins": settings.CORS_ORIGINS,
        "ai_configured": bool(settings.GEMINI_API_KEY),
        "websocket_configured": True,
        "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
        "platform": os.sys.platform,
    }

def validate_required_config() -> List[str]:
    """
    Validate that all required configuration is present.
    
    Returns:
        List of validation errors (empty if all valid)
    """
    errors = []
    
    # Check required environment variables
    if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "your-secret-key-change-in-production":
        if settings.is_production():
            errors.append("JWT_SECRET_KEY must be set in production")
    
    # Check database configuration
    if settings.is_production() and settings.DATABASE_URL.startswith("sqlite"):
        errors.append("SQLite is not allowed in production. Use PostgreSQL.")
    
    # Check CORS configuration
    if settings.is_production():
        https_origins = [origin for origin in settings.CORS_ORIGINS if origin.startswith("https://")]
        if not https_origins:
            errors.append("Production must use HTTPS CORS origins")
    
    # Check AI configuration (optional but recommended)
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set - AI features will be disabled")
    
    return errors

def validate_database_connection() -> bool:
    """
    Validate database connection configuration.
    
    Returns:
        True if database configuration is valid
    """
    try:
        from core.database import engine
        # Test connection by creating a simple query
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database connection validation failed: {e}")
        return False

def get_config_summary() -> Dict[str, Any]:
    """
    Get a summary of current configuration for logging and monitoring.
    
    Returns:
        Dict containing configuration summary
    """
    return {
        "environment": settings.ENVIRONMENT,
        "debug_mode": settings.DEBUG,
        "database_type": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql",
        "ai_enabled": bool(settings.GEMINI_API_KEY),
        "logging_level": settings.LOG_LEVEL,
        "cors_origins_count": len(settings.CORS_ORIGINS),
        "websocket_enabled": True,
        "task_system": {
            "max_tasks_per_match": settings.MAX_TASKS_PER_MATCH,
            "task_expiration_hours": settings.TASK_EXPIRATION_HOURS,
        },
        "matching_system": {
            "match_expiration_days": settings.MATCH_EXPIRATION_DAYS,
            "min_compatibility_score": settings.MIN_COMPATIBILITY_SCORE,
        },
        "coin_system": {
            "coins_per_task": settings.COINS_PER_TASK,
            "coins_per_slot": settings.COINS_PER_SLOT,
        }
    }

def _mask_sensitive_data(value: str) -> str:
    """
    Mask sensitive data in configuration values for logging.
    
    Args:
        value: The value to mask
        
    Returns:
        Masked value safe for logging
    """
    if not value:
        return value
    
    # Mask database passwords
    if "://" in value and "@" in value:
        parts = value.split("@")
        if len(parts) == 2:
            protocol_part = parts[0]
            host_part = parts[1]
            if ":" in protocol_part:
                protocol, credentials = protocol_part.split("://", 1)
                if ":" in credentials:
                    username, password = credentials.split(":", 1)
                    masked_credentials = f"{username}:***"
                    return f"{protocol}://{masked_credentials}@{host_part}"
    
    # Mask API keys
    if "api_key" in value.lower() or "secret" in value.lower():
        if len(value) > 8:
            return f"{value[:4]}***{value[-4:]}"
        return "***"
    
    return value

def create_env_file_template(output_path: str = ".env") -> bool:
    """
    Create a .env file from the template.
    
    Args:
        output_path: Path to create the .env file
        
    Returns:
        True if file was created successfully
    """
    try:
        template_path = "env.example"
        if not Path(template_path).exists():
            logger.error(f"Template file {template_path} not found")
            return False
        
        with open(template_path, 'r') as template_file:
            template_content = template_file.read()
        
        with open(output_path, 'w') as env_file:
            env_file.write(template_content)
        
        logger.info(f"Created {output_path} from template")
        return True
    except Exception as e:
        logger.error(f"Failed to create {output_path}: {e}")
        return False

def check_environment_setup() -> Dict[str, Any]:
    """
    Comprehensive environment setup check.
    
    Returns:
        Dict containing setup status and any issues
    """
    status = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "info": {}
    }
    
    # Check for .env file
    if not Path(".env").exists():
        status["warnings"].append(".env file not found - using default values")
    
    # Validate required configuration
    validation_errors = validate_required_config()
    if validation_errors:
        status["errors"].extend(validation_errors)
        status["valid"] = False
    
    # Check database connection
    if not validate_database_connection():
        status["errors"].append("Database connection failed")
        status["valid"] = False
    
    # Check AI configuration
    if not settings.GEMINI_API_KEY:
        status["warnings"].append("AI features will be disabled - GEMINI_API_KEY not set")
    
    # Check production settings
    if settings.is_production():
        if settings.DEBUG:
            status["warnings"].append("Debug mode enabled in production")
        if not settings.LOG_FILE_PATH:
            status["warnings"].append("No log file specified for production")
    
    # Add environment info
    status["info"] = get_config_summary()
    
    return status

def get_feature_flags() -> Dict[str, bool]:
    """
    Get feature flags based on configuration.
    
    Returns:
        Dict of feature flags and their enabled status
    """
    return {
        "ai_enabled": bool(settings.GEMINI_API_KEY),
        "websocket_enabled": True,
        "email_enabled": bool(settings.EMAIL_SERVICE_URL and settings.EMAIL_API_KEY),
        "file_storage_enabled": bool(settings.FILE_STORAGE_URL and settings.FILE_STORAGE_API_KEY),
        "monitoring_enabled": bool(settings.MONITORING_API_KEY),
        "sentry_enabled": bool(settings.SENTRY_DSN),
        "debug_mode": settings.DEBUG,
        "production_mode": settings.is_production(),
    }

def log_configuration_startup():
    """
    Log configuration information at startup.
    """
    logger.info("=== Frende Backend Configuration ===")
    
    # Log environment info
    env_info = get_environment_info()
    for key, value in env_info.items():
        logger.info(f"{key}: {value}")
    
    # Log feature flags
    feature_flags = get_feature_flags()
    logger.info("=== Feature Flags ===")
    for feature, enabled in feature_flags.items():
        status = "✓" if enabled else "✗"
        logger.info(f"{status} {feature}")
    
    # Log validation results
    validation_errors = validate_required_config()
    if validation_errors:
        logger.error("=== Configuration Validation Errors ===")
        for error in validation_errors:
            logger.error(f"  - {error}")
    else:
        logger.info("✓ Configuration validation passed")
    
    logger.info("=== Configuration Complete ===") 
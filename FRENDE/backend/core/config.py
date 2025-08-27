import os
import logging
from typing import List, Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings
from .secrets_manager import secrets_manager

class Settings(BaseSettings):
    # =============================================================================
    # ENVIRONMENT CONFIGURATION
    # =============================================================================
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    DEBUG: bool = Field(default=True, description="Debug mode")
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    
    # =============================================================================
    # DATABASE CONFIGURATION
    # =============================================================================
    DATABASE_URL: str = Field(
        default="sqlite:///./frende.db",
        description="Database connection URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=10, description="Database pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=20, description="Database max overflow")
    DATABASE_POOL_TIMEOUT: int = Field(default=30, description="Database pool timeout")
    
    # =============================================================================
    # SECURITY CONFIGURATION
    # =============================================================================
    JWT_SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="JWT secret key"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440, description="Access token expiration in minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, description="Refresh token expiration in days")
    TOKEN_ROTATION_ENABLED: bool = Field(default=True, description="Enable automatic token rotation")
    MAX_ACTIVE_SESSIONS: int = Field(default=5, description="Maximum active sessions per user")
    TOKEN_FINGERPRINT_ENABLED: bool = Field(default=True, description="Enable token fingerprinting for security")
    BCRYPT_ROUNDS: int = Field(default=12, description="BCrypt rounds for password hashing")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: (
            ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"]
            if os.getenv("ENVIRONMENT", "development") == "development"
            else []
        ),
        description="Allowed CORS origins"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True, description="Allow CORS credentials")
    CORS_ALLOW_METHODS: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        description="Allowed CORS methods"
    )
    CORS_ALLOW_HEADERS: List[str] = Field(
        default=["*"],
        description="Allowed CORS headers"
    )
    CORS_MAX_AGE: int = Field(default=86400, description="CORS preflight cache time")
    
    # Security Headers Configuration
    SECURITY_HEADERS_ENABLED: bool = Field(default=True, description="Enable security headers")
    CSP_ENABLED: bool = Field(default=True, description="Enable Content Security Policy")
    CSP_POLICY: Optional[str] = Field(default=None, description="Custom Content Security Policy")
    HSTS_ENABLED: bool = Field(default=True, description="Enable HTTP Strict Transport Security")
    HSTS_MAX_AGE: int = Field(default=31536000, description="HSTS max age in seconds")
    HSTS_INCLUDE_SUBDOMAINS: bool = Field(default=True, description="Include subdomains in HSTS")
    HSTS_PRELOAD: bool = Field(default=False, description="Enable HSTS preload")
    
    # Rate Limiting Configuration
    RATE_LIMITING_ENABLED: bool = Field(default=True, description="Enable rate limiting")
    RATE_LIMIT_DEFAULT: int = Field(default=100, description="Default requests per minute")
    RATE_LIMIT_AUTH: int = Field(default=5, description="Auth requests per minute")
    RATE_LIMIT_UPLOAD: int = Field(default=10, description="Upload requests per hour")
    RATE_LIMIT_WEBSOCKET: int = Field(default=10, description="WebSocket connections per minute")
    
    # Redis Configuration for Rate Limiting
    REDIS_URL: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    REDIS_ENABLED: bool = Field(default=False, description="Enable Redis for rate limiting")
    REDIS_POOL_SIZE: int = Field(default=10, description="Redis connection pool size")
    REDIS_POOL_TIMEOUT: int = Field(default=30, description="Redis connection pool timeout")
    REDIS_RETRY_ON_TIMEOUT: bool = Field(default=True, description="Retry Redis operations on timeout")

    # Compression Configuration
    COMPRESSION_ENABLED: bool = Field(default=True, description="Enable response compression")
    COMPRESSION_MIN_SIZE: int = Field(default=1024, description="Minimum size for compression (bytes)")
    COMPRESSION_LEVEL: int = Field(default=6, description="Gzip compression level (1-9)")
    BROTLI_ENABLED: bool = Field(default=True, description="Enable Brotli compression")
    BROTLI_QUALITY: int = Field(default=11, description="Brotli compression quality (0-11)")

    # CDN Configuration
    CDN_ENABLED: bool = Field(default=True, description="Enable CDN optimization")
    CDN_DOMAIN: Optional[str] = Field(default=None, description="CDN domain for assets")
    CDN_CACHE_DURATION: int = Field(default=31536000, description="CDN cache duration in seconds")
    CDN_GEO_DISTRIBUTION: bool = Field(default=True, description="Enable geographic distribution")
    CDN_API_KEY: Optional[str] = Field(default=None, description="CDN API key for uploads")
    CDN_BUCKET_NAME: Optional[str] = Field(default="frende-assets", description="CDN bucket name")

    # Asset Optimization Configuration
    ASSET_OPTIMIZATION_ENABLED: bool = Field(default=True, description="Enable asset optimization")
    IMAGE_QUALITY: int = Field(default=80, description="Image optimization quality (1-100)")
    FONT_SUBSETTING: bool = Field(default=True, description="Enable font subsetting")
    WEBP_ENABLED: bool = Field(default=True, description="Enable WebP image format")
    AVIF_ENABLED: bool = Field(default=False, description="Enable AVIF image format")

    # SSL/TLS Configuration
    SSL_ENABLED: bool = Field(default=False, description="Enable SSL/TLS")
    SSL_CERT_PATH: str = Field(default="", description="Path to SSL certificate")
    SSL_KEY_PATH: str = Field(default="", description="Path to SSL private key")
    SSL_MIN_VERSION: str = Field(default="TLSv1.2", description="Minimum TLS version")
    
    # Backup and Disaster Recovery Settings
    BACKUP_ENABLED: bool = Field(default=True, description="Enable automated backups")
    BACKUP_SCHEDULE: str = Field(default="0 2 * * *", description="Cron schedule for backups")
    BACKUP_RETENTION_DAYS: int = Field(default=30, description="Days to retain backups")
    BACKUP_ENCRYPTION_KEY: str = Field(default="", description="Encryption key for backups")
    
    # Database Backup Settings
    DB_BACKUP_ENABLED: bool = Field(default=True, description="Enable database backups")
    DB_BACKUP_S3_BUCKET: str = Field(default="", description="S3 bucket for database backups")
    DB_BACKUP_S3_REGION: str = Field(default="us-east-1", description="S3 region for backups")
    DB_BACKUP_COMPRESSION: bool = Field(default=True, description="Compress database backups")
    
    # File Backup Settings
    FILE_BACKUP_ENABLED: bool = Field(default=True, description="Enable file backups")
    FILE_BACKUP_S3_BUCKET: str = Field(default="", description="S3 bucket for file backups")
    FILE_BACKUP_INCLUDE_PATTERNS: List[str] = Field(default=["*.jpg", "*.png", "*.pdf"], description="File patterns to backup")
    FILE_BACKUP_EXCLUDE_PATTERNS: List[str] = Field(default=["*.tmp", "*.log"], description="File patterns to exclude")
    
    # Redis Backup Settings
    REDIS_BACKUP_ENABLED: bool = Field(default=True, description="Enable Redis backups")
    REDIS_BACKUP_S3_BUCKET: str = Field(default="", description="S3 bucket for Redis backups")
    REDIS_PERSISTENCE_ENABLED: bool = Field(default=True, description="Enable Redis persistence")
    
    # Recovery Settings
    RECOVERY_AUTO_FAILOVER: bool = Field(default=False, description="Enable automatic failover")
    RECOVERY_NOTIFICATION_EMAIL: str = Field(default="", description="Email for recovery notifications")
    RECOVERY_NOTIFICATION_SLACK: str = Field(default="", description="Slack webhook for recovery notifications")
    
    # Monitoring Settings
    BACKUP_MONITORING_ENABLED: bool = Field(default=True, description="Enable backup monitoring")
    BACKUP_MONITORING_INTERVAL: int = Field(default=300, description="Monitoring interval in seconds")
    BACKUP_HEALTH_CHECK_URL: str = Field(default="", description="Health check URL for backup status")
    
    # Allowed Origins for CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: (
            ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
            if os.getenv("ENVIRONMENT", "development") == "development"
            else ["https://frende.app", "https://staging.frende.app"]
        ),
        description="Allowed origins for CORS and security headers"
    )
    
    # Request Size Limits
    REQUEST_SIZE_LIMIT: str = Field(default="10MB", description="Maximum request size")
    UPLOAD_SIZE_LIMIT: str = Field(default="30MB", description="Maximum upload size")
    
    # Security Monitoring
    SECURITY_LOG_LEVEL: str = Field(default="WARNING", description="Security log level")
    SECURITY_MONITORING_ENABLED: bool = Field(default=True, description="Enable security monitoring")
    
    # =============================================================================
    # AI SERVICES CONFIGURATION
    # =============================================================================
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Gemini AI API key")
    GEMINI_API_URL: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        description="Gemini AI API URL"
    )
    AI_RATE_LIMIT_PER_MINUTE: int = Field(default=60, description="AI rate limit per minute")
    AI_MAX_TOKENS_PER_REQUEST: int = Field(default=1000, description="Maximum tokens per AI request")
    
    # =============================================================================
    # LOGGING CONFIGURATION
    # =============================================================================
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(default="json", description="Log format: json or text")
    LOG_FILE_PATH: Optional[str] = Field(default=None, description="Log file path")
    LOG_ROTATION_SIZE: str = Field(default="10MB", description="Log rotation size")
    LOG_ROTATION_COUNT: int = Field(default=5, description="Number of log files to keep")
    LOG_RETENTION_DAYS: int = Field(default=30, description="Log retention in days")
    
    # Performance Monitoring Configuration
    PERFORMANCE_MONITORING_ENABLED: bool = Field(default=True, description="Enable performance monitoring")
    SLOW_QUERY_THRESHOLD_MS: int = Field(default=1000, description="Slow query threshold in milliseconds")
    API_RESPONSE_TIME_THRESHOLD_MS: int = Field(default=5000, description="API response time threshold in milliseconds")
    
    # Error Handling Configuration
    ERROR_DETAILS_IN_PRODUCTION: bool = Field(default=False, description="Show error details in production")
    ERROR_LOG_LEVEL: str = Field(default="ERROR", description="Error log level")
    ERROR_NOTIFICATION_ENABLED: bool = Field(default=False, description="Enable error notifications")
    
    # Request ID Configuration
    REQUEST_ID_ENABLED: bool = Field(default=True, description="Enable request ID tracking")
    REQUEST_ID_HEADER: str = Field(default="X-Request-ID", description="Request ID header name")
    
    # Performance Headers Configuration
    PERFORMANCE_HEADERS_ENABLED: bool = Field(default=True, description="Enable performance headers")
    RESPONSE_TIME_HEADER: str = Field(default="X-Response-Time", description="Response time header name")
    PROCESSING_TIME_HEADER: str = Field(default="X-Processing-Time", description="Processing time header name")

    # Business Logic Configuration
    SLOT_PURCHASE_COST: int = Field(default=50, description="Cost in coins to purchase a slot")
    MIN_COMPATIBILITY_THRESHOLD: int = Field(default=50, description="Minimum compatibility score for matching")
    MAX_COMPATIBILITY_SCORE: int = Field(default=100, description="Maximum compatibility score")
    DEFAULT_USER_SLOTS: int = Field(default=2, description="Default number of slots per user")
    MATCH_EXPIRATION_HOURS: int = Field(default=48, description="Match expiration time in hours")
    TASK_EXPIRATION_HOURS: int = Field(default=24, description="Task expiration time in hours")
    AUTO_GREETING_TIMEOUT_SECONDS: int = Field(default=60, description="Auto-greeting timeout in seconds")
    CHAT_MESSAGE_MAX_LENGTH: int = Field(default=2000, description="Maximum chat message length")
    PROFILE_TEXT_MAX_LENGTH: int = Field(default=500, description="Maximum profile text length")

    # =============================================================================
    # EXTERNAL SERVICES CONFIGURATION
    # =============================================================================
    EMAIL_SERVICE_URL: Optional[str] = Field(default=None, description="Email service URL")
    EMAIL_API_KEY: Optional[str] = Field(default=None, description="Email service API key")
    FILE_STORAGE_URL: Optional[str] = Field(default=None, description="File storage service URL")
    FILE_STORAGE_API_KEY: Optional[str] = Field(default=None, description="File storage API key")
    MONITORING_API_KEY: Optional[str] = Field(default=None, description="Monitoring service API key")
    SENTRY_DSN: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    SENTRY_DEBUG_ENABLED: bool = Field(default=False, description="Enable Sentry in debug mode")
    SENTRY_TRACES_SAMPLE_RATE: float = Field(default=0.1, description="Sentry traces sample rate")
    SENTRY_PROFILES_SAMPLE_RATE: float = Field(default=0.1, description="Sentry profiles sample rate")
    
    # =============================================================================
    # WEBSOCKET CONFIGURATION
    # =============================================================================
    WEBSOCKET_PING_INTERVAL: int = Field(default=25, description="WebSocket ping interval in seconds")
    WEBSOCKET_PING_TIMEOUT: int = Field(default=10, description="WebSocket ping timeout in seconds")
    
    # =============================================================================
    # TASK SYSTEM CONFIGURATION
    # =============================================================================
    MAX_TASKS_PER_MATCH: int = Field(default=5, description="Maximum tasks per match")
    TASK_EXPIRATION_HOURS: int = Field(default=24, description="Task expiration time in hours")
    
    # =============================================================================
    # MATCHING SYSTEM CONFIGURATION
    # =============================================================================
    MATCH_EXPIRATION_DAYS: int = Field(default=2, description="Match expiration time in days")
    MIN_COMPATIBILITY_SCORE: int = Field(default=50, description="Minimum compatibility score for matching")
    
    # =============================================================================
    # COIN SYSTEM CONFIGURATION
    # =============================================================================
    COINS_PER_TASK: int = Field(default=10, description="Coins earned per completed task")
    COINS_PER_SLOT: int = Field(default=50, description="Coins required to purchase a slot")
    
    # =============================================================================
    # SECRETS MANAGEMENT CONFIGURATION
    # =============================================================================
    SECRETS_MANAGER_ENABLED: bool = Field(default=True, description="Enable secrets manager")
    SECRETS_MASTER_KEY: Optional[str] = Field(default=None, description="Master key for secrets encryption")
    SECRETS_BACKUP_ENABLED: bool = Field(default=True, description="Enable automatic secrets backup")
    SECRETS_ROTATION_ENABLED: bool = Field(default=True, description="Enable automatic secrets rotation")
    
    # =============================================================================
    # VALIDATORS
    # =============================================================================
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of {allowed}")
        return v.upper()
    
    @validator("SECURITY_LOG_LEVEL")
    def validate_security_log_level(cls, v):
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"SECURITY_LOG_LEVEL must be one of {allowed}")
        return v.upper()
    
    @validator("LOG_FORMAT")
    def validate_log_format(cls, v):
        allowed = ["json", "text"]
        if v not in allowed:
            raise ValueError(f"LOG_FORMAT must be one of {allowed}")
        return v
    
    @validator("LOG_ROTATION_SIZE")
    def validate_log_rotation_size(cls, v):
        # Convert size strings to bytes for validation
        size_map = {"KB": 1024, "MB": 1024**2, "GB": 1024**3}
        if isinstance(v, str):
            for unit, multiplier in size_map.items():
                if unit in v.upper():
                    try:
                        size = int(v.upper().replace(unit, "")) * multiplier
                        if size > 100 * 1024**2:  # 100MB max
                            raise ValueError("Log rotation size too large")
                        return v
                    except ValueError:
                        raise ValueError(f"Invalid log rotation size format: {v}")
        return v

    @validator("LOG_FILE_PATH")
    def validate_log_file_path(cls, v):
        """Validate log file path and permissions"""
        if v:
            try:
                from pathlib import Path
                log_path = Path(v)
                
                # Check if directory exists or can be created
                log_dir = log_path.parent
                if not log_dir.exists():
                    log_dir.mkdir(parents=True, exist_ok=True)
                
                # Check if file is writable
                if log_path.exists():
                    if not log_path.is_file():
                        raise ValueError(f"Log path exists but is not a file: {v}")
                    if not os.access(log_path, os.W_OK):
                        raise ValueError(f"Log file is not writable: {v}")
                else:
                    # Test if we can create the file
                    try:
                        log_path.touch()
                        log_path.unlink()  # Remove test file
                    except (OSError, PermissionError):
                        raise ValueError(f"Cannot create log file at: {v}")
                
                return v
            except Exception as e:
                raise ValueError(f"Invalid log file path {v}: {str(e)}")
        return v
    
    @validator("ERROR_LOG_LEVEL")
    def validate_error_log_level(cls, v):
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"ERROR_LOG_LEVEL must be one of {allowed}")
        return v.upper()
    
    @validator("JWT_SECRET_KEY")
    def validate_jwt_secret(cls, v):
        if v == "your-secret-key-change-in-production" and os.getenv("ENVIRONMENT") == "production":
            raise ValueError("JWT_SECRET_KEY must be changed in production")
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("REQUEST_SIZE_LIMIT")
    def validate_request_size_limit(cls, v):
        # Convert size strings to bytes for validation
        size_map = {"KB": 1024, "MB": 1024**2, "GB": 1024**3}
        if isinstance(v, str):
            for unit, multiplier in size_map.items():
                if unit in v.upper():
                    try:
                        size = int(v.upper().replace(unit, "")) * multiplier
                        if size > 100 * 1024**2:  # 100MB max
                            raise ValueError("Request size limit too large")
                        return v
                    except ValueError:
                        raise ValueError(f"Invalid request size format: {v}")
        return v
    
    @validator("DATABASE_URL")
    def validate_database_url(cls, v):
        """Validate database URL and check for production requirements"""
        if os.getenv("ENVIRONMENT") == "production":
            if v.startswith("sqlite"):
                raise ValueError("SQLite is not allowed in production. Use PostgreSQL.")
            if not v.startswith("postgresql"):
                raise ValueError("Production must use PostgreSQL database")
        return v
    
    @validator("GEMINI_API_KEY")
    def validate_gemini_api_key(cls, v):
        """Validate Gemini API key"""
        if v and v.startswith("your-"):
            raise ValueError("GEMINI_API_KEY must be a valid API key, not a placeholder")
        return v
    
    # =============================================================================
    # PYDANTIC CONFIGURATION
    # =============================================================================
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }
    
    # =============================================================================
    # HELPER METHODS
    # =============================================================================
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT == "development"
    
    def is_staging(self) -> bool:
        """Check if running in staging environment"""
        return self.ENVIRONMENT == "staging"
    
    def get_database_url(self) -> str:
        """Get database URL with environment-specific defaults"""
        if self.is_production() and self.DATABASE_URL.startswith("sqlite"):
            raise ValueError("SQLite is not allowed in production. Use PostgreSQL.")
        return self.DATABASE_URL
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins with environment-specific defaults"""
        if self.is_production():
            # In production, only allow specific domains
            return [origin for origin in self.CORS_ORIGINS if origin.startswith("https://")]
        return self.CORS_ORIGINS
    
    def get_cors_methods(self) -> List[str]:
        """Get CORS methods with environment-specific defaults"""
        if self.is_production():
            return ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        return self.CORS_ALLOW_METHODS
    
    def get_cors_headers(self) -> List[str]:
        """Get CORS headers with environment-specific defaults"""
        if self.is_production():
            return ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"]
        return self.CORS_ALLOW_HEADERS
    
    def get_security_headers(self) -> dict:
        """Get security headers based on environment"""
        headers = {}
        
        if not self.SECURITY_HEADERS_ENABLED:
            return headers
        
        # Basic security headers
        headers["X-Frame-Options"] = "DENY"
        headers["X-Content-Type-Options"] = "nosniff"
        headers["X-XSS-Protection"] = "1; mode=block"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS header
        if self.HSTS_ENABLED and self.is_production():
            hsts_value = f"max-age={self.HSTS_MAX_AGE}"
            if self.HSTS_INCLUDE_SUBDOMAINS:
                hsts_value += "; includeSubDomains"
            if self.HSTS_PRELOAD:
                hsts_value += "; preload"
            headers["Strict-Transport-Security"] = hsts_value
        
        # Content Security Policy
        if self.CSP_ENABLED:
            if self.is_production():
                csp = (
                    "default-src 'self'; "
                    "script-src 'self'; "
                    "style-src 'self'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self'; "
                    "connect-src 'self' https:; "
                    "frame-ancestors 'none';"
                )
            else:
                csp = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self'; "
                    "connect-src 'self' https:;"
                )
            headers["Content-Security-Policy"] = csp
        
        return headers
    
    def get_rate_limit_config(self) -> dict:
        """Get rate limiting configuration"""
        return {
            "enabled": self.RATE_LIMITING_ENABLED,
            "default": self.RATE_LIMIT_DEFAULT,
            "auth": self.RATE_LIMIT_AUTH,
            "upload": self.RATE_LIMIT_UPLOAD,
            "websocket": self.RATE_LIMIT_WEBSOCKET,
        }
    
    def get_log_level(self) -> int:
        """Get logging level as integer"""
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }
        return level_map.get(self.LOG_LEVEL, logging.INFO)
    
    def get_security_log_level(self) -> int:
        """Get security logging level as integer"""
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }
        return level_map.get(self.SECURITY_LOG_LEVEL, logging.WARNING)
    
    def get_error_log_level(self) -> int:
        """Get error log level as integer"""
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }
        return level_map.get(self.ERROR_LOG_LEVEL, logging.ERROR)
    
    def get_log_rotation_size_bytes(self) -> int:
        """Get log rotation size in bytes"""
        size_map = {"KB": 1024, "MB": 1024**2, "GB": 1024**3}
        if isinstance(self.LOG_ROTATION_SIZE, str):
            for unit, multiplier in size_map.items():
                if unit in self.LOG_ROTATION_SIZE.upper():
                    try:
                        size = int(self.LOG_ROTATION_SIZE.upper().replace(unit, "")) * multiplier
                        return size
                    except ValueError:
                        return 10 * 1024**2  # Default to 10MB
        return 10 * 1024**2  # Default to 10MB
    
    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get a secret from the secrets manager or environment variable"""
        if self.SECRETS_MANAGER_ENABLED:
            # Try secrets manager first
            secret = secrets_manager.get_secret(key)
            if secret:
                return secret
        
        # Fallback to environment variable
        return os.getenv(key, default)
    
    def store_secret(self, key: str, value: str, metadata: Optional[dict] = None) -> bool:
        """Store a secret in the secrets manager"""
        if self.SECRETS_MANAGER_ENABLED:
            return secrets_manager.store_secret(key, value, metadata)
        return False
    
    def rotate_secret(self, key: str, new_value: str) -> bool:
        """Rotate a secret in the secrets manager"""
        if self.SECRETS_MANAGER_ENABLED and self.SECRETS_ROTATION_ENABLED:
            return secrets_manager.rotate_secret(key, new_value)
        return False

    # WebSocket Monitoring Settings
    SOCKETIO_MONITORING_ENABLED: bool = Field(default=True, description="Enable Socket.IO monitoring")
    WEBSOCKET_HEARTBEAT_INTERVAL: int = Field(default=30, description="WebSocket heartbeat interval in seconds")
    WEBSOCKET_MAX_IDLE_TIME: int = Field(default=3600, description="Maximum idle time for WebSocket connections in seconds")
    WEBSOCKET_MAX_CONNECTIONS: int = Field(default=2000, description="Maximum number of concurrent WebSocket connections")
    WEBSOCKET_MIN_QUALITY_SCORE: float = Field(default=50.0, description="Minimum quality score for WebSocket connections")
    WEBSOCKET_MAX_ERROR_RATE: float = Field(default=0.05, description="Maximum error rate for WebSocket connections (5%)")
    WEBSOCKET_MAX_LATENCY_MS: int = Field(default=1000, description="Maximum acceptable latency for WebSocket messages in milliseconds")
    WEBSOCKET_CLEANUP_INTERVAL: int = Field(default=300, description="WebSocket cleanup interval in seconds")
    WEBSOCKET_ANALYTICS_RETENTION_HOURS: int = Field(default=24, description="Hours to retain WebSocket analytics data")
    WEBSOCKET_CONNECTION_HISTORY_SIZE: int = Field(default=1000, description="Maximum number of connection history entries to keep")
    WEBSOCKET_QUALITY_METRICS_RETENTION: int = Field(default=100, description="Number of quality metrics to retain per connection")
    WEBSOCKET_MESSAGE_TRACKING_SIZE: int = Field(default=1000, description="Maximum number of message tracking entries per connection")
    WEBSOCKET_ALERT_ENABLED: bool = Field(default=True, description="Enable WebSocket alerts")
    WEBSOCKET_ALERT_CRITICAL_CONNECTIONS: int = Field(default=2000, description="Critical alert threshold for connection count")
    WEBSOCKET_ALERT_WARNING_CONNECTIONS: int = Field(default=1600, description="Warning alert threshold for connection count")
    WEBSOCKET_ALERT_CRITICAL_ERROR_RATE: float = Field(default=0.10, description="Critical alert threshold for error rate (10%)")
    WEBSOCKET_ALERT_WARNING_ERROR_RATE: float = Field(default=0.05, description="Warning alert threshold for error rate (5%)")
    WEBSOCKET_ALERT_CRITICAL_QUALITY: float = Field(default=30.0, description="Critical alert threshold for quality score")
    WEBSOCKET_ALERT_WARNING_QUALITY: float = Field(default=50.0, description="Warning alert threshold for quality score")
    
    # Push Notification Settings
    VAPID_PRIVATE_KEY: str = Field(default="", description="VAPID private key for push notifications")
    VAPID_PUBLIC_KEY: str = Field(default="", description="VAPID public key for push notifications")
    VAPID_EMAIL: str = Field(default="", description="VAPID email for push notifications")
    VAPID_AUDIENCE: str = Field(default="", description="VAPID audience for push notifications")
    PUSH_NOTIFICATION_ENABLED: bool = Field(default=True, description="Enable push notifications")
    PUSH_NOTIFICATION_BATCH_SIZE: int = Field(default=50, description="Batch size for bulk push notifications")
    PUSH_NOTIFICATION_RETRY_ATTEMPTS: int = Field(default=3, description="Number of retry attempts for failed push notifications")
    PUSH_NOTIFICATION_RETRY_DELAY: int = Field(default=5, description="Delay between retry attempts in seconds")
    
    # =============================================================================
    # VALIDATION METHODS
    # =============================================================================
    
    @validator('JWT_SECRET_KEY')
    def validate_jwt_secret_key(cls, v, values):
        """Validate JWT secret key in production"""
        if values.get('ENVIRONMENT') == 'production' and v == 'your-secret-key-change-in-production':
            raise ValueError('JWT_SECRET_KEY must be changed in production')
        return v
    
    @validator('VAPID_PRIVATE_KEY')
    def validate_vapid_private_key(cls, v, values):
        """Validate VAPID private key in production"""
        if values.get('ENVIRONMENT') == 'production' and (not v or v == 'your-vapid-private-key-change-in-production'):
            raise ValueError('VAPID_PRIVATE_KEY must be configured in production')
        return v
    
    @validator('VAPID_PUBLIC_KEY')
    def validate_vapid_public_key(cls, v, values):
        """Validate VAPID public key in production"""
        if values.get('ENVIRONMENT') == 'production' and (not v or v == 'your-vapid-public-key-change-in-production'):
            raise ValueError('VAPID_PUBLIC_KEY must be configured in production')
        return v
    
    @validator('CORS_ORIGINS')
    def validate_cors_origins(cls, v, values):
        """Validate CORS origins in production"""
        if values.get('ENVIRONMENT') == 'production' and not v:
            raise ValueError('CORS_ORIGINS must be configured in production')
        return v
    
    @validator('DATABASE_URL')
    def validate_database_url(cls, v, values):
        """Validate database URL in production"""
        if values.get('ENVIRONMENT') == 'production' and v.startswith('sqlite'):
            raise ValueError('SQLite database not allowed in production')
        return v

# Create settings instance
settings = Settings()

# Configure logging based on settings
def configure_logging():
    """Configure logging based on settings"""
    log_config = {
        "level": settings.get_log_level(),
        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s" if settings.LOG_FORMAT == "text" else None,
        "handlers": []
    }
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(settings.get_log_level())
    
    if settings.LOG_FORMAT == "json":
        import json
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    "timestamp": self.formatTime(record),
                    "level": record.levelname,
                    "logger": record.name,
                    "message": record.getMessage(),
                    "module": record.module,
                    "function": record.funcName,
                    "line": record.lineno
                }
                if record.exc_info:
                    log_entry["exception"] = self.formatException(record.exc_info)
                return json.dumps(log_entry)
        
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(logging.Formatter(log_config["format"]))
    
    log_config["handlers"].append(console_handler)
    
    # File handler (if specified)
    if settings.LOG_FILE_PATH:
        file_handler = logging.FileHandler(settings.LOG_FILE_PATH)
        file_handler.setLevel(settings.get_log_level())
        if settings.LOG_FORMAT == "json":
            import json
            class JSONFormatter(logging.Formatter):
                def format(self, record):
                    log_entry = {
                        "timestamp": self.formatTime(record),
                        "level": record.levelname,
                        "logger": record.name,
                        "message": record.getMessage(),
                        "module": record.module,
                        "function": record.funcName,
                        "line": record.lineno
                    }
                    if record.exc_info:
                        log_entry["exception"] = self.formatException(record.exc_info)
                    return json.dumps(log_entry)
            file_handler.setFormatter(JSONFormatter())
        else:
            file_handler.setFormatter(logging.Formatter(log_config["format"]))
        log_config["handlers"].append(file_handler)
    
    # Configure root logger
    logging.basicConfig(**log_config)

# Initialize logging
configure_logging() 
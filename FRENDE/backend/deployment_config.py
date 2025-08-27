"""
Deployment Configuration for Frende Backend
Provides environment-specific configuration and deployment utilities
"""

import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass

from core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class DeploymentConfig:
    """Deployment configuration for different environments"""
    
    # Environment settings
    environment: str
    debug: bool
    host: str
    port: int
    
    # Database settings
    database_url: str
    database_pool_size: int
    database_max_overflow: int
    
    # Security settings
    jwt_secret_key: str
    cors_origins: list
    security_headers_enabled: bool
    
    # Performance settings
    cache_enabled: bool
    compression_enabled: bool
    rate_limiting_enabled: bool
    
    # Monitoring settings
    monitoring_enabled: bool
    sentry_dsn: Optional[str] = None
    
    # CDN settings
    cdn_enabled: bool
    cdn_domain: Optional[str] = None
    
    # File storage settings
    file_storage_enabled: bool
    max_upload_size: str
    
    @classmethod
    def for_environment(cls, env: str) -> 'DeploymentConfig':
        """Create deployment config for specific environment"""
        
        if env == "development":
            return cls(
                environment="development",
                debug=True,
                host="0.0.0.0",
                port=8000,
                database_url="sqlite:///./frende.db",
                database_pool_size=5,
                database_max_overflow=10,
                jwt_secret_key="dev-secret-key-change-in-production",
                cors_origins=["http://localhost:3000", "http://localhost:5173"],
                security_headers_enabled=False,
                cache_enabled=True,
                compression_enabled=True,
                rate_limiting_enabled=True,
                monitoring_enabled=True,
                sentry_dsn=None,
                cdn_enabled=False,
                cdn_domain=None,
                file_storage_enabled=True,
                max_upload_size="30MB"
            )
        
        elif env == "staging":
            return cls(
                environment="staging",
                debug=False,
                host="0.0.0.0",
                port=8000,
                database_url=os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/frende_staging"),
                database_pool_size=10,
                database_max_overflow=20,
                jwt_secret_key=os.getenv("JWT_SECRET_KEY", "staging-secret-key"),
                cors_origins=["https://staging.frende.app"],
                security_headers_enabled=True,
                cache_enabled=True,
                compression_enabled=True,
                rate_limiting_enabled=True,
                monitoring_enabled=True,
                sentry_dsn=os.getenv("SENTRY_DSN"),
                cdn_enabled=True,
                cdn_domain=os.getenv("CDN_DOMAIN"),
                file_storage_enabled=True,
                max_upload_size="30MB"
            )
        
        elif env == "production":
            return cls(
                environment="production",
                debug=False,
                host="0.0.0.0",
                port=8000,
                database_url=os.getenv("DATABASE_URL"),
                database_pool_size=20,
                database_max_overflow=40,
                jwt_secret_key=os.getenv("JWT_SECRET_KEY"),
                cors_origins=["https://frende.app"],
                security_headers_enabled=True,
                cache_enabled=True,
                compression_enabled=True,
                rate_limiting_enabled=True,
                monitoring_enabled=True,
                sentry_dsn=os.getenv("SENTRY_DSN"),
                cdn_enabled=True,
                cdn_domain=os.getenv("CDN_DOMAIN"),
                file_storage_enabled=True,
                max_upload_size="30MB"
            )
        
        else:
            raise ValueError(f"Unknown environment: {env}")

class DeploymentManager:
    """Manages deployment configuration and validation"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.validation_errors = []
    
    def validate_configuration(self) -> bool:
        """Validate deployment configuration"""
        self.validation_errors = []
        
        # Validate required environment variables
        if self.config.environment == "production":
            self._validate_production_requirements()
        
        # Validate database configuration
        self._validate_database_config()
        
        # Validate security configuration
        self._validate_security_config()
        
        # Validate file paths and permissions
        self._validate_file_permissions()
        
        return len(self.validation_errors) == 0
    
    def _validate_production_requirements(self):
        """Validate production-specific requirements"""
        if not self.config.database_url or self.config.database_url.startswith("sqlite"):
            self.validation_errors.append("Production must use PostgreSQL database")
        
        if not self.config.jwt_secret_key or self.config.jwt_secret_key.startswith("dev-"):
            self.validation_errors.append("Production must have secure JWT secret key")
        
        if not self.config.cors_origins or not all(origin.startswith("https://") for origin in self.config.cors_origins):
            self.validation_errors.append("Production CORS origins must use HTTPS")
    
    def _validate_database_config(self):
        """Validate database configuration"""
        if not self.config.database_url:
            self.validation_errors.append("Database URL is required")
        
        if self.config.database_pool_size <= 0:
            self.validation_errors.append("Database pool size must be positive")
    
    def _validate_security_config(self):
        """Validate security configuration"""
        if not self.config.jwt_secret_key:
            self.validation_errors.append("JWT secret key is required")
        
        if len(self.config.jwt_secret_key) < 32:
            self.validation_errors.append("JWT secret key must be at least 32 characters")
    
    def _validate_file_permissions(self):
        """Validate file paths and permissions"""
        # Check upload directory
        upload_dir = Path("uploads")
        if not upload_dir.exists():
            try:
                upload_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                self.validation_errors.append(f"Cannot create upload directory: {e}")
        
        # Check log directory if specified
        if settings.LOG_FILE_PATH:
            log_path = Path(settings.LOG_FILE_PATH)
            log_dir = log_path.parent
            if not log_dir.exists():
                try:
                    log_dir.mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    self.validation_errors.append(f"Cannot create log directory: {e}")
    
    def get_validation_errors(self) -> list:
        """Get validation errors"""
        return self.validation_errors
    
    def generate_environment_file(self, output_path: str = ".env") -> None:
        """Generate environment file from configuration"""
        env_content = f"""# Frende Backend Environment Configuration
# Generated for {self.config.environment} environment

# Environment
ENVIRONMENT={self.config.environment}
DEBUG={str(self.config.debug).lower()}
HOST={self.config.host}
PORT={self.config.port}

# Database
DATABASE_URL={self.config.database_url}
DATABASE_POOL_SIZE={self.config.database_pool_size}
DATABASE_MAX_OVERFLOW={self.config.database_max_overflow}

# Security
JWT_SECRET_KEY={self.config.jwt_secret_key}
CORS_ORIGINS={','.join(self.config.cors_origins)}
SECURITY_HEADERS_ENABLED={str(self.config.security_headers_enabled).lower()}

# Performance
CACHE_ENABLED={str(self.config.cache_enabled).lower()}
COMPRESSION_ENABLED={str(self.config.compression_enabled).lower()}
RATE_LIMITING_ENABLED={str(self.config.rate_limiting_enabled).lower()}

# Monitoring
MONITORING_ENABLED={str(self.config.monitoring_enabled).lower()}
SENTRY_DSN={self.config.sentry_dsn or ''}

# CDN
CDN_ENABLED={str(self.config.cdn_enabled).lower()}
CDN_DOMAIN={self.config.cdn_domain or ''}

# File Storage
FILE_STORAGE_ENABLED={str(self.config.file_storage_enabled).lower()}
UPLOAD_SIZE_LIMIT={self.config.max_upload_size}

# AI Services
GEMINI_API_KEY=your-gemini-api-key-here

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
"""
        
        with open(output_path, 'w') as f:
            f.write(env_content)
        
        logger.info(f"Generated environment file: {output_path}")
    
    def generate_docker_compose(self, output_path: str = "docker-compose.yml") -> None:
        """Generate Docker Compose configuration"""
        compose_content = f"""version: '3.8'

services:
  app:
    build: .
    ports:
      - "{self.config.port}:{self.config.port}"
    environment:
      - ENVIRONMENT={self.config.environment}
      - DATABASE_URL=postgresql://frende:frende@db:5432/frende
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=frende
      - POSTGRES_USER=frende
      - POSTGRES_PASSWORD=frende
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
"""
        
        with open(output_path, 'w') as f:
            f.write(compose_content)
        
        logger.info(f"Generated Docker Compose file: {output_path}")
    
    def generate_nginx_config(self, output_path: str = "nginx.conf") -> None:
        """Generate Nginx configuration"""
        nginx_content = f"""server {{
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # API proxy
    location /api/ {{
        proxy_pass http://app:{self.config.port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}

    # WebSocket proxy
    location /socket.io/ {{
        proxy_pass http://app:{self.config.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    # Static files
    location /uploads/ {{
        alias /app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}

    # Health check
    location /health {{
        proxy_pass http://app:{self.config.port}/api/health;
        access_log off;
    }}
}}
"""
        
        with open(output_path, 'w') as f:
            f.write(nginx_content)
        
        logger.info(f"Generated Nginx configuration: {output_path}")

def get_deployment_config(environment: Optional[str] = None) -> DeploymentConfig:
    """Get deployment configuration for environment"""
    env = environment or os.getenv("ENVIRONMENT", "development")
    return DeploymentConfig.for_environment(env)

def validate_deployment(environment: Optional[str] = None) -> bool:
    """Validate deployment configuration"""
    config = get_deployment_config(environment)
    manager = DeploymentManager(config)
    
    if manager.validate_configuration():
        logger.info("Deployment configuration is valid")
        return True
    else:
        logger.error("Deployment configuration validation failed:")
        for error in manager.get_validation_errors():
            logger.error(f"  - {error}")
        return False

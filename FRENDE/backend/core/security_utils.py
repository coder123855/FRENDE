"""
Security utilities for the Frende backend application.
Provides security validation, monitoring, and testing utilities.
"""

import time
import hashlib
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import re

from core.config import settings

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("security")

class SecurityValidator:
    """Utility class for security validation"""
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
            
        Returns:
            Dict with validation results
        """
        errors = []
        warnings = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            warnings.append("Password should contain at least one special character")
        
        if len(password) < 12:
            warnings.append("Consider using a longer password (12+ characters)")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "score": max(0, 10 - len(errors) * 2 - len(warnings))
        }
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        Validate email format
        
        Args:
            email: Email to validate
            
        Returns:
            True if valid email format
        """
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_input_safety(input_str: str) -> Dict[str, Any]:
        """
        Validate input for potential security issues
        
        Args:
            input_str: Input string to validate
            
        Returns:
            Dict with validation results
        """
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'data:text/html',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
            r'eval\s*\(',
            r'document\.cookie',
            r'<iframe[^>]*>',
            r'<object[^>]*>',
            r'<embed[^>]*>'
        ]
        
        issues = []
        for pattern in dangerous_patterns:
            if re.search(pattern, input_str, re.IGNORECASE):
                issues.append(f"Potentially dangerous pattern: {pattern}")
        
        return {
            "safe": len(issues) == 0,
            "issues": issues,
            "risk_level": "high" if len(issues) > 0 else "low"
        }

class SecurityMonitor:
    """Utility class for security monitoring"""
    
    def __init__(self):
        self.security_events = defaultdict(list)
        self.failed_attempts = defaultdict(int)
        self.suspicious_ips = set()
        self.last_cleanup = time.time()
    
    def log_security_event(self, event_type: str, client_ip: str, details: Dict[str, Any]):
        """
        Log a security event
        
        Args:
            event_type: Type of security event
            client_ip: Client IP address
            details: Event details
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "client_ip": client_ip,
            "details": details
        }
        
        self.security_events[client_ip].append(event)
        
        # Log to security logger
        security_logger.warning(f"Security event: {json.dumps(event)}")
        
        # Check for suspicious patterns
        if len(self.security_events[client_ip]) > 10:
            self.suspicious_ips.add(client_ip)
            security_logger.error(f"IP {client_ip} marked as suspicious due to high event count")
    
    def log_failed_attempt(self, client_ip: str, attempt_type: str):
        """
        Log a failed authentication attempt
        
        Args:
            client_ip: Client IP address
            attempt_type: Type of failed attempt
        """
        self.failed_attempts[client_ip] += 1
        
        if self.failed_attempts[client_ip] >= 5:
            security_logger.error(f"Multiple failed attempts from IP {client_ip}: {attempt_type}")
            self.suspicious_ips.add(client_ip)
    
    def is_ip_suspicious(self, client_ip: str) -> bool:
        """
        Check if an IP is suspicious
        
        Args:
            client_ip: Client IP address
            
        Returns:
            True if IP is suspicious
        """
        return client_ip in self.suspicious_ips
    
    def get_security_report(self) -> Dict[str, Any]:
        """
        Get security monitoring report
        
        Returns:
            Security report
        """
        now = time.time()
        
        # Cleanup old events (older than 1 hour)
        if now - self.last_cleanup > 3600:
            cutoff = now - 3600
            for ip in list(self.security_events.keys()):
                self.security_events[ip] = [
                    event for event in self.security_events[ip]
                    if datetime.fromisoformat(event["timestamp"]).timestamp() > cutoff
                ]
                if not self.security_events[ip]:
                    del self.security_events[ip]
            
            self.last_cleanup = now
        
        return {
            "suspicious_ips": list(self.suspicious_ips),
            "failed_attempts": dict(self.failed_attempts),
            "total_events": sum(len(events) for events in self.security_events.values()),
            "active_ips": len(self.security_events),
            "last_cleanup": datetime.fromtimestamp(self.last_cleanup).isoformat()
        }

class SecurityTester:
    """Utility class for security testing"""
    
    @staticmethod
    def test_cors_policy() -> Dict[str, Any]:
        """
        Test CORS policy configuration
        
        Returns:
            CORS test results
        """
        results = {
            "cors_origins": settings.get_cors_origins(),
            "cors_methods": settings.get_cors_methods(),
            "cors_headers": settings.get_cors_headers(),
            "cors_credentials": settings.CORS_ALLOW_CREDENTIALS,
            "cors_max_age": settings.CORS_MAX_AGE,
            "production_ready": True,
            "warnings": []
        }
        
        # Check for production readiness
        if settings.is_production():
            https_origins = [origin for origin in results["cors_origins"] if origin.startswith("https://")]
            if not https_origins:
                results["production_ready"] = False
                results["warnings"].append("Production should use HTTPS CORS origins")
            
            if "*" in results["cors_origins"]:
                results["warnings"].append("Wildcard CORS origin in production")
        
        return results
    
    @staticmethod
    def test_security_headers() -> Dict[str, Any]:
        """
        Test security headers configuration
        
        Returns:
            Security headers test results
        """
        headers = settings.get_security_headers()
        
        results = {
            "headers_present": list(headers.keys()),
            "headers_count": len(headers),
            "csp_enabled": settings.CSP_ENABLED,
            "hsts_enabled": settings.HSTS_ENABLED,
            "production_ready": True,
            "warnings": []
        }
        
        # Check for required headers
        required_headers = [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
            "Referrer-Policy"
        ]
        
        missing_headers = [h for h in required_headers if h not in headers]
        if missing_headers:
            results["production_ready"] = False
            results["warnings"].append(f"Missing security headers: {missing_headers}")
        
        # Check CSP
        if settings.CSP_ENABLED and "Content-Security-Policy" not in headers:
            results["warnings"].append("CSP enabled but header not present")
        
        # Check HSTS
        if settings.HSTS_ENABLED and settings.is_production() and "Strict-Transport-Security" not in headers:
            results["warnings"].append("HSTS enabled but header not present in production")
        
        return results
    
    @staticmethod
    def test_rate_limiting() -> Dict[str, Any]:
        """
        Test rate limiting configuration
        
        Returns:
            Rate limiting test results
        """
        config = settings.get_rate_limit_config()
        
        results = {
            "enabled": config["enabled"],
            "limits": config,
            "production_ready": True,
            "warnings": []
        }
        
        if not config["enabled"]:
            results["warnings"].append("Rate limiting is disabled")
        
        if config["auth"] > 10:
            results["warnings"].append("Auth rate limit may be too high")
        
        if config["default"] > 200:
            results["warnings"].append("Default rate limit may be too high")
        
        return results
    
    @staticmethod
    def run_security_tests() -> Dict[str, Any]:
        """
        Run comprehensive security tests
        
        Returns:
            Complete security test results
        """
        return {
            "cors": SecurityTester.test_cors_policy(),
            "security_headers": SecurityTester.test_security_headers(),
            "rate_limiting": SecurityTester.test_rate_limiting(),
            "timestamp": datetime.utcnow().isoformat(),
            "environment": settings.ENVIRONMENT
        }

# Global security monitor instance
security_monitor = SecurityMonitor()

def get_security_status() -> Dict[str, Any]:
    """
    Get current security status
    
    Returns:
        Security status information
    """
    return {
        "environment": settings.ENVIRONMENT,
        "security_headers_enabled": settings.SECURITY_HEADERS_ENABLED,
        "rate_limiting_enabled": settings.RATE_LIMITING_ENABLED,
        "security_monitoring_enabled": settings.SECURITY_MONITORING_ENABLED,
        "cors_origins_count": len(settings.get_cors_origins()),
        "security_report": security_monitor.get_security_report(),
        "security_tests": SecurityTester.run_security_tests()
    } 
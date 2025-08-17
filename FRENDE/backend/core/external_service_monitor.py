"""
External Service Monitor
Monitors the health and performance of external services and APIs.
"""

import asyncio
import time
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from core.config import settings
from core.logging_config import get_logger

logger = get_logger("external_monitor")

class ExternalService:
    """Represents an external service to monitor"""
    
    def __init__(self, name: str, url: str, method: str = "GET", 
                 headers: Optional[Dict[str, str]] = None,
                 timeout: int = 10, expected_status: int = 200):
        self.name = name
        self.url = url
        self.method = method
        self.headers = headers or {}
        self.timeout = timeout
        self.expected_status = expected_status
        self.health_history: List[Dict[str, Any]] = []
        self.max_history_size = 100

class ExternalServiceMonitor:
    """External service health monitoring and checking"""
    
    def __init__(self):
        self.services: Dict[str, ExternalService] = {}
        self.monitoring_enabled = True
        
        # Initialize default services
        self._initialize_default_services()
    
    def _initialize_default_services(self):
        """Initialize default external services to monitor"""
        # Email service (if configured)
        if settings.EMAIL_SERVICE_URL:
            self.add_service(
                "email_service",
                settings.EMAIL_SERVICE_URL,
                method="GET",
                timeout=5
            )
        
        # File storage service (if configured)
        if settings.FILE_STORAGE_URL:
            self.add_service(
                "file_storage",
                settings.FILE_STORAGE_URL,
                method="GET",
                timeout=5
            )
        
        # Monitoring service (if configured)
        if settings.MONITORING_API_KEY:
            # Add monitoring service health check
            self.add_service(
                "monitoring_service",
                "https://api.monitoring.service/health",  # Replace with actual URL
                method="GET",
                headers={"Authorization": f"Bearer {settings.MONITORING_API_KEY}"},
                timeout=5
            )
    
    def add_service(self, name: str, url: str, method: str = "GET",
                   headers: Optional[Dict[str, str]] = None,
                   timeout: int = 10, expected_status: int = 200) -> ExternalService:
        """Add an external service to monitor"""
        service = ExternalService(name, url, method, headers, timeout, expected_status)
        self.services[name] = service
        logger.info(f"Added external service monitor: {name} ({url})")
        return service
    
    def remove_service(self, name: str) -> bool:
        """Remove an external service from monitoring"""
        if name in self.services:
            del self.services[name]
            logger.info(f"Removed external service monitor: {name}")
            return True
        return False
    
    async def check_service_health(self, service: ExternalService) -> Dict[str, Any]:
        """Check health of a specific external service"""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=service.timeout) as client:
                if service.method.upper() == "GET":
                    response = await client.get(service.url, headers=service.headers)
                elif service.method.upper() == "POST":
                    response = await client.post(service.url, headers=service.headers)
                elif service.method.upper() == "HEAD":
                    response = await client.head(service.url, headers=service.headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {service.method}")
                
                duration = (time.time() - start_time) * 1000
                
                if response.status_code == service.expected_status:
                    result = {
                        "service": service.name,
                        "status": "healthy",
                        "response_time_ms": round(duration, 2),
                        "status_code": response.status_code,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    result = {
                        "service": service.name,
                        "status": "unhealthy",
                        "error": f"Unexpected status code: {response.status_code}",
                        "response_time_ms": round(duration, 2),
                        "status_code": response.status_code,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                
                # Store in history
                service.health_history.append(result)
                if len(service.health_history) > service.max_history_size:
                    service.health_history = service.health_history[-service.max_history_size:]
                
                return result
                
        except httpx.TimeoutException:
            duration = (time.time() - start_time) * 1000
            result = {
                "service": service.name,
                "status": "unhealthy",
                "error": "Request timeout",
                "response_time_ms": round(duration, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            service.health_history.append(result)
            return result
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            result = {
                "service": service.name,
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": round(duration, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            service.health_history.append(result)
            return result
    
    async def check_all_services(self) -> Dict[str, Any]:
        """Check health of all external services"""
        if not self.services:
            return {
                "overall_status": "healthy",
                "healthy_services": 0,
                "total_services": 0,
                "services": {},
                "timestamp": datetime.utcnow().isoformat()
            }
        
        results = {}
        tasks = []
        
        # Create tasks for all services
        for service in self.services.values():
            tasks.append(self.check_service_health(service))
        
        # Execute all health checks concurrently
        service_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, (service_name, service) in enumerate(self.services.items()):
            if isinstance(service_results[i], Exception):
                results[service_name] = {
                    "service": service_name,
                    "status": "unhealthy",
                    "error": str(service_results[i]),
                    "response_time_ms": 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                results[service_name] = service_results[i]
        
        # Calculate overall health
        healthy_services = sum(1 for r in results.values() if r["status"] == "healthy")
        total_services = len(results)
        
        overall_status = "healthy" if healthy_services == total_services else "degraded"
        if healthy_services == 0:
            overall_status = "unhealthy"
        
        return {
            "overall_status": overall_status,
            "healthy_services": healthy_services,
            "total_services": total_services,
            "services": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_service_health_history(self, service_name: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health check history for a specific service"""
        if service_name not in self.services:
            return []
        
        service = self.services[service_name]
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        return [
            entry for entry in service.health_history
            if datetime.fromisoformat(entry["timestamp"]) >= cutoff_time
        ]
    
    def get_service_performance_metrics(self, service_name: str, hours: int = 24) -> Dict[str, Any]:
        """Get performance metrics for a specific service"""
        history = self.get_service_health_history(service_name, hours)
        
        if not history:
            return {
                "total_checks": 0,
                "successful_checks": 0,
                "failed_checks": 0,
                "success_rate": 0,
                "average_response_time_ms": 0,
                "min_response_time_ms": 0,
                "max_response_time_ms": 0
            }
        
        successful_checks = [h for h in history if h["status"] == "healthy"]
        failed_checks = [h for h in history if h["status"] != "healthy"]
        
        response_times = [
            h["response_time_ms"] for h in history 
            if "response_time_ms" in h and h["response_time_ms"] > 0
        ]
        
        return {
            "total_checks": len(history),
            "successful_checks": len(successful_checks),
            "failed_checks": len(failed_checks),
            "success_rate": (len(successful_checks) / len(history)) * 100 if history else 0,
            "average_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
            "min_response_time_ms": min(response_times) if response_times else 0,
            "max_response_time_ms": max(response_times) if response_times else 0
        }
    
    def get_all_services_performance(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance metrics for all services"""
        all_metrics = {}
        
        for service_name in self.services.keys():
            all_metrics[service_name] = self.get_service_performance_metrics(service_name, hours)
        
        return all_metrics
    
    async def run_continuous_monitoring(self, interval_seconds: int = 300):
        """Run continuous external service monitoring"""
        logger.info(f"Starting continuous external service monitoring (interval: {interval_seconds}s)")
        
        while True:
            try:
                if self.monitoring_enabled and self.services:
                    await self.check_all_services()
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Error in continuous external service monitoring: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

# Global external service monitor instance
external_service_monitor = ExternalServiceMonitor()

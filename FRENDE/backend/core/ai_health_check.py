"""
AI Service Health Check
Monitors the health and performance of AI services including Gemini API.
"""

import asyncio
import time
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

from core.config import settings
from core.logging_config import get_logger
from api.metrics import record_ai_request

logger = get_logger("ai_health")

class AIHealthChecker:
    """AI service health monitoring and checking"""
    
    def __init__(self):
        self.gemini_api_key = settings.get_secret("GEMINI_API_KEY")
        self.gemini_api_url = settings.GEMINI_API_URL
        self.health_history: List[Dict[str, Any]] = []
        self.max_history_size = 100
        
    async def check_gemini_health(self) -> Dict[str, Any]:
        """Check Gemini AI service health"""
        start_time = time.time()
        
        try:
            if not self.gemini_api_key:
                return {
                    "service": "gemini",
                    "status": "unhealthy",
                    "error": "API key not configured",
                    "response_time_ms": 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            # Test API with a simple request
            test_prompt = {
                "contents": [{
                    "parts": [{
                        "text": "Hello, this is a health check. Please respond with 'OK'."
                    }]
                }]
            }
            
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": self.gemini_api_key
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.gemini_api_url,
                    json=test_prompt,
                    headers=headers
                )
                
                duration = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    # Record successful request
                    record_ai_request("gemini", "success", duration / 1000)
                    
                    result = {
                        "service": "gemini",
                        "status": "healthy",
                        "response_time_ms": round(duration, 2),
                        "status_code": response.status_code,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    # Record failed request
                    record_ai_request("gemini", "error", duration / 1000)
                    
                    result = {
                        "service": "gemini",
                        "status": "unhealthy",
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "response_time_ms": round(duration, 2),
                        "status_code": response.status_code,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                
                # Store in history
                self._add_to_history(result)
                return result
                
        except httpx.TimeoutException:
            duration = (time.time() - start_time) * 1000
            record_ai_request("gemini", "timeout", duration / 1000)
            
            result = {
                "service": "gemini",
                "status": "unhealthy",
                "error": "Request timeout",
                "response_time_ms": round(duration, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            self._add_to_history(result)
            return result
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            record_ai_request("gemini", "error", duration / 1000)
            
            result = {
                "service": "gemini",
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": round(duration, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            self._add_to_history(result)
            return result
    
    async def check_all_ai_services(self) -> Dict[str, Any]:
        """Check health of all AI services"""
        results = {}
        
        # Check Gemini
        results["gemini"] = await self.check_gemini_health()
        
        # Calculate overall AI health
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
    
    def get_ai_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get AI health check history"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        return [
            entry for entry in self.health_history
            if datetime.fromisoformat(entry["timestamp"]) >= cutoff_time
        ]
    
    def get_ai_performance_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get AI performance metrics from health history"""
        history = self.get_ai_health_history(hours)
        
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
    
    def _add_to_history(self, health_result: Dict[str, Any]):
        """Add health check result to history"""
        self.health_history.append(health_result)
        
        # Keep only the last N entries
        if len(self.health_history) > self.max_history_size:
            self.health_history = self.health_history[-self.max_history_size:]
    
    async def run_continuous_monitoring(self, interval_seconds: int = 300):
        """Run continuous AI health monitoring"""
        logger.info(f"Starting continuous AI health monitoring (interval: {interval_seconds}s)")
        
        while True:
            try:
                await self.check_all_ai_services()
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Error in continuous AI monitoring: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

# Global AI health checker instance
ai_health_checker = AIHealthChecker()

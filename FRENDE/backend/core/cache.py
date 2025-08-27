"""
Caching system for Frende Backend
Provides intelligent caching for database queries and API responses
"""

import asyncio
import json
import hashlib
import logging
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
from functools import wraps
import pickle

from core.config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    """Intelligent caching system for database queries and API responses"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0
        }
        self._lock = asyncio.Lock()
        
        # Cache configuration
        self.default_ttl = 300  # 5 minutes
        self.max_cache_size = 1000
        self.cleanup_interval = 60  # seconds
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_task())
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        async with self._lock:
            if key in self._cache:
                cache_entry = self._cache[key]
                
                # Check if expired
                if datetime.utcnow() > cache_entry["expires_at"]:
                    del self._cache[key]
                    self._cache_stats["misses"] += 1
                    return None
                
                self._cache_stats["hits"] += 1
                return cache_entry["value"]
            
            self._cache_stats["misses"] += 1
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        async with self._lock:
            # Clean up if cache is full
            if len(self._cache) >= self.max_cache_size:
                await self._evict_oldest()
            
            expires_at = datetime.utcnow() + timedelta(seconds=ttl or self.default_ttl)
            
            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.utcnow()
            }
            
            self._cache_stats["sets"] += 1
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._cache_stats["deletes"] += 1
                return True
            return False
    
    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        async with self._lock:
            deleted_count = 0
            keys_to_delete = []
            
            for key in self._cache.keys():
                if pattern in key:
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                del self._cache[key]
                deleted_count += 1
            
            self._cache_stats["deletes"] += deleted_count
            logger.info(f"Invalidated {deleted_count} cache entries matching pattern: {pattern}")
            return deleted_count
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        async with self._lock:
            total_requests = self._cache_stats["hits"] + self._cache_stats["misses"]
            hit_rate = (self._cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "cache_size": len(self._cache),
                "hits": self._cache_stats["hits"],
                "misses": self._cache_stats["misses"],
                "sets": self._cache_stats["sets"],
                "deletes": self._cache_stats["deletes"],
                "hit_rate_percent": round(hit_rate, 2),
                "total_requests": total_requests
            }
    
    async def _evict_oldest(self) -> None:
        """Evict oldest cache entries"""
        if not self._cache:
            return
        
        # Sort by creation time and remove oldest 10%
        sorted_entries = sorted(
            self._cache.items(),
            key=lambda x: x[1]["created_at"]
        )
        
        evict_count = max(1, len(sorted_entries) // 10)
        for key, _ in sorted_entries[:evict_count]:
            del self._cache[key]
        
        logger.info(f"Evicted {evict_count} oldest cache entries")
    
    async def _cleanup_task(self) -> None:
        """Background task to clean up expired entries"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_expired()
            except Exception as e:
                logger.error(f"Error in cache cleanup task: {e}")
    
    async def _cleanup_expired(self) -> None:
        """Remove expired cache entries"""
        async with self._lock:
            current_time = datetime.utcnow()
            expired_keys = [
                key for key, entry in self._cache.items()
                if current_time > entry["expires_at"]
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

# Global cache instance
cache_manager = CacheManager()

def cache_key(*args, **kwargs) -> str:
    """Generate cache key from function arguments"""
    # Create a string representation of arguments
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
    
    # Create hash of the key
    key_string = "|".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()

def cached(ttl: Optional[int] = None, key_prefix: str = ""):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key_str = f"{key_prefix}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key_str)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key_str, result, ttl)
            
            return result
        return wrapper
    return decorator

class QueryCache:
    """Specialized cache for database queries"""
    
    @staticmethod
    async def cache_query(query_key: str, result: Any, ttl: int = 300) -> None:
        """Cache a database query result"""
        await cache_manager.set(f"query:{query_key}", result, ttl)
    
    @staticmethod
    async def get_cached_query(query_key: str) -> Optional[Any]:
        """Get cached database query result"""
        return await cache_manager.get(f"query:{query_key}")
    
    @staticmethod
    async def invalidate_table(table_name: str) -> int:
        """Invalidate all cache entries for a specific table"""
        return await cache_manager.invalidate_pattern(f"query:{table_name}")
    
    @staticmethod
    async def invalidate_user_data(user_id: int) -> int:
        """Invalidate all cache entries for a specific user"""
        return await cache_manager.invalidate_pattern(f"user:{user_id}")

class APICache:
    """Specialized cache for API responses"""
    
    @staticmethod
    async def cache_response(endpoint: str, params: Dict[str, Any], result: Any, ttl: int = 300) -> None:
        """Cache an API response"""
        cache_key_str = f"api:{endpoint}:{cache_key(**params)}"
        await cache_manager.set(cache_key_str, result, ttl)
    
    @staticmethod
    async def get_cached_response(endpoint: str, params: Dict[str, Any]) -> Optional[Any]:
        """Get cached API response"""
        cache_key_str = f"api:{endpoint}:{cache_key(**params)}"
        return await cache_manager.get(cache_key_str)
    
    @staticmethod
    async def invalidate_endpoint(endpoint: str) -> int:
        """Invalidate all cache entries for a specific endpoint"""
        return await cache_manager.invalidate_pattern(f"api:{endpoint}")

# Convenience functions
async def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    return await cache_manager.get_stats()

async def clear_cache() -> None:
    """Clear all cache entries"""
    await cache_manager.clear()

async def invalidate_user_cache(user_id: int) -> int:
    """Invalidate all cache entries for a specific user"""
    return await cache_manager.invalidate_pattern(f"user:{user_id}")

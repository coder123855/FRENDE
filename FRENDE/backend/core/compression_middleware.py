"""
Compression middleware for the Frende backend application.
Provides gzip and brotli compression for API responses and static assets.
"""

import gzip
import logging
from typing import Callable, Optional
from fastapi import Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import brotli

from core.config import settings

logger = logging.getLogger(__name__)

class CompressionMiddleware(BaseHTTPMiddleware):
    """Middleware to provide compression for responses"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.min_size = settings.COMPRESSION_MIN_SIZE
        self.compression_level = settings.COMPRESSION_LEVEL
        self.brotli_enabled = settings.BROTLI_ENABLED
        self.brotli_quality = settings.BROTLI_QUALITY
        
    def _should_compress(self, response: Response, content_type: str) -> bool:
        """Determine if response should be compressed"""
        # Check if content type is compressible
        compressible_types = [
            'text/', 'application/json', 'application/xml', 
            'application/javascript', 'application/css',
            'application/x-yaml', 'application/x-www-form-urlencoded'
        ]
        
        is_compressible = any(ct in content_type for ct in compressible_types)
        
        # Check if response size is large enough to benefit from compression
        content_length = response.headers.get('content-length')
        if content_length:
            try:
                size = int(content_length)
                return is_compressible and size >= self.min_size
            except ValueError:
                pass
        
        return is_compressible
    
    def _compress_gzip(self, content: bytes) -> bytes:
        """Compress content using gzip"""
        try:
            return gzip.compress(content, compresslevel=self.compression_level)
        except Exception as e:
            logger.error(f"Gzip compression failed: {str(e)}")
            return content
    
    def _compress_brotli(self, content: bytes) -> bytes:
        """Compress content using brotli"""
        try:
            return brotli.compress(content, quality=self.brotli_quality)
        except Exception as e:
            logger.error(f"Brotli compression failed: {str(e)}")
            return content
    
    def _get_compression_type(self, request: Request) -> Optional[str]:
        """Get the preferred compression type from request headers"""
        accept_encoding = request.headers.get('accept-encoding', '').lower()
        
        # Check for brotli support first (better compression)
        if self.brotli_enabled and 'br' in accept_encoding:
            return 'br'
        
        # Fallback to gzip
        if 'gzip' in accept_encoding:
            return 'gzip'
        
        return None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip compression for certain paths
        skip_paths = {
            '/health', '/metrics', '/docs', '/redoc', '/openapi.json',
            '/favicon.ico', '/robots.txt'
        }
        
        if request.url.path in skip_paths:
            return await call_next(request)
        
        # Get the response
        response = await call_next(request)
        
        # Check if compression is needed and supported
        compression_type = self._get_compression_type(request)
        if not compression_type:
            return response
        
        content_type = response.headers.get('content-type', '')
        if not self._should_compress(response, content_type):
            return response
        
        # Get response content
        if hasattr(response, 'body'):
            content = response.body
        else:
            # For streaming responses, we can't compress easily
            return response
        
        if not content:
            return response
        
        # Compress content
        if compression_type == 'br':
            compressed_content = self._compress_brotli(content)
            if compressed_content != content:
                response.headers['content-encoding'] = 'br'
                response.headers['content-length'] = str(len(compressed_content))
                response.body = compressed_content
        elif compression_type == 'gzip':
            compressed_content = self._compress_gzip(content)
            if compressed_content != content:
                response.headers['content-encoding'] = 'gzip'
                response.headers['content-length'] = str(len(compressed_content))
                response.body = compressed_content
        
        # Add Vary header for proper caching
        if 'vary' not in response.headers:
            response.headers['vary'] = 'Accept-Encoding'
        elif 'accept-encoding' not in response.headers['vary'].lower():
            response.headers['vary'] = f"{response.headers['vary']}, Accept-Encoding"
        
        return response

def create_compression_middleware(app: ASGIApp) -> ASGIApp:
    """Create and apply compression middleware"""
    if settings.COMPRESSION_ENABLED:
        app = CompressionMiddleware(app)
    return app

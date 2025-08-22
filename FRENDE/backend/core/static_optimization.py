"""
Optimized static file handling for the Frende backend application.
Provides enhanced caching, CDN optimization, and asset management.
"""

import os
import mimetypes
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp

from core.config import settings

logger = logging.getLogger(__name__)

class OptimizedStaticFiles(StaticFiles):
    """Enhanced static files handler with CDN optimization"""
    
    def __init__(self, directory: str, **kwargs):
        super().__init__(directory, **kwargs)
        self.cache_config = self._get_cache_config()
        
    def _get_cache_config(self) -> Dict[str, Dict[str, Any]]:
        """Get cache configuration for different file types"""
        return {
            # Images - long cache with immutable
            'images': {
                'extensions': {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif'},
                'cache_control': 'public, max-age=31536000, immutable',
                'cdn_cache_control': 'public, max-age=31536000, immutable',
                'vary': 'Accept-Encoding'
            },
            # Fonts - long cache with immutable
            'fonts': {
                'extensions': {'.woff', '.woff2', '.ttf', '.eot', '.otf'},
                'cache_control': 'public, max-age=31536000, immutable',
                'cdn_cache_control': 'public, max-age=31536000, immutable',
                'vary': 'Accept-Encoding'
            },
            # CSS and JS - long cache with immutable
            'styles_scripts': {
                'extensions': {'.css', '.js', '.mjs'},
                'cache_control': 'public, max-age=31536000, immutable',
                'cdn_cache_control': 'public, max-age=31536000, immutable',
                'vary': 'Accept-Encoding'
            },
            # Documents - medium cache
            'documents': {
                'extensions': {'.pdf', '.txt', '.md', '.json', '.xml'},
                'cache_control': 'public, max-age=86400',
                'cdn_cache_control': 'public, max-age=86400',
                'vary': 'Accept-Encoding'
            },
            # Default - short cache
            'default': {
                'extensions': set(),
                'cache_control': 'public, max-age=3600',
                'cdn_cache_control': 'public, max-age=3600',
                'vary': 'Accept-Encoding'
            }
        }
    
    def _get_file_config(self, file_path: str) -> Dict[str, Any]:
        """Get cache configuration for a specific file"""
        file_ext = Path(file_path).suffix.lower()
        
        for config_name, config in self.cache_config.items():
            if file_ext in config['extensions']:
                return config
        
        return self.cache_config['default']
    
    def _add_cache_headers(self, response: Response, file_path: str) -> Response:
        """Add appropriate cache headers to response"""
        config = self._get_file_config(file_path)
        
        # Add cache control headers
        response.headers['Cache-Control'] = config['cache_control']
        response.headers['CDN-Cache-Control'] = config['cdn_cache_control']
        
        # Add Vary header for compression
        if config.get('vary'):
            response.headers['Vary'] = config['vary']
        
        # Add additional CDN headers
        if settings.CDN_ENABLED:
            response.headers['X-CDN-Cache'] = 'HIT'
            response.headers['X-CDN-Provider'] = 'Vercel'
        
        return response
    
    def _optimize_image_headers(self, response: Response, file_path: str) -> Response:
        """Add image-specific optimization headers"""
        file_ext = Path(file_path).suffix.lower()
        
        # Add image optimization headers
        if file_ext in {'.webp', '.avif'}:
            response.headers['X-Image-Optimized'] = 'true'
        
        # Add format-specific headers
        if file_ext == '.webp':
            response.headers['X-Image-Format'] = 'WebP'
        elif file_ext == '.avif':
            response.headers['X-Image-Format'] = 'AVIF'
        
        return response
    
    async def get_response(self, path: str, scope) -> Response:
        """Get optimized response for static file"""
        try:
            # Get the base response
            response = await super().get_response(path, scope)
            
            # Add cache headers
            response = self._add_cache_headers(response, path)
            
            # Add image optimization headers
            if Path(path).suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'}:
                response = self._optimize_image_headers(response, path)
            
            # Add security headers for static assets
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            
            return response
            
        except HTTPException as e:
            if e.status_code == 404:
                logger.warning(f"Static file not found: {path}")
            raise
    
    def _get_file_size(self, file_path: str) -> Optional[int]:
        """Get file size for optimization decisions"""
        try:
            full_path = os.path.join(self.directory, file_path.lstrip('/'))
            if os.path.exists(full_path):
                return os.path.getsize(full_path)
        except Exception as e:
            logger.error(f"Error getting file size for {file_path}: {str(e)}")
        return None

class StaticAssetOptimizer:
    """Utility class for static asset optimization"""
    
    @staticmethod
    def get_optimized_path(original_path: str, optimization_type: str = 'webp') -> str:
        """Get optimized version path for an image"""
        path = Path(original_path)
        if path.suffix.lower() in {'.png', '.jpg', '.jpeg'}:
            return str(path.with_suffix(f'.{optimization_type}'))
        return original_path
    
    @staticmethod
    def should_optimize(file_path: str, file_size: int) -> bool:
        """Determine if file should be optimized"""
        # Only optimize images larger than 10KB
        if file_size < 10 * 1024:
            return False
        
        # Only optimize image files
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif'}
        return Path(file_path).suffix.lower() in image_extensions
    
    @staticmethod
    def get_compression_ratio(original_size: int, compressed_size: int) -> float:
        """Calculate compression ratio"""
        if original_size == 0:
            return 0.0
        return (original_size - compressed_size) / original_size * 100

def create_optimized_static_files(directory: str) -> OptimizedStaticFiles:
    """Create optimized static files handler"""
    return OptimizedStaticFiles(directory=directory)

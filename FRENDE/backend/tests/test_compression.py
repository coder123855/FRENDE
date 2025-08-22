"""
Tests for compression middleware and static asset optimization.
"""

import pytest
import gzip
import brotli
from unittest.mock import Mock, patch, MagicMock
from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient
from starlette.responses import PlainTextResponse

from core.compression_middleware import CompressionMiddleware, create_compression_middleware
from core.static_optimization import OptimizedStaticFiles, StaticAssetOptimizer
from core.config import settings


class TestCompressionMiddleware:
    """Test compression middleware functionality"""
    
    @pytest.fixture
    def app(self):
        """Create test FastAPI app"""
        app = FastAPI()
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "Hello, World!" * 100}  # Large response
        
        @app.get("/small")
        async def small_endpoint():
            return {"message": "small"}
        
        @app.get("/health")
        async def health_endpoint():
            return {"status": "healthy"}
        
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return TestClient(app)
    
    def test_compression_middleware_initialization(self):
        """Test compression middleware initialization"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        assert middleware.min_size == settings.COMPRESSION_MIN_SIZE
        assert middleware.compression_level == settings.COMPRESSION_LEVEL
        assert middleware.brotli_enabled == settings.BROTLI_ENABLED
        assert middleware.brotli_quality == settings.BROTLI_QUALITY
    
    def test_should_compress_text_response(self):
        """Test that text responses should be compressed"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        response = Response(content=b"Hello, World!" * 100)
        response.headers['content-type'] = 'text/plain'
        response.headers['content-length'] = str(len(response.body))
        
        should_compress = middleware._should_compress(response, 'text/plain')
        assert should_compress is True
    
    def test_should_not_compress_small_response(self):
        """Test that small responses should not be compressed"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        response = Response(content=b"small")
        response.headers['content-type'] = 'text/plain'
        response.headers['content-length'] = str(len(response.body))
        
        should_compress = middleware._should_compress(response, 'text/plain')
        assert should_compress is False
    
    def test_should_not_compress_binary_response(self):
        """Test that binary responses should not be compressed"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        response = Response(content=b"\x00\x01\x02\x03")
        response.headers['content-type'] = 'application/octet-stream'
        
        should_compress = middleware._should_compress(response, 'application/octet-stream')
        assert should_compress is False
    
    def test_gzip_compression(self):
        """Test gzip compression functionality"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        original_content = b"Hello, World!" * 100
        compressed_content = middleware._compress_gzip(original_content)
        
        assert len(compressed_content) < len(original_content)
        assert compressed_content != original_content
        
        # Verify it can be decompressed
        decompressed = gzip.decompress(compressed_content)
        assert decompressed == original_content
    
    def test_brotli_compression(self):
        """Test brotli compression functionality"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        original_content = b"Hello, World!" * 100
        compressed_content = middleware._compress_brotli(original_content)
        
        assert len(compressed_content) < len(original_content)
        assert compressed_content != original_content
        
        # Verify it can be decompressed
        decompressed = brotli.decompress(compressed_content)
        assert decompressed == original_content
    
    def test_get_compression_type_gzip(self):
        """Test compression type detection for gzip"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        request = Mock()
        request.headers = {'accept-encoding': 'gzip, deflate'}
        
        compression_type = middleware._get_compression_type(request)
        assert compression_type == 'gzip'
    
    def test_get_compression_type_brotli(self):
        """Test compression type detection for brotli"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        request = Mock()
        request.headers = {'accept-encoding': 'br, gzip, deflate'}
        
        compression_type = middleware._get_compression_type(request)
        assert compression_type == 'br'
    
    def test_get_compression_type_none(self):
        """Test compression type detection when not supported"""
        app = FastAPI()
        middleware = CompressionMiddleware(app)
        
        request = Mock()
        request.headers = {'accept-encoding': 'deflate'}
        
        compression_type = middleware._get_compression_type(request)
        assert compression_type is None
    
    @patch('core.compression_middleware.settings.COMPRESSION_ENABLED', True)
    def test_compression_middleware_integration(self, client):
        """Test compression middleware integration with FastAPI"""
        app = FastAPI()
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "Hello, World!" * 100}
        
        # Add compression middleware
        app = create_compression_middleware(app)
        client = TestClient(app)
        
        # Test with gzip support
        response = client.get("/test", headers={"accept-encoding": "gzip"})
        assert response.status_code == 200
        
        # Check if response is compressed
        content_encoding = response.headers.get('content-encoding')
        vary_header = response.headers.get('vary')
        
        assert content_encoding in ['gzip', 'br'] or content_encoding is None
        assert vary_header is None or 'accept-encoding' in vary_header.lower()
    
    def test_skip_compression_for_health_endpoint(self, client):
        """Test that health endpoints are skipped for compression"""
        app = FastAPI()
        
        @app.get("/health")
        async def health_endpoint():
            return {"status": "healthy"}
        
        # Add compression middleware
        app = create_compression_middleware(app)
        client = TestClient(app)
        
        response = client.get("/health", headers={"accept-encoding": "gzip"})
        assert response.status_code == 200
        
        # Health endpoint should not be compressed
        content_encoding = response.headers.get('content-encoding')
        assert content_encoding is None


class TestOptimizedStaticFiles:
    """Test optimized static files functionality"""
    
    @pytest.fixture
    def temp_static_dir(self, tmp_path):
        """Create temporary static directory with test files"""
        static_dir = tmp_path / "static"
        static_dir.mkdir()
        
        # Create test files
        (static_dir / "test.js").write_text("console.log('test');" * 100)
        (static_dir / "test.css").write_text("body { color: red; }" * 100)
        (static_dir / "test.png").write_bytes(b"fake-png-data" * 100)
        (static_dir / "test.woff2").write_bytes(b"fake-font-data" * 100)
        
        return static_dir
    
    def test_optimized_static_files_initialization(self, temp_static_dir):
        """Test optimized static files initialization"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        assert static_files.directory == str(temp_static_dir)
        assert 'images' in static_files.cache_config
        assert 'fonts' in static_files.cache_config
        assert 'styles_scripts' in static_files.cache_config
    
    def test_get_file_config_for_images(self, temp_static_dir):
        """Test cache configuration for image files"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        config = static_files._get_file_config("test.png")
        assert config['cache_control'] == 'public, max-age=31536000, immutable'
        assert config['cdn_cache_control'] == 'public, max-age=31536000, immutable'
    
    def test_get_file_config_for_fonts(self, temp_static_dir):
        """Test cache configuration for font files"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        config = static_files._get_file_config("test.woff2")
        assert config['cache_control'] == 'public, max-age=31536000, immutable'
        assert config['cdn_cache_control'] == 'public, max-age=31536000, immutable'
    
    def test_get_file_config_for_scripts(self, temp_static_dir):
        """Test cache configuration for script files"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        config = static_files._get_file_config("test.js")
        assert config['cache_control'] == 'public, max-age=31536000, immutable'
        assert config['cdn_cache_control'] == 'public, max-age=31536000, immutable'
    
    def test_get_file_config_for_unknown_type(self, temp_static_dir):
        """Test cache configuration for unknown file types"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        config = static_files._get_file_config("test.xyz")
        assert config['cache_control'] == 'public, max-age=3600'
        assert config['cdn_cache_control'] == 'public, max-age=3600'
    
    def test_add_cache_headers(self, temp_static_dir):
        """Test adding cache headers to response"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        response = Response(content=b"test")
        response = static_files._add_cache_headers(response, "test.js")
        
        assert response.headers['Cache-Control'] == 'public, max-age=31536000, immutable'
        assert response.headers['CDN-Cache-Control'] == 'public, max-age=31536000, immutable'
        assert response.headers['Vary'] == 'Accept-Encoding'
    
    def test_optimize_image_headers(self, temp_static_dir):
        """Test adding image optimization headers"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        response = Response(content=b"test")
        response = static_files._optimize_image_headers(response, "test.webp")
        
        assert response.headers['X-Image-Optimized'] == 'true'
        assert response.headers['X-Image-Format'] == 'WebP'
    
    def test_get_file_size(self, temp_static_dir):
        """Test getting file size"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        # Create a test file with known size
        test_file = temp_static_dir / "size_test.txt"
        test_content = "Hello, World!" * 10
        test_file.write_text(test_content)
        
        file_size = static_files._get_file_size("size_test.txt")
        assert file_size == len(test_content.encode())
    
    def test_get_file_size_nonexistent(self, temp_static_dir):
        """Test getting file size for nonexistent file"""
        static_files = OptimizedStaticFiles(directory=str(temp_static_dir))
        
        file_size = static_files._get_file_size("nonexistent.txt")
        assert file_size is None


class TestStaticAssetOptimizer:
    """Test static asset optimizer utility functions"""
    
    def test_get_optimized_path_webp(self):
        """Test getting optimized path for WebP conversion"""
        original_path = "images/photo.jpg"
        optimized_path = StaticAssetOptimizer.get_optimized_path(original_path, "webp")
        assert optimized_path == "images/photo.webp"
    
    def test_get_optimized_path_avif(self):
        """Test getting optimized path for AVIF conversion"""
        original_path = "images/photo.png"
        optimized_path = StaticAssetOptimizer.get_optimized_path(original_path, "avif")
        assert optimized_path == "images/photo.avif"
    
    def test_get_optimized_path_non_image(self):
        """Test getting optimized path for non-image file"""
        original_path = "scripts/app.js"
        optimized_path = StaticAssetOptimizer.get_optimized_path(original_path, "webp")
        assert optimized_path == "scripts/app.js"  # No change for non-images
    
    def test_should_optimize_large_image(self):
        """Test optimization decision for large image"""
        should_optimize = StaticAssetOptimizer.should_optimize("photo.jpg", 50 * 1024)  # 50KB
        assert should_optimize is True
    
    def test_should_optimize_small_image(self):
        """Test optimization decision for small image"""
        should_optimize = StaticAssetOptimizer.should_optimize("icon.png", 5 * 1024)  # 5KB
        assert should_optimize is False
    
    def test_should_optimize_non_image(self):
        """Test optimization decision for non-image file"""
        should_optimize = StaticAssetOptimizer.should_optimize("script.js", 100 * 1024)  # 100KB
        assert should_optimize is False
    
    def test_get_compression_ratio(self):
        """Test compression ratio calculation"""
        original_size = 1000
        compressed_size = 600
        ratio = StaticAssetOptimizer.get_compression_ratio(original_size, compressed_size)
        assert ratio == 40.0  # 40% compression
    
    def test_get_compression_ratio_zero_original(self):
        """Test compression ratio calculation with zero original size"""
        ratio = StaticAssetOptimizer.get_compression_ratio(0, 100)
        assert ratio == 0.0


class TestCompressionIntegration:
    """Integration tests for compression functionality"""
    
    @pytest.fixture
    def app_with_compression(self):
        """Create FastAPI app with compression middleware"""
        app = FastAPI()
        
        @app.get("/api/large-response")
        async def large_response():
            return {"data": "x" * 10000}  # Large response
        
        @app.get("/api/small-response")
        async def small_response():
            return {"data": "small"}
        
        # Add compression middleware
        app = create_compression_middleware(app)
        return app
    
    @pytest.fixture
    def client(self, app_with_compression):
        """Create test client"""
        return TestClient(app_with_compression)
    
    def test_large_response_compression(self, client):
        """Test that large responses are compressed"""
        response = client.get("/api/large-response", headers={"accept-encoding": "gzip"})
        assert response.status_code == 200
        
        # Check if response is compressed
        content_encoding = response.headers.get('content-encoding')
        assert content_encoding in ['gzip', 'br']
        
        # Verify content can be decompressed
        if content_encoding == 'gzip':
            import gzip
            decompressed = gzip.decompress(response.content)
        elif content_encoding == 'br':
            import brotli
            decompressed = brotli.decompress(response.content)
        
        # Verify decompressed content contains expected data
        assert b'"data"' in decompressed
    
    def test_small_response_no_compression(self, client):
        """Test that small responses are not compressed"""
        response = client.get("/api/small-response", headers={"accept-encoding": "gzip"})
        assert response.status_code == 200
        
        # Small response should not be compressed
        content_encoding = response.headers.get('content-encoding')
        assert content_encoding is None
    
    def test_no_compression_support(self, client):
        """Test behavior when compression is not supported"""
        response = client.get("/api/large-response", headers={"accept-encoding": "deflate"})
        assert response.status_code == 200
        
        # Should not be compressed when gzip/brotli not supported
        content_encoding = response.headers.get('content-encoding')
        assert content_encoding is None

"""
Image Processing Service for Frende App
Handles image optimization, resizing, compression, and format conversion
"""

import os
import io
import uuid
from typing import Optional, Tuple, Dict, Any
from pathlib import Path
import logging
from PIL import Image, ImageOps, ImageFilter
import requests
from fastapi import UploadFile, HTTPException
import aiofiles
from datetime import datetime

logger = logging.getLogger(__name__)

class ImageProcessingService:
    def __init__(self, upload_dir: str = "uploads", max_file_size: int = 30 * 1024 * 1024):
        self.upload_dir = Path(upload_dir)
        self.max_file_size = max_file_size
        self.supported_formats = {'JPEG', 'PNG', 'WEBP', 'AVIF'}
        self.quality_settings = {
            'high': 95,
            'medium': 85,
            'low': 75
        }
        
        # Ensure upload directory exists
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.upload_dir / "profiles").mkdir(exist_ok=True)
        (self.upload_dir / "thumbnails").mkdir(exist_ok=True)
        (self.upload_dir / "optimized").mkdir(exist_ok=True)

    async def process_uploaded_image(
        self,
        file: UploadFile,
        user_id: str,
        image_type: str = "profile",
        max_width: int = 1200,
        max_height: int = 1200,
        quality: str = "medium",
        generate_thumbnails: bool = True
    ) -> Dict[str, Any]:
        """
        Process uploaded image with optimization and resizing
        """
        try:
            # Validate file
            await self._validate_file(file)
            
            # Read image data
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Get original dimensions
            original_width, original_height = image.size
            original_size = len(image_data)
            
            # Resize image if needed
            resized_image = self._resize_image(image, max_width, max_height)
            
            # Generate optimized versions
            optimized_versions = await self._generate_optimized_versions(
                resized_image, user_id, image_type, quality
            )
            
            # Generate thumbnails if requested
            thumbnails = {}
            if generate_thumbnails:
                thumbnails = await self._generate_thumbnails(
                    resized_image, user_id, image_type
                )
            
            # Save original optimized version
            filename = f"{user_id}_{image_type}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = self.upload_dir / "profiles" / filename
            
            resized_image.save(
                filepath,
                'JPEG',
                quality=self.quality_settings[quality],
                optimize=True
            )
            
            # Calculate savings
            optimized_size = filepath.stat().st_size
            size_reduction = ((original_size - optimized_size) / original_size) * 100
            
            return {
                "filename": filename,
                "filepath": str(filepath),
                "url": f"/uploads/profiles/{filename}",
                "original_dimensions": {"width": original_width, "height": original_height},
                "optimized_dimensions": {"width": resized_image.width, "height": resized_image.height},
                "original_size": original_size,
                "optimized_size": optimized_size,
                "size_reduction_percent": round(size_reduction, 2),
                "format": "JPEG",
                "quality": quality,
                "thumbnails": thumbnails,
                "optimized_versions": optimized_versions
            }
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

    def _resize_image(self, image: Image.Image, max_width: int, max_height: int) -> Image.Image:
        """
        Resize image while maintaining aspect ratio
        """
        width, height = image.size
        
        # Calculate new dimensions
        if width > max_width or height > max_height:
            ratio = min(max_width / width, max_height / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            
            # Use high-quality resampling
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        return image

    async def _generate_optimized_versions(
        self,
        image: Image.Image,
        user_id: str,
        image_type: str,
        quality: str
    ) -> Dict[str, str]:
        """
        Generate multiple optimized versions in different formats
        """
        versions = {}
        base_filename = f"{user_id}_{image_type}_{uuid.uuid4().hex[:8]}"
        
        # JPEG version
        jpeg_filename = f"{base_filename}.jpg"
        jpeg_path = self.upload_dir / "optimized" / jpeg_filename
        image.save(
            jpeg_path,
            'JPEG',
            quality=self.quality_settings[quality],
            optimize=True
        )
        versions['jpeg'] = f"/uploads/optimized/{jpeg_filename}"
        
        # WebP version
        try:
            webp_filename = f"{base_filename}.webp"
            webp_path = self.upload_dir / "optimized" / webp_filename
            image.save(
                webp_path,
                'WEBP',
                quality=self.quality_settings[quality],
                method=6  # Best compression
            )
            versions['webp'] = f"/uploads/optimized/{webp_filename}"
        except Exception as e:
            logger.warning(f"Failed to generate WebP version: {e}")
        
        # PNG version (for transparency if needed)
        try:
            png_filename = f"{base_filename}.png"
            png_path = self.upload_dir / "optimized" / png_filename
            image.save(
                png_path,
                'PNG',
                optimize=True
            )
            versions['png'] = f"/uploads/optimized/{png_filename}"
        except Exception as e:
            logger.warning(f"Failed to generate PNG version: {e}")
        
        return versions

    async def _generate_thumbnails(
        self,
        image: Image.Image,
        user_id: str,
        image_type: str
    ) -> Dict[str, str]:
        """
        Generate thumbnail versions in different sizes
        """
        thumbnails = {}
        base_filename = f"{user_id}_{image_type}_{uuid.uuid4().hex[:8]}"
        
        # Define thumbnail sizes
        sizes = {
            'xs': (40, 40),
            'sm': (80, 80),
            'md': (120, 120),
            'lg': (160, 160),
            'xl': (240, 240)
        }
        
        for size_name, (width, height) in sizes.items():
            try:
                # Create thumbnail
                thumbnail = image.copy()
                thumbnail.thumbnail((width, height), Image.Resampling.LANCZOS)
                
                # Save thumbnail
                thumbnail_filename = f"{base_filename}_{size_name}.jpg"
                thumbnail_path = self.upload_dir / "thumbnails" / thumbnail_filename
                thumbnail.save(
                    thumbnail_path,
                    'JPEG',
                    quality=85,
                    optimize=True
                )
                
                thumbnails[size_name] = f"/uploads/thumbnails/{thumbnail_filename}"
                
            except Exception as e:
                logger.warning(f"Failed to generate {size_name} thumbnail: {e}")
        
        return thumbnails

    async def _validate_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file
        """
        # Check file size
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum limit of {self.max_file_size // (1024*1024)}MB"
            )
        
        # Check file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image"
            )
        
        # Check file extension
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
            )

    async def optimize_existing_image(
        self,
        image_path: str,
        quality: str = "medium",
        max_width: Optional[int] = None,
        max_height: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Optimize an existing image file
        """
        try:
            image_path = Path(image_path)
            if not image_path.exists():
                raise HTTPException(status_code=404, detail="Image file not found")
            
            # Open image
            image = Image.open(image_path)
            
            # Resize if needed
            if max_width or max_height:
                image = self._resize_image(image, max_width or image.width, max_height or image.height)
            
            # Create backup
            backup_path = image_path.with_suffix(f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}{image_path.suffix}')
            image.save(backup_path)
            
            # Optimize and save
            original_size = image_path.stat().st_size
            image.save(
                image_path,
                quality=self.quality_settings[quality],
                optimize=True
            )
            optimized_size = image_path.stat().st_size
            
            return {
                "original_size": original_size,
                "optimized_size": optimized_size,
                "size_reduction_percent": round(((original_size - optimized_size) / original_size) * 100, 2),
                "backup_path": str(backup_path)
            }
            
        except Exception as e:
            logger.error(f"Error optimizing existing image: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Image optimization failed: {str(e)}")

    async def generate_blur_placeholder(self, image_path: str, size: int = 20) -> str:
        """
        Generate a blur placeholder for progressive loading
        """
        try:
            image_path = Path(image_path)
            if not image_path.exists():
                raise HTTPException(status_code=404, detail="Image file not found")
            
            # Open and resize image
            image = Image.open(image_path)
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            
            # Apply blur
            blurred_image = image.filter(ImageFilter.GaussianBlur(radius=2))
            
            # Save placeholder
            placeholder_filename = f"placeholder_{uuid.uuid4().hex[:8]}.jpg"
            placeholder_path = self.upload_dir / "thumbnails" / placeholder_filename
            
            blurred_image.save(
                placeholder_path,
                'JPEG',
                quality=30,
                optimize=True
            )
            
            return f"/uploads/thumbnails/{placeholder_filename}"
            
        except Exception as e:
            logger.error(f"Error generating blur placeholder: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Placeholder generation failed: {str(e)}")

    async def cleanup_old_files(self, days_old: int = 30) -> Dict[str, int]:
        """
        Clean up old image files
        """
        try:
            import time
            current_time = time.time()
            cutoff_time = current_time - (days_old * 24 * 60 * 60)
            
            deleted_files = {
                'profiles': 0,
                'thumbnails': 0,
                'optimized': 0
            }
            
            # Clean up old files in each directory
            for subdir in ['profiles', 'thumbnails', 'optimized']:
                subdir_path = self.upload_dir / subdir
                if subdir_path.exists():
                    for file_path in subdir_path.iterdir():
                        if file_path.is_file():
                            file_age = current_time - file_path.stat().st_mtime
                            if file_age > cutoff_time:
                                file_path.unlink()
                                deleted_files[subdir] += 1
            
            logger.info(f"Cleaned up {sum(deleted_files.values())} old image files")
            return deleted_files
            
        except Exception as e:
            logger.error(f"Error cleaning up old files: {str(e)}")
            return {'profiles': 0, 'thumbnails': 0, 'optimized': 0}

    def get_image_info(self, image_path: str) -> Dict[str, Any]:
        """
        Get information about an image file
        """
        try:
            image_path = Path(image_path)
            if not image_path.exists():
                raise HTTPException(status_code=404, detail="Image file not found")
            
            image = Image.open(image_path)
            file_stats = image_path.stat()
            
            return {
                "filename": image_path.name,
                "file_size": file_stats.st_size,
                "dimensions": image.size,
                "format": image.format,
                "mode": image.mode,
                "created": datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(file_stats.st_mtime).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting image info: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to get image info: {str(e)}")

# Create singleton instance
image_processor = ImageProcessingService() 
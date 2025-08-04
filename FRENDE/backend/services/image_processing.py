import os
import uuid
from typing import Tuple, Optional
from PIL import Image, ImageDraw
import io
import logging
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class ImageProcessingService:
    """Service for processing and validating profile pictures"""
    
    def __init__(self):
        self.max_file_size = 30 * 1024 * 1024  # 30MB
        self.target_size = (320, 320)
        self.allowed_formats = {'JPEG', 'PNG', 'JPG'}
        
    def validate_image(self, file_content: bytes, filename: str) -> Tuple[bool, str]:
        """
        Validate uploaded image file
        
        Args:
            file_content: Raw file content
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check file size
            if len(file_content) > self.max_file_size:
                return False, f"File size exceeds {self.max_file_size // (1024*1024)}MB limit"
            
            # Check file extension
            file_ext = os.path.splitext(filename)[1].upper().lstrip('.')
            if file_ext not in self.allowed_formats:
                return False, f"Unsupported file format. Allowed: {', '.join(self.allowed_formats)}"
            
            # Validate image content
            try:
                image = Image.open(io.BytesIO(file_content))
                image.verify()
            except Exception:
                return False, "Invalid image file"
            
            # Check if it's actually an image
            image = Image.open(io.BytesIO(file_content))
            if image.format not in self.allowed_formats:
                return False, f"Image format not supported. Allowed: {', '.join(self.allowed_formats)}"
            
            return True, ""
            
        except Exception as e:
            logger.error(f"Error validating image: {str(e)}")
            return False, "Error processing image file"
    
    def process_profile_picture(self, file_content: bytes) -> bytes:
        """
        Process profile picture: resize to 320x320 and apply circular crop
        
        Args:
            file_content: Raw image file content
            
        Returns:
            Processed image as bytes
        """
        try:
            # Open image
            image = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Resize image to target size while maintaining aspect ratio
            image.thumbnail(self.target_size, Image.Resampling.LANCZOS)
            
            # Create a new image with target size and white background
            new_image = Image.new('RGB', self.target_size, (255, 255, 255))
            
            # Calculate position to center the image
            x = (self.target_size[0] - image.width) // 2
            y = (self.target_size[1] - image.height) // 2
            
            # Paste the resized image onto the new image
            new_image.paste(image, (x, y))
            
            # Apply circular mask
            mask = Image.new('L', self.target_size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, self.target_size[0], self.target_size[1]), fill=255)
            
            # Apply mask
            output = Image.new('RGBA', self.target_size, (0, 0, 0, 0))
            output.paste(new_image, (0, 0))
            output.putalpha(mask)
            
            # Convert back to RGB for JPEG compatibility
            output = output.convert('RGB')
            
            # Save to bytes
            output_bytes = io.BytesIO()
            output.save(output_bytes, format='JPEG', quality=85, optimize=True)
            output_bytes.seek(0)
            
            return output_bytes.getvalue()
            
        except Exception as e:
            logger.error(f"Error processing profile picture: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing image"
            )
    
    def generate_filename(self, user_id: int, original_filename: str) -> str:
        """
        Generate unique filename for profile picture
        
        Args:
            user_id: User ID
            original_filename: Original uploaded filename
            
        Returns:
            Unique filename
        """
        # Get file extension
        ext = os.path.splitext(original_filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png']:
            ext = '.jpg'  # Default to JPEG
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())[:8]
        return f"profile_{user_id}_{unique_id}{ext}"
    
    def get_file_extension(self, filename: str) -> str:
        """Get file extension from filename"""
        return os.path.splitext(filename)[1].lower()

# Create service instance
image_processing_service = ImageProcessingService() 
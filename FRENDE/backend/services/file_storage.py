import os
import aiofiles
import logging
from pathlib import Path
from typing import Optional
from fastapi import HTTPException, status
from core.config import settings

logger = logging.getLogger(__name__)

class FileStorageService:
    """Service for handling file storage operations"""
    
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.profile_dir = self.upload_dir / "profiles"
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure upload directories exist"""
        self.profile_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_profile_picture(
        self, 
        user_id: int, 
        filename: str, 
        file_content: bytes
    ) -> str:
        """
        Save profile picture to storage
        
        Args:
            user_id: User ID
            filename: Generated filename
            file_content: Processed image content
            
        Returns:
            File path relative to upload directory
        """
        try:
            # Create user-specific directory
            user_dir = self.profile_dir / str(user_id)
            user_dir.mkdir(exist_ok=True)
            
            # Full file path
            file_path = user_dir / filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            # Return relative path for database storage
            relative_path = str(file_path.relative_to(self.upload_dir))
            
            logger.info(f"Saved profile picture for user {user_id}: {relative_path}")
            return relative_path
            
        except Exception as e:
            logger.error(f"Error saving profile picture for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error saving profile picture"
            )
    
    async def delete_profile_picture(self, file_path: str) -> bool:
        """
        Delete profile picture from storage
        
        Args:
            file_path: Relative file path from database
            
        Returns:
            True if deleted successfully, False if file doesn't exist
        """
        try:
            full_path = self.upload_dir / file_path
            
            if full_path.exists():
                full_path.unlink()
                logger.info(f"Deleted profile picture: {file_path}")
                return True
            else:
                logger.warning(f"Profile picture not found: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting profile picture {file_path}: {str(e)}")
            return False
    
    def get_profile_picture_url(self, file_path: Optional[str]) -> Optional[str]:
        """
        Get public URL for profile picture
        
        Args:
            file_path: Relative file path from database
            
        Returns:
            Public URL or None if no picture
        """
        if not file_path:
            return None
        
        # For development, return local file path
        # In production, this would return a CDN URL
        return f"/uploads/{file_path}"
    
    async def cleanup_old_profile_pictures(self, user_id: int, keep_filename: str):
        """
        Clean up old profile pictures for a user
        
        Args:
            user_id: User ID
            keep_filename: Filename to keep (current profile picture)
        """
        try:
            user_dir = self.profile_dir / str(user_id)
            
            if not user_dir.exists():
                return
            
            # Delete all profile pictures except the current one
            for file_path in user_dir.iterdir():
                if file_path.is_file() and file_path.name != keep_filename:
                    file_path.unlink()
                    logger.info(f"Cleaned up old profile picture: {file_path.name}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up old profile pictures for user {user_id}: {str(e)}")

# Create service instance
file_storage_service = FileStorageService() 
"""
File Management Service for Frende App
Handles file lifecycle management, cleanup, optimization, and backup operations
"""

import os
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import aiofiles
import shutil

from core.config import settings
from models.user import User
from models.chat import ChatMessage
from services.file_storage import file_storage_service

logger = logging.getLogger(__name__)

class FileManagementService:
    """Service for managing file lifecycle and optimization"""
    
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.backup_dir = Path("backups")
        self.temp_dir = Path("temp")
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure all required directories exist"""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def cleanup_orphaned_files(self, session: AsyncSession) -> Dict[str, Any]:
        """
        Find and delete files not referenced in database
        
        Returns:
            Dictionary with cleanup statistics
        """
        try:
            # Get all profile pictures referenced in database
            result = await session.execute(
                select(User.profile_picture_url).where(User.profile_picture_url.isnot(None))
            )
            referenced_files = {row[0] for row in result.fetchall()}
            
            # Scan upload directory for orphaned files
            orphaned_files = []
            total_size_freed = 0
            
            for file_path in self.upload_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = str(file_path.relative_to(self.upload_dir))
                    
                    # Check if file is referenced in database
                    if relative_path not in referenced_files:
                        file_size = file_path.stat().st_size
                        orphaned_files.append({
                            "path": relative_path,
                            "size": file_size,
                            "modified": datetime.fromtimestamp(file_path.stat().st_mtime)
                        })
                        
                        # Delete orphaned file
                        file_path.unlink()
                        total_size_freed += file_size
            
            logger.info(f"Cleaned up {len(orphaned_files)} orphaned files, freed {total_size_freed} bytes")
            
            return {
                "orphaned_files_count": len(orphaned_files),
                "total_size_freed": total_size_freed,
                "orphaned_files": orphaned_files[:10]  # Return first 10 for logging
            }
            
        except Exception as e:
            logger.error(f"Error cleaning up orphaned files: {str(e)}")
            return {
                "error": str(e),
                "orphaned_files_count": 0,
                "total_size_freed": 0
            }
    
    async def optimize_storage_usage(self) -> Dict[str, Any]:
        """
        Optimize storage usage by compressing old files and organizing storage
        
        Returns:
            Dictionary with optimization statistics
        """
        try:
            optimization_stats = {
                "files_compressed": 0,
                "size_saved": 0,
                "files_moved": 0
            }
            
            # Compress old profile pictures
            profile_dir = self.upload_dir / "profiles"
            if profile_dir.exists():
                for file_path in profile_dir.rglob("*.jpg"):
                    file_age = datetime.now() - datetime.fromtimestamp(file_path.stat().st_mtime)
                    
                    # Compress files older than 30 days
                    if file_age.days > 30:
                        original_size = file_path.stat().st_size
                        
                        # Create compressed version
                        compressed_path = file_path.with_suffix('.jpg.compressed')
                        
                        # For now, just copy the file (actual compression would be implemented)
                        shutil.copy2(file_path, compressed_path)
                        
                        compressed_size = compressed_path.stat().st_size
                        size_saved = original_size - compressed_size
                        
                        if size_saved > 0:
                            # Replace original with compressed version
                            file_path.unlink()
                            compressed_path.rename(file_path)
                            
                            optimization_stats["files_compressed"] += 1
                            optimization_stats["size_saved"] += size_saved
            
            logger.info(f"Storage optimization completed: {optimization_stats}")
            return optimization_stats
            
        except Exception as e:
            logger.error(f"Error optimizing storage usage: {str(e)}")
            return {
                "error": str(e),
                "files_compressed": 0,
                "size_saved": 0,
                "files_moved": 0
            }
    
    async def backup_critical_files(self) -> Dict[str, Any]:
        """
        Backup critical user files for disaster recovery
        
        Returns:
            Dictionary with backup statistics
        """
        try:
            backup_stats = {
                "files_backed_up": 0,
                "backup_size": 0,
                "backup_path": None
            }
            
            # Create backup timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"critical_files_{timestamp}"
            backup_path.mkdir(exist_ok=True)
            
            # Backup profile pictures
            profile_dir = self.upload_dir / "profiles"
            if profile_dir.exists():
                profile_backup = backup_path / "profiles"
                profile_backup.mkdir(exist_ok=True)
                
                for file_path in profile_dir.rglob("*"):
                    if file_path.is_file():
                        relative_path = file_path.relative_to(profile_dir)
                        backup_file = profile_backup / relative_path
                        backup_file.parent.mkdir(parents=True, exist_ok=True)
                        
                        shutil.copy2(file_path, backup_file)
                        backup_stats["files_backed_up"] += 1
                        backup_stats["backup_size"] += file_path.stat().st_size
            
            # Create backup manifest
            manifest_path = backup_path / "manifest.json"
            manifest = {
                "backup_timestamp": timestamp,
                "files_backed_up": backup_stats["files_backed_up"],
                "backup_size": backup_stats["backup_size"],
                "backup_type": "critical_files"
            }
            
            async with aiofiles.open(manifest_path, 'w') as f:
                await f.write(str(manifest))
            
            backup_stats["backup_path"] = str(backup_path)
            
            logger.info(f"Critical files backup completed: {backup_stats}")
            return backup_stats
            
        except Exception as e:
            logger.error(f"Error backing up critical files: {str(e)}")
            return {
                "error": str(e),
                "files_backed_up": 0,
                "backup_size": 0,
                "backup_path": None
            }
    
    async def get_storage_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive storage statistics
        
        Returns:
            Dictionary with storage statistics
        """
        try:
            stats = {
                "total_files": 0,
                "total_size": 0,
                "files_by_type": {},
                "oldest_file": None,
                "newest_file": None,
                "largest_file": None
            }
            
            oldest_time = datetime.now()
            newest_time = datetime.fromtimestamp(0)
            largest_size = 0
            largest_file = None
            
            for file_path in self.upload_dir.rglob("*"):
                if file_path.is_file():
                    file_stat = file_path.stat()
                    file_size = file_stat.st_size
                    file_time = datetime.fromtimestamp(file_stat.st_mtime)
                    file_ext = file_path.suffix.lower()
                    
                    stats["total_files"] += 1
                    stats["total_size"] += file_size
                    
                    # Track file types
                    if file_ext not in stats["files_by_type"]:
                        stats["files_by_type"][file_ext] = {"count": 0, "size": 0}
                    stats["files_by_type"][file_ext]["count"] += 1
                    stats["files_by_type"][file_ext]["size"] += file_size
                    
                    # Track oldest and newest files
                    if file_time < oldest_time:
                        oldest_time = file_time
                        stats["oldest_file"] = {
                            "path": str(file_path.relative_to(self.upload_dir)),
                            "modified": file_time.isoformat()
                        }
                    
                    if file_time > newest_time:
                        newest_time = file_time
                        stats["newest_file"] = {
                            "path": str(file_path.relative_to(self.upload_dir)),
                            "modified": file_time.isoformat()
                        }
                    
                    # Track largest file
                    if file_size > largest_size:
                        largest_size = file_size
                        largest_file = {
                            "path": str(file_path.relative_to(self.upload_dir)),
                            "size": file_size
                        }
            
            stats["largest_file"] = largest_file
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting storage statistics: {str(e)}")
            return {
                "error": str(e),
                "total_files": 0,
                "total_size": 0
            }
    
    async def cleanup_old_backups(self, days_to_keep: int = 30) -> Dict[str, Any]:
        """
        Clean up old backup files
        
        Args:
            days_to_keep: Number of days to keep backups
            
        Returns:
            Dictionary with cleanup statistics
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            deleted_backups = []
            freed_space = 0
            
            for backup_dir in self.backup_dir.iterdir():
                if backup_dir.is_dir():
                    backup_time = datetime.fromtimestamp(backup_dir.stat().st_mtime)
                    
                    if backup_time < cutoff_date:
                        # Calculate size before deletion
                        backup_size = sum(
                            f.stat().st_size for f in backup_dir.rglob("*") if f.is_file()
                        )
                        
                        # Delete backup directory
                        shutil.rmtree(backup_dir)
                        
                        deleted_backups.append({
                            "path": str(backup_dir),
                            "size": backup_size,
                            "created": backup_time.isoformat()
                        })
                        
                        freed_space += backup_size
            
            logger.info(f"Cleaned up {len(deleted_backups)} old backups, freed {freed_space} bytes")
            
            return {
                "deleted_backups": len(deleted_backups),
                "freed_space": freed_space,
                "backups_deleted": deleted_backups
            }
            
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {str(e)}")
            return {
                "error": str(e),
                "deleted_backups": 0,
                "freed_space": 0
            }

# Create service instance
file_management_service = FileManagementService()

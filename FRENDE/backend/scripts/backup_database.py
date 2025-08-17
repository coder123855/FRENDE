#!/usr/bin/env python3
"""
Database Backup and Recovery Script
This script handles automated database backups with retention policy
and provides restoration capabilities for the Frende application.
"""

import os
import sys
import asyncio
import asyncpg
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import logging
import json

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseBackup:
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        self.backup_dir = Path("/var/backups/frende/database")
        self.retention_days = 30
        self.db_name = None
        self.db_user = None
        self.db_password = None
        self.db_host = None
        self.db_port = None
        
    def parse_database_url(self):
        """Parse the database URL to extract connection parameters"""
        try:
            # Remove postgresql:// prefix
            url = self.db_url.replace("postgresql://", "")
            
            # Split credentials and host
            if "@" in url:
                credentials, host_part = url.split("@", 1)
                if ":" in credentials:
                    self.db_user, self.db_password = credentials.split(":", 1)
                else:
                    self.db_user = credentials
                    self.db_password = ""
            else:
                self.db_user = "postgres"
                self.db_password = ""
                host_part = url
            
            # Split host and database
            if "/" in host_part:
                host_port, self.db_name = host_part.split("/", 1)
                # Remove query parameters from database name
                if "?" in self.db_name:
                    self.db_name = self.db_name.split("?", 1)[0]
            else:
                host_port = host_part
                self.db_name = "frende"
            
            # Split host and port
            if ":" in host_port:
                self.db_host, port_str = host_port.split(":", 1)
                self.db_port = int(port_str)
            else:
                self.db_host = host_port
                self.db_port = 5432
                
            logger.info(f"Parsed database URL: {self.db_host}:{self.db_port}/{self.db_name}")
            
        except Exception as e:
            logger.error(f"Failed to parse database URL: {e}")
            raise
    
    def create_backup_directory(self):
        """Create backup directory if it doesn't exist"""
        try:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Backup directory: {self.backup_dir}")
        except Exception as e:
            logger.error(f"Failed to create backup directory: {e}")
            raise
    
    async def create_backup(self) -> Optional[str]:
        """Create a database backup using pg_dump"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"frende_backup_{timestamp}.sql"
            backup_path = self.backup_dir / backup_filename
            compressed_path = backup_path.with_suffix('.sql.gz')
            
            # Build pg_dump command
            cmd = [
                'pg_dump',
                f'--host={self.db_host}',
                f'--port={self.db_port}',
                f'--username={self.db_user}',
                f'--dbname={self.db_name}',
                '--verbose',
                '--clean',
                '--no-owner',
                '--no-privileges',
                '--format=plain'
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            # Add SSL parameters for production
            if settings.is_production():
                cmd.extend(['--sslmode=require'])
            
            logger.info(f"Creating backup: {backup_filename}")
            
            # Execute pg_dump
            with open(backup_path, 'w') as f:
                result = subprocess.run(
                    cmd,
                    env=env,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                return None
            
            # Compress the backup
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove uncompressed file
            backup_path.unlink()
            
            # Create backup metadata
            metadata = {
                "filename": compressed_path.name,
                "created_at": datetime.now().isoformat(),
                "database": self.db_name,
                "size_bytes": compressed_path.stat().st_size,
                "compressed": True,
                "version": "1.0"
            }
            
            metadata_path = compressed_path.with_suffix('.json')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Backup created successfully: {compressed_path.name}")
            return str(compressed_path)
            
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            return None
    
    async def restore_backup(self, backup_path: str) -> bool:
        """Restore database from backup"""
        try:
            backup_file = Path(backup_path)
            
            if not backup_file.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Decompress if needed
            if backup_file.suffix == '.gz':
                decompressed_path = backup_file.with_suffix('')
                with gzip.open(backup_file, 'rb') as f_in:
                    with open(decompressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                restore_file = decompressed_path
            else:
                restore_file = backup_file
            
            # Build psql command
            cmd = [
                'psql',
                f'--host={self.db_host}',
                f'--port={self.db_port}',
                f'--username={self.db_user}',
                f'--dbname={self.db_name}',
                '--verbose'
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            # Add SSL parameters for production
            if settings.is_production():
                cmd.extend(['--sslmode=require'])
            
            logger.info(f"Restoring from backup: {backup_file.name}")
            
            # Execute psql restore
            with open(restore_file, 'r') as f:
                result = subprocess.run(
                    cmd,
                    env=env,
                    stdin=f,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            # Clean up decompressed file if it was created
            if backup_file.suffix == '.gz' and decompressed_path.exists():
                decompressed_path.unlink()
            
            if result.returncode != 0:
                logger.error(f"Restore failed: {result.stderr}")
                return False
            
            logger.info("Database restore completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore backup: {e}")
            return False
    
    def list_backups(self) -> List[dict]:
        """List all available backups with metadata"""
        try:
            backups = []
            
            for backup_file in self.backup_dir.glob("*.sql.gz"):
                metadata_file = backup_file.with_suffix('.json')
                
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    backups.append(metadata)
                else:
                    # Create metadata for files without it
                    stat = backup_file.stat()
                    metadata = {
                        "filename": backup_file.name,
                        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "database": self.db_name,
                        "size_bytes": stat.st_size,
                        "compressed": True,
                        "version": "1.0"
                    }
                    backups.append(metadata)
            
            # Sort by creation date (newest first)
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            return backups
            
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []
    
    def cleanup_old_backups(self) -> int:
        """Remove backups older than retention period"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            removed_count = 0
            
            for backup_file in self.backup_dir.glob("*.sql.gz"):
                stat = backup_file.stat()
                file_date = datetime.fromtimestamp(stat.st_mtime)
                
                if file_date < cutoff_date:
                    # Remove backup file and metadata
                    backup_file.unlink()
                    
                    metadata_file = backup_file.with_suffix('.json')
                    if metadata_file.exists():
                        metadata_file.unlink()
                    
                    logger.info(f"Removed old backup: {backup_file.name}")
                    removed_count += 1
            
            logger.info(f"Cleaned up {removed_count} old backups")
            return removed_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old backups: {e}")
            return 0
    
    async def verify_backup(self, backup_path: str) -> bool:
        """Verify backup integrity"""
        try:
            backup_file = Path(backup_path)
            
            if not backup_file.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Check if file is readable and not corrupted
            try:
                with gzip.open(backup_file, 'rb') as f:
                    # Read first few bytes to check if it's valid gzip
                    f.read(1024)
                logger.info(f"Backup verification successful: {backup_file.name}")
                return True
            except Exception as e:
                logger.error(f"Backup verification failed: {e}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to verify backup: {e}")
            return False
    
    async def run_backup(self) -> bool:
        """Run the complete backup process"""
        logger.info("Starting database backup process...")
        
        try:
            # Parse database URL
            self.parse_database_url()
            
            # Create backup directory
            self.create_backup_directory()
            
            # Create backup
            backup_path = await self.create_backup()
            if not backup_path:
                logger.error("Backup creation failed")
                return False
            
            # Verify backup
            if not await self.verify_backup(backup_path):
                logger.error("Backup verification failed")
                return False
            
            # Cleanup old backups
            self.cleanup_old_backups()
            
            logger.info("Database backup process completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Backup process failed: {e}")
            return False

async def main():
    """Main function to run the backup process"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database backup and restore utility")
    parser.add_argument("--action", choices=["backup", "restore", "list", "cleanup"], 
                       default="backup", help="Action to perform")
    parser.add_argument("--backup-file", help="Backup file to restore from")
    parser.add_argument("--retention-days", type=int, default=30, 
                       help="Number of days to keep backups")
    
    args = parser.parse_args()
    
    backup = DatabaseBackup()
    backup.retention_days = args.retention_days
    
    if args.action == "backup":
        success = await backup.run_backup()
        if success:
            logger.info("✅ Backup completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ Backup failed")
            sys.exit(1)
    
    elif args.action == "restore":
        if not args.backup_file:
            logger.error("Backup file must be specified for restore")
            sys.exit(1)
        
        backup.parse_database_url()
        success = await backup.restore_backup(args.backup_file)
        if success:
            logger.info("✅ Restore completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ Restore failed")
            sys.exit(1)
    
    elif args.action == "list":
        backup.parse_database_url()
        backup.create_backup_directory()
        backups = backup.list_backups()
        
        if backups:
            logger.info("Available backups:")
            for backup_info in backups:
                size_mb = backup_info['size_bytes'] / (1024 * 1024)
                logger.info(f"  {backup_info['filename']} - {size_mb:.1f}MB - {backup_info['created_at']}")
        else:
            logger.info("No backups found")
    
    elif args.action == "cleanup":
        backup.parse_database_url()
        backup.create_backup_directory()
        removed = backup.cleanup_old_backups()
        logger.info(f"✅ Cleanup completed - removed {removed} old backups")

if __name__ == "__main__":
    asyncio.run(main())

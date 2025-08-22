#!/usr/bin/env python3
"""
File Backup Script for Frende Application

This script performs automated file backups with:
- Pattern-based file inclusion/exclusion
- Compression and encryption
- S3 upload with versioning
- File integrity validation
- Incremental backup support
"""

import os
import sys
import logging
import boto3
import gzip
import shutil
import hashlib
import json
import fnmatch
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Set
import argparse
from cryptography.fernet import Fernet
import tarfile
import tempfile

# Add the backend directory to the path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "FRENDE" / "backend"))

from core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/frende/file_backup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class FileBackupManager:
    """Manages file backups with pattern matching and S3 storage."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self.s3_client = None
        self.encryption_key = None
        self.backup_dir = Path("/tmp/frende_file_backups")
        self.backup_dir.mkdir(exist_ok=True)
        self.manifest_file = self.backup_dir / "backup_manifest.json"
        
        self._initialize_s3()
        self._initialize_encryption()
    
    def _initialize_s3(self):
        """Initialize S3 client for backup storage."""
        if not self.settings.FILE_BACKUP_S3_BUCKET:
            logger.warning("S3 bucket not configured, file backups will be local only")
            return
            
        try:
            self.s3_client = boto3.client(
                's3',
                region_name=self.settings.DB_BACKUP_S3_REGION,
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
            )
            logger.info(f"S3 client initialized for bucket: {self.settings.FILE_BACKUP_S3_BUCKET}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.s3_client = None
    
    def _initialize_encryption(self):
        """Initialize encryption key for backup security."""
        if self.settings.BACKUP_ENCRYPTION_KEY:
            try:
                self.encryption_key = Fernet(self.settings.BACKUP_ENCRYPTION_KEY.encode())
                logger.info("Encryption key initialized")
            except Exception as e:
                logger.error(f"Failed to initialize encryption key: {e}")
                self.encryption_key = None
        else:
            logger.warning("No encryption key provided, file backups will not be encrypted")
    
    def _should_include_file(self, file_path: Path) -> bool:
        """Check if file should be included based on patterns."""
        filename = file_path.name
        
        # Check include patterns
        include_patterns = self.settings.FILE_BACKUP_INCLUDE_PATTERNS
        if include_patterns:
            included = any(fnmatch.fnmatch(filename, pattern) for pattern in include_patterns)
            if not included:
                return False
        
        # Check exclude patterns
        exclude_patterns = self.settings.FILE_BACKUP_EXCLUDE_PATTERNS
        if exclude_patterns:
            excluded = any(fnmatch.fnmatch(filename, pattern) for pattern in exclude_patterns)
            if excluded:
                return False
        
        return True
    
    def _get_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def _load_manifest(self) -> Dict[str, Any]:
        """Load backup manifest from file."""
        if self.manifest_file.exists():
            try:
                with open(self.manifest_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load manifest: {e}")
        return {'files': {}, 'last_backup': None, 'backup_count': 0}
    
    def _save_manifest(self, manifest: Dict[str, Any]):
        """Save backup manifest to file."""
        try:
            with open(self.manifest_file, 'w') as f:
                json.dump(manifest, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save manifest: {e}")
    
    def _find_files_to_backup(self, source_dir: Path) -> List[Path]:
        """Find files that need to be backed up."""
        files_to_backup = []
        
        try:
            for file_path in source_dir.rglob('*'):
                if file_path.is_file() and self._should_include_file(file_path):
                    files_to_backup.append(file_path)
            
            logger.info(f"Found {len(files_to_backup)} files to backup")
            return files_to_backup
            
        except Exception as e:
            logger.error(f"Failed to scan directory {source_dir}: {e}")
            return []
    
    def create_backup(self, source_dir: str = None) -> Optional[str]:
        """Create a complete file backup."""
        try:
            logger.info("Starting file backup...")
            
            # Determine source directory
            if source_dir:
                source_path = Path(source_dir)
            else:
                # Default to uploads directory
                source_path = Path(__file__).parent.parent.parent / "FRENDE" / "backend" / "uploads"
            
            if not source_path.exists():
                logger.error(f"Source directory does not exist: {source_path}")
                return None
            
            # Find files to backup
            files_to_backup = self._find_files_to_backup(source_path)
            if not files_to_backup:
                logger.warning("No files found to backup")
                return None
            
            # Load existing manifest
            manifest = self._load_manifest()
            
            # Generate backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"frende_files_backup_{timestamp}.tar.gz"
            backup_path = self.backup_dir / backup_filename
            
            # Create tar archive
            logger.info(f"Creating tar archive: {backup_path}")
            with tarfile.open(backup_path, 'w:gz') as tar:
                for file_path in files_to_backup:
                    try:
                        # Calculate relative path
                        rel_path = file_path.relative_to(source_path)
                        
                        # Add file to archive
                        tar.add(file_path, arcname=str(rel_path))
                        
                        # Update manifest
                        file_hash = self._get_file_hash(file_path)
                        manifest['files'][str(rel_path)] = {
                            'hash': file_hash,
                            'size': file_path.stat().st_size,
                            'modified': file_path.stat().st_mtime,
                            'backed_up': datetime.now().isoformat()
                        }
                        
                    except Exception as e:
                        logger.error(f"Failed to add file {file_path} to archive: {e}")
            
            # Update manifest
            manifest['last_backup'] = datetime.now().isoformat()
            manifest['backup_count'] = manifest.get('backup_count', 0) + 1
            manifest['total_files'] = len(files_to_backup)
            manifest['total_size'] = sum(f.stat().st_size for f in files_to_backup)
            
            # Save manifest
            self._save_manifest(manifest)
            
            logger.info(f"File backup created: {backup_path}")
            
            # Encrypt backup
            if self.encryption_key:
                backup_path = self._encrypt_backup(backup_path)
            
            # Upload to S3
            if self.s3_client:
                self._upload_to_s3(backup_path, backup_filename)
            
            # Validate backup
            if self._validate_backup(backup_path):
                logger.info("File backup validation successful")
            else:
                logger.error("File backup validation failed")
                return None
            
            # Clean up local file if S3 upload was successful
            if self.s3_client:
                backup_path.unlink()
                logger.info("Local file backup cleaned up")
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"File backup creation failed: {e}")
            return None
    
    def create_incremental_backup(self, source_dir: str = None) -> Optional[str]:
        """Create an incremental file backup (only changed files)."""
        try:
            logger.info("Starting incremental file backup...")
            
            # Determine source directory
            if source_dir:
                source_path = Path(source_dir)
            else:
                source_path = Path(__file__).parent.parent.parent / "FRENDE" / "backend" / "uploads"
            
            if not source_path.exists():
                logger.error(f"Source directory does not exist: {source_path}")
                return None
            
            # Load existing manifest
            manifest = self._load_manifest()
            
            # Find all files
            all_files = self._find_files_to_backup(source_path)
            
            # Determine which files have changed
            changed_files = []
            for file_path in all_files:
                rel_path = str(file_path.relative_to(source_path))
                file_hash = self._get_file_hash(file_path)
                
                # Check if file is new or changed
                if rel_path not in manifest['files']:
                    changed_files.append(file_path)
                    logger.info(f"New file: {rel_path}")
                elif manifest['files'][rel_path]['hash'] != file_hash:
                    changed_files.append(file_path)
                    logger.info(f"Changed file: {rel_path}")
            
            if not changed_files:
                logger.info("No files have changed, skipping incremental backup")
                return None
            
            # Create incremental backup
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"frende_files_incremental_{timestamp}.tar.gz"
            backup_path = self.backup_dir / backup_filename
            
            # Create tar archive with only changed files
            with tarfile.open(backup_path, 'w:gz') as tar:
                for file_path in changed_files:
                    try:
                        rel_path = file_path.relative_to(source_path)
                        tar.add(file_path, arcname=str(rel_path))
                        
                        # Update manifest
                        file_hash = self._get_file_hash(file_path)
                        manifest['files'][str(rel_path)] = {
                            'hash': file_hash,
                            'size': file_path.stat().st_size,
                            'modified': file_path.stat().st_mtime,
                            'backed_up': datetime.now().isoformat()
                        }
                        
                    except Exception as e:
                        logger.error(f"Failed to add file {file_path} to archive: {e}")
            
            # Update manifest
            manifest['last_incremental_backup'] = datetime.now().isoformat()
            manifest['incremental_backup_count'] = manifest.get('incremental_backup_count', 0) + 1
            manifest['changed_files_count'] = len(changed_files)
            
            # Save manifest
            self._save_manifest(manifest)
            
            logger.info(f"Incremental backup created: {backup_path}")
            
            # Encrypt backup
            if self.encryption_key:
                backup_path = self._encrypt_backup(backup_path)
            
            # Upload to S3
            if self.s3_client:
                self._upload_to_s3(backup_path, backup_filename)
            
            # Clean up local file if S3 upload was successful
            if self.s3_client:
                backup_path.unlink()
                logger.info("Local incremental backup cleaned up")
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"Incremental backup creation failed: {e}")
            return None
    
    def _encrypt_backup(self, backup_path: Path) -> Path:
        """Encrypt the backup file."""
        encrypted_path = backup_path.with_suffix(backup_path.suffix + '.enc')
        
        with open(backup_path, 'rb') as f_in:
            data = f_in.read()
        
        encrypted_data = self.encryption_key.encrypt(data)
        
        with open(encrypted_path, 'wb') as f_out:
            f_out.write(encrypted_data)
        
        # Remove original file
        backup_path.unlink()
        logger.info(f"Backup encrypted: {encrypted_path}")
        return encrypted_path
    
    def _upload_to_s3(self, backup_path: Path, filename: str):
        """Upload backup to S3 with versioning."""
        try:
            # Create S3 key with date prefix
            date_prefix = datetime.now().strftime("%Y/%m/%d")
            s3_key = f"file-backups/{date_prefix}/{filename}"
            
            # Upload file
            self.s3_client.upload_file(
                str(backup_path),
                self.settings.FILE_BACKUP_S3_BUCKET,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'Metadata': {
                        'backup-type': 'files',
                        'created-at': datetime.now().isoformat(),
                        'compressed': 'true',
                        'encrypted': str(bool(self.encryption_key))
                    }
                }
            )
            
            logger.info(f"File backup uploaded to S3: s3://{self.settings.FILE_BACKUP_S3_BUCKET}/{s3_key}")
            
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            raise
    
    def _validate_backup(self, backup_path: Path) -> bool:
        """Validate backup file integrity."""
        try:
            # Check file exists and has content
            if not backup_path.exists() or backup_path.stat().st_size == 0:
                logger.error("Backup file is empty or missing")
                return False
            
            # For encrypted files, try to decrypt
            if backup_path.suffix == '.enc':
                with open(backup_path, 'rb') as f:
                    encrypted_data = f.read()
                try:
                    self.encryption_key.decrypt(encrypted_data)
                except Exception as e:
                    logger.error(f"Encryption validation failed: {e}")
                    return False
            
            # For tar.gz files, try to read archive
            if backup_path.suffix == '.gz':
                try:
                    with tarfile.open(backup_path, 'r:gz') as tar:
                        # Just check if we can read the archive
                        tar.getnames()
                except Exception as e:
                    logger.error(f"Archive validation failed: {e}")
                    return False
            
            logger.info("File backup validation passed")
            return True
            
        except Exception as e:
            logger.error(f"File backup validation failed: {e}")
            return False
    
    def restore_backup(self, backup_path: str, restore_dir: str) -> bool:
        """Restore files from backup."""
        try:
            logger.info(f"Restoring files from {backup_path} to {restore_dir}")
            
            backup_file = Path(backup_path)
            restore_path = Path(restore_dir)
            
            if not backup_file.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Create restore directory
            restore_path.mkdir(parents=True, exist_ok=True)
            
            # Decrypt if needed
            if backup_file.suffix == '.enc':
                logger.info("Decrypting backup file...")
                with open(backup_file, 'rb') as f:
                    encrypted_data = f.read()
                
                decrypted_data = self.encryption_key.decrypt(encrypted_data)
                
                # Create temporary decrypted file
                temp_file = backup_file.with_suffix('')
                with open(temp_file, 'wb') as f:
                    f.write(decrypted_data)
                
                backup_file = temp_file
            
            # Extract archive
            logger.info("Extracting archive...")
            with tarfile.open(backup_file, 'r:gz') as tar:
                tar.extractall(path=restore_path)
            
            # Clean up temporary file
            if backup_file.suffix != '.enc':
                backup_file.unlink()
            
            logger.info(f"Files restored successfully to {restore_dir}")
            return True
            
        except Exception as e:
            logger.error(f"File restoration failed: {e}")
            return False
    
    def list_backups(self) -> list:
        """List available file backups in S3."""
        try:
            if not self.s3_client:
                return []
            
            backups = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.settings.FILE_BACKUP_S3_BUCKET,
                Prefix='file-backups/'
            )
            
            for page in pages:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    backups.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat()
                    })
            
            return sorted(backups, key=lambda x: x['last_modified'], reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to list file backups: {e}")
            return []
    
    def cleanup_old_backups(self):
        """Remove old file backups based on retention policy."""
        try:
            if not self.s3_client:
                logger.info("S3 not configured, skipping cleanup")
                return
            
            cutoff_date = datetime.now() - timedelta(days=self.settings.BACKUP_RETENTION_DAYS)
            logger.info(f"Cleaning up file backups older than {cutoff_date}")
            
            # List objects in S3
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.settings.FILE_BACKUP_S3_BUCKET,
                Prefix='file-backups/'
            )
            
            deleted_count = 0
            for page in pages:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    # Extract date from key
                    key_parts = obj['Key'].split('/')
                    if len(key_parts) >= 4:
                        try:
                            date_str = f"{key_parts[1]}-{key_parts[2]}-{key_parts[3]}"
                            obj_date = datetime.strptime(date_str, "%Y-%m-%d")
                            
                            if obj_date < cutoff_date:
                                self.s3_client.delete_object(
                                    Bucket=self.settings.FILE_BACKUP_S3_BUCKET,
                                    Key=obj['Key']
                                )
                                deleted_count += 1
                                logger.info(f"Deleted old file backup: {obj['Key']}")
                        except ValueError:
                            continue
            
            logger.info(f"File backup cleanup completed: {deleted_count} old backups deleted")
            
        except Exception as e:
            logger.error(f"File backup cleanup failed: {e}")


def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='File Backup Manager')
    parser.add_argument('--create', action='store_true', help='Create a new backup')
    parser.add_argument('--incremental', action='store_true', help='Create incremental backup')
    parser.add_argument('--restore', metavar='BACKUP_PATH', help='Restore from backup')
    parser.add_argument('--restore-dir', metavar='DIR', default='./restored', help='Restore directory')
    parser.add_argument('--source-dir', metavar='DIR', help='Source directory to backup')
    parser.add_argument('--list', action='store_true', help='List available backups')
    parser.add_argument('--cleanup', action='store_true', help='Clean up old backups')
    
    args = parser.parse_args()
    
    backup_manager = FileBackupManager()
    
    if args.create:
        backup_path = backup_manager.create_backup(args.source_dir)
        if backup_path:
            print(f"✅ File backup created successfully: {backup_path}")
            sys.exit(0)
        else:
            print("❌ File backup creation failed")
            sys.exit(1)
    
    elif args.incremental:
        backup_path = backup_manager.create_incremental_backup(args.source_dir)
        if backup_path:
            print(f"✅ Incremental backup created successfully: {backup_path}")
            sys.exit(0)
        else:
            print("❌ Incremental backup creation failed")
            sys.exit(1)
    
    elif args.restore:
        if backup_manager.restore_backup(args.restore, args.restore_dir):
            print(f"✅ Files restored successfully to {args.restore_dir}")
            sys.exit(0)
        else:
            print("❌ File restoration failed")
            sys.exit(1)
    
    elif args.list:
        backups = backup_manager.list_backups()
        print(f"Found {len(backups)} file backups:")
        for backup in backups[:10]:  # Show last 10
            print(f"  {backup['key']} ({backup['size']} bytes, {backup['last_modified']})")
    
    elif args.cleanup:
        backup_manager.cleanup_old_backups()
        print("✅ File backup cleanup completed")
    
    else:
        # Default: create backup
        backup_path = backup_manager.create_backup(args.source_dir)
        if backup_path:
            print(f"✅ File backup created successfully: {backup_path}")
            sys.exit(0)
        else:
            print("❌ File backup creation failed")
            sys.exit(1)


if __name__ == "__main__":
    main()

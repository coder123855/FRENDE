#!/usr/bin/env python3
"""
Redis Backup and Persistence Manager for Frende Application

This script manages Redis backups and persistence with:
- RDB (Redis Database) snapshots
- AOF (Append Only File) persistence
- S3 backup storage with encryption
- Redis replication setup
- Health monitoring and validation
"""

import os
import sys
import subprocess
import logging
import boto3
import gzip
import shutil
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
import argparse
from cryptography.fernet import Fernet
import redis

# Add the backend directory to the path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "FRENDE" / "backend"))

from core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/frende/redis_backup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class RedisBackupManager:
    """Manages Redis backups and persistence configuration."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self.s3_client = None
        self.encryption_key = None
        self.backup_dir = Path("/tmp/frende_redis_backups")
        self.backup_dir.mkdir(exist_ok=True)
        self.redis_client = None
        
        self._initialize_s3()
        self._initialize_encryption()
        self._initialize_redis()
    
    def _initialize_s3(self):
        """Initialize S3 client for backup storage."""
        if not self.settings.REDIS_BACKUP_S3_BUCKET:
            logger.warning("S3 bucket not configured, Redis backups will be local only")
            return
            
        try:
            self.s3_client = boto3.client(
                's3',
                region_name=self.settings.DB_BACKUP_S3_REGION,
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
            )
            logger.info(f"S3 client initialized for bucket: {self.settings.REDIS_BACKUP_S3_BUCKET}")
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
            logger.warning("No encryption key provided, Redis backups will not be encrypted")
    
    def _initialize_redis(self):
        """Initialize Redis client connection."""
        try:
            # Parse Redis URL
            redis_url = self.settings.REDIS_URL or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url)
            
            # Test connection
            self.redis_client.ping()
            logger.info("Redis client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            self.redis_client = None
    
    def _get_redis_info(self) -> Dict[str, Any]:
        """Get Redis server information."""
        if not self.redis_client:
            raise RuntimeError("Redis client not initialized")
        
        try:
            info = self.redis_client.info()
            return info
        except Exception as e:
            logger.error(f"Failed to get Redis info: {e}")
            return {}
    
    def _get_redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration."""
        if not self.redis_client:
            raise RuntimeError("Redis client not initialized")
        
        try:
            config = self.redis_client.config_get('*')
            return config
        except Exception as e:
            logger.error(f"Failed to get Redis config: {e}")
            return {}
    
    def create_rdb_backup(self) -> Optional[str]:
        """Create Redis RDB (Redis Database) backup."""
        try:
            if not self.redis_client:
                logger.error("Redis client not available")
                return None
            
            logger.info("Starting Redis RDB backup...")
            
            # Get Redis info
            redis_info = self._get_redis_info()
            redis_config = self._get_redis_config()
            
            # Generate backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"frende_redis_rdb_{timestamp}.rdb"
            backup_path = self.backup_dir / backup_filename
            
            # Trigger RDB save
            logger.info("Triggering RDB save...")
            self.redis_client.save()
            
            # Wait for save to complete
            while True:
                info = self._get_redis_info()
                if info.get('rdb_bgsave_in_progress', 0) == 0:
                    break
                time.sleep(1)
            
            # Find RDB file location
            rdb_file = redis_config.get('dir', '/var/lib/redis') + '/dump.rdb'
            if not os.path.exists(rdb_file):
                logger.error(f"RDB file not found at {rdb_file}")
                return None
            
            # Copy RDB file to backup location
            shutil.copy2(rdb_file, backup_path)
            logger.info(f"RDB backup created: {backup_path}")
            
            # Compress backup
            backup_path = self._compress_backup(backup_path)
            
            # Encrypt backup
            if self.encryption_key:
                backup_path = self._encrypt_backup(backup_path)
            
            # Upload to S3
            if self.s3_client:
                self._upload_to_s3(backup_path, backup_filename, 'rdb')
            
            # Validate backup
            if self._validate_backup(backup_path):
                logger.info("RDB backup validation successful")
            else:
                logger.error("RDB backup validation failed")
                return None
            
            # Clean up local file if S3 upload was successful
            if self.s3_client:
                backup_path.unlink()
                logger.info("Local RDB backup file cleaned up")
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"RDB backup creation failed: {e}")
            return None
    
    def create_aof_backup(self) -> Optional[str]:
        """Create Redis AOF (Append Only File) backup."""
        try:
            if not self.redis_client:
                logger.error("Redis client not available")
                return None
            
            logger.info("Starting Redis AOF backup...")
            
            # Get Redis config
            redis_config = self._get_redis_config()
            
            # Check if AOF is enabled
            if redis_config.get('appendonly', 'no') != 'yes':
                logger.warning("AOF is not enabled, skipping AOF backup")
                return None
            
            # Generate backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"frende_redis_aof_{timestamp}.aof"
            backup_path = self.backup_dir / backup_filename
            
            # Find AOF file location
            aof_file = redis_config.get('dir', '/var/lib/redis') + '/appendonly.aof'
            if not os.path.exists(aof_file):
                logger.error(f"AOF file not found at {aof_file}")
                return None
            
            # Copy AOF file to backup location
            shutil.copy2(aof_file, backup_path)
            logger.info(f"AOF backup created: {backup_path}")
            
            # Compress backup
            backup_path = self._compress_backup(backup_path)
            
            # Encrypt backup
            if self.encryption_key:
                backup_path = self._encrypt_backup(backup_path)
            
            # Upload to S3
            if self.s3_client:
                self._upload_to_s3(backup_path, backup_filename, 'aof')
            
            # Validate backup
            if self._validate_backup(backup_path):
                logger.info("AOF backup validation successful")
            else:
                logger.error("AOF backup validation failed")
                return None
            
            # Clean up local file if S3 upload was successful
            if self.s3_client:
                backup_path.unlink()
                logger.info("Local AOF backup file cleaned up")
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"AOF backup creation failed: {e}")
            return None
    
    def _compress_backup(self, backup_path: Path) -> Path:
        """Compress the backup file using gzip."""
        compressed_path = backup_path.with_suffix(backup_path.suffix + '.gz')
        
        with open(backup_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Remove original file
        backup_path.unlink()
        logger.info(f"Backup compressed: {compressed_path}")
        return compressed_path
    
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
    
    def _upload_to_s3(self, backup_path: Path, filename: str, backup_type: str):
        """Upload backup to S3 with versioning."""
        try:
            # Create S3 key with date prefix
            date_prefix = datetime.now().strftime("%Y/%m/%d")
            s3_key = f"redis-backups/{date_prefix}/{filename}"
            
            # Upload file
            self.s3_client.upload_file(
                str(backup_path),
                self.settings.REDIS_BACKUP_S3_BUCKET,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'Metadata': {
                        'backup-type': f'redis-{backup_type}',
                        'created-at': datetime.now().isoformat(),
                        'compressed': 'true',
                        'encrypted': str(bool(self.encryption_key))
                    }
                }
            )
            
            logger.info(f"Redis backup uploaded to S3: s3://{self.settings.REDIS_BACKUP_S3_BUCKET}/{s3_key}")
            
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
            
            # For compressed files, try to decompress
            if backup_path.suffix == '.gz':
                with gzip.open(backup_path, 'rb') as f:
                    # Read first few bytes to check if it's valid gzip
                    f.read(1024)
            
            # For encrypted files, try to decrypt
            if backup_path.suffix == '.enc':
                with open(backup_path, 'rb') as f:
                    encrypted_data = f.read()
                try:
                    self.encryption_key.decrypt(encrypted_data)
                except Exception as e:
                    logger.error(f"Encryption validation failed: {e}")
                    return False
            
            logger.info("Backup validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Backup validation failed: {e}")
            return False
    
    def setup_persistence(self):
        """Configure Redis persistence settings."""
        try:
            if not self.redis_client:
                logger.error("Redis client not available")
                return False
            
            logger.info("Configuring Redis persistence...")
            
            # Configure RDB persistence
            self.redis_client.config_set('save', '900 1 300 10 60 10000')
            self.redis_client.config_set('stop-writes-on-bgsave-error', 'yes')
            self.redis_client.config_set('rdbcompression', 'yes')
            self.redis_client.config_set('rdbchecksum', 'yes')
            
            # Configure AOF persistence
            if self.settings.REDIS_PERSISTENCE_ENABLED:
                self.redis_client.config_set('appendonly', 'yes')
                self.redis_client.config_set('appendfsync', 'everysec')
                self.redis_client.config_set('no-appendfsync-on-rewrite', 'no')
                self.redis_client.config_set('auto-aof-rewrite-percentage', '100')
                self.redis_client.config_set('auto-aof-rewrite-min-size', '64mb')
            else:
                self.redis_client.config_set('appendonly', 'no')
            
            # Save configuration
            self.redis_client.config_rewrite()
            
            logger.info("Redis persistence configured successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to configure Redis persistence: {e}")
            return False
    
    def setup_replication(self, master_host: str, master_port: int = 6379):
        """Configure Redis replication (slave setup)."""
        try:
            if not self.redis_client:
                logger.error("Redis client not available")
                return False
            
            logger.info(f"Configuring Redis replication to {master_host}:{master_port}...")
            
            # Configure as slave
            self.redis_client.slaveof(master_host, master_port)
            
            # Configure slave settings
            self.redis_client.config_set('slave-read-only', 'yes')
            self.redis_client.config_set('repl-diskless-sync', 'no')
            self.redis_client.config_set('repl-diskless-sync-delay', '5')
            
            # Save configuration
            self.redis_client.config_rewrite()
            
            logger.info("Redis replication configured successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to configure Redis replication: {e}")
            return False
    
    def get_redis_health(self) -> Dict[str, Any]:
        """Get Redis health status."""
        try:
            if not self.redis_client:
                return {'status': 'error', 'message': 'Redis client not available'}
            
            # Get Redis info
            info = self._get_redis_info()
            config = self._get_redis_config()
            
            health = {
                'status': 'healthy',
                'uptime': info.get('uptime_in_seconds', 0),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', '0B'),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'rdb_last_save_time': info.get('rdb_last_save_time', 0),
                'aof_enabled': config.get('appendonly', 'no') == 'yes',
                'role': info.get('role', 'unknown')
            }
            
            # Calculate hit rate
            total_requests = health['keyspace_hits'] + health['keyspace_misses']
            if total_requests > 0:
                health['hit_rate'] = health['keyspace_hits'] / total_requests
            else:
                health['hit_rate'] = 0.0
            
            return health
            
        except Exception as e:
            logger.error(f"Failed to get Redis health: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def cleanup_old_backups(self):
        """Remove old Redis backups based on retention policy."""
        try:
            if not self.s3_client:
                logger.info("S3 not configured, skipping cleanup")
                return
            
            cutoff_date = datetime.now() - timedelta(days=self.settings.BACKUP_RETENTION_DAYS)
            logger.info(f"Cleaning up Redis backups older than {cutoff_date}")
            
            # List objects in S3
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.settings.REDIS_BACKUP_S3_BUCKET,
                Prefix='redis-backups/'
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
                                    Bucket=self.settings.REDIS_BACKUP_S3_BUCKET,
                                    Key=obj['Key']
                                )
                                deleted_count += 1
                                logger.info(f"Deleted old Redis backup: {obj['Key']}")
                        except ValueError:
                            continue
            
            logger.info(f"Redis backup cleanup completed: {deleted_count} old backups deleted")
            
        except Exception as e:
            logger.error(f"Redis backup cleanup failed: {e}")


def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='Redis Backup Manager')
    parser.add_argument('--rdb', action='store_true', help='Create RDB backup')
    parser.add_argument('--aof', action='store_true', help='Create AOF backup')
    parser.add_argument('--setup-persistence', action='store_true', help='Setup Redis persistence')
    parser.add_argument('--setup-replication', metavar='MASTER_HOST', help='Setup Redis replication')
    parser.add_argument('--health', action='store_true', help='Check Redis health')
    parser.add_argument('--cleanup', action='store_true', help='Clean up old backups')
    
    args = parser.parse_args()
    
    backup_manager = RedisBackupManager()
    
    if args.rdb:
        backup_path = backup_manager.create_rdb_backup()
        if backup_path:
            print(f"✅ RDB backup created successfully: {backup_path}")
            sys.exit(0)
        else:
            print("❌ RDB backup creation failed")
            sys.exit(1)
    
    elif args.aof:
        backup_path = backup_manager.create_aof_backup()
        if backup_path:
            print(f"✅ AOF backup created successfully: {backup_path}")
            sys.exit(0)
        else:
            print("❌ AOF backup creation failed")
            sys.exit(1)
    
    elif args.setup_persistence:
        if backup_manager.setup_persistence():
            print("✅ Redis persistence configured successfully")
            sys.exit(0)
        else:
            print("❌ Redis persistence configuration failed")
            sys.exit(1)
    
    elif args.setup_replication:
        if backup_manager.setup_replication(args.setup_replication):
            print(f"✅ Redis replication configured to {args.setup_replication}")
            sys.exit(0)
        else:
            print("❌ Redis replication configuration failed")
            sys.exit(1)
    
    elif args.health:
        health = backup_manager.get_redis_health()
        print(json.dumps(health, indent=2))
        if health['status'] == 'healthy':
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif args.cleanup:
        backup_manager.cleanup_old_backups()
        print("✅ Redis backup cleanup completed")
    
    else:
        # Default: create both RDB and AOF backups
        rdb_path = backup_manager.create_rdb_backup()
        aof_path = backup_manager.create_aof_backup()
        
        if rdb_path and aof_path:
            print(f"✅ Redis backups created successfully")
            print(f"  RDB: {rdb_path}")
            print(f"  AOF: {aof_path}")
            sys.exit(0)
        else:
            print("❌ Redis backup creation failed")
            sys.exit(1)


if __name__ == "__main__":
    main()

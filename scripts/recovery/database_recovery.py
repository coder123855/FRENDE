#!/usr/bin/env python3
"""
Database Recovery Script for Frende Application

This script handles PostgreSQL database recovery with:
- Backup restoration from S3
- Database validation and health checks
- Point-in-time recovery support
- Automated recovery procedures
- Recovery testing and validation
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
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the backend directory to the path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "FRENDE" / "backend"))

from core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/frende/database_recovery.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DatabaseRecoveryManager:
    """Manages PostgreSQL database recovery procedures."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self.s3_client = None
        self.encryption_key = None
        self.recovery_dir = Path("/tmp/frende_recovery")
        self.recovery_dir.mkdir(exist_ok=True)
        
        self._initialize_s3()
        self._initialize_encryption()
    
    def _initialize_s3(self):
        """Initialize S3 client for backup storage."""
        if not self.settings.DB_BACKUP_S3_BUCKET:
            logger.warning("S3 bucket not configured, cannot download backups")
            return
            
        try:
            self.s3_client = boto3.client(
                's3',
                region_name=self.settings.DB_BACKUP_S3_REGION,
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
            )
            logger.info(f"S3 client initialized for bucket: {self.settings.DB_BACKUP_S3_BUCKET}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.s3_client = None
    
    def _initialize_encryption(self):
        """Initialize encryption key for backup decryption."""
        if self.settings.BACKUP_ENCRYPTION_KEY:
            try:
                self.encryption_key = Fernet(self.settings.BACKUP_ENCRYPTION_KEY.encode())
                logger.info("Encryption key initialized")
            except Exception as e:
                logger.error(f"Failed to initialize encryption key: {e}")
                self.encryption_key = None
        else:
            logger.warning("No encryption key provided, cannot decrypt encrypted backups")
    
    def _get_database_url(self) -> str:
        """Extract database connection details from DATABASE_URL."""
        db_url = self.settings.DATABASE_URL
        if not db_url:
            raise ValueError("DATABASE_URL not configured")
        return db_url
    
    def _parse_db_url(self, db_url: str) -> Dict[str, str]:
        """Parse database URL to extract connection parameters."""
        # Remove postgresql:// prefix
        url = db_url.replace('postgresql://', '')
        
        # Split into credentials and host/database
        if '@' in url:
            credentials, rest = url.split('@', 1)
            if ':' in credentials:
                username, password = credentials.split(':', 1)
            else:
                username, password = credentials, ''
        else:
            username, password = '', ''
            rest = url
        
        # Parse host, port, and database
        if '/' in rest:
            host_port, database = rest.rsplit('/', 1)
        else:
            host_port, database = rest, ''
        
        if ':' in host_port:
            host, port = host_port.split(':', 1)
        else:
            host, port = host_port, '5432'
        
        return {
            'host': host,
            'port': port,
            'database': database,
            'username': username,
            'password': password
        }
    
    def list_available_backups(self) -> List[Dict[str, Any]]:
        """List available database backups in S3."""
        try:
            if not self.s3_client:
                logger.error("S3 client not available")
                return []
            
            backups = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.settings.DB_BACKUP_S3_BUCKET,
                Prefix='database-backups/'
            )
            
            for page in pages:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    # Get metadata
                    try:
                        response = self.s3_client.head_object(
                            Bucket=self.settings.DB_BACKUP_S3_BUCKET,
                            Key=obj['Key']
                        )
                        metadata = response.get('Metadata', {})
                    except:
                        metadata = {}
                    
                    backups.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'backup_type': metadata.get('backup-type', 'unknown'),
                        'created_at': metadata.get('created-at', ''),
                        'compressed': metadata.get('compressed', 'false') == 'true',
                        'encrypted': metadata.get('encrypted', 'false') == 'true'
                    })
            
            return sorted(backups, key=lambda x: x['last_modified'], reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []
    
    def download_backup(self, backup_key: str) -> Optional[Path]:
        """Download backup from S3."""
        try:
            if not self.s3_client:
                logger.error("S3 client not available")
                return None
            
            # Create local file path
            backup_filename = backup_key.split('/')[-1]
            local_path = self.recovery_dir / backup_filename
            
            logger.info(f"Downloading backup: {backup_key}")
            self.s3_client.download_file(
                self.settings.DB_BACKUP_S3_BUCKET,
                backup_key,
                str(local_path)
            )
            
            logger.info(f"Backup downloaded: {local_path}")
            return local_path
            
        except Exception as e:
            logger.error(f"Failed to download backup: {e}")
            return None
    
    def _decrypt_backup(self, backup_path: Path) -> Path:
        """Decrypt the backup file."""
        if not self.encryption_key:
            logger.error("Encryption key not available")
            return backup_path
        
        try:
            decrypted_path = backup_path.with_suffix('')
            if backup_path.suffix == '.enc':
                decrypted_path = backup_path.with_suffix('')
            else:
                decrypted_path = backup_path
            
            with open(backup_path, 'rb') as f_in:
                encrypted_data = f_in.read()
            
            decrypted_data = self.encryption_key.decrypt(encrypted_data)
            
            with open(decrypted_path, 'wb') as f_out:
                f_out.write(decrypted_data)
            
            # Remove encrypted file
            backup_path.unlink()
            logger.info(f"Backup decrypted: {decrypted_path}")
            return decrypted_path
            
        except Exception as e:
            logger.error(f"Failed to decrypt backup: {e}")
            return backup_path
    
    def _decompress_backup(self, backup_path: Path) -> Path:
        """Decompress the backup file."""
        try:
            if backup_path.suffix == '.gz':
                decompressed_path = backup_path.with_suffix('')
                
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(decompressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                # Remove compressed file
                backup_path.unlink()
                logger.info(f"Backup decompressed: {decompressed_path}")
                return decompressed_path
            
            return backup_path
            
        except Exception as e:
            logger.error(f"Failed to decompress backup: {e}")
            return backup_path
    
    def _test_database_connection(self, db_params: Dict[str, str]) -> bool:
        """Test database connection."""
        try:
            conn = psycopg2.connect(
                host=db_params['host'],
                port=db_params['port'],
                database=db_params['database'],
                user=db_params['username'],
                password=db_params['password']
            )
            conn.close()
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def _terminate_connections(self, db_params: Dict[str, str]):
        """Terminate all database connections except the current one."""
        try:
            # Connect to postgres database to terminate connections
            conn = psycopg2.connect(
                host=db_params['host'],
                port=db_params['port'],
                database='postgres',
                user=db_params['username'],
                password=db_params['password']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            cursor = conn.cursor()
            
            # Terminate connections to the target database
            cursor.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
            """, (db_params['database'],))
            
            conn.close()
            logger.info("Database connections terminated")
            
        except Exception as e:
            logger.error(f"Failed to terminate connections: {e}")
    
    def _drop_and_recreate_database(self, db_params: Dict[str, str]):
        """Drop and recreate the database."""
        try:
            # Connect to postgres database
            conn = psycopg2.connect(
                host=db_params['host'],
                port=db_params['port'],
                database='postgres',
                user=db_params['username'],
                password=db_params['password']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            cursor = conn.cursor()
            
            # Drop database if it exists
            cursor.execute(f"DROP DATABASE IF EXISTS {db_params['database']}")
            logger.info(f"Database {db_params['database']} dropped")
            
            # Create new database
            cursor.execute(f"CREATE DATABASE {db_params['database']}")
            logger.info(f"Database {db_params['database']} created")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to recreate database: {e}")
            raise
    
    def restore_database(self, backup_key: str = None, backup_path: str = None) -> bool:
        """Restore database from backup."""
        try:
            logger.info("Starting database recovery...")
            
            # Get backup file
            if backup_path:
                backup_file = Path(backup_path)
                if not backup_file.exists():
                    logger.error(f"Backup file not found: {backup_path}")
                    return False
            elif backup_key:
                backup_file = self.download_backup(backup_key)
                if not backup_file:
                    logger.error("Failed to download backup")
                    return False
            else:
                # Use latest backup
                backups = self.list_available_backups()
                if not backups:
                    logger.error("No backups available")
                    return False
                
                backup_file = self.download_backup(backups[0]['key'])
                if not backup_file:
                    logger.error("Failed to download latest backup")
                    return False
            
            # Parse database connection
            db_url = self._get_database_url()
            db_params = self._parse_db_url(db_url)
            
            # Test connection
            if not self._test_database_connection(db_params):
                logger.error("Cannot connect to database")
                return False
            
            # Decrypt backup if needed
            if backup_file.suffix == '.enc':
                backup_file = self._decrypt_backup(backup_file)
            
            # Decompress backup if needed
            if backup_file.suffix == '.gz':
                backup_file = self._decompress_backup(backup_file)
            
            # Terminate existing connections
            self._terminate_connections(db_params)
            
            # Drop and recreate database
            self._drop_and_recreate_database(db_params)
            
            # Restore database
            logger.info("Restoring database from backup...")
            
            # Set password environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = db_params['password']
            
            # Execute pg_restore
            cmd = [
                'psql',
                f'--host={db_params["host"]}',
                f'--port={db_params["port"]}',
                f'--username={db_params["username"]}',
                f'--dbname={db_params["database"]}',
                '--file=' + str(backup_file)
            ]
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Database restoration failed: {result.stderr}")
                return False
            
            logger.info("Database restoration completed successfully")
            
            # Clean up backup file
            backup_file.unlink()
            logger.info("Backup file cleaned up")
            
            # Verify restoration
            if self._verify_restoration(db_params):
                logger.info("Database restoration verified successfully")
                return True
            else:
                logger.error("Database restoration verification failed")
                return False
            
        except Exception as e:
            logger.error(f"Database recovery failed: {e}")
            return False
    
    def _verify_restoration(self, db_params: Dict[str, str]) -> bool:
        """Verify that the database restoration was successful."""
        try:
            conn = psycopg2.connect(
                host=db_params['host'],
                port=db_params['port'],
                database=db_params['database'],
                user=db_params['username'],
                password=db_params['password']
            )
            
            cursor = conn.cursor()
            
            # Check if tables exist
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            
            tables = cursor.fetchall()
            logger.info(f"Found {len(tables)} tables in restored database")
            
            # Check for critical tables
            critical_tables = ['users', 'matches', 'tasks', 'chat_messages']
            existing_tables = [table[0] for table in tables]
            
            missing_tables = [table for table in critical_tables if table not in existing_tables]
            if missing_tables:
                logger.error(f"Missing critical tables: {missing_tables}")
                return False
            
            # Check table row counts
            for table in critical_tables:
                if table in existing_tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    logger.info(f"Table {table}: {count} rows")
            
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Restoration verification failed: {e}")
            return False
    
    def test_recovery_procedure(self, backup_key: str = None) -> bool:
        """Test recovery procedure without affecting production database."""
        try:
            logger.info("Testing recovery procedure...")
            
            # Create test database name
            test_db_name = f"test_recovery_{int(time.time())}"
            
            # Get backup file
            if backup_key:
                backup_file = self.download_backup(backup_key)
                if not backup_file:
                    logger.error("Failed to download backup for testing")
                    return False
            else:
                # Use latest backup
                backups = self.list_available_backups()
                if not backups:
                    logger.error("No backups available for testing")
                    return False
                
                backup_file = self.download_backup(backups[0]['key'])
                if not backup_file:
                    logger.error("Failed to download latest backup for testing")
                    return False
            
            # Parse database connection
            db_url = self._get_database_url()
            db_params = self._parse_db_url(db_url)
            
            # Create test database
            test_db_params = db_params.copy()
            test_db_params['database'] = test_db_name
            
            # Connect to postgres to create test database
            conn = psycopg2.connect(
                host=db_params['host'],
                port=db_params['port'],
                database='postgres',
                user=db_params['username'],
                password=db_params['password']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE {test_db_name}")
            conn.close()
            
            logger.info(f"Test database {test_db_name} created")
            
            # Decrypt and decompress backup
            if backup_file.suffix == '.enc':
                backup_file = self._decrypt_backup(backup_file)
            if backup_file.suffix == '.gz':
                backup_file = self._decompress_backup(backup_file)
            
            # Restore to test database
            env = os.environ.copy()
            env['PGPASSWORD'] = db_params['password']
            
            cmd = [
                'psql',
                f'--host={db_params["host"]}',
                f'--port={db_params["port"]}',
                f'--username={db_params["username"]}',
                f'--dbname={test_db_name}',
                '--file=' + str(backup_file)
            ]
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600
            )
            
            if result.returncode != 0:
                logger.error(f"Test restoration failed: {result.stderr}")
                return False
            
            # Verify test restoration
            if self._verify_restoration(test_db_params):
                logger.info("Test recovery procedure successful")
                
                # Clean up test database
                conn = psycopg2.connect(
                    host=db_params['host'],
                    port=db_params['port'],
                    database='postgres',
                    user=db_params['username'],
                    password=db_params['password']
                )
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                
                cursor = conn.cursor()
                cursor.execute(f"DROP DATABASE {test_db_name}")
                conn.close()
                
                logger.info(f"Test database {test_db_name} cleaned up")
                return True
            else:
                logger.error("Test recovery verification failed")
                return False
            
        except Exception as e:
            logger.error(f"Test recovery procedure failed: {e}")
            return False


def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='Database Recovery Manager')
    parser.add_argument('--list', action='store_true', help='List available backups')
    parser.add_argument('--restore', metavar='BACKUP_KEY', help='Restore from specific backup')
    parser.add_argument('--restore-file', metavar='FILE_PATH', help='Restore from local backup file')
    parser.add_argument('--test', action='store_true', help='Test recovery procedure')
    parser.add_argument('--latest', action='store_true', help='Restore from latest backup')
    
    args = parser.parse_args()
    
    recovery_manager = DatabaseRecoveryManager()
    
    if args.list:
        backups = recovery_manager.list_available_backups()
        print(f"Found {len(backups)} database backups:")
        for backup in backups[:10]:  # Show last 10
            print(f"  {backup['key']} ({backup['size']} bytes, {backup['last_modified']})")
            print(f"    Type: {backup['backup_type']}, Compressed: {backup['compressed']}, Encrypted: {backup['encrypted']}")
    
    elif args.restore:
        if recovery_manager.restore_database(backup_key=args.restore):
            print("✅ Database restoration completed successfully")
            sys.exit(0)
        else:
            print("❌ Database restoration failed")
            sys.exit(1)
    
    elif args.restore_file:
        if recovery_manager.restore_database(backup_path=args.restore_file):
            print("✅ Database restoration completed successfully")
            sys.exit(0)
        else:
            print("❌ Database restoration failed")
            sys.exit(1)
    
    elif args.test:
        if recovery_manager.test_recovery_procedure():
            print("✅ Recovery procedure test completed successfully")
            sys.exit(0)
        else:
            print("❌ Recovery procedure test failed")
            sys.exit(1)
    
    elif args.latest:
        if recovery_manager.restore_database():
            print("✅ Database restoration from latest backup completed successfully")
            sys.exit(0)
        else:
            print("❌ Database restoration from latest backup failed")
            sys.exit(1)
    
    else:
        # Default: list backups
        backups = recovery_manager.list_available_backups()
        print(f"Found {len(backups)} database backups:")
        for backup in backups[:5]:  # Show last 5
            print(f"  {backup['key']} ({backup['size']} bytes, {backup['last_modified']})")


if __name__ == "__main__":
    main()

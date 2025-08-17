#!/usr/bin/env python3
"""
Secrets Management Script
Comprehensive script for managing application secrets including generation, storage, rotation, and validation.
"""

import os
import sys
import argparse
import secrets as python_secrets
import string
from pathlib import Path
from typing import Optional, List
import logging

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from core.secrets_manager import secrets_manager
from core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecretsManagementCLI:
    """Command-line interface for secrets management"""
    
    def __init__(self):
        self.secrets_manager = secrets_manager
    
    def generate_secure_secret(self, length: int = 32, include_special: bool = True) -> str:
        """Generate a secure random secret"""
        characters = string.ascii_letters + string.digits
        if include_special:
            characters += "!@#$%^&*()_+-=[]{}|;:,.<>?"
        
        # Ensure at least one character from each category
        secret = (
            python_secrets.choice(string.ascii_lowercase) +
            python_secrets.choice(string.ascii_uppercase) +
            python_secrets.choice(string.digits)
        )
        
        if include_special:
            secret += python_secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?")
        
        # Fill the rest randomly
        remaining_length = length - len(secret)
        secret += ''.join(python_secrets.choice(characters) for _ in range(remaining_length))
        
        # Shuffle the secret
        secret_list = list(secret)
        python_secrets.shuffle(secret_list)
        return ''.join(secret_list)
    
    def generate_jwt_secret(self) -> str:
        """Generate a secure JWT secret"""
        return self.generate_secure_secret(64, include_special=True)
    
    def generate_api_key(self) -> str:
        """Generate a secure API key"""
        return self.generate_secure_secret(48, include_special=False)
    
    def generate_database_password(self) -> str:
        """Generate a secure database password"""
        return self.generate_secure_secret(24, include_special=True)
    
    def store_secret(self, key: str, value: str, metadata: Optional[dict] = None) -> bool:
        """Store a secret"""
        try:
            # Validate the secret
            validation = self.secrets_manager.validate_secret(key, value)
            if not validation["valid"]:
                logger.error(f"Secret validation failed for {key}:")
                for error in validation["errors"]:
                    logger.error(f"  - {error}")
                return False
            
            if validation["warnings"]:
                logger.warning(f"Secret warnings for {key}:")
                for warning in validation["warnings"]:
                    logger.warning(f"  - {warning}")
            
            # Store the secret
            success = self.secrets_manager.store_secret(key, value, metadata)
            if success:
                logger.info(f"Secret stored successfully: {key}")
            else:
                logger.error(f"Failed to store secret: {key}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error storing secret {key}: {e}")
            return False
    
    def rotate_secret(self, key: str, new_value: Optional[str] = None) -> bool:
        """Rotate a secret"""
        try:
            if new_value is None:
                # Generate new value based on key type
                if "jwt" in key.lower():
                    new_value = self.generate_jwt_secret()
                elif "api" in key.lower():
                    new_value = self.generate_api_key()
                elif "password" in key.lower() or "db" in key.lower():
                    new_value = self.generate_database_password()
                else:
                    new_value = self.generate_secure_secret()
            
            # Validate the new secret
            validation = self.secrets_manager.validate_secret(key, new_value)
            if not validation["valid"]:
                logger.error(f"New secret validation failed for {key}:")
                for error in validation["errors"]:
                    logger.error(f"  - {error}")
                return False
            
            # Rotate the secret
            success = self.secrets_manager.rotate_secret(key, new_value)
            if success:
                logger.info(f"Secret rotated successfully: {key}")
                logger.info(f"New value: {new_value[:8]}...")
            else:
                logger.error(f"Failed to rotate secret: {key}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error rotating secret {key}: {e}")
            return False
    
    def list_secrets(self) -> None:
        """List all secrets with metadata"""
        try:
            secrets = self.secrets_manager.list_secrets()
            if not secrets:
                logger.info("No secrets found")
                return
            
            logger.info("Available secrets:")
            for secret_key in secrets:
                metadata = self.secrets_manager.get_secret_metadata(secret_key)
                if metadata:
                    logger.info(f"  {secret_key}:")
                    logger.info(f"    Created: {metadata.get('created_at', 'Unknown')}")
                    logger.info(f"    Updated: {metadata.get('updated_at', 'Unknown')}")
                    logger.info(f"    Version: {metadata.get('version', 1)}")
                else:
                    logger.info(f"  {secret_key}: No metadata available")
            
        except Exception as e:
            logger.error(f"Error listing secrets: {e}")
    
    def backup_secrets(self, backup_path: Optional[str] = None) -> bool:
        """Backup all secrets"""
        try:
            success = self.secrets_manager.backup_secrets(backup_path)
            if success:
                logger.info("Secrets backup completed successfully")
            else:
                logger.error("Failed to backup secrets")
            return success
            
        except Exception as e:
            logger.error(f"Error backing up secrets: {e}")
            return False
    
    def restore_secrets(self, backup_path: str) -> bool:
        """Restore secrets from backup"""
        try:
            if not Path(backup_path).exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            success = self.secrets_manager.restore_secrets(backup_path)
            if success:
                logger.info("Secrets restored successfully")
            else:
                logger.error("Failed to restore secrets")
            return success
            
        except Exception as e:
            logger.error(f"Error restoring secrets: {e}")
            return False
    
    def validate_secret(self, key: str, value: str) -> bool:
        """Validate a secret"""
        try:
            validation = self.secrets_manager.validate_secret(key, value)
            
            if validation["valid"]:
                logger.info(f"Secret validation passed for {key}")
            else:
                logger.error(f"Secret validation failed for {key}:")
                for error in validation["errors"]:
                    logger.error(f"  - {error}")
            
            if validation["warnings"]:
                logger.warning(f"Secret warnings for {key}:")
                for warning in validation["warnings"]:
                    logger.warning(f"  - {warning}")
            
            return validation["valid"]
            
        except Exception as e:
            logger.error(f"Error validating secret {key}: {e}")
            return False
    
    def setup_production_secrets(self) -> bool:
        """Set up all required secrets for production"""
        try:
            logger.info("Setting up production secrets...")
            
            # Generate and store JWT secret
            jwt_secret = self.generate_jwt_secret()
            if not self.store_secret("JWT_SECRET_KEY", jwt_secret, {"type": "jwt", "environment": "production"}):
                return False
            
            # Generate and store database password
            db_password = self.generate_database_password()
            if not self.store_secret("DB_PASSWORD", db_password, {"type": "database", "environment": "production"}):
                return False
            
            # Generate and store API keys
            gemini_api_key = self.generate_api_key()
            if not self.store_secret("GEMINI_API_KEY", gemini_api_key, {"type": "api", "service": "gemini", "environment": "production"}):
                return False
            
            # Generate and store monitoring keys
            monitoring_key = self.generate_api_key()
            if not self.store_secret("MONITORING_API_KEY", monitoring_key, {"type": "api", "service": "monitoring", "environment": "production"}):
                return False
            
            # Generate and store email service key
            email_key = self.generate_api_key()
            if not self.store_secret("EMAIL_API_KEY", email_key, {"type": "api", "service": "email", "environment": "production"}):
                return False
            
            logger.info("Production secrets setup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error setting up production secrets: {e}")
            return False
    
    def cleanup_old_backups(self, days: int = 30) -> int:
        """Clean up old backup files"""
        try:
            removed_count = self.secrets_manager.cleanup_old_backups(days)
            logger.info(f"Cleaned up {removed_count} old backup files")
            return removed_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {e}")
            return 0

def main():
    """Main function for CLI"""
    parser = argparse.ArgumentParser(description="Secrets Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Generate command
    generate_parser = subparsers.add_parser("generate", help="Generate a new secret")
    generate_parser.add_argument("type", choices=["jwt", "api", "password", "general"], 
                                help="Type of secret to generate")
    generate_parser.add_argument("--length", type=int, default=32, help="Length of the secret")
    generate_parser.add_argument("--no-special", action="store_true", help="Exclude special characters")
    
    # Store command
    store_parser = subparsers.add_parser("store", help="Store a secret")
    store_parser.add_argument("key", help="Secret key")
    store_parser.add_argument("value", help="Secret value")
    store_parser.add_argument("--metadata", help="JSON metadata")
    
    # Rotate command
    rotate_parser = subparsers.add_parser("rotate", help="Rotate a secret")
    rotate_parser.add_argument("key", help="Secret key to rotate")
    rotate_parser.add_argument("--value", help="New secret value (auto-generated if not provided)")
    
    # List command
    subparsers.add_parser("list", help="List all secrets")
    
    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Backup all secrets")
    backup_parser.add_argument("--path", help="Backup file path")
    
    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore secrets from backup")
    restore_parser.add_argument("path", help="Backup file path")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate a secret")
    validate_parser.add_argument("key", help="Secret key")
    validate_parser.add_argument("value", help="Secret value to validate")
    
    # Setup command
    subparsers.add_parser("setup", help="Set up production secrets")
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Clean up old backups")
    cleanup_parser.add_argument("--days", type=int, default=30, help="Days to keep backups")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = SecretsManagementCLI()
    
    try:
        if args.command == "generate":
            if args.type == "jwt":
                secret = cli.generate_jwt_secret()
            elif args.type == "api":
                secret = cli.generate_api_key()
            elif args.type == "password":
                secret = cli.generate_database_password()
            else:
                secret = cli.generate_secure_secret(args.length, not args.no_special)
            
            logger.info(f"Generated {args.type} secret: {secret}")
            
        elif args.command == "store":
            metadata = None
            if args.metadata:
                import json
                metadata = json.loads(args.metadata)
            
            success = cli.store_secret(args.key, args.value, metadata)
            sys.exit(0 if success else 1)
            
        elif args.command == "rotate":
            success = cli.rotate_secret(args.key, args.value)
            sys.exit(0 if success else 1)
            
        elif args.command == "list":
            cli.list_secrets()
            
        elif args.command == "backup":
            success = cli.backup_secrets(args.path)
            sys.exit(0 if success else 1)
            
        elif args.command == "restore":
            success = cli.restore_secrets(args.path)
            sys.exit(0 if success else 1)
            
        elif args.command == "validate":
            success = cli.validate_secret(args.key, args.value)
            sys.exit(0 if success else 1)
            
        elif args.command == "setup":
            success = cli.setup_production_secrets()
            sys.exit(0 if success else 1)
            
        elif args.command == "cleanup":
            removed = cli.cleanup_old_backups(args.days)
            logger.info(f"Cleanup completed: {removed} files removed")
            
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

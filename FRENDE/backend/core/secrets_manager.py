"""
Secrets Management System
Centralized secrets management with encryption, validation, and rotation capabilities.
"""

import os
import json
import base64
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import secrets as python_secrets

logger = logging.getLogger(__name__)

class SecretsManager:
    """Centralized secrets management with encryption and rotation"""
    
    def __init__(self, master_key: Optional[str] = None):
        self.master_key = master_key or self._generate_master_key()
        self.fernet = self._create_fernet()
        self.secrets_cache: Dict[str, Dict[str, Any]] = {}
        self.secrets_file = Path("/var/secrets/frende/secrets.json")
        self.backup_dir = Path("/var/secrets/frende/backups")
        
    def _generate_master_key(self) -> str:
        """Generate a secure master key"""
        return base64.urlsafe_b64encode(python_secrets.token_bytes(32)).decode()
    
    def _create_fernet(self) -> Fernet:
        """Create Fernet cipher for encryption"""
        # Derive key from master key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'frende_secrets_salt',  # In production, use unique salt per environment
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
        return Fernet(key)
    
    def _ensure_secrets_directory(self):
        """Ensure secrets directory exists with proper permissions"""
        self.secrets_file.parent.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Set restrictive permissions
        os.chmod(self.secrets_file.parent, 0o700)
        os.chmod(self.backup_dir, 0o700)
    
    def encrypt_secret(self, value: str) -> str:
        """Encrypt a secret value"""
        try:
            encrypted = self.fernet.encrypt(value.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt secret: {e}")
            raise
    
    def decrypt_secret(self, encrypted_value: str) -> str:
        """Decrypt a secret value"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode())
            decrypted = self.fernet.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt secret: {e}")
            raise
    
    def store_secret(self, key: str, value: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Store a secret with metadata"""
        try:
            self._ensure_secrets_directory()
            
            # Load existing secrets
            secrets_data = self._load_secrets()
            
            # Create secret entry
            secret_entry = {
                "value": self.encrypt_secret(value),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "version": 1,
                "metadata": metadata or {}
            }
            
            secrets_data[key] = secret_entry
            
            # Save secrets
            self._save_secrets(secrets_data)
            
            # Update cache
            self.secrets_cache[key] = secret_entry
            
            logger.info(f"Secret stored successfully: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store secret {key}: {e}")
            return False
    
    def get_secret(self, key: str, decrypt: bool = True) -> Optional[str]:
        """Get a secret value"""
        try:
            # Check cache first
            if key in self.secrets_cache:
                secret_entry = self.secrets_cache[key]
            else:
                # Load from file
                secrets_data = self._load_secrets()
                if key not in secrets_data:
                    logger.warning(f"Secret not found: {key}")
                    return None
                secret_entry = secrets_data[key]
                self.secrets_cache[key] = secret_entry
            
            if decrypt:
                return self.decrypt_secret(secret_entry["value"])
            else:
                return secret_entry["value"]
                
        except Exception as e:
            logger.error(f"Failed to get secret {key}: {e}")
            return None
    
    def rotate_secret(self, key: str, new_value: str) -> bool:
        """Rotate a secret value"""
        try:
            # Get current secret metadata
            secrets_data = self._load_secrets()
            if key not in secrets_data:
                logger.error(f"Secret not found for rotation: {key}")
                return False
            
            current_secret = secrets_data[key]
            
            # Create backup of current secret
            backup_entry = {
                "value": current_secret["value"],
                "created_at": current_secret["created_at"],
                "updated_at": datetime.utcnow().isoformat(),
                "version": current_secret["version"],
                "metadata": current_secret["metadata"],
                "rotated_at": datetime.utcnow().isoformat()
            }
            
            # Store backup
            backup_file = self.backup_dir / f"{key}_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(backup_file, 'w') as f:
                json.dump(backup_entry, f, indent=2)
            
            # Update secret
            current_secret["value"] = self.encrypt_secret(new_value)
            current_secret["updated_at"] = datetime.utcnow().isoformat()
            current_secret["version"] += 1
            
            # Save updated secrets
            self._save_secrets(secrets_data)
            
            # Update cache
            self.secrets_cache[key] = current_secret
            
            logger.info(f"Secret rotated successfully: {key} (version {current_secret['version']})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to rotate secret {key}: {e}")
            return False
    
    def list_secrets(self) -> List[str]:
        """List all available secrets"""
        try:
            secrets_data = self._load_secrets()
            return list(secrets_data.keys())
        except Exception as e:
            logger.error(f"Failed to list secrets: {e}")
            return []
    
    def delete_secret(self, key: str) -> bool:
        """Delete a secret"""
        try:
            secrets_data = self._load_secrets()
            if key not in secrets_data:
                logger.warning(f"Secret not found for deletion: {key}")
                return False
            
            # Create backup before deletion
            backup_entry = secrets_data[key]
            backup_entry["deleted_at"] = datetime.utcnow().isoformat()
            
            backup_file = self.backup_dir / f"{key}_deleted_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(backup_file, 'w') as f:
                json.dump(backup_entry, f, indent=2)
            
            # Remove from secrets
            del secrets_data[key]
            self._save_secrets(secrets_data)
            
            # Remove from cache
            if key in self.secrets_cache:
                del self.secrets_cache[key]
            
            logger.info(f"Secret deleted successfully: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete secret {key}: {e}")
            return False
    
    def validate_secret(self, key: str, value: str) -> Dict[str, Any]:
        """Validate a secret value"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check length
        if len(value) < 8:
            validation_result["valid"] = False
            validation_result["errors"].append("Secret must be at least 8 characters long")
        
        # Check for common weak patterns
        if value.lower() in ['password', 'secret', 'key', 'token']:
            validation_result["warnings"].append("Secret appears to be a placeholder value")
        
        # Check for common patterns
        if value.isdigit():
            validation_result["warnings"].append("Secret contains only digits")
        
        if value.isalpha():
            validation_result["warnings"].append("Secret contains only letters")
        
        # Check entropy (basic check)
        unique_chars = len(set(value))
        if unique_chars < len(value) * 0.5:
            validation_result["warnings"].append("Secret has low character diversity")
        
        return validation_result
    
    def _load_secrets(self) -> Dict[str, Any]:
        """Load secrets from file"""
        if not self.secrets_file.exists():
            return {}
        
        try:
            with open(self.secrets_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load secrets: {e}")
            return {}
    
    def _save_secrets(self, secrets_data: Dict[str, Any]):
        """Save secrets to file"""
        try:
            with open(self.secrets_file, 'w') as f:
                json.dump(secrets_data, f, indent=2)
            
            # Set restrictive permissions
            os.chmod(self.secrets_file, 0o600)
            
        except Exception as e:
            logger.error(f"Failed to save secrets: {e}")
            raise
    
    def backup_secrets(self, backup_path: Optional[str] = None) -> bool:
        """Create a backup of all secrets"""
        try:
            secrets_data = self._load_secrets()
            
            if not backup_path:
                backup_path = self.backup_dir / f"secrets_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            else:
                backup_path = Path(backup_path)
            
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(backup_path, 'w') as f:
                json.dump(secrets_data, f, indent=2)
            
            # Set restrictive permissions
            os.chmod(backup_path, 0o600)
            
            logger.info(f"Secrets backup created: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to backup secrets: {e}")
            return False
    
    def restore_secrets(self, backup_path: str) -> bool:
        """Restore secrets from backup"""
        try:
            backup_file = Path(backup_path)
            if not backup_file.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            with open(backup_file, 'r') as f:
                secrets_data = json.load(f)
            
            # Validate backup data structure
            for key, value in secrets_data.items():
                if not isinstance(value, dict) or "value" not in value:
                    logger.error(f"Invalid backup data structure for key: {key}")
                    return False
            
            # Create backup of current secrets before restoration
            self.backup_secrets()
            
            # Restore secrets
            self._save_secrets(secrets_data)
            
            # Clear cache
            self.secrets_cache.clear()
            
            logger.info(f"Secrets restored from backup: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore secrets: {e}")
            return False
    
    def get_secret_metadata(self, key: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a secret"""
        try:
            secrets_data = self._load_secrets()
            if key not in secrets_data:
                return None
            
            secret_entry = secrets_data[key]
            return {
                "created_at": secret_entry.get("created_at"),
                "updated_at": secret_entry.get("updated_at"),
                "version": secret_entry.get("version", 1),
                "metadata": secret_entry.get("metadata", {})
            }
            
        except Exception as e:
            logger.error(f"Failed to get secret metadata for {key}: {e}")
            return None
    
    def cleanup_old_backups(self, days_to_keep: int = 30) -> int:
        """Clean up old backup files"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            removed_count = 0
            
            for backup_file in self.backup_dir.glob("*.json"):
                if backup_file.stat().st_mtime < cutoff_date.timestamp():
                    backup_file.unlink()
                    removed_count += 1
            
            logger.info(f"Cleaned up {removed_count} old backup files")
            return removed_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old backups: {e}")
            return 0

# Global secrets manager instance
secrets_manager = SecretsManager()

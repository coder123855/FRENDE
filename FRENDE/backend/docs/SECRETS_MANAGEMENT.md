# Secrets Management Documentation

This document outlines the secrets management system for the Frende application, including setup, usage, and best practices.

## Overview

The Frende application uses a centralized secrets management system that provides:

- **Encryption**: All secrets are encrypted using Fernet (AES-128-CBC)
- **Validation**: Automatic validation of secret strength and format
- **Rotation**: Secure secret rotation with backup and rollback capabilities
- **Backup**: Automated backup and restoration of secrets
- **Metadata**: Tracking of secret creation, updates, and usage
- **CLI Tools**: Command-line interface for secret management

## Architecture

### Components

1. **SecretsManager Class** (`core/secrets_manager.py`)
   - Core encryption and decryption functionality
   - Secret storage and retrieval
   - Validation and rotation logic

2. **Configuration Integration** (`core/config.py`)
   - Environment variable validation
   - Secrets manager integration
   - Fallback to environment variables

3. **CLI Tools** (`scripts/manage_secrets.py`)
   - Command-line interface for secret management
   - Generation, storage, rotation, and validation

4. **Storage**
   - Encrypted JSON files in `/var/secrets/frende/`
   - Backup files in `/var/secrets/frende/backups/`
   - Restrictive file permissions (600)

## Setup

### 1. Initial Configuration

```bash
# Create secrets directory
sudo mkdir -p /var/secrets/frende/backups
sudo chown -R frende:frende /var/secrets/frende
sudo chmod 700 /var/secrets/frende
sudo chmod 700 /var/secrets/frende/backups
```

### 2. Generate Master Key

```bash
# Generate a secure master key
python scripts/manage_secrets.py generate general --length 64
```

### 3. Set Environment Variables

```bash
# Add to your .env file
SECRETS_MANAGER_ENABLED=true
SECRETS_MASTER_KEY=your-generated-master-key
SECRETS_BACKUP_ENABLED=true
SECRETS_ROTATION_ENABLED=true
```

### 4. Set Up Production Secrets

```bash
# Set up all required production secrets
python scripts/manage_secrets.py setup
```

## Usage

### Command Line Interface

#### Generate Secrets

```bash
# Generate JWT secret
python scripts/manage_secrets.py generate jwt

# Generate API key
python scripts/manage_secrets.py generate api

# Generate database password
python scripts/manage_secrets.py generate password

# Generate custom secret
python scripts/manage_secrets.py generate general --length 48 --no-special
```

#### Store Secrets

```bash
# Store a secret with metadata
python scripts/manage_secrets.py store JWT_SECRET_KEY "your-secret-value" \
  --metadata '{"type": "jwt", "environment": "production"}'

# Store without metadata
python scripts/manage_secrets.py store GEMINI_API_KEY "your-api-key"
```

#### Rotate Secrets

```bash
# Rotate with auto-generated value
python scripts/manage_secrets.py rotate JWT_SECRET_KEY

# Rotate with custom value
python scripts/manage_secrets.py rotate JWT_SECRET_KEY --value "new-secret-value"
```

#### List and Validate

```bash
# List all secrets with metadata
python scripts/manage_secrets.py list

# Validate a secret
python scripts/manage_secrets.py validate JWT_SECRET_KEY "your-secret-value"
```

#### Backup and Restore

```bash
# Create backup
python scripts/manage_secrets.py backup

# Create backup to specific location
python scripts/manage_secrets.py backup --path /backup/secrets.json

# Restore from backup
python scripts/manage_secrets.py restore /backup/secrets.json

# Clean up old backups
python scripts/manage_secrets.py cleanup --days 30
```

### Programmatic Usage

#### Basic Operations

```python
from core.secrets_manager import secrets_manager
from core.config import settings

# Store a secret
success = secrets_manager.store_secret(
    "API_KEY", 
    "your-api-key",
    {"service": "external-api", "environment": "production"}
)

# Retrieve a secret
api_key = secrets_manager.get_secret("API_KEY")

# Rotate a secret
success = secrets_manager.rotate_secret("API_KEY", "new-api-key")

# Validate a secret
validation = secrets_manager.validate_secret("API_KEY", "your-secret")
if validation["valid"]:
    print("Secret is valid")
else:
    print("Validation errors:", validation["errors"])
```

#### Configuration Integration

```python
from core.config import settings

# Get secret from configuration (falls back to environment variable)
jwt_secret = settings.get_secret("JWT_SECRET_KEY", "default-secret")

# Store secret through configuration
settings.store_secret("NEW_SECRET", "secret-value")

# Rotate secret through configuration
settings.rotate_secret("JWT_SECRET_KEY", "new-jwt-secret")
```

## Security Features

### Encryption

- **Algorithm**: Fernet (AES-128-CBC with HMAC)
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 100,000 iterations
- **Salt**: Environment-specific salt for key derivation
- **Key Storage**: Master key stored separately from encrypted secrets

### Validation

- **Length**: Minimum 8 characters
- **Complexity**: Checks for character diversity
- **Pattern Detection**: Identifies common weak patterns
- **Entropy**: Basic entropy analysis

### Access Control

- **File Permissions**: 600 (owner read/write only)
- **Directory Permissions**: 700 (owner read/write/execute only)
- **Process User**: Runs as dedicated application user
- **Network Access**: No network access to secrets storage

### Backup and Recovery

- **Automatic Backups**: Before rotation and deletion
- **Versioning**: Track secret versions
- **Rollback**: Restore from backup if needed
- **Retention**: Configurable backup retention policy

## Best Practices

### 1. Secret Generation

```bash
# Use appropriate secret types
python scripts/manage_secrets.py generate jwt      # For JWT tokens
python scripts/manage_secrets.py generate api      # For API keys
python scripts/manage_secrets.py generate password # For passwords
```

### 2. Regular Rotation

```bash
# Set up automated rotation (cron job)
0 2 * * 0 python /app/scripts/manage_secrets.py rotate JWT_SECRET_KEY
0 3 * * 0 python /app/scripts/manage_secrets.py rotate GEMINI_API_KEY
```

### 3. Backup Strategy

```bash
# Daily backups
0 1 * * * python /app/scripts/manage_secrets.py backup

# Weekly cleanup
0 4 * * 0 python /app/scripts/manage_secrets.py cleanup --days 30
```

### 4. Monitoring

```python
# Monitor secret access
import logging
logger = logging.getLogger(__name__)

# Log secret access (without exposing values)
logger.info(f"Secret accessed: {secret_key}")
logger.warning(f"Secret validation failed: {secret_key}")
```

### 5. Environment Separation

```bash
# Development
SECRETS_MANAGER_ENABLED=false  # Use environment variables

# Production
SECRETS_MANAGER_ENABLED=true   # Use encrypted storage
```

## Security Guidelines

### 1. Master Key Management

- **Generation**: Use cryptographically secure random generation
- **Storage**: Store separately from application code
- **Rotation**: Rotate master key periodically
- **Access**: Limit access to authorized personnel only

### 2. Secret Policies

- **Length**: Minimum 16 characters for production
- **Complexity**: Include uppercase, lowercase, digits, symbols
- **Uniqueness**: Use unique secrets for each service
- **Rotation**: Rotate secrets every 90 days

### 3. Access Control

- **Principle of Least Privilege**: Grant minimal necessary access
- **Audit Logging**: Log all secret access and modifications
- **Separation of Duties**: Different people for generation and deployment
- **Emergency Access**: Document emergency access procedures

### 4. Backup Security

- **Encryption**: Encrypt backup files
- **Location**: Store backups in secure location
- **Access**: Limit backup access to authorized personnel
- **Testing**: Regularly test backup restoration

## Troubleshooting

### Common Issues

#### 1. Permission Denied

```bash
# Fix file permissions
sudo chown -R frende:frende /var/secrets/frende
sudo chmod 700 /var/secrets/frende
sudo chmod 600 /var/secrets/frende/secrets.json
```

#### 2. Master Key Issues

```bash
# Regenerate master key
python scripts/manage_secrets.py generate general --length 64
# Update SECRETS_MASTER_KEY in environment
```

#### 3. Backup Restoration

```bash
# Verify backup file
python scripts/manage_secrets.py validate backup_file.json

# Restore with verification
python scripts/manage_secrets.py restore backup_file.json
```

#### 4. Validation Errors

```bash
# Check secret format
python scripts/manage_secrets.py validate SECRET_KEY "your-secret"

# Generate compliant secret
python scripts/manage_secrets.py generate general --length 32
```

### Debug Mode

```python
# Enable debug logging
import logging
logging.getLogger('core.secrets_manager').setLevel(logging.DEBUG)
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deploy with Secrets

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Deploy to production
        env:
          SECRETS_MASTER_KEY: ${{ secrets.SECRETS_MASTER_KEY }}
        run: |
          python scripts/manage_secrets.py setup
          # Deploy application
```

### Docker Integration

```dockerfile
# Create secrets directory
RUN mkdir -p /var/secrets/frende/backups
RUN chown -R frende:frende /var/secrets/frende
RUN chmod 700 /var/secrets/frende

# Copy secrets management scripts
COPY scripts/manage_secrets.py /app/scripts/
RUN chmod +x /app/scripts/manage_secrets.py
```

## Compliance and Auditing

### Audit Trail

The secrets manager maintains an audit trail including:

- Secret creation timestamps
- Last modification timestamps
- Version numbers
- Rotation history
- Access patterns

### Compliance Features

- **Encryption at Rest**: All secrets encrypted
- **Access Logging**: All operations logged
- **Backup Verification**: Backup integrity checks
- **Rotation Tracking**: Automatic rotation scheduling

### Reporting

```bash
# Generate audit report
python scripts/manage_secrets.py list > audit_report.txt

# Check secret ages
python scripts/manage_secrets.py list | grep -E "(created_at|updated_at)"
```

## Migration Guide

### From Environment Variables

```bash
# 1. Backup current environment
env > environment_backup.txt

# 2. Store secrets in secrets manager
python scripts/manage_secrets.py store JWT_SECRET_KEY "$JWT_SECRET_KEY"
python scripts/manage_secrets.py store GEMINI_API_KEY "$GEMINI_API_KEY"

# 3. Update configuration
# Set SECRETS_MANAGER_ENABLED=true in .env

# 4. Test application
python -m pytest tests/test_secrets.py

# 5. Remove from environment variables
# Comment out or remove secret variables from .env
```

### From External Secrets Manager

```bash
# 1. Export secrets from external system
# (Implementation depends on external system)

# 2. Import to local secrets manager
python scripts/manage_secrets.py store SECRET_KEY "exported-value"

# 3. Verify import
python scripts/manage_secrets.py list

# 4. Update application configuration
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review secret access logs
2. **Monthly**: Rotate master key
3. **Quarterly**: Rotate application secrets
4. **Annually**: Review and update security policies

### Monitoring

- Monitor secret access patterns
- Alert on unusual access
- Track secret age and rotation status
- Monitor backup success/failure

### Updates

- Keep secrets manager updated
- Review security advisories
- Update encryption algorithms as needed
- Test backup and restore procedures

## Conclusion

The secrets management system provides a secure, scalable solution for managing application secrets. By following the guidelines and best practices outlined in this document, you can ensure the security and integrity of your application's sensitive data.

For additional support or questions, refer to the application logs or contact the development team.

# Database Security Documentation

This document outlines the security measures and procedures for the Frende PostgreSQL database in production.

## Overview

The Frende application uses PostgreSQL as its primary database with comprehensive security measures including SSL/TLS encryption, connection pooling, access controls, and automated backups.

## Security Features

### 1. SSL/TLS Encryption

- **Status**: Enabled in production
- **Configuration**: All database connections use SSL with certificate verification
- **Implementation**: Automatic SSL context creation in `core/database.py`

### 2. Connection Pooling

- **Pool Size**: 20 connections (configurable)
- **Max Overflow**: 30 connections
- **Timeout**: 60 seconds
- **Health Checks**: Pre-ping enabled for connection validation

### 3. Database User Management

- **Application User**: `{database_name}_app`
- **Permissions**: Minimal required permissions only
- **Password**: Environment variable `DB_APP_PASSWORD`

### 4. Access Controls

- **Connection Limits**: 200 maximum connections
- **Authentication Timeout**: 60 seconds
- **Logging**: All connections and disconnections logged

## Database Setup

### Initial Setup

1. **Run Production Setup Script**:
   ```bash
   cd FRENDE/backend
   python scripts/setup_production_db.py
   ```

2. **Verify Setup**:
   ```bash
   # Test database connection
   curl https://your-api-domain.com/api/health/database
   
   # Check detailed health
   curl https://your-api-domain.com/api/health/detailed
   ```

### Environment Variables

Required environment variables for production:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30
DATABASE_POOL_TIMEOUT=60

# Security
JWT_SECRET_KEY=your-strong-secret-key
DB_APP_PASSWORD=your-app-user-password

# Environment
ENVIRONMENT=production
DEBUG=false
```

## Backup and Recovery

### Automated Backups

- **Schedule**: Daily at 2:00 AM
- **Retention**: 30 days
- **Compression**: Gzip compression
- **Location**: `/var/backups/frende/database/`

### Manual Backup

```bash
# Create backup
python scripts/backup_database.py --action backup

# List backups
python scripts/backup_database.py --action list

# Restore from backup
python scripts/backup_database.py --action restore --backup-file /path/to/backup.sql.gz

# Cleanup old backups
python scripts/backup_database.py --action cleanup
```

### Backup Verification

```bash
# Verify backup integrity
python scripts/backup_database.py --action verify --backup-file /path/to/backup.sql.gz
```

## Monitoring and Maintenance

### Health Checks

- **Basic Health**: `GET /api/health/`
- **Database Health**: `GET /api/health/database`
- **Detailed Health**: `GET /api/health/detailed`
- **Readiness Check**: `GET /api/health/ready`
- **Liveness Check**: `GET /api/health/live`

### Database Monitoring

The application includes built-in monitoring functions:

```sql
-- Get database statistics
SELECT * FROM get_database_stats();

-- Get slow queries
SELECT * FROM get_slow_queries();
```

### Automated Maintenance

- **Schedule**: Weekly on Sunday at 1:00 AM
- **Tasks**:
  - Database index optimization
  - Security settings verification
  - Monitoring function updates

## Security Best Practices

### 1. Password Management

- Use strong, unique passwords for database users
- Rotate passwords regularly
- Store passwords in environment variables only
- Never commit passwords to version control

### 2. Network Security

- Use SSL/TLS for all database connections
- Restrict database access to application servers only
- Use firewall rules to limit access
- Monitor connection attempts

### 3. Access Control

- Use dedicated database users with minimal permissions
- Regularly audit user permissions
- Monitor failed authentication attempts
- Implement connection limits

### 4. Data Protection

- Encrypt data at rest (if supported by hosting provider)
- Use SSL/TLS for data in transit
- Implement proper backup encryption
- Regular security audits

## Troubleshooting

### Common Issues

1. **SSL Connection Errors**:
   ```bash
   # Check SSL configuration
   python scripts/setup_production_db.py
   ```

2. **Connection Pool Exhaustion**:
   ```bash
   # Check connection pool status
   curl https://your-api-domain.com/api/health/detailed
   ```

3. **Backup Failures**:
   ```bash
   # Check backup logs
   tail -f /var/log/frende/backup.log
   ```

### Log Locations

- **Application Logs**: `/var/log/frende/app.log`
- **Backup Logs**: `/var/log/frende/backup.log`
- **Maintenance Logs**: `/var/log/frende/maintenance.log`
- **Database Logs**: PostgreSQL server logs

## Disaster Recovery

### Recovery Procedures

1. **Database Corruption**:
   ```bash
   # Restore from latest backup
   python scripts/backup_database.py --action restore --backup-file /var/backups/frende/database/latest.sql.gz
   ```

2. **Complete System Failure**:
   - Restore from backup
   - Verify data integrity
   - Test application functionality
   - Update DNS if necessary

### Recovery Time Objectives

- **RTO**: 30 minutes for database restore
- **RPO**: 24 hours (daily backups)
- **Testing**: Monthly recovery drills

## Compliance

### Data Protection

- **Encryption**: All data encrypted in transit
- **Access Logs**: All database access logged
- **Backup Security**: Encrypted backups with retention policy
- **Audit Trail**: Complete audit trail for all operations

### Monitoring

- **Real-time Monitoring**: Database health and performance
- **Alerting**: Automated alerts for security events
- **Logging**: Comprehensive logging for compliance
- **Reporting**: Regular security reports

## Support

For database security issues or questions:

1. Check the application logs
2. Review this documentation
3. Contact the development team
4. Escalate to security team if necessary

## Updates

This documentation should be updated whenever:
- Security configurations change
- New security features are added
- Procedures are modified
- Compliance requirements change

Last updated: [Current Date]
Version: 1.0

# Disaster Recovery Documentation

## Overview

This document outlines the comprehensive disaster recovery procedures for the Frende application, including backup strategies, recovery procedures, and business continuity measures.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Recovery Procedures](#recovery-procedures)
3. [Business Continuity](#business-continuity)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Testing Procedures](#testing-procedures)
6. [Emergency Contacts](#emergency-contacts)
7. [Compliance and Documentation](#compliance-and-documentation)

## Backup Strategy

### Database Backups

#### Automated PostgreSQL Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Compression**: Enabled (gzip)
- **Encryption**: AES-256 encryption
- **Storage**: S3 with cross-region replication
- **Backup Type**: Full database dump with WAL archiving

#### Backup Configuration
```bash
# Database backup settings
DB_BACKUP_ENABLED=true
DB_BACKUP_S3_BUCKET=frende-db-backups
DB_BACKUP_S3_REGION=us-east-1
DB_BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION_KEY=your-encryption-key
```

#### Manual Backup Commands
```bash
# Create database backup
python scripts/backup/database_backup.py --create

# List available backups
python scripts/backup/database_backup.py --list

# Clean up old backups
python scripts/backup/database_backup.py --cleanup
```

### Redis Backups

#### RDB and AOF Persistence
- **RDB Frequency**: Every 15 minutes if 1+ keys changed
- **AOF Persistence**: Enabled with fsync every second
- **Backup Storage**: S3 with encryption
- **Replication**: Master-slave setup for high availability

#### Redis Backup Commands
```bash
# Create RDB backup
python scripts/backup/redis_backup.py --rdb

# Create AOF backup
python scripts/backup/redis_backup.py --aof

# Setup Redis persistence
python scripts/backup/redis_backup.py --setup-persistence

# Check Redis health
python scripts/backup/redis_backup.py --health
```

### File Backups

#### Application Files
- **Frequency**: Daily incremental, weekly full
- **Patterns**: Include `*.jpg`, `*.png`, `*.pdf`
- **Exclude**: `*.tmp`, `*.log`
- **Compression**: tar.gz with encryption
- **Storage**: S3 with versioning

#### File Backup Commands
```bash
# Create full backup
python scripts/backup/file_backup.py --create

# Create incremental backup
python scripts/backup/file_backup.py --incremental

# Restore files
python scripts/backup/file_backup.py --restore backup.tar.gz --restore-dir ./restored
```

## Recovery Procedures

### Database Recovery

#### Automated Recovery
```bash
# Restore from latest backup
python scripts/recovery/database_recovery.py --latest

# Restore from specific backup
python scripts/recovery/database_recovery.py --restore database-backups/2024/01/15/frende_db_backup_20240115_020000.sql.gz

# Test recovery procedure
python scripts/recovery/database_recovery.py --test
```

#### Manual Recovery Steps
1. **Stop Application Services**
   ```bash
   sudo systemctl stop frende-backend
   sudo systemctl stop frende-frontend
   ```

2. **Terminate Database Connections**
   ```bash
   psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'frende';"
   ```

3. **Drop and Recreate Database**
   ```bash
   dropdb -h localhost -U postgres frende
   createdb -h localhost -U postgres frende
   ```

4. **Restore from Backup**
   ```bash
   psql -h localhost -U postgres -d frende -f backup_file.sql
   ```

5. **Verify Restoration**
   ```bash
   psql -h localhost -U postgres -d frende -c "SELECT COUNT(*) FROM users;"
   psql -h localhost -U postgres -d frende -c "SELECT COUNT(*) FROM matches;"
   ```

6. **Restart Services**
   ```bash
   sudo systemctl start frende-backend
   sudo systemctl start frende-frontend
   ```

### Application Recovery

#### Frontend Recovery
1. **Redeploy from Git**
   ```bash
   cd FRENDE/frontend
   git pull origin main
   npm install
   npm run build
   ```

2. **Update Environment Variables**
   ```bash
   cp env.production .env
   # Update API URLs and other settings
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

#### Backend Recovery
1. **Redeploy Application**
   ```bash
   cd FRENDE/backend
   git pull origin main
   pip install -r requirements.txt
   ```

2. **Run Database Migrations**
   ```bash
   alembic upgrade head
   ```

3. **Restart Services**
   ```bash
   sudo systemctl restart frende-backend
   ```

### Full System Recovery

#### Complete Disaster Recovery
1. **Infrastructure Recovery**
   - Provision new servers/containers
   - Configure networking and security
   - Install required software

2. **Database Recovery**
   - Restore from latest backup
   - Verify data integrity
   - Run health checks

3. **Application Recovery**
   - Deploy application code
   - Configure environment variables
   - Start services

4. **File Recovery**
   - Restore user uploads
   - Verify file integrity
   - Update file permissions

5. **DNS and SSL**
   - Update DNS records
   - Configure SSL certificates
   - Test connectivity

## Business Continuity

### Recovery Time Objectives (RTO)
- **Critical Systems**: 30 minutes
- **Database**: 15 minutes
- **Application**: 10 minutes
- **Full System**: 60 minutes

### Recovery Point Objectives (RPO)
- **Database**: 1 hour (point-in-time recovery)
- **Files**: 24 hours
- **Configuration**: 1 hour

### High Availability Setup
- **Database**: PostgreSQL with streaming replication
- **Redis**: Master-slave replication
- **Application**: Load balancer with multiple instances
- **Storage**: S3 with cross-region replication

## Monitoring and Alerting

### Backup Monitoring
```bash
# Check backup health
python scripts/monitoring/backup_monitor.py --health

# Generate monitoring report
python scripts/monitoring/backup_monitor.py --report

# Record backup attempt
python scripts/monitoring/backup_monitor.py --record-backup database --success --duration 300
```

### Health Checks
- **Database Connectivity**: Every 5 minutes
- **Backup Success**: After each backup
- **Application Health**: Every 2 minutes
- **SSL Certificate**: Daily

### Alert Channels
- **Email**: admin@frende.com
- **Slack**: #backup-alerts
- **SMS**: Emergency contacts
- **PagerDuty**: Critical alerts

## Testing Procedures

### Monthly Recovery Tests
1. **Database Recovery Test**
   ```bash
   python scripts/recovery/database_recovery.py --test
   ```

2. **File Recovery Test**
   ```bash
   python scripts/backup/file_backup.py --restore test-backup.tar.gz --restore-dir ./test-restore
   ```

3. **Application Recovery Test**
   - Deploy to staging environment
   - Test all functionality
   - Verify data integrity

### Quarterly Disaster Recovery Drills
1. **Full System Recovery**
   - Simulate complete system failure
   - Execute recovery procedures
   - Measure recovery times
   - Document lessons learned

2. **Communication Test**
   - Test alert systems
   - Verify contact procedures
   - Practice escalation protocols

## Emergency Contacts

### Primary Contacts
- **System Administrator**: admin@frende.com
- **Database Administrator**: dba@frende.com
- **DevOps Engineer**: devops@frende.com

### Escalation Contacts
- **CTO**: cto@frende.com
- **CEO**: ceo@frende.com

### External Contacts
- **AWS Support**: Premium support plan
- **Vercel Support**: Pro plan support
- **SSL Certificate Provider**: Let's Encrypt

## Compliance and Documentation

### Data Protection
- **Encryption**: All backups encrypted at rest and in transit
- **Access Control**: Role-based access to backup systems
- **Audit Logging**: All backup operations logged
- **Retention**: 30-day retention policy

### Documentation Requirements
- **Incident Reports**: Document all recovery incidents
- **Test Results**: Record all recovery test results
- **Procedure Updates**: Update procedures after incidents
- **Training Records**: Track team training on recovery procedures

### Regulatory Compliance
- **GDPR**: Data protection and right to be forgotten
- **SOC 2**: Security and availability controls
- **ISO 27001**: Information security management

## Automated Recovery Scripts

### Recovery Orchestration
```bash
#!/bin/bash
# full-system-recovery.sh

echo "Starting full system recovery..."

# 1. Database recovery
echo "Recovering database..."
python scripts/recovery/database_recovery.py --latest

# 2. File recovery
echo "Recovering files..."
python scripts/backup/file_backup.py --restore latest-backup.tar.gz --restore-dir ./restored

# 3. Application restart
echo "Restarting application..."
sudo systemctl restart frende-backend
sudo systemctl restart frende-frontend

# 4. Health checks
echo "Running health checks..."
python scripts/monitoring/backup_monitor.py --health

echo "Recovery completed!"
```

### Scheduled Backup Monitoring
```bash
#!/bin/bash
# backup-monitor-cron.sh

# Check backup health
python scripts/monitoring/backup_monitor.py --health

# Generate daily report
python scripts/monitoring/backup_monitor.py --report > /var/log/frende/backup-report-$(date +%Y%m%d).txt

# Clean up old monitoring data
python scripts/monitoring/backup_monitor.py --clear-old 30
```

## Troubleshooting

### Common Issues

#### Backup Failures
1. **S3 Access Issues**
   - Check AWS credentials
   - Verify bucket permissions
   - Test S3 connectivity

2. **Database Connection Issues**
   - Check database status
   - Verify connection parameters
   - Test network connectivity

3. **Encryption Issues**
   - Verify encryption key
   - Check key permissions
   - Test encryption/decryption

#### Recovery Failures
1. **Database Restoration Issues**
   - Check backup file integrity
   - Verify database permissions
   - Review error logs

2. **Application Startup Issues**
   - Check environment variables
   - Verify service configuration
   - Review application logs

### Emergency Procedures

#### Critical System Failure
1. **Immediate Actions**
   - Assess impact and scope
   - Activate emergency contacts
   - Begin recovery procedures

2. **Communication**
   - Notify stakeholders
   - Update status page
   - Provide regular updates

3. **Recovery**
   - Execute recovery procedures
   - Verify system functionality
   - Document incident details

#### Data Loss Incident
1. **Assessment**
   - Determine data loss scope
   - Identify affected systems
   - Assess business impact

2. **Recovery**
   - Restore from latest backup
   - Verify data integrity
   - Test system functionality

3. **Investigation**
   - Root cause analysis
   - Implement preventive measures
   - Update procedures

## Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review backup logs and success rates
- **Monthly**: Test recovery procedures
- **Quarterly**: Update disaster recovery plan
- **Annually**: Full disaster recovery drill

### Backup System Maintenance
- **Daily**: Monitor backup success/failure
- **Weekly**: Clean up old backup files
- **Monthly**: Test backup restoration
- **Quarterly**: Review backup retention policies

### Documentation Maintenance
- **Monthly**: Update procedures based on lessons learned
- **Quarterly**: Review and update emergency contacts
- **Annually**: Comprehensive plan review and update

---

**Last Updated**: January 2024
**Version**: 1.0
**Next Review**: February 2024

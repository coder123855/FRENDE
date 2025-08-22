#!/usr/bin/env python3
"""
Backup Monitoring Script for Frende Application

This script monitors backup health and provides:
- Backup success/failure tracking
- Health check monitoring
- Alert notifications
- Performance metrics
- Recovery time objectives (RTO) tracking
"""

import os
import sys
import logging
import json
import time
import smtplib
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
import argparse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Add the backend directory to the path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "FRENDE" / "backend"))

from core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/frende/backup_monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class BackupMonitor:
    """Monitors backup health and sends alerts."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self.monitoring_data_file = Path("/var/log/frende/backup_monitoring.json")
        self.monitoring_data = self._load_monitoring_data()
        
    def _load_monitoring_data(self) -> Dict[str, Any]:
        """Load monitoring data from file."""
        if self.monitoring_data_file.exists():
            try:
                with open(self.monitoring_data_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load monitoring data: {e}")
        
        return {
            'backups': {},
            'alerts': [],
            'health_checks': {},
            'metrics': {
                'total_backups': 0,
                'successful_backups': 0,
                'failed_backups': 0,
                'last_backup_time': None,
                'average_backup_duration': 0,
                'recovery_time_objective': 1800,  # 30 minutes in seconds
                'recovery_point_objective': 3600   # 1 hour in seconds
            }
        }
    
    def _save_monitoring_data(self):
        """Save monitoring data to file."""
        try:
            self.monitoring_data_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.monitoring_data_file, 'w') as f:
                json.dump(self.monitoring_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save monitoring data: {e}")
    
    def record_backup_attempt(self, backup_type: str, success: bool, duration: float = None, 
                            error_message: str = None, backup_size: int = None):
        """Record a backup attempt."""
        timestamp = datetime.now().isoformat()
        
        backup_record = {
            'timestamp': timestamp,
            'type': backup_type,
            'success': success,
            'duration': duration,
            'error_message': error_message,
            'backup_size': backup_size
        }
        
        # Store in backups history
        if backup_type not in self.monitoring_data['backups']:
            self.monitoring_data['backups'][backup_type] = []
        
        self.monitoring_data['backups'][backup_type].append(backup_record)
        
        # Keep only last 100 records per type
        if len(self.monitoring_data['backups'][backup_type]) > 100:
            self.monitoring_data['backups'][backup_type] = \
                self.monitoring_data['backups'][backup_type][-100:]
        
        # Update metrics
        self.monitoring_data['metrics']['total_backups'] += 1
        if success:
            self.monitoring_data['metrics']['successful_backups'] += 1
        else:
            self.monitoring_data['metrics']['failed_backups'] += 1
        
        self.monitoring_data['metrics']['last_backup_time'] = timestamp
        
        # Update average duration
        if duration:
            successful_backups = [b for b in self.monitoring_data['backups'][backup_type] 
                                if b['success'] and b['duration']]
            if successful_backups:
                avg_duration = sum(b['duration'] for b in successful_backups) / len(successful_backups)
                self.monitoring_data['metrics']['average_backup_duration'] = avg_duration
        
        # Save data
        self._save_monitoring_data()
        
        # Check for alerts
        if not success:
            self._create_alert(f"Backup failed: {backup_type}", error_message or "Unknown error")
        
        logger.info(f"Recorded {backup_type} backup: {'SUCCESS' if success else 'FAILED'}")
    
    def record_health_check(self, check_type: str, success: bool, details: str = None):
        """Record a health check result."""
        timestamp = datetime.now().isoformat()
        
        health_record = {
            'timestamp': timestamp,
            'type': check_type,
            'success': success,
            'details': details
        }
        
        if check_type not in self.monitoring_data['health_checks']:
            self.monitoring_data['health_checks'][check_type] = []
        
        self.monitoring_data['health_checks'][check_type].append(health_record)
        
        # Keep only last 50 records per type
        if len(self.monitoring_data['health_checks'][check_type]) > 50:
            self.monitoring_data['health_checks'][check_type] = \
                self.monitoring_data['health_checks'][check_type][-50:]
        
        # Save data
        self._save_monitoring_data()
        
        # Check for alerts
        if not success:
            self._create_alert(f"Health check failed: {check_type}", details or "Unknown issue")
        
        logger.info(f"Recorded health check {check_type}: {'PASS' if success else 'FAIL'}")
    
    def _create_alert(self, title: str, message: str, severity: str = "warning"):
        """Create an alert."""
        timestamp = datetime.now().isoformat()
        
        alert = {
            'timestamp': timestamp,
            'title': title,
            'message': message,
            'severity': severity,
            'acknowledged': False
        }
        
        self.monitoring_data['alerts'].append(alert)
        
        # Keep only last 100 alerts
        if len(self.monitoring_data['alerts']) > 100:
            self.monitoring_data['alerts'] = self.monitoring_data['alerts'][-100:]
        
        # Save data
        self._save_monitoring_data()
        
        # Send notifications
        self._send_notifications(alert)
        
        logger.warning(f"Alert created: {title} - {message}")
    
    def _send_notifications(self, alert: Dict[str, Any]):
        """Send alert notifications via email and Slack."""
        # Send email notification
        if self.settings.RECOVERY_NOTIFICATION_EMAIL:
            self._send_email_notification(alert)
        
        # Send Slack notification
        if self.settings.RECOVERY_NOTIFICATION_SLACK:
            self._send_slack_notification(alert)
    
    def _send_email_notification(self, alert: Dict[str, Any]):
        """Send email notification."""
        try:
            # This is a simplified email implementation
            # In production, you'd use a proper email service
            logger.info(f"Email notification would be sent for: {alert['title']}")
            
            # Example implementation:
            # msg = MIMEMultipart()
            # msg['From'] = 'backup-monitor@frende.com'
            # msg['To'] = self.settings.RECOVERY_NOTIFICATION_EMAIL
            # msg['Subject'] = f"Backup Alert: {alert['title']}"
            # 
            # body = f"""
            # Alert: {alert['title']}
            # Message: {alert['message']}
            # Severity: {alert['severity']}
            # Time: {alert['timestamp']}
            # """
            # msg.attach(MIMEText(body, 'plain'))
            # 
            # # Send email using SMTP
            # server = smtplib.SMTP('smtp.gmail.com', 587)
            # server.starttls()
            # server.login('username', 'password')
            # server.send_message(msg)
            # server.quit()
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    def _send_slack_notification(self, alert: Dict[str, Any]):
        """Send Slack notification."""
        try:
            # This is a simplified Slack implementation
            # In production, you'd use the slack_sdk
            logger.info(f"Slack notification would be sent for: {alert['title']}")
            
            # Example implementation:
            # payload = {
            #     "text": f"🚨 Backup Alert: {alert['title']}\n{alert['message']}\nSeverity: {alert['severity']}"
            # }
            # 
            # response = requests.post(
            #     self.settings.RECOVERY_NOTIFICATION_SLACK,
            #     json=payload,
            #     headers={'Content-Type': 'application/json'}
            # )
            # 
            # if response.status_code != 200:
            #     logger.error(f"Failed to send Slack notification: {response.text}")
            
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
    
    def check_backup_health(self) -> Dict[str, Any]:
        """Check overall backup health."""
        health_status = {
            'overall_status': 'healthy',
            'issues': [],
            'recommendations': []
        }
        
        # Check if backups are running regularly
        last_backup_time = self.monitoring_data['metrics']['last_backup_time']
        if last_backup_time:
            last_backup = datetime.fromisoformat(last_backup_time)
            time_since_backup = datetime.now() - last_backup
            
            # Alert if no backup in 24 hours
            if time_since_backup > timedelta(hours=24):
                health_status['overall_status'] = 'warning'
                health_status['issues'].append("No backup in last 24 hours")
                health_status['recommendations'].append("Check backup schedule and automation")
        
        # Check success rate
        total_backups = self.monitoring_data['metrics']['total_backups']
        successful_backups = self.monitoring_data['metrics']['successful_backups']
        
        if total_backups > 0:
            success_rate = (successful_backups / total_backups) * 100
            
            if success_rate < 90:
                health_status['overall_status'] = 'critical'
                health_status['issues'].append(f"Low backup success rate: {success_rate:.1f}%")
                health_status['recommendations'].append("Investigate recent backup failures")
            elif success_rate < 95:
                health_status['overall_status'] = 'warning'
                health_status['issues'].append(f"Backup success rate below target: {success_rate:.1f}%")
                health_status['recommendations'].append("Monitor backup processes")
        
        # Check for recent failures
        recent_failures = []
        for backup_type, backups in self.monitoring_data['backups'].items():
            recent_backups = [b for b in backups if 
                            datetime.fromisoformat(b['timestamp']) > datetime.now() - timedelta(hours=24)]
            
            for backup in recent_backups:
                if not backup['success']:
                    recent_failures.append(f"{backup_type}: {backup['error_message']}")
        
        if recent_failures:
            health_status['overall_status'] = 'critical'
            health_status['issues'].extend(recent_failures)
            health_status['recommendations'].append("Review and fix backup failures")
        
        # Check unacknowledged alerts
        unacknowledged_alerts = [a for a in self.monitoring_data['alerts'] if not a['acknowledged']]
        if unacknowledged_alerts:
            health_status['issues'].append(f"{len(unacknowledged_alerts)} unacknowledged alerts")
            health_status['recommendations'].append("Review and acknowledge alerts")
        
        return health_status
    
    def get_backup_metrics(self) -> Dict[str, Any]:
        """Get backup performance metrics."""
        metrics = self.monitoring_data['metrics'].copy()
        
        # Calculate additional metrics
        if metrics['total_backups'] > 0:
            metrics['success_rate'] = (metrics['successful_backups'] / metrics['total_backups']) * 100
        else:
            metrics['success_rate'] = 0
        
        # Get recent backup statistics
        recent_backups = []
        for backup_type, backups in self.monitoring_data['backups'].items():
            recent = [b for b in backups if 
                     datetime.fromisoformat(b['timestamp']) > datetime.now() - timedelta(days=7)]
            
            if recent:
                recent_backups.append({
                    'type': backup_type,
                    'count': len(recent),
                    'success_count': len([b for b in recent if b['success']]),
                    'avg_duration': sum(b['duration'] or 0 for b in recent) / len(recent) if recent else 0
                })
        
        metrics['recent_backups'] = recent_backups
        
        return metrics
    
    def acknowledge_alert(self, alert_index: int):
        """Acknowledge an alert."""
        if 0 <= alert_index < len(self.monitoring_data['alerts']):
            self.monitoring_data['alerts'][alert_index]['acknowledged'] = True
            self._save_monitoring_data()
            logger.info(f"Alert {alert_index} acknowledged")
        else:
            logger.error(f"Invalid alert index: {alert_index}")
    
    def clear_old_data(self, days: int = 30):
        """Clear old monitoring data."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Clear old backups
        for backup_type in self.monitoring_data['backups']:
            self.monitoring_data['backups'][backup_type] = [
                b for b in self.monitoring_data['backups'][backup_type]
                if datetime.fromisoformat(b['timestamp']) > cutoff_date
            ]
        
        # Clear old health checks
        for check_type in self.monitoring_data['health_checks']:
            self.monitoring_data['health_checks'][check_type] = [
                h for h in self.monitoring_data['health_checks'][check_type]
                if datetime.fromisoformat(h['timestamp']) > cutoff_date
            ]
        
        # Clear old alerts
        self.monitoring_data['alerts'] = [
            a for a in self.monitoring_data['alerts']
            if datetime.fromisoformat(a['timestamp']) > cutoff_date
        ]
        
        self._save_monitoring_data()
        logger.info(f"Cleared monitoring data older than {days} days")
    
    def generate_report(self) -> str:
        """Generate a backup monitoring report."""
        health = self.check_backup_health()
        metrics = self.get_backup_metrics()
        
        report = f"""
Backup Monitoring Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Overall Status: {health['overall_status'].upper()}

Metrics:
- Total Backups: {metrics['total_backups']}
- Successful: {metrics['successful_backups']}
- Failed: {metrics['failed_backups']}
- Success Rate: {metrics.get('success_rate', 0):.1f}%
- Average Duration: {metrics['average_backup_duration']:.1f}s
- Last Backup: {metrics['last_backup_time'] or 'Never'}

Recent Backups (7 days):
"""
        
        for backup in metrics.get('recent_backups', []):
            report += f"- {backup['type']}: {backup['success_count']}/{backup['count']} successful, {backup['avg_duration']:.1f}s avg\n"
        
        if health['issues']:
            report += "\nIssues:\n"
            for issue in health['issues']:
                report += f"- {issue}\n"
        
        if health['recommendations']:
            report += "\nRecommendations:\n"
            for rec in health['recommendations']:
                report += f"- {rec}\n"
        
        # Recent alerts
        recent_alerts = [a for a in self.monitoring_data['alerts'] 
                        if datetime.fromisoformat(a['timestamp']) > datetime.now() - timedelta(days=7)]
        
        if recent_alerts:
            report += f"\nRecent Alerts ({len(recent_alerts)}):\n"
            for alert in recent_alerts[-5:]:  # Show last 5
                status = "ACK" if alert['acknowledged'] else "NEW"
                report += f"- [{status}] {alert['title']} ({alert['severity']})\n"
        
        return report


def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='Backup Monitor')
    parser.add_argument('--health', action='store_true', help='Check backup health')
    parser.add_argument('--metrics', action='store_true', help='Show backup metrics')
    parser.add_argument('--report', action='store_true', help='Generate monitoring report')
    parser.add_argument('--record-backup', metavar='TYPE', help='Record a backup attempt')
    parser.add_argument('--success', action='store_true', help='Mark backup as successful')
    parser.add_argument('--duration', type=float, help='Backup duration in seconds')
    parser.add_argument('--error', metavar='MESSAGE', help='Error message for failed backup')
    parser.add_argument('--record-health', metavar='TYPE', help='Record a health check')
    parser.add_argument('--health-success', action='store_true', help='Mark health check as successful')
    parser.add_argument('--health-details', metavar='DETAILS', help='Health check details')
    parser.add_argument('--acknowledge', type=int, metavar='INDEX', help='Acknowledge alert by index')
    parser.add_argument('--clear-old', type=int, metavar='DAYS', help='Clear data older than N days')
    
    args = parser.parse_args()
    
    monitor = BackupMonitor()
    
    if args.health:
        health = monitor.check_backup_health()
        print(json.dumps(health, indent=2))
    
    elif args.metrics:
        metrics = monitor.get_backup_metrics()
        print(json.dumps(metrics, indent=2))
    
    elif args.report:
        report = monitor.generate_report()
        print(report)
    
    elif args.record_backup:
        monitor.record_backup_attempt(
            backup_type=args.record_backup,
            success=args.success,
            duration=args.duration,
            error_message=args.error
        )
        print(f"✅ Recorded {args.record_backup} backup")
    
    elif args.record_health:
        monitor.record_health_check(
            check_type=args.record_health,
            success=args.health_success,
            details=args.health_details
        )
        print(f"✅ Recorded {args.record_health} health check")
    
    elif args.acknowledge is not None:
        monitor.acknowledge_alert(args.acknowledge)
        print(f"✅ Alert {args.acknowledge} acknowledged")
    
    elif args.clear_old is not None:
        monitor.clear_old_data(args.clear_old)
        print(f"✅ Cleared data older than {args.clear_old} days")
    
    else:
        # Default: show health
        health = monitor.check_backup_health()
        print(f"Backup Health Status: {health['overall_status'].upper()}")
        if health['issues']:
            print("Issues:")
            for issue in health['issues']:
                print(f"  - {issue}")


if __name__ == "__main__":
    main()

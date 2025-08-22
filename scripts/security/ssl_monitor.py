#!/usr/bin/env python3
"""
SSL Certificate Monitoring Script

This script monitors SSL certificates for the Frende application
and sends alerts when certificates are about to expire.
"""

import ssl
import socket
import smtplib
import requests
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import os
import sys
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ssl_monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class SSLCertificateMonitor:
    """Monitor SSL certificates for multiple domains."""
    
    def __init__(self, config_file: str = "ssl_config.json"):
        """
        Initialize the SSL monitor.
        
        Args:
            config_file: Path to configuration file
        """
        self.config = self._load_config(config_file)
        self.domains = self.config.get("domains", [])
        self.alert_threshold_days = self.config.get("alert_threshold_days", 30)
        self.email_config = self.config.get("email", {})
        self.slack_webhook = self.config.get("slack_webhook")
        
    def _load_config(self, config_file: str) -> Dict:
        """Load configuration from JSON file."""
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {config_file} not found, using defaults")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Get default configuration."""
        return {
            "domains": [
                {
                    "name": "frende.app",
                    "port": 443,
                    "description": "Main frontend domain"
                },
                {
                    "name": "api.frende.app",
                    "port": 443,
                    "description": "Main API domain"
                },
                {
                    "name": "staging.frende.app",
                    "port": 443,
                    "description": "Staging frontend domain"
                },
                {
                    "name": "api-staging.frende.app",
                    "port": 443,
                    "description": "Staging API domain"
                }
            ],
            "alert_threshold_days": 30,
            "email": {
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "username": "alerts@frende.app",
                "password": "your_password_here",
                "from_email": "alerts@frende.app",
                "to_emails": ["admin@frende.app"]
            },
            "slack_webhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        }
    
    def get_certificate_info(self, domain: str, port: int = 443) -> Optional[Dict]:
        """
        Get SSL certificate information for a domain.
        
        Args:
            domain: Domain name
            port: Port number (default: 443)
            
        Returns:
            Certificate information dictionary or None if error
        """
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    
                    # Parse certificate dates
                    not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    not_before = datetime.strptime(cert['notBefore'], '%b %d %H:%M:%S %Y %Z')
                    
                    return {
                        "domain": domain,
                        "port": port,
                        "subject": dict(x[0] for x in cert['subject']),
                        "issuer": dict(x[0] for x in cert['issuer']),
                        "not_before": not_before,
                        "not_after": not_after,
                        "serial_number": cert['serialNumber'],
                        "version": cert['version'],
                        "days_until_expiry": (not_after - datetime.now()).days,
                        "is_valid": not_after > datetime.now(),
                        "is_expiring_soon": (not_after - datetime.now()).days <= self.alert_threshold_days
                    }
                    
        except socket.gaierror as e:
            logger.error(f"DNS resolution failed for {domain}: {e}")
            return None
        except socket.timeout as e:
            logger.error(f"Connection timeout for {domain}: {e}")
            return None
        except ssl.SSLError as e:
            logger.error(f"SSL error for {domain}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error checking {domain}: {e}")
            return None
    
    def check_all_certificates(self) -> List[Dict]:
        """
        Check SSL certificates for all configured domains.
        
        Returns:
            List of certificate information dictionaries
        """
        results = []
        
        for domain_config in self.domains:
            domain = domain_config["name"]
            port = domain_config.get("port", 443)
            description = domain_config.get("description", "")
            
            logger.info(f"Checking certificate for {domain}:{port} ({description})")
            
            cert_info = self.get_certificate_info(domain, port)
            if cert_info:
                cert_info["description"] = description
                results.append(cert_info)
                
                if cert_info["is_expiring_soon"]:
                    logger.warning(
                        f"Certificate for {domain} expires in {cert_info['days_until_expiry']} days"
                    )
                elif not cert_info["is_valid"]:
                    logger.error(f"Certificate for {domain} has expired!")
                else:
                    logger.info(
                        f"Certificate for {domain} is valid for {cert_info['days_until_expiry']} more days"
                    )
            else:
                logger.error(f"Failed to get certificate info for {domain}")
        
        return results
    
    def send_email_alert(self, expiring_certs: List[Dict]) -> bool:
        """
        Send email alert for expiring certificates.
        
        Args:
            expiring_certs: List of expiring certificate information
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.email_config or not expiring_certs:
            return False
        
        try:
            # Create email content
            subject = f"SSL Certificate Alert - {len(expiring_certs)} certificates expiring soon"
            
            body = "The following SSL certificates are expiring soon:\n\n"
            for cert in expiring_certs:
                body += f"Domain: {cert['domain']}\n"
                body += f"Description: {cert.get('description', 'N/A')}\n"
                body += f"Expires: {cert['not_after'].strftime('%Y-%m-%d %H:%M:%S')}\n"
                body += f"Days until expiry: {cert['days_until_expiry']}\n"
                body += f"Issuer: {cert['issuer'].get('commonName', 'N/A')}\n"
                body += "-" * 50 + "\n\n"
            
            body += "\nPlease renew these certificates before they expire."
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.email_config['from_email']
            msg['To'] = ", ".join(self.email_config['to_emails'])
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            with smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port']) as server:
                server.starttls()
                server.login(self.email_config['username'], self.email_config['password'])
                server.send_message(msg)
            
            logger.info(f"Email alert sent for {len(expiring_certs)} expiring certificates")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    def send_slack_alert(self, expiring_certs: List[Dict]) -> bool:
        """
        Send Slack alert for expiring certificates.
        
        Args:
            expiring_certs: List of expiring certificate information
            
        Returns:
            True if Slack message sent successfully, False otherwise
        """
        if not self.slack_webhook or not expiring_certs:
            return False
        
        try:
            # Create Slack message
            blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🚨 SSL Certificate Alert - {len(expiring_certs)} certificates expiring soon"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "The following SSL certificates need to be renewed:"
                    }
                }
            ]
            
            for cert in expiring_certs:
                blocks.append({
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Domain:*\n{cert['domain']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Days until expiry:*\n{cert['days_until_expiry']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Expires:*\n{cert['not_after'].strftime('%Y-%m-%d')}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Description:*\n{cert.get('description', 'N/A')}"
                        }
                    ]
                })
            
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Please renew these certificates before they expire to avoid service disruption."
                }
            })
            
            payload = {"blocks": blocks}
            
            response = requests.post(self.slack_webhook, json=payload, timeout=10)
            response.raise_for_status()
            
            logger.info(f"Slack alert sent for {len(expiring_certs)} expiring certificates")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            return False
    
    def run_monitoring(self) -> Dict:
        """
        Run the complete SSL certificate monitoring process.
        
        Returns:
            Dictionary with monitoring results
        """
        logger.info("Starting SSL certificate monitoring...")
        
        # Check all certificates
        all_certs = self.check_all_certificates()
        expiring_certs = [cert for cert in all_certs if cert["is_expiring_soon"]]
        expired_certs = [cert for cert in all_certs if not cert["is_valid"]]
        
        # Send alerts if needed
        alerts_sent = 0
        if expiring_certs:
            if self.send_email_alert(expiring_certs):
                alerts_sent += 1
            if self.send_slack_alert(expiring_certs):
                alerts_sent += 1
        
        # Prepare results
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_domains": len(self.domains),
            "successful_checks": len(all_certs),
            "failed_checks": len(self.domains) - len(all_certs),
            "expiring_certs": len(expiring_certs),
            "expired_certs": len(expired_certs),
            "alerts_sent": alerts_sent,
            "certificates": all_certs
        }
        
        logger.info(f"SSL monitoring completed: {results['successful_checks']}/{results['total_domains']} successful, "
                   f"{results['expiring_certs']} expiring, {results['expired_certs']} expired")
        
        return results


def main():
    """Main function to run SSL certificate monitoring."""
    import argparse
    
    parser = argparse.ArgumentParser(description="SSL Certificate Monitor")
    parser.add_argument("--config", default="ssl_config.json", help="Configuration file path")
    parser.add_argument("--output", help="Output results to JSON file")
    parser.add_argument("--check-only", action="store_true", help="Only check certificates, don't send alerts")
    
    args = parser.parse_args()
    
    # Create monitor instance
    monitor = SSLCertificateMonitor(args.config)
    
    # Run monitoring
    results = monitor.run_monitoring()
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        logger.info(f"Results saved to {args.output}")
    
    # Exit with error code if there are expired certificates
    if results["expired_certs"] > 0:
        logger.error(f"Found {results['expired_certs']} expired certificates!")
        sys.exit(1)
    
    logger.info("SSL certificate monitoring completed successfully")


if __name__ == "__main__":
    main()

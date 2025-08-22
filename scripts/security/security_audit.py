#!/usr/bin/env python3
"""
Security Audit Script for Frende Application

This script performs comprehensive security audits including:
- Security headers validation
- SSL/TLS configuration checks
- API endpoint security testing
- Dependency vulnerability scanning
- Configuration security validation
"""

import requests
import json
import subprocess
import sys
import os
import ssl
import socket
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
import argparse
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('security_audit.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class SecurityAuditor:
    """Comprehensive security auditor for the Frende application."""
    
    def __init__(self, config_file: str = "security_audit_config.json"):
        """
        Initialize the security auditor.
        
        Args:
            config_file: Path to configuration file
        """
        self.config = self._load_config(config_file)
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "overall_score": 0,
            "checks": {},
            "recommendations": []
        }
    
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
                    "description": "Main frontend domain"
                },
                {
                    "name": "api.frende.app",
                    "description": "Main API domain"
                },
                {
                    "name": "staging.frende.app",
                    "description": "Staging frontend domain"
                },
                {
                    "name": "api-staging.frende.app",
                    "description": "Staging API domain"
                }
            ],
            "security_headers": {
                "required": [
                    "Strict-Transport-Security",
                    "Content-Security-Policy",
                    "X-Frame-Options",
                    "X-Content-Type-Options",
                    "X-XSS-Protection",
                    "Referrer-Policy",
                    "Permissions-Policy"
                ],
                "recommended": [
                    "X-Permitted-Cross-Domain-Policies",
                    "X-Download-Options",
                    "X-DNS-Prefetch-Control"
                ]
            },
            "ssl_checks": {
                "min_tls_version": "TLSv1.2",
                "preferred_ciphers": [
                    "TLS_AES_256_GCM_SHA384",
                    "TLS_CHACHA20_POLY1305_SHA256",
                    "TLS_AES_128_GCM_SHA256"
                ]
            },
            "api_endpoints": [
                "/api/auth/login",
                "/api/auth/register",
                "/api/users/me",
                "/api/matches/",
                "/api/chat/",
                "/api/tasks/"
            ]
        }
    
    def check_security_headers(self, domain: str) -> Dict:
        """
        Check security headers for a domain.
        
        Args:
            domain: Domain to check
            
        Returns:
            Dictionary with security header check results
        """
        logger.info(f"Checking security headers for {domain}")
        
        try:
            url = f"https://{domain}"
            response = requests.get(url, timeout=10, allow_redirects=True)
            
            headers = response.headers
            required_headers = self.config["security_headers"]["required"]
            recommended_headers = self.config["security_headers"]["recommended"]
            
            results = {
                "domain": domain,
                "status_code": response.status_code,
                "required_headers": {},
                "recommended_headers": {},
                "missing_required": [],
                "missing_recommended": [],
                "score": 0
            }
            
            # Check required headers
            for header in required_headers:
                if header in headers:
                    results["required_headers"][header] = headers[header]
                else:
                    results["missing_required"].append(header)
            
            # Check recommended headers
            for header in recommended_headers:
                if header in headers:
                    results["recommended_headers"][header] = headers[header]
                else:
                    results["missing_recommended"].append(header)
            
            # Calculate score
            total_required = len(required_headers)
            present_required = total_required - len(results["missing_required"])
            results["score"] = (present_required / total_required) * 100
            
            # Add recommendations
            if results["missing_required"]:
                results["recommendations"] = [
                    f"Add missing required security headers: {', '.join(results['missing_required'])}"
                ]
            
            if results["missing_recommended"]:
                results["recommendations"].append(
                    f"Consider adding recommended headers: {', '.join(results['missing_recommended'])}"
                )
            
            return results
            
        except requests.RequestException as e:
            logger.error(f"Failed to check security headers for {domain}: {e}")
            return {
                "domain": domain,
                "error": str(e),
                "score": 0,
                "recommendations": ["Fix connectivity issues to perform security header checks"]
            }
    
    def check_ssl_configuration(self, domain: str) -> Dict:
        """
        Check SSL/TLS configuration for a domain.
        
        Args:
            domain: Domain to check
            
        Returns:
            Dictionary with SSL configuration check results
        """
        logger.info(f"Checking SSL configuration for {domain}")
        
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    version = ssock.version()
                    
                    results = {
                        "domain": domain,
                        "certificate": {
                            "subject": dict(x[0] for x in cert['subject']),
                            "issuer": dict(x[0] for x in cert['issuer']),
                            "not_after": cert['notAfter'],
                            "serial_number": cert['serialNumber']
                        },
                        "tls_version": version,
                        "cipher_suite": cipher[0],
                        "cipher_bits": cipher[2],
                        "score": 100,
                        "issues": [],
                        "recommendations": []
                    }
                    
                    # Check TLS version
                    if version < "TLSv1.2":
                        results["issues"].append(f"TLS version {version} is too old")
                        results["score"] -= 30
                        results["recommendations"].append("Upgrade to TLS 1.2 or higher")
                    
                    # Check cipher strength
                    if cipher[2] < 128:
                        results["issues"].append(f"Cipher strength {cipher[2]} bits is too weak")
                        results["score"] -= 20
                        results["recommendations"].append("Use stronger cipher suites (256-bit)")
                    
                    # Check certificate expiration
                    from datetime import datetime
                    not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_until_expiry = (not_after - datetime.now()).days
                    
                    if days_until_expiry < 30:
                        results["issues"].append(f"Certificate expires in {days_until_expiry} days")
                        results["score"] -= 10
                        results["recommendations"].append("Renew SSL certificate soon")
                    
                    results["score"] = max(0, results["score"])
                    
                    return results
                    
        except Exception as e:
            logger.error(f"Failed to check SSL configuration for {domain}: {e}")
            return {
                "domain": domain,
                "error": str(e),
                "score": 0,
                "recommendations": ["Fix SSL connectivity issues"]
            }
    
    def check_api_security(self, domain: str) -> Dict:
        """
        Check API endpoint security.
        
        Args:
            domain: API domain to check
            
        Returns:
            Dictionary with API security check results
        """
        logger.info(f"Checking API security for {domain}")
        
        results = {
            "domain": domain,
            "endpoints": {},
            "overall_score": 0,
            "issues": [],
            "recommendations": []
        }
        
        api_endpoints = self.config["api_endpoints"]
        
        for endpoint in api_endpoints:
            try:
                url = f"https://{domain}{endpoint}"
                
                # Test with different methods
                methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
                endpoint_results = {}
                
                for method in methods:
                    try:
                        response = requests.request(
                            method, url, timeout=5, allow_redirects=False
                        )
                        endpoint_results[method] = {
                            "status_code": response.status_code,
                            "headers": dict(response.headers)
                        }
                    except requests.RequestException:
                        endpoint_results[method] = {"error": "Connection failed"}
                
                results["endpoints"][endpoint] = endpoint_results
                
                # Analyze security
                if "OPTIONS" in endpoint_results:
                    cors_headers = endpoint_results["OPTIONS"].get("headers", {})
                    if "access-control-allow-origin" in cors_headers:
                        origin = cors_headers["access-control-allow-origin"]
                        if origin == "*":
                            results["issues"].append(f"CORS too permissive for {endpoint}")
                            results["recommendations"].append(f"Restrict CORS for {endpoint}")
                
                # Check for sensitive data exposure
                if "GET" in endpoint_results:
                    status = endpoint_results["GET"]["status_code"]
                    if status == 200 and "users" in endpoint:
                        results["issues"].append(f"Potential sensitive data exposure at {endpoint}")
                        results["recommendations"].append(f"Add authentication to {endpoint}")
                
            except Exception as e:
                logger.error(f"Failed to check endpoint {endpoint}: {e}")
                results["endpoints"][endpoint] = {"error": str(e)}
        
        # Calculate overall score
        total_checks = len(api_endpoints)
        issues_count = len(results["issues"])
        results["overall_score"] = max(0, 100 - (issues_count * 10))
        
        return results
    
    def check_dependencies(self) -> Dict:
        """
        Check for known vulnerabilities in dependencies.
        
        Returns:
            Dictionary with dependency check results
        """
        logger.info("Checking dependencies for vulnerabilities")
        
        results = {
            "frontend": {},
            "backend": {},
            "overall_score": 0,
            "vulnerabilities": [],
            "recommendations": []
        }
        
        try:
            # Check frontend dependencies
            if os.path.exists("FRENDE/frontend/package.json"):
                logger.info("Checking frontend dependencies")
                try:
                    # Run npm audit
                    npm_result = subprocess.run(
                        ["npm", "audit", "--json"],
                        cwd="FRENDE/frontend",
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    
                    if npm_result.returncode == 0:
                        audit_data = json.loads(npm_result.stdout)
                        results["frontend"] = {
                            "vulnerabilities": audit_data.get("vulnerabilities", {}),
                            "metadata": audit_data.get("metadata", {}),
                            "advisories": audit_data.get("advisories", {})
                        }
                        
                        # Count vulnerabilities
                        vuln_count = len(results["frontend"]["vulnerabilities"])
                        if vuln_count > 0:
                            results["vulnerabilities"].append(f"Frontend: {vuln_count} vulnerabilities found")
                            results["recommendations"].append("Run 'npm audit fix' to fix frontend vulnerabilities")
                    else:
                        results["frontend"]["error"] = "npm audit failed"
                        
                except subprocess.TimeoutExpired:
                    results["frontend"]["error"] = "npm audit timed out"
                except Exception as e:
                    results["frontend"]["error"] = str(e)
            
            # Check backend dependencies
            if os.path.exists("FRENDE/backend/requirements.txt"):
                logger.info("Checking backend dependencies")
                try:
                    # Run safety check
                    safety_result = subprocess.run(
                        ["safety", "check", "--json"],
                        cwd="FRENDE/backend",
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    
                    if safety_result.returncode == 0:
                        safety_data = json.loads(safety_result.stdout)
                        results["backend"] = safety_data
                        
                        # Count vulnerabilities
                        vuln_count = len(safety_data)
                        if vuln_count > 0:
                            results["vulnerabilities"].append(f"Backend: {vuln_count} vulnerabilities found")
                            results["recommendations"].append("Update vulnerable Python packages")
                    else:
                        results["backend"]["error"] = "safety check failed"
                        
                except subprocess.TimeoutExpired:
                    results["backend"]["error"] = "safety check timed out"
                except Exception as e:
                    results["backend"]["error"] = str(e)
            
            # Calculate overall score
            total_vulns = len(results["vulnerabilities"])
            results["overall_score"] = max(0, 100 - (total_vulns * 10))
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to check dependencies: {e}")
            return {
                "error": str(e),
                "overall_score": 0,
                "recommendations": ["Fix dependency checking issues"]
            }
    
    def run_comprehensive_audit(self) -> Dict:
        """
        Run comprehensive security audit.
        
        Returns:
            Dictionary with complete audit results
        """
        logger.info("Starting comprehensive security audit...")
        
        # Check security headers for all domains
        self.results["checks"]["security_headers"] = {}
        for domain_config in self.config["domains"]:
            domain = domain_config["name"]
            self.results["checks"]["security_headers"][domain] = self.check_security_headers(domain)
        
        # Check SSL configuration for all domains
        self.results["checks"]["ssl_configuration"] = {}
        for domain_config in self.config["domains"]:
            domain = domain_config["name"]
            self.results["checks"]["ssl_configuration"][domain] = self.check_ssl_configuration(domain)
        
        # Check API security for API domains
        self.results["checks"]["api_security"] = {}
        api_domains = [d for d in self.config["domains"] if "api" in d["name"]]
        for domain_config in api_domains:
            domain = domain_config["name"]
            self.results["checks"]["api_security"][domain] = self.check_api_security(domain)
        
        # Check dependencies
        self.results["checks"]["dependencies"] = self.check_dependencies()
        
        # Calculate overall score
        scores = []
        
        # Security headers scores
        for domain_results in self.results["checks"]["security_headers"].values():
            if "score" in domain_results:
                scores.append(domain_results["score"])
        
        # SSL configuration scores
        for domain_results in self.results["checks"]["ssl_configuration"].values():
            if "score" in domain_results:
                scores.append(domain_results["score"])
        
        # API security scores
        for domain_results in self.results["checks"]["api_security"].values():
            if "overall_score" in domain_results:
                scores.append(domain_results["overall_score"])
        
        # Dependencies score
        if "overall_score" in self.results["checks"]["dependencies"]:
            scores.append(self.results["checks"]["dependencies"]["overall_score"])
        
        # Calculate weighted average
        if scores:
            self.results["overall_score"] = sum(scores) / len(scores)
        
        # Collect all recommendations
        all_recommendations = []
        for check_type, check_results in self.results["checks"].items():
            if isinstance(check_results, dict):
                for domain, domain_results in check_results.items():
                    if isinstance(domain_results, dict) and "recommendations" in domain_results:
                        all_recommendations.extend(domain_results["recommendations"])
        
        self.results["recommendations"] = list(set(all_recommendations))
        
        logger.info(f"Security audit completed. Overall score: {self.results['overall_score']:.1f}/100")
        
        return self.results
    
    def generate_report(self, output_file: str = None) -> str:
        """
        Generate a human-readable security report.
        
        Args:
            output_file: Optional file to save the report
            
        Returns:
            Report text
        """
        report = []
        report.append("=" * 80)
        report.append("FRENDE APPLICATION SECURITY AUDIT REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {self.results['timestamp']}")
        report.append(f"Overall Security Score: {self.results['overall_score']:.1f}/100")
        report.append("")
        
        # Security Headers Section
        report.append("SECURITY HEADERS")
        report.append("-" * 40)
        for domain, results in self.results["checks"]["security_headers"].items():
            report.append(f"\nDomain: {domain}")
            if "score" in results:
                report.append(f"Score: {results['score']:.1f}/100")
                if results["missing_required"]:
                    report.append(f"Missing Required: {', '.join(results['missing_required'])}")
                if results["missing_recommended"]:
                    report.append(f"Missing Recommended: {', '.join(results['missing_recommended'])}")
            else:
                report.append(f"Error: {results.get('error', 'Unknown error')}")
        
        # SSL Configuration Section
        report.append("\n\nSSL/TLS CONFIGURATION")
        report.append("-" * 40)
        for domain, results in self.results["checks"]["ssl_configuration"].items():
            report.append(f"\nDomain: {domain}")
            if "score" in results:
                report.append(f"Score: {results['score']:.1f}/100")
                report.append(f"TLS Version: {results.get('tls_version', 'Unknown')}")
                report.append(f"Cipher Suite: {results.get('cipher_suite', 'Unknown')}")
                if results["issues"]:
                    report.append(f"Issues: {', '.join(results['issues'])}")
            else:
                report.append(f"Error: {results.get('error', 'Unknown error')}")
        
        # API Security Section
        report.append("\n\nAPI SECURITY")
        report.append("-" * 40)
        for domain, results in self.results["checks"]["api_security"].items():
            report.append(f"\nDomain: {domain}")
            if "overall_score" in results:
                report.append(f"Score: {results['overall_score']:.1f}/100")
                if results["issues"]:
                    report.append(f"Issues: {', '.join(results['issues'])}")
        
        # Dependencies Section
        report.append("\n\nDEPENDENCIES")
        report.append("-" * 40)
        deps_results = self.results["checks"]["dependencies"]
        if "overall_score" in deps_results:
            report.append(f"Score: {deps_results['overall_score']:.1f}/100")
            if deps_results["vulnerabilities"]:
                report.append("Vulnerabilities found:")
                for vuln in deps_results["vulnerabilities"]:
                    report.append(f"  - {vuln}")
        
        # Recommendations Section
        report.append("\n\nRECOMMENDATIONS")
        report.append("-" * 40)
        if self.results["recommendations"]:
            for i, rec in enumerate(self.results["recommendations"], 1):
                report.append(f"{i}. {rec}")
        else:
            report.append("No specific recommendations at this time.")
        
        report.append("\n" + "=" * 80)
        
        report_text = "\n".join(report)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(report_text)
            logger.info(f"Security report saved to {output_file}")
        
        return report_text


def main():
    """Main function to run security audit."""
    parser = argparse.ArgumentParser(description="Frende Security Auditor")
    parser.add_argument("--config", default="security_audit_config.json", help="Configuration file path")
    parser.add_argument("--output", help="Output report to file")
    parser.add_argument("--json", help="Output JSON results to file")
    
    args = parser.parse_args()
    
    # Create auditor instance
    auditor = SecurityAuditor(args.config)
    
    # Run audit
    results = auditor.run_comprehensive_audit()
    
    # Generate report
    report = auditor.generate_report(args.output)
    
    # Output JSON if requested
    if args.json:
        with open(args.json, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        logger.info(f"JSON results saved to {args.json}")
    
    # Print report
    print(report)
    
    # Exit with error code if score is too low
    if results["overall_score"] < 70:
        logger.warning("Security score is below 70. Please address the recommendations.")
        sys.exit(1)
    
    logger.info("Security audit completed successfully")


if __name__ == "__main__":
    main()

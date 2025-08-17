#!/usr/bin/env python3
"""
Cron Job Setup Script for Database Backups
This script sets up automated cron jobs for database backups and maintenance.
"""

import os
import sys
import subprocess
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CronJobSetup:
    def __init__(self):
        self.backup_script = Path(__file__).parent / "backup_database.py"
        self.setup_script = Path(__file__).parent / "setup_production_db.py"
        self.backend_dir = Path(__file__).parent.parent
        
    def check_cron_availability(self) -> bool:
        """Check if cron is available on the system"""
        try:
            result = subprocess.run(['which', 'crontab'], capture_output=True, text=True)
            return result.returncode == 0
        except Exception:
            return False
    
    def create_backup_cron_job(self) -> bool:
        """Create cron job for daily database backup"""
        try:
            # Create backup cron job
            backup_cron = f"""
# Frende Database Backup - Daily at 2 AM
0 2 * * * cd {self.backend_dir} && python scripts/backup_database.py --action backup >> /var/log/frende/backup.log 2>&1

# Frende Database Cleanup - Daily at 3 AM (remove old backups)
0 3 * * * cd {self.backend_dir} && python scripts/backup_database.py --action cleanup >> /var/log/frende/backup.log 2>&1
"""
            
            # Write to temporary file
            temp_cron_file = "/tmp/frende_backup_cron"
            with open(temp_cron_file, 'w') as f:
                f.write(backup_cron)
            
            # Install cron job
            result = subprocess.run(['crontab', temp_cron_file], capture_output=True, text=True)
            
            # Clean up temporary file
            os.unlink(temp_cron_file)
            
            if result.returncode == 0:
                logger.info("Backup cron job installed successfully")
                return True
            else:
                logger.error(f"Failed to install backup cron job: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to create backup cron job: {e}")
            return False
    
    def create_maintenance_cron_job(self) -> bool:
        """Create cron job for database maintenance tasks"""
        try:
            # Create maintenance cron job
            maintenance_cron = f"""
# Frende Database Maintenance - Weekly on Sunday at 1 AM
0 1 * * 0 cd {self.backend_dir} && python scripts/setup_production_db.py >> /var/log/frende/maintenance.log 2>&1

# Frende Log Rotation - Daily at 4 AM
0 4 * * * find /var/log/frende -name "*.log" -mtime +7 -delete >> /var/log/frende/cleanup.log 2>&1
"""
            
            # Write to temporary file
            temp_cron_file = "/tmp/frende_maintenance_cron"
            with open(temp_cron_file, 'w') as f:
                f.write(maintenance_cron)
            
            # Install cron job
            result = subprocess.run(['crontab', temp_cron_file], capture_output=True, text=True)
            
            # Clean up temporary file
            os.unlink(temp_cron_file)
            
            if result.returncode == 0:
                logger.info("Maintenance cron job installed successfully")
                return True
            else:
                logger.error(f"Failed to install maintenance cron job: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to create maintenance cron job: {e}")
            return False
    
    def create_log_directories(self) -> bool:
        """Create log directories for cron jobs"""
        try:
            log_dirs = [
                "/var/log/frende",
                "/var/backups/frende/database"
            ]
            
            for log_dir in log_dirs:
                Path(log_dir).mkdir(parents=True, exist_ok=True)
                logger.info(f"Created log directory: {log_dir}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create log directories: {e}")
            return False
    
    def list_current_cron_jobs(self) -> bool:
        """List current cron jobs"""
        try:
            result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("Current cron jobs:")
                for line in result.stdout.split('\n'):
                    if line.strip() and not line.startswith('#'):
                        logger.info(f"  {line}")
            else:
                logger.info("No cron jobs found")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to list cron jobs: {e}")
            return False
    
    def remove_cron_jobs(self) -> bool:
        """Remove all Frende cron jobs"""
        try:
            # Get current cron jobs
            result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
            
            if result.returncode == 0:
                # Filter out Frende jobs
                current_jobs = []
                for line in result.stdout.split('\n'):
                    if line.strip() and not line.startswith('#') and 'frende' not in line.lower():
                        current_jobs.append(line)
                
                # Write filtered jobs back
                if current_jobs:
                    temp_cron_file = "/tmp/frende_filtered_cron"
                    with open(temp_cron_file, 'w') as f:
                        f.write('\n'.join(current_jobs) + '\n')
                    
                    subprocess.run(['crontab', temp_cron_file])
                    os.unlink(temp_cron_file)
                
                logger.info("Frende cron jobs removed successfully")
                return True
            else:
                logger.info("No cron jobs to remove")
                return True
                
        except Exception as e:
            logger.error(f"Failed to remove cron jobs: {e}")
            return False
    
    def run_setup(self) -> bool:
        """Run the complete cron setup process"""
        logger.info("Starting cron job setup...")
        
        try:
            # Check if cron is available
            if not self.check_cron_availability():
                logger.error("Cron is not available on this system")
                return False
            
            # Create log directories
            if not self.create_log_directories():
                logger.error("Failed to create log directories")
                return False
            
            # Create backup cron job
            if not self.create_backup_cron_job():
                logger.error("Failed to create backup cron job")
                return False
            
            # Create maintenance cron job
            if not self.create_maintenance_cron_job():
                logger.error("Failed to create maintenance cron job")
                return False
            
            # List current cron jobs
            self.list_current_cron_jobs()
            
            logger.info("Cron job setup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cron setup failed: {e}")
            return False

def main():
    """Main function to run the cron setup"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Cron job setup utility")
    parser.add_argument("--action", choices=["setup", "list", "remove"], 
                       default="setup", help="Action to perform")
    
    args = parser.parse_args()
    
    cron_setup = CronJobSetup()
    
    if args.action == "setup":
        success = cron_setup.run_setup()
        if success:
            logger.info("✅ Cron setup completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ Cron setup failed")
            sys.exit(1)
    
    elif args.action == "list":
        cron_setup.list_current_cron_jobs()
    
    elif args.action == "remove":
        success = cron_setup.remove_cron_jobs()
        if success:
            logger.info("✅ Cron jobs removed successfully")
        else:
            logger.error("❌ Failed to remove cron jobs")
            sys.exit(1)

if __name__ == "__main__":
    main()

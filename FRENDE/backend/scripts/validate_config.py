#!/usr/bin/env python3
"""
Configuration validation script for Frende backend.
Run this script to validate your environment configuration before starting the application.
"""

import sys
import os
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from core.config_utils import (
    validate_configuration,
    get_environment_info,
    get_feature_flags,
    get_configuration_summary
)
from core.config import settings

def main():
    """Main validation function"""
    logger.info("🔧 Frende Backend Configuration Validation")
    logger.info("=" * 50)
    
    # Validate configuration
    setup_status = validate_configuration()
    
    if setup_status["valid"]:
        logger.info("✅ Configuration is valid!")
    else:
        logger.error("❌ Configuration has errors:")
        for error in setup_status["errors"]:
            logger.error(f"   - {error}")
    
    # Display warnings
    if setup_status["warnings"]:
        logger.warning("⚠️  Warnings:")
        for warning in setup_status["warnings"]:
            logger.warning(f"   - {warning}")
    
    # Display environment information
    logger.info("📋 Environment Information:")
    env_info = get_environment_info()
    for key, value in env_info.items():
        logger.info(f"   {key}: {value}")
    
    # Display feature flags
    logger.info("🚀 Feature Flags:")
    feature_flags = get_feature_flags()
    for feature, enabled in feature_flags.items():
        status = "✓" if enabled else "✗"
        logger.info(f"   {status} {feature}")
    
    # Display configuration summary
    logger.info("📊 Configuration Summary:")
    config_summary = get_configuration_summary()
    for category, config in config_summary.items():
        if isinstance(config, dict):
            logger.info(f"   {category}:")
            for key, value in config.items():
                logger.info(f"     {key}: {value}")
        else:
            logger.info(f"   {category}: {config}")
    
    logger.info("=" * 50)
    
    if setup_status["valid"]:
        logger.info("✅ Configuration validation completed successfully!")
        logger.info("🚀 You can now start the application with: uvicorn main:app --reload")
        return 0
    else:
        logger.error("❌ Configuration validation failed!")
        logger.error("Please fix the errors above before starting the application.")
        return 1

def create_env_file():
    """Create .env file from template"""
    try:
        logger.info("📝 Creating .env file from template...")
        from core.config_utils import create_env_file_template
        
        create_env_file_template()
        logger.info("✅ .env file created successfully!")
        logger.info("📝 Please edit the .env file with your actual values.")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to create .env file: {e}")
        return False

def check_env_file():
    """Check if .env file exists"""
    env_path = Path(".env")
    if not env_path.exists():
        logger.info("📝 No .env file found!")
        logger.info("=" * 50)
        logger.info("⚠️  Continuing with default configuration...")
        return False
    return True

if __name__ == "__main__":
    # Check for .env file
    if not check_env_file():
        create_env_file()
    
    # Run validation
    exit_code = main()
    sys.exit(exit_code) 
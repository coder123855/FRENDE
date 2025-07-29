#!/usr/bin/env python3
"""
Configuration validation script for Frende backend.
Run this script to validate your environment configuration before starting the application.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from core.config_utils import (
    check_environment_setup,
    get_environment_info,
    get_feature_flags,
    log_configuration_startup
)
from core.config import settings

def main():
    """Main validation function"""
    print("🔧 Frende Backend Configuration Validation")
    print("=" * 50)
    
    # Check environment setup
    setup_status = check_environment_setup()
    
    # Display results
    if setup_status["valid"]:
        print("✅ Configuration is valid!")
    else:
        print("❌ Configuration has errors:")
        for error in setup_status["errors"]:
            print(f"   - {error}")
    
    # Display warnings
    if setup_status["warnings"]:
        print("\n⚠️  Warnings:")
        for warning in setup_status["warnings"]:
            print(f"   - {warning}")
    
    # Display environment information
    print("\n📋 Environment Information:")
    env_info = get_environment_info()
    for key, value in env_info.items():
        print(f"   {key}: {value}")
    
    # Display feature flags
    print("\n🚀 Feature Flags:")
    feature_flags = get_feature_flags()
    for feature, enabled in feature_flags.items():
        status = "✓" if enabled else "✗"
        print(f"   {status} {feature}")
    
    # Display configuration summary
    print("\n📊 Configuration Summary:")
    summary = setup_status["info"]
    for category, config in summary.items():
        if isinstance(config, dict):
            print(f"   {category}:")
            for key, value in config.items():
                print(f"     {key}: {value}")
        else:
            print(f"   {category}: {config}")
    
    # Final status
    print("\n" + "=" * 50)
    if setup_status["valid"]:
        print("✅ Configuration validation completed successfully!")
        print("🚀 You can now start the application with: uvicorn main:app --reload")
        return 0
    else:
        print("❌ Configuration validation failed!")
        print("Please fix the errors above before starting the application.")
        return 1

def create_env_file():
    """Create .env file from template"""
    print("📝 Creating .env file from template...")
    
    from core.config_utils import create_env_file_template
    
    if create_env_file_template():
        print("✅ .env file created successfully!")
        print("📝 Please edit the .env file with your actual values.")
        return True
    else:
        print("❌ Failed to create .env file!")
        return False

if __name__ == "__main__":
    # Check if .env file exists
    if not Path(".env").exists():
        print("📝 No .env file found!")
        response = input("Would you like to create one from the template? (y/n): ")
        if response.lower() in ['y', 'yes']:
            if create_env_file():
                print("\n" + "=" * 50)
            else:
                sys.exit(1)
        else:
            print("⚠️  Continuing with default configuration...")
    
    # Run validation
    exit_code = main()
    sys.exit(exit_code) 
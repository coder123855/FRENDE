#!/usr/bin/env python3
"""
Simple test script to verify the Frende backend API is working
"""

import requests
import json
import time

def test_backend_health():
    """Test if the backend is running and healthy"""
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/api/status", timeout=5)
        if response.status_code == 200:
            print("✅ Backend health check passed")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend not accessible: {e}")
        return False

def test_api_docs():
    """Test if API documentation is accessible"""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ API documentation accessible")
            return True
        else:
            print(f"❌ API documentation not accessible: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API documentation not accessible: {e}")
        return False

def test_root_endpoint():
    """Test the root endpoint"""
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root endpoint working: {data.get('message', 'Unknown')}")
            return True
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Root endpoint not accessible: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing Frende Backend API...")
    print("=" * 50)
    
    # Wait a moment for the server to start
    time.sleep(2)
    
    tests = [
        test_backend_health,
        test_api_docs,
        test_root_endpoint
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
        print("\n📚 Next steps:")
        print("1. Visit http://localhost:8000/docs for API documentation")
        print("2. Visit http://localhost:5173 for the frontend")
        print("3. Create a .env file with your Gemini API key")
        print("4. Test user registration and login")
    else:
        print("⚠️  Some tests failed. Check if the backend is running.")
        print("   Run: cd FRENDE/backend && python main.py")

if __name__ == "__main__":
    main()

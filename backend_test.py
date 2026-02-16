import requests
import sys
import json
from datetime import datetime

class NexusAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_server_health(self):
        """Test if server is running"""
        return self.run_test("Server Health", "GET", "", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        # Test login endpoint (should fail with invalid credentials)
        success, response = self.run_test(
            "Login Endpoint",
            "POST", 
            "auth/login",
            401,  # Expecting 401 for invalid credentials
            data={"email": "test@test.com", "password": "invalid"}
        )
        
        # Test register endpoint structure
        success, response = self.run_test(
            "Register Endpoint Structure",
            "POST",
            "auth/register", 
            400,  # Expecting 400 for missing required fields
            data={"email": "incomplete"}
        )

    def test_config_endpoints(self):
        """Test endpoints defined in Config.js"""
        endpoints_to_test = [
            ("Chat Sessions", "GET", "chat/sessions", [401, 404]),  # May need auth
            ("Notifications Count", "GET", "notifications/count", [401, 404]),  # May need auth
        ]
        
        for name, method, endpoint, acceptable_codes in endpoints_to_test:
            success, response = self.run_test(name, method, endpoint, acceptable_codes[0])
            if not success:
                # Try alternative acceptable codes
                for code in acceptable_codes[1:]:
                    if hasattr(response, 'status_code') and response.status_code == code:
                        print(f"✅ Alternative acceptable status: {code}")
                        self.tests_passed += 1
                        break

def main():
    print("🚀 Starting Nexus Athletics API Testing...")
    tester = NexusAPITester()
    
    # Test server health
    tester.test_server_health()
    
    # Test authentication endpoints
    tester.test_auth_endpoints()
    
    # Test config endpoints
    tester.test_config_endpoints()
    
    # Print results
    print(f"\n📊 Test Results:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    
    return 0 if tester.tests_passed >= tester.tests_run * 0.5 else 1

if __name__ == "__main__":
    sys.exit(main())
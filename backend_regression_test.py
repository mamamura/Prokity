#!/usr/bin/env python3
"""
Regression Test for Newly Added Sobuj Backend Endpoints
Tests admin user management and product tags functionality
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://no-signup-shop-1.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@organicshop.com"
ADMIN_PASSWORD = "admin123"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Test state
test_results = []
admin_token = None
customer_token = None
customer_email = None
first_user_id = None
test_product_id = None


def log_test(step: int, description: str, passed: bool, details: str = ""):
    """Log test result"""
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"\n{BLUE}Step {step}: {description}{RESET}")
    print(f"Status: {status}")
    if details:
        print(f"Details: {details}")
    test_results.append({
        'step': step,
        'description': description,
        'passed': passed,
        'details': details
    })


def make_request(method: str, endpoint: str, token: Optional[str] = None, 
                 json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (success, response_data, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    
    try:
        if method == 'GET':
            resp = requests.get(url, headers=headers, params=params, timeout=10)
        elif method == 'POST':
            resp = requests.post(url, headers=headers, json=json_data, timeout=10)
        elif method == 'PUT':
            resp = requests.put(url, headers=headers, json=json_data, timeout=10)
        elif method == 'DELETE':
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, f"Unknown method: {method}", 0
        
        try:
            data = resp.json()
        except:
            data = resp.text
        
        return resp.status_code < 400, data, resp.status_code
    except Exception as e:
        return False, str(e), 0


def test_step_1_admin_login():
    """Step 1: POST /api/auth/login admin@organicshop.com / admin123 — get admin token"""
    global admin_token
    
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    success, data, status = make_request('POST', '/auth/login', json_data=payload)
    
    if success and status == 200:
        if 'token' in data and 'user' in data:
            if data['user'].get('role') == 'admin':
                admin_token = data['token']
                log_test(1, "POST /api/auth/login (admin)", True, 
                        f"Admin login successful, token obtained")
            else:
                log_test(1, "POST /api/auth/login (admin)", False, 
                        f"Role is not admin: {data['user'].get('role')}")
        else:
            log_test(1, "POST /api/auth/login (admin)", False, 
                    f"Missing token or user: {data}")
    else:
        log_test(1, "POST /api/auth/login (admin)", False, 
                f"Status {status}: {data}")


def test_step_2_admin_users_list():
    """Step 2: GET /api/admin/users (admin) — should return list with orderCount and totalSpent"""
    global first_user_id
    
    success, data, status = make_request('GET', '/admin/users', token=admin_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 1:
            # Check first user has required fields
            first_user = data[0]
            if 'orderCount' in first_user and 'totalSpent' in first_user:
                if isinstance(first_user['orderCount'], (int, float)) and isinstance(first_user['totalSpent'], (int, float)):
                    first_user_id = first_user.get('id')
                    log_test(2, "GET /api/admin/users (admin)", True, 
                            f"Found {len(data)} customers, each with orderCount and totalSpent numeric fields")
                else:
                    log_test(2, "GET /api/admin/users (admin)", False, 
                            f"orderCount or totalSpent not numeric: orderCount={type(first_user['orderCount'])}, totalSpent={type(first_user['totalSpent'])}")
            else:
                log_test(2, "GET /api/admin/users (admin)", False, 
                        f"Missing orderCount or totalSpent fields in user: {first_user.keys()}")
        else:
            log_test(2, "GET /api/admin/users (admin)", False, 
                    f"Expected at least 1 customer, got {len(data) if isinstance(data, list) else 'non-list'}")
    else:
        log_test(2, "GET /api/admin/users (admin)", False, 
                f"Status {status}: {data}")


def test_step_3_admin_users_without_auth():
    """Step 3: GET /api/admin/users without auth — expect 401"""
    success, data, status = make_request('GET', '/admin/users')
    
    if not success and status == 401:
        log_test(3, "GET /api/admin/users (no auth)", True, 
                f"Correctly rejected with 401")
    else:
        log_test(3, "GET /api/admin/users (no auth)", False, 
                f"Expected 401, got {status}: {data}")


def test_step_4_admin_users_with_customer_token():
    """Step 4: GET /api/admin/users with regular customer token — expect 403"""
    global customer_token, customer_email
    
    # First create a customer
    import random
    customer_email = f"customer{random.randint(10000, 99999)}@test.com"
    
    payload = {
        "name": "Rahim Ahmed",
        "email": customer_email,
        "phone": "01712345678",
        "password": "customer123"
    }
    
    success, data, status = make_request('POST', '/auth/signup', json_data=payload)
    
    if success and status == 200 and 'token' in data:
        customer_token = data['token']
        
        # Now try to access admin endpoint with customer token
        success2, data2, status2 = make_request('GET', '/admin/users', token=customer_token)
        
        if not success2 and status2 == 403:
            log_test(4, "GET /api/admin/users (customer token)", True, 
                    f"Correctly rejected with 403")
        else:
            log_test(4, "GET /api/admin/users (customer token)", False, 
                    f"Expected 403, got {status2}: {data2}")
    else:
        log_test(4, "GET /api/admin/users (customer token)", False, 
                f"Could not create customer for testing: Status {status}: {data}")


def test_step_5_admin_user_detail():
    """Step 5: GET /api/admin/users/{user_id} (admin) — expect {user, orders} structure"""
    if not first_user_id:
        log_test(5, "GET /api/admin/users/{user_id} (admin)", False, 
                "No user_id available from step 2")
        return
    
    success, data, status = make_request('GET', f'/admin/users/{first_user_id}', token=admin_token)
    
    if success and status == 200:
        if 'user' in data and 'orders' in data:
            if isinstance(data['orders'], list):
                log_test(5, "GET /api/admin/users/{user_id} (admin)", True, 
                        f"Got user detail with {len(data['orders'])} orders")
            else:
                log_test(5, "GET /api/admin/users/{user_id} (admin)", False, 
                        f"orders field is not a list: {type(data['orders'])}")
        else:
            log_test(5, "GET /api/admin/users/{user_id} (admin)", False, 
                    f"Missing user or orders field: {data.keys()}")
    else:
        log_test(5, "GET /api/admin/users/{user_id} (admin)", False, 
                f"Status {status}: {data}")


def test_step_6_create_product_with_tags():
    """Step 6: POST /api/products (admin) with tags=['best-seller', 'raw'] — verify tags in response"""
    global test_product_id
    
    payload = {
        "name": "Premium Organic Jaggery",
        "description": "Raw organic jaggery from sugarcane — unrefined, mineral-rich sweetener",
        "price": 280,
        "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
        "category": "honey-sweeteners",
        "tags": ["best-seller", "raw"]
    }
    
    success, data, status = make_request('POST', '/products', token=admin_token, json_data=payload)
    
    if success and status == 200:
        if 'tags' in data and isinstance(data['tags'], list):
            if set(data['tags']) == {'best-seller', 'raw'}:
                test_product_id = data.get('id')
                log_test(6, "POST /api/products (admin) with tags", True, 
                        f"Product created with tags: {data['tags']}")
            else:
                log_test(6, "POST /api/products (admin) with tags", False, 
                        f"Tags mismatch: expected ['best-seller', 'raw'], got {data['tags']}")
        else:
            log_test(6, "POST /api/products (admin) with tags", False, 
                    f"Missing or invalid tags field: {data.get('tags')}")
    else:
        log_test(6, "POST /api/products (admin) with tags", False, 
                f"Status {status}: {data}")


def test_step_7_update_product_tags():
    """Step 7: PUT /api/products/{id} (admin) updating tags=['premium'] — verify tags replaced"""
    if not test_product_id:
        log_test(7, "PUT /api/products/{id} (admin) update tags", False, 
                "No product_id available from step 6")
        return
    
    payload = {
        "tags": ["premium"]
    }
    
    success, data, status = make_request('PUT', f'/products/{test_product_id}', 
                                        token=admin_token, json_data=payload)
    
    if success and status == 200:
        if 'tags' in data and isinstance(data['tags'], list):
            if data['tags'] == ['premium']:
                log_test(7, "PUT /api/products/{id} (admin) update tags", True, 
                        f"Tags updated to: {data['tags']}")
            else:
                log_test(7, "PUT /api/products/{id} (admin) update tags", False, 
                        f"Tags not replaced correctly: expected ['premium'], got {data['tags']}")
        else:
            log_test(7, "PUT /api/products/{id} (admin) update tags", False, 
                    f"Missing or invalid tags field: {data.get('tags')}")
    else:
        log_test(7, "PUT /api/products/{id} (admin) update tags", False, 
                f"Status {status}: {data}")


def test_step_8_get_product_with_tags():
    """Step 8: GET /api/products/retail-portal-160 — verify tags field returned"""
    # First, let's get the slug of our test product
    if not test_product_id:
        log_test(8, "GET /api/products/{slug} verify tags", False, 
                "No product_id available from step 6")
        return
    
    # Get product by ID first to get slug
    success, data, status = make_request('GET', '/products', params={'q': 'Premium Organic Jaggery'})
    
    if success and isinstance(data, list) and len(data) > 0:
        product = data[0]
        slug = product.get('slug')
        
        # Now get by slug
        success2, data2, status2 = make_request('GET', f'/products/{slug}')
        
        if success2 and status2 == 200:
            if 'tags' in data2:
                log_test(8, "GET /api/products/{slug} verify tags", True, 
                        f"Product has tags field: {data2['tags']}")
            else:
                log_test(8, "GET /api/products/{slug} verify tags", False, 
                        f"Missing tags field in response")
        else:
            log_test(8, "GET /api/products/{slug} verify tags", False, 
                    f"Status {status2}: {data2}")
    else:
        log_test(8, "GET /api/products/{slug} verify tags", False, 
                f"Could not find test product")


def test_step_9_delete_product():
    """Step 9: DELETE /api/products/{id} (admin) — cleanup"""
    if not test_product_id:
        log_test(9, "DELETE /api/products/{id} (admin)", False, 
                "No product_id available from step 6")
        return
    
    success, data, status = make_request('DELETE', f'/products/{test_product_id}', token=admin_token)
    
    if success and status == 200:
        log_test(9, "DELETE /api/products/{id} (admin)", True, 
                f"Product deleted successfully")
    else:
        log_test(9, "DELETE /api/products/{id} (admin)", False, 
                f"Status {status}: {data}")


def print_summary():
    """Print test summary"""
    print(f"\n{'='*80}")
    print(f"{BLUE}REGRESSION TEST SUMMARY{RESET}")
    print(f"{'='*80}")
    
    passed = sum(1 for r in test_results if r['passed'])
    failed = sum(1 for r in test_results if not r['passed'])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"{GREEN}Passed: {passed}{RESET}")
    print(f"{RED}Failed: {failed}{RESET}")
    
    if failed > 0:
        print(f"\n{RED}Failed Tests:{RESET}")
        for r in test_results:
            if not r['passed']:
                print(f"  Step {r['step']}: {r['description']}")
                print(f"    {r['details']}")
    else:
        print(f"\n{GREEN}All regression tests passed!{RESET}")
    
    print(f"\n{'='*80}\n")
    
    return failed == 0


def main():
    """Run all regression tests"""
    print(f"{BLUE}Starting Regression Tests for New Sobuj Backend Endpoints{RESET}")
    print(f"Backend URL: {BASE_URL}\n")
    
    # Run all tests in sequence
    test_step_1_admin_login()
    test_step_2_admin_users_list()
    test_step_3_admin_users_without_auth()
    test_step_4_admin_users_with_customer_token()
    test_step_5_admin_user_detail()
    test_step_6_create_product_with_tags()
    test_step_7_update_product_tags()
    test_step_8_get_product_with_tags()
    test_step_9_delete_product()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()

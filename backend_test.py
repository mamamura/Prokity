#!/usr/bin/env python3
"""
Comprehensive Backend API Test for Sobuj Organic Shop
Tests all 19 steps from the review request
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
customer_token = None
admin_token = None
customer_email = None
test_product_id = None
payment_session_id = None
payment_txn_id = None
order_id_bkash = None
order_id_cod = None


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
        elif method == 'PATCH':
            resp = requests.patch(url, headers=headers, json=json_data, timeout=10)
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


def test_step_1_signup():
    """Step 1: POST /api/auth/signup with fresh customer"""
    global customer_token, customer_email
    
    import random
    customer_email = f"customer{random.randint(10000, 99999)}@test.com"
    
    payload = {
        "name": "Fatima Rahman",
        "email": customer_email,
        "phone": "01712345678",
        "password": "customer123"
    }
    
    success, data, status = make_request('POST', '/auth/signup', json_data=payload)
    
    if success and status == 200:
        if 'token' in data and 'user' in data:
            customer_token = data['token']
            # Verify token works with /api/auth/me
            me_success, me_data, me_status = make_request('GET', '/auth/me', token=customer_token)
            if me_success and me_status == 200:
                log_test(1, "Signup with fresh customer", True, 
                        f"Created user {customer_email}, token works for /api/auth/me")
            else:
                log_test(1, "Signup with fresh customer", False, 
                        f"Token doesn't work for /api/auth/me: {me_data}")
        else:
            log_test(1, "Signup with fresh customer", False, 
                    f"Missing token or user in response: {data}")
    else:
        log_test(1, "Signup with fresh customer", False, 
                f"Status {status}: {data}")


def test_step_2_login():
    """Step 2: POST /api/auth/login with the new customer"""
    global customer_token
    
    payload = {
        "email": customer_email,
        "password": "customer123"
    }
    
    success, data, status = make_request('POST', '/auth/login', json_data=payload)
    
    if success and status == 200 and 'token' in data:
        customer_token = data['token']
        log_test(2, "Login with new customer", True, f"Got token: {customer_token[:20]}...")
    else:
        log_test(2, "Login with new customer", False, f"Status {status}: {data}")


def test_step_3_me():
    """Step 3: GET /api/auth/me with the token"""
    success, data, status = make_request('GET', '/auth/me', token=customer_token)
    
    if success and status == 200:
        if 'email' in data and data['email'] == customer_email:
            log_test(3, "Get customer profile with /api/auth/me", True, 
                    f"Profile: {data.get('name')} ({data.get('email')})")
        else:
            log_test(3, "Get customer profile with /api/auth/me", False, 
                    f"Email mismatch or missing: {data}")
    else:
        log_test(3, "Get customer profile with /api/auth/me", False, 
                f"Status {status}: {data}")


def test_step_4_admin_login():
    """Step 4: POST /api/auth/login admin@organicshop.com / admin123"""
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
                log_test(4, "Admin login", True, f"Admin role confirmed in response")
            else:
                log_test(4, "Admin login", False, f"Role is not admin: {data['user'].get('role')}")
        else:
            log_test(4, "Admin login", False, f"Missing token or user: {data}")
    else:
        log_test(4, "Admin login", False, f"Status {status}: {data}")


def test_step_5_categories():
    """Step 5: GET /api/categories — expect 8 organic categories"""
    success, data, status = make_request('GET', '/categories')
    
    if success and status == 200:
        if isinstance(data, list) and len(data) == 8:
            log_test(5, "Get categories", True, f"Found 8 categories: {[c.get('name') for c in data]}")
        else:
            log_test(5, "Get categories", False, f"Expected 8 categories, got {len(data) if isinstance(data, list) else 'non-list'}")
    else:
        log_test(5, "Get categories", False, f"Status {status}: {data}")


def test_step_6_products():
    """Step 6: GET /api/products — expect 16 seeded products + filters"""
    # Test basic list
    success, data, status = make_request('GET', '/products')
    
    if not success or status != 200:
        log_test(6, "Get products and filters", False, f"Status {status}: {data}")
        return
    
    if not isinstance(data, list) or len(data) != 16:
        log_test(6, "Get products and filters", False, 
                f"Expected 16 products, got {len(data) if isinstance(data, list) else 'non-list'}")
        return
    
    # Test filter: category=spices
    success2, data2, status2 = make_request('GET', '/products', params={'category': 'spices'})
    if not success2 or not isinstance(data2, list):
        log_test(6, "Get products and filters", False, f"Category filter failed: {data2}")
        return
    
    # Test filter: featured=true
    success3, data3, status3 = make_request('GET', '/products', params={'featured': 'true'})
    if not success3 or not isinstance(data3, list):
        log_test(6, "Get products and filters", False, f"Featured filter failed: {data3}")
        return
    
    # Test filter: q=honey
    success4, data4, status4 = make_request('GET', '/products', params={'q': 'honey'})
    if not success4 or not isinstance(data4, list):
        log_test(6, "Get products and filters", False, f"Search filter failed: {data4}")
        return
    
    log_test(6, "Get products and filters", True, 
            f"16 products, category filter: {len(data2)} spices, featured: {len(data3)}, search 'honey': {len(data4)}")


def test_step_7_product_by_slug():
    """Step 7: GET /api/products/{slug} — pick a slug from list"""
    # First get products
    success, data, status = make_request('GET', '/products')
    
    if success and isinstance(data, list) and len(data) > 0:
        slug = data[0].get('slug')
        success2, data2, status2 = make_request('GET', f'/products/{slug}')
        
        if success2 and status2 == 200:
            log_test(7, "Get product by slug", True, f"Got product: {data2.get('name')}")
        else:
            log_test(7, "Get product by slug", False, f"Status {status2}: {data2}")
    else:
        log_test(7, "Get product by slug", False, "No products to test with")


def test_step_8_create_product_without_admin():
    """Step 8: POST /api/products WITHOUT admin token — expect 401 or 403"""
    payload = {
        "name": "Test Product",
        "description": "Test description",
        "price": 100,
        "image": "https://example.com/image.jpg",
        "category": "spices"
    }
    
    success, data, status = make_request('POST', '/products', token=customer_token, json_data=payload)
    
    if not success and status in [401, 403]:
        log_test(8, "Create product without admin token", True, f"Correctly rejected with status {status}")
    else:
        log_test(8, "Create product without admin token", False, 
                f"Expected 401/403, got {status}: {data}")


def test_step_9_admin_product_crud():
    """Step 9: POST/PUT/DELETE /api/products WITH admin token"""
    global test_product_id
    
    # Create product
    payload = {
        "name": "Test Organic Cardamom",
        "description": "Premium green cardamom for testing",
        "price": 500,
        "image": "https://images.unsplash.com/photo-1599909533730-d4ae292ce5dd?w=800&q=80",
        "category": "spices"
    }
    
    success, data, status = make_request('POST', '/products', token=admin_token, json_data=payload)
    
    if not success or status != 200:
        log_test(9, "Admin product CRUD (create/update/delete)", False, 
                f"Create failed - Status {status}: {data}")
        return
    
    if 'id' not in data or 'slug' not in data:
        log_test(9, "Admin product CRUD (create/update/delete)", False, 
                f"Missing id or slug in response: {data}")
        return
    
    test_product_id = data['id']
    
    # Update product
    update_payload = {"price": 550}
    success2, data2, status2 = make_request('PUT', f'/products/{test_product_id}', 
                                            token=admin_token, json_data=update_payload)
    
    if not success2 or status2 != 200:
        log_test(9, "Admin product CRUD (create/update/delete)", False, 
                f"Update failed - Status {status2}: {data2}")
        return
    
    if data2.get('price') != 550:
        log_test(9, "Admin product CRUD (create/update/delete)", False, 
                f"Price not updated correctly: {data2.get('price')}")
        return
    
    # Delete product
    success3, data3, status3 = make_request('DELETE', f'/products/{test_product_id}', token=admin_token)
    
    if success3 and status3 == 200:
        log_test(9, "Admin product CRUD (create/update/delete)", True, 
                "Created product with id+slug, updated price, deleted successfully")
    else:
        log_test(9, "Admin product CRUD (create/update/delete)", False, 
                f"Delete failed - Status {status3}: {data3}")


def test_step_10_payment_initiate():
    """Step 10: POST /api/payments/initiate"""
    global payment_session_id
    
    payload = {
        "method": "bkash",
        "phone": "01711000000",
        "amount": 1000
    }
    
    success, data, status = make_request('POST', '/payments/initiate', json_data=payload)
    
    if success and status == 200:
        if 'sessionId' in data and 'demoOtp' in data:
            if data['demoOtp'] == '1234':
                payment_session_id = data['sessionId']
                log_test(10, "Payment initiate", True, 
                        f"Got sessionId and demoOtp '1234': {payment_session_id}")
            else:
                log_test(10, "Payment initiate", False, 
                        f"demoOtp is not '1234': {data['demoOtp']}")
        else:
            log_test(10, "Payment initiate", False, f"Missing sessionId or demoOtp: {data}")
    else:
        log_test(10, "Payment initiate", False, f"Status {status}: {data}")


def test_step_11_payment_verify_wrong_otp():
    """Step 11: POST /api/payments/verify with wrong OTP — expect 400"""
    payload = {
        "sessionId": payment_session_id,
        "otp": "9999"
    }
    
    success, data, status = make_request('POST', '/payments/verify', json_data=payload)
    
    if not success and status == 400:
        log_test(11, "Payment verify with wrong OTP", True, 
                f"Correctly rejected with status 400")
    else:
        log_test(11, "Payment verify with wrong OTP", False, 
                f"Expected 400, got {status}: {data}")


def test_step_12_payment_verify_correct_otp():
    """Step 12: POST /api/payments/verify with otp '1234'"""
    global payment_txn_id
    
    payload = {
        "sessionId": payment_session_id,
        "otp": "1234"
    }
    
    success, data, status = make_request('POST', '/payments/verify', json_data=payload)
    
    if success and status == 200:
        if data.get('verified') == True and 'txnId' in data:
            payment_txn_id = data['txnId']
            log_test(12, "Payment verify with correct OTP", True, 
                    f"verified=true, txnId={payment_txn_id}")
        else:
            log_test(12, "Payment verify with correct OTP", False, 
                    f"Missing verified or txnId: {data}")
    else:
        log_test(12, "Payment verify with correct OTP", False, f"Status {status}: {data}")


def test_step_13_create_order_bkash():
    """Step 13: POST /api/orders with bkash payment"""
    global order_id_bkash
    
    payload = {
        "items": [
            {
                "productId": "prod-123",
                "name": "Organic Sundarban Honey",
                "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
                "price": 750,
                "qty": 2,
                "unit": "500 g"
            }
        ],
        "address": {
            "fullName": "Fatima Rahman",
            "phone": "01712345678",
            "address": "House 45, Road 12, Dhanmondi",
            "area": "Dhanmondi",
            "city": "Dhaka",
            "note": "Please call before delivery"
        },
        "paymentMethod": "bkash",
        "paymentPhone": "01711000000",
        "paymentTxn": payment_txn_id,
        "subtotal": 1500,
        "delivery": 60,
        "total": 1560
    }
    
    success, data, status = make_request('POST', '/orders', token=customer_token, json_data=payload)
    
    if success and status == 200:
        if (data.get('status') == 'confirmed' and 
            data.get('paymentStatus') == 'paid' and 
            'orderNo' in data):
            order_id_bkash = data['id']
            log_test(13, "Create order with bkash", True, 
                    f"Order {data['orderNo']}: status=confirmed, paymentStatus=paid")
        else:
            log_test(13, "Create order with bkash", False, 
                    f"Incorrect status or missing orderNo: {data}")
    else:
        log_test(13, "Create order with bkash", False, f"Status {status}: {data}")


def test_step_14_create_order_cod():
    """Step 14: POST /api/orders with COD"""
    global order_id_cod
    
    payload = {
        "items": [
            {
                "productId": "prod-456",
                "name": "Cold-Pressed Mustard Oil",
                "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
                "price": 420,
                "qty": 1,
                "unit": "1 L"
            }
        ],
        "address": {
            "fullName": "Fatima Rahman",
            "phone": "01712345678",
            "address": "House 45, Road 12, Dhanmondi",
            "area": "Dhanmondi",
            "city": "Dhaka"
        },
        "paymentMethod": "cod",
        "subtotal": 420,
        "delivery": 60,
        "total": 480
    }
    
    success, data, status = make_request('POST', '/orders', token=customer_token, json_data=payload)
    
    if success and status == 200:
        if (data.get('status') == 'pending' and 
            data.get('paymentStatus') == 'unpaid'):
            order_id_cod = data['id']
            log_test(14, "Create order with COD", True, 
                    f"Order {data.get('orderNo')}: status=pending, paymentStatus=unpaid")
        else:
            log_test(14, "Create order with COD", False, 
                    f"Expected status=pending, paymentStatus=unpaid, got: {data}")
    else:
        log_test(14, "Create order with COD", False, f"Status {status}: {data}")


def test_step_15_my_orders():
    """Step 15: GET /api/orders/my (customer)"""
    success, data, status = make_request('GET', '/orders/my', token=customer_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 2:
            log_test(15, "Get my orders", True, f"Found {len(data)} orders")
        else:
            log_test(15, "Get my orders", False, 
                    f"Expected at least 2 orders, got {len(data) if isinstance(data, list) else 'non-list'}")
    else:
        log_test(15, "Get my orders", False, f"Status {status}: {data}")


def test_step_16_get_order_by_id():
    """Step 16: GET /api/orders/{id} (customer) — different customer should get 403"""
    # Test with correct customer
    success, data, status = make_request('GET', f'/orders/{order_id_bkash}', token=customer_token)
    
    if not success or status != 200:
        log_test(16, "Get order by id with access control", False, 
                f"Customer can't access own order - Status {status}: {data}")
        return
    
    # Create another customer to test 403
    import random
    other_email = f"other{random.randint(10000, 99999)}@test.com"
    other_payload = {
        "name": "Other Customer",
        "email": other_email,
        "phone": "01798765432",
        "password": "other123"
    }
    
    success2, data2, status2 = make_request('POST', '/auth/signup', json_data=other_payload)
    
    if success2 and 'token' in data2:
        other_token = data2['token']
        # Try to access first customer's order
        success3, data3, status3 = make_request('GET', f'/orders/{order_id_bkash}', token=other_token)
        
        if not success3 and status3 == 403:
            log_test(16, "Get order by id with access control", True, 
                    "Customer can access own order, different customer gets 403")
        else:
            log_test(16, "Get order by id with access control", False, 
                    f"Different customer should get 403, got {status3}: {data3}")
    else:
        log_test(16, "Get order by id with access control", False, 
                "Could not create second customer for testing")


def test_step_17_admin_list_orders():
    """Step 17: GET /api/admin/orders (admin)"""
    success, data, status = make_request('GET', '/admin/orders', token=admin_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 2:
            log_test(17, "Admin list all orders", True, f"Admin sees {len(data)} orders")
        else:
            log_test(17, "Admin list all orders", False, 
                    f"Expected at least 2 orders, got {len(data) if isinstance(data, list) else 'non-list'}")
    else:
        log_test(17, "Admin list all orders", False, f"Status {status}: {data}")


def test_step_18_admin_update_order():
    """Step 18: PATCH /api/admin/orders/{id} as admin — non-admin should get 403"""
    # Test with admin
    payload = {"status": "shipped"}
    success, data, status = make_request('PATCH', f'/admin/orders/{order_id_bkash}', 
                                        token=admin_token, json_data=payload)
    
    if not success or status != 200:
        log_test(18, "Admin update order status", False, 
                f"Admin update failed - Status {status}: {data}")
        return
    
    if data.get('status') != 'shipped':
        log_test(18, "Admin update order status", False, 
                f"Status not updated to 'shipped': {data.get('status')}")
        return
    
    # Test with non-admin (customer)
    success2, data2, status2 = make_request('PATCH', f'/admin/orders/{order_id_cod}', 
                                           token=customer_token, json_data=payload)
    
    if not success2 and status2 == 403:
        log_test(18, "Admin update order status", True, 
                "Admin updated to 'shipped', non-admin gets 403")
    else:
        log_test(18, "Admin update order status", False, 
                f"Non-admin should get 403, got {status2}: {data2}")


def test_step_19_admin_stats():
    """Step 19: GET /api/admin/stats (admin)"""
    success, data, status = make_request('GET', '/admin/stats', token=admin_token)
    
    if success and status == 200:
        required_keys = ['products', 'orders', 'customers', 'revenue']
        if all(key in data for key in required_keys):
            log_test(19, "Admin stats", True, 
                    f"Stats: {data['products']} products, {data['orders']} orders, "
                    f"{data['customers']} customers, ৳{data['revenue']} revenue")
        else:
            log_test(19, "Admin stats", False, f"Missing required keys: {data}")
    else:
        log_test(19, "Admin stats", False, f"Status {status}: {data}")


def print_summary():
    """Print test summary"""
    print(f"\n{'='*80}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
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
    
    print(f"\n{'='*80}\n")
    
    return failed == 0


def main():
    """Run all tests"""
    print(f"{BLUE}Starting Comprehensive Backend API Tests{RESET}")
    print(f"Backend URL: {BASE_URL}\n")
    
    # Run all tests in sequence
    test_step_1_signup()
    test_step_2_login()
    test_step_3_me()
    test_step_4_admin_login()
    test_step_5_categories()
    test_step_6_products()
    test_step_7_product_by_slug()
    test_step_8_create_product_without_admin()
    test_step_9_admin_product_crud()
    test_step_10_payment_initiate()
    test_step_11_payment_verify_wrong_otp()
    test_step_12_payment_verify_correct_otp()
    test_step_13_create_order_bkash()
    test_step_14_create_order_cod()
    test_step_15_my_orders()
    test_step_16_get_order_by_id()
    test_step_17_admin_list_orders()
    test_step_18_admin_update_order()
    test_step_19_admin_stats()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()

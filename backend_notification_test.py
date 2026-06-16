#!/usr/bin/env python3
"""
Backend API Test for Sobuj Notification & Admin Endpoints
Tests notification system, admin category CRUD, and analytics
"""

import requests
import json
import sys
import time
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
customer_id = None
order_id = None
notification_id = None
category_id = None


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


def test_step_1_signup_with_welcome_notification():
    """Step 1: POST /api/auth/signup → verify welcome notification is created"""
    global customer_token, customer_email, customer_id
    
    import random
    customer_email = f"notif_test_{random.randint(10000, 99999)}@test.com"
    
    payload = {
        "name": "Rahim Ahmed",
        "email": customer_email,
        "phone": "01812345678",
        "password": "test123"
    }
    
    success, data, status = make_request('POST', '/auth/signup', json_data=payload)
    
    if success and status == 200:
        if 'token' in data and 'user' in data:
            customer_token = data['token']
            customer_id = data['user'].get('id')
            
            # Wait a moment for notification to be created
            time.sleep(0.5)
            
            # Check notifications
            notif_success, notif_data, notif_status = make_request('GET', '/notifications', token=customer_token)
            
            if notif_success and notif_status == 200:
                if isinstance(notif_data, list) and len(notif_data) >= 1:
                    # Check if any notification has "Welcome" in title
                    welcome_notif = [n for n in notif_data if 'Welcome' in n.get('title', '')]
                    if welcome_notif:
                        log_test(1, "Signup creates welcome notification", True, 
                                f"Created user {customer_email}, found welcome notification: '{welcome_notif[0].get('title')}'")
                    else:
                        log_test(1, "Signup creates welcome notification", False, 
                                f"No welcome notification found. Notifications: {[n.get('title') for n in notif_data]}")
                else:
                    log_test(1, "Signup creates welcome notification", False, 
                            f"Expected at least 1 notification, got {len(notif_data) if isinstance(notif_data, list) else 'non-list'}")
            else:
                log_test(1, "Signup creates welcome notification", False, 
                        f"Failed to get notifications - Status {notif_status}: {notif_data}")
        else:
            log_test(1, "Signup creates welcome notification", False, 
                    f"Missing token or user in signup response: {data}")
    else:
        log_test(1, "Signup creates welcome notification", False, 
                f"Signup failed - Status {status}: {data}")


def test_step_2_get_notifications():
    """Step 2: GET /api/notifications → should have 1 item with title containing "Welcome" """
    success, data, status = make_request('GET', '/notifications', token=customer_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 1:
            welcome_notif = [n for n in data if 'Welcome' in n.get('title', '')]
            if welcome_notif:
                global notification_id
                notification_id = welcome_notif[0].get('id')
                log_test(2, "GET /api/notifications returns welcome notification", True, 
                        f"Found {len(data)} notification(s), welcome notification: '{welcome_notif[0].get('title')}'")
            else:
                log_test(2, "GET /api/notifications returns welcome notification", False, 
                        f"No welcome notification found in {len(data)} notifications")
        else:
            log_test(2, "GET /api/notifications returns welcome notification", False, 
                    f"Expected at least 1 notification, got {len(data) if isinstance(data, list) else 'non-list'}")
    else:
        log_test(2, "GET /api/notifications returns welcome notification", False, 
                f"Status {status}: {data}")


def test_step_3_unread_count():
    """Step 3: GET /api/notifications/unread-count → expect {count: 1}"""
    success, data, status = make_request('GET', '/notifications/unread-count', token=customer_token)
    
    if success and status == 200:
        if 'count' in data and data['count'] == 1:
            log_test(3, "GET /api/notifications/unread-count", True, 
                    f"Unread count is 1 as expected")
        else:
            log_test(3, "GET /api/notifications/unread-count", False, 
                    f"Expected count=1, got: {data}")
    else:
        log_test(3, "GET /api/notifications/unread-count", False, 
                f"Status {status}: {data}")


def test_step_4_mark_notification_read():
    """Step 4: POST /api/notifications/{id}/read → mark first notification read; then unread-count should be 0"""
    # Mark notification as read
    success, data, status = make_request('POST', f'/notifications/{notification_id}/read', token=customer_token)
    
    if not success or status != 200:
        log_test(4, "Mark notification read and verify unread-count", False, 
                f"Failed to mark notification read - Status {status}: {data}")
        return
    
    # Check unread count
    time.sleep(0.2)
    count_success, count_data, count_status = make_request('GET', '/notifications/unread-count', token=customer_token)
    
    if count_success and count_status == 200:
        if 'count' in count_data and count_data['count'] == 0:
            log_test(4, "Mark notification read and verify unread-count", True, 
                    f"Marked notification read, unread count is now 0")
        else:
            log_test(4, "Mark notification read and verify unread-count", False, 
                    f"Expected unread count=0, got: {count_data}")
    else:
        log_test(4, "Mark notification read and verify unread-count", False, 
                f"Failed to get unread count - Status {count_status}: {count_data}")


def test_step_5_mark_all_read():
    """Step 5: POST /api/notifications/read-all → mark all read; should be idempotent"""
    # First call
    success, data, status = make_request('POST', '/notifications/read-all', token=customer_token)
    
    if not success or status != 200:
        log_test(5, "Mark all notifications read (idempotent)", False, 
                f"First call failed - Status {status}: {data}")
        return
    
    # Second call (idempotent)
    success2, data2, status2 = make_request('POST', '/notifications/read-all', token=customer_token)
    
    if not success2 or status2 != 200:
        log_test(5, "Mark all notifications read (idempotent)", False, 
                f"Second call failed - Status {status2}: {data2}")
        return
    
    # Verify unread count is still 0
    count_success, count_data, count_status = make_request('GET', '/notifications/unread-count', token=customer_token)
    
    if count_success and count_status == 200 and count_data.get('count') == 0:
        log_test(5, "Mark all notifications read (idempotent)", True, 
                f"Called read-all twice (idempotent), unread count remains 0")
    else:
        log_test(5, "Mark all notifications read (idempotent)", False, 
                f"Unread count not 0 after read-all: {count_data}")


def test_step_6_order_creates_notification():
    """Step 6: POST /api/orders → after creation, user should have a new "Order placed" notification"""
    global order_id
    
    # Get current notification count
    notif_success, notif_data, notif_status = make_request('GET', '/notifications', token=customer_token)
    initial_count = len(notif_data) if notif_success and isinstance(notif_data, list) else 0
    
    # Create order
    payload = {
        "items": [
            {
                "productId": "prod-test-123",
                "name": "Organic Sundarban Honey",
                "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
                "price": 750,
                "qty": 1,
                "unit": "500 g"
            }
        ],
        "address": {
            "fullName": "Rahim Ahmed",
            "phone": "01812345678",
            "address": "House 23, Road 5, Gulshan",
            "area": "Gulshan",
            "city": "Dhaka"
        },
        "paymentMethod": "cod",
        "subtotal": 750,
        "delivery": 60,
        "total": 810
    }
    
    success, data, status = make_request('POST', '/orders', token=customer_token, json_data=payload)
    
    if not success or status != 200:
        log_test(6, "Order creation creates notification", False, 
                f"Order creation failed - Status {status}: {data}")
        return
    
    order_id = data.get('id')
    
    # Wait for notification
    time.sleep(0.5)
    
    # Check notifications again
    notif_success2, notif_data2, notif_status2 = make_request('GET', '/notifications', token=customer_token)
    
    if notif_success2 and notif_status2 == 200:
        if isinstance(notif_data2, list):
            new_count = len(notif_data2)
            if new_count > initial_count:
                # Check for "Order placed" notification
                order_notifs = [n for n in notif_data2 if 'Order placed' in n.get('title', '') or 'Order' in n.get('title', '')]
                if order_notifs:
                    log_test(6, "Order creation creates notification", True, 
                            f"Order created, notification count increased from {initial_count} to {new_count}. Found: '{order_notifs[0].get('title')}'")
                else:
                    log_test(6, "Order creation creates notification", False, 
                            f"Notification count increased but no 'Order placed' notification found")
            else:
                log_test(6, "Order creation creates notification", False, 
                        f"Notification count did not increase (was {initial_count}, now {new_count})")
        else:
            log_test(6, "Order creation creates notification", False, 
                    f"Notifications response is not a list: {notif_data2}")
    else:
        log_test(6, "Order creation creates notification", False, 
                f"Failed to get notifications - Status {notif_status2}: {notif_data2}")


def test_step_7_admin_order_update_notification():
    """Step 7: PATCH /api/admin/orders/{order_id} status='shipped' → customer should receive "Order shipped" notification"""
    global admin_token
    
    # Admin login
    admin_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    success, data, status = make_request('POST', '/auth/login', json_data=admin_payload)
    
    if not success or status != 200 or 'token' not in data:
        log_test(7, "Admin order update creates notification", False, 
                f"Admin login failed - Status {status}: {data}")
        return
    
    admin_token = data['token']
    
    # Get current notification count for customer
    notif_success, notif_data, notif_status = make_request('GET', '/notifications', token=customer_token)
    initial_count = len(notif_data) if notif_success and isinstance(notif_data, list) else 0
    
    # Update order status
    update_payload = {"status": "shipped"}
    success2, data2, status2 = make_request('PATCH', f'/admin/orders/{order_id}', 
                                           token=admin_token, json_data=update_payload)
    
    if not success2 or status2 != 200:
        log_test(7, "Admin order update creates notification", False, 
                f"Order update failed - Status {status2}: {data2}")
        return
    
    # Wait for notification
    time.sleep(0.5)
    
    # Check customer notifications
    notif_success2, notif_data2, notif_status2 = make_request('GET', '/notifications', token=customer_token)
    
    if notif_success2 and notif_status2 == 200:
        if isinstance(notif_data2, list):
            new_count = len(notif_data2)
            if new_count > initial_count:
                # Check for "shipped" notification
                shipped_notifs = [n for n in notif_data2 if 'shipped' in n.get('title', '').lower() or 'shipped' in n.get('body', '').lower()]
                if shipped_notifs:
                    log_test(7, "Admin order update creates notification", True, 
                            f"Admin updated order to 'shipped', customer received notification: '{shipped_notifs[0].get('title')}'")
                else:
                    log_test(7, "Admin order update creates notification", False, 
                            f"Notification count increased but no 'shipped' notification found. Titles: {[n.get('title') for n in notif_data2]}")
            else:
                log_test(7, "Admin order update creates notification", False, 
                        f"Notification count did not increase (was {initial_count}, now {new_count})")
        else:
            log_test(7, "Admin order update creates notification", False, 
                    f"Notifications response is not a list: {notif_data2}")
    else:
        log_test(7, "Admin order update creates notification", False, 
                f"Failed to get notifications - Status {notif_status2}: {notif_data2}")


def test_step_8_admin_create_category():
    """Step 8: POST /api/admin/categories → create category"""
    global category_id
    
    payload = {
        "slug": "test-cat",
        "name": "Test Cat",
        "icon": "Leaf"
    }
    
    success, data, status = make_request('POST', '/admin/categories', token=admin_token, json_data=payload)
    
    if success and status == 200:
        if 'id' in data and data.get('slug') == 'test-cat':
            category_id = data['id']
            log_test(8, "POST /api/admin/categories (create)", True, 
                    f"Created category: {data.get('name')} (id: {category_id})")
        else:
            log_test(8, "POST /api/admin/categories (create)", False, 
                    f"Missing id or incorrect slug in response: {data}")
    else:
        log_test(8, "POST /api/admin/categories (create)", False, 
                f"Status {status}: {data}")


def test_step_9_admin_update_category():
    """Step 9: PUT /api/admin/categories/{id} → update category"""
    payload = {
        "slug": "test-cat",
        "name": "Updated Test Category",
        "icon": "Leaf"
    }
    
    success, data, status = make_request('PUT', f'/admin/categories/{category_id}', 
                                        token=admin_token, json_data=payload)
    
    if success and status == 200:
        if data.get('name') == 'Updated Test Category':
            log_test(9, "PUT /api/admin/categories/{id} (update)", True, 
                    f"Updated category name to: {data.get('name')}")
        else:
            log_test(9, "PUT /api/admin/categories/{id} (update)", False, 
                    f"Name not updated correctly: {data.get('name')}")
    else:
        log_test(9, "PUT /api/admin/categories/{id} (update)", False, 
                f"Status {status}: {data}")


def test_step_10_admin_delete_category():
    """Step 10: DELETE /api/admin/categories/{id} → delete category"""
    success, data, status = make_request('DELETE', f'/admin/categories/{category_id}', token=admin_token)
    
    if success and status == 200:
        log_test(10, "DELETE /api/admin/categories/{id} (delete)", True, 
                f"Deleted category successfully")
    else:
        log_test(10, "DELETE /api/admin/categories/{id} (delete)", False, 
                f"Status {status}: {data}")


def test_step_11_admin_analytics():
    """Step 11: GET /api/admin/analytics → expect {series (14 items), statusCounts, methodCounts, topProducts, totalRevenue, totalOrders}"""
    success, data, status = make_request('GET', '/admin/analytics', token=admin_token)
    
    if success and status == 200:
        required_keys = ['series', 'statusCounts', 'methodCounts', 'topProducts', 'totalRevenue', 'totalOrders']
        missing_keys = [k for k in required_keys if k not in data]
        
        if not missing_keys:
            # Check series has 14 items
            if isinstance(data.get('series'), list) and len(data['series']) == 14:
                log_test(11, "GET /api/admin/analytics", True, 
                        f"Analytics returned all required fields. Series: {len(data['series'])} items, "
                        f"Total Revenue: ৳{data['totalRevenue']}, Total Orders: {data['totalOrders']}")
            else:
                log_test(11, "GET /api/admin/analytics", False, 
                        f"Series should have 14 items, got {len(data.get('series', []))} items")
        else:
            log_test(11, "GET /api/admin/analytics", False, 
                    f"Missing required keys: {missing_keys}")
    else:
        log_test(11, "GET /api/admin/analytics", False, 
                f"Status {status}: {data}")


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
    print(f"{BLUE}Starting Backend Notification & Admin Endpoint Tests{RESET}")
    print(f"Backend URL: {BASE_URL}\n")
    
    # Run all tests in sequence
    test_step_1_signup_with_welcome_notification()
    test_step_2_get_notifications()
    test_step_3_unread_count()
    test_step_4_mark_notification_read()
    test_step_5_mark_all_read()
    test_step_6_order_creates_notification()
    test_step_7_admin_order_update_notification()
    test_step_8_admin_create_category()
    test_step_9_admin_update_category()
    test_step_10_admin_delete_category()
    test_step_11_admin_analytics()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()

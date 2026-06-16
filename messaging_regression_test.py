#!/usr/bin/env python3
"""
Messaging/Support Regression Test for প্রকৃতির ঘ্রাণ (Sobuj Organic Shop)
Tests customer-admin messaging, profile updates, and notifications
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# Backend URL
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
    global customer_token, customer_email, customer_id
    
    import random
    customer_email = f"রহিম{random.randint(10000, 99999)}@test.com"
    
    payload = {
        "name": "রহিম আহমেদ",
        "email": customer_email,
        "phone": "01711888999",
        "password": "customer123"
    }
    
    success, data, status = make_request('POST', '/auth/signup', json_data=payload)
    
    if success and status == 200:
        if 'token' in data and 'user' in data:
            customer_token = data['token']
            customer_id = data['user'].get('id')
            log_test(1, "POST /api/auth/signup with fresh customer", True, 
                    f"Created user {customer_email}, got token and user id: {customer_id}")
        else:
            log_test(1, "POST /api/auth/signup with fresh customer", False, 
                    f"Missing token or user in response: {data}")
    else:
        log_test(1, "POST /api/auth/signup with fresh customer", False, 
                f"Status {status}: {data}")


def test_step_2_admin_login():
    """Step 2: POST /api/auth/login admin → get admin token"""
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
                log_test(2, "POST /api/auth/login admin → get admin token", True, 
                        f"Admin login successful, role confirmed")
            else:
                log_test(2, "POST /api/auth/login admin → get admin token", False, 
                        f"Role is not admin: {data['user'].get('role')}")
        else:
            log_test(2, "POST /api/auth/login admin → get admin token", False, 
                    f"Missing token or user: {data}")
    else:
        log_test(2, "POST /api/auth/login admin → get admin token", False, 
                f"Status {status}: {data}")


def test_step_3_update_profile():
    """Step 3: PATCH /api/auth/me with name, phone, avatar → verify updated values"""
    
    # Update profile
    update_payload = {
        "name": "Updated Name",
        "phone": "01711999888",
        "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    }
    
    success, data, status = make_request('PATCH', '/auth/me', token=customer_token, json_data=update_payload)
    
    if not success or status != 200:
        log_test(3, "PATCH /api/auth/me with name, phone, avatar", False, 
                f"Update failed - Status {status}: {data}")
        return
    
    # Verify updated values
    if (data.get('name') == "Updated Name" and 
        data.get('phone') == "01711999888" and 
        data.get('avatar') == update_payload['avatar']):
        
        # Also verify with GET /api/auth/me
        success2, data2, status2 = make_request('GET', '/auth/me', token=customer_token)
        
        if success2 and status2 == 200:
            if (data2.get('name') == "Updated Name" and 
                data2.get('phone') == "01711999888" and 
                data2.get('avatar') == update_payload['avatar']):
                log_test(3, "PATCH /api/auth/me with name, phone, avatar", True, 
                        f"Profile updated successfully, GET /api/auth/me returns new values including avatar")
            else:
                log_test(3, "PATCH /api/auth/me with name, phone, avatar", False, 
                        f"GET /api/auth/me doesn't return updated values: {data2}")
        else:
            log_test(3, "PATCH /api/auth/me with name, phone, avatar", False, 
                    f"GET /api/auth/me failed - Status {status2}: {data2}")
    else:
        log_test(3, "PATCH /api/auth/me with name, phone, avatar", False, 
                f"Updated values don't match expected: {data}")


def test_step_4_send_customer_message():
    """Step 4: POST /api/messages (customer) with text → expect 200 + message object with fromAdmin=false"""
    
    payload = {
        "text": "Hi, when is my order coming?"
    }
    
    success, data, status = make_request('POST', '/messages', token=customer_token, json_data=payload)
    
    if success and status == 200:
        if (isinstance(data, dict) and 
            data.get('text') == "Hi, when is my order coming?" and 
            data.get('fromAdmin') == False and
            'id' in data):
            log_test(4, "POST /api/messages (customer) with text", True, 
                    f"Message created with id={data['id']}, fromAdmin=false")
        else:
            log_test(4, "POST /api/messages (customer) with text", False, 
                    f"Message object incorrect: {data}")
    else:
        log_test(4, "POST /api/messages (customer) with text", False, 
                f"Status {status}: {data}")


def test_step_5_get_customer_messages():
    """Step 5: GET /api/messages (customer) → expect at least 1 message"""
    
    success, data, status = make_request('GET', '/messages', token=customer_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 1:
            log_test(5, "GET /api/messages (customer)", True, 
                    f"Found {len(data)} message(s)")
        else:
            log_test(5, "GET /api/messages (customer)", False, 
                    f"Expected at least 1 message, got {len(data) if isinstance(data, list) else 'non-list'}: {data}")
    else:
        log_test(5, "GET /api/messages (customer)", False, 
                f"Status {status}: {data}")


def test_step_6_unread_count_customer():
    """Step 6: GET /api/messages/unread-count (customer) → expect {count: 0}"""
    
    success, data, status = make_request('GET', '/messages/unread-count', token=customer_token)
    
    if success and status == 200:
        if isinstance(data, dict) and data.get('count') == 0:
            log_test(6, "GET /api/messages/unread-count (customer)", True, 
                    f"Unread count is 0 (own messages don't count)")
        else:
            log_test(6, "GET /api/messages/unread-count (customer)", False, 
                    f"Expected count=0, got: {data}")
    else:
        log_test(6, "GET /api/messages/unread-count (customer)", False, 
                f"Status {status}: {data}")


def test_step_7_admin_threads():
    """Step 7: GET /api/admin/messages/threads (admin) → expect at least 1 thread"""
    
    success, data, status = make_request('GET', '/admin/messages/threads', token=admin_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 1:
            # Find our customer's thread
            customer_thread = None
            for thread in data:
                if thread.get('userId') == customer_id:
                    customer_thread = thread
                    break
            
            if customer_thread:
                if ('lastMessage' in customer_thread and 
                    customer_thread.get('unread', 0) > 0):
                    log_test(7, "GET /api/admin/messages/threads (admin)", True, 
                            f"Found {len(data)} thread(s), customer thread has lastMessage and unread={customer_thread['unread']}")
                else:
                    log_test(7, "GET /api/admin/messages/threads (admin)", False, 
                            f"Customer thread missing lastMessage or unread count: {customer_thread}")
            else:
                log_test(7, "GET /api/admin/messages/threads (admin)", False, 
                        f"Customer thread not found in {len(data)} threads")
        else:
            log_test(7, "GET /api/admin/messages/threads (admin)", False, 
                    f"Expected at least 1 thread, got {len(data) if isinstance(data, list) else 'non-list'}: {data}")
    else:
        log_test(7, "GET /api/admin/messages/threads (admin)", False, 
                f"Status {status}: {data}")


def test_step_8_admin_get_messages():
    """Step 8: GET /api/admin/messages/{customer_id} (admin) → expect list of messages"""
    
    success, data, status = make_request('GET', f'/admin/messages/{customer_id}', token=admin_token)
    
    if success and status == 200:
        if isinstance(data, list) and len(data) >= 1:
            log_test(8, "GET /api/admin/messages/{customer_id} (admin)", True, 
                    f"Found {len(data)} message(s) for customer")
        else:
            log_test(8, "GET /api/admin/messages/{customer_id} (admin)", False, 
                    f"Expected at least 1 message, got {len(data) if isinstance(data, list) else 'non-list'}: {data}")
    else:
        log_test(8, "GET /api/admin/messages/{customer_id} (admin)", False, 
                f"Status {status}: {data}")


def test_step_9_admin_send_message():
    """Step 9: POST /api/admin/messages (admin) → expect 200 and notification"""
    
    payload = {
        "userId": customer_id,
        "text": "Your order will arrive tomorrow"
    }
    
    success, data, status = make_request('POST', '/admin/messages', token=admin_token, json_data=payload)
    
    if not success or status != 200:
        log_test(9, "POST /api/admin/messages (admin)", False, 
                f"Admin message send failed - Status {status}: {data}")
        return
    
    if not (isinstance(data, dict) and 
            data.get('text') == "Your order will arrive tomorrow" and 
            data.get('fromAdmin') == True):
        log_test(9, "POST /api/admin/messages (admin)", False, 
                f"Message object incorrect: {data}")
        return
    
    # Wait a moment for notification to be created
    time.sleep(0.5)
    
    # Check if customer received notification
    success2, data2, status2 = make_request('GET', '/notifications', token=customer_token)
    
    if success2 and status2 == 200:
        if isinstance(data2, list):
            # Look for notification with "support" or "reply" in title
            notification_found = False
            for notif in data2:
                title = notif.get('title', '').lower()
                body = notif.get('body', '').lower()
                if 'support' in title or 'reply' in title or 'Your order will arrive tomorrow' in notif.get('body', ''):
                    notification_found = True
                    break
            
            if notification_found:
                log_test(9, "POST /api/admin/messages (admin)", True, 
                        f"Admin message sent successfully, customer received notification")
            else:
                log_test(9, "POST /api/admin/messages (admin)", False, 
                        f"Admin message sent but notification not found in customer's notifications: {data2}")
        else:
            log_test(9, "POST /api/admin/messages (admin)", False, 
                    f"Notifications endpoint returned non-list: {data2}")
    else:
        log_test(9, "POST /api/admin/messages (admin)", False, 
                f"Could not verify notification - Status {status2}: {data2}")


def test_step_10_unread_count_after_admin_reply():
    """Step 10: GET /api/messages/unread-count (customer) → expect {count: 1}"""
    
    success, data, status = make_request('GET', '/messages/unread-count', token=customer_token)
    
    if success and status == 200:
        if isinstance(data, dict) and data.get('count') == 1:
            log_test(10, "GET /api/messages/unread-count (customer) after admin reply", True, 
                    f"Unread count is 1 (admin reply)")
        else:
            log_test(10, "GET /api/messages/unread-count (customer) after admin reply", False, 
                    f"Expected count=1, got: {data}")
    else:
        log_test(10, "GET /api/messages/unread-count (customer) after admin reply", False, 
                f"Status {status}: {data}")


def test_step_11_auto_mark_read():
    """Step 11: GET /api/messages (customer) → auto-mark as read, subsequent unread-count should be 0"""
    
    # Fetch messages (should auto-mark admin messages as read)
    success, data, status = make_request('GET', '/messages', token=customer_token)
    
    if not success or status != 200:
        log_test(11, "GET /api/messages auto-marks admin messages as read", False, 
                f"GET /messages failed - Status {status}: {data}")
        return
    
    # Wait a moment
    time.sleep(0.5)
    
    # Check unread count again
    success2, data2, status2 = make_request('GET', '/messages/unread-count', token=customer_token)
    
    if success2 and status2 == 200:
        if isinstance(data2, dict) and data2.get('count') == 0:
            log_test(11, "GET /api/messages auto-marks admin messages as read", True, 
                    f"After fetching messages, unread count is now 0")
        else:
            log_test(11, "GET /api/messages auto-marks admin messages as read", False, 
                    f"Expected count=0 after fetching, got: {data2}")
    else:
        log_test(11, "GET /api/messages auto-marks admin messages as read", False, 
                f"Unread count check failed - Status {status2}: {data2}")


def test_step_12_empty_message():
    """Step 12: POST /api/admin/messages with empty text → expect 400"""
    
    payload = {
        "userId": customer_id,
        "text": ""
    }
    
    success, data, status = make_request('POST', '/admin/messages', token=admin_token, json_data=payload)
    
    if not success and status == 400:
        log_test(12, "POST /api/admin/messages with empty text", True, 
                f"Correctly rejected with status 400")
    else:
        log_test(12, "POST /api/admin/messages with empty text", False, 
                f"Expected 400, got {status}: {data}")


def test_step_13_non_admin_access():
    """Step 13: Verify non-admin user CANNOT call /api/admin/messages/threads → expect 403"""
    
    success, data, status = make_request('GET', '/admin/messages/threads', token=customer_token)
    
    if not success and status == 403:
        log_test(13, "Non-admin cannot access /api/admin/messages/threads", True, 
                f"Correctly rejected with status 403")
    else:
        log_test(13, "Non-admin cannot access /api/admin/messages/threads", False, 
                f"Expected 403, got {status}: {data}")


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
    print(f"{BLUE}Starting Messaging/Support Regression Test{RESET}")
    print(f"Backend URL: {BASE_URL}\n")
    
    # Run all tests in sequence
    test_step_1_signup()
    test_step_2_admin_login()
    test_step_3_update_profile()
    test_step_4_send_customer_message()
    test_step_5_get_customer_messages()
    test_step_6_unread_count_customer()
    test_step_7_admin_threads()
    test_step_8_admin_get_messages()
    test_step_9_admin_send_message()
    test_step_10_unread_count_after_admin_reply()
    test_step_11_auto_mark_read()
    test_step_12_empty_message()
    test_step_13_non_admin_access()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()

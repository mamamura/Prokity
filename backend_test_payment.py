#!/usr/bin/env python3
"""
Test script for manual payment & settings endpoints
Testing "প্রকৃতির ঘ্রাণ" organic shop payment flow
"""
import requests
import json
import sys

BASE_URL = "https://no-signup-shop-1.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@organicshop.com"
ADMIN_PASSWORD = "admin123"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

test_results = []
admin_token = None
customer_token = None
customer_id = None
bkash_order_id = None
cod_order_id = None
bkash_order_id_2 = None

def log_test(step, description, passed, details=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"\n{status} - Step {step}: {description}")
    if details:
        print(f"  Details: {details}")
    test_results.append({
        'step': step,
        'description': description,
        'passed': passed,
        'details': details
    })

def print_summary():
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for t in test_results if t['passed'])
    failed = sum(1 for t in test_results if not t['passed'])
    print(f"Total: {len(test_results)} | {GREEN}Passed: {passed}{RESET} | {RED}Failed: {failed}{RESET}")
    
    if failed > 0:
        print(f"\n{RED}FAILED TESTS:{RESET}")
        for t in test_results:
            if not t['passed']:
                print(f"  Step {t['step']}: {t['description']}")
                if t['details']:
                    print(f"    {t['details']}")
    print("="*80)

# Step 0: Setup - Admin login
print(f"\n{YELLOW}=== SETUP: Admin Login ==={RESET}")
try:
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        admin_token = data.get('token')
        print(f"{GREEN}✓ Admin login successful{RESET}")
    else:
        print(f"{RED}✗ Admin login failed: {resp.status_code} - {resp.text}{RESET}")
        sys.exit(1)
except Exception as e:
    print(f"{RED}✗ Admin login error: {str(e)}{RESET}")
    sys.exit(1)

# Step 0b: Setup - Create fresh customer
print(f"\n{YELLOW}=== SETUP: Create Fresh Customer ==={RESET}")
try:
    import random
    customer_email = f"customer{random.randint(1000, 9999)}@test.com"
    resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": "রহিম আহমেদ",
        "email": customer_email,
        "phone": "01711222333",
        "password": "customer123"
    })
    if resp.status_code == 200:
        data = resp.json()
        customer_token = data.get('token')
        customer_id = data.get('user', {}).get('id')
        print(f"{GREEN}✓ Customer created: {customer_email}{RESET}")
    else:
        print(f"{RED}✗ Customer signup failed: {resp.status_code} - {resp.text}{RESET}")
        sys.exit(1)
except Exception as e:
    print(f"{RED}✗ Customer signup error: {str(e)}{RESET}")
    sys.exit(1)

print(f"\n{YELLOW}=== STARTING PAYMENT & SETTINGS TESTS ==={RESET}")

# Step 1: GET /api/settings/payment (no auth) - expect default seeded values
try:
    resp = requests.get(f"{BASE_URL}/settings/payment")
    if resp.status_code == 200:
        data = resp.json()
        required_fields = ['bkashNumber', 'nagadNumber', 'instructions', 'bkashType', 'nagadType']
        has_all_fields = all(field in data for field in required_fields)
        if has_all_fields:
            log_test(1, "GET /api/settings/payment (no auth)", True, 
                    f"bkashNumber={data.get('bkashNumber')}, nagadNumber={data.get('nagadNumber')}, bkashType={data.get('bkashType')}, nagadType={data.get('nagadType')}")
        else:
            missing = [f for f in required_fields if f not in data]
            log_test(1, "GET /api/settings/payment (no auth)", False, f"Missing fields: {missing}")
    else:
        log_test(1, "GET /api/settings/payment (no auth)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(1, "GET /api/settings/payment (no auth)", False, str(e))

# Step 2: PUT /api/admin/settings/payment (admin) - update settings
try:
    new_settings = {
        "bkashNumber": "01700123456",
        "nagadNumber": "01900987654",
        "bkashType": "merchant",
        "nagadType": "personal",
        "instructions": "Send money to above and enter TrxID."
    }
    resp = requests.put(f"{BASE_URL}/admin/settings/payment", 
                       json=new_settings,
                       headers={"Authorization": f"Bearer {admin_token}"})
    if resp.status_code == 200:
        data = resp.json()
        matches = all(data.get(k) == v for k, v in new_settings.items())
        if matches:
            log_test(2, "PUT /api/admin/settings/payment (admin)", True, "Settings updated successfully")
        else:
            log_test(2, "PUT /api/admin/settings/payment (admin)", False, f"Response doesn't match: {data}")
    else:
        log_test(2, "PUT /api/admin/settings/payment (admin)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(2, "PUT /api/admin/settings/payment (admin)", False, str(e))

# Step 3: PUT /api/admin/settings/payment WITHOUT admin token - expect 401/403
try:
    resp = requests.put(f"{BASE_URL}/admin/settings/payment", 
                       json={"bkashNumber": "01700000000"})
    if resp.status_code in [401, 403]:
        log_test(3, "PUT /api/admin/settings/payment (no auth)", True, f"Correctly rejected with {resp.status_code}")
    else:
        log_test(3, "PUT /api/admin/settings/payment (no auth)", False, f"Expected 401/403, got {resp.status_code}")
except Exception as e:
    log_test(3, "PUT /api/admin/settings/payment (no auth)", False, str(e))

# Step 4: GET /api/settings/payment again - expect updated values
try:
    resp = requests.get(f"{BASE_URL}/settings/payment")
    if resp.status_code == 200:
        data = resp.json()
        if (data.get('bkashNumber') == '01700123456' and 
            data.get('nagadNumber') == '01900987654' and
            data.get('bkashType') == 'merchant' and
            data.get('nagadType') == 'personal'):
            log_test(4, "GET /api/settings/payment (verify update)", True, "Updated values confirmed")
        else:
            log_test(4, "GET /api/settings/payment (verify update)", False, f"Values not updated: {data}")
    else:
        log_test(4, "GET /api/settings/payment (verify update)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(4, "GET /api/settings/payment (verify update)", False, str(e))

# Step 5: POST /api/orders with bkash but NO paymentTxn - expect 400
try:
    order_data = {
        "items": [{"productId": "test-id", "name": "Test Product", "image": "test.jpg", "price": 100, "qty": 1}],
        "address": {"fullName": "রহিম আহমেদ", "phone": "01711222333", "address": "123 Test St", "area": "Mirpur", "city": "Dhaka"},
        "paymentMethod": "bkash",
        "paymentPhone": "01711000000",
        # Missing paymentTxn
        "subtotal": 100,
        "delivery": 50,
        "total": 150
    }
    resp = requests.post(f"{BASE_URL}/orders", 
                        json=order_data,
                        headers={"Authorization": f"Bearer {customer_token}"})
    if resp.status_code == 400:
        log_test(5, "POST /api/orders (bkash without paymentTxn)", True, f"Correctly rejected with 400: {resp.json().get('detail', '')}")
    else:
        log_test(5, "POST /api/orders (bkash without paymentTxn)", False, f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test(5, "POST /api/orders (bkash without paymentTxn)", False, str(e))

# Step 6: POST /api/orders with bkash + paymentTxn - expect 200, status=pending, paymentStatus=pending
try:
    order_data = {
        "items": [{"productId": "test-id", "name": "মধু", "image": "honey.jpg", "price": 500, "qty": 2, "unit": "500g"}],
        "address": {"fullName": "রহিম আহমেদ", "phone": "01711222333", "address": "বাড়ি ১২৩, রোড ৫", "area": "মিরপুর", "city": "ঢাকা"},
        "paymentMethod": "bkash",
        "paymentPhone": "01711000000",
        "paymentTxn": "ABC123XYZ",
        "subtotal": 1000,
        "delivery": 60,
        "total": 1060
    }
    resp = requests.post(f"{BASE_URL}/orders", 
                        json=order_data,
                        headers={"Authorization": f"Bearer {customer_token}"})
    if resp.status_code == 200:
        data = resp.json()
        bkash_order_id = data.get('id')
        if (data.get('status') == 'pending' and 
            data.get('paymentStatus') == 'pending' and 
            data.get('orderNo')):
            log_test(6, "POST /api/orders (bkash with paymentTxn)", True, 
                    f"Order created: {data.get('orderNo')}, status={data.get('status')}, paymentStatus={data.get('paymentStatus')}")
        else:
            log_test(6, "POST /api/orders (bkash with paymentTxn)", False, 
                    f"Unexpected values: status={data.get('status')}, paymentStatus={data.get('paymentStatus')}, orderNo={data.get('orderNo')}")
    else:
        log_test(6, "POST /api/orders (bkash with paymentTxn)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(6, "POST /api/orders (bkash with paymentTxn)", False, str(e))

# Step 7: POST /api/orders with COD - expect status=pending, paymentStatus=unpaid
try:
    order_data = {
        "items": [{"productId": "test-id-2", "name": "চাল", "image": "rice.jpg", "price": 800, "qty": 1, "unit": "5kg"}],
        "address": {"fullName": "রহিম আহমেদ", "phone": "01711222333", "address": "বাড়ি ১২৩, রোড ৫", "area": "মিরপুর", "city": "ঢাকা"},
        "paymentMethod": "cod",
        "subtotal": 800,
        "delivery": 60,
        "total": 860
    }
    resp = requests.post(f"{BASE_URL}/orders", 
                        json=order_data,
                        headers={"Authorization": f"Bearer {customer_token}"})
    if resp.status_code == 200:
        data = resp.json()
        cod_order_id = data.get('id')
        if (data.get('status') == 'pending' and 
            data.get('paymentStatus') == 'unpaid'):
            log_test(7, "POST /api/orders (COD)", True, 
                    f"COD order created: {data.get('orderNo')}, status={data.get('status')}, paymentStatus={data.get('paymentStatus')}")
        else:
            log_test(7, "POST /api/orders (COD)", False, 
                    f"Unexpected values: status={data.get('status')}, paymentStatus={data.get('paymentStatus')}")
    else:
        log_test(7, "POST /api/orders (COD)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(7, "POST /api/orders (COD)", False, str(e))

# Step 8: PATCH /api/admin/orders/{bkash_order_id}/payment (admin) - expect paymentStatus=paid, status=confirmed, notification
try:
    if not bkash_order_id:
        log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", False, "No bkash order ID from step 6")
    else:
        resp = requests.patch(f"{BASE_URL}/admin/orders/{bkash_order_id}/payment",
                             json={"status": "paid"},
                             headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            data = resp.json()
            if (data.get('paymentStatus') == 'paid' and 
                data.get('status') == 'confirmed'):
                # Check customer notification
                notif_resp = requests.get(f"{BASE_URL}/notifications",
                                         headers={"Authorization": f"Bearer {customer_token}"})
                if notif_resp.status_code == 200:
                    notifications = notif_resp.json()
                    payment_notif = any('পেমেন্ট কনফার্ম' in n.get('title', '') for n in notifications)
                    if payment_notif:
                        log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", True, 
                                f"Payment verified: paymentStatus=paid, status=confirmed, customer notification sent")
                    else:
                        log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", False, 
                                "Payment verified but no customer notification found")
                else:
                    log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", False, 
                            f"Payment verified but couldn't check notifications: {notif_resp.status_code}")
            else:
                log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", False, 
                        f"Unexpected values: paymentStatus={data.get('paymentStatus')}, status={data.get('status')}")
        else:
            log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(8, "PATCH /api/admin/orders/{id}/payment (bkash order)", False, str(e))

# Step 9: PATCH /api/admin/orders/{cod_order_id}/payment (admin) - expect 400
try:
    if not cod_order_id:
        log_test(9, "PATCH /api/admin/orders/{id}/payment (COD order)", False, "No COD order ID from step 7")
    else:
        resp = requests.patch(f"{BASE_URL}/admin/orders/{cod_order_id}/payment",
                             json={"status": "paid"},
                             headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 400:
            detail = resp.json().get('detail', '')
            if 'COD' in detail or 'cod' in detail.lower():
                log_test(9, "PATCH /api/admin/orders/{id}/payment (COD order)", True, 
                        f"Correctly rejected COD payment verification: {detail}")
            else:
                log_test(9, "PATCH /api/admin/orders/{id}/payment (COD order)", False, 
                        f"Got 400 but unexpected message: {detail}")
        else:
            log_test(9, "PATCH /api/admin/orders/{id}/payment (COD order)", False, 
                    f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test(9, "PATCH /api/admin/orders/{id}/payment (COD order)", False, str(e))

# Step 10: Create another bkash order, PATCH with status=rejected - expect paymentStatus=rejected, notification with note
try:
    # Create another bkash order
    order_data = {
        "items": [{"productId": "test-id-3", "name": "ডাল", "image": "dal.jpg", "price": 150, "qty": 2, "unit": "1kg"}],
        "address": {"fullName": "রহিম আহমেদ", "phone": "01711222333", "address": "বাড়ি ১২৩, রোড ৫", "area": "মিরপুর", "city": "ঢাকা"},
        "paymentMethod": "bkash",
        "paymentPhone": "01711000000",
        "paymentTxn": "WRONG123",
        "subtotal": 300,
        "delivery": 60,
        "total": 360
    }
    resp = requests.post(f"{BASE_URL}/orders", 
                        json=order_data,
                        headers={"Authorization": f"Bearer {customer_token}"})
    if resp.status_code == 200:
        bkash_order_id_2 = resp.json().get('id')
        
        # Now reject the payment
        resp = requests.patch(f"{BASE_URL}/admin/orders/{bkash_order_id_2}/payment",
                             json={"status": "rejected", "note": "Wrong TrxID"},
                             headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            data = resp.json()
            if data.get('paymentStatus') == 'rejected':
                # Check customer notification
                notif_resp = requests.get(f"{BASE_URL}/notifications",
                                         headers={"Authorization": f"Bearer {customer_token}"})
                if notif_resp.status_code == 200:
                    notifications = notif_resp.json()
                    reject_notif = None
                    for n in notifications:
                        if 'পেমেন্ট সমস্যা' in n.get('title', ''):
                            reject_notif = n
                            break
                    if reject_notif:
                        # Check if note is in notification body
                        body = reject_notif.get('body', '')
                        if 'Wrong TrxID' in body or 'ট্রানজেকশন আইডি' in body:
                            log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", True, 
                                    f"Payment rejected: paymentStatus=rejected, customer notification with note sent")
                        else:
                            log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, 
                                    f"Payment rejected but note not in notification body: {body}")
                    else:
                        log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, 
                                "Payment rejected but no rejection notification found")
                else:
                    log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, 
                            f"Payment rejected but couldn't check notifications: {notif_resp.status_code}")
            else:
                log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, 
                        f"Expected paymentStatus=rejected, got {data.get('paymentStatus')}")
        else:
            log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, 
                    f"Reject request failed: {resp.status_code} - {resp.text}")
    else:
        log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, 
                f"Failed to create second bkash order: {resp.status_code}")
except Exception as e:
    log_test(10, "PATCH /api/admin/orders/{id}/payment (reject)", False, str(e))

# Step 11: GET /api/orders/{order_id} as customer - verify all fields including paymentNote
try:
    if not bkash_order_id:
        log_test(11, "GET /api/orders/{id} (customer)", False, "No bkash order ID from step 6")
    else:
        resp = requests.get(f"{BASE_URL}/orders/{bkash_order_id}",
                           headers={"Authorization": f"Bearer {customer_token}"})
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ['id', 'orderNo', 'userId', 'items', 'address', 'paymentMethod', 
                             'paymentPhone', 'paymentTxn', 'paymentNote', 'paymentStatus', 'status', 'total']
            has_all_fields = all(field in data for field in required_fields)
            if has_all_fields:
                log_test(11, "GET /api/orders/{id} (customer)", True, 
                        f"Order retrieved with all fields including paymentNote={data.get('paymentNote')}")
            else:
                missing = [f for f in required_fields if f not in data]
                log_test(11, "GET /api/orders/{id} (customer)", False, f"Missing fields: {missing}")
        else:
            log_test(11, "GET /api/orders/{id} (customer)", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test(11, "GET /api/orders/{id} (customer)", False, str(e))

# Print summary
print_summary()

# Exit with appropriate code
sys.exit(0 if all(t['passed'] for t in test_results) else 1)

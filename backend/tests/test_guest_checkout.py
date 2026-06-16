"""Backend tests for guest checkout, public order tracking, site settings (pricing/delivery).

Covers feature set requested in iteration 3 review:
 - POST /api/orders without auth (guest) → success, user_id null
 - GET /api/orders/track/{orderNo}?phone=... → success with matching phone, 403 with wrong phone
 - GET /api/settings/site → returns pricing fields
 - PUT /api/admin/settings/site → admin can update globalDiscountPercent/Label/taxPercent/minOrderAmount/deliveryFee/freeDeliveryAbove
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break
API = f"{BASE_URL}/api"

ADMIN_EMAIL = 'admin@organicshop.com'
ADMIN_PASS = 'admin123'


def H(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


@pytest.fixture(scope='module')
def admin_token():
    r = requests.post(f"{API}/auth/login",
                      json={'email': ADMIN_EMAIL, 'password': ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"admin login: {r.status_code} {r.text}"
    return r.json()['token']


@pytest.fixture(scope='module')
def a_product():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert len(items) > 0, 'No products to test with'
    # pick one in stock
    for p in items:
        if (p.get('stock') or 0) > 5:
            return p
    return items[0]


# ---------------- 1. SITE SETTINGS GET (public) ----------------
class TestSiteSettingsPublic:
    def test_get_settings_has_pricing_fields(self):
        r = requests.get(f"{API}/settings/site", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ['globalDiscountPercent', 'globalDiscountLabel',
                    'taxPercent', 'minOrderAmount',
                    'deliveryFee', 'freeDeliveryAbove']:
            assert key in data, f"missing key {key} in /settings/site"


# ---------------- 2. ADMIN SETTINGS UPDATE ----------------
class TestAdminSettingsUpdate:
    def test_update_pricing_and_persist(self, admin_token):
        # snapshot current
        original = requests.get(f"{API}/settings/site").json()

        payload = {**original,
                   'globalDiscountPercent': 10,
                   'globalDiscountLabel': 'টেস্ট ডিসকাউন্ট',
                   'taxPercent': 5,
                   'minOrderAmount': 200,
                   'deliveryFee': 70,
                   'freeDeliveryAbove': 800}
        r = requests.put(f"{API}/admin/settings/site", json=payload,
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text

        verify = requests.get(f"{API}/settings/site").json()
        assert verify['globalDiscountPercent'] == 10
        assert verify['globalDiscountLabel'] == 'টেস্ট ডিসকাউন্ট'
        assert verify['taxPercent'] == 5
        assert verify['minOrderAmount'] == 200
        assert verify['deliveryFee'] == 70
        assert verify['freeDeliveryAbove'] == 800

        # reset to defaults so other tests / UI aren't affected
        reset_payload = {**original,
                         'globalDiscountPercent': 0,
                         'globalDiscountLabel': '',
                         'taxPercent': 0,
                         'minOrderAmount': 0,
                         'deliveryFee': original.get('deliveryFee', 60),
                         'freeDeliveryAbove': original.get('freeDeliveryAbove', 500)}
        rr = requests.put(f"{API}/admin/settings/site", json=reset_payload,
                          headers=H(admin_token), timeout=15)
        assert rr.status_code == 200

    def test_update_pricing_requires_admin(self):
        r = requests.put(f"{API}/admin/settings/site",
                         json={'globalDiscountPercent': 50}, timeout=10)
        assert r.status_code in (401, 403)


# ---------------- 3. GUEST CHECKOUT ----------------
class TestGuestCheckout:
    def test_guest_can_place_order_without_auth(self, a_product):
        p = a_product
        payload = {
            'items': [{'productId': p['id'], 'name': p['name'],
                       'image': p.get('image', ''), 'price': p['price'],
                       'qty': 1, 'unit': p.get('unit', '1 kg')}],
            'address': {
                'fullName': 'গেস্ট টেস্ট',
                'phone': '01711111111',
                'address': 'Test address 1',
                'area': 'Mirpur',
                'city': 'Dhaka',
                'district': 'Dhaka',
                'division': 'Dhaka',
                'postalCode': '1216',
            },
            'paymentMethod': 'cod',
            'subtotal': p['price'],
            'delivery': 60,
            'discount': 0,
            'total': p['price'] + 60,
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        order = r.json()
        # Guest order assertions
        assert order.get('userId') is None, f"expected userId None for guest, got {order.get('userId')}"
        assert order.get('guest') is True
        assert order.get('userName') == 'গেস্ট টেস্ট'
        assert order.get('userPhone') == '01711111111'
        assert order['orderNo'].startswith('ORD-')
        assert order['paymentMethod'] == 'cod'
        assert order['paymentStatus'] == 'unpaid'
        # stash for next test
        TestGuestCheckout._order = order

    def test_guest_order_missing_name_phone_rejected(self, a_product):
        p = a_product
        payload = {
            'items': [{'productId': p['id'], 'name': p['name'],
                       'image': '', 'price': p['price'],
                       'qty': 1, 'unit': p.get('unit', '1 kg')}],
            'address': {
                'fullName': '',
                'phone': '',
                'address': 'a',
                'area': 'b',
            },
            'paymentMethod': 'cod',
            'subtotal': p['price'], 'delivery': 60, 'total': p['price'] + 60,
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 400, r.text


# ---------------- 4. PUBLIC ORDER TRACKING ----------------
class TestPublicTracking:
    def _place_guest_order(self, a_product):
        p = a_product
        payload = {
            'items': [{'productId': p['id'], 'name': p['name'],
                       'image': '', 'price': p['price'], 'qty': 1,
                       'unit': p.get('unit', '1 kg')}],
            'address': {
                'fullName': 'Tracker Test',
                'phone': '01988887777',
                'address': 'Lane 5', 'area': 'Dhanmondi',
            },
            'paymentMethod': 'cod',
            'subtotal': p['price'], 'delivery': 60, 'total': p['price'] + 60,
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        return r.json()

    def test_track_with_correct_phone(self, a_product):
        o = self._place_guest_order(a_product)
        r = requests.get(f"{API}/orders/track/{o['orderNo']}",
                         params={'phone': '01988887777'}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data['orderNo'] == o['orderNo']
        assert data['userPhone'] == '01988887777'
        # statusHistory has at least the initial pending entry
        assert isinstance(data.get('statusHistory'), list)
        assert len(data['statusHistory']) >= 1

    def test_track_with_last_6_digits(self, a_product):
        o = self._place_guest_order(a_product)
        # last 6 digits should also match
        r = requests.get(f"{API}/orders/track/{o['orderNo']}",
                         params={'phone': '887777'}, timeout=15)
        assert r.status_code == 200, r.text

    def test_track_wrong_phone_rejected(self, a_product):
        o = self._place_guest_order(a_product)
        r = requests.get(f"{API}/orders/track/{o['orderNo']}",
                         params={'phone': '01000000000'}, timeout=15)
        assert r.status_code == 403, r.text

    def test_track_missing_phone_rejected(self, a_product):
        o = self._place_guest_order(a_product)
        r = requests.get(f"{API}/orders/track/{o['orderNo']}",
                         params={'phone': ''}, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_track_unknown_order_returns_404(self):
        r = requests.get(f"{API}/orders/track/ORD-NOPE-9999",
                         params={'phone': '01711111111'}, timeout=15)
        assert r.status_code == 404, r.text


# ---------------- 5. PROTECTED ROUTES STAY PROTECTED ----------------
class TestProtectedStillProtected:
    @pytest.mark.parametrize('path', [
        '/orders/my',
        '/auth/me',
        '/auth/me/wishlist',
        '/auth/me/addresses',
        '/notifications',
    ])
    def test_requires_auth(self, path):
        r = requests.get(f"{API}{path}", timeout=10)
        assert r.status_code in (401, 403), f"{path}: {r.status_code}"

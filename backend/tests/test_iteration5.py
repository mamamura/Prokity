"""Iteration 5: branding/features settings + regressions."""
import os
import requests
import pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://no-signup-shop-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"


@pytest.fixture(scope='module')
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@organicshop.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()['token']


@pytest.fixture(scope='module')
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def test_public_site_settings_fields():
    r = requests.get(f"{API}/settings/site")
    assert r.status_code == 200
    d = r.json()
    for f in ('logoUrl', 'brandColor', 'brandColorDark', 'showChatWidget', 'showTracker', 'showNewsletter'):
        assert f in d, f"missing {f}"


def test_admin_update_branding_and_persist(admin_headers):
    # Read current
    cur = requests.get(f"{API}/settings/site").json()
    # Update
    logo_data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    payload = {**cur, "logoUrl": logo_data_url, "brandColor": "#ff5722"}
    r = requests.put(f"{API}/admin/settings/site", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    # Verify persisted via public endpoint
    d = requests.get(f"{API}/settings/site").json()
    assert d['logoUrl'] == logo_data_url
    assert d['brandColor'] == '#ff5722'
    # Restore
    restore = {**cur, "logoUrl": cur.get('logoUrl', ''), "brandColor": cur.get('brandColor', '#047857')}
    requests.put(f"{API}/admin/settings/site", json=restore, headers=admin_headers)


def test_admin_feature_toggles_persist(admin_headers):
    cur = requests.get(f"{API}/settings/site").json()
    payload = {**cur, "showTracker": False, "showNewsletter": False, "showChatWidget": False}
    r = requests.put(f"{API}/admin/settings/site", json=payload, headers=admin_headers)
    assert r.status_code == 200
    d = requests.get(f"{API}/settings/site").json()
    assert d['showTracker'] is False
    assert d['showNewsletter'] is False
    assert d['showChatWidget'] is False
    # Restore ON
    restore = {**cur, "showTracker": True, "showNewsletter": True, "showChatWidget": True}
    r2 = requests.put(f"{API}/admin/settings/site", json=restore, headers=admin_headers)
    assert r2.status_code == 200
    d2 = requests.get(f"{API}/settings/site").json()
    assert d2['showTracker'] is True and d2['showNewsletter'] is True and d2['showChatWidget'] is True


def test_guest_checkout_still_works():
    # Fetch products
    prods = requests.get(f"{API}/products").json()
    assert len(prods) > 0
    p = prods[0]
    subtotal = p['price']
    delivery = 60
    order_payload = {
        "items": [{"productId": p['id'], "name": p['name'], "price": p['price'], "qty": 1, "image": p.get('image', '')}],
        "customer": {"name": "TEST_Guest", "phone": "01700000000", "address": "Test Addr"},
        "address": {"fullName": "TEST_Guest", "phone": "01700000000", "address": "House 1", "area": "Mirpur", "city": "Dhaka"},
        "subtotal": subtotal,
        "delivery": delivery,
        "total": subtotal + delivery,
        "paymentMethod": "cod",
    }
    r = requests.post(f"{API}/orders", json=order_payload)
    assert r.status_code in (200, 201), r.text
    o = r.json()
    assert o.get('user_id') in (None, '', 'null')
    assert o.get('orderNo')
    # Public tracking
    r2 = requests.get(f"{API}/orders/track/{o['orderNo']}", params={"phone": "01700000000"})
    assert r2.status_code == 200
    assert r2.json()['orderNo'] == o['orderNo']


def test_no_emergent_in_index_html():
    r = requests.get(BASE + '/')
    assert r.status_code == 200
    body = r.text.lower()
    assert 'emergent-badge' not in body
    assert 'made with emergent' not in body
    assert 'posthog' not in body

"""Iteration 8: Security headers + rate limiting tests.

Public endpoint tests use REACT_APP_BACKEND_URL for header verification.
Rate-limit tests use localhost:8001 directly (per-IP limiter is diluted
behind Cloudflare/K8s ingress; local pod call hits FastAPI directly).
"""
import os
import time
import pytest
import requests

PUBLIC_BASE = os.environ.get('PUBLIC_BASE_URL') or 'https://no-signup-shop-1.preview.emergentagent.com'
LOCAL_BASE = 'http://localhost:8001'


# ------------- Security headers -------------
class TestSecurityHeaders:
    def test_headers_on_products(self):
        r = requests.get(f"{PUBLIC_BASE}/api/products", timeout=15)
        assert r.status_code == 200
        h = {k.lower(): v for k, v in r.headers.items()}
        assert h.get('x-content-type-options') == 'nosniff'
        assert h.get('x-frame-options') == 'DENY'
        assert h.get('referrer-policy') == 'strict-origin-when-cross-origin'
        assert 'camera=()' in h.get('permissions-policy', '')
        assert h.get('strict-transport-security', '').startswith('max-age=31536000')
        assert h.get('cross-origin-resource-policy') == 'same-site'
        assert h.get('x-xss-protection') == '1; mode=block'
        assert 'noindex' in h.get('x-robots-tag', '')
        assert 'no-store' in h.get('cache-control', '')


# ------------- Rate limiting (localhost) -------------
class TestRateLimits:
    def _burst(self, method, path, n, **kw):
        codes = []
        for _ in range(n):
            r = requests.request(method, f"{LOCAL_BASE}{path}", timeout=10, **kw)
            codes.append(r.status_code)
        return codes

    def test_login_rate_limit_10_per_min(self):
        codes = self._burst('POST', '/api/auth/login', 11,
                            json={'email': 'nobody@test.com', 'password': 'wrong'})
        assert codes[-1] == 429, f"Expected 429 on 11th, got {codes}"
        # Verify body message
        r = requests.post(f"{LOCAL_BASE}/api/auth/login",
                          json={'email': 'nobody@test.com', 'password': 'wrong'}, timeout=10)
        assert r.status_code == 429
        assert 'Too many requests' in r.json().get('detail', '')

    def test_signup_rate_limit_5_per_min(self):
        # wait to avoid interference from any prior signup calls
        time.sleep(1)
        codes = self._burst('POST', '/api/auth/signup', 6,
                            json={'name': 'x', 'email': f'rl{time.time()}@t.com',
                                  'phone': '01700000000', 'password': 'passpass'})
        assert codes[-1] == 429, f"Expected 429 on 6th, got {codes}"

    def test_forgot_rate_limit_5_per_min(self):
        time.sleep(1)
        codes = self._burst('POST', '/api/auth/forgot', 6,
                            json={'email': 'nobody@test.com'})
        assert codes[-1] == 429, f"Expected 429 on 6th, got {codes}"

    def test_track_rate_limit_20_per_min(self):
        time.sleep(1)
        codes = self._burst('GET', '/api/orders/track/FAKE?phone=01700000000', 21)
        assert codes[-1] == 429, f"Expected 429 on 21st, got {codes}"


# ------------- Regression: admin login + guest checkout -------------
class TestRegression:
    def test_admin_login(self):
        # wait for login rate-limit window to reset
        time.sleep(65)
        r = requests.post(f"{PUBLIC_BASE}/api/auth/login",
                          json={'email': 'admin@organicshop.com', 'password': 'admin123'},
                          timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert 'token' in data
        assert data.get('user', {}).get('role') == 'admin'

    def test_guest_checkout_creates_order(self):
        # fetch products to get a valid product id
        p = requests.get(f"{PUBLIC_BASE}/api/products", timeout=15).json()
        assert len(p) > 0
        prod = p[0]
        subtotal = float(prod['price'])
        payload = {
            'items': [{'productId': prod['id'], 'name': prod['name'],
                       'price': prod['price'], 'qty': 1,
                       'image': prod.get('image', ''), 'variant': None}],
            'address': {'fullName': 'TEST Guest', 'phone': '01711223344',
                        'address': 'Test Addr 1', 'area': 'Test Area',
                        'city': 'নাটোর'},
            'paymentMethod': 'cod',
            'subtotal': subtotal,
            'delivery': 0,
            'total': subtotal,
        }
        r = requests.post(f"{PUBLIC_BASE}/api/orders", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert 'orderNo' in body or 'id' in body

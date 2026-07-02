"""Iteration 6: product variants + themeId in site settings."""
import os
import requests
import pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE}/api"


@pytest.fixture(scope='module')
def admin_headers():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@organicshop.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ---- Product Variants ----

def test_create_product_with_variants_and_get(admin_headers):
    payload = {
        "name": "TEST_Variant Honey Iter6",
        "slug": "test-variant-honey-iter6",
        "description": "Iter6 test",
        "price": 280,
        "image": "https://placehold.co/400/pink",
        "images": ["https://placehold.co/400/pink", "https://placehold.co/400/blue"],
        "category": "honey",
        "unit": "২৫০ গ্রাম",
        "stock": 100,
        "variants": [
            {"label": "২৫০ গ্রাম", "price": 280, "stock": 30},
            {"label": "৫০০ গ্রাম", "price": 500, "stock": 50},
            {"label": "১ কেজি", "price": 950, "stock": 15},
        ],
    }
    # First ensure category exists (try create, ignore conflict)
    requests.post(f"{API}/categories", json={"slug": "honey", "name": "মধু", "icon": "🍯"}, headers=admin_headers)

    r = requests.post(f"{API}/products", json=payload, headers=admin_headers)
    assert r.status_code in (200, 201), r.text
    created = r.json()
    assert len(created.get('variants') or []) == 3
    labels = [v['label'] for v in created['variants']]
    assert "২৫০ গ্রাম" in labels and "৫০০ গ্রাম" in labels and "১ কেজি" in labels
    prod_id = created['id']

    # GET by slug
    g = requests.get(f"{API}/products/{created['slug']}")
    assert g.status_code == 200
    gd = g.json()
    assert len(gd['variants']) == 3
    assert gd['images'] == payload['images']

    # PUT overwrite variants
    new_variants = [{"label": "১০০ গ্রাম", "price": 120, "stock": 5}, {"label": "৫০০ গ্রাম", "price": 480, "stock": 40}]
    u = requests.put(f"{API}/products/{prod_id}", json={"variants": new_variants}, headers=admin_headers)
    assert u.status_code == 200, u.text
    ud = u.json()
    assert len(ud['variants']) == 2
    assert ud['variants'][0]['label'] == "১০০ গ্রাম"

    # Verify GET returns overwritten
    g2 = requests.get(f"{API}/products/{created['slug']}").json()
    assert len(g2['variants']) == 2

    # Cleanup
    requests.delete(f"{API}/products/{prod_id}", headers=admin_headers)


def test_seeded_test_variant_honey_exists():
    r = requests.get(f"{API}/products/test-variant-honey")
    assert r.status_code == 200, f"Expected seeded product missing: {r.status_code}"
    d = r.json()
    assert len(d.get('variants') or []) >= 3, f"Expected >=3 variants on seeded product, got {d.get('variants')}"
    assert len(d.get('images') or []) >= 2, f"Expected multi images on seeded product"


# ---- Theme ID persistence ----

def test_settings_has_themeid_and_persist(admin_headers):
    cur = requests.get(f"{API}/settings/site").json()
    assert 'themeId' in cur
    original = cur.get('themeId', 'emerald')

    # Update to rose
    payload = {**cur, "themeId": "rose"}
    r = requests.put(f"{API}/admin/settings/site", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    d = requests.get(f"{API}/settings/site").json()
    assert d['themeId'] == 'rose'

    # Restore to emerald (as per instructions)
    restore = {**cur, "themeId": "emerald"}
    requests.put(f"{API}/admin/settings/site", json=restore, headers=admin_headers)
    d2 = requests.get(f"{API}/settings/site").json()
    assert d2['themeId'] == 'emerald'

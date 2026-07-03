"""Iteration 7 backend tests: category/product/banner image upload, deliveryZones, themeId, variants."""
import os, base64, io, uuid, pytest, requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@organicshop.com", "password": "admin123"}


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# tiny 1x1 png data url
PNG_DATAURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code in (200, 404)  # root may not exist


# --- Category image upload ---
def test_category_create_with_image(auth):
    payload = {"name": "TEST_ImgCat_" + uuid.uuid4().hex[:6], "slug": "test-imgcat-" + uuid.uuid4().hex[:6], "image": PNG_DATAURL, "order": 99, "active": True}
    r = requests.post(f"{API}/admin/categories", json=payload, headers=auth, timeout=15)
    assert r.status_code in (200, 201), r.text
    cat = r.json()
    assert cat.get("image", "").startswith("data:image/")
    cid = cat.get("id")
    # verify list
    r2 = requests.get(f"{API}/categories", timeout=15)
    assert r2.status_code == 200
    found = [c for c in r2.json() if c.get("id") == cid]
    assert len(found) == 1
    assert found[0]["image"].startswith("data:image/")
    # cleanup
    requests.delete(f"{API}/admin/categories/{cid}", headers=auth, timeout=15)


# --- Product with image + gallery + variants ---
def test_product_with_gallery_and_variants(auth):
    slug = "test-prod-" + uuid.uuid4().hex[:6]
    payload = {
        "name": "TEST_ProdIter7",
        "slug": slug,
        "price": 100,
        "unit": "1kg",
        "category": "Test",
        "categorySlug": "",
        "description": "test",
        "image": PNG_DATAURL,
        "images": [PNG_DATAURL, PNG_DATAURL],
        "stock": 10, "active": True,
        "variants": [{"label": "250g", "price": 30, "unit": "250g", "stock": 5}]
    }
    r = requests.post(f"{API}/products", json=payload, headers=auth, timeout=20)
    assert r.status_code in (200, 201), r.text
    pid = r.json().get("id")
    r2 = requests.get(f"{API}/products/{slug}", timeout=15)
    assert r2.status_code == 200
    p = r2.json()
    assert p["image"].startswith("data:image/")
    assert len(p.get("images", [])) == 2
    assert len(p.get("variants", [])) == 1
    assert p["variants"][0]["label"] == "250g"
    requests.delete(f"{API}/products/{pid}", headers=auth, timeout=15)


# --- Site settings: deliveryZones, outsideFee, themeId ---
def test_site_settings_zones_and_theme(auth):
    # snapshot
    orig = requests.get(f"{API}/settings/site", timeout=10).json()
    orig_clean = {k: v for k, v in orig.items() if k not in ("_id", "key")}
    payload = {**orig_clean,
               "deliveryZones": [
                   {"name": "নাটোর", "fee": 0, "freeAbove": None},
                   {"name": "রাজশাহী", "fee": 80, "freeAbove": None},
               ],
               "outsideFee": 150,
               "themeId": "rose"}
    r = requests.put(f"{API}/admin/settings/site", json=payload, headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    got = requests.get(f"{API}/settings/site", timeout=10).json()
    assert got.get("outsideFee") == 150
    assert got.get("themeId") == "rose"
    zones = got.get("deliveryZones") or []
    assert len(zones) == 2
    assert zones[0]["name"] == "নাটোর"
    assert zones[0]["fee"] == 0
    assert zones[1]["name"] == "রাজশাহী"
    assert zones[1]["fee"] == 80
    # reset
    reset = {**orig_clean, "deliveryZones": [], "outsideFee": 120, "themeId": "emerald"}
    rr = requests.put(f"{API}/admin/settings/site", json=reset, headers=auth, timeout=15)
    assert rr.status_code == 200


def test_variant_seed_product_exists():
    r = requests.get(f"{API}/products/test-variant-honey", timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()
    assert len(p.get("variants", [])) == 3
    assert len(p.get("images", [])) >= 2

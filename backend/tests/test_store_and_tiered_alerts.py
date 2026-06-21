"""Iteration 4: tests for /api/store + tiered expiry alerts + dedup."""
import os
import time
from datetime import date, datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://inventory-ai-69.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@inventory.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@12345")
PASSWORD = "Pa$$word123"
RUN = str(int(time.time()))


def H(t):
    return {"Authorization": f"Bearer {t}"}


# -------- Fixtures --------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def worker_token():
    email = f"TEST_iter4_worker_{RUN}@x.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": PASSWORD,
                            "name": "Iter4 Worker", "role": "worker"},
                      timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def manager_token():
    email = f"TEST_iter4_manager_{RUN}@x.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": PASSWORD,
                            "name": "Iter4 Manager", "role": "manager"},
                      timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ====================================================================
# /api/store tests
# ====================================================================
class TestStore:
    def test_store_unauth_returns_401(self):
        r = requests.get(f"{API}/store", timeout=10)
        assert r.status_code == 401, r.text

    def test_store_default_seeded_for_admin(self, admin_token):
        r = requests.get(f"{API}/store", headers=H(admin_token), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        # All expected default keys present
        for k in ("name", "owner_name", "manager_name", "location", "currency", "tagline"):
            assert k in data, f"missing {k} in store response: {data}"

    def test_store_visible_to_worker(self, worker_token):
        r = requests.get(f"{API}/store", headers=H(worker_token), timeout=10)
        assert r.status_code == 200, r.text
        assert "name" in r.json()

    def test_store_visible_to_manager(self, manager_token):
        r = requests.get(f"{API}/store", headers=H(manager_token), timeout=10)
        assert r.status_code == 200, r.text
        assert "name" in r.json()

    def test_worker_cannot_put_store(self, worker_token):
        r = requests.put(f"{API}/store", headers=H(worker_token),
                         json={"name": "Hack", "owner_name": "x", "manager_name": "y",
                               "location": "z", "currency": "USD", "tagline": "t"},
                         timeout=10)
        assert r.status_code == 403, r.text

    def test_manager_cannot_put_store(self, manager_token):
        r = requests.put(f"{API}/store", headers=H(manager_token),
                         json={"name": "MgrTry", "owner_name": "x", "manager_name": "y",
                               "location": "z", "currency": "USD", "tagline": "t"},
                         timeout=10)
        assert r.status_code == 403, r.text

    def test_admin_can_put_store_and_persisted(self, admin_token):
        new_name = f"TEST_Store_{RUN}"
        payload = {
            "name": new_name,
            "owner_name": "Owner X",
            "manager_name": "Mgr Y",
            "location": "Mumbai",
            "currency": "USD",
            "tagline": "Test tagline",
        }
        r = requests.put(f"{API}/store", headers=H(admin_token), json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == new_name
        assert data["owner_name"] == "Owner X"
        assert data["currency"] == "USD"
        # Verify GET reflects the update
        r2 = requests.get(f"{API}/store", headers=H(admin_token), timeout=10)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["name"] == new_name
        assert d2["location"] == "Mumbai"

        # Restore default-ish value so future runs are not surprising
        requests.put(f"{API}/store", headers=H(admin_token), json={
            "name": "FreshTrack Bazaar",
            "owner_name": "Store Owner",
            "manager_name": "Floor Manager",
            "location": "—",
            "currency": "INR",
            "tagline": "Fresh today, sold today.",
        }, timeout=10)


# ====================================================================
# Tiered expiry alert tests
# ====================================================================
def _exp_date(days_from_today: int) -> str:
    return (date.today() + timedelta(days=days_from_today)).isoformat()


def _exp_today() -> str:
    return date.today().isoformat()


def _make_product(token, tag, exp_date, category="general"):
    payload = {
        "product_name": f"TEST_Tier_{RUN}_{tag}",
        "batch_number": f"BNT-{RUN}-{tag}",
        "mfg_date": _exp_date(-60),
        "exp_date": exp_date,
        "quantity": 5,
        "category": category,
    }
    r = requests.post(f"{API}/products", headers=H(token), json=payload, timeout=15)
    return r


def _latest_alert_for_product(admin_token, product_id, kind=None):
    """Find the most-recent alert for a given product."""
    r = requests.get(f"{API}/alerts", headers=H(admin_token),
                     params={"limit": 200}, timeout=10)
    assert r.status_code == 200, r.text
    for a in r.json():
        if a.get("product_id") != product_id:
            continue
        if kind and a.get("kind") != kind:
            continue
        return a
    return None


class TestTieredAlerts:
    """Verify _emit_product_status_alert produces tier-specific kinds & meta."""

    def test_product_today_emits_expired_alert(self, worker_token, admin_token):
        # exp_date = today → midnight UTC today, now > midnight → delta_hours < 0 → expired
        r = _make_product(worker_token, "today", _exp_today(), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        time.sleep(0.5)
        alert = _latest_alert_for_product(admin_token, pid)
        assert alert is not None, "expected an alert on product create with exp=today"
        assert alert["kind"] == "expiry_expired", f"got kind {alert.get('kind')}"
        assert alert["severity"] == "critical"
        meta = alert.get("meta") or {}
        assert "recommendation" in meta
        assert meta.get("tier_key") == "expired"
        # Cleanup
        requests.delete(f"{API}/products/{pid}", headers=H(admin_token), timeout=10)

    def test_product_20d_general_emits_tier_1m(self, worker_token, admin_token):
        # general near_expiry=30 → 20d falls in classify (tier_1m, hours=24*30=720)
        # 20d = 480h ≤ 720h, but also fits earlier tiers? No — 480h > 168h(1w) so tier_1m is correct
        r = _make_product(worker_token, "twentyd", _exp_date(20), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        time.sleep(0.5)
        alert = _latest_alert_for_product(admin_token, pid)
        assert alert is not None
        assert alert["kind"] == "expiry_tier_1m", f"got kind {alert.get('kind')}"
        assert alert["severity"] == "info"
        meta = alert.get("meta") or {}
        assert meta.get("tier_key") == "tier_1m"
        assert meta.get("tier_label") == "1 month"
        rec = (meta.get("recommendation") or "").lower()
        assert "promotional campaign" in rec, f"meta.recommendation should mention 'promotional campaign': {rec}"
        requests.delete(f"{API}/products/{pid}", headers=H(admin_token), timeout=10)

    def test_product_far_future_no_alert(self, worker_token, admin_token):
        # 200 days out → exceeds all tiers (max tier = 1 month) → no alert emitted
        r = _make_product(worker_token, "far", _exp_date(200), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        time.sleep(0.3)
        alert = _latest_alert_for_product(admin_token, pid)
        assert alert is None, f"expected no alert for far-future product, got {alert}"
        requests.delete(f"{API}/products/{pid}", headers=H(admin_token), timeout=10)


class TestAlertScanAndDedup:
    """Run /api/alerts/scan twice — second should skip duplicates."""

    def test_scan_dedup_within_12h(self, worker_token, manager_token, admin_token):
        # Create a product that will definitely match a tier (20d → tier_1m)
        r = _make_product(worker_token, "dedup", _exp_date(20), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # First scan — alert already exists from create, so this should mostly skip
        r1 = requests.post(f"{API}/alerts/scan", headers=H(manager_token), timeout=30)
        assert r1.status_code == 200, r1.text
        body1 = r1.json()
        assert "alerts_created" in body1
        assert "alerts_skipped_duplicate" in body1

        # Second scan in immediate succession — must skip everything created in run 1
        r2 = requests.post(f"{API}/alerts/scan", headers=H(manager_token), timeout=30)
        assert r2.status_code == 200, r2.text
        body2 = r2.json()
        # Dedup requirement: skipped >= created on the second run
        assert body2["alerts_skipped_duplicate"] >= body2["alerts_created"], (
            f"Dedup failed: second run created={body2['alerts_created']} "
            f"skipped={body2['alerts_skipped_duplicate']}"
        )

        # Cleanup
        requests.delete(f"{API}/products/{pid}", headers=H(admin_token), timeout=10)


# ====================================================================
# Inventory CRUD regression (manager/admin still allowed)
# ====================================================================
class TestInventoryCrudRegression:
    def test_manager_put_product(self, worker_token, manager_token, admin_token):
        r = _make_product(worker_token, "crud_put", _exp_date(40), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # Manager updates quantity
        r2 = requests.put(f"{API}/products/{pid}", headers=H(manager_token),
                          json={"quantity": 77}, timeout=10)
        assert r2.status_code == 200, r2.text
        assert r2.json()["quantity"] == 77
        requests.delete(f"{API}/products/{pid}", headers=H(admin_token), timeout=10)

    def test_manager_delete_product(self, worker_token, manager_token):
        r = _make_product(worker_token, "crud_del", _exp_date(40), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        r2 = requests.delete(f"{API}/products/{pid}", headers=H(manager_token), timeout=10)
        assert r2.status_code == 200, r2.text
        # Verify gone
        r3 = requests.get(f"{API}/products/{pid}", headers=H(manager_token), timeout=10)
        assert r3.status_code == 404

    def test_admin_put_and_delete(self, worker_token, admin_token):
        r = _make_product(worker_token, "crud_admin", _exp_date(40), category="general")
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        r2 = requests.put(f"{API}/products/{pid}", headers=H(admin_token),
                          json={"notes": "admin-edit"}, timeout=10)
        assert r2.status_code == 200, r2.text
        assert r2.json()["notes"] == "admin-edit"
        r3 = requests.delete(f"{API}/products/{pid}", headers=H(admin_token), timeout=10)
        assert r3.status_code == 200


# ====================================================================
# Cleanup
# ====================================================================
def test_zz_cleanup(admin_token):
    r = requests.get(f"{API}/products", headers=H(admin_token),
                     params={"q": f"TEST_Tier_{RUN}", "limit": 200}, timeout=15)
    if r.status_code == 200:
        for p in r.json():
            requests.delete(f"{API}/products/{p['id']}", headers=H(admin_token), timeout=10)

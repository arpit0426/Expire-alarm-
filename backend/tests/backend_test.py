"""End-to-end backend tests for FreshTrack Expiry & Inventory System."""
import os
import io
import time
import base64
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://c0793a4a-13eb-4092-9505-41f826a6037d.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@inventory.com"
ADMIN_PASSWORD = "Admin@12345"

# Unique suffix so reruns don't collide on unique email/product indices
RUN = str(int(time.time()))
WORKER_EMAIL = f"TEST_worker_{RUN}@inventory.com"
MANAGER_EMAIL = f"TEST_manager_{RUN}@inventory.com"
PASSWORD = "Pa$$word123"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def worker_token():
    r = requests.post(f"{API}/auth/register", json={
        "email": WORKER_EMAIL, "password": PASSWORD, "name": "Test Worker", "role": "worker"
    }, timeout=20)
    assert r.status_code == 200, f"Worker register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "worker"
    return data["access_token"]


@pytest.fixture(scope="session")
def manager_token():
    r = requests.post(f"{API}/auth/register", json={
        "email": MANAGER_EMAIL, "password": PASSWORD, "name": "Test Manager", "role": "manager"
    }, timeout=20)
    assert r.status_code == 200, f"Manager register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "manager"
    return data["access_token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Health ----------------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------- Auth ----------------
def test_admin_login_returns_admin_role(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 20


def test_auth_me_admin(admin_token):
    r = requests.get(f"{API}/auth/me", headers=H(admin_token), timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    assert "password_hash" not in data


def test_register_admin_override_to_worker():
    email = f"TEST_overide_{RUN}@x.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": PASSWORD, "name": "OverrideAdm", "role": "admin"
    }, timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "worker"


def test_register_duplicate_returns_400(worker_token):
    r = requests.post(f"{API}/auth/register", json={
        "email": WORKER_EMAIL, "password": PASSWORD, "name": "Dup", "role": "worker"
    }, timeout=15)
    assert r.status_code == 400


def test_register_creates_manager(manager_token):
    r = requests.get(f"{API}/auth/me", headers=H(manager_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["role"] == "manager"


# ---------------- Role-based access ----------------
def test_worker_cannot_list_users(worker_token):
    r = requests.get(f"{API}/users", headers=H(worker_token), timeout=10)
    assert r.status_code == 403


def test_manager_cannot_list_users(manager_token):
    r = requests.get(f"{API}/users", headers=H(manager_token), timeout=10)
    assert r.status_code == 403


def test_admin_can_list_users(admin_token):
    r = requests.get(f"{API}/users", headers=H(admin_token), timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert any("password_hash" not in u for u in r.json())


def test_worker_cannot_put_threshold(worker_token):
    r = requests.put(f"{API}/thresholds", headers=H(worker_token),
                     json={"category": "general", "near_expiry_days": 20, "critical_days": 5}, timeout=10)
    assert r.status_code == 403


def test_worker_cannot_export(worker_token):
    r = requests.get(f"{API}/reports/export", headers=H(worker_token), timeout=15)
    assert r.status_code == 403


# ---------------- Products: status computation ----------------
created_ids = []


def _exp(days_from_today: int) -> str:
    return (date.today() + timedelta(days=days_from_today)).isoformat()


def _create_product(token, **overrides):
    payload = {
        "product_name": f"TEST_Product_{RUN}_{overrides.get('tag', 'x')}",
        "batch_number": f"BN-{RUN}-{overrides.get('tag', 'x')}",
        "mfg_date": _exp(-60),
        "exp_date": _exp(60),
        "quantity": 10,
        "category": "general",
    }
    payload.update({k: v for k, v in overrides.items() if k != "tag"})
    r = requests.post(f"{API}/products", headers=H(token), json=payload, timeout=15)
    return r


def test_worker_can_create_product(worker_token):
    r = _create_product(worker_token, tag="safe", exp_date=_exp(60), category="general")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["status"] == "safe"
    assert p["days_left"] >= 30
    created_ids.append(p["id"])


def test_product_status_near_expiry_general(worker_token):
    # general: near 30d, critical 7d -> 15 days = near_expiry
    r = _create_product(worker_token, tag="near", exp_date=_exp(15), category="general")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["status"] == "near_expiry", p
    created_ids.append(p["id"])


def test_product_status_critical_general(worker_token):
    r = _create_product(worker_token, tag="crit", exp_date=_exp(3), category="general")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["status"] == "critical", p
    created_ids.append(p["id"])


def test_product_status_expired_general(worker_token):
    r = _create_product(worker_token, tag="expd", exp_date=_exp(-5), category="general")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["status"] == "expired", p
    created_ids.append(p["id"])


def test_product_status_dairy_thresholds(worker_token):
    # dairy thresholds: near_expiry 7, critical 2
    # 5 days -> near_expiry, 1 day -> critical
    r1 = _create_product(worker_token, tag="dairy_near", exp_date=_exp(5), category="dairy")
    assert r1.status_code == 200, r1.text
    assert r1.json()["status"] == "near_expiry"
    created_ids.append(r1.json()["id"])

    r2 = _create_product(worker_token, tag="dairy_crit", exp_date=_exp(1), category="dairy")
    assert r2.status_code == 200, r2.text
    assert r2.json()["status"] == "critical"
    created_ids.append(r2.json()["id"])


def test_duplicate_returns_409_and_creates_alert(worker_token, admin_token):
    r1 = _create_product(worker_token, tag="dup", exp_date=_exp(40))
    assert r1.status_code == 200
    created_ids.append(r1.json()["id"])
    r2 = _create_product(worker_token, tag="dup", exp_date=_exp(40))
    assert r2.status_code == 409
    # Check alert exists
    a = requests.get(f"{API}/alerts", headers=H(admin_token), timeout=10).json()
    assert any(x.get("kind") == "duplicate" for x in a), "duplicate alert not found"


def test_invalid_exp_before_mfg(worker_token):
    payload = {
        "product_name": f"TEST_BadDate_{RUN}",
        "batch_number": f"BN-bad-{RUN}",
        "mfg_date": _exp(10),
        "exp_date": _exp(5),
        "category": "general",
    }
    r = requests.post(f"{API}/products", headers=H(worker_token), json=payload, timeout=10)
    assert r.status_code == 400


def test_invalid_exp_format(worker_token):
    payload = {
        "product_name": f"TEST_BadFmt_{RUN}",
        "batch_number": f"BN-fmt-{RUN}",
        "exp_date": "not-a-date",
        "category": "general",
    }
    r = requests.post(f"{API}/products", headers=H(worker_token), json=payload, timeout=10)
    assert r.status_code == 400


# ---------------- List filters ----------------
def test_list_products_filters(worker_token):
    r = requests.get(f"{API}/products", headers=H(worker_token), params={"status_filter": "expired"}, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert all(p["status"] == "expired" for p in items)
    assert len(items) >= 1

    r2 = requests.get(f"{API}/products", headers=H(worker_token), params={"status_filter": "safe"}, timeout=15)
    assert r2.status_code == 200
    assert all(p["status"] == "safe" for p in r2.json())

    r3 = requests.get(f"{API}/products", headers=H(worker_token), params={"status_filter": "near_expiry"}, timeout=15)
    assert r3.status_code == 200
    assert all(p["status"] == "near_expiry" for p in r3.json())

    # search q
    r4 = requests.get(f"{API}/products", headers=H(worker_token), params={"q": f"TEST_Product_{RUN}"}, timeout=15)
    assert r4.status_code == 200
    assert len(r4.json()) >= 1

    # category filter
    r5 = requests.get(f"{API}/products", headers=H(worker_token), params={"category": "dairy"}, timeout=15)
    assert r5.status_code == 200
    assert all(p["category"] == "dairy" for p in r5.json())


# ---------------- Worker permission denials ----------------
def test_worker_cannot_update_or_delete(worker_token):
    pid = created_ids[0]
    r = requests.put(f"{API}/products/{pid}", headers=H(worker_token), json={"quantity": 99}, timeout=10)
    assert r.status_code == 403
    r2 = requests.delete(f"{API}/products/{pid}", headers=H(worker_token), timeout=10)
    assert r2.status_code == 403


def test_manager_can_update_and_status_recomputes(manager_token):
    pid = created_ids[0]  # was safe
    r = requests.put(f"{API}/products/{pid}", headers=H(manager_token), json={"exp_date": _exp(3)}, timeout=10)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "critical"


def test_manager_can_delete(manager_token):
    # delete last created (expired) item
    pid = created_ids[-1]
    r = requests.delete(f"{API}/products/{pid}", headers=H(manager_token), timeout=10)
    assert r.status_code == 200


# ---------------- Dashboard ----------------
def test_dashboard_summary(admin_token):
    r = requests.get(f"{API}/dashboard/summary", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "counts" in d and "category_counts" in d
    for k in ["total", "safe", "near_expiry", "critical", "expired"]:
        assert k in d["counts"]
    assert "estimated_waste_saved" in d
    assert "unread_alerts" in d
    assert d["counts"]["total"] >= 1


# ---------------- Alerts ----------------
def test_alerts_list_and_read(admin_token):
    r = requests.get(f"{API}/alerts", headers=H(admin_token), timeout=10)
    assert r.status_code == 200
    alerts = r.json()
    assert len(alerts) > 0
    unread = [a for a in alerts if not a.get("read")]
    if unread:
        aid = unread[0]["id"]
        r2 = requests.post(f"{API}/alerts/{aid}/read", headers=H(admin_token), timeout=10)
        assert r2.status_code == 200
        # verify it's now read
        r3 = requests.get(f"{API}/alerts", headers=H(admin_token), params={"unread_only": True}, timeout=10)
        assert r3.status_code == 200
        assert all(not a.get("read") for a in r3.json())


def test_alerts_read_all(admin_token):
    r = requests.post(f"{API}/alerts/read-all", headers=H(admin_token), timeout=10)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/alerts", headers=H(admin_token), params={"unread_only": True}, timeout=10)
    assert r2.status_code == 200
    assert r2.json() == []


def test_worker_cannot_scan_alerts(worker_token):
    r = requests.post(f"{API}/alerts/scan", headers=H(worker_token), timeout=15)
    assert r.status_code == 403


def test_manager_can_scan_alerts(manager_token):
    r = requests.post(f"{API}/alerts/scan", headers=H(manager_token), timeout=20)
    assert r.status_code == 200
    assert "alerts_created" in r.json()


# ---------------- Thresholds ----------------
def test_get_thresholds(admin_token):
    r = requests.get(f"{API}/thresholds", headers=H(admin_token), timeout=10)
    assert r.status_code == 200
    cats = [t["category"] for t in r.json()]
    assert "dairy" in cats and "general" in cats


def test_put_threshold_invalid(manager_token):
    r = requests.put(f"{API}/thresholds", headers=H(manager_token),
                     json={"category": "general", "near_expiry_days": 5, "critical_days": 10}, timeout=10)
    assert r.status_code == 400


def test_put_threshold_valid(manager_token, admin_token):
    r = requests.put(f"{API}/thresholds", headers=H(manager_token),
                     json={"category": f"TEST_cat_{RUN}", "near_expiry_days": 20, "critical_days": 5}, timeout=10)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/thresholds", headers=H(admin_token), timeout=10)
    cats = {t["category"]: t for t in r2.json()}
    assert f"test_cat_{RUN}" in cats
    assert cats[f"test_cat_{RUN}"]["near_expiry_days"] == 20


# ---------------- Reports ----------------
def test_reports_summary(admin_token):
    r = requests.get(f"{API}/reports/summary", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["by_status", "by_category", "near_expiry_top", "expired_top", "estimated_kg_saved"]:
        assert k in d


def test_worker_cannot_export_xlsx(worker_token):
    r = requests.get(f"{API}/reports/export", headers=H(worker_token), timeout=10)
    assert r.status_code == 403


def test_manager_can_export_xlsx(manager_token):
    r = requests.get(f"{API}/reports/export", headers=H(manager_token), timeout=30)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    # Validate it's a real xlsx (zip starts with PK)
    assert r.content[:2] == b"PK"


# ---------------- OCR ----------------
def _load_label_b64():
    path = os.path.join(os.path.dirname(__file__), "_label.b64")
    with open(path) as fh:
        return fh.read().strip()


def test_ocr_scan_with_base64(worker_token):
    b64 = _load_label_b64()
    # OCR accepts multipart form, so post as form data
    r = requests.post(
        f"{API}/ocr/scan",
        headers=H(worker_token),
        data={"image_base64": b64},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "fields" in data
    for k in ["product_name", "batch_number", "mfg_date", "exp_date", "quantity", "category"]:
        assert k in data["fields"]
    assert "confidence" in data and isinstance(data["confidence"], (int, float))
    assert 0.0 <= data["confidence"] <= 1.0
    assert "issues" in data and isinstance(data["issues"], list)
    assert "needs_review" in data and isinstance(data["needs_review"], bool)


def test_ocr_scan_missing_input(worker_token):
    r = requests.post(f"{API}/ocr/scan", headers=H(worker_token), timeout=15)
    assert r.status_code == 400


# ---------------- Cleanup ----------------
def test_cleanup_test_products(admin_token):
    r = requests.get(f"{API}/products", headers=H(admin_token), params={"q": f"TEST_Product_{RUN}"}, timeout=15)
    if r.status_code == 200:
        for p in r.json():
            requests.delete(f"{API}/products/{p['id']}", headers=H(admin_token), timeout=10)
    # also TEST_BadDate, TEST_BadFmt -> they failed creation so no cleanup needed

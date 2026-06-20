# FreshTrack — Expiry Detection & Inventory Management System

## Original Problem Statement
Build a complete AI-powered Expiry Detection and Inventory Management System for retail stores, warehouses, supermarkets, and food businesses. Core features:

1. Product Label Scanning via camera, with OCR to extract: product name, batch number, MFG date, EXP date, quantity.
2. AI Validation — date logic, missing/invalid fields, confidence scoring, request manual verification when confidence is low.
3. Duplicate Detection on Product Name + Batch Number.
4. Auto Data Entry to inventory DB; Excel export.
5. Inventory Dashboard with Total / Safe / Near Expiry / Critical / Expired KPIs, search + filter.
6. Smart Expiry Monitoring — 4 status tiers (Green/Yellow/Orange/Red); per-category thresholds.
7. Alert System — near-expiry, expired, OCR validation failures, duplicates; dashboard + email/mobile (in-dashboard delivered now).
8. User Roles — Worker / Manager / Admin with RBAC.
9. Reports & Analytics — expired & near-expiry reports, summary, food-waste reduction estimate.
10. Technical — modern responsive UI, camera, OCR, DB, secure auth, mobile-friendly.

## User Choices (Jan 2026)
- **OCR**: Gemini 3 Flash Vision via Emergent Universal LLM Key.
- **Auth**: JWT-based custom email/password with three roles.
- **Notifications**: In-dashboard alerts (email/SMS deferred).
- **Export**: CSV/Excel only (Google Sheets deferred).
- **Design**: Take inspiration from Barcoop Bevy (Awwwards) — flavor-forward, bold palette (#259E7E / #C1D544), Fraunces display type, scroll motion. Hybrid theme: bold marketing/auth + calm dashboard.

## Architecture
- **Frontend**: React 18 + Tailwind + Framer Motion + Recharts + react-router-dom + axios + sonner. Hosted on `:3000` (CRA dev server).
- **Backend**: FastAPI + Motor (async MongoDB) + Pydantic v2 + PyJWT + bcrypt + openpyxl + emergentintegrations (Gemini Vision). All routes under `/api`. Port `:8001`.
- **DB**: MongoDB at `MONGO_URL` (DB name `expiry_inventory`). Indexes: users.email unique; products (product_name, batch_number) unique; alerts.created_at desc; thresholds.category unique.
- **Auth**: JWT (HS256, 24h TTL). Token stored in `localStorage` and sent as `Authorization: Bearer`. Admin seeded on startup (idempotent).
- **Roles**: `worker`, `manager`, `admin`. Admin role cannot be self-registered; admin must promote via `/api/users/{id}/role`.

## Implemented Features (✅ tested)
- Auth: register, login, /me, role-gated endpoints.
- Admin idempotent seed (admin@inventory.com / Admin@12345).
- Products: create / list (filters: q, status_filter, category) / get / update / delete.
- Date parsing accepts many formats (YYYY-MM-DD, DD/MM/YYYY, Mon YYYY, year-only, etc.).
- Status engine: Safe / Near Expiry / Critical / Expired with per-category thresholds (general, food, beverage, dairy, pharma, cosmetics, snacks, frozen).
- Duplicate detection (409 + alert).
- Alerts: auto-generated for near-expiry, critical, expired, duplicates, ocr_review, ocr_failure; mark-one-read; mark-all-read; rescan inventory.
- Thresholds: GET/PUT per category with validation (critical < near_expiry).
- Dashboard summary (counts, category counts, waste-saved estimate, unread alerts).
- Reports summary (status & category breakdown, near-expiry & expired top lists, kg saved estimate).
- Excel export via openpyxl (manager/admin only).
- OCR endpoint with Gemini 3 Flash Vision: structured JSON extraction + confidence + needs_review flag.
- Frontend pages: Landing (Barcoop-Bevy inspired), Login, Register, Overview, Inventory (table + filters + CRUD modal + export), Scan (camera + upload + OCR + verify), Alerts, Reports (Pie + Bar + lists), Settings (thresholds + admin user-role table).
- 37/37 backend tests passing.

## Test Credentials
See `/app/memory/test_credentials.md`. Admin: `admin@inventory.com / Admin@12345`.

## Backlog / Next
- **P1**: Email notifications (Resend or SendGrid) and SMS (Twilio) for alerts.
- **P1**: Google Sheets sync for verified scans.
- **P2**: Cache thresholds per request (N+1 lookups in summary/reports).
- **P2**: Tighten CORS — replace `*` with explicit `REACT_APP_BACKEND_URL` host.
- **P2**: Split `server.py` into routers (auth/products/alerts/ocr/reports).
- **P2**: Background scheduler (APScheduler) to rescan inventory daily and emit alerts automatically.
- **P3**: Bulk import (CSV upload).
- **P3**: Per-product photo gallery on detail page.
- **P3**: Multi-tenant org isolation.

## Build Log
- **2026-06-19** — MVP implemented from scratch: backend + frontend + auth + OCR + dashboard + reports + tests. Backend 37/37 ✅.

### Code review pass 1 (2026-06-19)
  - **Security**: switched JWT from `localStorage` to **HttpOnly + Secure + SameSite=Lax cookies** (both `/auth/login` and `/auth/register` set the cookie; new `/auth/logout` clears it). Bearer-header fallback preserved for API/test clients.
  - **CORS**: tightened from `allow_origins=['*'] + allow_credentials=True` (browser-invalid) to an explicit regex matching preview-domain + localhost, or a literal `FRONTEND_URL`.
  - **Refactor**: split `run_ocr_on_image()` into `_call_gemini_vision`, `_build_ocr_fields`, `_validate_ocr_fields`, `_parse_confidence`, `_extract_json_blob`. Split `create_product()` into `_validate_product_dates`, `_check_duplicate_product`, `_build_product_doc`, `_emit_product_status_alert`.
  - **Perf**: added `load_threshold_map()` + `enrich_product_sync()` so dashboard/reports/exports/scan do **one** thresholds query instead of N+1.
  - **UX**: register response now includes `role_overridden` boolean; frontend shows a warning toast when admin role is silently coerced to worker.
  - **Frontend hygiene**: extracted `ProductModal` and `InventoryFilters` components, wrapped data-loader effects in `useCallback`, fixed array-index ticker key, removed all `localStorage` token usage.
  - **Test hygiene**: credentials now from env (`TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` / `TEST_USER_PASSWORD`).
  - **Verified**: 43/43 backend tests passing (original 37 + 6 new cookie/logout/role_overridden tests).

### Code review pass 2 (2026-06-19)
  - **ScanPage decomposed**: 356 → **95 lines** (-73%). Logic extracted into `useCameraCapture()` and `useOcrProcessor()` custom hooks; UI into `CameraPanel` / `ScanResults` / `ConfidenceBar` / `VerifyForm` subcomponents. Magic numbers (`800x600`, `0.85`) named.
  - **LandingPage decomposed**: 352 → **36 lines** (-90%). Split into `LandingNav`, `LandingHero`, `ImpactStats`, `Features`, `HowItWorks`, `CallToAction`, `LandingFooter`.
  - **ProductModal decomposed**: form state lifted into `useProductForm()` hook; rendered via `ProductFormFields` + `ModalActions` subcomponents. Save-button label is now a small helper (no nested ternary).
  - **Centralized motion presets** in `/lib/motion.js` — `fadeInUp`, `fadeInUpDelayed`, `fadeInScrollStaggered`, `fadeInKpi`, `formEnter`, `modalEnter`, `resultEnter`, `rowFadeIn` — eliminating ~40 fresh-allocation inline `initial`/`animate`/`transition` props across pages.
  - **Logger utility** `/lib/logger.js` replaces ad-hoc `console.warn`/`process.env.NODE_ENV` checks. No-op in production builds.
  - **Backend**: `verify_password()` exception narrowed from bare `Exception` to `(ValueError, TypeError)`. `hash_password()` got explicit `bytes` typing. `create_alert()` got `-> None` return hint.
  - **Verified**: 43/43 backend tests still passing (no regression). Frontend lint 0 errors.

  **Non-changes (verified false positives in the report):**
  - `is None` / `is not None` on `server.py:364/676/763` are the **correct** PEP 8 idiom — not changed.
  - `"access_token="` in `backend_test.py:437/458/502` is the **cookie attribute name** the tests assert on, not a credential — not changed.
  - `useCallback`/`useEffect` empty deps in `AuthContext`/`DashboardLayout`/`InventoryPage` reference only module-imported `api` and stable `useState` setters — ESLint `react-hooks/exhaustive-deps` reports zero warnings — not changed.

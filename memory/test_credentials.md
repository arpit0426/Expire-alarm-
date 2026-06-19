# Test Credentials — FreshTrack Expiry & Inventory System

## Admin (seeded automatically on startup)
- **Email:** admin@inventory.com
- **Password:** Admin@12345
- **Role:** admin
- **Permissions:** Full access (scan, edit, delete products, manage users, configure thresholds, export reports, view alerts)

## Test Worker Account (create via /api/auth/register or /register page)
- **Email:** worker@inventory.com
- **Password:** Worker@12345
- **Role:** worker
- **Permissions:** Scan products, create products, view inventory & alerts

## Test Manager Account (create via /api/auth/register or /register page)
- **Email:** manager@inventory.com
- **Password:** Manager@12345
- **Role:** manager
- **Permissions:** Edit/delete records, export reports, configure thresholds, view all alerts

## Auth Endpoints
- `POST /api/auth/register` — body: `{name, email, password, role}` (role: worker|manager; admin role is ignored — must be granted via admin panel)
- `POST /api/auth/login` — body: `{email, password}` — returns `{access_token, user}`
- `GET /api/auth/me` — requires `Authorization: Bearer <token>`
- `GET /api/users` — admin-only — list users
- `PUT /api/users/{id}/role` — admin-only — body: `{role}`

## Frontend Routes
- `/` — Landing page (public)
- `/login` — Login page (public)
- `/register` — Register page (public)
- `/app` — Overview / Dashboard (auth required)
- `/app/inventory` — Inventory table & CRUD
- `/app/scan` — Camera + OCR scanner
- `/app/alerts` — Alerts center
- `/app/reports` — Analytics + Excel export
- `/app/settings` — Thresholds + (admin only) team roles

## Notes
- Frontend stores JWT in `localStorage` under `token` and attaches `Authorization: Bearer <token>` to all `/api/*` calls.
- 401 from API auto-redirects to `/login` (except when already on auth pages).

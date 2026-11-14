# CampusLoop — Installation Guide (Windows)

This guide gets the project running locally from a fresh checkout. Commands are PowerShell. The project also works on macOS/Linux with the equivalent commands.

**Verified environment for this build**

| Tool | Version used |
| --- | --- |
| Python | 3.14.0 |
| Node.js | 24.18.0 |
| npm | 11.16.0 |
| Database | SQLite (development; PostgreSQL not installed on this machine) |

---

## 1. Prerequisites

- **Python 3.11+** with `pip` and `venv`.
- **Node.js 20+** with npm.
- **PostgreSQL 15+** (recommended). Optional: the backend falls back to SQLite for local development.
- Git (optional, for cloning).

Check:

```powershell
python --version
node --version
npm --version
```

If PowerShell blocks the virtual-environment activation script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## 2. Backend setup

```powershell
cd "E:\Projects\Collage Project\CampusLoop\backend"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.1 Configure environment

```powershell
Copy-Item .env.example .env
```

Edit `backend/.env`:

```
ENVIRONMENT=development
DATABASE_URL=sqlite:///./campusloop.db
SECRET_KEY=<paste a generated value>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
UPLOAD_DIR=uploads
MAX_IMAGE_MB=5
MAX_DOCUMENT_MB=10
AUTO_APPROVE_LISTINGS=false
OFFER_EXPIRY_HOURS=72
RATE_LIMIT_ENABLED=true
```

Generate a strong secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Never reuse the placeholder, and never commit `.env`.

### 2.2 Create the schema

**SQLite (current development setup):**

```powershell
python -m alembic upgrade head
```

The SQLite file is created beside `alembic.ini` as `backend/campusloop.db`.

**PostgreSQL (recommended):**

```powershell
psql -U postgres
```

```sql
CREATE USER campusloop WITH PASSWORD 'change_me';
CREATE DATABASE campusloop OWNER campusloop;
\q
```

Then in `.env`:

```
DATABASE_URL=postgresql+psycopg://campusloop:change_me@localhost:5432/campusloop
```

and run:

```powershell
python -m alembic upgrade head
```

The migration is portable across both backends. `psycopg` v3 is already in `requirements.txt`.

### 2.3 Seed categories and demo data

```powershell
python -m app.db.seed          # 8 categories + admin account
python -m app.db.seed --demo   # also 2 verified students + 8 listings
```

Seeding is idempotent for categories and the admin email.

### 2.4 Start the API

```powershell
uvicorn app.main:app --reload --port 8000
```

Verify:

```powershell
curl http://127.0.0.1:8000/api/v1/health
```

Expected: `{"status":"ok","environment":"development","database":"ok","version":"1.0.0"}`.

Swagger UI: <http://127.0.0.1:8000/docs>

---

## 3. Frontend setup

Open a **second** PowerShell window:

```powershell
cd "E:\Projects\Collage Project\CampusLoop\frontend"
npm install
npm run dev
```

Open <http://localhost:5173>.

No `.env` is required for local development: `src/services/api.js` defaults to `/api/v1`, and `vite.config.js` proxies `/api` (including WebSocket upgrades) and `/uploads` to `http://127.0.0.1:8000`.

To point the frontend at a different API:

```powershell
Copy-Item .env.example .env
```

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
# Optional, when the WebSocket host differs:
# VITE_WS_BASE_URL=ws://localhost:8000
```

Restart `npm run dev` after changing environment variables.

---

## 4. Sign in

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@campusloop.app` | `Admin@12345` |
| Verified student | `ananya@student.edu` | `Student@123` |
| Verified student | `rahul@student.edu` | `Student@123` |

To test the full new-user flow:

1. Register a new student at `/register`.
2. Submit verification at `/verify` (optionally upload an ID image).
3. Sign in as the admin, open `/admin/verifications`, and approve the request.
4. Return to the student account and create a listing at `/sell`.
5. Approve the listing at `/admin/listings`.
6. Browse it from another verified account, message the seller, offer, accept, schedule a meeting, and complete the transaction.

---

## 5. Commands reference

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1

uvicorn app.main:app --reload --port 8000
python -m pytest -q
python -m alembic upgrade head
python -m alembic revision --autogenerate -m "describe change"
python -m alembic downgrade -1
python -m app.db.seed --demo
```

### Frontend

```powershell
cd frontend
npm run dev
npm run build
npm run preview
```

### Reset local data (SQLite only)

```powershell
# Stop the API first
cd backend
Remove-Item campusloop.db
python -m alembic upgrade head
python -m app.db.seed --demo
```

This deletes local listings, messages and accounts. Do not run it against a database you care about.

---

## 6. Project layout quick map

```
backend/app/api/v1/       HTTP routers
backend/app/services/     business logic
backend/app/models/       SQLAlchemy entities
backend/app/websocket/    chat manager + endpoint
backend/alembic/          migrations
backend/tests/            pytest suite
frontend/src/pages/       route components
frontend/src/components/  reusable UI
frontend/src/services/    API wrappers
frontend/src/context/     auth, theme, toasts
frontend/src/hooks/       socket, unread, title
```

---

## 7. Troubleshooting

### `psql` is not recognised

PostgreSQL is not installed or not on `PATH`. Either install PostgreSQL 15+ and add `C:\Program Files\PostgreSQL\<version>\bin` to `PATH`, or use SQLite (`DATABASE_URL=sqlite:///./campusloop.db`) for local development. The SQLite path is the one used on this machine.

### `Can't locate timezone: UTC` from Alembic

Older `alembic.ini` templates set `timezone = UTC`. This project's `alembic.ini` has that line removed; if you regenerate the file, remove it again.

### `Execution of scripts is disabled on this system`

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

### Port 8000 or 5173 already in use

```powershell
netstat -ano | findstr :8000
Stop-Process -Id <PID> -Force
```

Or start on another port: `uvicorn app.main:app --port 8001` and update `VITE_API_BASE_URL`/the Vite proxy. The proxy target is defined in `frontend/vite.config.js`.

### CORS error in the browser

`ALLOWED_ORIGINS` must include the exact frontend origin, including scheme and port. Defaults cover `http://localhost:5173` and `http://127.0.0.1:5173`. Restart the API after editing `.env`.

### `401` immediately after login

- Confirm the backend was restarted after changing `SECRET_KEY`.
- Clear `localStorage` keys `campusloop.access`, `campusloop.refresh`, `campusloop.user` and sign in again.
- Check that the system clock is correct (JWT expiry is time-based).

### WebSocket shows “REST” instead of “Live”

- Confirm the token is present and the user is a participant.
- Vite must proxy WebSockets (`ws: true` is configured).
- If the API is on another host, set `VITE_WS_BASE_URL`.
- Check the API log for close code 4401/4403/4404.

### Images return 404

- Uploaded images are stored under `backend/uploads/public` and served at `/uploads`.
- The API creates the directory on startup. In development, Vite proxies `/uploads` to the API.
- On Render, attach a persistent disk or images disappear on redeploy.

### Verification document download fails

Documents are private and require the owner's or an admin's bearer token. A plain browser URL without the header returns 401/404 by design.

### `bcrypt` or `psycopg` install errors

Use a recent Python with wheels available. On Windows, upgrade pip first (`python -m pip install --upgrade pip`). Avoid mixing global and virtual-environment packages.

### Tests fail with a locked SQLite database

Stop the running API before running pytest, or use the separate test database the suite creates (`backend/tests/test_campusloop.db`).

### Password reset shows no token in production

By design: `reset_token` is returned only when `ENVIRONMENT != "production"`. Configure an email provider to deliver reset links in production; see `PROJECT_STATUS.md` limitations.

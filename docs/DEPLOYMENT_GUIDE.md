# CampusLoop — Deployment Guide

The application is deployment-ready: the frontend builds to static assets, the backend exposes a health check, migrations are versioned, and every secret is environment-driven. No deployment was performed for this submission because no hosting credentials were provided.

Recommended topology:

```
Vercel (React SPA)  ──HTTPS──▶  Render Web Service (FastAPI)  ──▶  Managed PostgreSQL (Render/Neon)
                                        │
                                        └── persistent disk (uploads) or object storage driver
```

---

## 1. Pre-deployment checklist

- [ ] Change/remove the seeded admin password and demo accounts.
- [ ] Generate a production `SECRET_KEY` (never reuse development).
- [ ] Set `ENVIRONMENT=production` (this hides reset tokens).
- [ ] Set `AUTO_APPROVE_LISTINGS=false`.
- [ ] Set `RATE_LIMIT_ENABLED=true`.
- [ ] Configure `ALLOWED_ORIGINS` with the exact frontend URL(s), no trailing slash.
- [ ] Provision PostgreSQL and run `alembic upgrade head`.
- [ ] Decide on durable upload storage.
- [ ] Confirm `/api/v1/health` returns 200 on the deployed API.
- [ ] Confirm CORS preflight from the deployed frontend origin succeeds.
- [ ] Confirm WebSockets connect through HTTPS (`wss://`).
- [ ] Verify no `.env`, database file, or upload is committed (`git status`).

---

## 2. Managed PostgreSQL

### Option A — Render PostgreSQL

1. Dashboard → **New → PostgreSQL**.
2. Choose a region close to the API, select a plan, create.
3. Copy the **Internal Database URL** (used by a Render web service in the same region).
4. Convert the scheme for SQLAlchemy + psycopg v3:

```
postgresql://user:pass@host/db        →  postgresql+psycopg://user:pass@host/db
```

### Option B — Neon (or another managed provider)

1. Create a project and database.
2. Copy the pooled connection string; convert `postgres://` or `postgresql://` to `postgresql+psycopg://`.
3. If the provider requires SSL, keep its `?sslmode=require` parameter.

Store the final URL only in the hosting provider's environment settings. Never commit it.

### Migrations

Run once per release, before the new instance serves traffic:

```bash
alembic upgrade head
```

On Render, set this as the service's **Release Command** (or run it as a one-off shell). The initial revision is `20261108_f8df81a7d113`. Seeding is optional in production:

```bash
python -m app.db.seed        # categories + admin only — creates admin@campusloop.app
```

Immediately change the admin password after the first login, or create the admin manually with a strong password.

### Backups

- Render PostgreSQL: enable automated backups on paid plans; verify the retention window.
- Neon: use point-in-time restore/branching.
- Before any destructive migration, take a manual backup or snapshot.
- Test restore into a staging database at least once.

---

## 3. Backend on Render

Create **New → Web Service** from the repository.

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Python 3.12 (or 3.13) |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/api/v1/health` |
| Release command | `alembic upgrade head` |

### Environment variables

| Key | Value |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | `postgresql+psycopg://…` (internal URL when possible) |
| `SECRET_KEY` | 48+ random bytes |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` (comma-separated for more) |
| `UPLOAD_DIR` | `uploads` (with a disk) or an absolute disk path |
| `MAX_IMAGE_MB` | `5` |
| `MAX_DOCUMENT_MB` | `10` |
| `AUTO_APPROVE_LISTINGS` | `false` |
| `OFFER_EXPIRY_HOURS` | `72` |
| `RATE_LIMIT_ENABLED` | `true` |
| `AI_*` flags | leave `false` until providers exist |

Do not add `VITE_*` variables to the backend; they are frontend-only.

### Persistent uploads

Render's default filesystem is **ephemeral**: files written under `uploads/` are lost on redeploy/restart.

1. Add a **Disk** to the service (e.g. mount path `/var/data`, size ≥ 1 GB).
2. Set `UPLOAD_DIR=/var/data/uploads`.
3. Ensure the process can create `public/` and `private/` beneath it.
4. Keep private documents outside any static mount (the app already serves only `uploads/public`).

Long-term, implement an S3/R2/Cloudinary driver behind `app/services/storage.py`'s `StorageBackend` interface and remove the disk dependency.

### Logging and errors

- Uvicorn access/error logs go to Render's log stream.
- Application errors are logged with the `campusloop` logger; clients receive sanitised messages.
- Never log tokens, passwords, documents or full request bodies containing secrets.

### WebSockets on Render

Render supports WebSockets on web services. The frontend derives `wss://` automatically when `VITE_API_BASE_URL` is HTTPS. If you use a custom WebSocket host, set `VITE_WS_BASE_URL` at build time.

The room registry is in-process. With more than one worker/instance, a socket connected to instance A will not receive a message broadcast on instance B. For horizontal scaling, add Redis pub/sub (or a managed realtime service) behind `app/websocket/manager.py`.

---

## 4. Frontend on Vercel

1. **Add New → Project**, import the repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**. Build command `npm run build`; output `dist`.
4. Environment variable:

```
VITE_API_BASE_URL=https://<your-api-host>/api/v1
```

5. Deploy.

`frontend/vercel.json` already provides:

- SPA rewrite of all paths to `/index.html` (React Router deep links work on refresh).
- Immutable caching for hashed assets.

### Alternative: Render Static Site

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Rewrite | `/*` → `/index.html` |

Add the same `VITE_API_BASE_URL` environment variable. Rebuild after changing it; Vite inlines values at build time.

### CORS

After the first deploy, copy the exact frontend origin into the backend's `ALLOWED_ORIGINS` and restart. Include both `https://your-app.vercel.app` and any custom domain. Preview deployments use different subdomains; either add them explicitly or use a stable staging origin.

---

## 5. Custom domain and HTTPS

1. Add the domain in Vercel/Render and follow the DNS instructions.
2. Update `ALLOWED_ORIGINS` to the custom frontend domain (keep the platform domain if still used).
3. Set `VITE_API_BASE_URL` to the custom API domain and redeploy the frontend.
4. Confirm `https://` and `wss://` work; mixed content is blocked by browsers.

---

## 6. Post-deploy verification

Run these against the real URLs:

```bash
# Health
curl -i https://<api-host>/api/v1/health

# Public data
curl -s https://<api-host>/api/v1/categories | head
curl -s "https://<api-host>/api/v1/products?page_size=3" | head

# Auth
curl -s -X POST https://<api-host>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@campusloop.app","password":"..."}'

# CORS preflight
curl -i -X OPTIONS https://<api-host>/api/v1/products \
  -H "Origin: https://<frontend-host>" \
  -H "Access-Control-Request-Method: GET"
```

Browser checks:

1. Landing page renders categories/listings from the real API.
2. Register → verify → admin approves → listing created and approved.
3. Two accounts: chat in both tabs, confirm live message delivery.
4. Offer → accept → transaction → both confirmations → listing sold.
5. Reload a deep link such as `/product/<id>` (SPA fallback).
6. Upload an image; reload after a redeploy (tests disk persistence).
7. Sign out and confirm protected routes redirect to `/login`.
8. Run a Lighthouse/accessibility pass and check the console for errors.

---

## 7. Security hardening

- Strong, unique `SECRET_KEY`; rotate if exposed.
- HTTPS only; HSTS at the edge if available.
- Restrict CORS to known origins (never `*` with credentials).
- Keep `RATE_LIMIT_ENABLED=true`; move to Redis for multiple instances.
- Use least-privilege database credentials; no superuser for the app.
- Store secrets only in the platform's environment/secret manager.
- Protect `/docs` in production if the API is public (disable or add auth) depending on your assessment requirements.
- Review `admin_audit_logs` periodically.
- Delete demo accounts and demo listings.
- Set up dependency and container scanning in CI (optional but recommended).
- Back up PostgreSQL before schema changes; test restores.

---

## 8. Rollback

1. Redeploy the previous frontend build (Vercel keeps deployments).
2. Roll back the backend to the previous release.
3. If a migration must be undone, use `alembic downgrade -1` **only after a verified backup**, or restore the snapshot.
4. Communicate any data impact; never drop tables to "fix" a deployment.

---

## 9. Environment variable reference (production)

```
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://user:password@host:5432/campusloop?sslmode=require
SECRET_KEY=<48+ random bytes>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=https://campusloop.example.com
UPLOAD_DIR=/var/data/uploads
MAX_IMAGE_MB=5
MAX_DOCUMENT_MB=10
AUTO_APPROVE_LISTINGS=false
OFFER_EXPIRY_HOURS=72
RATE_LIMIT_ENABLED=true
```

Frontend:

```
VITE_API_BASE_URL=https://api.campusloop.example.com/api/v1
# VITE_WS_BASE_URL=wss://api.campusloop.example.com
```

---

## 10. Deployment status for this submission

| Item | Status |
| --- | --- |
| Frontend production build | ✅ Verified locally |
| SPA fallback config | ✅ `frontend/vercel.json` |
| Backend production start command | ✅ Documented and locally verified with Uvicorn |
| PostgreSQL migration | ⚠ Written and applied to SQLite; not executed against a live PostgreSQL server here |
| Live deployment | ⛔ Not performed (no hosting credentials) |
| Custom domain / TLS | ⛔ Not configured |
| Email provider | ⛔ Not configured |
| Durable object storage | ⛔ Not configured (local disk driver only) |

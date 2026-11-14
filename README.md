# CampusLoop

**Buy. Sell. Connect.**

CampusLoop is a student-only second-hand marketplace for college communities. Verified students list laptops, phones, books, hostel furniture, sports gear and other campus essentials; buyers discover them through a filtered marketplace, chat in real time, negotiate offers, schedule a campus handover and complete the deal offline.

This repository is a complete, working full-stack academic project: **React + Vite + JavaScript + Tailwind CSS** on the frontend and **Python + FastAPI + SQLAlchemy + PostgreSQL** on the backend, with JWT authentication, WebSocket chat, Alembic migrations, tests and documentation.

> CampusLoop does **not** process payments. It records an agreed price and a handover meeting; money changes hands in person after inspection.

---

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Screenshots](#screenshots)
- [Quick start (Windows PowerShell)](#quick-start-windows-powershell)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Frontend commands](#frontend-commands)
- [Backend commands](#backend-commands)
- [API documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Demo accounts](#demo-accounts)
- [Project status and limitations](#project-status-and-limitations)
- [Documentation index](#documentation-index)

---

## Features

### Students

- **Student-only registration** with college, student ID, department, course and year.
- **Manual student verification** — submit details and an optional private ID document; a moderator approves or rejects with a reason. Listing, messaging, offers, meetings and transactions require a verified account.
- **Listings** with title, description, category/subcategory, price, original price, condition (New / Like New / Good / Fair / Used), brand, age, a mapped pickup location and up to six images. Drafts, edit, delete, mark sold.
- **Location picker** — place search with autocomplete, “use my location”, and a draggable OpenStreetMap pin; the chosen name, address details and coordinates appear on the product page.
- **Avatar cropping** — choose a photo, drag and zoom inside a square crop dialog, and save a 512 px JPEG.
- **Moderated marketplace** — new and edited listings go to `pending_verification`; only approved/available listings appear publicly.
- **Search and filters** — keyword, category, condition, price range, college, verified-seller-only, sort (newest, oldest, price, most viewed) and server-side pagination.
- **Wishlist** for later.
- **Real-time chat** over WebSockets with message history, unread counts, typing indicators, read receipts and automatic reconnection.
- **Offers and counteroffers** with a full negotiation history (pending, accepted, rejected, countered, cancelled, expired).
- **Meeting scheduling** — propose date/time/location/notes; the other party accepts, declines or reschedules.
- **Transaction lifecycle** — start from an accepted offer, reserve the listing, both parties confirm completion, listing becomes sold. Cancellation restores availability. Race conditions are prevented with `SELECT … FOR UPDATE` and conditional status checks.
- **Reviews** — only participants in a completed transaction, one review per transaction per reviewer; seller rating aggregates.
- **Reports** for listings and users, tracked to resolution.
- **Notifications** for approvals, offers, meetings, transactions, reviews and report outcomes.
- **Dashboard** with listing, offer, transaction and unread counts plus recent activity.
- **Rule-based fair-price guide** for sellers, clearly labelled `rule_based_v1` (not AI).

### Administrators

- Platform statistics and 7/14/30/90-day analytics.
- Verification queue with private document viewing, approve/reject with notes.
- Listing moderation: approve, reject with reason, remove.
- Report resolution with optional listing removal and account suspension.
- User search/filtering, suspend/reactivate accounts.
- Transaction monitoring.
- Audit log for sensitive admin actions.

### Interface

- Responsive desktop navigation (Home, Marketplace, Categories, Messages, My Listings, Notifications, Profile, prominent **Sell Item**) and a five-item mobile bottom bar (Home, Explore, Sell, Chat, Profile).
- Light and dark themes, Inter + Plus Jakarta Sans, the CampusLoop palette, accessible focus states, loading skeletons, empty and error states, toasts and confirmation dialogs.

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, JavaScript (JSX), React Router DOM 6, Axios, Tailwind CSS 3, Lucide React, Leaflet + OpenStreetMap (pickup maps), Context API |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2, Pydantic 2, python-jose JWT, bcrypt, Uvicorn |
| Database | PostgreSQL 15+ (production), SQLAlchemy ORM, Alembic migrations. SQLite is supported for local development when PostgreSQL is unavailable. |
| Realtime | FastAPI WebSockets with an in-process room manager |
| Files | Local storage driver with separate public (`uploads/public`) and private (`uploads/private`) roots behind a `StorageBackend` interface |
| Tests | Pytest + FastAPI TestClient (backend) |
| Deployment | Render (API + managed PostgreSQL), Vercel or Render (static frontend) |

Forbidden stacks from the project brief (Next.js, Express, Firebase, Supabase, MongoDB, Convex) are **not** used.

---

## Architecture

```
CampusLoop/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # auth, users, categories, products, wishlist, uploads,
│   │   │                    # conversations, offers, meetings, transactions, reviews,
│   │   │                    # reports, notifications, admin, ai
│   │   ├── core/            # config, security, errors, logging, rate limiting
│   │   ├── db/              # session, base, seed
│   │   ├── models/          # 16 SQLAlchemy entities
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # business logic (auth, catalog, chat, offers, meetings,
│   │   │                    # transactions, reviews, reports, admin, storage, pricing, ai)
│   │   ├── websocket/       # connection manager + chat endpoint
│   │   └── main.py
│   ├── alembic/             # migration environment + initial schema
│   ├── tests/               # pytest suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # common, layout, marketplace, products, chat, dashboard, profile, admin
│   │   ├── pages/           # public, student, auth and admin pages
│   │   ├── routes/          # ProtectedRoute
│   │   ├── context/         # AuthContext, ThemeContext, ToastContext
│   │   ├── hooks/           # useChatSocket, useUnreadCounts, useDocumentTitle
│   │   ├── services/        # axios client + typed API wrappers
│   │   ├── utils/           # currency, dates, class names
│   │   ├── constants/       # status maps, navigation, report reasons
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vercel.json          # SPA fallback
│   └── .env.example
├── docs/
├── README.md
├── PROJECT_STATUS.md
└── .gitignore
```

**Request flow:** page → `src/services` wrapper → Axios (`/api/v1`, JWT, refresh-on-401) → FastAPI router → service module → SQLAlchemy → PostgreSQL/SQLite. Route handlers stay thin; business rules live in services.

---

## Screenshots

Screenshots are not committed to the repository (they would add binary weight to an academic submission). Run the app and capture these pages for your report:

| Page | Route | What to capture |
| --- | --- | --- |
| Landing | `/` | Hero, category grid, latest listings |
| Marketplace | `/marketplace` | Filters, product cards, pagination |
| Product detail | `/product/:id` | Gallery, price guide, seller card |
| Dashboard | `/dashboard` | Stats, verification banner, activity |
| Chat | `/messages/:id` | Conversation with offer/meeting strip |
| Moderation | `/admin/listings` | Pending queue and actions |
| Analytics | `/admin/analytics` | 14-day charts |
| Mobile | `/` at 390px | Bottom navigation and stacked cards |

A suggested capture command (Windows) is `Win + Shift + S`; save images under `docs/screenshots/` and reference them here.

---

## Product imagery

Every demo listing and category card uses a locally hosted photo from `frontend/public/images/products/`, so no image service is required while running or building the app. The files are 800 x 600 JPEGs and are seeded into each demo product's `product_images` rows, with the first image used as the cover. Category and subcategory cards reuse the closest matching listing photo, and `ProductImage` falls back to that category photo if a listing image fails to load.

Two photos are real product shots from Wikimedia Commons and require attribution; the rest were generated for this project. See `frontend/public/images/products/ATTRIBUTION.md` for per-file sources, authors and licences.

---

## Quick start (Windows PowerShell)

Prerequisites: **Python 3.11+**, **Node.js 20+**, npm, and either PostgreSQL 15+ or the SQLite fallback. On this development machine the app runs on Python 3.14, Node 24 and SQLite.

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env: set SECRET_KEY and DATABASE_URL
python -c "import secrets; print(secrets.token_urlsafe(48))"   # paste into SECRET_KEY
python -m alembic upgrade head
python -m app.db.seed --demo
uvicorn app.main:app --reload --port 8000
```

- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/api/v1/health
- OpenAPI docs: http://127.0.0.1:8000/docs

### 2. Frontend (second terminal)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/uploads` (including WebSocket upgrades) to `http://127.0.0.1:8000`, so the default frontend needs no environment file.

### 3. Sign in

Use the seeded demo accounts below, or register a new student and submit verification, then approve it from the admin panel.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy URL | `postgresql+psycopg://user:pass@localhost:5432/campusloop` |
| `SECRET_KEY` | JWT signing key (required) | 48-byte random string |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` |
| `UPLOAD_DIR` | Storage root | `uploads` |
| `MAX_IMAGE_MB` / `MAX_DOCUMENT_MB` | Upload limits | `5` / `10` |
| `AUTO_APPROVE_LISTINGS` | Skip moderation (dev only) | `false` |
| `OFFER_EXPIRY_HOURS` | Offer validity | `72` |
| `RATE_LIMIT_ENABLED` | Enable in-memory limiters | `true` |
| `ENVIRONMENT` | `development` / `production` | `development` |
| `AI_*` flags | Future AI feature switches | `false` |

Never commit `.env`. `backend/.env.example` contains placeholders only.

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API root. Defaults to `/api/v1` (Vite proxy). Set to `https://api.example.com/api/v1` when the API is on another origin. |
| `VITE_WS_BASE_URL` | Optional explicit WebSocket root; defaults to the API host. |

---

## Database setup

### PostgreSQL (recommended / production)

```powershell
# Example with psql; create the role and database once
psql -U postgres
CREATE USER campusloop WITH PASSWORD 'change_me';
CREATE DATABASE campusloop OWNER campusloop;
\q
```

Set in `.env`:

```
DATABASE_URL=postgresql+psycopg://campusloop:change_me@localhost:5432/campusloop
```

Then run migrations and seed:

```powershell
cd backend
python -m alembic upgrade head
python -m app.db.seed          # categories + admin only
python -m app.db.seed --demo   # adds two verified students and 8 listings
```

### SQLite fallback (no PostgreSQL installed)

```
DATABASE_URL=sqlite:///./campusloop.db
```

The same Alembic migration works. To reset development data, stop the API, delete `backend/campusloop.db`, then rerun `alembic upgrade head` and the seed command. See `docs/INSTALLATION_GUIDE.md` for troubleshooting.

---

## Frontend commands

```powershell
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in frontend/dist
npm run preview   # serve the built bundle
```

Verified production build: **success**, 1700 modules, `dist/assets/index-*.js` ≈ 493 kB (≈ 139 kB gzip), CSS ≈ 46 kB.

---

## Backend commands

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
python -m pytest -q
python -m alembic upgrade head
python -m alembic revision --autogenerate -m "describe change"
python -m app.db.seed --demo
```

Verified test run: **28 passed** (see `docs/TESTING_GUIDE.md`).

---

## API documentation

- Interactive Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`
- Written reference: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

All 68 API paths sit under `/api/v1`, beside the service root at `/`. Protected routes require `Authorization: Bearer <access_token>`. Errors share one envelope:

```json
{ "detail": "Human-readable message", "code": "error_code", "errors": [{ "field": "email", "message": "..." }] }
```

---

## Testing

```powershell
cd backend
python -m pytest -q
```

The suite covers authentication, authorization, marketplace filtering, verification gating, offers, meetings, transactions (including duplicate-sale protection), reviews, reports, notifications and WebSocket authorization. Frontend verification is currently a production build plus a manual QA checklist; no frontend unit-test runner is configured (documented limitation).

---

## Deployment

- **Backend on Render:** root `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/v1/health`, release command `alembic upgrade head`. Add `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `ENVIRONMENT=production`, `RATE_LIMIT_ENABLED=true`.
- **Managed PostgreSQL:** Render PostgreSQL or Neon. Run migrations from the release command. Do not commit credentials.
- **Frontend on Vercel:** root `frontend`, build `npm run build`, output `dist`, env `VITE_API_BASE_URL=https://<api-host>/api/v1`. `vercel.json` provides the SPA fallback.
- **Uploads:** the local storage driver writes to disk. Render's filesystem is ephemeral unless a persistent disk is attached; attach one at `/opt/render/project/src/backend/uploads` or implement a cloud driver behind `StorageBackend` before relying on images in production.

Full steps, CORS notes and a go-live checklist: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

---

## Demo accounts

Seeded with `python -m app.db.seed --demo`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@campusloop.app` | `Admin@12345` |
| Verified student | `ananya@student.edu` | `Student@123` |
| Verified student | `rahul@student.edu` | `Student@123` |

Change or remove these before any real deployment. They are development fixtures, not production accounts.

---

## Project status and limitations

Phases 0–11 of the brief are implemented. Real, measured results:

- Backend test suite: **28 passed** (pytest, 16.00 s).
- Frontend production build: **success**.
- Backend health endpoint: **200**; frontend dev server: **200**; Vite proxy to `/api/v1` verified.
- Alembic initial migration applies cleanly to SQLite and is written for PostgreSQL.
- Live UI checks: landing, marketplace search, product detail with price guide, student dashboard, my listings, sell form, chat with WebSocket (`Live`), offers, meetings, profile, admin overview/users/verifications/listings/reports/analytics.

Known limitations are listed honestly in [`PROJECT_STATUS.md`](PROJECT_STATUS.md), including: local development runs on SQLite because PostgreSQL is not installed on this machine; email delivery is not configured (reset tokens are returned only outside production); uploads use local disk; rate limiting is in-memory and resets on restart; no frontend unit/E2E test runner; AI features are typed seams that report `disabled`.

---

## Documentation index

| Document | Contents |
| --- | --- |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Phase-by-phase implementation status, verification results, limitations |
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Problem, personas, journeys, architecture, trust model |
| [docs/FEATURES.md](docs/FEATURES.md) | Every feature and business rule by module |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, typography, components, navigation, themes, accessibility |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Entities, relationships, constraints, indexes, integrity rules |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Endpoint reference, auth, pagination, errors, WebSocket protocol |
| [docs/INSTALLATION_GUIDE.md](docs/INSTALLATION_GUIDE.md) | Step-by-step local setup on Windows |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Render, Vercel, managed PostgreSQL, security checklist |
| [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) | Automated tests, manual QA matrix, security checks |
| [docs/FUTURE_AI_FEATURES.md](docs/FUTURE_AI_FEATURES.md) | AI roadmap, interfaces, flags, privacy and rollout plan |

---

Built as an academic engineering project. No payments are processed, no student documents are public, and no AI capability is claimed until a real model is integrated.

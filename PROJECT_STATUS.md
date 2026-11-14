# CampusLoop — Project Status

**Last updated:** 9 November 2026
**Scope:** Phases 0–11 of the CampusLoop master brief
**Overall status:** Functional full-stack application, tested backend, successful production build, documentation complete. Local development currently runs on SQLite because PostgreSQL is not installed on this machine; the PostgreSQL path is implemented and documented but has not been executed against a live PostgreSQL server here.

---

## 1. Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Backend API | ✅ Implemented | 68 OpenAPI paths under `/api/v1` plus the service root, all routers registered |
| Database schema | ✅ Implemented | 16 entities, initial Alembic migration applies cleanly |
| Authentication | ✅ Implemented | Register/login/refresh/logout/forgot/reset/change password; JWT + bcrypt |
| Student verification | ✅ Implemented | Submit details + private document, admin approve/reject, gated actions |
| Marketplace | ✅ Implemented | Search, filters, sort, pagination, CRUD, images, drafts, moderation |
| Price guide | ✅ Implemented | Transparent `rule_based_v1` service and UI |
| Real-time chat | ✅ Implemented | WebSocket rooms, auth, reconnection, typing, read receipts |
| Offers | ✅ Implemented | Offer/counter/accept/reject/cancel, stored history |
| Meetings | ✅ Implemented | Propose/accept/decline/reschedule/cancel/complete |
| Transactions | ✅ Implemented | Locked rows, reservation, dual confirmation, sold state, cancellation |
| Reviews | ✅ Implemented | Completed-transaction-only, duplicate prevention, aggregates |
| Reports & notifications | ✅ Implemented | Listing/user reports, admin resolution, in-app notifications |
| Student dashboard | ✅ Implemented | Counts and recent activity from the database |
| Admin panel | ✅ Implemented | 7 pages + stats, analytics, audit logs |
| AI architecture | ✅ Seams implemented / ⏸ features disabled | 8 interfaces, flags, honest status endpoint |
| Backend tests | ✅ 28 passed | `python -m pytest -q` → `28 passed, 8 warnings in 16.00s` |
| Frontend build | ✅ Success | `vite build` → 1700 modules, ≈493 kB JS / ≈139 kB gzip |
| Documentation | ✅ Complete | README, this file, 9 documents in `docs/` |
| PostgreSQL runtime | ⚠ Not exercised locally | No PostgreSQL server on this machine; SQLite used for development |
| Frontend automated tests | ⚠ Not configured | Build + manual QA only (documented limitation) |

---

## 2. Phase-by-phase status

### Phase 0 — Initialization and architecture ✅

- Frontend/backend separation preserved; Vite + React + JavaScript + Tailwind configured.
- FastAPI application factory, CORS from settings, structured logging, consistent error handlers, GZip.
- SQLAlchemy session layer and Alembic environment configured.
- `.env.example` files for both apps; no secrets committed.
- README and this status file created.
- Backend and frontend start independently (verified on ports 8000 and 5173).

### Phase 1 — Design system and frontend foundation ✅

- Design tokens for the required palette, spacing, radii, shadows, typography, dark mode (`.dark` class).
- Reusable components: Button, Input, Textarea, Select, Checkbox, SearchBar, Badge/StatusBadge/VerifiedBadge, Avatar, Modal, ConfirmDialog, Toast, Pagination, Tabs, RatingStars, skeletons, empty/error states, ProductCard, CategoryCard, ProfileHeader, StatCard.
- Layouts: AppLayout, AuthLayout, AdminLayout, Navbar, MobileNav, Footer, auth-aware menus.
- Public pages: Home, Marketplace, Categories, Product detail, Login, Register, Forgot/Reset password, Seller profile, 404.

### Phase 2 — Authentication and student verification ✅

- Registration with full name, student email, college, student ID, department, course, year, password + confirmation.
- JWT access (30 min) and refresh (7 days) tokens; refresh-on-401 in Axios; session-expired event; protected routes.
- bcrypt password hashing; passwords never returned.
- Forgot/reset password (token hash stored with expiry; token only surfaced outside production); change password.
- Verification statuses `unsubmitted`, `pending`, `verified`, `rejected`; admin decision with required rejection reason.
- Verification gating enforced on the backend for listings, conversations, offers, meetings, transactions and reports.
- Private documents stored outside the public upload root and streamed only to the owner or an admin; viewing by an admin writes an audit log entry.
- Email domain alone is never treated as proof of enrolment.

### Phase 3 — Marketplace and product management ✅

- All required listing fields, five conditions, eight statuses.
- Create/edit/delete, multiple image upload (max 6, MIME + magic-byte validation, size limits), cover image, previews.
- Moderation: new/edited listings become `pending_verification` unless `AUTO_APPROVE_LISTINGS=true`; admin approve/reject/remove.
- Public visibility restricted to `approved|available`; owners and admins can still view their own/pending records.
- Server-side keyword/category/condition/price/college/verified filters, sorting and pagination.
- Wishlist, report listing, mark sold.
- Price recommendation on create and detail pages with range, confidence, factors and explicit non-AI labelling.

### Phase 4 — Fair price recommendation ✅

- `app/services/pricing.py` — category base, condition multiplier, age depreciation, brand adjustment, comparable listings, rounded suggestion and range.
- Response includes `method: "rule_based_v1"`, `confidence`, `factors`, `explanation`, `comparable_count`.
- UI exposes it in the listing form ("Get a fair price estimate") and product detail ("CampusLoop price guide").
- Service is isolated so an ML model can replace it without touching routes.

### Phase 5 — Real-time chat and negotiation ✅

- Conversations tied to a product and buyer/seller pair, unique constraint prevents duplicates.
- REST history + WebSocket endpoint `/api/v1/ws/chat/{conversation_id}?token=…`.
- Authorization on connect and every REST call; close codes 4401 (unauthenticated), 4403 (forbidden), 4404 (not found).
- Message persistence, timestamps, unread counts, read marking, typing events, reconnection with exponential backoff (client), room broadcast.
- Offers: create, accept, reject, counter, cancel; counteroffer returns the new counter; expiry and history stored; notification + socket event per change.

### Phase 6 — Meetings and transactions ✅

- Meeting propose/accept/reject/reschedule/cancel/complete with statuses and notification events.
- Transaction created from an accepted offer (buyer) or directly from a conversation at listing price.
- `SELECT … FOR UPDATE` on the product row; one open/completed transaction per product; second buyer blocked.
- Listing becomes `reserved` at transaction start, `sold` only after both parties confirm completion; cancellation restores `available`.
- No payment processing by design; all deals are offline and in person.
- Duplicate submissions are guarded by conditional status checks and unique constraints.

### Phase 7 — Ratings, reviews, reports, notifications ✅

- Reviews only for completed transactions, only by a participant, one per transaction per reviewer, rating 1–5.
- Seller rating average and review count on profiles and product pages.
- Reports for products and users with eight reasons and four statuses; admin resolution can remove the listing and/or suspend the user.
- Notification types cover listing decisions, messages, offers, meetings, transactions, reviews and reports.
- Notification list, unread count, mark one/all read, delete; navbar badge polling every 30 s.

### Phase 8 — Student dashboard and admin panel ✅

- Student dashboard: total/active/pending/rejected/sold listings, received/sent/pending offers, open/completed purchases and sales, unread messages/notifications, recent activity.
- My Listings: status tabs, counts, view/edit/mark sold/remove.
- Admin: platform stats, verification queue, listing moderation, reports, users, transactions, 7/14/30/90-day analytics, audit logs.
- Admin role enforced server-side on every `/admin` route; frontend role checks are only for navigation.

### Phase 9 — Future AI architecture ✅ (seams), features disabled

- `app/services/ai/base.py` defines eight capability interfaces: price prediction, recommendations, semantic search, listing assistant, image classification, fraud detection, duplicate detection, marketplace assistant.
- `app/services/ai/__init__.py` holds per-feature flags; `GET /api/v1/ai/features` reports `disabled` or `enabled but no model provider configured` — never fabricated results.
- Request/response contracts live in the AI module and are documented in `docs/FUTURE_AI_FEATURES.md`.
- Non-AI core works completely; no external AI calls exist.

### Phase 10 — Security, validation, QA ✅ (with noted gaps)

- bcrypt hashing, JWT validation, refresh rotation, role and verification dependencies.
- Pydantic validation on every payload; ORM parameter binding (no string SQL).
- Upload validation (extension, MIME, magic bytes, size), private/public separation.
- Rate limits on login, register, forgot-password, reports, uploads and messages.
- CORS restricted to configured origins; consistent error envelope; no stack traces leaked.
- WebSocket token + membership checks.
- Audit log for admin actions.
- 28 backend tests passing (see `docs/TESTING_GUIDE.md`).
- Gaps: no frontend automated tests; no load testing; in-memory rate limiting is per-process.

### Phase 11 — Deployment and documentation ✅

- Frontend production build succeeds; `vercel.json` adds SPA fallback and asset caching.
- Backend start command, health endpoint, CORS and environment configuration documented for Render.
- Alembic migration path for PostgreSQL documented; release command specified.
- README, PROJECT_STATUS, 9 docs, `.env.example` files, `.gitignore`.
- No deployment was performed (no hosting credentials were provided); deployment readiness is documented, not claimed as live.

---

## 3. Verification performed

| Check | Command / action | Actual result |
| --- | --- | --- |
| Backend tests | `cd backend && python -m pytest -q` | `28 passed, 8 warnings in 16.00s` |
| Backend health | `GET http://127.0.0.1:8000/api/v1/health` | HTTP 200 |
| Migration (SQLite) | `python -m alembic upgrade head` | Applied initial schema successfully |
| Seed | `python -m app.db.seed --demo` | 8 categories, admin, 2 verified students, 8 listings |
| Frontend install | `cd frontend && npm install` | 154 packages, exit 0 |
| Frontend build | `npm run build` | Success, 1700 modules transformed |
| Dev servers | uvicorn :8000, vite :5173 | Both HTTP 200 |
| Vite proxy | `GET http://127.0.0.1:5173/api/v1/products` | Live JSON returned |
| Auth API | Student login | 200, verified student |
| UI — home | Browser inspection | Categories and 8 live listings rendered |
| UI — marketplace | `?q=laptop` | 1 approved listing, active filter chip |
| UI — product | Owner view | Price guide ₹24,500 suggested (asking ₹28,000), owner actions |
| UI — dashboard | Student session | Active 3, sold 1, 4 total (live data) |
| UI — chat | Conversation | WebSocket status “Live”; message rendered |
| UI — admin | Admin session | Stats, verification/users/listings/reports/analytics pages render without API errors |
| Console | Browser log | Only React Router v7 future-flag warnings; no runtime errors |

Warnings in pytest are dependency deprecations (Starlette `HTTP_422_UNPROCESSABLE_ENTITY`, httpx), not failures.

---

## 4. Known limitations

1. **PostgreSQL not run locally.** The development machine has no PostgreSQL server; the app uses SQLite. Models, Alembic migration and SQLAlchemy types are PostgreSQL-compatible and the production URL format is documented, but a live PostgreSQL run must be performed before submission/deployment.
2. **Local file storage only.** Images and verification documents are written under `backend/uploads`. Render's default filesystem is ephemeral; attach a persistent disk or implement an S3/Cloudinary driver behind `StorageBackend`.
3. **No email provider.** Password reset returns a development token outside production; production returns only a generic message and no email is sent. A mail provider must be configured for real self-service resets.
4. **In-memory rate limiting.** Limits reset on process restart and are not shared across workers. Use Redis or an edge limiter for multi-instance deployments.
5. **In-process WebSocket rooms.** Single-worker only; multiple Uvicorn/Gunicorn workers require a Redis pub/sub (or similar) fan-out.
6. **No frontend unit/E2E tests.** Verification is a production build plus the manual QA matrix. No Vitest/Playwright suite is configured.
7. **AI features are disabled seams.** No model provider is configured; the API reports this honestly. The price guide is rule-based, not machine learning.
8. **Screenshots are not committed.** The README describes the exact pages to capture for a report.
9. **No payment integration.** Intentional per the brief; transactions record an offline handover.
10. **Notification badge polling.** The navbar refreshes counts on an interval and after socket/read events; there is no global notification socket.
11. **Seed data is development-only.** Demo accounts and listings must be removed before production.
12. **Public geocoding services.** Place search, reverse geocoding and map tiles use Photon and OpenStreetMap without an API key or SLA. They are suitable for a demo; a production launch should self-host or use a paid geocoder and tile provider, and disclose the search query to users.

---

## 5. External services / credentials still required

| Need | Why | Where to configure |
| --- | --- | --- |
| PostgreSQL instance | Production database | `DATABASE_URL` (Render/Neon) |
| Strong `SECRET_KEY` | JWT signing | Render environment / `.env` |
| Frontend production URL | CORS allowlist | `ALLOWED_ORIGINS` |
| Backend production URL | Frontend API base | `VITE_API_BASE_URL` |
| Persistent disk or object storage | Durable uploads | Render disk or new storage driver |
| SMTP/email API (optional) | Password reset email | Future `EmailBackend` integration |
| Geocoder / tile provider (optional) | Production-grade place search and maps | Current free Photon/OSM endpoints; swap for a keyed provider if volume grows |
| AI model provider (optional) | Enable AI seams | `AI_*` flags + provider credentials |

No credentials were invented or committed.

---

## 6. Recommended next steps

1. Run the full stack against PostgreSQL and repeat the test suite, migrations and manual QA.
2. Add Vitest + React Testing Library for critical frontend components and Playwright for the auth → listing → offer → transaction journey.
3. Replace local uploads with an object-storage driver and add image cleanup for deleted listings.
4. Add Redis for rate limits and WebSocket fan-out, enabling multiple API workers.
5. Add email delivery for verification and password reset.
6. Add pagination/virtualisation to chat history for long conversations.
7. Implement the AI capabilities behind the existing interfaces, starting with semantic search and the listing assistant, with evaluation and consent controls.

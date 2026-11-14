# CampusLoop — Project Overview

## 1. What CampusLoop is

CampusLoop is a student-exclusive second-hand marketplace. It exists so students can move useful things — laptops, phones, books, calculators, furniture, cycles, sports gear — to other students on the same campus, instead of losing money on a resale or leaving items behind at the end of a semester.

The product is deliberately **not** a payment platform. CampusLoop handles discovery, trust, negotiation and coordination. The exchange itself happens in person, after inspection, in cash or by direct transfer between the two students.

**Tagline:** Buy. Sell. Connect.

---

## 2. Problem and goals

### Problems it addresses

- Campus buy/sell groups are chaotic: repeated posts, no search, no history, no accountability.
- Buyers cannot tell whether a seller is a real student or a scammer.
- Sellers do not know what a fair price is.
- Unmoderated listings disappear without resolution when something goes wrong.
- Coordinating a handover happens across unrelated apps.

### Goals

1. **Student-only access.** Verification reviewed by a moderator; email domain alone is not proof.
2. **Trustworthy listings.** Every new listing is reviewed before appearing publicly.
3. **Clear negotiation.** Offers, counteroffers and their history are stored, not buried in chat.
4. **Safe handover.** Meetings have a time, place and status; deals are confirmed by both sides.
5. **Accountability.** Reviews only after completed deals; reports tracked to resolution; admin actions audited.
6. **A real full-stack project.** Actual APIs, database constraints and business rules — not mock data.

### Non-goals (v1)

- Online payments, escrow or shipping.
- Cross-college or public (non-student) commerce.
- Automated college/institution verification.
- AI features that are claimed but not built.

---

## 3. Personas

| Persona | Needs | Key flows |
| --- | --- | --- |
| **Student seller** (e.g. final-year student leaving hostel) | Sell quickly at a fair price, avoid time-wasters, choose when to hand over | Register → verify → list with photos → review offers → accept → meet → confirm completion |
| **Student buyer** (e.g. first-year student) | Find affordable, genuine items nearby, verify the seller, negotiate | Browse/filter → open listing → message → offer → agree → meet → confirm → review |
| **Moderator / admin** | Keep the marketplace safe and functional | Review verifications and ID documents → approve/reject listings → resolve reports → monitor transactions and analytics |
| **Evaluator / instructor** | See a complete, coherent system with evidence | Seeded demo accounts, API docs, tests, status report |

---

## 4. Core journeys

### 4.1 Seller journey

1. Registers with college and student ID details.
2. Submits verification (optionally uploading a private ID photo).
3. Admin reviews and approves.
4. Creates a listing: category, description, condition, price, up to six photos, optional original price/age/brand.
5. Optionally uses the rule-based price guide to choose a fair asking price.
6. Listing enters `pending_verification`; admin approves → `available`.
7. Receives messages, offers and counteroffers in real time.
8. Accepts an offer or agrees a price in chat.
9. Buyer starts a transaction → listing becomes `reserved`.
10. Meeting is proposed and confirmed.
11. Both parties confirm completion → listing becomes `sold`.
12. Receives a review from the buyer.

### 4.2 Buyer journey

1. Browses the public marketplace without an account.
2. Filters by category, condition, price, college and verified sellers.
3. Opens a listing, sees the seller's verification badge, rating and price guide.
4. Registers/verifies to message or offer.
5. Starts a conversation from the listing; chats in real time.
6. Sends an offer; seller accepts, rejects or counters.
7. After acceptance, starts the transaction (reserving the item).
8. Proposes or accepts a meeting.
9. Confirms completion after the handover.
10. Leaves a rating and review.

### 4.3 Admin journey

1. Signs in with an admin account (role enforced server-side).
2. Reviews pending verifications, including private documents.
3. Approves/rejects with a note (rejection requires a reason).
4. Moderates pending listings: approve, reject with reason, remove.
5. Investigates reports and optionally removes the listing or suspends the account.
6. Monitors platform stats, 7–90-day analytics and the audit log.

---

## 5. System architecture

```
┌──────────────────────────── Browser ────────────────────────────┐
│ React 18 + Vite + React Router + Context API + Tailwind          │
│  pages → services (Axios) → /api/v1                              │
│         ↳ WebSocket client (/api/v1/ws/chat/:id?token=…)         │
└───────────────┬──────────────────────────────┬──────────────────┘
                │ HTTPS/JSON                    │ WebSocket
┌───────────────▼──────────────────────────────▼──────────────────┐
│ FastAPI                                                          │
│  api/v1 routers → services → SQLAlchemy models                   │
│  auth deps (JWT, verified, admin) · rate limiters · errors       │
│  websocket manager (rooms) · storage driver · pricing · AI seams │
└───────────────┬──────────────────────────────┬──────────────────┘
                │ SQL                          │ files
       ┌────────▼────────┐          ┌──────────▼─────────────┐
       │ PostgreSQL      │          │ uploads/public (images) │
       │ (SQLite in dev) │          │ uploads/private (IDs)   │
       └─────────────────┘          └─────────────────────────┘
```

### Backend modules

| Module | Responsibility |
| --- | --- |
| `api/v1/*` | HTTP contracts, dependencies, status codes; no business logic |
| `services/auth_service` | Registration, login, tokens, password reset/change |
| `services/verification_service` | Submission, review, document access |
| `services/catalog_service` | Categories, listings, filters, wishlist, visibility |
| `services/pricing` | Rule-based price recommendation |
| `services/chat_service` | Conversations, messages, unread/read state |
| `services/offer_service` | Offer lifecycle and payloads |
| `services/meeting_service` | Meeting lifecycle |
| `services/transaction_service` | Locked sale lifecycle, confirmations, cancellation |
| `services/review_service` / `report_service` | Feedback and trust |
| `services/admin_service` | Stats, analytics, moderation, audit |
| `services/storage` | Public vs private file storage and validation |
| `services/ai/*` | Typed future-AI interfaces and feature flags |
| `websocket/*` | Connection manager and authenticated chat socket |

### Frontend structure

- `pages/` — one component per route, including `pages/admin/*`.
- `components/` — grouped by domain (`common`, `layout`, `marketplace`, `products`, `profile`, `dashboard`).
- `context/` — auth session, theme, toasts.
- `services/` — the only place that talks to the API.
- `hooks/` — socket, unread counters, document title.
- `routes/ProtectedRoute` — authentication, verification and admin guards (UX only; backend enforces).

---

## 6. Trust and safety model

| Layer | Control |
| --- | --- |
| Identity | Student ID number + college + optional private document; manual moderator review |
| Access | Unverified users can browse only; verified users can list, chat, offer, meet and transact |
| Listings | Moderation before public visibility; rejection requires a reason; removal is recorded |
| Negotiation | Immutable offer history; only the counterparty can respond; sold/reserved items cannot be re-sold |
| Handover | Meeting time/place, accept/reschedule/cancel, both-side confirmation |
| Feedback | Reviews restricted to completed transactions, one per reviewer per transaction |
| Abuse | Reports for listings/users, admin resolution, suspension, audit log |
| Privacy | Student ID documents private; no password, token or document in public payloads; private profile fields not exposed |

---

## 7. What makes this a real full-stack project

- 16 normalized database entities with foreign keys, unique constraints and indexes.
- Alembic migration rather than `create_all` in production.
- Server-side filtering/pagination and database-backed counters.
- Business rules enforced in services with row locking for the sale.
- JWT auth with refresh, role and verification dependencies on the server.
- Authenticated WebSockets with close codes and membership checks.
- File upload validation at the byte level, with private storage separated from public images.
- 28 automated backend tests covering the risky paths.
- Honest AI seams: no invented model output, no fake provider calls.

---

## 8. Future direction

The architecture is intentionally ready for AI as a major-project extension: price prediction, recommendations, semantic search, listing assistance, image classification, fraud/duplicate detection and a marketplace assistant. Interfaces and flags already exist; see `docs/FUTURE_AI_FEATURES.md`. The current price guide remains explicitly rule-based.

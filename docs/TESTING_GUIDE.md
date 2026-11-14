# CampusLoop — Testing Guide

## 1. What is automated

The backend suite uses **pytest** with FastAPI's `TestClient`. It runs against a dedicated SQLite file (`backend/tests/test_campusloop.db`) created from the SQLAlchemy metadata, so tests never touch development data. Rate limiters are disabled in the test environment.

```
backend/tests/
├── conftest.py          # app/database fixtures, user factories, product helper
├── test_auth.py         # registration, login, refresh, verification, admin gating, reset
├── test_marketplace.py  # listing rules, moderation, search, wishlist, pricing, AI status
├── test_trade_flow.py   # chat auth, offers, purchase, cancellation, reports, dashboard
└── test_websocket.py    # authentication, membership, live delivery
```

### Run

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pytest -q
```

### Latest measured result

```
28 passed, 8 warnings in 16.00s
```

Warnings are dependency deprecations (Starlette `HTTP_422_UNPROCESSABLE_ENTITY`, `httpx` TestClient notice, pytest plugin alias), not failures.

---

## 2. Test inventory (28)

### Authentication — `test_auth.py` (8)

| Test | Verifies |
| --- | --- |
| `test_register_login_and_refresh` | Registration returns tokens and a user; login works; refresh issues a new access token; `/users/me` accepts it |
| `test_duplicate_registration_rejected` | Case-insensitive duplicate email returns 409 |
| `test_weak_password_and_mismatch_rejected` | Password policy and confirmation mismatch return 422 with field errors |
| `test_wrong_password_and_protected_route` | Bad credentials return 401; missing token on a protected route returns 401 |
| `test_profile_update_and_seller_profile` | Profile PATCH persists; public seller profile hides private fields |
| `test_verification_flow_approves_account` | Student submits verification; admin approves; status becomes verified |
| `test_student_cannot_reach_admin_endpoints` | Ordinary student receives 403 on admin stats |
| `test_forgot_and_reset_password` | Reset token works once; old password stops working; new password logs in |

### Marketplace — `test_marketplace.py` (10)

| Test | Verifies |
| --- | --- |
| `test_listing_requires_verification_and_moderation` | Unverified blocking; new listing is pending; only approved listings appear publicly |
| `test_unverified_student_cannot_list` | 403 before verification |
| `test_other_student_cannot_edit_or_delete` | Ownership enforcement on PATCH/DELETE |
| `test_invalid_category_and_price_rejected` | Unknown category and non-positive price are rejected |
| `test_listing_location_coordinates_roundtrip` | Location name, address details and coordinates persist and return on detail; latitude without longitude is rejected |
| `test_search_filters_and_pagination` | Keyword, condition, price, sort and page metadata behave |
| `test_wishlist_roundtrip` | Add, list and remove are idempotent and scoped to the user |
| `test_price_recommendation_is_rule_based` | `method == rule_based_v1`, range ordering, explanation present |
| `test_ai_features_are_reported_as_disabled` | No fabricated AI availability |
| `test_seller_can_mark_sold` | Owner-only sold transition |
| `test_my_listings_filters` | Owner-only listing views by status |

### Trade flow — `test_trade_flow.py` (6)

| Test | Verifies |
| --- | --- |
| `test_chat_requires_participants` | Non-participants cannot read a conversation |
| `test_offer_counter_and_accept` | Counteroffer returns the new amount; only the counterparty can accept |
| `test_full_purchase_flow_and_review` | Accepted offer → transaction → both confirmations → product sold → review allowed once |
| `test_transaction_cancellation_restores_listing` | Cancellation restores availability; another buyer can proceed |
| `test_report_and_admin_resolution` | Report creation, admin resolution, optional removal, notification |
| `test_dashboard_and_notifications` | Counts and notification read/unread behaviour |

### WebSocket — `test_websocket.py` (3)

| Test | Verifies |
| --- | --- |
| `test_websocket_requires_authentication` | Missing/invalid token cannot connect (4401) |
| `test_websocket_rejects_non_participant` | Authenticated outsider is rejected (4403) |
| `test_websocket_delivers_messages_between_participants` | A message sent by one participant is delivered to the other in real time |

---

## 3. Manual QA matrix

Use two browsers (or one normal + one private window) for the two-party flows. Seeded accounts: admin `admin@campusloop.app` / `Admin@12345`; students `ananya@student.edu` and `rahul@student.edu` / `Student@123`.

### Authentication and verification

- [ ] Register with valid data → redirected to verification; session active.
- [ ] Register with mismatched passwords → inline error; no account created.
- [ ] Register with a weak password → policy message.
- [ ] Log in with wrong password → human-readable 401 message.
- [ ] Refresh the page after login → session restored from `/users/me`.
- [ ] Expire/clear the access token → refresh succeeds once, otherwise redirect to login with a toast.
- [ ] Submit verification with and without a document → pending state.
- [ ] Admin approves → student can list; admin rejects with a note → student sees the note and can resubmit.
- [ ] Unverified student visiting `/sell` sees the verification gate, not the form.
- [ ] Student visiting `/admin` sees the access-denied page; direct API call returns 403.

### Listings

- [ ] Create a draft → visible only in My Listings → Drafts.
- [ ] Submit a listing → pending; not visible in the public marketplace.
- [ ] Admin approves → appears publicly; seller receives a notification.
- [ ] Admin rejects with a reason → owner sees the reason; editing allows resubmission.
- [ ] Upload 1–6 images with progress; oversized/wrong-type files are rejected with a clear message.
- [ ] Edit title/price; confirm the detail page reflects changes.
- [ ] Mark sold → no buyer actions; product shows Sold overlay.
- [ ] Delete listing → confirmation, then removed from My Listings.
- [ ] Attempt to edit another seller's listing by URL → access denied.

### Marketplace discovery

- [ ] Search keyword, filter category/condition/price/college, verified-only, each sort.
- [ ] Active filter chips remove individual filters; Reset clears all.
- [ ] Pagination preserves filters and updates the page count.
- [ ] Empty result shows an empty state with a reset action.
- [ ] Wishlist heart toggles; wishlist page reflects removal immediately.
- [ ] Product detail shows placeholder when no image exists.

### Chat, offers and meetings

- [ ] Message seller from a listing → conversation opens with the first message.
- [ ] Two windows: messages arrive live; typing indicator appears; unread badges update.
- [ ] Disconnect the network briefly → status changes, reconnect occurs.
- [ ] Non-participant opening another conversation URL → error state, no messages.
- [ ] Buyer offers; seller sees accept/counter/decline; counteroffer returns to the buyer.
- [ ] Accepted offer shows “Start transaction” for the buyer.
- [ ] Propose a meeting; the other side accepts or reschedules; status strip updates.
- [ ] Withdraw a pending offer; declined/cancelled offers are no longer actionable.

### Transactions and reviews

- [ ] Start transaction → listing becomes reserved; another buyer cannot start one.
- [ ] First confirmation → awaiting the other party; second → completed and product sold.
- [ ] Cancel a transaction → product available again; reason shown.
- [ ] Review appears on the seller profile; a second review for the same transaction is blocked.
- [ ] Rating aggregates update.

### Reports and notifications

- [ ] Report a listing and a user with each reason.
- [ ] Admin resolves a report, optionally removes the listing/suspends the user.
- [ ] Reporter receives a notification with the outcome.
- [ ] Mark one/all notifications read; badge count drops; delete removes an item.
- [ ] Suspended user cannot log in; reactivation restores access.

### Admin and analytics

- [ ] Statistics match the database counts.
- [ ] Verification document opens only for an admin; the action appears in the audit log.
- [ ] Listing queue tabs and search work; approve/reject/remove update the seller.
- [ ] User search/filter; suspend and reactivate with confirmation.
- [ ] Transaction monitoring lists buyer/seller/price/status.
- [ ] Analytics range switch shows non-negative series; category bars render.

### UI, responsiveness and accessibility

- [ ] 390 px, 768 px, 1024 px and 1440 px layouts: no horizontal overflow, cards stack, filters become a modal.
- [ ] Mobile bottom nav: Home, Explore, Sell, Chat, Profile; raised Sell action.
- [ ] Light/dark toggle persists across reloads; contrast remains readable.
- [ ] Keyboard: tab through nav/forms; Escape closes modals; focus is trapped in dialogs.
- [ ] Screen-reader labels present on icon buttons and form controls.
- [ ] Every destructive action has a confirmation dialog.
- [ ] Browser console shows no runtime errors during the flows.

---

## 4. Security checks (negative tests)

These are covered by automated tests where noted; repeat manually after changes.

| Check | Expected | Automated |
| --- | --- | --- |
| Unverified user creates listing | 403 | ✅ |
| User edits/deletes another's listing | 403 | ✅ |
| Non-participant reads conversation | 403/404 | ✅ |
| Non-participant opens WebSocket | Close 4403 | ✅ |
| WebSocket without token | Close 4401 | ✅ |
| Non-counterparty accepts an offer | 403/409 | ✅ |
| Sold product purchased again | 409 | ✅ |
| Review before completion / duplicate review | 409 | ✅ |
| Student calls admin endpoint | 403 | ✅ |
| Invalid status transitions (meeting/offer/transaction) | 409/422 | ✅ (key paths) |
| Suspended user logs in | 401/403 | Manual |
| Oversized or wrong-type upload | 422 | Manual |
| Rate limit exceeded | 429 | Manual |
| Foreign-origin CORS preflight | No allow header | Manual |
| Private document without owner/admin token | 401/404 | Manual |
| SQL injection string in filters | Treated as text, no error leak | Manual |

---

## 5. Performance and concurrency notes

- The purchase path locks the product row (`SELECT … FOR UPDATE`) and checks existing open/completed transactions, preventing two buyers from creating competing deals.
- Unique constraints protect duplicate conversations, wishlist entries and reviews even under concurrent requests.
- Marketplace queries use indexed columns (`status`, `category_id`, `price`, `created_at`).
- Not load-tested. Expected next step: Locust/k6 against product search and chat, with PostgreSQL and multiple workers.

---

## 6. Frontend verification

There is **no frontend unit/E2E runner configured**. Verification performed for this build:

1. `npm install` → 154 packages, exit 0.
2. `npm run build` → success, 1700 modules, ≈493 kB JS (≈139 kB gzip), ≈46 kB CSS.
3. Dev server boot and Vite proxy check (`/api/v1/products` returned live JSON).
4. Browser checks of home, marketplace search, product detail, dashboard, my listings, sell form, chat (WebSocket `Live`), offers, meetings, profile and the admin pages; console showed only React Router v7 future-flag warnings.

Recommended additions:

- **Vitest + React Testing Library** for `ProductCard`, `ProtectedRoute`, offer/meeting actions, form validation and the date formatter.
- **Playwright** for the critical journey: register → verify (admin) → list → approve (admin) → chat → offer → transaction → review.
- **axe** accessibility checks on the main pages.

---

## 7. Continuous integration suggestion

```yaml
# .github/workflows/ci.yml (example)
name: ci
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -m pytest -q
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd frontend && npm ci && npm run build
```

For PostgreSQL parity, add a `postgres:16` service container and run `alembic upgrade head` before tests instead of the SQLite test database.

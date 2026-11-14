# CampusLoop — Features and Business Rules

This document lists what the application does, which statuses exist, who may perform each action, and which rules are enforced on the server.

Legend: ✅ implemented and wired end-to-end · 🔒 requires authentication · ✅🎓 requires a verified student account · 👑 requires an administrator.

---

## 1. Authentication

| Feature | Detail | Access |
| --- | --- | --- |
| Register | Full name, student email, college, student ID, department, course, year, password + confirmation | Public |
| Login | Email + password → access token (30 min) + refresh token (7 days) + user payload | Public |
| Refresh | Exchanges a valid refresh token for a new access token | Public (token required) |
| Logout | Server acknowledges; the client discards both tokens (stateless JWT) | 🔒 |
| Forgot password | Creates a hashed, expiring reset token. In non-production the token is returned so the flow can be tested without email; in production only a generic message is returned | Public |
| Reset password | Token + new password + confirmation; validates strength and match | Public |
| Change password | Current password + new password | 🔒 |
| Profile | View/update name, college, department, course, year, phone, bio, avatar. Photo upload opens a square crop dialog with drag and zoom before a 512 px JPEG is saved | 🔒 |

**Rules**

- Passwords are hashed with bcrypt; plaintext is never stored or returned.
- Passwords must be 8–128 characters and contain at least one letter and one number.
- Duplicate emails are rejected by a unique constraint.
- A verified student cannot change their college through the profile endpoint (contact-support rule), preventing verification shopping.
- Access tokens are validated on every protected request; refresh tokens are validated on refresh.
- Axios refreshes once on a 401, retries the original request, and dispatches a session-expired event if refresh fails.
- Rate limits: login 10 / 5 min per identifier+IP, register 5 / hour, forgot-password 5 / hour.
- Deactivated accounts cannot log in.

---

## 2. Student verification

**Statuses:** `unsubmitted` → `pending` → `verified` | `rejected`

| Feature | Detail | Access |
| --- | --- | --- |
| Submit verification | College, student ID number (required), department, course, year, note, optional document (PNG/JPG/WebP/PDF) | 🔒 |
| View own status | Status, moderator note, submitted/reviewed timestamps | 🔒 |
| Download own document | Streamed from private storage | 🔒 (owner) |
| Review queue | Filter by status, view details and private document | 👑 |
| Approve | Sets user `verification_status = verified` | 👑 |
| Reject | Requires a written reason; user sees the note and may resubmit | 👑 |
| Audit | Admin document views and decisions are logged | 👑 |

**Rules**

- College name or email domain alone is **never** treated as proof of enrolment.
- Documents live under `uploads/private` (never mounted publicly) and are served only by authenticated owner/admin endpoints.
- A user with `pending` cannot submit again until a decision is made.
- Verification gates: create/edit listings, start conversations, send offers, propose/respond to meetings, create transactions and submit reports. Replying inside an existing conversation only requires authentication and participation.
- Browsing, wishlist and profile management remain available to unverified users.

---

## 3. Listings and marketplace

### Fields

Title, description, category/subcategory, price, original price (optional), condition, brand, age in months, pickup location, up to six images, seller, status, timestamps, view counter, rejection reason.

**Location:** the seller can search places with autocomplete (Photon), use the browser's current location, or tap/drag a pin on an OpenStreetMap map. The display name, full address details and coordinates are stored; the product page renders the pin in a read-only map. Only the approximate area is shown — buyers still agree the exact meeting spot in chat.

**Conditions:** New, Like New, Good, Fair, Used.

**Statuses**

| Status | Meaning | Publicly visible |
| --- | --- | --- |
| `draft` | Saved privately by the seller | No |
| `pending_verification` | Submitted for moderator review | No |
| `approved` | Approved by a moderator | Yes |
| `available` | Live and purchasable | Yes |
| `rejected` | Rejected with a reason; editable and resubmittable | No |
| `reserved` | An open transaction holds the item | Yes (marked reserved) |
| `sold` | Completed sale | Yes (marked sold, not actionable) |
| `removed` | Removed by a moderator | No |

### Features

| Feature | Detail | Access |
| --- | --- | --- |
| Create listing | New listings go to `pending_verification` unless `AUTO_APPROVE_LISTINGS=true`; drafts allowed | ✅🎓 |
| Edit listing | Owner or admin; editing a live listing may require re-approval | 🔒 owner/👑 |
| Delete listing | Soft removal; conversations and history preserved | 🔒 owner/👑 |
| Upload images | Up to 6; PNG/JPG/WebP; MIME + magic-byte check; size limit; progress bar | ✅🎓 |
| Browse marketplace | Server-side search, filters, sort, pagination | Public |
| Product detail | Gallery, seller card, price guide, status-aware actions | Public |
| Wishlist | Add/remove/list saved products | 🔒 |
| Mark sold | Owner only; blocked when an active transaction exists | 🔒 owner |
| Report listing | Eight reasons, free-text details | ✅🎓 |

**Marketplace filters**

- `q` — title, description, brand, category name (case-insensitive contains)
- `category` — category or subcategory slug
- `condition` — repeatable/comma-separated
- `min_price` / `max_price`
- `college`
- `verified_only`
- `sort` — `latest`, `oldest`, `price_asc`, `price_desc`, `popular` (views)
- `page`, `page_size` (max 60)

**Rules**

- Public queries only include `approved` and `available` listings.
- Owners and admins can view their own pending/rejected listings via the authenticated detail endpoint.
- Sold/reserved listings remain viewable but cannot be messaged or offered on (blocked in service and UI).
- A listing may only be edited/deleted by its owner or an admin.
- A product with an open transaction cannot be re-sold to another buyer.
- Listing approval/rejection/removal notifies the seller and writes an audit entry.

---

## 4. Price guide (rule-based)

| Input | Effect |
| --- | --- |
| Category base range | Starting resale range for the category |
| Condition | New 92%, Like New 80%, Good 68%, Fair 52%, Used 40% of reference |
| Age | Depreciates from reference price with a floor |
| Brand | Small adjustment for known brands |
| Comparable listings | Recent approved prices in the same category narrow/adjust the estimate |
| Asking price | Compared with the suggestion; explanation flags over/under-pricing |

**Output:** `suggested_price`, `min_price`, `max_price`, `confidence`, `method = "rule_based_v1"`, `factors[]`, `explanation`, `comparable_count`.

**Rules**

- Never labelled AI/ML. The UI shows "Rule-based estimate · not AI".
- Public endpoint, rate-limited by general middleware only.
- Replacing it with an ML model requires no route changes.

---

## 5. Chat

| Feature | Detail | Access |
| --- | --- | --- |
| Start conversation | From a listing, optionally with a first message; unique per (product, buyer, seller) | ✅🎓 |
| Conversation list | Counterpart, product, last message, unread count, latest offer | 🔒 participant |
| History | Ordered messages with sender, type, timestamp | 🔒 participant |
| Send message | REST persistence + WebSocket broadcast | 🔒 participant |
| Mark read | Per-participant last-read timestamp | 🔒 participant |
| Typing | Ephemeral WebSocket event | 🔒 participant |
| Reconnect | Exponential backoff, capped at 8 s; auth failures stop retries | Client |
| Unread total | Used by navbar/mobile badges | 🔒 |

**Rules**

- A user cannot message themselves about their own listing.
- Both participants are checked on every REST call and on WebSocket connect.
- Sending requires a verified account to start; replying requires participation.
- Message body 1–4000 characters; rate limit 120/min per user.
- Close codes: 4401 unauthenticated, 4403 not a participant, 4404 unknown conversation.
- System messages record transaction starts and similar events.

---

## 6. Offers

**Statuses:** `pending`, `accepted`, `rejected`, `countered`, `cancelled`, `expired`.

| Action | Who | Rule |
| --- | --- | --- |
| Create offer | Buyer (verified) | Amount > 0; conversation must exist; seller cannot offer on own item |
| Accept | Counterparty | Only a pending, non-expired offer; sets accepted and notifies |
| Reject | Counterparty | Only pending |
| Counter | Counterparty | Requires a new amount; marks original `countered`, creates a child offer |
| Cancel | Offer author | Only while pending |
| Expire | System on read | Past `expires_at` is reported as expired and cannot be accepted |

**Rules**

- Every offer and counter is stored with `parent_offer_id`, author, responder and timestamps.
- Only the side that did not make the current offer can respond.
- Accepted offers are the basis for a transaction at the agreed price.
- An offer alone never marks an item sold.

---

## 7. Meetings

**Statuses:** `proposed`, `confirmed`, `rescheduled`, `cancelled`, `completed`.

| Action | Who |
| --- | --- |
| Propose date/time/location/notes | Either participant (verified) |
| Accept | The other participant |
| Reject | The other participant |
| Reschedule with a new time/place | The other participant |
| Cancel | Either participant |
| Complete | Proposer after confirmation |

**Rules**

- Only participants of the meeting's conversation may act.
- A new proposal notifies the counterparty via notification and socket event.
- Meetings are linked to transactions when one exists.

---

## 8. Transactions

**Statuses:** `pending`, `meeting_scheduled`, `completion_requested`, `completed`, `cancelled`.

**Workflow**

1. Offer accepted (or buyer starts from conversation at listing price).
2. Buyer creates the transaction; a meeting may be attached automatically.
3. Product row is locked (`SELECT … FOR UPDATE`) and must be `available`/`approved`.
4. Product becomes `reserved`; other buyers are blocked by an existing open/completed transaction check.
5. Both parties confirm completion. First confirmation moves to `completion_requested`; second marks `completed` and sets the product `sold`.
6. Cancellation by either party restores the product to `available`.

**Rules**

- Only the buyer may start a transaction from a conversation; either party may start from an accepted offer.
- A completed transaction is final for that listing.
- Duplicate submission by the same pair returns the existing open transaction rather than creating a second one.
- Only participants can view or act on a transaction.
- No payment processing exists; `agreed_price` is a record, not a charge.

---

## 9. Reviews

| Feature | Detail | Access |
| --- | --- | --- |
| Create review | Rating 1–5 + optional comment | 🔒 participant in a `completed` transaction |
| Duplicate guard | Unique `(transaction_id, reviewer_id)` | Server |
| Seller aggregates | Average rating, review count, completed deals | Public |
| Reviews list | Reviewer name/avatar, rating, comment, date | Public |

**Rating labels:** 1 Very Poor · 2 Poor · 3 Average · 4 Good · 5 Excellent.

A review automatically determines the reviewee (the counterparty) and the product.

---

## 10. Reports

**Reasons:** fake product, incorrect description, fraud, suspicious user, inappropriate listing, misleading price, spam, other.

**Statuses:** `pending`, `under_review`, `resolved`, `rejected`.

| Feature | Access |
| --- | --- |
| Report a product or user | ✅🎓 (10 / hour) |
| View own reports | 🔒 |
| Admin queue and detail | 👑 |
| Resolve/dismiss with note, optional listing removal, optional account suspension | 👑 |

**Rules**

- Reports identify the target type and ID; admins see a human-readable target label/link.
- Resolution writes a notification to the reporter and an audit entry.
- Suspension requires an admin action and reason; suspended users cannot sign in.

---

## 11. Notifications

**Types:** listing approved/rejected/removed, new message digest, new offer, offer accepted/rejected, counteroffer, meeting proposed/confirmed/rescheduled/cancelled, transaction started/completed/cancelled, new review, report status.

| Feature | Access |
| --- | --- |
| List (all/unread, newest first, limit 100) | 🔒 |
| Unread count | 🔒 |
| Mark one read | 🔒 owner |
| Mark all read | 🔒 |
| Delete | 🔒 owner |

Unread counts drive the navbar bell and mobile chat badge; the client refreshes on socket events, read actions and a 30-second poll.

---

## 12. Dashboard and listings management

**Dashboard:** total/active/pending/rejected/sold listings; received/sent/pending offers; open/completed transactions; purchases/sales; unread messages/notifications; verification status; six most recent notifications.

**My Listings:** tabs for all/live/pending/drafts/rejected/sold with counts, thumbnail, price, condition, category, rejection reason, and actions (view, edit, mark sold, remove).

---

## 13. Admin panel

| Page | Capabilities |
| --- | --- |
| `/admin` | User/verification/listing/report/transaction stats, average rating, moderation queues, recent audit actions |
| `/admin/verifications` | Pending/approved/rejected/all, document viewer, approve, reject with reason |
| `/admin/listings` | Status tabs, title search, view/approve/reject/remove with reason |
| `/admin/reports` | Status tabs, target link, resolve/dismiss, remove listing, suspend user |
| `/admin/users` | Search name/email/college, filter role/verification/status, suspend/reactivate |
| `/admin/transactions` | Status filter, buyer/seller, agreed price, confirmations, dates |
| `/admin/analytics` | 7/14/30/90-day user, listing and transaction series; category distribution; status counts; average rating |

**Rules**

- Every `/api/v1/admin/*` route depends on `require_admin`; hiding navigation is not a security control.
- Admins cannot be suspended from the users page (protected in UI; role checks server-side).
- Sensitive actions write `AdminAuditLog` rows (actor, action, entity, detail, IP, timestamp).
- Private student documents are never included in list payloads; only a `has_document` flag and a dedicated streamed endpoint.

---

## 14. AI readiness

- Eight capability interfaces and request/response contracts exist.
- Each feature has an enable flag; `GET /ai/features` reports `disabled` or `enabled but no model provider configured`.
- No fabricated AI results, no external AI calls, no private data leaves the system.
- The non-AI core is fully functional without any AI provider.

See `docs/FUTURE_AI_FEATURES.md`.

---

## 15. Edge cases handled in the UI

- Expired session → refresh once, then sign out with a toast.
- Network failure → human-readable "Cannot reach the server" message with retry actions.
- Socket disconnect → status badge (`Live`/`Connecting`/`REST`), automatic reconnect.
- Invalid/missing product → not-found error state.
- Missing images → branded placeholder, never a broken icon.
- Suspended user → login rejected; public profile unavailable.
- Rejected listing → reason shown on detail, my listings and edit form.
- Expired offer → shown as expired and not actionable.
- Cancelled meeting/transaction → status and reason shown.
- Sold listing → actions disabled with an explanation.
- Duplicate submissions → buttons disable while pending; server guards repeats.
- Unauthorized access → 403/404 from the API, guarded routes client-side.
- Failed upload → toast with the size/type requirement, existing images preserved.
- Destructive actions (delete listing, suspend, cancel deal, remove listing) require confirmation.

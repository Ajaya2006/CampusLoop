# CampusLoop — Database Schema

## 1. Conventions

- **Primary keys:** UUID v4 strings (`String(36)`), generated in the application before insert. Public-facing records are non-sequential and non-guessable.
- **Timestamps:** UTC, stored naive in SQLite and `TIMESTAMP WITH TIME ZONE`-compatible in PostgreSQL. `created_at`/`updated_at` are set by the application (`utcnow()`); a helper normalises SQLite's naive values for comparisons.
- **Money:** `Numeric(12, 2)` (`Decimal` in Python), never floats in the database.
- **Enums:** portable string-backed `VARCHAR(32)` with validation (`native_enum=False`), so PostgreSQL does not need custom enum types. Values are the lowercase snake_case strings used by the API.
- **Migrations:** Alembic (`backend/alembic/versions/20261108_f8df81a7d113_initial_campusloop_schema.py`). Production uses `alembic upgrade head`; `create_all` is used only in tests.
- **Deletion:** soft status changes are preferred for listings and accounts. Foreign keys on dependent history use restricted/default behaviour rather than cascading away transactions and reviews.

---

## 2. Entity relationships

```
User 1───* StudentVerification
User 1───* Product ───1 Category (parent/children self-relation)
Product 1───* ProductImage
User *───* Product  through Wishlist
Product 1───* Conversation *───1 User (buyer, seller)
Conversation 1───* Message
Conversation 1───* ConversationParticipant *───1 User
Conversation 1───* Offer
Conversation 1───* Meeting
Product 1───* Transaction *───1 User (buyer, seller)
Offer 0..1───1 Transaction
Meeting 0..1───1 Transaction
Transaction 1───* Review
User 1───* Review (reviewer, reviewee)
User 1───* Report (reporter)   Report → Product | User (target_type/target_id)
User 1───* Notification
User 1───* AdminAuditLog (admin)
Category 1───* Product
```

---

## 3. Tables

### 3.1 `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string(36) PK | UUID |
| `full_name` | string(120) | required |
| `email` | string(255) | **unique**, indexed, lower-cased before storage |
| `hashed_password` | string(255) | bcrypt hash, never exposed |
| `role` | enum | `student` or `admin` |
| `college` | string(180) | required; indexed (`ix_users_college`) |
| `student_id_number` | string(80) | required at registration; never public |
| `department`, `course` | string(120) | optional |
| `year` | integer | 1–8 |
| `phone` | string(30) | optional, not public |
| `bio` | string(1000) | public profile text |
| `avatar_url` | string(500) | public |
| `verification_status` | enum | `unsubmitted`, `pending`, `verified`, `rejected` |
| `verification_note` | string(1000) | latest moderator note |
| `is_active` | boolean | false = suspended |
| `last_login_at` | datetime | updated on login |
| `password_reset_token_hash` | string | hashed, one-time |
| `password_reset_expires_at` | datetime | expiry |
| `created_at`, `updated_at` | datetime | UTC |

**Rules:** email unique; suspended users cannot authenticate; public payloads omit email, phone, student ID and password fields.

### 3.2 `student_verifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `user_id` | FK users.id | indexed |
| `college`, `student_id_number` | string | submitted values |
| `department`, `course` | string | optional |
| `year` | integer | optional |
| `note` | text | student's note |
| `document_path`, `document_name` | string | private storage path + original name |
| `status` | enum | pending/verified/rejected |
| `reviewer_id` | FK users.id | admin who decided |
| `review_note` | string(1000) | required for rejection |
| `reviewed_at` | datetime | |
| `created_at`, `updated_at` | datetime | |

**Rules:** latest submission determines displayed status; documents never appear in list/detail payloads, only `has_document` and a streamed endpoint.

### 3.3 `categories`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `name` | string(80) | |
| `slug` | string(80) | **unique**, indexed |
| `description` | string(255) | |
| `icon` | string(40) | maps to a Lucide icon |
| `parent_id` | FK categories.id | self-relation for subcategories |
| `sort_order` | integer | display order |
| `is_active` | boolean | |
| `created_at`, `updated_at` | datetime | |

Seeded top-level categories: Laptops & Computers, Mobiles & Accessories, Books & Study Material, Electronics & Gadgets, Hostel & Furniture, Clothing & Fashion, Sports & Fitness, Other — each with subcategories.

### 3.4 `products`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `seller_id` | FK users.id | indexed |
| `category_id` | FK categories.id | indexed |
| `title` | string(140) | |
| `description` | text | |
| `price` | numeric(12,2) | > 0 |
| `original_price` | numeric(12,2) | optional |
| `condition` | enum | new/like_new/good/fair/used |
| `brand` | string(80) | optional |
| `location` | string(180) | optional display name, e.g. campus or neighbourhood |
| `location_details` | string(300) | optional reverse-geocoded address |
| `latitude` | float | optional, -90–90; set together with longitude |
| `longitude` | float | optional, -180–180; set together with latitude |
| `age_months` | integer | optional, 0–400 |
| `status` | enum | draft, pending_verification, approved, rejected, available, reserved, sold, removed |
| `rejection_reason` | string(1000) | shown to owner |
| `views_count` | integer | incremented on non-owner detail views |
| `approved_at`, `sold_at` | datetime | lifecycle timestamps |
| `created_at`, `updated_at` | datetime | |

**Indexes:** `ix_products_status_created (status, created_at)`, `ix_products_category_status (category_id, status)`, `ix_products_price (price)`.

**Visibility rule:** public queries filter `status IN ('approved','available')`; owners/admins may read other states.

### 3.5 `product_images`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `product_id` | FK products.id | indexed |
| `url` | string(500) | `/uploads/public/...` |
| `position` | integer | 0 = cover |
| `created_at` | datetime | |

Images are files on disk; only URLs are stored. Deletion of a listing removes its image rows; physical cleanup is a documented next step.

### 3.6 `wishlists`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `user_id` | FK users.id | |
| `product_id` | FK products.id | |
| `created_at` | datetime | |

**Constraint:** `uq_wishlist_user_product (user_id, product_id)`.

### 3.7 `conversations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `product_id` | FK products.id | |
| `buyer_id`, `seller_id` | FK users.id | |
| `last_message_at` | datetime | ordering |
| `created_at`, `updated_at` | datetime | |

**Constraint:** `uq_conversation_product_pair (product_id, buyer_id, seller_id)` — one thread per buyer/seller/product.

### 3.8 `conversation_participants`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `conversation_id` | FK conversations.id | |
| `user_id` | FK users.id | |
| `last_read_at` | datetime | drives unread counts |
| `created_at` | datetime | |

**Constraint:** `uq_participant_conversation_user (conversation_id, user_id)`.

### 3.9 `messages`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `conversation_id` | FK conversations.id | indexed |
| `sender_id` | FK users.id, nullable | null for system messages |
| `body` | text | 1–4000 chars validated at the API |
| `message_type` | enum | text/offer/system |
| `offer_id` | FK offers.id, nullable | reserved for offer messages |
| `created_at` | datetime | |

### 3.10 `offers`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `conversation_id` | FK conversations.id | |
| `product_id` | FK products.id | denormalised for fast listing |
| `buyer_id`, `seller_id` | FK users.id | participants |
| `amount` | numeric(12,2) | > 0 |
| `message` | string(1000) | optional |
| `status` | enum | pending/accepted/rejected/countered/cancelled/expired |
| `offered_by_id` | FK users.id | author (supports both directions) |
| `parent_offer_id` | FK offers.id | counteroffer chain |
| `responded_at`, `expires_at` | datetime | |
| `created_at`, `updated_at` | datetime | |

**Rules:** only the counterparty of the latest pending offer may accept/reject/counter; expired offers cannot be accepted; every counter creates a new row preserving history.

### 3.11 `meetings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `conversation_id` | FK conversations.id | |
| `product_id` | FK products.id | |
| `proposed_by_id` | FK users.id | |
| `scheduled_at` | datetime | UTC |
| `location` | string(200) | required |
| `notes` | string(1000) | optional |
| `status` | enum | proposed/confirmed/rescheduled/cancelled/completed |
| `responded_at`, `confirmed_at` | datetime | |
| `cancel_reason` | string(500) | |
| `transaction_id` | FK transactions.id, nullable | linked when a deal starts |
| `created_at`, `updated_at` | datetime | |

**Index:** `ix_meetings_status_scheduled (status, scheduled_at)`.

### 3.12 `transactions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `product_id` | FK products.id | indexed |
| `buyer_id`, `seller_id` | FK users.id | |
| `offer_id` | FK offers.id, nullable | agreed price source |
| `meeting_id` | FK meetings.id, nullable | |
| `agreed_price` | numeric(12,2) | |
| `status` | enum | pending/meeting_scheduled/completion_requested/completed/cancelled |
| `buyer_confirmed_at`, `seller_confirmed_at` | datetime | dual confirmation |
| `completed_at`, `cancelled_at` | datetime | |
| `cancel_reason` | string(500) | |
| `created_at`, `updated_at` | datetime | |

**Index:** `ix_transactions_status_created (status, created_at)`.

**Integrity:** product row locked with `SELECT … FOR UPDATE`; existing open/completed transaction per product blocks another pair; product must be `available`/`approved`; sold only after both confirmations.

### 3.13 `reviews`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `transaction_id` | FK transactions.id | |
| `reviewer_id`, `reviewee_id` | FK users.id | |
| `product_id` | FK products.id, nullable | |
| `rating` | integer | 1–5 (validated) |
| `comment` | string(2000) | optional |
| `created_at` | datetime | |

**Constraint:** `uq_review_transaction_reviewer (transaction_id, reviewer_id)`.

### 3.14 `reports`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `reporter_id` | FK users.id | |
| `target_type` | enum | product/user |
| `target_id` | string(36) | no FK because target type varies |
| `reason` | string(80) | one of eight codes |
| `details` | string(2000) | optional |
| `status` | enum | pending/under_review/resolved/rejected |
| `resolution_note` | string(2000) | |
| `reviewed_by_id` | FK users.id, nullable | |
| `created_at`, `updated_at` | datetime | |

**Index:** `ix_reports_status_created (status, created_at)`.

### 3.15 `notifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `user_id` | FK users.id | |
| `type` | string(60) | e.g. `offer_accepted`, `meeting_confirmed` |
| `title`, `body` | string | |
| `link` | string(300) | frontend route |
| `is_read` | boolean | |
| `created_at`, `read_at` | datetime | |

**Index:** `ix_notifications_user_read (user_id, is_read)`.

### 3.16 `admin_audit_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string PK | |
| `admin_id` | FK users.id | actor |
| `action` | string(80) | e.g. `listing.approve`, `verification.rejected` |
| `entity_type` | string(60) | product, student_verification, user, report |
| `entity_id` | string(36) | |
| `detail` | string(1000) | reason/context |
| `ip_address` | string(64) | |
| `created_at` | datetime | |

Audit rows are append-only from the application's perspective and are shown in the admin overview.

---

## 4. Enum reference

| Enum | Values |
| --- | --- |
| `UserRole` | `student`, `admin` |
| `VerificationState` | `unsubmitted`, `pending`, `verified`, `rejected` |
| `ProductCondition` | `new`, `like_new`, `good`, `fair`, `used` |
| `ProductStatus` | `draft`, `pending_verification`, `approved`, `rejected`, `available`, `reserved`, `sold`, `removed` |
| `OfferStatus` | `pending`, `accepted`, `rejected`, `countered`, `cancelled`, `expired` |
| `MeetingStatus` | `proposed`, `confirmed`, `rescheduled`, `cancelled`, `completed` |
| `TransactionStatus` | `pending`, `meeting_scheduled`, `completion_requested`, `completed`, `cancelled` |
| `ReportStatus` | `pending`, `under_review`, `resolved`, `rejected` |
| `ReportTargetType` | `product`, `user` |
| `MessageType` | `text`, `offer`, `system` |

---

## 5. State transitions

```
PRODUCT
draft ──submit──▶ pending_verification ──approve──▶ approved/available
                         │                              │
                         └──reject──▶ rejected          ├──transaction──▶ reserved ──both confirm──▶ sold
                                     │                  └──owner mark sold──▶ sold
                                     └──edit + resubmit──▶ pending_verification
reserved ──cancel transaction──▶ available
any non-sold ──admin remove──▶ removed

OFFER
pending ──accept──▶ accepted      pending ──reject──▶ rejected
pending ──counter──▶ countered (new pending child)
pending ──cancel──▶ cancelled     pending + expires_at past ──▶ expired

MEETING
proposed ──accept──▶ confirmed    proposed ──reschedule──▶ rescheduled ──accept──▶ confirmed
proposed/confirmed ──reject/cancel──▶ cancelled
confirmed ──complete──▶ completed

TRANSACTION
pending ──meeting attached──▶ meeting_scheduled
any open ──first confirm──▶ completion_requested ──second confirm──▶ completed (product sold)
any open ──cancel──▶ cancelled (product available)
```

---

## 6. Migration and seeding

```powershell
cd backend
python -m alembic upgrade head
python -m app.db.seed --demo
```

- Alembic revision: `20261108_f8df81a7d113_initial_campusloop_schema.py`.
- `app/db/seed.py` inserts categories (idempotent by slug), an admin account, and with `--demo` two verified students plus eight listings across categories.
- Startup also bootstraps missing categories so a fresh database never has an empty catalogue.

For production: change the admin password, remove demo users/listings, set `AUTO_APPROVE_LISTINGS=false`, and keep `SECRET_KEY` out of Git.

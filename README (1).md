# Distributor Order, Stock and Ledger Management System (DSMS)

DSMS is a full-stack web application that helps a small distributor (e.g. a
wholesale/retail goods supplier) manage three things in one place:

- **Stock** — batches of products, tracked with expiry dates and FEFO
  (First-Expiry-First-Out) issuing logic
- **Orders** — placed either manually via the dashboard or automatically via
  a customer's WhatsApp message
- **Ledger** — a running credit/payment balance per customer

The system also proactively sends WhatsApp alerts (via Twilio) when stock is
close to expiry, and lets customers place orders directly by texting a
structured message like `ORDER RICE5KG 10`.

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (React 18) | Uses the `pages/` router |
| Styling | Tailwind CSS | |
| HTTP client | Axios | |
| Backend | FastAPI (Python) | Layered structure: `routers/`, `models/`, `schemas/`, `services/`, `core/` |
| Database | PostgreSQL | via SQLAlchemy ORM |
| Migrations | Alembic | |
| Auth | JWT (`python-jose`) + bcrypt password hashing | Role-based: `owner`, `salesperson`, `accountant` |
| Background jobs | APScheduler | Daily cron job checks for expiring stock |
| Messaging | Twilio WhatsApp API | Inbound orders + outbound alerts |
| Deployment (intended) | Frontend → Vercel, Backend → Render, DB → Supabase/Neon | Based on config/env comments in the code |

## Features

### Authentication
- Signup and login with email + password (`/auth/signup`, `/auth/login`)
- Passwords are hashed with bcrypt, never stored in plain text
- Login returns a JWT access token, which the frontend stores and attaches to every API request
- Three roles: `owner`, `salesperson`, `accountant` — each endpoint declares which roles may call it

### Product & Stock Management
- Products have a name, category, unit, price, and a reorder lead time
- Stock is tracked as **batches** (not just a single quantity number) — each batch has its own purchase date, expiry date, and status (`active` / `expiring_soon` / `expired` / `depleted`)
- **FEFO issuing**: when an order is placed, the system automatically picks stock from the batch that expires soonest first, so older stock is used before it goes to waste
- A daily background job scans for batches expiring within 10 days, marks them `expiring_soon`, and sends a WhatsApp alert

### Orders
- Orders can be created two ways:
  1. **Manually**, from the dashboard (an owner/salesperson selects a customer and products)
  2. **Automatically via WhatsApp**, when a customer texts a message like `ORDER RICE5KG 10`
- Each order is linked to specific stock batches (via FEFO), so stock is deducted at the moment the order is placed
- Orders have a status lifecycle: `pending` → `dispatched` → `delivered`

### Ledger (Customer Accounts)
- Every customer has a running balance, updated with each ledger entry
- Two entry types: `credit` (customer owes more) and `payment` (customer pays down their balance)
- Each new entry recalculates the running balance from the previous one, so a full statement can be generated per customer at any time

### WhatsApp Integration
- **Inbound**: Twilio forwards incoming WhatsApp messages to `/webhook/whatsapp`; the system parses a fixed format (`ORDER <product> <qty>`), validates the product and customer, and creates the order automatically
- **Outbound**: the system sends WhatsApp messages for order confirmations (via a pre-approved Twilio template) and expiry alerts (plain text)

## Project Structure

```
distributor-management-system/
├── backend/                        # FastAPI application
│   ├── app/
│   │   ├── main.py                 # App entrypoint — registers routers, CORS, startup scheduler
│   │   ├── core/
│   │   │   ├── config.py           # Loads settings/env vars
│   │   │   ├── database.py         # SQLAlchemy engine + session setup
│   │   │   └── security.py         # Password hashing, JWT creation/validation, role checks
│   │   ├── models/
│   │   │   └── models.py           # SQLAlchemy ORM tables (User, Product, StockBatch, Order, etc.)
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── routers/                # One file per feature area (API endpoints)
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── stock.py
│   │   │   ├── orders.py
│   │   │   ├── ledger.py
│   │   │   └── whatsapp_webhook.py
│   │   └── services/
│   │       ├── scheduler.py        # Daily background job (expiry check)
│   │       └── whatsapp.py         # Twilio WhatsApp send helper
│   ├── alembic/                    # Database migration history
│   ├── tests/                      # Backend unit tests
│   └── requirements.txt
│
└── frontend/                        # Next.js application
    ├── pages/
    │   ├── index.js                 # Landing page
    │   ├── login.js                 # Login page
    │   └── dashboard/
    │       ├── index.js             # Dashboard home
    │       ├── products.js
    │       ├── stock.js
    │       ├── orders.js
    │       └── ledger.js
    ├── components/                  # Reusable UI (Layout, IdleWarning, etc.)
    ├── lib/                         # API client, auth hook, idle-timeout hook, JWT decode helper
    └── package.json
```

This follows a standard **layered architecture** on the backend (routes → business logic → data models kept in separate files) and a standard **file-based routing** structure on the frontend (each file in `pages/` automatically becomes a URL route in Next.js — e.g. `pages/dashboard/stock.js` becomes `/dashboard/stock`).

## Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- A PostgreSQL database (a free instance from [Supabase](https://supabase.com) or [Neon](https://neon.tech) works)
- A free [Twilio](https://www.twilio.com/try-twilio) account (for WhatsApp sandbox testing)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in DATABASE_URL, SECRET_KEY, Twilio creds

alembic upgrade head            # creates all tables in the database

uvicorn app.main:app --reload
```

The API is now running at `http://127.0.0.1:8000`. FastAPI auto-generates interactive API docs at **`http://127.0.0.1:8000/docs`** — every endpoint can be tested directly from the browser without needing Postman.

### 2. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

npm run dev
```

The app is now running at `http://localhost:3000` (redirects to `/login`).

### 3. Try the full flow
1. Sign up as `owner` on `/login`
2. Add a product and a stock batch (products currently created via the backend's `/docs` Swagger UI)
3. Create an order from the dashboard — stock auto-deducts from the nearest-expiry batch (FEFO)
4. Add a ledger entry for a customer and watch the running balance update
5. (Optional) Set up the Twilio WhatsApp sandbox and text `ORDER <product> <qty>` to trigger an automatic order

## Database Schema

The database has 8 tables, managed via SQLAlchemy models and versioned with Alembic migrations.

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Login accounts | `role` = owner / salesperson / accountant |
| `products` | Catalog of sellable items | Has many `stock_batches` |
| `suppliers` | Where stock is purchased from | Referenced by `stock_batches` |
| `stock_batches` | Individual received lots of a product | Belongs to a `product` and optionally a `supplier`; has `expiry_date` and `status` |
| `customers` | Buyers, identified by phone number | Referenced by `orders` and `ledger_entries` |
| `orders` | A customer's order | Belongs to a `customer`; has many `order_items`; `source` = manual / whatsapp |
| `order_items` | Line items within an order | Links an `order` to a `product` and the exact `stock_batch` it was drawn from |
| `ledger_entries` | Credit/payment history per customer | Belongs to a `customer`; stores a `running_balance` snapshot at each entry |
| `alerts_log` | Record of alerts sent (expiry, low stock, etc.) | Not linked by foreign key — stores `related_id` generically |

**Key design decision to be ready to explain:** `order_items.batch_id` links each line item to the *exact batch* it was fulfilled from — not just the product. This is what makes it possible to trace, after the fact, exactly which physical batch of stock went into which order (useful for recalls or expiry audits), and it's a direct consequence of doing FEFO at the batch level rather than tracking one total-quantity number per product.

Schema changes over time are tracked in `backend/alembic/versions/` — for example, one migration adds a `price` column to `products`, and another adds a `source` field to `orders` to distinguish manual vs WhatsApp orders. This is evidence of iterative schema evolution rather than a single one-shot design.

## Testing

Backend unit tests live in `backend/tests/test_core_logic.py` and cover the two most business-critical pieces of logic:

1. **FEFO batch selection** — confirms that when two batches of the same product exist, the one expiring sooner is always chosen first, even if it's not the one with more stock.
2. **FEFO insufficient-stock handling** — confirms the system raises an error (rather than silently failing or over-allocating) when a requested quantity exceeds what's available.
3. **Ledger running-balance math** — confirms a credit increases the balance and a payment decreases it, matching the calculation used in `routers/ledger.py`.

Tests use an isolated **SQLite** database (`test_pytest.db`), not the real PostgreSQL database — so running tests never touches real data. Run them with:

```bash
cd backend
pytest
```

**Why these three tests specifically, if asked:** FEFO and ledger balance are the two pieces of logic where a silent bug would cause real financial/inventory errors (wrong stock deducted, wrong balance shown) — so they're the highest-value things to unit test, rather than testing simple CRUD endpoints that FastAPI's type validation already protects against. There is currently no test coverage for the WhatsApp webhook or the API routes themselves (no integration tests) — worth admitting as a known gap if asked "is everything tested?"

## Known Limitations & Future Work

Being upfront about these shows the design was considered deliberately, not accidentally incomplete:

- **Order status isn't enforced as a state machine.** `pending → dispatched → delivered` is just a string field updated via one PATCH endpoint — nothing stops it from jumping straight from `pending` to `delivered`. A future version could validate allowed transitions.
- **No integration/API-level tests**, only unit tests for core logic (FEFO + ledger math). Route-level behavior (auth failures, permission checks, webhook parsing) is untested.
- **WhatsApp expiry alerts go to one hardcoded number**, not per-owner or per-customer configuration (see `scheduler.py` — the alert number is a placeholder string, not read from settings).
- **CORS is fully open (`allow_origins=["*"]`)** in `main.py` — fine for development, but should be restricted to the actual deployed frontend URL in production.
- **No pagination** on list endpoints (`GET /orders`, `GET /stock/batches`) — fine at small scale, would need it if the product/order count grows large.
- **Products can't currently be created from the frontend UI** — the frontend only has a *view* for products; creation is done via the backend's Swagger docs. A dedicated "Add Product" form would close this gap.
- **Auth token stored in `localStorage`** rather than an httpOnly cookie — simpler to implement, but slightly more exposed to XSS in theory than a cookie-based session would be.

## Acknowledgements

- Built as a Software Engineering team project.
- Backend framework: [FastAPI](https://fastapi.tiangolo.com/)
- Frontend framework: [Next.js](https://nextjs.org/)
- WhatsApp integration powered by [Twilio](https://www.twilio.com/)

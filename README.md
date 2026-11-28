# Distributor Order, Stock and Ledger Management System (DSMS)

DSMS is a full-stack web application that helps a small distributor (e.g. a
wholesale/retail goods supplier) manage three things in one place:

- **Stock** — batches of products, tracked with expiry dates and FEFO
  (First-Expiry-First-Out) issuing logic
- **Orders** — placed either manually via the dashboard or automatically via
  a customer's WhatsApp message
- **Ledger and credit** — a running balance per customer, with credit limits,
  payment terms and overdue tracking

The system also sends WhatsApp alerts (via Twilio) when stock is close to
expiry, lets customers place orders by texting a structured message like
`ORDER RICE5KG 10`, and holds orders from customers who exceed their credit
limit until the owner approves them.

**Live demo:** <https://main.d17amka6l3abs0.amplifyapp.com/login>

## Team

| Name | Contribution |
|---|---|
| Divya Sharma | Built credit control, tested the app and prepared demo data |
| Gautam Jindal | Contributed to the project build, testing and documentation |
| Tanish Garg | Set up the backend, database and hosting for the project |

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (React 18) | Uses the `pages/` router |
| Styling | Tailwind CSS | |
| HTTP client | Axios | |
| Backend | FastAPI (Python) | Layered structure: `routers/`, `models/`, `schemas/`, `services/`, `core/` |
| Database | PostgreSQL | via SQLAlchemy ORM, hosted on Supabase |
| Migrations | Alembic | |
| Auth | JWT (`python-jose`) + bcrypt password hashing | Role-based: `owner`, `salesperson`, `accountant` |
| Background jobs | APScheduler | Daily job checks for expiring stock |
| Messaging | Twilio WhatsApp API | Inbound orders + outbound alerts |
| Deployment | Frontend on AWS Amplify, backend on AWS | Database on Supabase |

## Features

### Authentication
- Signup and login with email + password (`/auth/signup`, `/auth/login`)
- Passwords are hashed with bcrypt, never stored in plain text
- Login returns a JWT access token, which the frontend stores and attaches to every API request
- The frontend warns before an idle session times out and signs the user out on an expired token
- Three roles: `owner`, `salesperson`, `accountant` — each endpoint declares which roles may call it

### Product & Stock Management
- Products have a name, category, unit, price, and a reorder lead time; they can be added from the dashboard
- Stock is tracked as **batches** (not just a single quantity number) — each batch has its own purchase date, expiry date, and status (`active` / `expiring_soon` / `expired` / `depleted`)
- **FEFO issuing**: when an order is placed, the system automatically picks stock from the batch that expires soonest first; expired batches are never allocated
- A daily background job (08:00) scans for batches expiring within 10 days, marks them `expiring_soon`, and sends the owner a WhatsApp alert

### Orders
- Orders can be created two ways:
  1. **Manually**, from the dashboard (an owner/salesperson selects a customer and products)
  2. **Automatically via WhatsApp**, when a customer texts a message like `ORDER RICE5KG 10`
- Each order is linked to specific stock batches (via FEFO), so stock is deducted at the moment the order is placed
- Prices come from the product catalogue, not from the request
- Status lifecycle: `pending` → `dispatched` → `delivered`, plus `on_hold` for orders waiting for approval

### Customers & Credit Control
- Each customer (shop) has a **credit limit** and **payment days**
- An order is **held for owner approval** if it would push the customer over their limit, or if the customer has dues more than 30 days overdue
- The owner can approve a held order, or reject it, which restores the stock
- A **Credit & Dues** page shows outstanding amounts, ageing buckets (0–30, 30–60, 60+ days), risk levels and held orders
- Payments are applied to the oldest unpaid order first
- One-tap WhatsApp payment reminders can be sent to customers with dues

### Ledger (Customer Accounts)
- Every customer has a running balance, updated with each ledger entry
- Two entry types: `credit` (customer owes more) and `payment` (customer pays down their balance)
- Each new entry recalculates the running balance from the previous one, so a full statement can be generated per customer at any time

### WhatsApp Integration
- **Inbound**: Twilio forwards incoming WhatsApp messages to `/webhook/whatsapp`; the system parses a fixed format (`ORDER <product> <qty>`), validates the product and customer, and creates the order automatically
- **Outbound**: the system sends WhatsApp messages for order confirmations (via a pre-approved Twilio template) and expiry alerts (plain text)

### Roles at a glance

| Role | Intended use |
|---|---|
| Owner | Full access, including approving or rejecting held orders |
| Salesperson | Adds customers and places orders |
| Accountant | Ledger entries and the Credit & Dues pages |

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
│   │   │   ├── customers.py
│   │   │   ├── ledger.py
│   │   │   ├── credit.py
│   │   │   └── whatsapp_webhook.py
│   │   └── services/
│   │       ├── orders.py           # Order placement, FEFO allocation, holds
│   │       ├── credit.py           # Credit limits, ageing, payment allocation, reminders
│   │       ├── scheduler.py        # Daily background job (expiry check)
│   │       └── whatsapp.py         # Twilio WhatsApp send helper
│   ├── alembic/                    # Database migration history
│   ├── scripts/                    # Demo-data seeding and payment backfill
│   ├── tests/                      # Backend tests
│   └── requirements.txt
│
└── frontend/                        # Next.js application
    ├── pages/
    │   ├── index.js                 # Landing page
    │   ├── login.js                 # Login / sign-up page
    │   └── dashboard/
    │       ├── index.js             # Dashboard home
    │       ├── products.js
    │       ├── stock.js
    │       ├── orders.js
    │       ├── customers.js
    │       ├── ledger.js
    │       └── credit.js            # Credit & Dues
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

cp .env.example .env            # then fill in the values below

alembic upgrade head            # creates / updates all tables in the database

uvicorn app.main:app --reload
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Long random string used to sign JWTs |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | Twilio credentials |
| `OWNER_PHONE`, `UPI_ID`, `BUSINESS_NAME` | Optional: expiry alerts and payment reminders |

The API is now running at `http://127.0.0.1:8000`. FastAPI auto-generates interactive API docs at **`http://127.0.0.1:8000/docs`** — every endpoint can be tested directly from the browser without needing Postman.

> After pulling new code, run `alembic upgrade head` again, otherwise newly added columns (for example the credit-control ones) will be missing from the database.

### 2. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

npm run dev
```

The app is now running at `http://localhost:3000` (redirects to `/login`).

### 3. Try the full flow
1. Sign up on `/login` and log in
2. Add a product (**Products** page) and a stock batch (**Stock** page)
3. Add a customer with a credit limit and payment days (**Customers** page)
4. Create an order from the dashboard — stock auto-deducts from the nearest-expiry batch (FEFO)
5. Place an order above the credit limit and approve it as the owner (**Orders** page)
6. Add a ledger entry for a customer and watch the running balance update; review dues on **Credit & Dues**
7. (Optional) Set up the Twilio WhatsApp sandbox and text `ORDER <product> <qty>` to trigger an automatic order

Demo data can be loaded with `python -m scripts.seed_demo` from the `backend` folder, and removed again with `python -m scripts.seed_demo --clear`. Do not run it on a shared database without telling your teammates.

## Deployment

| Part | Where it runs |
|---|---|
| Frontend | AWS Amplify (`NEXT_PUBLIC_API_URL` points at the backend) |
| Backend | AWS |
| Database | Supabase PostgreSQL |

On every backend release, run `alembic upgrade head` against the production database before using the new code.

## Database Schema

The database has 9 tables, managed via SQLAlchemy models and versioned with Alembic migrations.

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Login accounts | `role` = owner / salesperson / accountant |
| `products` | Catalog of sellable items | Has many `stock_batches` |
| `suppliers` | Where stock is purchased from | Referenced by `stock_batches` |
| `stock_batches` | Individual received lots of a product | Belongs to a `product` and optionally a `supplier`; has `expiry_date` and `status` |
| `customers` | Buyers, identified by phone number | Has a credit limit and payment days; referenced by `orders` and `ledger_entries` |
| `orders` | A customer's order | Belongs to a `customer`; has many `order_items`; `source` = manual / whatsapp; can be `on_hold` |
| `order_items` | Line items within an order | Links an `order` to a `product` and the exact `stock_batch` it was drawn from |
| `ledger_entries` | Credit/payment history per customer | Belongs to a `customer`; stores a `running_balance` snapshot at each entry |
| `alerts_log` | Record of alerts sent (expiry, low stock, etc.) | Not linked by foreign key — stores `related_id` generically |

`order_items.batch_id` links each line item to the *exact batch* it was fulfilled from, not just the product. This makes it possible to trace which physical batch of stock went into which order, which is useful for recalls and expiry audits, and it follows from doing FEFO at the batch level rather than tracking one total quantity per product.

Schema changes are tracked in `backend/alembic/versions/` — for example, migrations add a `price` column to products, a `source` field to orders, and the credit-control fields for customers and orders.

## Testing

Backend tests live in `backend/tests/` and use an isolated **SQLite** database, not the real PostgreSQL database, so running them never touches real data.

- `test_core_logic.py` — FEFO picks the nearest-expiry batch, FEFO raises an error on insufficient stock, and the ledger running-balance arithmetic is correct.
- `test_credit_control.py` — prices come from the product catalogue, orders over the limit are held without a ledger entry, no limit means no enforcement, rejecting a held order restores stock, invalid inputs are rejected, expired batches are never allocated, payments go to the oldest order first, ageing buckets and risk levels are correct, long-overdue customers are held even under their limit, and reminder links are built correctly.

```bash
cd backend
pytest
```

There are currently 14 tests. They cover the business rules; the API routes and the WhatsApp webhook are not yet covered by integration tests.

## Known Limitations & Future Work

- **Owner sign-up is open.** Anyone can sign up with the `owner` role, and sign-up does not validate the role, password length or email case. Owner accounts should be invite-only.
- **Phone numbers are not normalised.** A customer saved as `7696681338` will not match a WhatsApp number of `+917696681338`, and duplicates can be created by editing a phone number.
- **An order cannot be split across batches.** If no single batch holds the full quantity, the order is rejected even when the total stock is enough.
- **The WhatsApp webhook does not verify the Twilio signature.** It should check the signature so that only Twilio can create orders.
- **Order status is not a strict state machine.** `pending → dispatched → delivered` is a string field updated through one PATCH endpoint, so it can move backwards or skip a step.
- **Expiry alerts are plain-text WhatsApp messages**, which Twilio usually rejects outside the 24-hour reply window. Approved templates are needed for reliable delivery.
- **CORS is fully open (`allow_origins=["*"]`)** in `main.py`. It should be restricted to the deployed frontend URL.
- **No pagination** on list endpoints (`GET /orders`, `GET /stock/batches`).
- **No API-level integration tests**, only tests for the business logic.
- **Auth token stored in `localStorage`** rather than an httpOnly cookie, which is simpler but more exposed to XSS in theory.

## Acknowledgements

- Hosting: [AWS Amplify](https://aws.amazon.com/amplify/)
- Database: [Supabase](https://supabase.com/)
- Team: [Tanish Garg](https://github.com/Tanish118248), [Divya Sharma](https://github.com/Divyasharma1910), [Gautam Jindal](https://github.com/gautamjindal2603)

# Distributor Order, Stock & Ledger Management System

A full-stack system for distributor operations: batch-level stock with
FEFO expiry handling, order management, customer ledger tracking, daily
expiry alerts, and WhatsApp ordering via Twilio.

This is the **complete project** — backend and frontend — and both have
been built and verified working end-to-end together (not just separately):
signup → login → create stock batch → place an order (confirmed pulling
from the correct near-expiry batch) → record a ledger entry (confirmed
correct running balance) — all tested through the actual UI talking to
the actual API.

## Structure

```
distributor-management-system/
  backend/     → FastAPI + PostgreSQL + SQLAlchemy + Alembic + Twilio + APScheduler
  frontend/    → Next.js + Tailwind dashboard
```

## Quick Start (local development)

**1. Backend first:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # fill in DATABASE_URL, SECRET_KEY, Twilio creds
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
uvicorn app.main:app --reload
```
Backend runs at **http://127.0.0.1:8000** (Swagger docs at `/docs`).

**2. Frontend, in a second terminal:**
```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev
```
Frontend runs at **http://localhost:3000**.

**3. Use it:**
- Open http://localhost:3000 → redirects to Login
- Sign up as `owner`, log in
- Add a stock batch, create an order, add a ledger entry — see each
  module's README for details

Full setup detail (Alembic, Twilio sandbox, testing, deployment) is in
each subfolder's own `README.md`.

## Deployment summary

| Piece | Where | Notes |
|---|---|---|
| Backend | Render | auto-deploys from GitHub, set env vars in Render dashboard |
| Frontend | Vercel | auto-deploys from GitHub, set `NEXT_PUBLIC_API_URL` env var |
| Database | Supabase / Neon | managed PostgreSQL, free tier |
| WhatsApp | Twilio Sandbox | free for dev/demo, no approval wait |

## What's implemented

- **Auth** — JWT, role-based (owner / salesperson / accountant)
- **Stock** — batch-level tracking, FEFO logic (verified: an order for 10
  units correctly pulled from the batch expiring soonest, not the one
  further out)
- **Orders** — create, list, update status, auto stock deduction
- **Ledger** — credit/payment entries, running balance (verified: ₹500
  credit → ₹300 after a ₹200 payment, computed correctly)
- **Expiry alerts** — daily APScheduler job flags batches within 10 days
  of expiry
- **WhatsApp** — Twilio outbound alerts + inbound structured order
  parsing (`ORDER <product> <qty>`)
- **Tests** — pytest suite covering FEFO selection and ledger math, all
  passing
- **Frontend** — full dashboard: Overview (with expiry banner), Stock,
  Orders, Ledger — role-aware navigation and forms

## What's not yet built (documented as future scope)

- Product/Supplier/Customer management screens in the frontend (currently
  created via the backend's Swagger UI — `/docs`)
- Demand forecasting / reorder suggestions (deliberately scoped out —
  see project notes: not enough historical data yet)
- Production-grade Twilio WhatsApp Business number (sandbox is used for
  development and demo)

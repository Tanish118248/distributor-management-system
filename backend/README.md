# Distributor Order, Stock & Ledger Management System — Backend

A working FastAPI backend implementing: SQLAlchemy ORM, Alembic migrations,
Pydantic validation, JWT auth with roles, APScheduler expiry alerts, and
Twilio WhatsApp ordering/notifications. Tested end-to-end (signup, login,
FEFO stock deduction, ledger balance calculation all verified working).

## 1. Prerequisites

- Python 3.11+ installed
- VS Code with the **Python extension** (by Microsoft) installed
- A PostgreSQL database — easiest is a free instance from
  [Supabase](https://supabase.com) or [Neon](https://neon.tech)
- A free [Twilio](https://www.twilio.com/try-twilio) account (for WhatsApp sandbox)

## 2. Open the project in VS Code

```bash
code .
```
(Or: VS Code → File → Open Folder → select this project folder)

## 3. Create a virtual environment

In VS Code's integrated terminal (`` Ctrl+` ``):

```bash
python -m venv venv
```

Activate it:
- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

VS Code should prompt "Select this environment as your workspace interpreter"
— click **Yes**. If not: `Ctrl+Shift+P` → "Python: Select Interpreter" → choose
the `venv` one.

## 4. Install dependencies

```bash
pip install -r requirements.txt
```

## 5. Configure environment variables

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` and fill in real values:
- `DATABASE_URL` — your Supabase/Neon PostgreSQL connection string
- `SECRET_KEY` — any long random string (e.g. generate with `python -c "import secrets; print(secrets.token_hex(32))"`)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — from your Twilio console
- `TWILIO_WHATSAPP_NUMBER` — Twilio's sandbox number is `whatsapp:+14155238886` by default

**Never commit `.env`** — it's already in `.gitignore`.

## 6. Initialize the database with Alembic

Generate the first migration from your models:
```bash
alembic revision --autogenerate -m "initial tables"
```

Apply it to your database:
```bash
alembic upgrade head
```

This creates all tables (products, stock_batches, orders, ledger_entries, etc.)
in your PostgreSQL database.

## 7. Run the server

```bash
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000/docs** — this is FastAPI's auto-generated Swagger
UI. You can test every endpoint here directly in the browser.

## 8. Test the flow

1. `POST /auth/signup` — create a user (`role`: `"owner"`, `"salesperson"`, or `"accountant"`)
2. `POST /auth/login` — get a JWT access token
3. Click **Authorize** in the Swagger UI, paste the token
4. `POST /stock/batches` — add a stock batch (as owner)
5. `POST /orders` — create an order (auto-deducts stock via FEFO — nearest expiry first)
6. `POST /ledger` — record a credit/payment entry
7. `GET /ledger/{customer_id}` — view running balance

## 9. Set up Twilio WhatsApp Sandbox (for testing WhatsApp features)

1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. From your phone, send the given join code (e.g. "join happy-tiger") to the sandbox number
3. In Twilio Console, set the sandbox's **"When a message comes in"** webhook to:
   `https://<your-deployed-backend-url>/webhook/whatsapp`
   (for local testing, use [ngrok](https://ngrok.com) to expose `localhost:8000` temporarily)
4. Send a structured order message from WhatsApp: `ORDER RICE5KG 5`

## 10. Run tests

```bash
pytest
```

## 11. Folder Structure

```
app/
  core/         → config, database connection, JWT/auth logic
  models/       → SQLAlchemy ORM models (the tables)
  schemas/      → Pydantic request/response validation
  routers/      → API endpoints (auth, stock, orders, ledger, webhook)
  services/     → scheduler (expiry check) + Twilio WhatsApp sender
  main.py       → app entrypoint, wires routers + scheduler
alembic/        → migration scripts (versioned schema history)
requirements.txt
.env.example
```

## 12. Deployment (once local dev is working)

- **Backend:** push to GitHub → connect repo to [Render](https://render.com) →
  set start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT` →
  add the same env vars from `.env` in Render's dashboard
- **Database:** already hosted on Supabase/Neon — just point `DATABASE_URL`
  at it in Render's env vars too
- **Frontend:** deploy separately to Vercel, point it at the live Render URL
- **Twilio webhook:** update the sandbox webhook URL to your live Render URL
  once deployed

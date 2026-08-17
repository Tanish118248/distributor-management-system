# Deployment Guide

This project has been verified working end-to-end locally: backend boots,
all pytest tests pass, frontend builds cleanly, and the full flow (signup
→ login → create stock batch → place order with correct FEFO deduction
→ add ledger entry with correct running balance) was tested through the
actual UI. This guide takes it from local to fully live.

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: working backend + frontend"
git branch -M main
git remote add origin https://github.com/<your-username>/distributor-management-system.git
git push -u origin main
```

Both `backend/.gitignore` and `frontend/.gitignore` already exclude
`.env`, `.env.local`, `node_modules`, `__pycache__`, and DB files — so
nothing sensitive gets pushed.

---

## Step 2 — Database: Supabase (or Neon)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Once created, go to **Project Settings → Database → Connection string**
   → copy the **URI** (starts with `postgresql://...`)
3. Keep this handy — it's your `DATABASE_URL`

---

## Step 3 — Backend: Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo, set **Root Directory** to `backend`
3. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (Render dashboard → Environment):
   ```
   DATABASE_URL       = <your Supabase connection string>
   SECRET_KEY         = <generate: python -c "import secrets; print(secrets.token_hex(32))">
   ALGORITHM          = HS256
   ACCESS_TOKEN_EXPIRE_MINUTES = 1440
   TWILIO_ACCOUNT_SID = <from Twilio console>
   TWILIO_AUTH_TOKEN  = <from Twilio console>
   TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
   ```
5. Deploy. Once live, note your backend URL, e.g.
   `https://distributor-backend.onrender.com`

**Run migrations against the live database** (one-time, from your local
machine, pointed at the live DB):
```bash
cd backend
DATABASE_URL="<your Supabase URL>" alembic upgrade head
```

---

## Step 4 — Frontend: Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import the same GitHub repo, set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://distributor-backend.onrender.com
   ```
   (your live Render URL from Step 3)
4. Deploy. Vercel gives you a live URL, e.g.
   `https://distributor-management-system.vercel.app`

---

## Step 5 — Tighten CORS (recommended once both are live)

In `backend/app/main.py`, replace the wildcard with your real Vercel URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://distributor-management-system.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Commit and push — Render redeploys automatically.

---

## Step 6 — Twilio WhatsApp Sandbox

1. Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. From your phone, send the sandbox's join code (e.g. "join happy-tiger")
3. Set the sandbox's **"When a message comes in"** webhook to:
   ```
   https://distributor-backend.onrender.com/webhook/whatsapp
   ```
4. Test: send `ORDER RICE5KG 5` from WhatsApp — should create an order
   and reply with confirmation

---

## Step 7 — Final live smoke test

1. Open your Vercel URL
2. Sign up as `owner`, log in
3. Add a product via the backend's Swagger UI (`https://<render-url>/docs`
   → `POST /auth/signup` if needed, then use `/docs` to add products/
   customers directly — the frontend doesn't have Product/Customer
   creation screens yet, see README "What's not yet built")
4. Add a stock batch with an expiry date within 10 days
5. Wait for the daily scheduler (or trigger `check_expiring_batches()`
   manually) → confirm a WhatsApp alert arrives
6. Create an order → confirm it deducts from the correct (near-expiry)
   batch
7. Add a ledger entry → confirm the running balance is correct

If all of that works, you're fully deployed and functioning exactly as
verified locally.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend can't reach backend (network error) | `NEXT_PUBLIC_API_URL` wrong, or CORS not allowing your Vercel domain |
| 401 on every request after login | `SECRET_KEY` differs between what signed the token and what's verifying it — check Render env var didn't get reset on redeploy |
| Alembic migration fails | Check `DATABASE_URL` format — must start with `postgresql://`, not `postgres://` (Supabase gives the correct format already) |
| WhatsApp webhook not firing | Sandbox session expired (24hr inactivity) — resend the join code from your phone |
| Render free tier "cold start" delay | Normal — free tier spins down after inactivity, first request takes ~30s to wake up |

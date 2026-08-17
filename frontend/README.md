# Distributor Management System — Frontend

Next.js + Tailwind dashboard for the Distributor Order, Stock & Ledger
Management System. Tested end-to-end against the backend: login, stock
view, order creation (with FEFO deduction), and ledger balance all
confirmed working through the actual UI.

## 1. Prerequisites

- Node.js 18+ and npm
- The backend (`dsms/`) running — see its own README first

## 2. Install

```bash
npm install
```

## 3. Configure the API URL

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```
(Change this to your deployed Render URL once the backend is live.)

## 4. Run locally

```bash
npm run dev
```

Open **http://localhost:3000** — it'll redirect to `/login`.

## 5. Try it out

1. Click **Sign up**, create an account with role `owner`
2. Log in
3. Go to **Stock** → add a batch (needs a `product_id` — create products
   directly via the backend's `/docs` Swagger UI for now, or extend the
   frontend with a Products page)
4. Go to **Orders** → create an order — stock will auto-deduct from the
   nearest-expiry batch
5. Go to **Ledger** → add a credit/payment entry, watch the running
   balance update

## 6. Pages

```
pages/
  login.js                 → sign up / log in
  dashboard/index.js       → overview (stats + expiry banner)
  dashboard/stock.js       → stock batches, add new batch (owner only)
  dashboard/orders.js      → orders, create new order, update status
  dashboard/ledger.js      → per-customer ledger statement + entries
```

Role-based visibility is handled in `components/Layout.js` (nav items)
and inline in each page (forms hidden for roles that shouldn't see them).

## 7. Build for production

```bash
npm run build
npm start
```

## 8. Deploy to Vercel

1. Push this folder to GitHub
2. Import the repo into [Vercel](https://vercel.com)
3. Add environment variable: `NEXT_PUBLIC_API_URL` = your live Render
   backend URL
4. Deploy — Vercel auto-builds and gives you a live URL

## Notes

- Auth token is stored in `localStorage` (`dsms_token`) and read on each
  request via an axios interceptor (`lib/api.js`)
- The expiry-alert banner on the Overview page reflects `status ===
  "expiring_soon"` on stock batches — this gets set by the backend's
  daily APScheduler job, not by the frontend
- Colors/typography match the project's navy (#131c3f) + amber (#e8a13a)
  brand from the pitch deck

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, stock, orders, ledger, whatsapp_webhook
from app.services.scheduler import start_scheduler

app = FastAPI(title="Distributor Order, Stock & Ledger Management System")

# Allow the Next.js frontend (local dev + deployed Vercel URL) to call this API.
# Replace "*" with your exact Vercel URL once deployed, for tighter security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stock.router)
app.include_router(orders.router)
app.include_router(ledger.router)
app.include_router(whatsapp_webhook.router)


@app.on_event("startup")
def on_startup():
    start_scheduler()


@app.get("/")
def root():
    return {"status": "ok", "service": "Distributor Management System API"}

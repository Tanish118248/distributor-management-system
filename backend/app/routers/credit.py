from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Customer, Order
from app.services import credit

router = APIRouter(prefix="/credit", tags=["credit"])

RISK_ORDER = {"high": 0, "medium": 1, "low": 2}


@router.get("/overview", dependencies=[Depends(require_role("owner", "accountant"))])
def overview(db: Session = Depends(get_db)):
    """One row per customer: outstanding, overdue, ageing buckets, risk flag."""
    rows = [credit.customer_credit_summary(db, c) for c in db.query(Customer).all()]
    rows.sort(key=lambda r: (RISK_ORDER[r["risk"]], -r["outstanding"]))
    totals = {
        "outstanding": sum(r["outstanding"] for r in rows),
        "overdue": sum(r["overdue"] for r in rows),
        "high_risk_customers": sum(1 for r in rows if r["risk"] == "high"),
        "on_hold_orders": db.query(Order).filter(Order.status == "on_hold").count(),
    }
    return {"totals": totals, "customers": rows}


@router.get("/customer/{customer_id}", dependencies=[Depends(require_role("owner", "accountant", "salesperson"))])
def one_customer(customer_id: int, db: Session = Depends(get_db)):
    """Used by the order form to warn about balance / limit before creating an order."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    s = credit.customer_credit_summary(db, customer)
    return {k: s[k] for k in ("customer_id", "name", "credit_limit", "outstanding", "overdue", "risk", "risk_reasons")}


@router.get("/reminders", dependencies=[Depends(require_role("owner", "accountant"))])
def reminders(db: Session = Depends(get_db)):
    """Customers with overdue dues, each with a ready-to-send WhatsApp click-to-chat link."""
    out = []
    for c in db.query(Customer).all():
        s = credit.customer_credit_summary(db, c)
        if s["overdue"] > 0:
            text = credit.reminder_text(s)
            out.append({**s, "message": text, "whatsapp_link": credit.whatsapp_link(c.phone, text)})
    out.sort(key=lambda r: -r["max_days_overdue"])
    return out


@router.get("/holds", dependencies=[Depends(require_role("owner"))])
def holds(db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.status == "on_hold").order_by(Order.id.desc()).all()
    names = {c.id: c.name for c in db.query(Customer).all()}
    return [
        {"order_id": o.id, "customer_id": o.customer_id, "customer": names.get(o.customer_id),
         "total_amount": o.total_amount, "reason": o.hold_reason}
        for o in orders
    ]

"""
Credit-control logic: ledger posting, FIFO payment allocation, ageing, risk flag.
Kept in one service module so routers and the WhatsApp webhook share the same rules.
"""
from datetime import date, datetime
from decimal import Decimal
from urllib.parse import quote

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Customer, LedgerEntry, Order

ZERO = Decimal("0")
OPEN_STATUSES = ("pending", "dispatched", "delivered")  # orders that count as real debt


def D(x) -> Decimal:
    return x if isinstance(x, Decimal) else Decimal(str(x or 0))


# ---------- ledger ----------
def current_balance(db: Session, customer_id: int) -> Decimal:
    last = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.customer_id == customer_id)
        .order_by(LedgerEntry.id.desc())
        .first()
    )
    return D(last.running_balance) if last else ZERO


def post_ledger(db: Session, customer_id: int, entry_type: str, amount, order_id=None) -> LedgerEntry:
    """Add a ledger row. Locks the customer row so two postings can't race on the balance."""
    db.query(Customer).filter(Customer.id == customer_id).with_for_update().first()
    amount = D(amount)
    delta = amount if entry_type == "credit" else -amount
    entry = LedgerEntry(
        customer_id=customer_id,
        order_id=order_id,
        entry_type=entry_type,
        amount=amount,
        running_balance=current_balance(db, customer_id) + delta,
    )
    db.add(entry)
    db.flush()
    return entry


# ---------- payments: FIFO against oldest unpaid orders ----------
def unpaid_orders(db: Session, customer_id: int, exclude_order_id: int | None = None):
    query = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.status.in_(OPEN_STATUSES),
        Order.paid_amount < Order.total_amount,
    )
    if exclude_order_id is not None:
        query = query.filter(Order.id != exclude_order_id)
    return query.order_by(Order.order_date.asc(), Order.id.asc()).all()


def allocate_payment(db: Session, customer_id: int, amount) -> Decimal:
    """Apply a payment to the oldest unpaid orders first. Returns any unallocated remainder."""
    remaining = D(amount)
    for order in unpaid_orders(db, customer_id):
        if remaining <= 0:
            break
        due = D(order.total_amount) - D(order.paid_amount)
        pay = min(due, remaining)
        order.paid_amount = D(order.paid_amount) + pay
        remaining -= pay
        if D(order.paid_amount) >= D(order.total_amount):
            order.paid_at = datetime.utcnow()
    return remaining


def record_payment(db: Session, customer_id: int, amount) -> LedgerEntry:
    entry = post_ledger(db, customer_id, "payment", amount)
    allocate_payment(db, customer_id, amount)
    return entry


# ---------- ageing + risk ----------
def _bucket(days: int) -> str:
    if days <= 30:
        return "0-30"
    if days <= 60:
        return "30-60"
    return "60+"


def customer_credit_summary(db: Session, customer: Customer, today: date | None = None,
                            exclude_order_id: int | None = None) -> dict:
    today = today or date.today()
    limit = D(customer.credit_limit)
    orders = unpaid_orders(db, customer.id, exclude_order_id)

    buckets = {"0-30": ZERO, "30-60": ZERO, "60+": ZERO}
    outstanding = ZERO
    overdue = ZERO
    max_days_overdue = 0
    for o in orders:
        due_amt = D(o.total_amount) - D(o.paid_amount)
        outstanding += due_amt
        age_days = (today - o.order_date.date()).days if o.order_date else 0
        buckets[_bucket(age_days)] += due_amt
        if o.due_date and o.due_date < today:
            overdue += due_amt
            max_days_overdue = max(max_days_overdue, (today - o.due_date).days)

    # payment behaviour from fully-paid orders
    paid = (
        db.query(Order)
        .filter(Order.customer_id == customer.id, Order.paid_at.isnot(None), Order.status.in_(OPEN_STATUSES))
        .all()
    )
    days_to_pay = [(o.paid_at - o.order_date).days for o in paid if o.order_date]
    avg_days_to_pay = round(sum(days_to_pay) / len(days_to_pay), 1) if days_to_pay else None
    late_count = sum(1 for o in paid if o.due_date and o.paid_at.date() > o.due_date)

    # simple, explainable rule — NOT machine learning
    reasons = []
    risk = "low"
    if limit > 0 and outstanding > limit:
        risk = "high"
        reasons.append("Over credit limit")
    if max_days_overdue > 30:
        risk = "high"
        reasons.append(f"Oldest dues {max_days_overdue} days late")
    elif max_days_overdue > 0 and risk == "low":
        risk = "medium"
        reasons.append(f"Dues {max_days_overdue} days late")
    if avg_days_to_pay is not None and avg_days_to_pay > customer.credit_days and risk == "low":
        risk = "medium"
        reasons.append(f"Usually pays in {avg_days_to_pay} days (terms: {customer.credit_days})")
    if late_count >= 3 and risk != "high":
        risk = "medium"
        reasons.append(f"Paid late {late_count} times")

    return {
        "customer_id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "credit_limit": limit,
        "credit_days": customer.credit_days,
        "outstanding": outstanding,
        "overdue": overdue,
        "max_days_overdue": max_days_overdue,
        "limit_used_pct": float(round(outstanding / limit * 100, 1)) if limit > 0 else None,
        "buckets": buckets,
        "avg_days_to_pay": avg_days_to_pay,
        "late_payments": late_count,
        "risk": risk,
        "risk_reasons": reasons,
    }


# ---------- credit check for a new order ----------
def check_credit(db: Session, customer: Customer, new_total, today: date | None = None,
                 exclude_order_id: int | None = None):
    """Returns (ok, reason). Owner can still approve a held order — this is a soft block.
    exclude_order_id: the order being checked, so it is not counted twice."""
    today = today or date.today()
    s = customer_credit_summary(db, customer, today, exclude_order_id)
    limit = D(customer.credit_limit)
    if limit > 0 and s["outstanding"] + D(new_total) > limit:
        return False, (
            f"Over credit limit: owes ₹{s['outstanding']} + this order ₹{D(new_total)} "
            f"> limit ₹{limit}"
        )
    if s["max_days_overdue"] > 30:
        return False, f"Has dues overdue by {s['max_days_overdue']} days"
    return True, None


# ---------- reminders (click-to-chat; no paid API needed) ----------
def reminder_text(summary: dict) -> str:
    text = (
        f"Namaste {summary['name']}, this is a reminder from {settings.BUSINESS_NAME}. "
        f"Your outstanding balance is ₹{summary['outstanding']}"
    )
    if summary["overdue"] > 0:
        text += f" (₹{summary['overdue']} is overdue)"
    text += "."
    if settings.UPI_ID:
        text += f" You can pay by UPI to {settings.UPI_ID}."
    text += " Please share the payment screenshot once done. Thank you."
    return text


def whatsapp_link(phone: str, text: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:  # assume India if no country code
        digits = "91" + digits
    return f"https://wa.me/{digits}?text={quote(text)}"

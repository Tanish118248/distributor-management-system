"""
One-time script: apply payments that were recorded BEFORE the credit feature existed
to the oldest orders (FIFO), so old orders don't all show up as unpaid.

Safe to re-run: it recomputes paid_amount from scratch for every customer.
Run from the backend folder:   python -m scripts.backfill_payments
"""
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.models import Customer, LedgerEntry, Order
from app.services.credit import OPEN_STATUSES, allocate_payment


def main():
    db = SessionLocal()
    try:
        for c in db.query(Customer).all():
            orders = db.query(Order).filter(Order.customer_id == c.id, Order.status.in_(OPEN_STATUSES)).all()
            for o in orders:
                o.paid_amount = Decimal("0")
                o.paid_at = None
            total_paid = sum(
                (Decimal(str(e.amount)) for e in db.query(LedgerEntry).filter(
                    LedgerEntry.customer_id == c.id, LedgerEntry.entry_type == "payment")),
                Decimal("0"),
            )
            if total_paid > 0:
                allocate_payment(db, c.id, total_paid)
            print(f"{c.name}: applied ₹{total_paid} of payments")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()

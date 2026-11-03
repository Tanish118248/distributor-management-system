"""
Creates clearly-labelled DEMO data so the Credit & Dues screens have something to show.
Every demo record starts with "[DEMO]", so it can be removed again with --clear.

Run from the backend folder:
    python -m scripts.seed_demo          # add demo data
    python -m scripts.seed_demo --clear  # remove ONLY the demo data

Do NOT run this on the shared team database without telling your teammates first.
"""
import sys
from datetime import date, datetime, timedelta

from app.core.database import SessionLocal
from app.models.models import Customer, LedgerEntry, Order, OrderItem, Product, StockBatch
from app.services import credit
from app.services.orders import place_order

TAG = "[DEMO]"


def clear(db):
    customers = db.query(Customer).filter(Customer.name.like(f"{TAG}%")).all()
    ids = [c.id for c in customers]
    if ids:
        order_ids = [o.id for o in db.query(Order).filter(Order.customer_id.in_(ids))]
        db.query(LedgerEntry).filter(LedgerEntry.customer_id.in_(ids)).delete(synchronize_session=False)
        if order_ids:
            db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).delete(synchronize_session=False)
        db.query(Order).filter(Order.customer_id.in_(ids)).delete(synchronize_session=False)
        db.query(Customer).filter(Customer.id.in_(ids)).delete(synchronize_session=False)
    pids = [p.id for p in db.query(Product).filter(Product.name.like(f"{TAG}%"))]
    if pids:
        db.query(StockBatch).filter(StockBatch.product_id.in_(pids)).delete(synchronize_session=False)
        db.query(Product).filter(Product.id.in_(pids)).delete(synchronize_session=False)
    db.commit()
    print("Demo data removed.")


def backdate(order, days_ago, due_in_days):
    order.order_date = datetime.utcnow() - timedelta(days=days_ago)
    order.due_date = (order.order_date + timedelta(days=due_in_days)).date()


def seed(db):
    if db.query(Customer).filter(Customer.name.like(f"{TAG}%")).first():
        print("Demo data already exists. Run with --clear first.")
        return

    rice = Product(name=f"{TAG} Rice 25kg", category="Grains", unit="bag", price=1200)
    oil = Product(name=f"{TAG} Oil 15L", category="Oil", unit="tin", price=1800)
    db.add_all([rice, oil])
    db.flush()
    for p in (rice, oil):
        db.add(StockBatch(product_id=p.id, quantity=500, expiry_date=date.today() + timedelta(days=180), status="active"))
    db.flush()

    good = Customer(name=f"{TAG} Sharma Kirana", phone="+919000000001", credit_limit=20000, credit_days=15)
    slow = Customer(name=f"{TAG} Gupta General Store", phone="+919000000002", credit_limit=15000, credit_days=15)
    bad = Customer(name=f"{TAG} Verma Traders", phone="+919000000003", credit_limit=10000, credit_days=15)
    new = Customer(name=f"{TAG} New Shop", phone="+919000000004", credit_limit=5000, credit_days=7)
    db.add_all([good, slow, bad, new])
    db.flush()

    # Sharma: two old orders, both paid on time + one recent unpaid
    for days_ago, qty in ((50, 3), (25, 2)):
        o = place_order(db, good.id, [(rice.id, qty)])
        backdate(o, days_ago, 15)
        credit.record_payment(db, good.id, o.total_amount)
        o.paid_at = o.order_date + timedelta(days=10)
    o = place_order(db, good.id, [(oil.id, 2)])
    backdate(o, 5, 15)

    # Gupta: pays late; one order 40 days old, 25 days overdue
    o = place_order(db, slow.id, [(rice.id, 4)])
    backdate(o, 40, 15)
    o = place_order(db, slow.id, [(oil.id, 1)])
    backdate(o, 8, 15)

    # Verma: big old dues, 70 days old, 55 days overdue
    o = place_order(db, bad.id, [(rice.id, 5)])
    backdate(o, 70, 15)
    o = place_order(db, bad.id, [(oil.id, 2)])
    backdate(o, 35, 15)
    # a new order that the system must put on hold
    place_order(db, bad.id, [(rice.id, 1)])

    # New shop: one small order, clean
    place_order(db, new.id, [(oil.id, 1)])

    db.commit()
    print("Demo data added: 4 customers, 2 products, orders and payments.")
    print("Open Credit & Dues to see them. Remove later with: python -m scripts.seed_demo --clear")


if __name__ == "__main__":
    session = SessionLocal()
    try:
        clear(session) if "--clear" in sys.argv else seed(session)
    finally:
        session.close()

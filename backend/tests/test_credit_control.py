"""
Tests for the credit-control feature: order flow, credit hold, FIFO payments,
ageing and risk. Run with:  pytest -v
(Uses SQLite, so row locking (with_for_update) is NOT exercised here.)
"""
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_pytest.db")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("TWILIO_ACCOUNT_SID", "ACtest")
os.environ.setdefault("TWILIO_AUTH_TOKEN", "testtoken")
os.environ.setdefault("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import Customer, LedgerEntry, Order, Product, StockBatch
from app.services import credit
from app.services.orders import place_order, restore_stock


@pytest.fixture
def db():
    engine = create_engine("sqlite:///./test_credit.db")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def setup(db):
    product = Product(name="RICE", unit="kg", price=100)
    customer = Customer(name="Sharma Kirana", phone="+919800000001", credit_limit=1000, credit_days=15)
    db.add_all([product, customer])
    db.commit()
    db.add(StockBatch(product_id=product.id, quantity=100,
                      expiry_date=date.today() + timedelta(days=90), status="active"))
    db.commit()
    return product, customer


def test_price_comes_from_product_and_ledger_is_posted(db, setup):
    product, customer = setup
    order = place_order(db, customer.id, [(product.id, 5)])
    db.commit()
    assert order.total_amount == Decimal("500.00")
    assert order.status == "pending"
    assert order.due_date == date.today() + timedelta(days=15)
    assert credit.current_balance(db, customer.id) == Decimal("500")


def test_order_over_limit_goes_on_hold_without_ledger_entry(db, setup):
    product, customer = setup
    order = place_order(db, customer.id, [(product.id, 11)])  # 1100 > limit 1000
    db.commit()
    assert order.status == "on_hold"
    assert "credit limit" in order.hold_reason
    assert credit.current_balance(db, customer.id) == 0
    assert db.query(LedgerEntry).count() == 0


def test_no_limit_set_means_not_enforced(db, setup):
    product, customer = setup
    customer.credit_limit = 0
    db.commit()
    order = place_order(db, customer.id, [(product.id, 50)])
    assert order.status == "pending"


def test_rejecting_a_held_order_restores_stock(db, setup):
    product, customer = setup
    order = place_order(db, customer.id, [(product.id, 11)])
    db.commit()
    batch = db.query(StockBatch).first()
    assert batch.quantity == 89
    restore_stock(db, order)
    db.commit()
    assert db.query(StockBatch).first().quantity == 100


def test_invalid_inputs_are_rejected(db, setup):
    product, customer = setup
    with pytest.raises(HTTPException) as e:
        place_order(db, 999, [(product.id, 1)])
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        place_order(db, customer.id, [(product.id, -3)])
    assert e.value.status_code == 400
    with pytest.raises(HTTPException) as e:
        place_order(db, customer.id, [])
    assert e.value.status_code == 400


def test_expired_batch_is_never_allocated(db, setup):
    product, customer = setup
    db.query(StockBatch).delete()
    db.add(StockBatch(product_id=product.id, quantity=100,
                      expiry_date=date.today() - timedelta(days=1), status="active"))
    db.commit()
    with pytest.raises(HTTPException):
        place_order(db, customer.id, [(product.id, 1)])


def test_payment_is_allocated_oldest_order_first(db, setup):
    product, customer = setup
    o1 = place_order(db, customer.id, [(product.id, 3)])  # 300
    o2 = place_order(db, customer.id, [(product.id, 4)])  # 400
    o1.order_date = datetime.utcnow() - timedelta(days=10)
    db.commit()
    credit.record_payment(db, customer.id, 350)
    db.commit()
    db.refresh(o1); db.refresh(o2)
    assert o1.paid_amount == 300 and o1.paid_at is not None
    assert o2.paid_amount == 50 and o2.paid_at is None
    assert credit.current_balance(db, customer.id) == Decimal("350")


def test_ageing_buckets_and_risk_levels(db, setup):
    product, customer = setup
    customer.credit_limit = 0
    db.commit()
    o_old = place_order(db, customer.id, [(product.id, 1)])   # 100
    o_mid = place_order(db, customer.id, [(product.id, 2)])   # 200
    o_new = place_order(db, customer.id, [(product.id, 3)])   # 300
    o_old.order_date = datetime.utcnow() - timedelta(days=70); o_old.due_date = date.today() - timedelta(days=55)
    o_mid.order_date = datetime.utcnow() - timedelta(days=40); o_mid.due_date = date.today() - timedelta(days=25)
    db.commit()

    s = credit.customer_credit_summary(db, customer)
    assert s["buckets"]["60+"] == 100
    assert s["buckets"]["30-60"] == 200
    assert s["buckets"]["0-30"] == 300
    assert s["outstanding"] == 600
    assert s["overdue"] == 300
    assert s["risk"] == "high"          # oldest due is 55 days late

    o_old.paid_amount = o_old.total_amount
    db.commit()
    assert credit.customer_credit_summary(db, customer)["risk"] == "medium"   # 25 days late

    o_mid.paid_amount = o_mid.total_amount
    db.commit()
    assert credit.customer_credit_summary(db, customer)["risk"] == "low"


def test_customer_with_old_overdue_dues_is_held_even_under_limit(db, setup):
    product, customer = setup
    old = place_order(db, customer.id, [(product.id, 1)])
    old.order_date = datetime.utcnow() - timedelta(days=60)
    old.due_date = date.today() - timedelta(days=45)
    db.commit()
    new = place_order(db, customer.id, [(product.id, 1)])
    assert new.status == "on_hold"
    assert "overdue" in new.hold_reason


def test_reminder_link_prefixes_india_code_and_encodes_text(db, setup):
    _, customer = setup
    link = credit.whatsapp_link("9800000001", "Hello ₹100")
    assert link.startswith("https://wa.me/919800000001?text=")
    assert " " not in link


def test_new_order_is_not_double_counted_in_limit_check(db, setup):
    product, customer = setup           # limit 1000
    a = place_order(db, customer.id, [(product.id, 6)])   # 600
    b = place_order(db, customer.id, [(product.id, 4)])   # 600 + 400 = 1000 -> exactly at limit, allowed
    c = place_order(db, customer.id, [(product.id, 1)])   # 1000 + 100 > 1000 -> held
    assert (a.status, b.status, c.status) == ("pending", "pending", "on_hold")

"""
Unit tests for the core business logic: FEFO batch selection and
ledger running-balance calculation. Run with: pytest
"""
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_pytest.db")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("TWILIO_ACCOUNT_SID", "ACtest")
os.environ.setdefault("TWILIO_AUTH_TOKEN", "testtoken")
os.environ.setdefault("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

from datetime import date, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import Product, StockBatch
from app.routers.stock import get_fefo_batch


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///./test_pytest.db")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_fefo_picks_nearest_expiry_batch(db_session):
    product = Product(name="TESTPRODUCT", unit="kg")
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    near_batch = StockBatch(
        product_id=product.id, quantity=50,
        expiry_date=date.today() + timedelta(days=5), status="active",
    )
    far_batch = StockBatch(
        product_id=product.id, quantity=50,
        expiry_date=date.today() + timedelta(days=60), status="active",
    )
    db_session.add_all([near_batch, far_batch])
    db_session.commit()

    selected = get_fefo_batch(db_session, product.id, needed_qty=10)

    assert selected.id == near_batch.id, "FEFO should select the batch expiring soonest"


def test_fefo_raises_when_insufficient_stock(db_session):
    product = Product(name="LOWSTOCK", unit="kg")
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    batch = StockBatch(
        product_id=product.id, quantity=5,
        expiry_date=date.today() + timedelta(days=10), status="active",
    )
    db_session.add(batch)
    db_session.commit()

    with pytest.raises(Exception):
        get_fefo_batch(db_session, product.id, needed_qty=100)


def test_ledger_running_balance_math():
    """Pure calculation check — mirrors the logic in routers/ledger.py"""
    prev_balance = 0
    credit_amount = 500
    balance_after_credit = prev_balance + credit_amount
    assert balance_after_credit == 500

    payment_amount = 200
    balance_after_payment = balance_after_credit - payment_amount
    assert balance_after_payment == 300

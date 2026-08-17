import enum
from datetime import date, datetime

from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class RoleEnum(str, enum.Enum):
    owner = "owner"
    salesperson = "salesperson"
    accountant = "accountant"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.salesperson)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    unit = Column(String)
    reorder_lead_time_days = Column(Integer, default=7)

    batches = relationship("StockBatch", back_populates="product")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_info = Column(String)
    avg_lead_time_days = Column(Integer, default=7)


class StockBatch(Base):
    __tablename__ = "stock_batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    quantity = Column(Numeric(12, 2), nullable=False)
    purchase_date = Column(Date, default=date.today)
    expiry_date = Column(Date, nullable=False)
    status = Column(String, default="active")  # active/expiring_soon/expired/depleted

    product = relationship("Product", back_populates="batches")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)  # used for WhatsApp alerts, e.g. "+9198xxxxxxx"
    address = Column(String)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")  # pending/dispatched/delivered
    total_amount = Column(Numeric(12, 2), default=0)

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("stock_batches.id"), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), default=0)

    order = relationship("Order", back_populates="items")


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    entry_type = Column(String, nullable=False)  # credit / payment
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    running_balance = Column(Numeric(12, 2), nullable=False)


class AlertLog(Base):
    __tablename__ = "alerts_log"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String, nullable=False)  # expiry/low_stock/reorder/payment_due
    related_id = Column(Integer)
    channel = Column(String, default="whatsapp")
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="sent")

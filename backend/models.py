from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

class Stock(Base):
    __tablename__ = "stock"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    product = relationship("Product")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    customer_name = Column(String, nullable=False)
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_order = Column(Numeric(10, 2), nullable=False)
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    change_type = Column(String, nullable=False)  # "IN" or "OUT"
    quantity = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    product = relationship("Product")
    
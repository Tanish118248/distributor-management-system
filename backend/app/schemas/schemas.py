from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # "owner" | "salesperson" | "accountant"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Product ----------
class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_lead_time_days: int = 7
    price: Decimal = 0


class ProductOut(ProductCreate):
    id: int

    class Config:
        from_attributes = True


# ---------- Stock Batch ----------
class StockBatchCreate(BaseModel):
    product_id: int
    supplier_id: Optional[int] = None
    quantity: Decimal
    purchase_date: Optional[date] = None
    expiry_date: date


class StockBatchOut(StockBatchCreate):
    id: int
    status: str

    class Config:
        from_attributes = True


# ---------- Customer ----------
class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = None


class CustomerOut(CustomerCreate):
    id: int

    class Config:
        from_attributes = True


# ---------- Orders ----------
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: Decimal
    unit_price: Decimal = 0


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate]


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    batch_id: int
    quantity: Decimal
    unit_price: Decimal

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    customer_id: int
    order_date: datetime
    status: str
    total_amount: Decimal
    items: List[OrderItemOut] = []
    source: str

    class Config:
        from_attributes = True


# ---------- Ledger ----------
class LedgerEntryCreate(BaseModel):
    customer_id: int
    entry_type: str  # "credit" | "payment"
    amount: Decimal


class LedgerEntryOut(LedgerEntryCreate):
    id: int
    date: datetime
    running_balance: Decimal

    class Config:
        from_attributes = True

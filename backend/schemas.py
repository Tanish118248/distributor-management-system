from pydantic import BaseModel

class ProductCreate(BaseModel):
    name: str
    sku: str
    unit_price: float

class StockUpdate(BaseModel):
    product_id: int
    quantity: int

from typing import List

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    customer_name: str
    items: List[OrderItemCreate]
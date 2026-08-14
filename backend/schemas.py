from pydantic import BaseModel

class ProductCreate(BaseModel):
    name: str
    sku: str
    unit_price: float
    
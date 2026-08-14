from fastapi import FastAPI
from database import SessionLocal
from models import Product

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Distributor Order, Stock and Ledger API is running"}

@app.get("/products")
def get_products():
    db = SessionLocal()
    products = db.query(Product).all()
    db.close()
    return products

from schemas import ProductCreate

@app.post("/products")
def create_product(product: ProductCreate):
    db = SessionLocal()
    new_product = Product(name=product.name, sku=product.sku, unit_price=product.unit_price)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    db.close()
    return new_product

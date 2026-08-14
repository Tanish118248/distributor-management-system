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
from schemas import StockUpdate
from models import Stock

@app.get("/stock")
def get_stock():
    db = SessionLocal()
    stock = db.query(Stock).all()
    db.close()
    return stock

@app.post("/stock")
def add_stock(stock_data: StockUpdate):
    db = SessionLocal()
    existing = db.query(Stock).filter(Stock.product_id == stock_data.product_id).first()
    if existing:
        existing.quantity += stock_data.quantity
    else:
        existing = Stock(product_id=stock_data.product_id, quantity=stock_data.quantity)
        db.add(existing)
    db.commit()
    db.refresh(existing)
    db.close()
    return existing

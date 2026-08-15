from fastapi import FastAPI
from database import SessionLocal
from models import Product, Order, OrderItem, Stock, LedgerEntry

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

from schemas import OrderCreate


@app.post("/orders")
def create_order(order_data: OrderCreate):
    db = SessionLocal()

    # First pass: check every product exists AND has enough stock
    for item in order_data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.close()
            return {"error": f"Product {item.product_id} not found"}

        stock = db.query(Stock).filter(Stock.product_id == item.product_id).first()
        if not stock or stock.quantity < item.quantity:
            db.close()
            return {"error": f"Not enough stock for product {item.product_id}"}

    # Second pass: everything checked out, now actually create the order
    new_order = Order(customer_name=order_data.customer_name)
    db.add(new_order)
    db.flush()

    for item in order_data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()

        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_order=product.unit_price
        )
        db.add(order_item)

        # reduce stock
        stock = db.query(Stock).filter(Stock.product_id == item.product_id).first()
        stock.quantity -= item.quantity

        # write ledger entry
        ledger_entry = LedgerEntry(
            product_id=item.product_id,
            change_type="OUT",
            quantity=item.quantity,
            balance_after=stock.quantity
        )
        db.add(ledger_entry)

    db.commit()
    db.refresh(new_order)
    db.close()
    return new_order

@app.get("/orders")
def get_orders():
    db = SessionLocal()
    orders = db.query(Order).all()
    db.close()
    return orders

@app.get("/orders/{order_id}")
def get_order_detail(order_id: int):
    db = SessionLocal()
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        db.close()
        return {"error": "Order not found"}

    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    result = {
        "id": order.id,
        "customer_name": order.customer_name,
        "status": order.status,
        "order_date": order.order_date,
        "items": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price_at_order": float(item.price_at_order)
            }
            for item in items
        ]
    }
    db.close()
    return result

@app.get("/ledger")
def get_ledger():
    db = SessionLocal()
    entries = db.query(LedgerEntry).all()
    db.close()
    return entries
"""Shared order placement used by the web API and the WhatsApp webhook."""
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import Customer, Order, OrderItem, Product, StockBatch
from app.routers.stock import get_fefo_batch
from app.services import credit


def place_order(db: Session, customer_id: int, items: list, source: str = "manual") -> Order:
    """
    items: list of (product_id, quantity). Prices come from the product, never from the client.
    - validates customer / products / quantities
    - allocates stock FEFO (rows locked)
    - sets due date from the customer's credit days
    - runs the credit check: OK -> posts a ledger credit; otherwise order goes on_hold
    Caller is responsible for db.commit().
    """
    if not items:
        raise HTTPException(400, "Order must contain at least one item")

    # Lock the customer row FIRST. This serialises that customer's orders (so the credit
    # check sees an up-to-date balance) and avoids a lock-order deadlock with the ledger post.
    customer = db.query(Customer).filter(Customer.id == customer_id).with_for_update().first()
    if not customer:
        raise HTTPException(404, f"Customer {customer_id} not found")

    order = Order(
        customer_id=customer.id,
        status="pending",
        total_amount=0,
        source=source,
        due_date=date.today() + timedelta(days=customer.credit_days),
    )
    db.add(order)
    db.flush()

    total = Decimal("0")
    for product_id, qty in items:
        qty = Decimal(str(qty))
        if qty <= 0:
            raise HTTPException(400, "Quantity must be greater than zero")
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(404, f"Product {product_id} not found")

        batch = get_fefo_batch(db, product.id, qty)
        batch.quantity -= qty
        if batch.quantity <= 0:
            batch.status = "depleted"

        price = Decimal(str(product.price or 0))
        db.add(OrderItem(order_id=order.id, product_id=product.id, batch_id=batch.id,
                         quantity=qty, unit_price=price))
        total += qty * price

    order.total_amount = total.quantize(Decimal("0.01"))

    ok, reason = credit.check_credit(db, customer, order.total_amount, exclude_order_id=order.id)
    if ok:
        credit.post_ledger(db, customer.id, "credit", order.total_amount, order_id=order.id)
    else:
        order.status = "on_hold"
        order.hold_reason = reason
    db.flush()
    return order


def restore_stock(db: Session, order: Order) -> None:
    """Put the quantities of a rejected order back into their batches."""
    for item in order.items:
        batch = db.query(StockBatch).filter(StockBatch.id == item.batch_id).with_for_update().first()
        if batch:
            batch.quantity += item.quantity
            if batch.status == "depleted" and batch.quantity > 0:
                batch.status = "active"

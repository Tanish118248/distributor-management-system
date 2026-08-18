from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from decimal import Decimal
from app.core.database import get_db
from app.models.models import Order, OrderItem, Customer, Product
from app.routers.stock import get_fefo_batch
from app.services.whatsapp import send_whatsapp_message
import json
from app.services.whatsapp import ORDER_CONFIRMATION_CONTENT_SID

router = APIRouter(prefix="/webhook", tags=["whatsapp"])


@router.post("/whatsapp")
def receive_whatsapp_message(
    From: str = Form(...),   # Twilio sends sender's number as "From", e.g. "whatsapp:+9198xxxxxxx"
    Body: str = Form(...),   # message text, e.g. "ORDER RICE5KG 10"
    db: Session = Depends(get_db),
):
    """
    Expected structured format: ORDER <product_name> <quantity>
    e.g. "ORDER RICE5KG 10"
    """
    parts = Body.strip().split()

    if len(parts) != 3 or parts[0].upper() != "ORDER":
        send_whatsapp_message(From, "Sorry, couldn't understand that. Format: ORDER <product> <qty>")
        return {"status": "ignored"}

    _, product_name, qty_str = parts

    try:
        quantity = Decimal(qty_str)
    except ValueError:
        send_whatsapp_message(From, "Quantity must be a number. Format: ORDER <product> <qty>")
        return {"status": "invalid_qty"}

    product = db.query(Product).filter(Product.name.ilike(product_name)).first()
    if not product:
        send_whatsapp_message(From, f"Product '{product_name}' not found.")
        return {"status": "product_not_found"}

    phone_number = From.replace("whatsapp:", "")
    customer = db.query(Customer).filter(Customer.phone == phone_number).first()
    if not customer:
        send_whatsapp_message(From, "We couldn't find your account. Please contact the distributor.")
        return {"status": "customer_not_found"}

    order = Order(customer_id=customer.id, status="pending", total_amount=0, source="whatsapp")
    db.add(order)
    db.flush()

    batch = get_fefo_batch(db, product.id, quantity)
    batch.quantity -= quantity
    if batch.quantity <= 0:
        batch.status = "depleted"

    order_item = OrderItem(
        order_id=order.id, product_id=product.id, batch_id=batch.id,
        quantity=quantity, unit_price=product.price,
    )
    db.add(order_item)
    order.total_amount = quantity * product.price
    db.commit()

    try:
        send_whatsapp_message(
            From,
            content_sid=ORDER_CONFIRMATION_CONTENT_SID,
            content_variables=json.dumps({
                "1": str(quantity),
                "2": product.name,
                "3": str(order.id),
            }),
        )
    except Exception as e:
        print(f"WhatsApp confirmation failed (order still created): {e}")

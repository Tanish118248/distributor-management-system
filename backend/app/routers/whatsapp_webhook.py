import json
from datetime import datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Customer, Order, Product
from app.services.orders import place_order
from app.services.whatsapp import send_whatsapp_message, ORDER_CONFIRMATION_CONTENT_SID

router = APIRouter(prefix="/webhook", tags=["whatsapp"])


def _safe_send(*args, **kwargs):
    try:
        send_whatsapp_message(*args, **kwargs)
    except Exception as e:  # the order/confirmation is already saved; never fail the webhook
        print(f"WhatsApp send failed: {e}")


def _find_customer(db: Session, from_number: str):
    phone = from_number.replace("whatsapp:", "")
    return db.query(Customer).filter(Customer.phone == phone).first()


def _handle_confirm(db: Session, From: str, parts: list):
    """CONFIRM <order id>  — customer confirms goods received. Stored as delivery proof."""
    customer = _find_customer(db, From)
    if not customer:
        _safe_send(From, "We couldn't find your account. Please contact the distributor.")
        return {"status": "customer_not_found"}
    if len(parts) != 2 or not parts[1].isdigit():
        _safe_send(From, "Format: CONFIRM <order number>")
        return {"status": "invalid_confirm"}
    order = db.query(Order).filter(Order.id == int(parts[1]), Order.customer_id == customer.id).first()
    if not order:
        _safe_send(From, f"Order {parts[1]} not found on your account.")
        return {"status": "order_not_found"}
    if order.delivery_confirmed_at is None:
        order.delivery_confirmed_at = datetime.utcnow()
        db.commit()
    _safe_send(From, f"Thank you! Delivery of order {order.id} confirmed.")
    return {"status": "confirmed"}


@router.post("/whatsapp")
def receive_whatsapp_message(
    From: str = Form(...),   # Twilio sends sender's number as "From", e.g. "whatsapp:+9198xxxxxxx"
    Body: str = Form(...),   # message text, e.g. "ORDER RICE5KG 10"
    db: Session = Depends(get_db),
):
    """
    ORDER <product_name> <quantity>   e.g. "ORDER RICE5KG 10"
    CONFIRM <order id>                e.g. "CONFIRM 12"
    """
    parts = Body.strip().split()
    command = parts[0].upper() if parts else ""

    if command == "CONFIRM":
        return _handle_confirm(db, From, parts)

    if len(parts) != 3 or command != "ORDER":
        _safe_send(From, "Sorry, couldn't understand that. Format: ORDER <product> <qty>")
        return {"status": "ignored"}

    _, product_name, qty_str = parts
    try:
        quantity = Decimal(qty_str)
        if quantity <= 0:
            raise InvalidOperation
    except InvalidOperation:
        _safe_send(From, "Quantity must be a positive number. Format: ORDER <product> <qty>")
        return {"status": "invalid_qty"}

    product = db.query(Product).filter(Product.name.ilike(product_name)).first()
    if not product:
        _safe_send(From, f"Product '{product_name}' not found.")
        return {"status": "product_not_found"}

    customer = _find_customer(db, From)
    if not customer:
        _safe_send(From, "We couldn't find your account. Please contact the distributor.")
        return {"status": "customer_not_found"}

    try:
        order = place_order(db, customer.id, [(product.id, quantity)], source="whatsapp")
        db.commit()
    except HTTPException as e:
        db.rollback()
        _safe_send(From, f"Sorry, we couldn't place the order: {e.detail}")
        return {"status": "failed"}

    if order.status == "on_hold":
        _safe_send(From, f"Order {order.id} received and is waiting for the distributor's approval.")
        return {"status": "on_hold", "order_id": order.id}

    _safe_send(
        From,
        content_sid=ORDER_CONFIRMATION_CONTENT_SID,
        content_variables=json.dumps({"1": str(quantity), "2": product.name, "3": str(order.id)}),
    )
    return {"status": "created", "order_id": order.id}

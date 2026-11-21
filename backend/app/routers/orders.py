from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Order
from app.schemas.schemas import OrderCreate, OrderOut
from app.services import credit
from app.services.orders import place_order, restore_stock

router = APIRouter(prefix="/orders", tags=["orders"])

# on_hold / rejected can only be reached through the credit workflow, not by PATCH
SETTABLE_STATUSES = {"pending", "dispatched", "delivered"}


@router.post("", response_model=OrderOut, dependencies=[Depends(get_current_user)])
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    items = [(i.product_id, i.quantity) for i in order_in.items]
    order = place_order(db, order_in.customer_id, items, source="manual")
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[OrderOut], dependencies=[Depends(get_current_user)])
def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.id.desc()).all()


@router.patch("/{order_id}/status", response_model=OrderOut, dependencies=[Depends(get_current_user)])
def update_status(order_id: int, status: str, db: Session = Depends(get_db)):
    if status not in SETTABLE_STATUSES:
        raise HTTPException(400, f"Status must be one of {sorted(SETTABLE_STATUSES)}")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status in ("on_hold", "rejected"):
        raise HTTPException(400, f"Order is {order.status}; use approve/reject instead")
    order.status = status
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/approve", response_model=OrderOut, dependencies=[Depends(require_role("owner"))])
def approve_order(order_id: int, db: Session = Depends(get_db)):
    """Owner overrides the credit hold. The sale is then added to the customer's ledger."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "on_hold":
        raise HTTPException(400, "Only on-hold orders can be approved")
    order.status = "pending"
    order.hold_reason = None
    credit.post_ledger(db, order.customer_id, "credit", order.total_amount, order_id=order.id)
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/reject", response_model=OrderOut, dependencies=[Depends(require_role("owner"))])
def reject_order(order_id: int, db: Session = Depends(get_db)):
    """Owner declines a held order. Stock goes back to its batch; no ledger entry is made."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "on_hold":
        raise HTTPException(400, "Only on-hold orders can be rejected")
    restore_stock(db, order)
    order.status = "rejected"
    db.commit()
    db.refresh(order)
    return order

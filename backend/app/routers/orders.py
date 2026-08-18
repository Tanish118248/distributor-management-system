from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Order, OrderItem
from app.routers.stock import get_fefo_batch
from app.schemas.schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, dependencies=[Depends(get_current_user)])
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    order = Order(customer_id=order_in.customer_id, status="pending", total_amount=0, source="manual")
    db.add(order)
    db.flush()  # get order.id before committing

    total = 0
    for item in order_in.items:
        batch = get_fefo_batch(db, item.product_id, item.quantity)
        batch.quantity -= item.quantity
        if batch.quantity <= 0:
            batch.status = "depleted"

        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            batch_id=batch.id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(order_item)
        total += float(item.quantity) * float(item.unit_price)

    order.total_amount = round(total, 2)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[OrderOut], dependencies=[Depends(get_current_user)])
def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).all()


@router.patch("/{order_id}/status", response_model=OrderOut, dependencies=[Depends(get_current_user)])
def update_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    order.status = status
    db.commit()
    db.refresh(order)
    return order

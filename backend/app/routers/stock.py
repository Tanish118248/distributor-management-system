from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.models import StockBatch
from app.schemas.schemas import StockBatchCreate, StockBatchOut

router = APIRouter(prefix="/stock", tags=["stock"])


@router.post("/batches", response_model=StockBatchOut, dependencies=[Depends(require_role("owner"))])
def add_batch(batch_in: StockBatchCreate, db: Session = Depends(get_db)):
    batch = StockBatch(**batch_in.model_dump(), status="active")
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/batches", response_model=List[StockBatchOut], dependencies=[Depends(get_current_user)])
def list_batches(product_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(StockBatch)
    if product_id:
        query = query.filter(StockBatch.product_id == product_id)
    return query.order_by(StockBatch.expiry_date.asc()).all()


def get_fefo_batch(db: Session, product_id: int, needed_qty) -> StockBatch:
    """FEFO: pick the batch with the nearest expiry date that still has stock."""
    batch = (
        db.query(StockBatch)
        .filter(
            StockBatch.product_id == product_id,
            StockBatch.status.in_(["active", "expiring_soon"]),
            StockBatch.quantity >= needed_qty,
        )
        .order_by(StockBatch.expiry_date.asc())
        .first()
    )
    if not batch:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product_id}")
    return batch

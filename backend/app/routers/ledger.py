from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.models import Customer, LedgerEntry
from app.schemas.schemas import LedgerEntryCreate, LedgerEntryOut
from app.services import credit

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.post("", response_model=LedgerEntryOut, dependencies=[Depends(require_role("owner", "accountant"))])
def add_entry(entry_in: LedgerEntryCreate, db: Session = Depends(get_db)):
    if entry_in.entry_type not in ("credit", "payment"):
        raise HTTPException(400, "entry_type must be 'credit' or 'payment'")
    if entry_in.amount <= 0:
        raise HTTPException(400, "Amount must be greater than zero")
    if not db.query(Customer).filter(Customer.id == entry_in.customer_id).first():
        raise HTTPException(404, "Customer not found")

    if entry_in.entry_type == "payment":
        # payments are applied to the oldest unpaid orders first (FIFO)
        entry = credit.record_payment(db, entry_in.customer_id, entry_in.amount)
    else:
        entry = credit.post_ledger(db, entry_in.customer_id, "credit", entry_in.amount)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{customer_id}", response_model=List[LedgerEntryOut], dependencies=[Depends(get_current_user)])
def get_statement(customer_id: int, db: Session = Depends(get_db)):
    return (
        db.query(LedgerEntry)
        .filter(LedgerEntry.customer_id == customer_id)
        .order_by(LedgerEntry.id.asc())
        .all()
    )

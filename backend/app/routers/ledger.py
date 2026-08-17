from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.models import LedgerEntry
from app.schemas.schemas import LedgerEntryCreate, LedgerEntryOut

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.post("", response_model=LedgerEntryOut, dependencies=[Depends(require_role("owner", "accountant"))])
def add_entry(entry_in: LedgerEntryCreate, db: Session = Depends(get_db)):
    last_entry = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.customer_id == entry_in.customer_id)
        .order_by(LedgerEntry.date.desc())
        .first()
    )
    prev_balance = last_entry.running_balance if last_entry else 0

    # credit increases what the customer owes, payment decreases it
    delta = entry_in.amount if entry_in.entry_type == "credit" else -entry_in.amount
    new_balance = float(prev_balance) + float(delta)

    entry = LedgerEntry(**entry_in.model_dump(), running_balance=new_balance)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{customer_id}", response_model=List[LedgerEntryOut], dependencies=[Depends(get_current_user)])
def get_statement(customer_id: int, db: Session = Depends(get_db)):
    return (
        db.query(LedgerEntry)
        .filter(LedgerEntry.customer_id == customer_id)
        .order_by(LedgerEntry.date.asc())
        .all()
    )

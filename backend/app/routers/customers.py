from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Customer
from app.schemas.schemas import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerOut, dependencies=[Depends(require_role("owner", "salesperson"))])
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    if data.credit_limit < 0 or data.credit_days < 0:
        raise HTTPException(400, "Credit limit and credit days cannot be negative")
    if db.query(Customer).filter(Customer.phone == data.phone).first():
        raise HTTPException(400, "A customer with this phone number already exists")
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=List[CustomerOut], dependencies=[Depends(get_current_user)])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.name).all()


@router.get("/{customer_id}", response_model=CustomerOut, dependencies=[Depends(get_current_user)])
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


# Only the owner may change credit terms
@router.patch("/{customer_id}", response_model=CustomerOut, dependencies=[Depends(require_role("owner"))])
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("credit_limit") is not None and changes["credit_limit"] < 0:
        raise HTTPException(400, "Credit limit cannot be negative")
    for k, v in changes.items():
        setattr(customer, k, v)
    db.commit()
    db.refresh(customer)
    return customer

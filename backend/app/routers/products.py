from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.models import Product
from app.schemas.schemas import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])

@router.post("", response_model=ProductOut, dependencies=[Depends(require_role("owner"))])
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("", response_model=List[ProductOut], dependencies=[Depends(get_current_user)])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()
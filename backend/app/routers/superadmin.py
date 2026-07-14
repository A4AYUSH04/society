from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import User, Role, ComplaintCategory, AuditLog
from app.middleware.auth import RoleChecker
from app.repositories.audit import AuditRepository

router = APIRouter(prefix="/superadmin", tags=["Super Admin Operations"])

@router.get("/users", response_model=List[dict])
def list_all_users(
    current_user: User = Depends(RoleChecker(["Superadmin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "role_name": u.role.name if u.role else None,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role_name: str = Query(..., description="Role name: Superadmin, Admin, Resident"),
    current_user: User = Depends(RoleChecker(["Superadmin"])),
    db: Session = Depends(get_db)
):
    # Retrieve user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    # Retrieve role
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    user.role_id = role.id
    db.commit()

    # Log audit event
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        action="Role Promotion",
        description=f"Promoted/demoted user ID {user.id} ({user.email}) to role {role_name}.",
        ip_address="System"
    )

    return {"message": "User role updated successfully", "user_id": user.id, "new_role": role_name}

@router.post("/categories")
def create_category(
    name: str = Query(...),
    description: str = Query(None),
    current_user: User = Depends(RoleChecker(["Superadmin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(ComplaintCategory).filter(ComplaintCategory.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    cat = ComplaintCategory(name=name, description=description, is_active=True)
    db.add(cat)
    db.commit()
    db.refresh(cat)

    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        action="Category Created",
        description=f"Created category '{name}'.",
        ip_address="System"
    )

    return {"message": "Category created successfully", "category": {"id": cat.id, "name": cat.name}}

@router.put("/categories/{category_id}")
def update_category(
    category_id: int,
    name: str = Query(...),
    description: str = Query(None),
    is_active: bool = Query(True),
    current_user: User = Depends(RoleChecker(["Superadmin"])),
    db: Session = Depends(get_db)
):
    cat = db.query(ComplaintCategory).filter(ComplaintCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    cat.name = name
    cat.description = description
    cat.is_active = is_active
    db.commit()

    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        action="Category Updated",
        description=f"Updated category ID {category_id}.",
        ip_address="System"
    )

    return {"message": "Category updated successfully"}

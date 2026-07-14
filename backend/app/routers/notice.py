from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.database.session import get_db
from app.models.models import User
from app.middleware.auth import get_current_active_user, RoleChecker
from app.schemas.notice import NoticeResponse, NoticeCreate, NoticeUpdate
from app.services.notice import NoticeService
from app.repositories.audit import AuditRepository

router = APIRouter(tags=["Notices"])

# ==========================================
# RESIDENT NOTICE ENDPOINTS
# ==========================================

@router.get("/notices", response_model=List[NoticeResponse])
def get_active_notices(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    return notice_service.get_active_notices_for_user(user_id=current_user.id)


@router.post("/notices/{notice_id}/read", status_code=status.HTTP_200_OK)
def mark_notice_as_read(
    notice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    success = notice_service.mark_as_read(notice_id, current_user.id)
    if not success:
        return {"message": "Notice already marked as read"}
    return {"message": "Notice marked as read"}


@router.get("/notices/unread-count", response_model=dict)
def get_unread_notices_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    count = notice_service.get_unread_count(current_user.id)
    return {"unread_count": count}


# ==========================================
# ADMIN NOTICE ENDPOINTS
# ==========================================

@router.get("/admin/notices", response_model=List[NoticeResponse])
def get_all_notices_admin(
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    return notice_service.get_all_notices_for_admin()


@router.post("/notices", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
def create_notice(
    data: NoticeCreate,
    request: Request,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    audit_repo = AuditRepository(db)
    
    notice = notice_service.create_notice(
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        is_pinned=data.is_pinned,
        expiry_date=data.expiry_date,
        publish_date=data.publish_date,
        is_scheduled=data.is_scheduled,
        attachments=data.attachments_json
    )
    
    # Audit log
    audit_repo.log_action(
        user_id=current_user.id,
        action="NOTICE_CREATION",
        description=f"Created notice: ID #{notice.id} - '{notice.title}'",
        ip_address=request.client.host if request.client else None
    )
    
    return notice


@router.put("/notices/{notice_id}", response_model=NoticeResponse)
def update_notice(
    notice_id: int,
    data: NoticeUpdate,
    request: Request,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    audit_repo = AuditRepository(db)
    
    updated = notice_service.update_notice(notice_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")
        
    # Audit log
    audit_repo.log_action(
        user_id=current_user.id,
        action="NOTICE_UPDATE",
        description=f"Updated notice: ID #{notice_id} - '{updated.title}'",
        ip_address=request.client.host if request.client else None
    )
    
    return updated


@router.delete("/notices/{notice_id}", status_code=status.HTTP_200_OK)
def delete_notice(
    notice_id: int,
    request: Request,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    notice_service = NoticeService(db)
    audit_repo = AuditRepository(db)
    
    success = notice_service.delete_notice(notice_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")
        
    # Audit log
    audit_repo.log_action(
        user_id=current_user.id,
        action="NOTICE_DELETION",
        description=f"Deleted notice: ID #{notice_id}",
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Notice deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import User
from app.middleware.auth import get_current_active_user, RoleChecker
from app.schemas.resident import ResidentResponse, ResidentUpdate
from app.schemas.notification import NotificationResponse
from app.repositories.user import UserRepository
from app.repositories.notification import NotificationRepository
from app.repositories.audit import AuditRepository

router = APIRouter(tags=["Residents & Notifications"])

# ==========================================
# RESIDENT PROFILE & NOTIFICATIONS ENDPOINTS
# ==========================================

@router.get("/resident/profile", response_model=ResidentResponse)
def get_resident_profile(
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    user_repo = UserRepository(db)
    resident = user_repo.get_resident_by_user_id(current_user.id)
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident profile not found")
    return resident


@router.put("/resident/profile", response_model=ResidentResponse)
def update_resident_profile(
    data: ResidentUpdate,
    request: Request,
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    user_repo = UserRepository(db)
    audit_repo = AuditRepository(db)
    
    resident = user_repo.get_resident_by_user_id(current_user.id)
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident profile not found")

    # Update User Fields (e.g. full_name)
    if data.full_name is not None:
        user_repo.update_user_profile(current_user.id, data.full_name)

    # Update Resident Specific Fields
    update_dict = data.model_dump(exclude={"full_name"}, exclude_unset=True)
    updated_resident = user_repo.update_resident(resident.id, update_dict)
    
    # Audit log
    audit_repo.log_action(
        user_id=current_user.id,
        action="PROFILE_UPDATE",
        description="Updated resident contact / flat profile information.",
        ip_address=request.client.host if request.client else None
    )

    return updated_resident


@router.get("/resident/notifications", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notif_repo = NotificationRepository(db)
    return notif_repo.get_user_notifications(current_user.id)


@router.get("/resident/notifications/unread-count", response_model=dict)
def get_unread_notification_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notif_repo = NotificationRepository(db)
    count = notif_repo.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.post("/resident/notifications/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notif_repo = NotificationRepository(db)
    count = notif_repo.mark_all_as_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}


@router.post("/resident/notifications/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notif_repo = NotificationRepository(db)
    success = notif_repo.mark_as_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or not owned by user")
    return {"message": "Notification marked as read"}


# ==========================================
# ADMIN RESIDENT MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/admin/residents", response_model=List[ResidentResponse])
def get_residents_list(
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    user_repo = UserRepository(db)
    return user_repo.get_all_residents()


@router.put("/admin/residents/{resident_id}/verify", response_model=ResidentResponse)
def verify_resident_account(
    resident_id: int,
    is_verified: bool = True,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    user_repo = UserRepository(db)
    audit_repo = AuditRepository(db)
    notif_repo = NotificationRepository(db)
    
    resident = user_repo.get_resident_by_id(resident_id)
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident not found")

    updated = user_repo.verify_resident(resident_id, is_verified)
    
    # Audit log
    audit_repo.log_action(
        user_id=current_user.id,
        action="RESIDENT_VERIFICATION",
        description=f"Admin updated resident verification status for {resident.user.email} to {is_verified}",
        ip_address=None
    )

    # Notify Resident
    status_text = "VERIFIED" if is_verified else "UNVERIFIED"
    notif_repo.create_notification(
        user_id=resident.user_id,
        title="Account Status Update",
        message=f"Your resident profile has been {status_text} by the administrator. You can now raise maintenance complaints.",
        notification_type="system"
    )

    return updated

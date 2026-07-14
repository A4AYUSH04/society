from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import User
from app.middleware.auth import RoleChecker
from app.schemas.audit import AuditLogResponse
from app.repositories.audit import AuditRepository

router = APIRouter(prefix="/admin", tags=["Admin Auditing"])

@router.get("/audit-logs", response_model=dict)
def get_system_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    audit_repo = AuditRepository(db)
    logs, total = audit_repo.get_audit_logs(page=page, page_size=page_size)
    
    # Map to AuditLogResponse items
    items = []
    for l in logs:
        items.append({
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "description": l.description,
            "ip_address": l.ip_address,
            "created_at": l.created_at,
            "user_email": getattr(l, "user_email", None)
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/email-logs", response_model=dict)
def get_system_email_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    audit_repo = AuditRepository(db)
    logs = audit_repo.get_email_logs(limit=limit)
    return {
        "items": [
            {
                "id": l.id,
                "recipient_email": l.recipient_email,
                "subject": l.subject,
                "sent_status": l.sent_status,
                "error_message": l.error_message,
                "sent_at": l.sent_at
            }
            for l in logs
        ]
    }

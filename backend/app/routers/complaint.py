from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.database.session import get_db
from app.models.models import User
from app.middleware.auth import get_current_active_user, RoleChecker
from app.schemas.complaint import (
    ComplaintCreate, ComplaintResponse, ComplaintUpdate,
    CategoryResponse, CategoryCreate, BulkUpdateResponse,
    AdminDashboardStats, ResidentDashboardStats, ComplaintShortResponse
)
from app.services.complaint import ComplaintService
from app.repositories.complaint import ComplaintRepository
from app.repositories.audit import AuditRepository

router = APIRouter(tags=["Complaints"])

# ==========================================
# CATEGORIES ENDPOINTS
# ==========================================

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    return complaint_service.get_all_categories(active_only=active_only)


@router.post("/categories", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    try:
        category = complaint_service.create_category(data.name, data.description)
        return category
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryCreate,
    is_active: bool = True,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    category = complaint_service.update_category(category_id, data.name, data.description, is_active)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


# ==========================================
# RESIDENT COMPLAINTS ENDPOINTS
# ==========================================

@router.post("/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def raise_complaint(
    data: ComplaintCreate,
    request: Request,
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    audit_repo = AuditRepository(db)
    try:
        complaint = complaint_service.create_complaint(
            resident_user_id=current_user.id,
            title=data.title,
            description=data.description,
            category_id=data.category_id,
            location=data.location,
            priority=data.priority
        )
        
        # Audit log
        audit_repo.log_action(
            user_id=current_user.id,
            action="COMPLAINT_CREATION",
            description=f"Raised complaint: ID #{complaint.id} - '{complaint.title}'",
            ip_address=request.client.host if request.client else None
        )
        return complaint
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/complaints", response_model=List[ComplaintResponse])
def get_resident_complaints(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    
    # We must first fetch this user's resident profile
    resident = complaint_repo.db.query(User).filter(User.id == current_user.id).first().resident_profile
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident profile not found")
        
    complaints, _ = complaint_repo.search_complaints(
        resident_id=resident.id,
        search_query=search,
        status=status,
        priority=priority,
        category_id=category_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )
    return complaints


@router.post("/complaints/{complaint_id}/photos", status_code=status.HTTP_201_CREATED)
async def upload_complaint_photo(
    complaint_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    complaint_repo = ComplaintRepository(db)
    
    # Verify owner
    complaint = complaint_repo.get_complaint_by_id(complaint_id)
    if not complaint or complaint.resident.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this complaint")

    file_bytes = await file.read()
    try:
        photo = complaint_service.upload_photo(
            complaint_id=complaint_id,
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type
        )
        return {"id": photo.id, "file_path": photo.file_path, "filename": photo.original_filename}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/complaints/{complaint_id}/cancel", response_model=ComplaintResponse)
def cancel_complaint(
    complaint_id: int,
    request: Request,
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    complaint_repo = ComplaintRepository(db)
    
    # Verify owner
    complaint = complaint_repo.get_complaint_by_id(complaint_id)
    if not complaint or complaint.resident.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this complaint")

    if complaint.status in ["Resolved", "Closed"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resolved or Closed complaints cannot be cancelled.")

    try:
        updated = complaint_service.update_complaint_status(
            complaint_id=complaint_id,
            new_status="Cancelled",
            actor_id=current_user.id,
            actor_role="Resident",
            note="Cancelled by resident."
        )
        
        # Audit
        AuditRepository(db).log_action(
            user_id=current_user.id,
            action="COMPLAINT_CANCELLATION",
            description=f"Cancelled complaint: ID #{complaint_id}",
            ip_address=request.client.host if request.client else None
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# SHARED COMPLAINT DETAILS & REPORTS ENDPOINTS
# ==========================================

@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint_details(
    complaint_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    complaint = complaint_repo.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
    # Security: If user is Resident, they can only view their own complaint
    if current_user.role.name == "Resident" and complaint.resident.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this complaint")
        
    return complaint


@router.get("/complaints/{complaint_id}/pdf")
def download_complaint_pdf(
    complaint_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    complaint_repo = ComplaintRepository(db)
    
    complaint = complaint_repo.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if current_user.role.name == "Resident" and complaint.resident.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this report")

    try:
        pdf_bytes = complaint_service.generate_pdf_report(complaint_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=complaint_report_{complaint_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==========================================
# ADMIN MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/admin/complaints", response_model=dict)
def get_all_complaints_admin(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    building_wing: Optional[str] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    
    # Parse dates if present
    start_dt = None
    end_dt = None
    if start_date:
        start_dt = datetime.datetime.fromisoformat(start_date)
    if end_date:
        end_dt = datetime.datetime.fromisoformat(end_date)
        
    complaints, total = complaint_repo.search_complaints(
        search_query=search,
        status=status,
        priority=priority,
        category_id=category_id,
        building_wing=building_wing,
        is_overdue=is_overdue,
        start_date=start_dt,
        end_date=end_dt,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )
    
    return {
        "items": complaints,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.put("/admin/complaints/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status_admin(
    complaint_id: int,
    data: ComplaintUpdate,
    request: Request,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    if not data.status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status is required")

    try:
        updated = complaint_service.update_complaint_status(
            complaint_id=complaint_id,
            new_status=data.status,
            actor_id=current_user.id,
            actor_role="Admin",
            note=data.note
        )
        
        # Audit
        AuditRepository(db).log_action(
            user_id=current_user.id,
            action="COMPLAINT_STATUS_UPDATE",
            description=f"Updated complaint #{complaint_id} status to '{data.status}'",
            ip_address=request.client.host if request.client else None
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/admin/complaints/{complaint_id}/priority", response_model=ComplaintResponse)
def update_complaint_priority_admin(
    complaint_id: int,
    data: ComplaintUpdate,
    request: Request,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    if not data.priority:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Priority is required")

    try:
        updated = complaint_service.update_complaint_priority(
            complaint_id=complaint_id,
            new_priority=data.priority,
            actor_id=current_user.id,
            actor_role="Admin"
        )
        
        # Audit
        AuditRepository(db).log_action(
            user_id=current_user.id,
            action="COMPLAINT_PRIORITY_UPDATE",
            description=f"Updated complaint #{complaint_id} priority to '{data.priority}'",
            ip_address=request.client.host if request.client else None
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/admin/complaints/bulk-status", response_model=BulkUpdateResponse)
def bulk_status_update(
    complaint_ids: List[int],
    new_status: str,
    note: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    # Check valid status transitions
    allowed_statuses = ["Open", "Assigned", "In Progress", "Waiting for Resident", "Resolved", "Closed", "Rejected", "Cancelled"]
    if new_status not in allowed_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {new_status}")

    count = complaint_repo.bulk_update_status(
        complaint_ids=complaint_ids,
        new_status=new_status,
        actor_id=current_user.id,
        actor_role="Admin",
        note=note
    )
    return {"updated_count": count, "message": f"Successfully updated status for {count} complaints."}


@router.post("/admin/complaints/bulk-priority", response_model=BulkUpdateResponse)
def bulk_priority_update(
    complaint_ids: List[int],
    new_priority: str,
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    allowed_priorities = ["Low", "Medium", "High", "Emergency"]
    if new_priority not in allowed_priorities:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid priority: {new_priority}")

    count = complaint_repo.bulk_update_priority(
        complaint_ids=complaint_ids,
        new_priority=new_priority,
        actor_id=current_user.id,
        actor_role="Admin"
    )
    return {"updated_count": count, "message": f"Successfully updated priority for {count} complaints."}


# ==========================================
# EXPORTS ENDPOINTS
# ==========================================

@router.get("/admin/export/csv")
def export_csv(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    filters = {"status": status, "priority": priority, "category_id": category_id, "is_overdue": is_overdue}
    csv_data = complaint_service.export_csv(filters)
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaints_export.csv"}
    )


@router.get("/admin/export/excel")
def export_excel(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_service = ComplaintService(db)
    filters = {"status": status, "priority": priority, "category_id": category_id, "is_overdue": is_overdue}
    excel_bytes = complaint_service.export_excel(filters)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=complaints_export.xlsx"}
    )


# ==========================================
# DASHBOARD STATS ENDPOINTS
# ==========================================

@router.get("/dashboard/resident-stats", response_model=ResidentDashboardStats)
def get_resident_dashboard_details(
    current_user: User = Depends(RoleChecker(["Resident"])),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    resident = complaint_repo.db.query(User).filter(User.id == current_user.id).first().resident_profile
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident profile not found")
        
    stats = complaint_repo.get_resident_dashboard_stats(resident.id)
    
    # Add active notices summary
    from app.repositories.notice import NoticeRepository
    notice_repo = NoticeRepository(db)
    active_notices = notice_repo.get_active_notices(user_id=current_user.id)[:5]
    
    formatted_notices = []
    for n in active_notices:
        formatted_notices.append({
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "is_pinned": n.is_pinned,
            "publish_date": n.publish_date.isoformat(),
            "is_read": getattr(n, "is_read", False)
        })
        
    stats["recent_notices"] = formatted_notices
    return stats


@router.get("/dashboard/admin-stats", response_model=AdminDashboardStats)
def get_admin_dashboard_details(
    current_user: User = Depends(RoleChecker(["Admin", "Superadmin"])),
    db: Session = Depends(get_db)
):
    complaint_repo = ComplaintRepository(db)
    return complaint_repo.get_admin_dashboard_stats()

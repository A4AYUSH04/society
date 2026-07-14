from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, desc, asc
from app.models.models import Complaint, ComplaintCategory, ComplaintHistory, ComplaintPhoto, Resident, User
from typing import List, Optional, Tuple, Dict, Any
import datetime

class ComplaintRepository:
    def __init__(self, db: Session):
        self.db = db

    # Category Operations
    def get_category_by_id(self, category_id: int) -> Optional[ComplaintCategory]:
        return self.db.query(ComplaintCategory).filter(ComplaintCategory.id == category_id).first()

    def get_category_by_name(self, name: str) -> Optional[ComplaintCategory]:
        return self.db.query(ComplaintCategory).filter(ComplaintCategory.name.ilike(name)).first()

    def get_all_categories(self, active_only: bool = False) -> List[ComplaintCategory]:
        query = self.db.query(ComplaintCategory)
        if active_only:
            query = query.filter(ComplaintCategory.is_active == True)
        return query.order_by(ComplaintCategory.name.asc()).all()

    def create_category(self, name: str, description: Optional[str] = None) -> ComplaintCategory:
        category = ComplaintCategory(name=name, description=description, is_active=True)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update_category(self, category_id: int, name: str, description: Optional[str], is_active: bool) -> Optional[ComplaintCategory]:
        category = self.get_category_by_id(category_id)
        if category:
            category.name = name
            category.description = description
            category.is_active = is_active
            self.db.commit()
            self.db.refresh(category)
            return category
        return None

    # Complaint Operations
    def get_complaint_by_id(self, complaint_id: int) -> Optional[Complaint]:
        return self.db.query(Complaint).options(
            joinedload(Complaint.category),
            joinedload(Complaint.resident).joinedload(Resident.user),
            joinedload(Complaint.photos),
            joinedload(Complaint.histories)
        ).filter(Complaint.id == complaint_id).first()

    def create_complaint(self, data: dict) -> Complaint:
        complaint = Complaint(**data)
        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)
        return complaint

    def update_complaint(self, complaint_id: int, data: dict) -> Optional[Complaint]:
        complaint = self.get_complaint_by_id(complaint_id)
        if complaint:
            for key, value in data.items():
                if value is not None:
                    setattr(complaint, key, value)
            complaint.updated_at = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(complaint)
            return complaint
        return None

    # History Operations
    def create_complaint_history(self, history_data: dict) -> ComplaintHistory:
        history = ComplaintHistory(**history_data)
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_complaint_histories(self, complaint_id: int) -> List[ComplaintHistory]:
        return self.db.query(ComplaintHistory).filter(ComplaintHistory.complaint_id == complaint_id).order_by(ComplaintHistory.timestamp.asc()).all()

    # Photo Operations
    def create_complaint_photo(self, photo_data: dict) -> ComplaintPhoto:
        photo = ComplaintPhoto(**photo_data)
        self.db.add(photo)
        self.db.commit()
        self.db.refresh(photo)
        return photo

    def get_complaint_photos(self, complaint_id: int) -> List[ComplaintPhoto]:
        return self.db.query(ComplaintPhoto).filter(ComplaintPhoto.complaint_id == complaint_id).all()

    def delete_complaint_photo(self, photo_id: int) -> bool:
        photo = self.db.query(ComplaintPhoto).filter(ComplaintPhoto.id == photo_id).first()
        if photo:
            self.db.delete(photo)
            self.db.commit()
            return True
        return False

    # Advanced Search, Filter, Sort, Pagination
    def search_complaints(
        self,
        resident_id: Optional[int] = None,
        search_query: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category_id: Optional[int] = None,
        building_wing: Optional[str] = None,
        is_overdue: Optional[bool] = None,
        start_date: Optional[datetime.datetime] = None,
        end_date: Optional[datetime.datetime] = None,
        sort_by: str = "created_at",  # created_at, status, priority, is_overdue, updated_at
        sort_order: str = "desc",    # asc, desc
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Complaint], int]:
        query = self.db.query(Complaint).join(Complaint.resident).join(Resident.user).join(Complaint.category)

        # Filters
        if resident_id is not None:
            query = query.filter(Complaint.resident_id == resident_id)
        if status:
            query = query.filter(Complaint.status == status)
        if priority:
            query = query.filter(Complaint.priority == priority)
        if category_id:
            query = query.filter(Complaint.category_id == category_id)
        if building_wing:
            query = query.filter(Resident.building_wing.ilike(f"%{building_wing}%"))
        if is_overdue is not None:
            query = query.filter(Complaint.is_overdue == is_overdue)
        if start_date:
            query = query.filter(Complaint.created_at >= start_date)
        if end_date:
            query = query.filter(Complaint.created_at <= end_date)

        # Search Query
        if search_query:
            search_filter = or_(
                Complaint.title.ilike(f"%{search_query}%"),
                Complaint.description.ilike(f"%{search_query}%"),
                Complaint.location.ilike(f"%{search_query}%"),
                User.full_name.ilike(f"%{search_query}%"),
                ComplaintCategory.name.ilike(f"%{search_query}%"),
                func.cast(Complaint.id, String).ilike(f"%{search_query}%")
            )
            query = query.filter(search_filter)

        # Count total items before pagination
        total_items = query.count()

        # Sorting
        # Let's map sorting columns
        sort_column = Complaint.created_at
        if sort_by == "updated_at":
            sort_column = Complaint.updated_at
        elif sort_by == "status":
            sort_column = Complaint.status
        elif sort_by == "priority":
            sort_column = Complaint.priority
        elif sort_by == "is_overdue":
            sort_column = Complaint.is_overdue

        # Handle overdue complaints pinning first for admin
        # "Overdue complaints pinned at top, Red badge" -> if is_overdue is true, they should come first.
        # Let's implement that by sorting by is_overdue desc first, then the requested sort_column.
        if sort_order == "desc":
            query = query.order_by(desc(Complaint.is_overdue), desc(sort_column))
        else:
            query = query.order_by(desc(Complaint.is_overdue), asc(sort_column))

        # Pagination
        offset = (page - 1) * page_size
        complaints = query.offset(offset).limit(page_size).all()

        return complaints, total_items

    # Bulk Actions
    def bulk_update_status(self, complaint_ids: List[int], new_status: str, actor_id: int, actor_role: str, note: Optional[str] = None) -> int:
        count = 0
        now = datetime.datetime.utcnow()
        for cid in complaint_ids:
            complaint = self.get_complaint_by_id(cid)
            if complaint:
                old_status = complaint.status
                complaint.status = new_status
                complaint.updated_at = now
                
                # Log history
                history = ComplaintHistory(
                    complaint_id=cid,
                    old_status=old_status,
                    new_status=new_status,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    note=note or f"Bulk status update to {new_status}"
                )
                self.db.add(history)
                count += 1
        self.db.commit()
        return count

    def bulk_update_priority(self, complaint_ids: List[int], new_priority: str, actor_id: int, actor_role: str) -> int:
        count = 0
        now = datetime.datetime.utcnow()
        for cid in complaint_ids:
            complaint = self.get_complaint_by_id(cid)
            if complaint:
                complaint.priority = new_priority
                complaint.updated_at = now
                
                # Log history
                history = ComplaintHistory(
                    complaint_id=cid,
                    old_status=complaint.status,
                    new_status=complaint.status,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    note=f"Bulk priority update to {new_priority}"
                )
                self.db.add(history)
                count += 1
        self.db.commit()
        return count

    # Overdue checks
    def check_and_mark_overdue(self, threshold_days: int) -> int:
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=threshold_days)
        # Check active statuses: Open, Assigned, In Progress, Waiting for Resident
        active_statuses = ["Open", "Assigned", "In Progress", "Waiting for Resident"]
        
        overdue_complaints = self.db.query(Complaint).filter(
            Complaint.status.in_(active_statuses),
            Complaint.created_at <= cutoff_date,
            Complaint.is_overdue == False
        ).all()
        
        count = 0
        for comp in overdue_complaints:
            comp.is_overdue = True
            comp.updated_at = datetime.datetime.utcnow()
            
            # Log history
            history = ComplaintHistory(
                complaint_id=comp.id,
                old_status=comp.status,
                new_status=comp.status,
                actor_role="System",
                note=f"Complaint marked as overdue (exceeded {threshold_days} days threshold)."
            )
            self.db.add(history)
            count += 1
            
        if count > 0:
            self.db.commit()
            
        return count

    # Dashboard & Reporting Statistics
    def get_admin_dashboard_stats(self) -> Dict[str, Any]:
        # Counts by status
        status_counts = dict(self.db.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all())
        # Counts by category
        category_counts = dict(self.db.query(ComplaintCategory.name, func.count(Complaint.id)).join(Complaint.category).group_by(ComplaintCategory.name).all())
        # Counts by priority
        priority_counts = dict(self.db.query(Complaint.priority, func.count(Complaint.id)).group_by(Complaint.priority).all())
        
        total_complaints = self.db.query(Complaint.id).count()
        overdue_count = self.db.query(Complaint.id).filter(Complaint.is_overdue == True).count()
        
        # Complaints per month (last 6 months)
        six_months_ago = datetime.datetime.utcnow() - datetime.timedelta(days=180)
        # Using string formatting for simplicity across sqlite & postgres
        # sqlite uses strftime, postgres can use to_char or we can format in python.
        # To be safe and portable across databases, let's query all complaints in the last 6 months and group in python.
        recent_complaints = self.db.query(Complaint.created_at).filter(Complaint.created_at >= six_months_ago).all()
        monthly_counts = {}
        for (created_at,) in recent_complaints:
            month_key = created_at.strftime("%Y-%m")
            monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1

        # Recent activities (histories)
        recent_histories = self.db.query(ComplaintHistory).order_by(ComplaintHistory.timestamp.desc()).limit(10).all()
        activities = []
        for h in recent_histories:
            actor_name = "System"
            if h.actor:
                actor_name = h.actor.full_name
            activities.append({
                "complaint_id": h.complaint_id,
                "timestamp": h.timestamp.isoformat(),
                "actor_name": actor_name,
                "actor_role": h.actor_role,
                "old_status": h.old_status,
                "new_status": h.new_status,
                "note": h.note
            })

        # Top Categories
        top_cats = []
        for name, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            top_cats.append({"category": name, "count": count})

        return {
            "total_complaints": total_complaints,
            "by_status": status_counts,
            "by_category": category_counts,
            "by_priority": priority_counts,
            "overdue_count": overdue_count,
            "complaints_per_month": monthly_counts,
            "recent_activity": activities,
            "top_categories": top_cats
        }

    def get_resident_dashboard_stats(self, resident_id: int) -> Dict[str, Any]:
        # Total
        total_complaints = self.db.query(Complaint.id).filter(Complaint.resident_id == resident_id).count()
        # Open
        open_count = self.db.query(Complaint.id).filter(Complaint.resident_id == resident_id, Complaint.status == "Open").count()
        # Resolved
        resolved_count = self.db.query(Complaint.id).filter(Complaint.resident_id == resident_id, Complaint.status == "Resolved").count()
        # Pending (Assigned, In Progress, Waiting for Resident)
        pending_count = self.db.query(Complaint.id).filter(
            Complaint.resident_id == resident_id, 
            Complaint.status.in_(["Assigned", "In Progress", "Waiting for Resident"])
        ).count()

        # Recent complaints (last 5)
        recent_complaints = self.db.query(Complaint).options(
            joinedload(Complaint.category),
            joinedload(Complaint.resident).joinedload(Resident.user)
        ).filter(Complaint.resident_id == resident_id).order_by(Complaint.created_at.desc()).limit(5).all()

        return {
            "total_complaints": total_complaints,
            "open_count": open_count,
            "resolved_count": resolved_count,
            "pending_count": pending_count,
            "recent_complaints": recent_complaints
        }

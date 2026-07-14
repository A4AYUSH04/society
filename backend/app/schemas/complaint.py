from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.resident import ResidentResponse

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True


class ComplaintPhotoResponse(BaseModel):
    id: int
    file_path: str
    original_filename: str
    file_size: int
    content_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintHistoryResponse(BaseModel):
    id: int
    old_status: Optional[str]
    new_status: str
    timestamp: datetime
    actor_id: Optional[int]
    actor_role: str
    note: Optional[str]
    ip_address: Optional[str]

    class Config:
        from_attributes = True


class ComplaintBase(BaseModel):
    title: str
    description: str
    category_id: int
    location: str
    priority: Optional[str] = "Medium"  # Low, Medium, High, Emergency


class ComplaintCreate(ComplaintBase):
    ai_suggestion: Optional[str] = None


class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category_id: Optional[int] = None
    is_overdue: Optional[bool] = None
    note: Optional[str] = None  # Added as part of history logging


class ComplaintResponse(BaseModel):
    id: int
    title: str
    description: str
    category: CategoryResponse
    status: str
    priority: str
    location: str
    is_overdue: bool
    ai_suggestion: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resident: ResidentResponse
    photos: List[ComplaintPhotoResponse] = []
    histories: List[ComplaintHistoryResponse] = []

    class Config:
        from_attributes = True


class ComplaintShortResponse(BaseModel):
    id: int
    title: str
    status: str
    priority: str
    location: str
    is_overdue: bool
    created_at: datetime
    category: CategoryResponse
    resident_name: str
    building_wing: str
    flat_number: str

    class Config:
        from_attributes = True


class BulkUpdateResponse(BaseModel):
    updated_count: int
    message: str


class AdminDashboardStats(BaseModel):
    total_complaints: int
    by_status: dict
    by_category: dict
    by_priority: dict
    overdue_count: int
    complaints_per_month: dict
    recent_activity: List[dict]
    top_categories: List[dict]


class ResidentDashboardStats(BaseModel):
    total_complaints: int
    open_count: int
    resolved_count: int
    pending_count: int  # Assigned, In Progress, Waiting for Resident
    recent_complaints: List[ComplaintResponse]
    recent_notices: List[dict]

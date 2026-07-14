from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from app.schemas.auth import UserResponse

class NoticeBase(BaseModel):
    title: str
    content: str
    is_pinned: bool = False
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    is_scheduled: bool = False
    attachments_json: Optional[List[Any]] = None


class NoticeCreate(NoticeBase):
    pass


class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    is_scheduled: Optional[bool] = None
    attachments_json: Optional[List[Any]] = None


class NoticeResponse(NoticeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    author_id: int
    author: UserResponse
    is_read: Optional[bool] = False

    class Config:
        from_attributes = True

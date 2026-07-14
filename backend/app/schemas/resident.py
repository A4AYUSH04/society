from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.auth import UserResponse

class ResidentBase(BaseModel):
    flat_number: str
    building_wing: str
    contact_number: str
    alternate_contact: Optional[str] = None


class ResidentCreate(ResidentBase):
    user_id: int


class ResidentUpdate(BaseModel):
    flat_number: Optional[str] = None
    building_wing: Optional[str] = None
    contact_number: Optional[str] = None
    alternate_contact: Optional[str] = None
    full_name: Optional[str] = None


class ResidentResponse(ResidentBase):
    id: int
    user_id: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True

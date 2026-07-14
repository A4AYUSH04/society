from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    description: str
    ip_address: Optional[str]
    created_at: datetime
    user_email: Optional[str] = None

    class Config:
        from_attributes = True

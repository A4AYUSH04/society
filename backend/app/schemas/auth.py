from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class RoleResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role_id: int


class UserResponse(UserBase):
    id: int
    role: RoleResponse
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ResidentRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    flat_number: str
    building_wing: str
    contact_number: str
    alternate_contact: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

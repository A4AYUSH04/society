from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database.session import get_db
from app.schemas.auth import (
    ResidentRegister, LoginRequest, TokenResponse, 
    RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest, UserResponse
)
from app.services.auth import AuthService
from app.services.email import EmailService
from app.repositories.audit import AuditRepository
from app.repositories.user import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_resident(
    reg_data: ResidentRegister,
    request: Request,
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    audit_repo = AuditRepository(db)
    try:
        user = auth_service.register_resident(reg_data)
        
        # Log Audit
        audit_repo.log_action(
            user_id=user.id,
            action="RESIDENT_REGISTRATION",
            description=f"Resident registered: {user.email}",
            ip_address=request.client.host if request.client else None
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    audit_repo = AuditRepository(db)
    try:
        user, access_token, refresh_token = auth_service.login_user(
            login_data.email, login_data.password
        )
        
        # Log Audit
        audit_repo.log_action(
            user_id=user.id,
            action="LOGIN",
            description=f"User logged in: {user.email}",
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    try:
        user, access_token = auth_service.refresh_access_token(refresh_data.refresh_token)
        return {
            "access_token": access_token,
            "refresh_token": refresh_data.refresh_token,
            "token_type": "bearer",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    refresh_data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    audit_repo = AuditRepository(db)
    
    # Optional check to identify logging user
    payload = AuthService.verify_token(refresh_data.refresh_token, settings.JWT_REFRESH_SECRET_KEY)
    user_id = payload.get("user_id") if payload else None
    
    auth_service.logout_token(refresh_data.refresh_token)
    
    # Log Audit
    audit_repo.log_action(
        user_id=user_id,
        action="LOGOUT",
        description="User logged out / refresh token revoked.",
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    email_service = EmailService(db)
    user_repo = UserRepository(db)
    
    token = auth_service.generate_password_reset_token(data.email)
    if token:
        user = user_repo.get_user_by_email(data.email)
        email_service.send_password_reset_email(
            recipient_email=data.email,
            name=user.full_name,
            token=token
        )
        
    # Return 200 OK regardless of email existence to prevent user enumeration
    return {"message": "If this email is registered, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    audit_repo = AuditRepository(db)
    try:
        auth_service.reset_password(data.token, data.new_password)
        
        # Log Audit
        audit_repo.log_action(
            user_id=None, # User is not logged in during reset
            action="PASSWORD_RESET",
            description="Password reset successful using secure token.",
            ip_address=request.client.host if request.client else None
        )
        return {"message": "Password has been reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

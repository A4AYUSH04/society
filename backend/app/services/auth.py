from datetime import datetime, timedelta
from typing import Optional, Tuple
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.models import User, Role, Resident
from app.repositories.user import UserRepository
from app.schemas.auth import UserCreate, ResidentRegister

class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    @staticmethod
    def get_password_hash(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    # JWT Helper Methods
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
        return encoded_jwt

    @staticmethod
    def create_refresh_token_jwt(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm="HS256")
        return encoded_jwt

    @staticmethod
    def verify_token(token: str, secret: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            return payload
        except JWTError:
            return None

    # Core Business Logic
    def register_resident(self, reg_data: ResidentRegister) -> User:
        # Check if email already registered
        existing_user = self.user_repo.get_user_by_email(reg_data.email)
        if existing_user:
            raise ValueError("Email already registered")

        # Get or create Resident role
        role = self.user_repo.create_role_if_not_exists("Resident")

        # Create user profile
        hashed_password = self.get_password_hash(reg_data.password)
        user_dict = {
            "email": reg_data.email,
            "hashed_password": hashed_password,
            "full_name": reg_data.full_name,
            "role_id": role.id,
            "is_active": True
        }
        user = self.user_repo.create_user(user_dict)

        # Create resident profile details
        resident_dict = {
            "user_id": user.id,
            "flat_number": reg_data.flat_number,
            "building_wing": reg_data.building_wing,
            "contact_number": reg_data.contact_number,
            "alternate_contact": reg_data.alternate_contact,
            "is_verified": False  # Admin must verify residents for security
        }
        self.user_repo.create_resident(resident_dict)
        return user

    def register_admin(self, email: str, password: str, full_name: str) -> User:
        existing_user = self.user_repo.get_user_by_email(email)
        if existing_user:
            raise ValueError("Email already registered")

        role = self.user_repo.create_role_if_not_exists("Admin")

        hashed_password = self.get_password_hash(password)
        user_dict = {
            "email": email,
            "hashed_password": hashed_password,
            "full_name": full_name,
            "role_id": role.id,
            "is_active": True
        }
        return self.user_repo.create_user(user_dict)

    def login_user(self, email: str, password: str) -> Tuple[User, str, str]:
        user = self.user_repo.get_user_by_email(email)
        if not user:
            raise ValueError("Invalid email or password")
        
        if not user.is_active:
            raise ValueError("User account is deactivated")

        if not self.verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")

        # Create Access and Refresh Tokens
        access_token = self.create_access_token(data={"sub": user.email, "role": user.role.name, "user_id": user.id})
        
        refresh_expires = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_jwt = self.create_refresh_token_jwt(data={"sub": user.email, "user_id": user.id}, expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
        
        # Save Refresh Token in Database
        self.user_repo.create_refresh_token(user.id, refresh_token_jwt, refresh_expires)

        return user, access_token, refresh_token_jwt

    def refresh_access_token(self, refresh_token: str) -> Tuple[User, str]:
        # Decode and verify refresh token JWT signature
        payload = self.verify_token(refresh_token, settings.JWT_REFRESH_SECRET_KEY)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid or expired refresh token")

        # Check DB if token exists and not revoked
        db_token = self.user_repo.get_refresh_token(refresh_token)
        if not db_token:
            raise ValueError("Refresh token revoked or expired")

        user = self.user_repo.get_user_by_id(db_token.user_id)
        if not user or not user.is_active:
            raise ValueError("User associated with token is inactive or not found")

        # Generate new access token
        new_access_token = self.create_access_token(data={"sub": user.email, "role": user.role.name, "user_id": user.id})
        return user, new_access_token

    def logout_token(self, refresh_token: str) -> bool:
        return self.user_repo.revoke_refresh_token(refresh_token)

    # Password Reset flow
    def generate_password_reset_token(self, email: str) -> Optional[str]:
        user = self.user_repo.get_user_by_email(email)
        if not user:
            return None  # Return silently or raise error depending on design
        
        # Unique JWT Reset token with 15 mins expiry
        reset_token_jwt = self.create_access_token(data={"sub": user.email, "reset": True}, expires_delta=timedelta(minutes=15))
        expires_at = datetime.utcnow() + timedelta(minutes=15)
        
        self.user_repo.create_password_reset_token(user.id, reset_token_jwt, expires_at)
        return reset_token_jwt

    def reset_password(self, token: str, new_password: str) -> bool:
        db_token = self.user_repo.get_password_reset_token(token)
        if not db_token:
            raise ValueError("Invalid or expired reset token")

        # Verify JWT payload
        payload = self.verify_token(token, settings.JWT_SECRET_KEY)
        if not payload or not payload.get("reset"):
            raise ValueError("Invalid reset token signature")

        hashed_password = self.get_password_hash(new_password)
        success = self.user_repo.update_user_password(db_token.user_id, hashed_password)
        if success:
            self.user_repo.mark_password_reset_token_used(token)
            return True
        return False

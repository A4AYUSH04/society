from sqlalchemy.orm import Session
from app.models.models import User, Role, Resident, RefreshToken, PasswordResetToken
from typing import List, Optional
import datetime

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    # Role Operations
    def get_role_by_name(self, name: str) -> Optional[Role]:
        return self.db.query(Role).filter(Role.name == name).first()

    def get_role_by_id(self, role_id: int) -> Optional[Role]:
        return self.db.query(Role).filter(Role.id == role_id).first()

    def create_role_if_not_exists(self, name: str) -> Role:
        role = self.get_role_by_name(name)
        if not role:
            role = Role(name=name)
            self.db.add(role)
            self.db.commit()
            self.db.refresh(role)
        return role

    # User Operations
    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email.ilike(email)).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def create_user(self, user_data: dict) -> User:
        user = User(**user_data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        user = self.get_user_by_id(user_id)
        if user:
            user.hashed_password = hashed_password
            user.updated_at = datetime.datetime.utcnow()
            self.db.commit()
            return True
        return False

    def update_user_profile(self, user_id: int, full_name: str) -> Optional[User]:
        user = self.get_user_by_id(user_id)
        if user:
            user.full_name = full_name
            user.updated_at = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
            return user
        return None

    # Resident Operations
    def create_resident(self, resident_data: dict) -> Resident:
        resident = Resident(**resident_data)
        self.db.add(resident)
        self.db.commit()
        self.db.refresh(resident)
        return resident

    def get_resident_by_user_id(self, user_id: int) -> Optional[Resident]:
        return self.db.query(Resident).filter(Resident.user_id == user_id).first()

    def get_resident_by_id(self, resident_id: int) -> Optional[Resident]:
        return self.db.query(Resident).filter(Resident.id == resident_id).first()

    def get_all_residents(self) -> List[Resident]:
        return self.db.query(Resident).order_by(Resident.created_at.desc()).all()

    def update_resident(self, resident_id: int, data: dict) -> Optional[Resident]:
        resident = self.get_resident_by_id(resident_id)
        if resident:
            for key, value in data.items():
                if value is not None:
                    setattr(resident, key, value)
            resident.updated_at = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(resident)
            return resident
        return None

    def verify_resident(self, resident_id: int, is_verified: bool) -> Optional[Resident]:
        resident = self.get_resident_by_id(resident_id)
        if resident:
            resident.is_verified = is_verified
            resident.updated_at = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(resident)
            return resident
        return None

    # Refresh Token Operations
    def create_refresh_token(self, user_id: int, token: str, expires_at: datetime.datetime) -> RefreshToken:
        # Revoke existing tokens for this user first
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id, 
            RefreshToken.is_revoked == False
        ).update({"is_revoked": True})
        
        refresh_token = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
        self.db.add(refresh_token)
        self.db.commit()
        self.db.refresh(refresh_token)
        return refresh_token

    def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        return self.db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.datetime.utcnow()
        ).first()

    def revoke_refresh_token(self, token: str) -> bool:
        db_token = self.db.query(RefreshToken).filter(RefreshToken.token == token).first()
        if db_token:
            db_token.is_revoked = True
            self.db.commit()
            return True
        return False

    # Password Reset Token Operations
    def create_password_reset_token(self, user_id: int, token: str, expires_at: datetime.datetime) -> PasswordResetToken:
        reset_token = PasswordResetToken(user_id=user_id, token=token, expires_at=expires_at)
        self.db.add(reset_token)
        self.db.commit()
        self.db.refresh(reset_token)
        return reset_token

    def get_password_reset_token(self, token: str) -> Optional[PasswordResetToken]:
        return self.db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at > datetime.datetime.utcnow()
        ).first()

    def mark_password_reset_token_used(self, token: str) -> bool:
        db_token = self.db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
        if db_token:
            db_token.is_used = True
            self.db.commit()
            return True
        return False

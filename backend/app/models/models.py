import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from app.database.session import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)  # "Resident", "Admin"

    # Relationships
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    role = relationship("Role", back_populates="users")
    resident_profile = relationship("Resident", uselist=False, back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete")
    notices_authored = relationship("Notice", back_populates="author", cascade="all, delete-orphan")
    notice_reads = relationship("NoticeRead", back_populates="user", cascade="all, delete-orphan")
    history_actions = relationship("ComplaintHistory", back_populates="actor")


class Resident(Base):
    __tablename__ = "residents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    flat_number = Column(String(50), nullable=False)
    building_wing = Column(String(50), nullable=False)
    contact_number = Column(String(20), nullable=False)
    alternate_contact = Column(String(20), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="resident_profile")
    complaints = relationship("Complaint", back_populates="resident", cascade="all, delete-orphan")


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    complaints = relationship("Complaint", back_populates="category")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("complaint_categories.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(50), default="Open", nullable=False, index=True)  # Open, Assigned, In Progress, Waiting for Resident, Resolved, Closed, Rejected, Cancelled
    priority = Column(String(50), default="Medium", nullable=False, index=True)  # Low, Medium, High, Emergency
    resident_id = Column(Integer, ForeignKey("residents.id", ondelete="CASCADE"), nullable=False)
    location = Column(String(255), nullable=False)  # Building/Wing/Flat e.g. "Wing A, Flat 402"
    is_overdue = Column(Boolean, default=False, index=True)
    ai_suggestion = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    category = relationship("ComplaintCategory", back_populates="complaints")
    resident = relationship("Resident", back_populates="complaints")
    photos = relationship("ComplaintPhoto", back_populates="complaint", cascade="all, delete-orphan")
    histories = relationship("ComplaintHistory", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintHistory(Base):
    __tablename__ = "complaint_histories"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_role = Column(String(50), nullable=False)  # "Resident", "Admin"
    note = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)

    # Relationships
    complaint = relationship("Complaint", back_populates="histories")
    actor = relationship("User", back_populates="history_actions")


class ComplaintPhoto(Base):
    __tablename__ = "complaint_photos"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    content_type = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="photos")


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False, index=True)
    publish_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    is_scheduled = Column(Boolean, default=False, index=True)
    attachments_json = Column(JSON, nullable=True)  # List of dicts: [{"filename": "...", "url": "..."}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    author = relationship("User", back_populates="notices_authored")
    reads = relationship("NoticeRead", back_populates="notice", cascade="all, delete-orphan")


class NoticeRead(Base):
    __tablename__ = "notice_reads"

    id = Column(Integer, primary_key=True, index=True)
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    notice = relationship("Notice", back_populates="reads")
    user = relationship("User", back_populates="notice_reads")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    type = Column(String(50), default="system", nullable=False)  # "complaint", "notice", "system"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "LOGIN", "LOGOUT", "COMPLAINT_CREATION", etc.
    description = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(512), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(512), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    sent_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, SENT, FAILED
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

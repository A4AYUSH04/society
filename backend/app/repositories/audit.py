from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.models import AuditLog, EmailLog, User
from typing import List, Optional, Tuple
import datetime

class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_action(self, user_id: Optional[int], action: str, description: str, ip_address: Optional[str] = None) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            description=description,
            ip_address=ip_address
        )
        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)
        return log_entry

    def get_audit_logs(self, page: int = 1, page_size: int = 50) -> Tuple[List[AuditLog], int]:
        query = self.db.query(AuditLog).order_by(AuditLog.created_at.desc())
        total_items = query.count()
        offset = (page - 1) * page_size
        logs = query.offset(offset).limit(page_size).all()
        
        # Enforce joining email for listing efficiency
        for log in logs:
            if log.user_id:
                user = self.db.query(User).filter(User.id == log.user_id).first()
                if user:
                    log.user_email = user.email

        return logs, total_items

    # Email Logging
    def log_email(self, recipient_email: str, subject: str, body_html: str, sent_status: str, error_message: Optional[str] = None) -> EmailLog:
        email_log = EmailLog(
            recipient_email=recipient_email,
            subject=subject,
            body_html=body_html,
            sent_status=sent_status,
            error_message=error_message
        )
        self.db.add(email_log)
        self.db.commit()
        self.db.refresh(email_log)
        return email_log

    def get_email_logs(self, limit: int = 100) -> List[EmailLog]:
        return self.db.query(EmailLog).order_by(EmailLog.sent_at.desc()).limit(limit).all()

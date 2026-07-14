from sqlalchemy.orm import Session
from app.models.models import Notification
from typing import List, Optional
import datetime

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(self, user_id: int, title: str, message: str, notification_type: str = "system") -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_user_notifications(self, user_id: int) -> List[Notification]:
        return self.db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        notif = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notif:
            notif.is_read = True
            self.db.commit()
            return True
        return False

    def mark_all_as_read(self, user_id: int) -> int:
        count = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()
        return count

    def get_unread_count(self, user_id: int) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

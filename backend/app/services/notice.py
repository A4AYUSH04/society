from sqlalchemy.orm import Session
from app.models.models import Notice, User, Resident
from app.repositories.notice import NoticeRepository
from app.repositories.user import UserRepository
from app.repositories.notification import NotificationRepository
from app.services.email import EmailService
from typing import List, Optional
import datetime

class NoticeService:
    def __init__(self, db: Session):
        self.db = db
        self.notice_repo = NoticeRepository(db)
        self.user_repo = UserRepository(db)
        self.notification_repo = NotificationRepository(db)
        self.email_service = EmailService(db)

    def create_notice(self, author_id: int, title: str, content: str, is_pinned: bool = False, expiry_date: Optional[datetime.datetime] = None, publish_date: Optional[datetime.datetime] = None, is_scheduled: bool = False, attachments: Optional[list] = None) -> Notice:
        # Default publish date to now if not scheduled
        if not publish_date:
            publish_date = datetime.datetime.utcnow()
            
        notice_data = {
            "title": title,
            "content": content,
            "is_pinned": is_pinned,
            "publish_date": publish_date,
            "expiry_date": expiry_date,
            "is_scheduled": is_scheduled,
            "attachments_json": attachments,
            "author_id": author_id
        }
        
        notice = self.notice_repo.create_notice(notice_data)

        # Notify residents if the notice is active now (publish_date <= now)
        if publish_date <= datetime.datetime.utcnow():
            self._notify_residents_of_new_notice(notice)

        return notice

    def _notify_residents_of_new_notice(self, notice: Notice):
        # Find all residents
        residents = self.user_repo.get_all_residents()
        for res in residents:
            # Create in-app notification
            self.notification_repo.create_notification(
                user_id=res.user_id,
                title="New Society Announcement",
                message=f"Notice: '{notice.title}' has been posted.",
                notification_type="notice"
            )
            
            # Send Email (if resident user is active and verified)
            if res.is_verified and res.user.is_active:
                self.email_service.send_notice_posted_email(
                    recipient_email=res.user.email,
                    name=res.user.full_name,
                    title=notice.title,
                    summary=notice.content[:200],
                    notice_id=notice.id
                )

    def update_notice(self, notice_id: int, data: dict) -> Optional[Notice]:
        # If publish_date changed and is now active, or if notice is updated
        notice = self.notice_repo.update_notice(notice_id, data)
        return notice

    def delete_notice(self, notice_id: int) -> bool:
        return self.notice_repo.delete_notice(notice_id)

    def get_active_notices_for_user(self, user_id: int) -> List[Notice]:
        return self.notice_repo.get_active_notices(user_id=user_id)

    def get_all_notices_for_admin(self) -> List[Notice]:
        return self.notice_repo.get_all_notices()

    def mark_as_read(self, notice_id: int, user_id: int) -> bool:
        return self.notice_repo.mark_notice_as_read(notice_id, user_id)

    def get_unread_count(self, user_id: int) -> int:
        return self.notice_repo.get_unread_notices_count(user_id)
        
    def check_and_publish_scheduled_notices(self) -> int:
        """Triggered periodically to broadcast notices that reached their scheduled publish time."""
        now = datetime.datetime.utcnow()
        # Find notices marked as scheduled, not yet published to users, but publish_date <= now
        # We can identify these by is_scheduled=True and notice has not notified users yet.
        # For simplicity, we query notices where publish_date <= now, is_scheduled=True, and publish_date is within the past day
        scheduled_notices = self.db.query(Notice).filter(
            Notice.is_scheduled == True,
            Notice.publish_date <= now,
            Notice.publish_date >= now - datetime.timedelta(days=1)
        ).all()
        
        count = 0
        for notice in scheduled_notices:
            # We can toggle is_scheduled to False once published or just broadcast
            notice.is_scheduled = False
            self.db.commit()
            self._notify_residents_of_new_notice(notice)
            count += 1
            
        return count

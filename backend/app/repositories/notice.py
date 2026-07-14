from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from app.models.models import Notice, NoticeRead
from typing import List, Optional
import datetime

class NoticeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_notice_by_id(self, notice_id: int) -> Optional[Notice]:
        return self.db.query(Notice).options(joinedload(Notice.author)).filter(Notice.id == notice_id).first()

    def create_notice(self, notice_data: dict) -> Notice:
        notice = Notice(**notice_data)
        self.db.add(notice)
        self.db.commit()
        self.db.refresh(notice)
        return notice

    def update_notice(self, notice_id: int, data: dict) -> Optional[Notice]:
        notice = self.get_notice_by_id(notice_id)
        if notice:
            for key, value in data.items():
                if value is not None:
                    setattr(notice, key, value)
            notice.updated_at = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(notice)
            return notice
        return None

    def delete_notice(self, notice_id: int) -> bool:
        notice = self.db.query(Notice).filter(Notice.id == notice_id).first()
        if notice:
            self.db.delete(notice)
            self.db.commit()
            return True
        return False

    def get_active_notices(self, user_id: Optional[int] = None) -> List[Notice]:
        now = datetime.datetime.utcnow()
        # Active: publish_date <= now and (expiry_date is null or expiry_date > now)
        query = self.db.query(Notice).options(joinedload(Notice.author)).filter(
            Notice.publish_date <= now,
            or_(Notice.expiry_date.is_(None), Notice.expiry_date > now)
        )
        
        # Order by: pinned first (desc), then publish_date (desc)
        notices = query.order_by(Notice.is_pinned.desc(), Notice.publish_date.desc()).all()

        # If user_id is provided, check if read
        if user_id is not None:
            read_notice_ids = set(
                nid for (nid,) in self.db.query(NoticeRead.notice_id).filter(NoticeRead.user_id == user_id).all()
            )
            for n in notices:
                n.is_read = n.id in read_notice_ids
        
        return notices

    def get_all_notices(self) -> List[Notice]:
        return self.db.query(Notice).options(joinedload(Notice.author)).order_by(Notice.created_at.desc()).all()

    def mark_notice_as_read(self, notice_id: int, user_id: int) -> bool:
        # Check if already read
        existing = self.db.query(NoticeRead).filter(
            NoticeRead.notice_id == notice_id,
            NoticeRead.user_id == user_id
        ).first()
        
        if not existing:
            read_record = NoticeRead(notice_id=notice_id, user_id=user_id)
            self.db.add(read_record)
            self.db.commit()
            return True
        return False

    def get_unread_notices_count(self, user_id: int) -> int:
        now = datetime.datetime.utcnow()
        # Active notices
        active_notice_ids_query = self.db.query(Notice.id).filter(
            Notice.publish_date <= now,
            or_(Notice.expiry_date.is_(None), Notice.expiry_date > now)
        )
        
        # Read notices
        read_notice_ids_query = self.db.query(NoticeRead.notice_id).filter(NoticeRead.user_id == user_id)
        
        # Unread count
        unread_count = active_notice_ids_query.filter(~Notice.id.in_(read_notice_ids_query)).count()
        return unread_count

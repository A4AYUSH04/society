from apscheduler.schedulers.background import BackgroundScheduler
from app.database.session import SessionLocal
from app.repositories.complaint import ComplaintRepository
from app.services.notice import NoticeService
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def run_daily_checks():
    db = SessionLocal()
    try:
        logger.info("Executing background daily scheduled tasks...")
        
        # 1. Overdue detection
        comp_repo = ComplaintRepository(db)
        overdue_count = comp_repo.check_and_mark_overdue(settings.OVERDUE_THRESHOLD_DAYS)
        logger.info(f"Background check complete: marked {overdue_count} complaints as overdue.")
        
        # 2. Scheduled notice publishing
        notice_service = NoticeService(db)
        published_count = notice_service.check_and_publish_scheduled_notices()
        logger.info(f"Background check complete: published {published_count} scheduled notices.")
        
    except Exception as e:
        logger.error(f"Error running background daily checks: {str(e)}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        # Run daily checks
        scheduler.add_job(run_daily_checks, 'interval', days=1, id='daily_maintenance_job')
        
        # Also run checks immediately on startup for convenience
        scheduler.add_job(run_daily_checks, 'date', id='startup_check_job')
        
        scheduler.start()
        logger.info("Background scheduler started successfully.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler shut down.")

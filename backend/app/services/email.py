import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.repositories.audit import AuditRepository

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, db: Session):
        self.audit_repo = AuditRepository(db)

    def _get_base_template(self, content_html: str, action_url: str = None, action_text: str = None) -> str:
        """Helper to create a beautiful, standard layout for HTML emails."""
        action_button = ""
        if action_url and action_text:
            action_button = f'''
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="center" style="border-radius: 6px;" bgcolor="#4F46E5">
                                <a href="{action_url}" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; border: 1px solid #4F46E5; display: inline-block; font-weight: bold;">
                                    {action_text}
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            '''
        
        return f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Society Maintenance Tracker</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }}
                table {{ border-collapse: collapse; width: 100%; }}
                .wrapper {{ background-color: #F3F4F6; padding: 30px 15px; }}
                .content {{ background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); overflow: hidden; }}
                .header {{ background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: #ffffff; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }}
                .body {{ padding: 30px; color: #1F2937; line-height: 1.6; font-size: 16px; }}
                .footer {{ background-color: #F9FAFB; padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB; }}
                .status-badge {{ background-color: #E0E7FF; color: #3730A3; font-weight: bold; padding: 4px 8px; border-radius: 9999px; font-size: 14px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="content">
                    <div class="header">
                        <h1>Society Maintenance Tracker</h1>
                    </div>
                    <div class="body">
                        {content_html}
                        <table border="0" cellpadding="0" cellspacing="0">
                            {action_button}
                        </table>
                    </div>
                    <div class="footer">
                        <p>This is an automated email from your Apartment Society Maintenance Portal.</p>
                        <p>&copy; 2026 Society Maintenance Tracker. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        '''

    def send_email(self, recipient_email: str, subject: str, content_html: str, action_url: str = None, action_text: str = None) -> bool:
        full_html = self._get_base_template(content_html, action_url, action_text)
        
        # Check settings
        if not settings.SMTP_HOST or settings.SMTP_HOST in ["localhost", "127.0.0.1", ""]:
            # If no SMTP configured, we save email log as "MOCK_SENT" so it can be verified in tests/database.
            logger.info(f"[Mock Mailer] Sending email to {recipient_email} | Subject: {subject}")
            self.audit_repo.log_email(recipient_email, subject, full_html, "MOCK_SENT")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f'"{settings.SMTP_FROM_NAME}" <{settings.SMTP_FROM_EMAIL}>'
            msg["To"] = recipient_email
            
            part = MIMEText(full_html, "html")
            msg.attach(part)
            
            # Connect via SMTP
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            
            server.sendmail(settings.SMTP_FROM_EMAIL, recipient_email, msg.as_string())
            server.quit()
            
            # Log successful email delivery
            self.audit_repo.log_email(recipient_email, subject, full_html, "SENT")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            self.audit_repo.log_email(recipient_email, subject, full_html, "FAILED", error_message=str(e))
            return False

    def send_complaint_created_email(self, recipient_email: str, name: str, title: str, complaint_id: int) -> bool:
        content = f'''
        <p>Dear {name},</p>
        <p>Your maintenance complaint has been successfully registered. Our administration team is reviewing it and will assign it to a technician shortly.</p>
        <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #4F46E5;">
            <strong>Complaint ID:</strong> #{complaint_id}<br/>
            <strong>Title:</strong> {title}<br/>
            <strong>Status:</strong> <span class="status-badge">Open</span>
        </div>
        <p>You can track the live progress of your complaint using the link below.</p>
        '''
        action_url = f"http://localhost:5173/resident/complaints/{complaint_id}"
        return self.send_email(recipient_email, f"Complaint Registered: #{complaint_id}", content, action_url, "Track Complaint")

    def send_status_changed_email(self, recipient_email: str, name: str, complaint_id: int, title: str, old_status: str, new_status: str, note: str = None) -> bool:
        note_section = ""
        if note:
            note_section = f'<p><strong>Update Note:</strong> {note}</p>'
            
        content = f'''
        <p>Dear {name},</p>
        <p>The status of your maintenance complaint has been updated.</p>
        <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #7C3AED;">
            <strong>Complaint ID:</strong> #{complaint_id}<br/>
            <strong>Title:</strong> {title}<br/>
            <strong>Previous Status:</strong> {old_status}<br/>
            <strong>Current Status:</strong> <span class="status-badge">{new_status}</span>
        </div>
        {note_section}
        <p>Please check the resident portal for further details or to leave a message.</p>
        '''
        action_url = f"http://localhost:5173/resident/complaints/{complaint_id}"
        return self.send_email(recipient_email, f"Complaint Update: Status Changed to {new_status} | #{complaint_id}", content, action_url, "View Status History")

    def send_complaint_closed_email(self, recipient_email: str, name: str, complaint_id: int, title: str, note: str = None) -> bool:
        note_section = ""
        if note:
            note_section = f'<p><strong>Closing Note:</strong> {note}</p>'

        content = f'''
        <p>Dear {name},</p>
        <p>Your maintenance complaint has been marked as <strong>Closed</strong>. We hope the work was completed to your satisfaction.</p>
        <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10B981;">
            <strong>Complaint ID:</strong> #{complaint_id}<br/>
            <strong>Title:</strong> {title}<br/>
            <strong>Status:</strong> <span class="status-badge" style="background-color: #D1FAE5; color: #065F46;">Closed</span>
        </div>
        {note_section}
        <p>If you feel the issue was not resolved properly, you may contact the administrator to reopen it.</p>
        '''
        action_url = f"http://localhost:5173/resident/complaints/{complaint_id}"
        return self.send_email(recipient_email, f"Complaint Closed: #{complaint_id}", content, action_url, "View Details")

    def send_notice_posted_email(self, recipient_email: str, name: str, title: str, summary: str, notice_id: int) -> bool:
        content = f'''
        <p>Dear {name},</p>
        <p>An important notice has been posted on the society bulletin board by the Admin.</p>
        <div style="background-color: #FFFBEB; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #F59E0B; border: 1px solid #FEF3C7;">
            <h3 style="margin-top: 0; color: #92400E;">{title}</h3>
            <p>{summary[:200]}...</p>
        </div>
        <p>Please log in to the portal to view the full announcement.</p>
        '''
        action_url = f"http://localhost:5173/resident/notices"
        return self.send_email(recipient_email, f"Important Notice: {title}", content, action_url, "View Bulletin Board")

    def send_password_reset_email(self, recipient_email: str, name: str, token: str) -> bool:
        action_url = f"http://localhost:5173/reset-password?token={token}"
        content = f'''
        <p>Hello {name},</p>
        <p>We received a request to reset your password for your Society Maintenance Account.</p>
        <p>Click the button below to choose a new password. This reset link will expire in 15 minutes.</p>
        '''
        return self.send_email(recipient_email, "Password Reset Request", content, action_url, "Reset Password")

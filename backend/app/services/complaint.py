import os
import io
import csv
import datetime
import logging
from typing import List, Optional, Tuple, Dict, Any
from PIL import Image
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.models import Complaint, ComplaintCategory, ComplaintHistory, ComplaintPhoto, User, Resident
from app.repositories.complaint import ComplaintRepository
from app.repositories.user import UserRepository
from app.repositories.notification import NotificationRepository
from app.services.email import EmailService

# PDF Libraries
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

logger = logging.getLogger(__name__)

class ComplaintService:
    def __init__(self, db: Session):
        self.db = db
        self.complaint_repo = ComplaintRepository(db)
        self.user_repo = UserRepository(db)
        self.notification_repo = NotificationRepository(db)
        self.email_service = EmailService(db)

    # Category operations
    def get_all_categories(self, active_only: bool = False) -> List[ComplaintCategory]:
        return self.complaint_repo.get_all_categories(active_only)

    def create_category(self, name: str, description: Optional[str] = None) -> ComplaintCategory:
        existing = self.complaint_repo.get_category_by_name(name)
        if existing:
            raise ValueError("Category name already exists")
        return self.complaint_repo.create_category(name, description)

    def update_category(self, category_id: int, name: str, description: Optional[str], is_active: bool) -> Optional[ComplaintCategory]:
        return self.complaint_repo.update_category(category_id, name, description, is_active)

    # AI Recommendation Logic
    @staticmethod
    def get_ai_priority_recommendation(title: str, description: str) -> str:
        text = (title + " " + description).lower()
        emergency_keywords = ["fire", "spark", "shock", "gas leak", "blast", "stuck in lift", "elevator trap", "emergency", "theft", "robbery", "break-in"]
        high_keywords = ["water leakage", "flooding", "pipe burst", "no water", "power outage", "short circuit", "security alarm", "lift not working", "main gate blocked"]
        medium_keywords = ["plumbing", "drainage block", "garbage pile", "street light out", "internet down", "cleaning needed", "parking dispute", "broken lock"]

        for kw in emergency_keywords:
            if kw in text:
                return "Emergency"
        for kw in high_keywords:
            if kw in text:
                return "High"
        for kw in medium_keywords:
            if kw in text:
                return "Medium"
        return "Low"

    # Complaint operations
    def create_complaint(
        self,
        resident_user_id: int,
        title: str,
        description: str,
        category_id: int,
        location: str,
        priority: Optional[str] = None
    ) -> Complaint:
        resident = self.user_repo.get_resident_by_user_id(resident_user_id)
        if not resident:
            raise ValueError("Resident profile not found for this user")
        
        if not resident.is_verified:
            raise ValueError("Resident profile is not verified by admin. You cannot raise complaints yet.")

        category = self.complaint_repo.get_category_by_id(category_id)
        if not category or not category.is_active:
            raise ValueError("Invalid or inactive category selected")

        # Auto suggest AI recommendation
        ai_suggestion = self.get_ai_priority_recommendation(title, description)
        final_priority = priority if priority else ai_suggestion

        complaint_data = {
            "title": title,
            "description": description,
            "category_id": category_id,
            "location": location,
            "priority": final_priority,
            "resident_id": resident.id,
            "status": "Open",
            "is_overdue": False,
            "ai_suggestion": ai_suggestion
        }
        
        complaint = self.complaint_repo.create_complaint(complaint_data)
        
        # Log History
        self.complaint_repo.create_complaint_history({
            "complaint_id": complaint.id,
            "old_status": None,
            "new_status": "Open",
            "actor_id": resident_user_id,
            "actor_role": "Resident",
            "note": "Complaint created."
        })

        # Send Notifications
        self.notification_repo.create_notification(
            user_id=resident_user_id,
            title="Complaint Raised",
            message=f"Your complaint '{title}' (ID: #{complaint.id}) was successfully registered.",
            notification_type="complaint"
        )
        
        # Send Email notification async-friendly
        self.email_service.send_complaint_created_email(
            recipient_email=resident.user.email,
            name=resident.user.full_name,
            title=title,
            complaint_id=complaint.id
        )

        return complaint

    def update_complaint_status(
        self,
        complaint_id: int,
        new_status: str,
        actor_id: int,
        actor_role: str,
        note: Optional[str] = None
    ) -> Complaint:
        complaint = self.complaint_repo.get_complaint_by_id(complaint_id)
        if not complaint:
            raise ValueError("Complaint not found")

        old_status = complaint.status
        if old_status == new_status:
            return complaint

        # Verify role transitions constraints
        # 1. Workflow rules check: Open -> Assigned -> In Progress -> Resolved -> Closed
        allowed_statuses = ["Open", "Assigned", "In Progress", "Waiting for Resident", "Resolved", "Closed", "Rejected", "Cancelled"]
        if new_status not in allowed_statuses:
            raise ValueError(f"Invalid status: {new_status}")

        # Transition checks: Cannot jump directly to Closed.
        # It must go through Resolved. Exception: Cancelled / Rejected can happen before resolution.
        # But specifically: Resident/Admin cannot close a complaint unless it was Resolved (or they cancel it).
        if new_status == "Closed" and old_status != "Resolved":
            raise ValueError("Cannot close a complaint directly. It must first be marked as Resolved.")

        # Reopen check: Cannot reopen Closed complaint without admin permission
        if old_status == "Closed" and actor_role != "Admin":
            raise ValueError("Only an administrator can reopen a closed complaint.")

        # Perform update
        updated_data = {"status": new_status}
        # If complaint is reopened, reset overdue if needed, or update times
        if old_status == "Closed" and new_status in ["Open", "In Progress", "Assigned"]:
            updated_data["is_overdue"] = False

        self.complaint_repo.update_complaint(complaint_id, updated_data)

        # Log History
        self.complaint_repo.create_complaint_history({
            "complaint_id": complaint_id,
            "old_status": old_status,
            "new_status": new_status,
            "actor_id": actor_id,
            "actor_role": actor_role,
            "note": note or f"Status changed from {old_status} to {new_status}."
        })

        # Notify Resident
        resident_user = complaint.resident.user
        self.notification_repo.create_notification(
            user_id=resident_user.id,
            title="Complaint Status Updated",
            message=f"Your complaint '{complaint.title}' (ID: #{complaint.id}) status changed to '{new_status}'.",
            notification_type="complaint"
        )

        # Email Notification
        if new_status == "Closed":
            self.email_service.send_complaint_closed_email(
                recipient_email=resident_user.email,
                name=resident_user.full_name,
                complaint_id=complaint.id,
                title=complaint.title,
                note=note
            )
        else:
            self.email_service.send_status_changed_email(
                recipient_email=resident_user.email,
                name=resident_user.full_name,
                complaint_id=complaint.id,
                title=complaint.title,
                old_status=old_status,
                new_status=new_status,
                note=note
            )

        return complaint

    def update_complaint_priority(
        self,
        complaint_id: int,
        new_priority: str,
        actor_id: int,
        actor_role: str
    ) -> Complaint:
        complaint = self.complaint_repo.get_complaint_by_id(complaint_id)
        if not complaint:
            raise ValueError("Complaint not found")

        old_priority = complaint.priority
        if old_priority == new_priority:
            return complaint

        self.complaint_repo.update_complaint(complaint_id, {"priority": new_priority})

        # Log History
        self.complaint_repo.create_complaint_history({
            "complaint_id": complaint_id,
            "old_status": complaint.status,
            "new_status": complaint.status,
            "actor_id": actor_id,
            "actor_role": actor_role,
            "note": f"Priority updated from {old_priority} to {new_priority}."
        })

        return complaint

    # File uploads & Image compression
    def upload_photo(self, complaint_id: int, file_bytes: bytes, filename: str, content_type: str) -> ComplaintPhoto:
        # Validate file size (5MB max)
        file_size = len(file_bytes)
        if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise ValueError(f"File size exceeds maximum threshold of {settings.MAX_UPLOAD_SIZE_MB}MB")

        # Validate file extension
        ext = os.path.splitext(filename)[1].lower().replace(".", "")
        allowed_exts = ["png", "jpg", "jpeg", "webp"]
        if ext not in allowed_exts:
            raise ValueError(f"Format not supported. Supported extension formats: {', '.join(allowed_exts)}")

        # Prevent malicious uploads (checking image content)
        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verifies it's a valid image content
        except Exception:
            raise ValueError("Invalid image file contents.")

        # Reopen image for processing (since verify() closes it)
        image = Image.open(io.BytesIO(file_bytes))

        # Perform compression
        output_buffer = io.BytesIO()
        # Compress image: convert RGBA to RGB to save as JPEG/WebP safely if needed, or keep formats
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Save as WEBP/JPEG compressed
        image.save(output_buffer, format="JPEG", quality=75, optimize=True)
        compressed_bytes = output_buffer.getvalue()
        compressed_size = len(compressed_bytes)

        # Write to local file storage directory
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Unique file name
        unique_name = f"complaint_{complaint_id}_{int(datetime.datetime.utcnow().timestamp())}.jpg"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
        
        with open(file_path, "wb") as f:
            f.write(compressed_bytes)

        photo_data = {
            "complaint_id": complaint_id,
            "file_path": f"/uploads/{unique_name}",  # Serving prefix
            "original_filename": filename,
            "file_size": compressed_size,
            "content_type": "image/jpeg"
        }
        
        return self.complaint_repo.create_complaint_photo(photo_data)

    # Exporters
    def export_csv(self, filters: dict) -> str:
        # Search all complaints matching filters with unlimited size
        complaints, _ = self.complaint_repo.search_complaints(**filters, page=1, page_size=100000)
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow(["Complaint ID", "Title", "Category", "Status", "Priority", "Location", "Resident Name", "Building/Wing", "Flat", "Overdue", "Raised Date"])
        
        for c in complaints:
            writer.writerow([
                c.id,
                c.title,
                c.category.name,
                c.status,
                c.priority,
                c.location,
                c.resident.user.full_name,
                c.resident.building_wing,
                c.resident.flat_number,
                "Yes" if c.is_overdue else "No",
                c.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
            
        return output.getvalue()

    def export_excel(self, filters: dict) -> bytes:
        import openpyxl
        complaints, _ = self.complaint_repo.search_complaints(**filters, page=1, page_size=100000)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Complaints Report"

        # Headers
        headers = ["Complaint ID", "Title", "Category", "Status", "Priority", "Location", "Resident Name", "Building/Wing", "Flat", "Overdue", "Raised Date"]
        ws.append(headers)

        for c in complaints:
            ws.append([
                c.id,
                c.title,
                c.category.name,
                c.status,
                c.priority,
                c.location,
                c.resident.user.full_name,
                c.resident.building_wing,
                c.resident.flat_number,
                c.is_overdue,
                c.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])

        # Formatting header
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = openpyxl.styles.Font(bold=True)
            
        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_pdf_report(self, complaint_id: int) -> bytes:
        complaint = self.complaint_repo.get_complaint_by_id(complaint_id)
        if not complaint:
            raise ValueError("Complaint not found")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#4F46E5'),
            spaceAfter=15
        )
        
        section_style = ParagraphStyle(
            name='SectionStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1F2937'),
            spaceBefore=15,
            spaceAfter=10
        )
        
        normal_style = styles['Normal']

        story = []

        # Document Header
        story.append(Paragraph(f"Complaint Details Report - ID: #{complaint.id}", title_style))
        story.append(Spacer(1, 10))

        # Basic Info Table
        info_data = [
            [Paragraph("<b>Title:</b>", normal_style), Paragraph(complaint.title, normal_style),
             Paragraph("<b>Status:</b>", normal_style), Paragraph(complaint.status, normal_style)],
            [Paragraph("<b>Category:</b>", normal_style), Paragraph(complaint.category.name, normal_style),
             Paragraph("<b>Priority:</b>", normal_style), Paragraph(complaint.priority, normal_style)],
            [Paragraph("<b>Location:</b>", normal_style), Paragraph(complaint.location, normal_style),
             Paragraph("<b>Overdue:</b>", normal_style), Paragraph("Yes" if complaint.is_overdue else "No", normal_style)],
            [Paragraph("<b>Resident:</b>", normal_style), Paragraph(complaint.resident.user.full_name, normal_style),
             Paragraph("<b>Contact:</b>", normal_style), Paragraph(complaint.resident.contact_number, normal_style)],
            [Paragraph("<b>Created Date:</b>", normal_style), Paragraph(complaint.created_at.strftime("%Y-%m-%d %H:%M:%S"), normal_style),
             Paragraph("<b>Last Update:</b>", normal_style), Paragraph(complaint.updated_at.strftime("%Y-%m-%d %H:%M:%S"), normal_style)]
        ]
        
        info_table = Table(info_data, colWidths=[100, 160, 100, 160])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 15))

        # Description
        story.append(Paragraph("Description", section_style))
        story.append(Paragraph(complaint.description, normal_style))
        story.append(Spacer(1, 15))

        # Timeline/History
        story.append(Paragraph("Status Transition History", section_style))
        history_data = [["Timestamp", "Actor", "Role", "Transition", "Note"]]
        for h in complaint.histories:
            actor_name = h.actor.full_name if h.actor else "System"
            transition = f"{h.old_status or 'N/A'} -> {h.new_status}"
            history_data.append([
                h.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                actor_name,
                h.actor_role,
                transition,
                h.note or ""
            ])
            
        history_table = Table(history_data, colWidths=[110, 80, 70, 110, 150])
        history_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E5E7EB')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1F2937')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        story.append(history_table)

        doc.build(story)
        return buffer.getvalue()

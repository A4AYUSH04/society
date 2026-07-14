import os
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import logging

# Config & DB
from app.config.settings import settings
from app.database.session import engine, Base, get_db, SessionLocal

# Models
from app.models.models import Role, User, ComplaintCategory

# Services & Scheduler
from app.services.scheduler import start_scheduler, shutdown_scheduler
from app.services.auth import AuthService

# Routers
from app.routers import auth, complaint, notice, resident, admin, superadmin

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Scalable APIs for Society Maintenance tracking, notices, auditing, and complaints.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

# CORS Middlewares
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Static File serving for image uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers under versioning
app.include_router(auth.router, prefix="/api/v1")
app.include_router(complaint.router, prefix="/api/v1")
app.include_router(notice.router, prefix="/api/v1")
app.include_router(resident.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(superadmin.router, prefix="/api/v1")

# Seeding utility
def seed_database(db: Session):
    try:
        # 1. Seed Roles
        superadmin_role = db.query(Role).filter(Role.name == "Superadmin").first()
        if not superadmin_role:
            superadmin_role = Role(name="Superadmin")
            db.add(superadmin_role)

        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if not admin_role:
            admin_role = Role(name="Admin")
            db.add(admin_role)
            
        resident_role = db.query(Role).filter(Role.name == "Resident").first()
        if not resident_role:
            resident_role = Role(name="Resident")
            db.add(resident_role)
            
        db.commit()
        db.refresh(superadmin_role)
        db.refresh(admin_role)
        db.refresh(resident_role)

        # 2. Seed Default Categories
        categories = [
            "Electrical", "Water Leakage", "Plumbing", "Security", 
            "Lift", "Parking", "Cleaning", "Garbage", "Garden", 
            "Street Light", "Internet", "Other"
        ]
        for cat_name in categories:
            existing = db.query(ComplaintCategory).filter(ComplaintCategory.name == cat_name).first()
            if not existing:
                db.add(ComplaintCategory(name=cat_name, description=f"Maintenance for {cat_name} issues.", is_active=True))
        
        # 3. Seed Default Admin User
        admin_user = db.query(User).filter(User.email == "admin@societytracker.com").first()
        if not admin_user:
            hashed_pwd = AuthService.get_password_hash("admin123")
            db.add(User(
                email="admin@societytracker.com",
                hashed_password=hashed_pwd,
                role_id=admin_role.id,
                full_name="System Administrator",
                is_active=True
            ))
            logger.info("Seeded default admin account: admin@societytracker.com / admin123")

        # 4. Seed Default Super Admin User
        superadmin_user = db.query(User).filter(User.email == "superadmin@societytracker.com").first()
        if not superadmin_user:
            hashed_pwd = AuthService.get_password_hash("superadmin123")
            db.add(User(
                email="superadmin@societytracker.com",
                hashed_password=hashed_pwd,
                role_id=superadmin_role.id,
                full_name="System Super Administrator",
                is_active=True
            ))
            logger.info("Seeded default superadmin account: superadmin@societytracker.com / superadmin123")
            
        db.commit()
        logger.info("Database seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {str(e)}")
        db.rollback()

@app.on_event("startup")
def on_startup():
    logger.info("Starting up Society Maintenance Tracker backend...")
    # Create tables locally (fallback if migrations aren't executed)
    Base.metadata.create_all(bind=engine)
    
    # Run Seeds
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    # Start background scheduler
    start_scheduler()

@app.on_event("shutdown")
def on_shutdown():
    logger.info("Shutting down Society Maintenance Tracker backend...")
    shutdown_scheduler()

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Society Maintenance Tracker API",
        "version": "1.0.0",
        "docs": "/docs"
    }

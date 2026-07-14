# Society Maintenance Tracker

A production-ready SaaS application for housing societies to manage maintenance complaints, track workflow history transitions, broadcast notices, review security audits, and verify resident flat onboarding.

---

## Technical Stack

* **Frontend**: React, TypeScript, Tailwind CSS, React Router, React Query, Axios, React Hook Form, Zod.
* **Backend**: FastAPI, Python.
* **Database**: PostgreSQL (SQLAlchemy ORM, Alembic migrations).
* **Emails**: SMTP dispatcher with professional responsive HTML templates.
* **Background Jobs**: APScheduler running cron tasks.

---

## Directory Structure

```text
├── backend/                   # FastAPI backend directory
│   ├── alembic/               # Database migrations history
│   ├── app/
│   │   ├── config/            # Settings manager
│   │   ├── database/          # Database engine and dependency session
│   │   ├── models/            # SQLAlchemy database tables
│   │   ├── schemas/           # Pydantic schemas (validations)
│   │   ├── repositories/      # Repository abstractions
│   │   ├── services/          # Services layer (auth, email, pdf generation)
│   │   ├── middleware/        # Security dependencies
│   │   └── routers/           # Versioned API controllers
│   ├── tests/                 # Automated tests
│   ├── requirements.txt       # Python packaging requirements
│   ├── alembic.ini            # Alembic config settings
│   └── .env                   # Configuration file
└── frontend/                  # React Vite TS frontend directory
    ├── src/
    │   ├── components/        # Protected routes loader
    │   ├── layouts/           # Sidebar menu navigation panel
    │   ├── pages/             # Authentications, dashboard grid, list tables
    │   ├── services/          # Axios JWT refresh interceptors
    │   ├── store/             # Auth contexts
    │   └── types/             # TS Types
    ├── tailwind.config.js     # Design layout settings
    └── postcss.config.js      # PostCSS configuration
```

---

## Database Normalization Schema

1. **`roles`**: Defines system authorization roles (`Admin`, `Resident`).
2. **`users`**: Store credentials, full names, statuses.
3. **`residents`**: Profile metadata (wing, flat, contact, alternate, verification switcher).
4. **`complaint_categories`**: Dynamic list of categories.
5. **`complaints`**: Title, description, status (`Open`, `Assigned`, `In Progress`, `Resolved`, `Closed`, `Rejected`, `Cancelled`), priority, location.
6. **`complaint_histories`**: Immutable logs of complaint transitions.
7. **`complaint_photos`**: Reference image attachments metadata (size, formats).
8. **`notices`**: Bulletin announcements with scheduling and pinned status.
9. **`notice_reads`**: Track notices read by each user to show unread indicators.
10. **`notifications`**: User-specific live in-app notifications inbox.
11. **`audit_logs`**: System audit log tracker.
12. **`refresh_tokens` / `password_reset_tokens`**: Session tokens.

---

## Installation & Setup

### Prerequisites
* Python 3.10+
* Node.js 18+
* PostgreSQL (or fallback SQLite for local testing)

### 1. Backend Setup
1. Open terminal and navigate to `backend/` directory.
2. Create virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate virtual environment:
   * Windows: `.\venv\Scripts\activate`
   * Mac/Linux: `source venv/bin/activate`
4. Install packages:
   ```bash
   pip install -r requirements.txt
   ```
5. Configure `.env` file (copied from `.env.example`):
   ```ini
   DATABASE_URL=sqlite:///./society_maintenance.db
   ```
6. Run database migrations to head upgrade:
   ```bash
   alembic upgrade head
   ```
7. Start development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   * Open Swagger docs at: `http://localhost:8000/docs`
   * Standard Admin seeded account: **`admin@societytracker.com` / `admin123`**

### 2. Frontend Setup
1. Open terminal and navigate to `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` file (copied from `.env.example`):
   ```ini
   VITE_API_URL=http://localhost:8000/api/v1
   ```
4. Start Vite local server:
   ```bash
   npm run dev
   ```
   * Open browser at: `http://localhost:5173`

---

## Verification & Testing

### Running Backend API Tests
Run the test suite using pytest:
```bash
$env:PYTHONPATH="." ; .\venv\Scripts\pytest
```

---

## Deployment Guide

### Database (Neon PostgreSQL)
* Create a free serverless database on Neon.
* Copy the connection string and set `DATABASE_URL` in your production environment variables.

### Backend (Render/Railway)
* Create a new web service. Select python environment.
* Root directory: `backend/`
* Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
* Set required environment variables (JWT secrets, SMTP settings, `DATABASE_URL`).

### Frontend (Vercel)
* Deploy the `frontend/` project to Vercel.
* Set the environment variable: `VITE_API_URL` to point to your deployed backend URL.

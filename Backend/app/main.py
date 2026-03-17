from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import db

# =========================
# AUTH ROUTERS
# =========================
from app.routers.auth_admin import router as auth_admin_router
from app.routers.auth_manager import router as auth_manager_router
from app.routers.auth_user import router as auth_user_router

# =========================
# BUSINESS ROUTERS
# =========================
from app.routers.admin import router as admin_router
from app.routers.loan_manager import router as loan_manager_router
from app.routers.bank_manager import router as bank_manager_router
from app.routers.loan_application import router as loan_router
from app.routers.user import router as user_router
from app.routers.account import router as account_router
from app.routers.repayment import router as repayment_router
from app.routers.audit import router as audit_router
from app.routers.uploads import router as uploads_router
from app.routers.queries import router as queries_router
from app.routers.homepage_cibil import router as homepage_cibil_router

# ============================================
# APP INITIALIZATION
# ============================================

app = FastAPI(
    title="Loan Management System",
    description="""
## 🔐 Authentication & Authorization

This API uses **JWT-based authentication** with **Role-Based Access Control (RBAC)**.

### Login Endpoints
- Admin → `/auth/admin/login`
- Manager → `/auth/manager/login`
- User → `/auth/user/login`

### Using Swagger
1. Login
2. Copy `access_token`
3. Click **Authorize 🔐**
4. Paste `Bearer <token>`
""",
    version="1.0.0",
)

# ============================================
# DB INDEXES
# ============================================
@app.on_event("startup")
async def ensure_indexes():
    await db.loan_applications.create_index(
        "idempotency_key",
        unique=True,
        name="uniq_idempotency_key"
    )

    # Seed default credit rules if none exist (dev safety net).
    # The rule engine expects these to be present; without them preview/apply will fail.
    existing = await db.rule_configurations.count_documents({})
    if existing == 0:
        from datetime import datetime

        now = datetime.utcnow()
        await db.rule_configurations.insert_many([
            {
                "rule_type": "CIBIL_SCORE",
                "min_score": 750,
                "max_score": 900,
                "decision": "AUTO_APPROVED",
                "version": 1,
                "active": True,
                "created_at": now,
            },
            {
                "rule_type": "CIBIL_SCORE",
                "min_score": 550,
                "max_score": 749,
                "decision": "MANUAL_REVIEW",
                "version": 1,
                "active": True,
                "created_at": now,
            },
            {
                "rule_type": "CIBIL_SCORE",
                "min_score": 300,
                "max_score": 549,
                "decision": "AUTO_REJECTED",
                "version": 1,
                "active": True,
                "created_at": now,
            },
            {
                "rule_type": "INTEREST_RATE",
                "min_score": 750,
                "max_score": 900,
                "interest_rate": 8.5,
                "version": 1,
                "active": True,
                "created_at": now,
            },
            {
                "rule_type": "INTEREST_RATE",
                "min_score": 650,
                "max_score": 749,
                "interest_rate": 11.5,
                "version": 1,
                "active": True,
                "created_at": now,
            },
            {
                "rule_type": "INTEREST_RATE",
                "min_score": 300,
                "max_score": 649,
                "interest_rate": 14.0,
                "version": 1,
                "active": True,
                "created_at": now,
            },
        ])

    # Homepage lead capture anti-spam: unique phone/email per day
    await db.homepage_cibil_leads.create_index(
        [("phone", 1), ("day", 1)],
        unique=True,
        name="uniq_homepage_cibil_phone_day"
    )
    await db.homepage_cibil_leads.create_index(
        [("email", 1), ("day", 1)],
        unique=True,
        name="uniq_homepage_cibil_email_day"
    )

# ============================================
# CORS CONFIGURATION
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # allow dev frontend origins
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # additional localhost ports
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# ROOT HEALTH CHECK
# ============================================

@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Loan Management System API is running"
    }

# ============================================
# AUTH ROUTES
# ============================================

app.include_router(auth_admin_router, prefix="/auth/admin", tags=["Auth - Admin"])
app.include_router(auth_manager_router, prefix="/auth/manager", tags=["Auth - Manager"])
app.include_router(auth_user_router, prefix="/auth/user", tags=["Auth - User"])

# ============================================
# PROTECTED BUSINESS ROUTES
# ============================================

app.include_router(admin_router, tags=["Admin"])
app.include_router(loan_manager_router, tags=["Loan Manager"])
app.include_router(bank_manager_router, tags=["Bank Manager"])

app.include_router(audit_router, tags=["Audit Logs"])
# 🔥 USER LOAN ROUTES
app.include_router(loan_router, prefix="/loans", tags=["Loans"])

# USER PROFILE / DASHBOARD ROUTES
app.include_router(user_router, prefix="/users", tags=["User"])

# ACCOUNTS & REPAYMENTS
app.include_router(account_router,  tags=["Accounts"])
app.include_router(repayment_router,  tags=["Repayments"])
app.include_router(uploads_router, tags=["Uploads"])
app.include_router(queries_router, tags=["Queries"])
app.include_router(homepage_cibil_router, tags=["Public - CIBIL"])

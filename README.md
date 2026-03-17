# 🏦 Loan Management System (LMS) - Full Stack Application

> A comprehensive Loan Management System built with **FastAPI**, **React**, and **MongoDB** that provides role-based access control for Users, Managers, Admins, and Bank Managers.


## 🎯 Overview

The **Loan Management System (LMS)** is a full-stack web application that simplifies loan application processing, management, and repayment tracking. It provides a complete ecosystem for:

- **Individual Users** to apply for loans and manage repayments
- **Bank Managers** to verify user KYC and account details
- **Loan Managers** to evaluate and approve/reject loan applications
- **Admins** to manage users, monitor system activity, and configure rules

The system implements **JWT-based authentication** with **Role-Based Access Control (RBAC)**, ensuring secure and segregated access across all user roles.

---

## ✨ Features

### 🔐 Authentication & Security
- ✅ JWT token-based authentication with automatic token refresh
- ✅ Role-Based Access Control (RBAC) for 4 user types: User, Manager, Admin, Bank Manager
- ✅ Secure password hashing with bcrypt
- ✅ Token expiration and refresh mechanism
- ✅ Multi-endpoint login system for different roles

### 👤 User Management
- ✅ User registration and profile management
- ✅ KYC (Know Your Customer) verification workflow
- ✅ Account approval/rejection by Bank Manager
- ✅ User profile update and password management
- ✅ User deletion with audit trails

### 💰 Loan Management
- ✅ Loan application submission with dynamic forms
- ✅ Multi-stage loan approval workflow (submitted → approved/rejected)
- ✅ Loan decision tracking and history
- ✅ Interest rate calculation based on loan amount and tenure
- ✅ Loan status dashboard with real-time updates

### 📊 Loan Application Features
- ✅ Dynamic loan form with validation
- ✅ Document upload support
- ✅ Application status tracking (Submitted, Approved, Rejected, Disbursed)
- ✅ Application history and timeline
- ✅ Decision reason documentation

### 💳 Account & Transaction Management
- ✅ Account creation and activation
- ✅ Deposit and withdrawal operations
- ✅ Real-time transaction history
- ✅ Account balance tracking
- ✅ Transaction audit logs

### 💸 Repayment Management
- ✅ EMI (Equated Monthly Installment) calculation
- ✅ Repayment schedule generation
- ✅ Payment processing and tracking
- ✅ Overdue payment alerts
- ✅ Repayment history and reporting
- ✅ Automatic No Objection Certificate (NOC) generation upon loan closure
- ✅ NOC download available after full repayment verification
- ✅ Secure loan closure validation before certificate issuance

### 📄 Loan Closure & NOC System
- ✅ Automatic loan closure after complete repayment
- ✅ Digital No Objection Certificate (NOC) generation
- ✅ NOC download for fully repaid loans
- ✅ Audit logging for certificate issuance
- ✅ Secure validation before loan closure

### 📈 Admin & Management Dashboard
- ✅ System-wide analytics and reporting
- ✅ User and loan statistics
- ✅ Audit log tracking for compliance
- ✅ Rule configuration for credit decisions
- ✅ Application escalation and review
- ✅ Financial reporting and dashboards

### 🎨 User Interface Features
- ✅ Responsive design with Tailwind CSS
- ✅ Interactive loading spinners and progress bars
- ✅ Real-time form validation
- ✅ Toast notifications for user feedback
- ✅ Global loader context for seamless UX
- ✅ Dark mode support ready
- ✅ Mobile-friendly interface
- ✅ Improved dashboard UI spacing and typography
- ✅ Enhanced status badges and pill indicators
- ✅ Professional banking-style table refinements
- ✅ Improved button styling and hover effects
- ✅ Minor UX polish for smoother interactions

### 📱 Real-time Updates
- ✅ Automatic data refresh on user actions
- ✅ Global loader state management
- ✅ Axios interceptors for request/response handling
- ✅ Error handling with user-friendly messages
- ✅ Loading indicators for async operations

---

## 🛠️ Tech Stack

### **Backend**
| Technology | Purpose | Version |
|-----------|---------|---------|
| **FastAPI** | Modern web framework for APIs | 0.110.0 |
| **Python** | Backend programming language | 3.9+ |
| **MongoDB** | NoSQL database | Latest |
| **Motor** | Async MongoDB driver | 3.3.2 |
| **Pydantic** | Data validation & settings | 2.6.1 |
| **PyJWT** | JWT token generation/validation | 3.3.0 |
| **Bcrypt** | Password hashing | 4.1.2 |
| **Uvicorn** | ASGI application server | 0.27.1 |
| **Pytest** | Testing framework | 8.0.0 |

### **Frontend**
| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI framework | 19.2.0 |
| **TypeScript** | Type-safe JavaScript | 5.9.3 |
| **Vite** | Build tool & dev server | 7.3.1 |
| **Tailwind CSS** | Utility-first CSS framework | 3.4.19 |
| **React Router** | Client-side routing | 7.13.0 |
| **Axios** | HTTP client | 1.13.5 |
| **Lucide React** | Icon library | 0.563.0 |

### **Database**
- **MongoDB** - NoSQL database for flexible schema
- **Collections**: Users, Loans, Accounts, Transactions, Applications, Repayments, Audit Logs, Rules



## 📁 Project Structure

```
PYTHON_LMS_3_repo/
├── 📄 README.md                    # Project documentation
├── 📄 Contributer.md
├── 📄 finance.md 
├── 📄 .gitignore                   # Git ignore rules
│
├── Backend/                         # FastAPI Backend
│   ├── requirements.txt             # Python dependencies
│   ├── pytest.ini                   # Pytest configuration
│   │
│   └── app/
│       ├── main.py                  # FastAPI app initialization
│       ├── auth/                    # Authentication module
│       │   ├── dependencies.py
│       │   ├── password.py
│       │   └── security.py
│       ├── core/                    # Configuration
│       │   └── config.py
│       ├── db/                      # Database
│       │   └── mongodb.py
│       ├── domain/                  # Domain models
│       │   ├── applicant.py
│       │   ├── income.py
│       │   └── kyc.py
│       ├── enums/                   # Enum definitions
│       │   ├── loan.py
│       │   ├── role.py
│       │   └── user.py
│       ├── models/                  # Database models
│       │   ├── user.py
│       │   ├── loan.py
│       │   ├── account.py
│       │   ├── transaction.py
│       │   ├── loan_application.py
│       │   ├── audit_log.py
│       │   └── repayment.py
│       ├── repositories/            # Data access layer
│       │   ├── user_repository.py
│       │   ├── loan_repository.py
│       │   ├── account_repository.py
│       │   ├── transaction_repository.py
│       │   ├── loan_application_repository.py
│       │   ├── repayment_repository.py
│       │   ├── admin_repository.py
│       │   ├── manager_repository.py
│       │   ├── audit_log_repository.py
│       │   └── rule_configuration_repository.py
│       ├── routers/                 # API endpoints
│       │   ├── auth_admin.py
│       │   ├── auth_manager.py
│       │   ├── auth_user.py
│       │   ├── admin.py
│       │   ├── bank_manager.py
│       │   ├── loan_manager.py
│       │   ├── user.py
│       │   ├── loan_application.py
│       │   ├── account.py
│       │   ├── transaction.py
│       │   ├── repayment.py
│       │   ├── audit.py
│       │   ├── uploads.py
│       │   └── queries.py
│       ├── schemas/                 # Request/Response schemas
│       │   ├── auth_user.py
│       │   ├── admin_schema.py
│       │   ├── bank_manager_schema.py
│       │   ├── loan_application.py
│       │   ├── loan_decision.py
│       │   ├── user_decision.py
│       │   ├── user_kyc.py
│       │   ├── user_pin.py
│       │   ├── audit_logs.py
│       │   └── user_delete.py
│       ├── services/                # Business logic
│       │   ├── user_service.py
│       │   ├── loan_service.py
│       │   ├── account_service.py
│       │   ├── transaction_service.py
│       │   ├── repayment_service.py
│       │   ├── loan_application_service.py
│       │   ├── admin_service.py
│       │   ├── admin_auth_service.py
│       │   ├── bank_manager_service.py
│       │   ├── loan_manager_service.py
│       │   ├── manager_auth_service.py
│       │   ├── audit_service.py
│       │   └── credit_rule_service.py
│       ├── utils/                   # Utility functions
│       └── tests/                   # Unit tests
│           ├── schemas/
│           └── services/
│
├── frontend/                        # React + TypeScript Frontend
│   ├── package.json                 # Node.js dependencies
│   ├── tsconfig.json                # TypeScript configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── vite.config.ts               # Vite build configuration
│   ├── index.html                   # HTML entry point
│   │
│   └── src/
│       ├── main.tsx                 # React entry point
│       ├── App.tsx                  # Main App component
│       ├── App.css                  # Global styles
│       ├── index.css                # Global CSS
│       │
│       ├── assets/                  # Images and static assets
│       │
│       ├── components/
│       │   ├── common/              # Reusable components
│       │   │   ├── Navbar.tsx
│       │   │   ├── DashboardFooter.tsx
│       │   │   └── ErrorBoundary.tsx
│       │   ├── loaders/             # Loading components
│       │   │   ├── ButtonLoader.tsx
│       │   │   ├── GlobalTopLoader.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   └── SkeletonCard.tsx
│       │   ├── user/                # User components
│       │   ├── Homepage/            # Homepage components
│       │   └── [Other feature components]
│       │
│       ├── context/                 # Context providers
│       │   └── ToastContext.tsx
│       ├── stores/                  # State management
│       │   └── globalLoaderStore.tsx
│       ├── hooks/                   # Custom React hooks
│       ├── layouts/                 # Layout components
│       │
│       ├── pages/
│       │   ├── auth/                # Login pages
│       │   │   ├── AdminLogin.tsx
│       │   │   ├── ManagerLogin.tsx
│       │   │   └── UserLogin.tsx
│       │   ├── user/                # User pages
│       │   │   ├── UserDashboard.tsx
│       │   │   ├── UserProfile.tsx
│       │   │   └── UserLoanPage.tsx
│       │   ├── HomePage.tsx
│       │   └── [Other pages]
│       │
│       ├── routes/                  # Route protection
│       │   └── ProtectedRoute.tsx
│       │
│       ├── services/                # API services
│       │   ├── api.client.ts
│       │   ├── globalLoaderInterceptor.ts
│       │   ├── user.service.ts
│       │   ├── loan.service.ts
│       │   └── [Other services]
│       │
│       ├── types/                   # TypeScript types
│       │   ├── user.ts
│       │   ├── loan.ts
│       │   └── [Other types]
│       │
│       ├── utils/                   # Utility functions
│       │   └── helpers.ts
│       │
│       └── tests/                   # Test files
```

---
## Screenshots
### HomePage
<img width="800" height="426" alt="image" src="https://github.com/user-attachments/assets/8349c6bf-8b47-4817-88b6-94f7dfc45e1b" />

### Login
<img width="721" height="781" alt="image" src="https://github.com/user-attachments/assets/be0c3186-ad1a-4467-b709-1532f57e0711" />

### User Registration
<img width="730" height="991" alt="image" src="https://github.com/user-attachments/assets/9f235d9b-b856-40ef-9c90-43c1c3904170" />

### User Dashboard
<img width="1890" height="1006" alt="image" src="https://github.com/user-attachments/assets/464c3e01-831d-4be9-9964-80ed4d83a01e" />

### Bank Manager Dashboard
<img width="800" height="425" alt="image" src="https://github.com/user-attachments/assets/00ae0090-0365-4422-8111-b229788a9d68" />

### Loan Manager Dashboard
<img width="800" height="426" alt="image" src="https://github.com/user-attachments/assets/7f3d81c4-76b1-4f33-9a59-50eaa6a7d514" />

### Bank Admin Dashboard
<img width="800" height="421" alt="image" src="https://github.com/user-attachments/assets/cfeac8a6-5e09-49e2-99d6-ab86b3f36c5f" />


## 🚀 Installation

### Prerequisites
- **Python 3.9+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **MongoDB** - Database (Local or Atlas)
- **Git** - Version control
- **npm** or **yarn** - Package manager

### Clone the Repository

```bash
git clone https://github.com/Ft-Trumio/PYTHON_LMS_3_repo.git
cd PYTHON_LMS_3_repo
```

---

## ⚙️ Setup Instructions

### Backend Setup

#### 1. Navigate to Backend Directory
```bash
cd Backend
```

#### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Create `.env` File
Create a `.env` file in the `Backend/` directory:

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Configuration
HOST=127.0.0.1
PORT=8080

# Environment
ENVIRONMENT=development
```

### Frontend Setup

#### 1. Navigate to Frontend Directory
```bash
cd frontend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Create `.env` File (if needed)
```env
VITE_API_URL=http://localhost:8080
```

---

## 🏃 Running the Application

### Start Backend Server

```bash
cd Backend
python -m uvicorn app.main:app --reload --port 8080
```

Backend will be available at: `http://localhost:8080`
API Documentation (Swagger): `http://localhost:8080/docs`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## 📚 API Documentation

### Swagger UI
Access interactive API documentation at: **`http://localhost:8080/docs`**

### Main API Endpoints

#### Authentication
```
POST   /auth/user/login       - User login
POST   /auth/manager/login    - Manager login
POST   /auth/admin/login      - Admin login
POST   /auth/refresh          - Refresh token
```

#### User Management
```
GET    /users/profile         - Get user profile
PUT    /users/profile         - Update profile
POST   /users/register        - Register new user
DELETE /users/{user_id}       - Delete user
```

#### Loan Management
```
GET    /loans                 - Get all loans
POST   /loans                 - Create new loan
GET    /loans/{loan_id}       - Get loan details
PUT    /loans/{loan_id}       - Update loan
DELETE /loans/{loan_id}       - Delete loan
```

#### Loan Applications
```
GET    /applications          - Get applications
POST   /applications          - Submit application
GET    /applications/{id}     - Get application
PUT    /applications/{id}     - Update application
```

#### Account Management
```
GET    /accounts              - Get accounts
POST   /accounts              - Create account
GET    /accounts/{account_id} - Get account
```

#### Transactions
```
GET    /transactions          - Get transactions
POST   /transactions          - Create transaction
GET    /transactions/{id}     - Get transaction
```

#### Repayments
```
GET    /repayments            - Get repayments
POST   /repayments            - Create repayment
GET    /repayments/{id}       - Get repayment
```

#### Admin Operations
```
GET    /admin/users           - List all users
GET    /admin/loans           - List all loans
GET    /admin/analytics       - Get analytics
POST   /admin/rules           - Configure rules
```

#### Audit Logs
```
GET    /audit/logs            - Get audit logs
GET    /audit/logs/{id}       - Get log details
```

---

### Role-Based Access Control (RBAC)

| Role | Access | Permissions |
|------|--------|-------------|
| **USER** | /user/* | Apply for loans, manage account, view transactions |
| **MANAGER** | /manager/* | Review applications, make decisions, escalate |
| **ADMIN** | /admin/* | Manage users, system settings, rules |
| **BANK_MANAGER** | /bank-manager/* | Verify KYC, approve accounts |

---

## 🎯 Key Components

### Backend Components

#### Services
- **UserService** - User registration, profile management
- **LoanService** - Loan creation and management
- **LoanApplicationService** - Application processing workflow
- **AccountService** - Account operations
- **RepaymentService** - Repayment scheduling and tracking
- **AdminService** - System management
- **AuditService** - Activity logging

#### Repositories
- Data access layer for all models
- CRUD operations with MongoDB
- Query building and filtering
- Pagination support

#### Authentication
- **SecurityManager** - JWT token generation and validation
- **PasswordManager** - Secure password hashing and verification
- **AuthDependencies** - Dependency injection for auth

### Frontend Components

#### Pages
- **HomePage** - Landing page with loan process flow
- **LoginPages** - Role-specific login (User, Manager, Admin)
- **UserDashboard** - User account and transaction overview
- **LoanApplicationPage** - Loan application form
- **AdminDashboard** - Admin management interface

#### Components
- **Loaders** - Button spinner, progress bar, skeleton loaders
- **Navbar** - Navigation with user menu
- **Forms** - Reusable form components with validation
- **Tables** - Data tables with sorting and filtering

#### Context & State Management
- **GlobalLoaderContext** - Global loading state
- **ToastContext** - Notification system
- **AuthContext** - Authentication state (if implemented)

---

## 🧪 Testing

### Backend Tests
```bash
cd Backend
pytest
```

Run specific test file:
```bash
pytest tests/services/test_user_service.py -v
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---


### Frontend (.env)
```env
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Loan Management System
```

---


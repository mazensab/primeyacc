<!-- ============================================================
📂 README.md
🧠 PrimeyAcc | Project README Phase 0
------------------------------------------------------------
✅ Project Overview
✅ Local Development Environment
✅ Backend Foundation Status
✅ Multi-company Isolation Rule
✅ Auth / Session APIs
✅ Phase 0 Completion Summary
✅ Next Phase Direction
------------------------------------------------------------
القاعدة المعتمدة:
- PrimeyAcc = منصة SaaS لإدارة الأعمال متعددة الشركات
- /system مخصص لمالك المنصة وإدارة الشركات والاشتراكات
- /company مخصص للشركات المشتركة وبياناتها التشغيلية
- Company = حدود العزل الأساسية للنظام
- الباكند هو مصدر الحقيقة للعزل والصلاحيات
============================================================ -->

# PrimeyAcc

PrimeyAcc is a SaaS business management platform designed for multi-company operations.

The system is being built with the same approved Primey Care architecture spirit:

* API-first backend
* Strong multi-company isolation
* `/system` workspace for platform owner operations
* `/company` workspace for subscribed companies
* Session Auth + CSRF
* Saudi business requirements
* Arabic / English support
* RTL / LTR ready
* Premium white UI direction for the frontend

---

## Local Development Environment

Current local environment:

```txt
Python: 3.12.10
Django: 6.0.6
Node: v24.15.0
npm: 11.12.1
Git branch: main
Database in Phase 0: SQLite
Future database target: MariaDB / MySQL
```

---

## Backend Stack

Core backend stack:

```txt
Django
Django REST Framework
django-cors-headers
python-dotenv
mysqlclient
Pillow
```

Authentication approach:

```txt
Django Session Authentication
CSRF Protection
Cookie-based browser session
```

---

## Project Structure

Current backend foundation:

```txt
primeyacc/
├── accounts/
├── api/
│   ├── auth/
│   ├── company/
│   └── system/
├── audit_logs/
├── billing/
├── companies/
├── config/
├── core/
├── permissions/
├── settings_center/
├── subscriptions/
├── manage.py
├── requirements.txt
└── README.md
```

---

## Workspace Separation

PrimeyAcc has two main workspaces.

### `/system`

Used by the platform owner.

Examples:

```txt
Companies
Subscriptions
Plans
Billing
Platform payments
System settings
Support
```

### `/company`

Used by subscribed companies.

Examples:

```txt
Products
Customers
Suppliers
Sales
Purchases
Inventory
Accounting
Treasury
POS
HR
Reports
WhatsApp
Payment methods
```

---

## Multi-company Isolation Rule

This is the most important architectural rule in PrimeyAcc.

Every operational module must be scoped by company.

Examples:

```txt
Products
Customers
Suppliers
Invoices
Inventory
Warehouses
Branches
Users
Permissions
Accounting entries
Treasury
Banks
Payment methods
POS
HR
Attendance
Reports
Templates
Settings
WhatsApp
Integrations
```

No company must ever see or access another company's data.

The backend is the source of truth for:

```txt
Company isolation
Workspace access
Permissions
Authenticated session state
```

---

## Phase 0 Completed Work

Phase 0 is the backend foundation stage.

Completed:

```txt
✅ Django project initialized
✅ Virtual environment created
✅ Core dependencies installed
✅ requirements.txt generated
✅ settings.py configured
✅ .env created
✅ REST Framework configured
✅ CORS configured
✅ Saudi timezone configured
✅ Initial migrations applied
✅ Superuser created
✅ Django Admin verified
✅ /api/health/ created and tested
✅ api/system/ route group created
✅ api/company/ route group created
✅ api/auth/ route group created
✅ Company tenant model created
✅ Saudi National Address fields added
✅ Company Admin created
✅ Test company TEST-001 created
✅ UserProfile model created
✅ CompanyMembership model created
✅ Admin user linked to TEST-001
✅ can_access_system tested
✅ can_access_company tested
✅ /api/auth/whoami/ created and tested
✅ /api/auth/csrf/ created and tested
✅ /api/auth/login/ created and tested
✅ /api/auth/logout/ created and tested
✅ GitHub commits pushed successfully
```

---

## Company Model Foundation

The `Company` model is the main tenant boundary.

It currently supports:

```txt
Company name
Arabic name
English name
Company code
Activity profile
Status
Active flag
Commercial registration
Tax number
Email
Phone
Mobile
WhatsApp number
Saudi National Address
Logo
Currency code
VAT percentage
Trial status
Suspension status
Owner
Created by
Updated by
Settings
Extra data
Notes
Created at
Updated at
```

Saudi National Address fields:

```txt
Building number
Street name
District
City
Region
Postal code
Short address
Additional address
```

---

## Accounts Foundation

The account foundation separates login accounts from company access.

### User

Django's default user remains the login identity.

### UserProfile

Stores global user profile and workspace access information.

Supports:

```txt
Display name
Contact information
Default workspace
System role
Default company
System access flag
Language
Timezone
Status
```

### CompanyMembership

Controls access to company data.

Supports:

```txt
User
Company
Role
Status
Primary membership
Job title
Department
Audit fields
```

Main rule:

```txt
No /company access without an active CompanyMembership.
```

---

## Auth APIs

Current auth endpoints:

```txt
GET  /api/auth/csrf/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/whoami/
```

### `/api/auth/csrf/`

Sets CSRF cookie and returns token.

### `/api/auth/login/`

Creates a Django session using username/email and password.

### `/api/auth/logout/`

Ends the Django session.

### `/api/auth/whoami/`

Returns the current authenticated user snapshot.

It includes:

```txt
authenticated
user
profile
can_access_system
can_access_company
default_company
memberships
```

---

## Health API

Current health endpoint:

```txt
GET /api/health/
```

Expected response:

```json
{
  "status": "ok",
  "project": "primeyacc",
  "service": "api",
  "timestamp": "..."
}
```

---

## Local Commands

Activate virtual environment:

```powershell
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\venv\Scripts\Activate.ps1)
```

Run Django checks:

```powershell
python manage.py check
```

Run migrations:

```powershell
python manage.py migrate
```

Run development server:

```powershell
python manage.py runserver
```

Create migrations for an app:

```powershell
python manage.py makemigrations app_name
```

Open Django Admin:

```txt
http://127.0.0.1:8000/admin/
```

Health check:

```txt
http://127.0.0.1:8000/api/health/
```

Whoami:

```txt
http://127.0.0.1:8000/api/auth/whoami/
```

---

## Git Rules

Before every commit:

```powershell
python manage.py check
git status
```

Commit only the intended files.

After commit and push:

```powershell
git status
```

Expected clean state:

```txt
nothing to commit, working tree clean
```

---

## File Header Rule

Every file built or modified must start with a large header comment similar to:

```python
# ============================================================
# 📂 path/to/file.py
# 🧠 PrimeyAcc | File Purpose Version
# ------------------------------------------------------------
# ✅ Key capability 1
# ✅ Key capability 2
# ✅ Key capability 3
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Important architectural rule 1
# - Important architectural rule 2
# ============================================================
```

For non-Python files, use the equivalent comment style supported by that file type.

---

## Current Phase Status

```txt
Phase 0: Backend Foundation
Status: Ready for final review / closure
```

---

## Next Phase

Recommended next phase:

```txt
Phase 1: System Companies & Subscription Foundation APIs
```

Expected Phase 1 focus:

```txt
System companies APIs
Company list/detail/create/update
Subscription plans foundation
Company subscription foundation
Billing foundation
System owner operational APIs
```

The frontend should start later after the core backend APIs are stable.

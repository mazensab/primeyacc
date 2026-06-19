# ============================================================
# ظ‹ع؛â€œâ€ڑ config/settings.py
# ظ‹ع؛آ§آ  PrimeyAcc | Django Project Settings V1.5
# ------------------------------------------------------------
# أ¢إ“â€¦ Django REST Framework configuration
# أ¢إ“â€¦ CORS / CSRF configuration for Next.js frontend
# أ¢إ“â€¦ dotenv environment loading
# أ¢إ“â€¦ SQLite development database with MySQL readiness
# أ¢إ“â€¦ PrimeyAcc core apps registration
# أ¢إ“â€¦ Phase 4 parties app registration
# أ¢إ“â€¦ Phase 5 catalog app registration
# أ¢إ“â€¦ Phase 6 sales app registration
# أ¢إ“â€¦ Phase 7 purchases app registration
# أ¢إ“â€¦ Phase 8 inventory app registration
# أ¢إ“â€¦ Phase 9 accounting app registration
# أ¢إ“â€¦ Phase 11 treasury app registration
# أ¢إ“â€¦ Phase 12 company payments app registration
# أ¢إ“â€¦ Saudi Arabia timezone and Arabic language defaults
# ------------------------------------------------------------
# ط·آ§ط¸â€‍ط¸â€ڑط·آ§ط·آ¹ط·آ¯ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ط·آ©:
# - ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط¸ظ¹ط·آ¬ط¸â€،ط·آ² ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ´ط·آ±ط¸ث†ط·آ¹ ط·آ§ط¸â€‍ط·آ¹ط·آ§ط¸â€¦ط·آ© ط¸ظ¾ط¸â€ڑط·آ·
# - ط¸â€‍ط·آ§ ط¸â€ ط·آ¶ط·آ¹ ط¸â€¦ط¸â€ ط·آ·ط¸â€ڑ business ط·آ¯ط·آ§ط·آ®ط¸â€‍ settings.py
# - ط¸ئ’ط¸â€‍ ط·ع¾ط·آ·ط·آ¨ط¸ظ¹ط¸â€ڑ PrimeyAcc ط¸ظ¹ط·آ¶ط·آ§ط¸ظ¾ ط·آ¯ط·آ§ط·آ®ط¸â€‍ PRIMEYACC_APPS
# - /company ط¸ظ¹ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ ط·آ¹ط¸â€‍ط¸â€° CompanyMembership ط¸ث†ط¸â€‍ط¸ظ¹ط·آ³ company_id ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط¸ظ¾ط·آ±ط¸ث†ط¸â€ ط·ع¾
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 4 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ parties ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍ط·آ§ط·طŒ ط¸ث†ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط·آ±ط·آ¯ط¸ظ¹ط¸â€  ط¸ث†ط·آ§ط¸â€‍ط·آ£ط·آ·ط·آ±ط·آ§ط¸ظ¾ ط·آ§ط¸â€‍ط·ع¾ط·آ¬ط·آ§ط·آ±ط¸ظ¹ط·آ©
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 5 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ catalog ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط¸â€¦ط¸â€ ط·ع¾ط·آ¬ط·آ§ط·ع¾ ط¸ث†ط·آ§ط¸â€‍ط·آ®ط·آ¯ط¸â€¦ط·آ§ط·ع¾ ط¸ث†ط·آ§ط¸â€‍ط·ع¾ط·آµط¸â€ ط¸ظ¹ط¸ظ¾ط·آ§ط·ع¾ ط¸ث†ط·آ§ط¸â€‍ط¸ث†ط·آ­ط·آ¯ط·آ§ط·ع¾
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 6 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ sales ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط¸â€¦ط·آ¨ط¸ظ¹ط·آ¹ط·آ§ط·ع¾ ط¸ث†ط·آ§ط¸â€‍ط¸ظ¾ط¸ث†ط·آ§ط·ع¾ط¸ظ¹ط·آ± ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 7 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ purchases ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط¸â€¦ط·آ´ط·ع¾ط·آ±ط¸ظ¹ط·آ§ط·ع¾ ط¸ث†ط¸ظ¾ط¸ث†ط·آ§ط·ع¾ط¸ظ¹ط·آ± ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط·آ±ط·آ¯ط¸ظ¹ط¸â€  ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 8 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ inventory ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط¸â€¦ط·آ®ط·آ²ط¸ث†ط¸â€  ط¸ث†ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط¸ث†ط·آ¯ط·آ¹ط·آ§ط·ع¾ ط¸ث†ط·آ­ط·آ±ط¸ئ’ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ®ط·آ²ط¸ث†ط¸â€  ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 9 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ accounting ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط¸â€¦ط·آ­ط·آ§ط·آ³ط·آ¨ط·آ© ط¸ث†ط·آ§ط¸â€‍ط¸â€ڑط¸ظ¹ط¸ث†ط·آ¯ ط·آ§ط¸â€‍ط¸ظ¹ط¸ث†ط¸â€¦ط¸ظ¹ط·آ© ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 11 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ treasury ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط¸â€‍ط·آ®ط·آ²ط¸ظ¹ط¸â€ ط·آ© ط¸ث†ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸ظ¾ط¸ث†ط·آ¹ط·آ§ط·ع¾ ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company
# - ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ­ط¸â€‍ط·آ© 12 ط·ع¾ط·آ¶ط¸ظ¹ط¸ظ¾ payments ط¸ئ’ط·آ£ط·آ³ط·آ§ط·آ³ ط¸â€‍ط·آ·ط·آ±ط¸â€ڑ ط·آ§ط¸â€‍ط·آ¯ط¸ظ¾ط·آ¹ ط¸ث†ط·آ¨ط¸ث†ط·آ§ط·آ¨ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ¯ط¸ظ¾ط·آ¹ ط¸ث†ط·آ£ط·آ¬ط¸â€،ط·آ²ط·آ© ط·آ§ط¸â€‍ط·آ¯ط¸ظ¾ط·آ¹ ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company
# - ط·آ¯ط¸ظ¾ط·آ¹ ط·آ§ط·آ´ط·ع¾ط·آ±ط·آ§ط¸ئ’ط·آ§ط·ع¾ PrimeyAcc ط¸â€‍ط¸â€‍ط¸â€¦ط¸â€ ط·آµط·آ© ط¸â€¦ط¸â€ ط¸ظ¾ط·آµط¸â€‍ ط·آ¹ط¸â€  ط·آ·ط·آ±ط¸â€ڑ ط·آ¯ط¸ظ¾ط·آ¹ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ§ط·ع¾ ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍ط·آ§ط·آ¦ط¸â€،ط·آ§
# ============================================================

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


# ---------------------------------------------------------------------
# Base paths
# ---------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ---------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-primeyacc-change-this-key-before-production",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "127.0.0.1,localhost",
    ).split(",")
    if host.strip()
]


# ---------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
]

PRIMEYACC_APPS = [
    "core",
    "accounts",
    "companies",
    "subscriptions",
    "billing",
    "permissions",
    "settings_center",
    "audit_logs",
    "parties",
    "catalog",
    "sales",
    "purchases",
    "inventory",
    "jewelry",
    "activity_backends",
    "accounting",
    "treasury",
    "payments",
    "pos",
    "notifications",
    "whatsapp",
    "hr",
    "reports",
    "documents",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + PRIMEYACC_APPS


# ---------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ---------------------------------------------------------------------
# URLs / WSGI
# ---------------------------------------------------------------------

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"


# ---------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "templates",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ---------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------
# Development default: SQLite for quick bootstrapping.
# Production-ready switch: set DATABASE_ENGINE=mysql in .env.

DATABASE_ENGINE = os.getenv("DATABASE_ENGINE", "sqlite").lower()

if DATABASE_ENGINE == "mysql":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("MYSQL_DATABASE", "primeyacc"),
            "USER": os.getenv("MYSQL_USER", "root"),
            "PASSWORD": os.getenv("MYSQL_PASSWORD", ""),
            "HOST": os.getenv("MYSQL_HOST", "127.0.0.1"),
            "PORT": os.getenv("MYSQL_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# ---------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": 8,
        },
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ---------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------

LANGUAGE_CODE = "ar-sa"

TIME_ZONE = "Asia/Riyadh"

USE_I18N = True

USE_TZ = True


# ---------------------------------------------------------------------
# Static / Media
# ---------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ---------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}


# ---------------------------------------------------------------------
# CORS / CSRF for Next.js frontend
# ---------------------------------------------------------------------

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]

CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"

SESSION_COOKIE_NAME = "primeyacc_sessionid"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

if not DEBUG:
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
else:
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    SECURE_SSL_REDIRECT = False


# ---------------------------------------------------------------------
# Upload limits
# ---------------------------------------------------------------------

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024


# ---------------------------------------------------------------------
# Primary key
# ---------------------------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

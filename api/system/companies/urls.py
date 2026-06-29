# ============================================================
# 📂 api/system/companies/urls.py
# 🧠 Mhamcloud | System Companies URLs V1.2
# ------------------------------------------------------------
# ✅ Routes for system tenant companies APIs
# ✅ List, options, detail, create, update, and status actions
# ✅ Clean endpoint structure for frontend integration
# ✅ Kept under /api/system/companies/
# ✅ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - جميع APIs داخل /api/system/companies/ محمية داخل views
# - لا نضع منطق business داخل urls.py
# - المسارات تكون واضحة وثابتة للواجهة
# ============================================================

from __future__ import annotations

from django.urls import path

from .company_users import system_company_user_create
from .create import system_company_create
from .detail import system_company_detail
from .list import system_companies_list
from .options import system_company_options
from .status import system_company_status
from .update import system_company_update


app_name = "system_companies"


urlpatterns = [
    path("", system_companies_list, name="list"),
    path("options/", system_company_options, name="options"),
    path("create/", system_company_create, name="create"),
    path("<int:company_id>/users/create/", system_company_user_create, name="user_create"),
    path("<int:company_id>/", system_company_detail, name="detail"),
    path("<int:company_id>/update/", system_company_update, name="update"),
    path("<int:company_id>/status/", system_company_status, name="status"),
]
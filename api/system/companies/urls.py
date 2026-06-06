# ============================================================
# 📂 api/system/companies/urls.py
# 🧠 PrimeyAcc | System Companies URLs V1.0
# ------------------------------------------------------------
# ✅ Routes for system tenant companies APIs
# ✅ List, detail, create, update, and status actions
# ✅ Clean endpoint structure for future frontend integration
# ✅ Kept under /api/system/companies/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True داخل views
# - لا نضع منطق business داخل urls.py
# - المسارات تكون واضحة وثابتة للواجهة
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import system_company_create
from .detail import system_company_detail
from .list import system_companies_list
from .status import system_company_status
from .update import system_company_update


app_name = "system_companies"


urlpatterns = [
    path("", system_companies_list, name="list"),
    path("create/", system_company_create, name="create"),
    path("<int:company_id>/", system_company_detail, name="detail"),
    path("<int:company_id>/update/", system_company_update, name="update"),
    path("<int:company_id>/status/", system_company_status, name="status"),
]
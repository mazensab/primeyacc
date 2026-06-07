# ============================================================
# 📂 api/company/categories/urls.py
# 🧠 PrimeyAcc | Company Catalog Categories URLs V1.0
# ------------------------------------------------------------
# ✅ Company catalog categories routes
# ✅ List categories
# ✅ Create category
# ✅ Retrieve/update category
# ✅ Change category status
# ✅ Tenant isolation handled inside views/services
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل مسارات /company/categories تعمل داخل الشركة الحالية فقط
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يمكن الوصول أو تعديل تصنيف تابع لشركة أخرى
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_category_create
from .detail import company_category_detail
from .list import company_categories_list
from .status import company_category_status


app_name = "company_categories"


urlpatterns = [
    path(
        "",
        company_categories_list,
        name="list",
    ),
    path(
        "create/",
        company_category_create,
        name="create",
    ),
    path(
        "<int:category_id>/",
        company_category_detail,
        name="detail",
    ),
    path(
        "<int:category_id>/status/",
        company_category_status,
        name="status",
    ),
]
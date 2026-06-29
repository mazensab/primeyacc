# ============================================================
# 📂 api/company/products/urls.py
# 🧠 Mhamcloud | Company Catalog Products URLs V1.0
# ------------------------------------------------------------
# ✅ Company catalog products/services routes
# ✅ List products/services
# ✅ Create product/service
# ✅ Retrieve/update product/service
# ✅ Change product/service status
# ✅ Tenant isolation handled inside views/services
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل مسارات /company/products تعمل داخل الشركة الحالية فقط
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يمكن الوصول أو تعديل منتج/خدمة تابعة لشركة أخرى
# - CatalogItem هو الأساس الموحد للمنتجات والخدمات
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_product_create
from .detail import company_product_detail
from .list import company_products_list
from .status import company_product_status


app_name = "company_products"


urlpatterns = [
    path(
        "",
        company_products_list,
        name="list",
    ),
    path(
        "create/",
        company_product_create,
        name="create",
    ),
    path(
        "<int:product_id>/",
        company_product_detail,
        name="detail",
    ),
    path(
        "<int:product_id>/status/",
        company_product_status,
        name="status",
    ),
]
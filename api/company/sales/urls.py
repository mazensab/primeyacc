# ============================================================
# 📂 api/company/sales/urls.py
# 🧠 PrimeyAcc | Company Sales URLs V1.2
# ------------------------------------------------------------
# ✅ Company sales module routes
# ✅ Sales invoices routes
# ✅ Sales quotations routes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات موديول المبيعات داخل /api/company/sales/
# - كل endpoint داخلي يحمي نفسه بالصلاحيات والعزل
# - الفواتير وعروض الأسعار لكل منهما urls مستقلة
# ============================================================

from __future__ import annotations

from django.urls import include, path


urlpatterns = [
    path(
        "invoices/",
        include("api.company.sales.invoices.urls"),
    ),
    path(
        "quotations/",
        include("api.company.sales.quotations.urls"),
    ),
    path(
        "orders/",
        include("api.company.sales.orders.urls"),
    ),
    path(
        "returns/",
        include("api.company.sales.returns.urls"),
    ),
]
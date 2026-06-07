# ============================================================
# 📂 api/company/sales/urls.py
# 🧠 PrimeyAcc | Company Sales URLs V1.0
# ------------------------------------------------------------
# ✅ Company sales module routes
# ✅ Sales invoices routes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات موديول المبيعات داخل /api/company/sales/
# - كل endpoint داخلي يحمي نفسه بالصلاحيات والعزل
# ============================================================

from __future__ import annotations

from django.urls import include, path


urlpatterns = [
    path("invoices/", include("api.company.sales.invoices.urls")),
]
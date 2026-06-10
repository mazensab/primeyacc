# ============================================================
# 📂 api/company/hr/urls.py
# 🧠 PrimeyAcc | Company HR URLs V1.0
# ------------------------------------------------------------
# ✅ HR module routes
# ✅ Employees routes include
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات HR داخل /api/company/hr/
# - لا نضع منطق business داخل urls.py
# - كل مورد HR له urls.py مستقل
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "company_hr"


urlpatterns = [
    path("employees/", include("api.company.hr.employees.urls")),
]
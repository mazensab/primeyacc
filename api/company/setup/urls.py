# ============================================================
# 📂 api/company/setup/urls.py
# 🧠 PrimeyAcc | Company Setup API URLs V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company setup routes
# ✅ Company setup overview endpoint
# ✅ Company context comes from active CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع APIs تهيئة الشركة الحالية فقط
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يستخرج الشركة من CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# ============================================================

from __future__ import annotations

from django.urls import path

from .overview import company_setup_overview


app_name = "company_setup"


urlpatterns = [
    path("", company_setup_overview, name="overview"),
]
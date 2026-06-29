# ============================================================
# 📂 api/company/settings/urls.py
# 🧠 Mhamcloud | Company Settings API URLs V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company settings routes
# ✅ Company settings detail/update endpoint
# ✅ Company context comes from active CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع APIs إعدادات الشركة الحالية فقط
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يستخرج الشركة من CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import company_settings_detail


app_name = "company_settings"


urlpatterns = [
    path("", company_settings_detail, name="detail"),
]
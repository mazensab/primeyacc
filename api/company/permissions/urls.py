# ============================================================
# 📂 api/company/permissions/urls.py
# 🧠 Mhamcloud | Company Permissions API URLs V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company permissions routes
# ✅ Company permissions snapshot endpoint
# ✅ Company context comes from active CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع APIs صلاحيات الشركة الحالية فقط
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يستخرج الشركة من CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# ============================================================

from __future__ import annotations

from django.urls import path

from .snapshot import company_permissions_snapshot


app_name = "company_permissions"


urlpatterns = [
    path("", company_permissions_snapshot, name="snapshot"),
]
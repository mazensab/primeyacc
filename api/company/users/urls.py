# ============================================================
# 📂 api/company/users/urls.py
# 🧠 Mhamcloud | Company Users API URLs V1.3
# ------------------------------------------------------------
# ✅ Tenant-isolated company users routes
# ✅ Company users list endpoint
# ✅ Company user create endpoint
# ✅ Company user detail/update endpoint
# ✅ Company user status action endpoints
# ✅ Company context comes from active CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع APIs مستخدمي/عضويات الشركة الحالية فقط
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يستخرج الشركة من CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_user_create
from .detail import company_user_detail
from .list import company_users_list
from .status import company_user_status


app_name = "company_users"


urlpatterns = [
    path("", company_users_list, name="list"),
    path("create/", company_user_create, name="create"),
    path("<int:membership_id>/", company_user_detail, name="detail"),
    path("<int:membership_id>/<str:action>/", company_user_status, name="status"),
]
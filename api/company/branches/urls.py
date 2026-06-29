# ============================================================
# 📂 api/company/branches/urls.py
# 🧠 Mhamcloud | Company Branches API URLs V1.3
# ------------------------------------------------------------
# ✅ Tenant-isolated company branches routes
# ✅ Branches list endpoint
# ✅ Branch create endpoint
# ✅ Branch detail/update endpoint
# ✅ Branch status action endpoints
# ✅ Company context comes from active CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع APIs فروع الشركة الحالية فقط
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يستخرج الشركة من CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_branch_create
from .detail import company_branch_detail
from .list import company_branches_list
from .status import company_branch_status


app_name = "company_branches"


urlpatterns = [
    path("", company_branches_list, name="list"),
    path("create/", company_branch_create, name="create"),
    path("<int:branch_id>/", company_branch_detail, name="detail"),
    path("<int:branch_id>/<str:action>/", company_branch_status, name="status"),
]
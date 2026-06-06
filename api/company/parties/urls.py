# ============================================================
# 📂 api/company/parties/urls.py
# 🧠 PrimeyAcc | Company Business Parties API URLs V1.0
# ------------------------------------------------------------
# ✅ Business parties list route
# ✅ Business party create route
# ✅ Business party detail/update route
# ✅ Business party status actions route
# ✅ Company workspace routing foundation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات Business Parties فقط
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يعتمد على request.company
# - لا يتم الاعتماد على company_id القادم من الفرونت
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_party_create
from .detail import company_party_detail
from .list import company_parties_list
from .status import company_party_status


app_name = "company_parties"


urlpatterns = [
    path("", company_parties_list, name="list"),
    path("create/", company_party_create, name="create"),
    path("<int:party_id>/", company_party_detail, name="detail"),
    path("<int:party_id>/<str:action>/", company_party_status, name="status"),
]
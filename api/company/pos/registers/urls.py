# ============================================================
# ============================================================
# 📂 api/company/pos/registers/urls.py
# 🧠 PrimeyAcc | Company POS Registers URLs V1.0
# ------------------------------------------------------------
# ✅ POS Registers List Route
# ✅ POS Register Create Route
# ✅ POS Register Detail Route
# ✅ POS Register Update Route
# ✅ POS Register Status Route
# ✅ Company-scoped /company POS API Routing
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل المسارات هنا تعمل داخل /company فقط
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company في كل View
# - لا يتم تنفيذ عمليات Checkout أو Sessions من مسارات Registers
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import pos_register_create
from .detail import pos_register_detail
from .list import pos_registers_list
from .status import pos_register_status
from .update import pos_register_update


app_name = "company_pos_registers"


urlpatterns = [
    path(
        "",
        pos_registers_list,
        name="list",
    ),
    path(
        "create/",
        pos_register_create,
        name="create",
    ),
    path(
        "<int:register_id>/",
        pos_register_detail,
        name="detail",
    ),
    path(
        "<int:register_id>/update/",
        pos_register_update,
        name="update",
    ),
    path(
        "<int:register_id>/status/",
        pos_register_status,
        name="status",
    ),
]
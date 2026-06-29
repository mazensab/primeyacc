# ============================================================
# 📂 api/company/pos/returns/urls.py
# 🧠 Mhamcloud | Company POS Returns URLs V1.3
# ------------------------------------------------------------
# ✅ POS Returns List Route
# ✅ POS Returns Create Route
# ✅ POS Returns Detail Route
# ✅ POS Returns Complete Route
# ✅ POS Returns Cancel Route
# ✅ Company-scoped /company POS Returns Routing
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل مسارات POS Returns تعمل داخل /company فقط
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company داخل كل View
# - لا يتم وضع أي منطق تشغيلي داخل urls.py
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import pos_return_cancel
from .complete import pos_return_complete
from .create import pos_return_create
from .detail import pos_return_detail
from .list import pos_returns_list


app_name = "company_pos_returns"


urlpatterns = [
    path(
        "",
        pos_returns_list,
        name="list",
    ),
    path(
        "create/",
        pos_return_create,
        name="create",
    ),
    path(
        "<int:return_id>/",
        pos_return_detail,
        name="detail",
    ),
    path(
        "<int:return_id>/complete/",
        pos_return_complete,
        name="complete",
    ),
    path(
        "<int:return_id>/cancel/",
        pos_return_cancel,
        name="cancel",
    ),
]
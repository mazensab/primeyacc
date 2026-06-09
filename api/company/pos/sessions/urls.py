# ============================================================
# 📂 api/company/pos/sessions/urls.py
# 🧠 PrimeyAcc | Company POS Sessions URLs V1.0
# ------------------------------------------------------------
# ✅ POS Sessions List Route
# ✅ POS Session Open Route
# ✅ POS Session Detail Route
# ✅ POS Session Close Route
# ✅ POS Session Cancel Route
# ✅ Company-scoped /company POS API Routing
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل المسارات هنا تعمل داخل /company فقط
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company في كل View
# - لا يتم تنفيذ Checkout أو Orders من مسارات Sessions
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import pos_session_cancel
from .close import pos_session_close
from .detail import pos_session_detail
from .list import pos_sessions_list
from .open import pos_session_open


app_name = "company_pos_sessions"


urlpatterns = [
    path(
        "",
        pos_sessions_list,
        name="list",
    ),
    path(
        "open/",
        pos_session_open,
        name="open",
    ),
    path(
        "<int:session_id>/",
        pos_session_detail,
        name="detail",
    ),
    path(
        "<int:session_id>/close/",
        pos_session_close,
        name="close",
    ),
    path(
        "<int:session_id>/cancel/",
        pos_session_cancel,
        name="cancel",
    ),
]
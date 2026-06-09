# ============================================================
# 📂 api/company/pos/orders/urls.py
# 🧠 PrimeyAcc | Company POS Orders URLs V1.1
# ------------------------------------------------------------
# ✅ Company POS orders URL routing
# ✅ List, create, detail, preview, cancel and finalize endpoints
# ✅ Order items endpoints
# ✅ Order payments endpoints
# ✅ Connected under /api/company/pos/orders/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يربط endpoints فقط
# - لا يحتوي منطق أعمال
# - لا يقبل company_id في المسارات
# - كل العزل والصلاحيات داخل ملفات API نفسها
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import pos_order_cancel
from .create import pos_order_create
from .detail import pos_order_detail
from .finalize import pos_order_finalize
from .items import pos_order_item_add, pos_order_items_list
from .list import pos_orders_list
from .payments import pos_order_payment_add, pos_order_payments_list
from .preview import pos_order_preview


app_name = "company_pos_orders"


urlpatterns = [
    path("", pos_orders_list, name="list"),
    path("create/", pos_order_create, name="create"),
    path("preview/", pos_order_preview, name="preview"),
    path("<int:order_id>/", pos_order_detail, name="detail"),
    path("<int:order_id>/cancel/", pos_order_cancel, name="cancel"),
    path("<int:order_id>/finalize/", pos_order_finalize, name="finalize"),
    path("<int:order_id>/items/", pos_order_items_list, name="items-list"),
    path("<int:order_id>/items/add/", pos_order_item_add, name="items-add"),
    path("<int:order_id>/payments/", pos_order_payments_list, name="payments-list"),
    path("<int:order_id>/payments/add/", pos_order_payment_add, name="payments-add"),
]
# ============================================================
# 📂 api/company/payments/gateways/urls.py
# 🧠 PrimeyAcc | Company Payment Gateways URLs V1.0
# ------------------------------------------------------------
# ✅ List/create company payment gateways
# ✅ Retrieve/update company payment gateway
# ✅ Activate/deactivate company payment gateway
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company فقط
# - لا يتم قبول company_id من الواجهة كمصدر ثقة
# - لا يتم كشف إعدادات البوابة الحساسة بشكل صريح
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import payment_gateway_detail
from .list import payment_gateways_list
from .status import payment_gateway_status


app_name = "company_payment_gateways"

urlpatterns = [
    path("", payment_gateways_list, name="list"),
    path("<int:gateway_id>/", payment_gateway_detail, name="detail"),
    path("<int:gateway_id>/status/", payment_gateway_status, name="status"),
]
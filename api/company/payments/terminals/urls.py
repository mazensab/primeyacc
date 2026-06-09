# ============================================================
# 📂 api/company/payments/terminals/urls.py
# 🧠 PrimeyAcc | Company Payment Terminals URLs V1.0
# ------------------------------------------------------------
# ✅ List/create company payment terminals
# ✅ Retrieve/update company payment terminal
# ✅ Activate/deactivate company payment terminal
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company فقط
# - لا يتم قبول company_id من الواجهة كمصدر ثقة
# - أجهزة الدفع هنا تخص فروع ونقاط بيع الشركة وليس اشتراكات المنصة
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import payment_terminal_detail
from .list import payment_terminals_list
from .status import payment_terminal_status


app_name = "company_payment_terminals"

urlpatterns = [
    path("", payment_terminals_list, name="list"),
    path("<int:terminal_id>/", payment_terminal_detail, name="detail"),
    path("<int:terminal_id>/status/", payment_terminal_status, name="status"),
]
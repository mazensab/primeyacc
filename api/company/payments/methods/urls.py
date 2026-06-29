# ============================================================
# 📂 api/company/payments/methods/urls.py
# 🧠 Mhamcloud | Company Payment Methods URLs V1.0
# ------------------------------------------------------------
# ✅ List/create company payment methods
# ✅ Retrieve/update company payment method
# ✅ Activate/deactivate company payment method
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company فقط
# - لا يتم قبول company_id من الواجهة كمصدر ثقة
# - طرق الدفع هنا تخص عملاء الشركة وليس اشتراكات المنصة
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import payment_method_detail
from .list import payment_methods_list
from .status import payment_method_status


app_name = "company_payment_methods"

urlpatterns = [
    path("", payment_methods_list, name="list"),
    path("<int:method_id>/", payment_method_detail, name="detail"),
    path("<int:method_id>/status/", payment_method_status, name="status"),
]
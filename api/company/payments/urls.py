# ============================================================
# 📂 api/company/payments/urls.py
# 🧠 PrimeyAcc | Company Payments URLs V1.2
# ------------------------------------------------------------
# ✅ Company payment methods routes
# ✅ Company payment gateways routes
# ✅ Company payment terminals routes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل endpoints تعمل داخل /company
# - العزل الحقيقي يتم من request.company داخل views
# - لا يتم قبول company_id من الواجهة كمصدر للشركة
# - دفع اشتراكات PrimeyAcc للمنصة منفصل عن طرق دفع الشركات
# - طرق الدفع وبوابات الدفع وأجهزة الدفع هنا تخص عمليات الشركة مع عملائها
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "company_payments"

urlpatterns = [
    path("methods/", include("api.company.payments.methods.urls")),
    path("gateways/", include("api.company.payments.gateways.urls")),
    path("terminals/", include("api.company.payments.terminals.urls")),
    path("checkout/", include("api.company.payments.checkout.urls")),
    path("webhooks/", include("api.company.payments.webhooks.urls")),
    path("settlements/", include("api.company.payments.settlements.urls")),
]
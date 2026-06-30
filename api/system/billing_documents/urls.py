# ============================================================
# 📂 api/system/billing_documents/urls.py
# 🧠 Mhamcloud | System Billing Documents URLs V1.0
# ------------------------------------------------------------
# ✅ Platform billing documents list route
# ✅ Platform billing document detail route
# ✅ Subscription invoice creation route
# ✅ Subscription payment receipt creation route
# ✅ Clean endpoint structure for frontend integration
# ✅ Kept under /api/system/billing-documents/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - جميع Views محمية بصلاحيات النظام داخل كل View
# - لا نضع منطق Business داخل urls.py
# - مسارات الإنشاء مرتبطة بالاشتراك
# - مسارات العرض مرتبطة بمستند فوترة المنصة
# ============================================================

from __future__ import annotations

from django.urls import path

from .create_invoice import (
    system_billing_document_create_invoice,
)
from .create_receipt import (
    system_billing_document_create_receipt,
)
from .detail import system_billing_document_detail
from .list import system_billing_documents_list
from .render import system_billing_document_pdf, system_billing_document_print


app_name = "system_billing_documents"


urlpatterns = [
    path(
        "",
        system_billing_documents_list,
        name="list",
    ),
    path(
        "subscriptions/<int:subscription_id>/invoice/",
        system_billing_document_create_invoice,
        name="create_invoice",
    ),
    path(
        "subscriptions/<int:subscription_id>/receipt/",
        system_billing_document_create_receipt,
        name="create_receipt",
    ),
    path(
        "<int:document_id>/print/",
        system_billing_document_print,
        name="billing-document-print",
    ),
    path(
        "<int:document_id>/pdf/",
        system_billing_document_pdf,
        name="billing-document-pdf",
    ),
    path(
        "<int:document_id>/",
        system_billing_document_detail,
        name="detail",
    ),
]
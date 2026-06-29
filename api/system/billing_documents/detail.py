# ============================================================
# 📂 api/system/billing_documents/detail.py
# 🧠 Mhamcloud | System Billing Document Detail API V1.0
# ------------------------------------------------------------
# ✅ Returns one platform billing document by ID
# ✅ Includes company, subscription, plan, and user summaries
# ✅ Includes immutable document snapshots
# ✅ Includes stored printable payload
# ✅ Includes related invoice for payment receipts
# ✅ Includes payment receipts linked to an invoice
# ✅ Protected by system.billing_documents.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الـAPI يخص مستندات فوترة مالك منصة Mhamcloud
# - الطباعة تعتمد على printable_payload المحفوظ
# - لا نعيد بناء Snapshot من البيانات الحية
# - الفاتورة تعرض إيصالات الدفع المرتبطة بها
# - إيصال الدفع يعرض ملخص الفاتورة المرتبطة به
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from api.system.billing_documents.serializers import (
    billing_document_payload,
)
from billing.models import PlatformBillingDocument


def _billing_document_queryset():
    """
    Return the shared queryset used by the detail endpoint.

    All relations required by the serializer are loaded here to avoid
    unnecessary database queries.
    """

    return (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__company",
            "subscription__plan",
            "subscription__previous_subscription",
            "subscription__previous_subscription__plan",
            "related_invoice",
            "related_invoice__company",
            "related_invoice__subscription",
            "related_invoice__subscription__plan",
            "created_by",
            "cancelled_by",
        )
        .prefetch_related(
            "payment_receipts",
            "payment_receipts__company",
            "payment_receipts__subscription",
            "payment_receipts__subscription__plan",
            "payment_receipts__created_by",
            "payment_receipts__cancelled_by",
        )
    )


@login_required
@require_GET
def system_billing_document_detail(
    request: HttpRequest,
    document_id: int,
) -> JsonResponse:
    """
    GET
    /api/system/billing-documents/<document_id>/

    Return one platform billing document with immutable snapshots and
    its stored printable payload.
    """

    if not user_has_system_permission(
        request.user,
        "system.billing_documents.view",
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "غير مصرح لك بعرض مستندات فوترة المنصة."
                ),
                "code": (
                    "SYSTEM_BILLING_DOCUMENTS_"
                    "VIEW_PERMISSION_REQUIRED"
                ),
            },
            status=403,
        )

    document = get_object_or_404(
        _billing_document_queryset(),
        id=document_id,
    )

    payment_receipts = []

    if document.is_invoice:
        payment_receipts = [
            billing_document_payload(
                receipt,
                include_snapshots=False,
                include_printable_payload=False,
            )
            for receipt in document.payment_receipts.all()
        ]

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "document": billing_document_payload(
                    document,
                    include_snapshots=True,
                    include_printable_payload=True,
                ),
                "payment_receipts": payment_receipts,
                "payment_receipts_count": len(
                    payment_receipts
                ),
            },
        }
    )
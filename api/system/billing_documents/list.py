# ============================================================
# 📂 api/system/billing_documents/list.py
# 🧠 PrimeyAcc | System Billing Documents List API V1.0
# ------------------------------------------------------------
# ✅ Lists platform subscription invoices and payment receipts
# ✅ Supports document type, status, company, and subscription filters
# ✅ Supports date range, sequence year, payment method, and search
# ✅ Returns filtered totals and document statistics
# ✅ Uses compact billing document payloads
# ✅ Protected by system.billing_documents.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه القائمة تخص مستندات فوترة مالك منصة PrimeyAcc
# - لا تعرض مستندات الشركات الموجودة داخل documents
# - جميع الإحصائيات تتأثر بالفلاتر المرسلة
# - القائمة لا تعيد Snapshots أو printable_payload لتقليل الحجم
# - التفاصيل هي المسؤولة عن إعادة بيانات الطباعة الكاملة
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, QuerySet, Sum
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from api.system.billing_documents.serializers import (
    billing_document_payload,
    money_to_string,
)
from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
)


def _clean_text(value: Any) -> str:
    """
    Normalize a query parameter.
    """

    return str(value or "").strip()


def _query_value(
    request: HttpRequest,
    key: str,
    default: Any = "",
) -> Any:
    """
    Read a GET query value safely.
    """

    return request.GET.get(key, default)


def _positive_integer(value: Any) -> int | None:
    """
    Convert a value to a positive integer.

    Invalid and non-positive values are ignored.
    """

    if value in {None, ""}:
        return None

    try:
        normalized = int(value)
    except (TypeError, ValueError):
        return None

    return normalized if normalized > 0 else None


def _apply_filters(
    request: HttpRequest,
    queryset: QuerySet[PlatformBillingDocument],
) -> QuerySet[PlatformBillingDocument]:
    """
    Apply supported billing document filters.
    """

    document_type = _clean_text(
        _query_value(request, "document_type")
    ).upper()

    if document_type in PlatformBillingDocumentType.values:
        queryset = queryset.filter(
            document_type=document_type
        )

    status = _clean_text(
        _query_value(request, "status")
    ).upper()

    if status in PlatformBillingDocumentStatus.values:
        queryset = queryset.filter(status=status)

    company_id = _positive_integer(
        _query_value(request, "company_id")
    )

    if company_id:
        queryset = queryset.filter(
            company_id=company_id
        )

    subscription_id = _positive_integer(
        _query_value(request, "subscription_id")
    )

    if subscription_id:
        queryset = queryset.filter(
            subscription_id=subscription_id
        )

    related_invoice_id = _positive_integer(
        _query_value(
            request,
            "related_invoice_id",
        )
    )

    if related_invoice_id:
        queryset = queryset.filter(
            related_invoice_id=related_invoice_id
        )

    sequence_year = _positive_integer(
        _query_value(request, "sequence_year")
    )

    if sequence_year:
        queryset = queryset.filter(
            sequence_year=sequence_year
        )

    issue_date_from = _clean_text(
        _query_value(request, "issue_date_from")
    )

    if issue_date_from:
        queryset = queryset.filter(
            issue_date__gte=issue_date_from
        )

    issue_date_to = _clean_text(
        _query_value(request, "issue_date_to")
    )

    if issue_date_to:
        queryset = queryset.filter(
            issue_date__lte=issue_date_to
        )

    paid_date_from = _clean_text(
        _query_value(request, "paid_date_from")
    )

    if paid_date_from:
        queryset = queryset.filter(
            paid_at__date__gte=paid_date_from
        )

    paid_date_to = _clean_text(
        _query_value(request, "paid_date_to")
    )

    if paid_date_to:
        queryset = queryset.filter(
            paid_at__date__lte=paid_date_to
        )

    payment_method = _clean_text(
        _query_value(request, "payment_method")
    )

    if payment_method:
        queryset = queryset.filter(
            payment_method__iexact=payment_method
        )

    billing_reference = _clean_text(
        _query_value(
            request,
            "billing_reference",
        )
    )

    if billing_reference:
        queryset = queryset.filter(
            billing_reference__icontains=(
                billing_reference
            )
        )

    transaction_reference = _clean_text(
        _query_value(
            request,
            "transaction_reference",
        )
    )

    if transaction_reference:
        queryset = queryset.filter(
            transaction_reference__icontains=(
                transaction_reference
            )
        )

    search = _clean_text(
        _query_value(request, "search")
    )

    if search:
        queryset = queryset.filter(
            Q(document_number__icontains=search)
            | Q(
                billing_reference__icontains=search
            )
            | Q(
                transaction_reference__icontains=search
            )
            | Q(payment_method__icontains=search)
            | Q(
                company__name__icontains=search
            )
            | Q(
                company__name_ar__icontains=search
            )
            | Q(
                company__name_en__icontains=search
            )
            | Q(
                company__company_code__icontains=search
            )
            | Q(
                subscription__billing_reference__icontains=(
                    search
                )
            )
        )

    return queryset


def _build_stats(
    queryset: QuerySet[PlatformBillingDocument],
) -> dict[str, Any]:
    """
    Build statistics from the filtered queryset.
    """

    aggregate = queryset.aggregate(
        total_count=Count("id"),
        invoice_count=Count(
            "id",
            filter=Q(
                document_type=(
                    PlatformBillingDocumentType
                    .SUBSCRIPTION_INVOICE
                )
            ),
        ),
        receipt_count=Count(
            "id",
            filter=Q(
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                )
            ),
        ),
        draft_count=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .DRAFT
                )
            ),
        ),
        issued_count=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .ISSUED
                )
            ),
        ),
        paid_count=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .PAID
                )
            ),
        ),
        cancelled_count=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .CANCELLED
                )
            ),
        ),
        subtotal_sum=Sum("subtotal"),
        discount_amount_sum=Sum(
            "discount_amount"
        ),
        taxable_amount_sum=Sum(
            "taxable_amount"
        ),
        tax_amount_sum=Sum("tax_amount"),
        total_amount_sum=Sum("total_amount"),
        paid_amount_sum=Sum("paid_amount"),
        balance_amount_sum=Sum("balance_amount"),
    )

    zero = Decimal("0.00")

    return {
        "total": aggregate.get(
            "total_count"
        ) or 0,
        "subscription_invoices": aggregate.get(
            "invoice_count"
        ) or 0,
        "payment_receipts": aggregate.get(
            "receipt_count"
        ) or 0,
        "draft": aggregate.get(
            "draft_count"
        ) or 0,
        "issued": aggregate.get(
            "issued_count"
        ) or 0,
        "paid": aggregate.get(
            "paid_count"
        ) or 0,
        "cancelled": aggregate.get(
            "cancelled_count"
        ) or 0,
        "amounts": {
            "subtotal": money_to_string(
                aggregate.get(
                    "subtotal_sum"
                ) or zero
            ),
            "discount_amount": money_to_string(
                aggregate.get(
                    "discount_amount_sum"
                ) or zero
            ),
            "taxable_amount": money_to_string(
                aggregate.get(
                    "taxable_amount_sum"
                ) or zero
            ),
            "tax_amount": money_to_string(
                aggregate.get(
                    "tax_amount_sum"
                ) or zero
            ),
            "total_amount": money_to_string(
                aggregate.get(
                    "total_amount_sum"
                ) or zero
            ),
            "paid_amount": money_to_string(
                aggregate.get(
                    "paid_amount_sum"
                ) or zero
            ),
            "balance_amount": money_to_string(
                aggregate.get(
                    "balance_amount_sum"
                ) or zero
            ),
        },
    }


@login_required
@require_GET
def system_billing_documents_list(
    request: HttpRequest,
) -> JsonResponse:
    """
    GET /api/system/billing-documents/

    Return platform billing documents with filters and statistics.
    """

    if not user_has_system_permission(
        request.user,
        "system.billing_documents.view",
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "غير مصرح لك بالوصول إلى "
                    "مستندات فوترة المنصة."
                ),
                "code": (
                    "SYSTEM_BILLING_DOCUMENTS_"
                    "VIEW_PERMISSION_REQUIRED"
                ),
            },
            status=403,
        )

    queryset = (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__company",
            "subscription__plan",
            "subscription__previous_subscription",
            "related_invoice",
            "created_by",
            "cancelled_by",
        )
        .order_by("-issued_at", "-id")
    )

    queryset = _apply_filters(
        request,
        queryset,
    )

    stats = _build_stats(queryset)

    items = [
        billing_document_payload(
            document,
            include_snapshots=False,
            include_printable_payload=False,
        )
        for document in queryset
    ]

    return JsonResponse(
        {
            "ok": True,
            "message": (
                "تم جلب مستندات فوترة المنصة بنجاح."
            ),
            "data": {
                "items": items,
                "results": items,
                "count": stats["total"],
                "stats": stats,
                "filters": {
                    "supported_document_types": [
                        choice[0]
                        for choice in (
                            PlatformBillingDocumentType
                            .choices
                        )
                    ],
                    "supported_statuses": [
                        choice[0]
                        for choice in (
                            PlatformBillingDocumentStatus
                            .choices
                        )
                    ],
                    "supported_query_parameters": [
                        "document_type",
                        "status",
                        "company_id",
                        "subscription_id",
                        "related_invoice_id",
                        "sequence_year",
                        "issue_date_from",
                        "issue_date_to",
                        "paid_date_from",
                        "paid_date_to",
                        "payment_method",
                        "billing_reference",
                        "transaction_reference",
                        "search",
                    ],
                },
            },
        },
        status=200,
    )
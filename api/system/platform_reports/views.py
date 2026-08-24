from __future__ import annotations

import csv
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from io import StringIO
from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, Sum
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformPaymentReconciliation,
    PlatformSubscriptionAdjustment,
    PlatformSubscriptionPayment,
    PlatformSubscriptionRefund,
)
from subscriptions.models import CompanySubscription


REPORT_PERMISSION = "system.reports.view"
ZERO = Decimal("0.00")
CENT = Decimal("0.01")


def _money(value: Any) -> Decimal:
    if value is None:
        return ZERO

    try:
        amount = Decimal(str(value))
    except Exception:
        return ZERO

    if not amount.is_finite():
        return ZERO

    return amount.quantize(
        CENT,
        rounding=ROUND_HALF_UP,
    )


def _money_string(value: Any) -> str:
    return f"{_money(value):.2f}"


def _percent(
    numerator: Any,
    denominator: Any,
) -> str:
    top = _money(numerator)
    bottom = _money(denominator)

    if bottom <= ZERO:
        return "0.00"

    result = (
        top
        / bottom
        * Decimal("100")
    )

    return f"{result.quantize(CENT, rounding=ROUND_HALF_UP):.2f}"


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _forbidden() -> JsonResponse:
    return JsonResponse(
        {
            "ok": False,
            "code": "SYSTEM_REPORTS_VIEW_PERMISSION_REQUIRED",
            "message": (
                "You are not authorized to view platform reports."
            ),
        },
        status=403,
    )


def _parse_date(
    request: HttpRequest,
    name: str,
):
    raw = _clean(
        request.GET.get(name)
    )

    if not raw:
        return None

    value = parse_date(raw)

    if value is None:
        return JsonResponse(
            {
                "ok": False,
                "code": "INVALID_REPORT_DATE",
                "message": (
                    f"{name} must use YYYY-MM-DD."
                ),
            },
            status=400,
        )

    return value


def _parse_positive_integer(
    request: HttpRequest,
    name: str,
):
    raw = _clean(
        request.GET.get(name)
    )

    if not raw:
        return None

    if not raw.isdigit():
        return JsonResponse(
            {
                "ok": False,
                "code": (
                    f"INVALID_{name.upper()}"
                ),
                "message": (
                    f"{name} must be a positive integer."
                ),
            },
            status=400,
        )

    value = int(raw)

    if value <= 0:
        return JsonResponse(
            {
                "ok": False,
                "code": (
                    f"INVALID_{name.upper()}"
                ),
                "message": (
                    f"{name} must be a positive integer."
                ),
            },
            status=400,
        )

    return value


def _report_filters(
    request: HttpRequest,
):
    date_from = _parse_date(
        request,
        "date_from",
    )

    if isinstance(
        date_from,
        JsonResponse,
    ):
        return date_from

    date_to = _parse_date(
        request,
        "date_to",
    )

    if isinstance(
        date_to,
        JsonResponse,
    ):
        return date_to

    if (
        date_from
        and date_to
        and date_from > date_to
    ):
        return JsonResponse(
            {
                "ok": False,
                "code": "INVALID_REPORT_DATE_RANGE",
                "message": (
                    "date_from cannot be after date_to."
                ),
            },
            status=400,
        )

    company_id = _parse_positive_integer(
        request,
        "company_id",
    )

    if isinstance(
        company_id,
        JsonResponse,
    ):
        return company_id

    plan_id = _parse_positive_integer(
        request,
        "plan_id",
    )

    if isinstance(
        plan_id,
        JsonResponse,
    ):
        return plan_id

    return {
        "date_from": date_from,
        "date_to": date_to,
        "company_id": company_id,
        "plan_id": plan_id,
        "gateway": _clean(
            request.GET.get("gateway")
        ).upper(),
        "payment_method": _clean(
            request.GET.get(
                "payment_method"
            )
        ).upper(),
    }


def _date_range(
    queryset,
    *,
    field: str,
    filters: dict[str, Any],
):
    if filters["date_from"]:
        queryset = queryset.filter(
            **{
                f"{field}__date__gte":
                    filters["date_from"]
            }
        )

    if filters["date_to"]:
        queryset = queryset.filter(
            **{
                f"{field}__date__lte":
                    filters["date_to"]
            }
        )

    return queryset


def _subscription_scope(
    filters: dict[str, Any],
):
    queryset = (
        CompanySubscription.objects
        .select_related(
            "company",
            "plan",
        )
        .all()
    )

    if filters["company_id"]:
        queryset = queryset.filter(
            company_id=filters["company_id"]
        )

    if filters["plan_id"]:
        queryset = queryset.filter(
            plan_id=filters["plan_id"]
        )

    return queryset


def _subscription_period(
    filters: dict[str, Any],
):
    return _date_range(
        _subscription_scope(filters),
        field="created_at",
        filters=filters,
    )


def _payment_scope(
    filters: dict[str, Any],
):
    queryset = (
        PlatformSubscriptionPayment.objects
        .select_related(
            "company",
            "subscription",
            "subscription__plan",
        )
        .all()
    )

    if filters["company_id"]:
        queryset = queryset.filter(
            company_id=filters["company_id"]
        )

    if filters["plan_id"]:
        queryset = queryset.filter(
            subscription__plan_id=(
                filters["plan_id"]
            )
        )

    if filters["gateway"]:
        queryset = queryset.filter(
            gateway=filters["gateway"]
        )

    if filters["payment_method"]:
        queryset = queryset.filter(
            payment_method=(
                filters["payment_method"]
            )
        )

    return _date_range(
        queryset,
        field="initiated_at",
        filters=filters,
    )


def _refund_scope(
    filters: dict[str, Any],
):
    queryset = (
        PlatformSubscriptionRefund.objects
        .select_related(
            "payment",
            "subscription",
            "company",
        )
        .all()
    )

    if filters["company_id"]:
        queryset = queryset.filter(
            company_id=filters["company_id"]
        )

    if filters["plan_id"]:
        queryset = queryset.filter(
            subscription__plan_id=(
                filters["plan_id"]
            )
        )

    if filters["gateway"]:
        queryset = queryset.filter(
            gateway=filters["gateway"]
        )

    return _date_range(
        queryset,
        field="initiated_at",
        filters=filters,
    )


def _adjustment_scope(
    filters: dict[str, Any],
):
    queryset = (
        PlatformSubscriptionAdjustment.objects
        .select_related(
            "payment",
            "subscription",
            "company",
        )
        .all()
    )

    if filters["company_id"]:
        queryset = queryset.filter(
            company_id=filters["company_id"]
        )

    if filters["plan_id"]:
        queryset = queryset.filter(
            subscription__plan_id=(
                filters["plan_id"]
            )
        )

    return _date_range(
        queryset,
        field="created_at",
        filters=filters,
    )


def _reconciliation_scope(
    filters: dict[str, Any],
):
    queryset = (
        PlatformPaymentReconciliation.objects
        .select_related(
            "payment",
            "payment__company",
            "payment__subscription",
        )
        .all()
    )

    if filters["company_id"]:
        queryset = queryset.filter(
            payment__company_id=(
                filters["company_id"]
            )
        )

    if filters["plan_id"]:
        queryset = queryset.filter(
            payment__subscription__plan_id=(
                filters["plan_id"]
            )
        )

    if filters["gateway"]:
        queryset = queryset.filter(
            gateway=filters["gateway"]
        )

    return _date_range(
        queryset,
        field="reconciled_at",
        filters=filters,
    )


def _document_scope(
    filters: dict[str, Any],
):
    queryset = (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
        )
        .all()
    )

    if filters["company_id"]:
        queryset = queryset.filter(
            company_id=filters["company_id"]
        )

    if filters["plan_id"]:
        queryset = queryset.filter(
            subscription__plan_id=(
                filters["plan_id"]
            )
        )

    if filters["payment_method"]:
        queryset = queryset.filter(
            payment_method__iexact=(
                filters["payment_method"]
            )
        )

    if filters["date_from"]:
        queryset = queryset.filter(
            issue_date__gte=(
                filters["date_from"]
            )
        )

    if filters["date_to"]:
        queryset = queryset.filter(
            issue_date__lte=(
                filters["date_to"]
            )
        )

    return queryset


def _subscription_metrics(
    filters: dict[str, Any],
):
    today = timezone.localdate()

    scope = _subscription_scope(
        filters
    )

    period = _subscription_period(
        filters
    )

    status_stats = scope.aggregate(
        total=Count("id"),
        pending_payment=Count(
            "id",
            filter=Q(
                status=(
                    CompanySubscription
                    .Status
                    .PENDING_PAYMENT
                )
            ),
        ),
        trial=Count(
            "id",
            filter=Q(
                status=(
                    CompanySubscription
                    .Status
                    .TRIAL
                )
            ),
        ),
        active=Count(
            "id",
            filter=Q(
                status=(
                    CompanySubscription
                    .Status
                    .ACTIVE
                )
            ),
        ),
        expired=Count(
            "id",
            filter=Q(
                status=(
                    CompanySubscription
                    .Status
                    .EXPIRED
                )
            ),
        ),
        cancelled=Count(
            "id",
            filter=Q(
                status=(
                    CompanySubscription
                    .Status
                    .CANCELLED
                )
            ),
        ),
        suspended=Count(
            "id",
            filter=Q(
                status=(
                    CompanySubscription
                    .Status
                    .SUSPENDED
                )
            ),
        ),
    )

    action_stats = period.aggregate(
        new=Count(
            "id",
            filter=Q(
                action=(
                    CompanySubscription
                    .SubscriptionAction
                    .NEW
                )
            ),
        ),
        renewals=Count(
            "id",
            filter=Q(
                action=(
                    CompanySubscription
                    .SubscriptionAction
                    .RENEWAL
                )
            ),
        ),
        upgrades=Count(
            "id",
            filter=Q(
                action=(
                    CompanySubscription
                    .SubscriptionAction
                    .UPGRADE
                )
            ),
        ),
        downgrades=Count(
            "id",
            filter=Q(
                action=(
                    CompanySubscription
                    .SubscriptionAction
                    .DOWNGRADE
                )
            ),
        ),
    )

    upcoming_7 = (
        scope
        .filter(
            status__in=[
                CompanySubscription.Status.ACTIVE,
                CompanySubscription.Status.TRIAL,
            ],
            end_date__gte=today,
            end_date__lte=(
                today + timedelta(days=7)
            ),
        )
        .count()
    )

    upcoming_30 = (
        scope
        .filter(
            status__in=[
                CompanySubscription.Status.ACTIVE,
                CompanySubscription.Status.TRIAL,
            ],
            end_date__gte=today,
            end_date__lte=(
                today + timedelta(days=30)
            ),
        )
        .count()
    )

    grace = (
        scope
        .filter(
            status=(
                CompanySubscription.Status.ACTIVE
            ),
            end_date__lt=today,
            end_date__gte=(
                today - timedelta(days=7)
            ),
        )
        .count()
    )

    churn = scope.filter(
        status__in=[
            CompanySubscription.Status.EXPIRED,
            CompanySubscription.Status.CANCELLED,
        ]
    )

    if filters["date_from"]:
        churn = churn.filter(
            updated_at__date__gte=(
                filters["date_from"]
            )
        )

    if filters["date_to"]:
        churn = churn.filter(
            updated_at__date__lte=(
                filters["date_to"]
            )
        )

    churn_count = churn.count()

    active_base = (
        int(status_stats.get("active") or 0)
        + int(status_stats.get("trial") or 0)
        + churn_count
    )

    churn_rate = _percent(
        churn_count,
        active_base,
    )

    retention_rate = (
        Decimal("100.00")
        - Decimal(churn_rate)
        if active_base
        else ZERO
    )

    mrr = ZERO

    current_active = (
        scope
        .filter(
            status=CompanySubscription.Status.ACTIVE
        )
        .values(
            "billing_cycle",
            "total_amount",
        )
    )

    for row in current_active.iterator():
        amount = _money(
            row.get("total_amount")
        )

        cycle = _clean(
            row.get("billing_cycle")
        ).upper()

        if cycle == (
            CompanySubscription.BillingCycle.YEARLY
        ):
            mrr += (
                amount / Decimal("12")
            )
        elif cycle == (
            CompanySubscription.BillingCycle.MONTHLY
        ):
            mrr += amount

    mrr = _money(mrr)
    arr = _money(
        mrr * Decimal("12")
    )

    return {
        "status": {
            key: int(
                status_stats.get(key) or 0
            )
            for key in (
                "total",
                "pending_payment",
                "trial",
                "active",
                "expired",
                "cancelled",
                "suspended",
            )
        },
        "actions": {
            key: int(
                action_stats.get(key) or 0
            )
            for key in (
                "new",
                "renewals",
                "upgrades",
                "downgrades",
            )
        },
        "upcoming_renewals": {
            "next_7_days": upcoming_7,
            "next_30_days": upcoming_30,
            "active_grace": grace,
        },
        "churn": {
            "count": churn_count,
            "rate": churn_rate,
            "definition": (
                "EXPIRED or CANCELLED subscriptions "
                "whose updated_at falls inside the "
                "requested reporting period."
            ),
        },
        "retention": {
            "rate": (
                f"{retention_rate:.2f}"
            ),
            "definition": (
                "100 minus operational churn rate."
            ),
        },
        "recurring_revenue": {
            "mrr": _money_string(mrr),
            "arr": _money_string(arr),
            "currency_code": "SAR",
            "definition": (
                "Current ACTIVE monthly subscription "
                "total amounts plus one twelfth of "
                "current ACTIVE yearly subscription "
                "total amounts."
            ),
        },
    }


def _payment_metrics(
    filters: dict[str, Any],
):
    queryset = _payment_scope(
        filters
    )

    stats = queryset.aggregate(
        total=Count("id"),
        pending=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .PENDING
                )
            ),
        ),
        processing=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .PROCESSING
                )
            ),
        ),
        paid=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .PAID
                )
            ),
        ),
        failed=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .FAILED
                )
            ),
        ),
        cancelled=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .CANCELLED
                )
            ),
        ),
        gross_paid=Sum(
            "amount",
            filter=Q(
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .PAID
                )
            ),
        ),
    )

    resolved = (
        int(stats.get("paid") or 0)
        + int(stats.get("failed") or 0)
    )

    gateway_rows = (
        queryset
        .values("gateway")
        .annotate(
            total=Count("id"),
            paid=Count(
                "id",
                filter=Q(
                    status=(
                        PlatformSubscriptionPayment
                        .Status
                        .PAID
                    )
                ),
            ),
            failed=Count(
                "id",
                filter=Q(
                    status=(
                        PlatformSubscriptionPayment
                        .Status
                        .FAILED
                    )
                ),
            ),
        )
        .order_by("gateway")
    )

    gateways = []

    for row in gateway_rows:
        gateway_resolved = (
            int(row["paid"] or 0)
            + int(row["failed"] or 0)
        )

        gateways.append(
            {
                "gateway": (
                    row["gateway"] or "UNSPECIFIED"
                ),
                "total": int(
                    row["total"] or 0
                ),
                "paid": int(
                    row["paid"] or 0
                ),
                "failed": int(
                    row["failed"] or 0
                ),
                "success_rate": _percent(
                    row["paid"],
                    gateway_resolved,
                ),
                "failure_rate": _percent(
                    row["failed"],
                    gateway_resolved,
                ),
            }
        )

    methods = []

    for row in (
        queryset
        .values("payment_method")
        .annotate(
            total=Count("id"),
            amount=Sum("amount"),
        )
        .order_by("payment_method")
    ):
        methods.append(
            {
                "payment_method": (
                    row["payment_method"]
                    or "UNSPECIFIED"
                ),
                "count": int(
                    row["total"] or 0
                ),
                "amount": _money_string(
                    row["amount"]
                ),
            }
        )

    return {
        "status": {
            key: int(
                stats.get(key) or 0
            )
            for key in (
                "total",
                "pending",
                "processing",
                "paid",
                "failed",
                "cancelled",
            )
        },
        "gross_paid": _money_string(
            stats.get("gross_paid")
        ),
        "success_rate": _percent(
            stats.get("paid") or 0,
            resolved,
        ),
        "failure_rate": _percent(
            stats.get("failed") or 0,
            resolved,
        ),
        "gateway_performance": gateways,
        "payment_methods": methods,
        "currency_code": "SAR",
    }


def _refund_metrics(
    filters: dict[str, Any],
):
    queryset = _refund_scope(
        filters
    )

    stats = queryset.aggregate(
        total=Count("id"),
        pending=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionRefund
                    .Status
                    .PENDING
                )
            ),
        ),
        processing=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionRefund
                    .Status
                    .PROCESSING
                )
            ),
        ),
        succeeded=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionRefund
                    .Status
                    .SUCCEEDED
                )
            ),
        ),
        failed=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionRefund
                    .Status
                    .FAILED
                )
            ),
        ),
        cancelled=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionRefund
                    .Status
                    .CANCELLED
                )
            ),
        ),
        succeeded_amount=Sum(
            "amount",
            filter=Q(
                status=(
                    PlatformSubscriptionRefund
                    .Status
                    .SUCCEEDED
                )
            ),
        ),
    )

    return {
        "status": {
            key: int(
                stats.get(key) or 0
            )
            for key in (
                "total",
                "pending",
                "processing",
                "succeeded",
                "failed",
                "cancelled",
            )
        },
        "succeeded_amount": _money_string(
            stats.get("succeeded_amount")
        ),
        "currency_code": "SAR",
    }


def _adjustment_metrics(
    filters: dict[str, Any],
):
    queryset = _adjustment_scope(
        filters
    )

    posted = queryset.filter(
        status=(
            PlatformSubscriptionAdjustment
            .Status
            .POSTED
        )
    )

    stats = queryset.aggregate(
        total=Count("id"),
        posted=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionAdjustment
                    .Status
                    .POSTED
                )
            ),
        ),
        reversed=Count(
            "id",
            filter=Q(
                status=(
                    PlatformSubscriptionAdjustment
                    .Status
                    .REVERSED
                )
            ),
        ),
    )

    amounts = posted.aggregate(
        credits=Sum(
            "amount",
            filter=Q(
                adjustment_type=(
                    PlatformSubscriptionAdjustment
                    .AdjustmentType
                    .CREDIT
                )
            ),
        ),
        debits=Sum(
            "amount",
            filter=Q(
                adjustment_type=(
                    PlatformSubscriptionAdjustment
                    .AdjustmentType
                    .DEBIT
                )
            ),
        ),
    )

    credits = _money(
        amounts.get("credits")
    )

    debits = _money(
        amounts.get("debits")
    )

    return {
        "status": {
            "total": int(
                stats.get("total") or 0
            ),
            "posted": int(
                stats.get("posted") or 0
            ),
            "reversed": int(
                stats.get("reversed") or 0
            ),
        },
        "posted_credit_amount": (
            _money_string(credits)
        ),
        "posted_debit_amount": (
            _money_string(debits)
        ),
        "net_adjustment": (
            _money_string(
                debits - credits
            )
        ),
        "currency_code": "SAR",
    }


def _document_metrics(
    filters: dict[str, Any],
):
    queryset = _document_scope(
        filters
    )

    invoice_filter = Q(
        document_type=(
            PlatformBillingDocumentType
            .SUBSCRIPTION_INVOICE
        )
    )

    receipt_filter = Q(
        document_type=(
            PlatformBillingDocumentType
            .PAYMENT_RECEIPT
        )
    )

    stats = queryset.aggregate(
        total=Count("id"),
        invoices=Count(
            "id",
            filter=invoice_filter,
        ),
        receipts=Count(
            "id",
            filter=receipt_filter,
        ),
        paid=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .PAID
                )
            ),
        ),
        issued=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .ISSUED
                )
            ),
        ),
        cancelled=Count(
            "id",
            filter=Q(
                status=(
                    PlatformBillingDocumentStatus
                    .CANCELLED
                )
            ),
        ),
        invoice_total=Sum(
            "total_amount",
            filter=invoice_filter,
        ),
        open_balance=Sum(
            "balance_amount",
            filter=(
                invoice_filter
                & Q(
                    status=(
                        PlatformBillingDocumentStatus
                        .ISSUED
                    )
                )
            ),
        ),
    )

    return {
        "status": {
            key: int(
                stats.get(key) or 0
            )
            for key in (
                "total",
                "invoices",
                "receipts",
                "paid",
                "issued",
                "cancelled",
            )
        },
        "invoice_total": _money_string(
            stats.get("invoice_total")
        ),
        "open_receivables": _money_string(
            stats.get("open_balance")
        ),
        "overdue": {
            "supported": False,
            "reason": (
                "Platform billing documents do not "
                "persist a due_date. Open receivables "
                "are reported without inventing an "
                "arbitrary overdue threshold."
            ),
        },
        "currency_code": "SAR",
    }


def _reconciliation_metrics(
    filters: dict[str, Any],
):
    queryset = _reconciliation_scope(
        filters
    )

    stats = queryset.aggregate(
        total=Count("id"),
        matched=Count(
            "id",
            filter=Q(
                status=(
                    PlatformPaymentReconciliation
                    .Status
                    .MATCHED
                )
            ),
        ),
        discrepancy=Count(
            "id",
            filter=Q(
                status=(
                    PlatformPaymentReconciliation
                    .Status
                    .DISCREPANCY
                )
            ),
        ),
        error=Count(
            "id",
            filter=Q(
                status=(
                    PlatformPaymentReconciliation
                    .Status
                    .ERROR
                )
            ),
        ),
    )

    return {
        key: int(
            stats.get(key) or 0
        )
        for key in (
            "total",
            "matched",
            "discrepancy",
            "error",
        )
    }


def _build_report(
    filters: dict[str, Any],
):
    subscriptions = _subscription_metrics(
        filters
    )

    payments = _payment_metrics(
        filters
    )

    refunds = _refund_metrics(
        filters
    )

    adjustments = _adjustment_metrics(
        filters
    )

    documents = _document_metrics(
        filters
    )

    reconciliation = (
        _reconciliation_metrics(
            filters
        )
    )

    gross_paid = _money(
        payments["gross_paid"]
    )

    refunded = _money(
        refunds["succeeded_amount"]
    )

    net_adjustment = _money(
        adjustments["net_adjustment"]
    )

    net_collected = _money(
        gross_paid
        - refunded
        + net_adjustment
    )

    return {
        "generated_at": (
            timezone.now().isoformat()
        ),
        "filters": {
            "date_from": (
                filters["date_from"].isoformat()
                if filters["date_from"]
                else None
            ),
            "date_to": (
                filters["date_to"].isoformat()
                if filters["date_to"]
                else None
            ),
            "company_id": (
                filters["company_id"]
            ),
            "plan_id": (
                filters["plan_id"]
            ),
            "gateway": (
                filters["gateway"] or None
            ),
            "payment_method": (
                filters["payment_method"]
                or None
            ),
        },
        "subscriptions": subscriptions,
        "revenue": {
            "gross_paid": (
                _money_string(gross_paid)
            ),
            "successful_refunds": (
                _money_string(refunded)
            ),
            "net_adjustment": (
                _money_string(
                    net_adjustment
                )
            ),
            "net_collected": (
                _money_string(
                    net_collected
                )
            ),
            "currency_code": "SAR",
        },
        "payments": payments,
        "billing_documents": documents,
        "refunds": refunds,
        "adjustments": adjustments,
        "reconciliation": reconciliation,
    }


def _flatten(
    prefix: str,
    value: Any,
    rows: list[tuple[str, str]],
):
    if isinstance(value, dict):
        for key, child in value.items():
            next_prefix = (
                f"{prefix}.{key}"
                if prefix
                else str(key)
            )
            _flatten(
                next_prefix,
                child,
                rows,
            )
        return

    if isinstance(value, list):
        for index, child in enumerate(value):
            _flatten(
                f"{prefix}.{index}",
                child,
                rows,
            )
        return

    rows.append(
        (
            prefix,
            "" if value is None else str(value),
        )
    )


@login_required
@require_GET
def system_platform_reports_overview(
    request: HttpRequest,
):
    if not user_has_system_permission(
        request.user,
        REPORT_PERMISSION,
    ):
        return _forbidden()

    filters = _report_filters(
        request
    )

    if isinstance(filters, JsonResponse):
        return filters

    return JsonResponse(
        {
            "ok": True,
            "data": _build_report(
                filters
            ),
        },
        status=200,
    )


@login_required
@require_GET
def system_platform_reports_export(
    request: HttpRequest,
):
    if not user_has_system_permission(
        request.user,
        REPORT_PERMISSION,
    ):
        return _forbidden()

    filters = _report_filters(
        request
    )

    if isinstance(filters, JsonResponse):
        return filters

    report = _build_report(
        filters
    )

    rows: list[tuple[str, str]] = []

    _flatten(
        "",
        report,
        rows,
    )

    output = StringIO()

    writer = csv.writer(output)

    writer.writerow(
        [
            "metric",
            "value",
        ]
    )

    writer.writerows(rows)

    response = HttpResponse(
        output.getvalue(),
        content_type=(
            "text/csv; charset=utf-8"
        ),
    )

    response[
        "Content-Disposition"
    ] = (
        'attachment; filename="'
        'mhamcloud-platform-report.csv"'
    )

    return response


system_platform_reports_overview.required_system_permissions = [
    REPORT_PERMISSION
]

system_platform_reports_export.required_system_permissions = [
    REPORT_PERMISSION
]

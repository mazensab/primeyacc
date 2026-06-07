# ============================================================
# 📂 api/company/sales/invoices/summary.py
# 🧠 PrimeyAcc | Company Sales Invoices Summary API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped sales invoices summary
# ✅ Dashboard-ready invoice metrics
# ✅ Date range and branch/customer filters
# ✅ Status and payment status breakdowns
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - هذا الملف مسؤول عن ملخص فواتير المبيعات فقط
# - هذه المرحلة لا تنشئ محاسبة ولا مخزون ولا مدفوعات
# - صلاحية العرض المطلوبة: company.sales.invoices.view
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import (
    SalesInvoice,
    SalesInvoicePaymentStatus,
    SalesInvoiceStatus,
)


MONEY_ZERO = Decimal("0.00")


class SalesInvoiceSummaryAPIError(Exception):
    """
    Small API-level error for sales invoice summary endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceSummaryAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize query text.
    """
    return str(value or "").strip()


def _money_to_string(value: Any) -> str:
    """
    Convert Decimal-like values to a frontend-safe money string.
    """
    if value in [None, ""]:
        value = MONEY_ZERO

    return str(Decimal(str(value)).quantize(Decimal("0.01")))


def _base_queryset(company, request: Request):
    """
    Build company-scoped filtered queryset for summary.

    Supported filters:
    - date_from / date_to against invoice_date
    - branch_id
    - customer_id
    """
    queryset = SalesInvoice.objects.filter(company=company)

    date_from = _clean_text(request.query_params.get("date_from") or "")
    date_to = _clean_text(request.query_params.get("date_to") or "")
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    customer_id = _clean_text(request.query_params.get("customer_id") or "")

    if date_from:
        queryset = queryset.filter(invoice_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(invoice_date__lte=date_to)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    if customer_id:
        queryset = queryset.filter(customer_id=customer_id)

    return queryset


def _aggregate_money(queryset) -> dict[str, str]:
    """
    Aggregate invoice money values safely.
    """
    totals = queryset.aggregate(
        subtotal=Sum("subtotal"),
        discount_amount=Sum("discount_amount"),
        taxable_amount=Sum("taxable_amount"),
        tax_amount=Sum("tax_amount"),
        total_amount=Sum("total_amount"),
        paid_amount=Sum("paid_amount"),
        balance_due=Sum("balance_due"),
    )

    return {
        "subtotal": _money_to_string(totals.get("subtotal")),
        "discount_amount": _money_to_string(totals.get("discount_amount")),
        "taxable_amount": _money_to_string(totals.get("taxable_amount")),
        "tax_amount": _money_to_string(totals.get("tax_amount")),
        "total_amount": _money_to_string(totals.get("total_amount")),
        "paid_amount": _money_to_string(totals.get("paid_amount")),
        "balance_due": _money_to_string(totals.get("balance_due")),
    }


def _status_breakdown(queryset) -> list[dict[str, Any]]:
    """
    Return count and totals grouped by invoice status.
    """
    rows = (
        queryset.values("status")
        .annotate(
            count=Count("id"),
            total_amount=Sum("total_amount"),
            balance_due=Sum("balance_due"),
        )
        .order_by("status")
    )

    return [
        {
            "status": row["status"],
            "count": row["count"],
            "total_amount": _money_to_string(row.get("total_amount")),
            "balance_due": _money_to_string(row.get("balance_due")),
        }
        for row in rows
    ]


def _payment_status_breakdown(queryset) -> list[dict[str, Any]]:
    """
    Return count and totals grouped by invoice payment status.
    """
    rows = (
        queryset.values("payment_status")
        .annotate(
            count=Count("id"),
            total_amount=Sum("total_amount"),
            paid_amount=Sum("paid_amount"),
            balance_due=Sum("balance_due"),
        )
        .order_by("payment_status")
    )

    return [
        {
            "payment_status": row["payment_status"],
            "count": row["count"],
            "total_amount": _money_to_string(row.get("total_amount")),
            "paid_amount": _money_to_string(row.get("paid_amount")),
            "balance_due": _money_to_string(row.get("balance_due")),
        }
        for row in rows
    ]


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoices_summary(request: Request) -> Response:
    """
    Return sales invoices summary for the current company only.

    Query params:
    - date_from
    - date_to
    - branch_id
    - customer_id
    """
    try:
        company = _get_request_company(request)
        today = timezone.localdate()

        queryset = _base_queryset(company, request)

        active_sales_queryset = queryset.filter(
            status=SalesInvoiceStatus.ISSUED,
        )

        unpaid_or_partial_queryset = queryset.filter(
            payment_status__in=[
                SalesInvoicePaymentStatus.UNPAID,
                SalesInvoicePaymentStatus.PARTIAL,
            ],
        ).exclude(
            status=SalesInvoiceStatus.CANCELLED,
        )

        overdue_queryset = unpaid_or_partial_queryset.filter(
            due_date__lt=today,
        )

        summary = {
            "total_invoices": queryset.count(),
            "draft_invoices": queryset.filter(status=SalesInvoiceStatus.DRAFT).count(),
            "issued_invoices": queryset.filter(status=SalesInvoiceStatus.ISSUED).count(),
            "cancelled_invoices": queryset.filter(status=SalesInvoiceStatus.CANCELLED).count(),
            "unpaid_invoices": queryset.filter(payment_status=SalesInvoicePaymentStatus.UNPAID).count(),
            "partial_invoices": queryset.filter(payment_status=SalesInvoicePaymentStatus.PARTIAL).count(),
            "paid_invoices": queryset.filter(payment_status=SalesInvoicePaymentStatus.PAID).count(),
            "overdue_invoices": overdue_queryset.count(),
            "all_totals": _aggregate_money(queryset),
            "issued_totals": _aggregate_money(active_sales_queryset),
            "outstanding_totals": _aggregate_money(unpaid_or_partial_queryset),
            "overdue_totals": _aggregate_money(overdue_queryset),
            "status_breakdown": _status_breakdown(queryset),
            "payment_status_breakdown": _payment_status_breakdown(queryset),
        }

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoices summary loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "customer_id": request.query_params.get("customer_id") or "",
                },
                "summary": summary,
                "data": summary,
            },
            status=200,
        )

    except SalesInvoiceSummaryAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )


company_sales_invoices_summary.required_company_permissions = [
    "company.sales.invoices.view",
]
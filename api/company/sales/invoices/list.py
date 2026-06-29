# ============================================================
# 📂 api/company/sales/invoices/list.py
# 🧠 Mhamcloud | Company Sales Invoices List API V1.0
# ------------------------------------------------------------
# ✅ List company-scoped sales invoices
# ✅ Search and filter invoices safely
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Explicit serialization through sales.services
# ✅ Pagination-ready response
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - هذا الملف مسؤول عن عرض قائمة فواتير المبيعات فقط
# - صلاحية العرض المطلوبة: company.sales.invoices.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import (
    SalesInvoice,
    SalesInvoicePaymentStatus,
    SalesInvoiceSource,
    SalesInvoiceStatus,
)
from sales.services import serialize_sales_invoice


class SalesInvoiceAPIError(Exception):
    """
    Small API-level error for sales invoice list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceAPIError("Current company context was not resolved.")

    return company


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _clean_text(value: Any) -> str:
    """
    Normalize query text.
    """
    return str(value or "").strip()


def _apply_invoice_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to sales invoice queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_text(request.query_params.get("status") or "").upper()
    payment_status = _clean_text(request.query_params.get("payment_status") or "").upper()
    source = _clean_text(request.query_params.get("source") or "").upper()
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    customer_id = _clean_text(request.query_params.get("customer_id") or "")
    date_from = _clean_text(request.query_params.get("date_from") or "")
    date_to = _clean_text(request.query_params.get("date_to") or "")
    due_from = _clean_text(request.query_params.get("due_from") or "")
    due_to = _clean_text(request.query_params.get("due_to") or "")

    if search:
        queryset = queryset.filter(
            Q(invoice_number__icontains=search)
            | Q(customer__display_name__icontains=search)
            | Q(customer__legal_name__icontains=search)
            | Q(customer__code__icontains=search)
            | Q(customer__phone__icontains=search)
            | Q(customer__mobile__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__branch_code__icontains=search)
            | Q(public_notes__icontains=search)
            | Q(internal_notes__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)

    if source:
        queryset = queryset.filter(source=source)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    if customer_id:
        queryset = queryset.filter(customer_id=customer_id)

    if date_from:
        queryset = queryset.filter(invoice_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(invoice_date__lte=date_to)

    if due_from:
        queryset = queryset.filter(due_date__gte=due_from)

    if due_to:
        queryset = queryset.filter(due_date__lte=due_to)

    return queryset


def _apply_invoice_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "invoice_date": "invoice_date",
        "-invoice_date": "-invoice_date",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "total_amount": "total_amount",
        "-total_amount": "-total_amount",
        "balance_due": "balance_due",
        "-balance_due": "-balance_due",
        "invoice_number": "invoice_number",
        "-invoice_number": "-invoice_number",
        "status": "status",
        "-status": "-status",
    }

    selected_ordering = allowed_ordering.get(ordering, "-invoice_date")

    if selected_ordering == "-invoice_date":
        return queryset.order_by("-invoice_date", "-id")

    return queryset.order_by(selected_ordering, "-id")


def serialize_sales_invoice_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in SalesInvoiceStatus.choices
        ],
        "payment_statuses": [
            {"value": value, "label": label}
            for value, label in SalesInvoicePaymentStatus.choices
        ],
        "sources": [
            {"value": value, "label": label}
            for value, label in SalesInvoiceSource.choices
        ],
        "ordering": [
            {"value": "-invoice_date", "label": "Newest invoice date"},
            {"value": "invoice_date", "label": "Oldest invoice date"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "-total_amount", "label": "Highest total"},
            {"value": "total_amount", "label": "Lowest total"},
            {"value": "-balance_due", "label": "Highest balance due"},
            {"value": "balance_due", "label": "Lowest balance due"},
            {"value": "invoice_number", "label": "Invoice number A-Z"},
            {"value": "-invoice_number", "label": "Invoice number Z-A"},
        ],
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoices_list(request: Request) -> Response:
    """
    List sales invoices for the current company only.

    Query params:
    - search / q
    - status: DRAFT | ISSUED | CANCELLED
    - payment_status: UNPAID | PARTIAL | PAID
    - source: MANUAL | POS | ONLINE | IMPORT | API
    - branch_id
    - customer_id
    - date_from / date_to
    - due_from / due_to
    - ordering
    - page
    - page_size
    """
    try:
        company = _get_request_company(request)

        page = _clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = _clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get("per_page"),
            default=25,
            maximum=100,
        )

        ordering = _clean_text(
            request.query_params.get("ordering")
            or request.query_params.get("order_by")
            or "-invoice_date"
        )

        queryset = (
            SalesInvoice.objects.select_related(
                "company",
                "branch",
                "customer",
                "created_by",
                "updated_by",
            )
            .filter(company=company)
        )

        queryset = _apply_invoice_filters(queryset, request)
        queryset = _apply_invoice_ordering(queryset, ordering)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        invoices = [
            serialize_sales_invoice(invoice, include_items=False)
            for invoice in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoices loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "payment_status": request.query_params.get("payment_status") or "",
                    "source": request.query_params.get("source") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "customer_id": request.query_params.get("customer_id") or "",
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "due_from": request.query_params.get("due_from") or "",
                    "due_to": request.query_params.get("due_to") or "",
                    "ordering": ordering,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": invoices,
                "results": invoices,
                "choices": serialize_sales_invoice_choices(),
            },
            status=200,
        )

    except SalesInvoiceAPIError as exc:
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


company_sales_invoices_list.required_company_permissions = [
    "company.sales.invoices.view",
]
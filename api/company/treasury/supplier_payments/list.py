# ============================================================
# 📂 api/company/treasury/supplier_payments/list.py
# 🧠 PrimeyAcc | Company Treasury Supplier Payments List/Create API V1.0
# ------------------------------------------------------------
# ✅ List supplier payments for current company only
# ✅ Create draft/confirmed supplier payments
# ✅ Tenant isolation through request.company
# ✅ Uses treasury/services.py payment layer
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إنشاء دفعة مؤكدة يؤكدها عبر services.py ويحدث الخزينة
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db.models import Q, QuerySet
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.models import PaymentMethod, PaymentStatus, SupplierPayment
from treasury.services import (
    create_supplier_payment,
    get_supplier_payments_queryset,
    get_treasury_account_or_raise,
)


class SupplierPaymentsAPIError(Exception):
    """
    Small API-level error for supplier payments endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise SupplierPaymentsAPIError("Current company context was not resolved.")

    return company


def _decimal_to_string(value: Any) -> str:
    if value is None:
        return "0.00"

    if hasattr(value, "quantize"):
        from decimal import Decimal

        return str(value.quantize(Decimal("0.01")))

    return str(value)


def serialize_supplier_payment(payment: SupplierPayment) -> dict[str, Any]:
    treasury_transaction = payment.treasury_transaction

    return {
        "id": payment.id,
        "company_id": payment.company_id,
        "payment_number": payment.payment_number,
        "supplier_id": payment.supplier_id,
        "supplier_name": payment.supplier_name,
        "supplier_phone": payment.supplier_phone,
        "purchase_bill_id": payment.purchase_bill_id,
        "purchase_bill_number": getattr(payment.purchase_bill, "bill_number", ""),
        "treasury_account_id": payment.treasury_account_id,
        "treasury_account_name": getattr(payment.treasury_account, "name", ""),
        "treasury_transaction_id": payment.treasury_transaction_id,
        "treasury_transaction_number": getattr(treasury_transaction, "transaction_number", ""),
        "amount": _decimal_to_string(payment.amount),
        "currency": payment.currency,
        "payment_method": payment.payment_method,
        "payment_method_label": payment.get_payment_method_display(),
        "status": payment.status,
        "status_label": payment.get_status_display(),
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "reference": payment.reference,
        "description": payment.description,
        "notes": payment.notes,
        "confirmed_at": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
        "confirmed_by_id": payment.confirmed_by_id,
        "cancelled_at": payment.cancelled_at.isoformat() if payment.cancelled_at else None,
        "cancelled_by_id": payment.cancelled_by_id,
        "cancellation_reason": payment.cancellation_reason,
        "accounting_entry_id": payment.accounting_entry_id,
        "is_accounting_posted": payment.is_accounting_posted,
        "accounting_posted_at": (
            payment.accounting_posted_at.isoformat() if payment.accounting_posted_at else None
        ),
        "created_by_id": payment.created_by_id,
        "updated_by_id": payment.updated_by_id,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
    }


def _apply_filters(queryset: QuerySet[SupplierPayment], request: Request) -> QuerySet[SupplierPayment]:
    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().upper()
    payment_method = (request.GET.get("payment_method") or "").strip().upper()
    treasury_account_id = (request.GET.get("treasury_account_id") or "").strip()
    supplier_id = (request.GET.get("supplier_id") or "").strip()
    purchase_bill_id = (request.GET.get("purchase_bill_id") or "").strip()
    date_from = parse_date((request.GET.get("date_from") or "").strip())
    date_to = parse_date((request.GET.get("date_to") or "").strip())
    is_accounting_posted = (request.GET.get("is_accounting_posted") or "").strip().lower()

    if search:
        queryset = queryset.filter(
            Q(payment_number__icontains=search)
            | Q(reference__icontains=search)
            | Q(description__icontains=search)
            | Q(notes__icontains=search)
            | Q(supplier_name__icontains=search)
            | Q(supplier_phone__icontains=search)
            | Q(treasury_account__name__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if payment_method:
        queryset = queryset.filter(payment_method=payment_method)

    if treasury_account_id.isdigit():
        queryset = queryset.filter(treasury_account_id=int(treasury_account_id))

    if supplier_id.isdigit():
        queryset = queryset.filter(supplier_id=int(supplier_id))

    if purchase_bill_id.isdigit():
        queryset = queryset.filter(purchase_bill_id=int(purchase_bill_id))

    if date_from:
        queryset = queryset.filter(payment_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(payment_date__lte=date_to)

    if is_accounting_posted in {"true", "1", "yes"}:
        queryset = queryset.filter(is_accounting_posted=True)
    elif is_accounting_posted in {"false", "0", "no"}:
        queryset = queryset.filter(is_accounting_posted=False)

    return queryset


def _apply_ordering(queryset: QuerySet[SupplierPayment], request: Request) -> QuerySet[SupplierPayment]:
    ordering = (request.GET.get("ordering") or "-payment_date").strip()

    allowed_ordering = {
        "payment_date",
        "-payment_date",
        "created_at",
        "-created_at",
        "amount",
        "-amount",
        "payment_number",
        "-payment_number",
        "status",
        "-status",
    }

    if ordering not in allowed_ordering:
        ordering = "-payment_date"

    return queryset.order_by(ordering, "-id")


def _paginate(queryset: QuerySet[SupplierPayment], request: Request) -> tuple[list[SupplierPayment], dict[str, Any]]:
    try:
        page = max(int(request.GET.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.GET.get("page_size", 20))
    except (TypeError, ValueError):
        page_size = 20

    page_size = min(max(page_size, 1), 100)
    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page)

    return list(page_obj.object_list), {
        "page": page_obj.number,
        "page_size": page_size,
        "num_pages": paginator.num_pages,
        "count": paginator.count,
        "has_next": page_obj.has_next(),
        "has_previous": page_obj.has_previous(),
    }


def _choices_payload() -> dict[str, Any]:
    return {
        "payment_methods": [
            {"value": value, "label": label}
            for value, label in PaymentMethod.choices
        ],
        "statuses": [
            {"value": value, "label": label}
            for value, label in PaymentStatus.choices
        ],
    }


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def supplier_payments_list(request: Request) -> Response:
    """
    GET /api/company/treasury/supplier-payments/
    POST /api/company/treasury/supplier-payments/
    """
    try:
        company = _get_request_company(request)

        if request.method == "GET":
            queryset = get_supplier_payments_queryset(company)
            queryset = _apply_filters(queryset, request)
            queryset = _apply_ordering(queryset, request)
            items, pagination = _paginate(queryset, request)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Supplier payments loaded successfully.",
                    "count": pagination["count"],
                    "pagination": pagination,
                    "results": [serialize_supplier_payment(item) for item in items],
                    "choices": _choices_payload(),
                },
                status=200,
            )

        payload = request.data or {}

        treasury_account_id = payload.get("treasury_account_id") or payload.get("account_id")
        if not treasury_account_id:
            raise SupplierPaymentsAPIError("treasury_account_id is required.")

        treasury_account = get_treasury_account_or_raise(company, int(treasury_account_id))

        payment_date = parse_date(str(payload.get("payment_date") or "")) or None

        payment = create_supplier_payment(
            company=company,
            treasury_account=treasury_account,
            user=request.user,
            amount=payload.get("amount"),
            payment_method=payload.get("payment_method") or PaymentMethod.CASH,
            payment_date=payment_date,
            supplier_id=payload.get("supplier_id"),
            supplier_name=payload.get("supplier_name", ""),
            supplier_phone=payload.get("supplier_phone", ""),
            purchase_bill=None,
            currency=payload.get("currency"),
            payment_number=payload.get("payment_number", ""),
            reference=payload.get("reference", ""),
            description=payload.get("description", ""),
            notes=payload.get("notes", ""),
            status=payload.get("status") or PaymentStatus.DRAFT,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Supplier payment created successfully.",
                "item": serialize_supplier_payment(payment),
            },
            status=201,
        )

    except SupplierPaymentsAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except (ValidationError, ValueError) as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Supplier payment request is invalid.",
                "errors": getattr(exc, "message_dict", None) or {"detail": str(exc)},
            },
            status=400,
        )


supplier_payments_list.required_company_permissions = [
    "company.treasury.supplier_payments.view",
    "company.treasury.supplier_payments.create",
]
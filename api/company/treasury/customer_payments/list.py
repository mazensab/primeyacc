# ============================================================
# 📂 api/company/treasury/customer_payments/list.py
# 🧠 Mhamcloud | Company Treasury Customer Payments List/Create API V1.1
# ------------------------------------------------------------
# ✅ List customer payments for current company only
# ✅ Create draft/confirmed customer payments
# ✅ Expose treasury transaction status and number
# ✅ Expose accounting posting status, journal number, and journal status
# ✅ Expose linked SalesInvoice payment allocation snapshot
# ✅ Tenant isolation through request.company
# ✅ Uses treasury/services.py payment layer
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إنشاء دفعة مؤكدة يؤكدها عبر services.py ويحدث الخزينة
# - ترحيل الدفعة محاسبيًا يتم من طبقة الخدمات وليس من الواجهة
# - sales_invoice_id إن وجد يجب أن يكون داخل نفس الشركة فقط
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
from treasury.models import CustomerPayment, PaymentMethod, PaymentStatus
from treasury.services import (
    create_customer_payment,
    get_customer_payments_queryset,
    get_sales_invoice_or_raise,
    get_treasury_account_or_raise,
)


class CustomerPaymentsAPIError(Exception):
    """
    Small API-level error for customer payments endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise CustomerPaymentsAPIError("Current company context was not resolved.")

    return company


def _decimal_to_string(value: Any) -> str:
    if value is None:
        return "0.00"

    if hasattr(value, "quantize"):
        from decimal import Decimal

        return str(value.quantize(Decimal("0.01")))

    return str(value)


def _datetime_to_string(value: Any) -> str | None:
    return value.isoformat() if value else None


def _date_to_string(value: Any) -> str | None:
    return value.isoformat() if value else None


def _get_user_display(user: Any) -> str:
    if not user:
        return ""

    full_name = ""
    if hasattr(user, "get_full_name"):
        full_name = user.get_full_name() or ""

    return full_name or getattr(user, "username", "") or getattr(user, "email", "") or ""


def _serialize_accounting_entry(entry: Any) -> dict[str, Any]:
    if not entry:
        return {
            "id": None,
            "entry_number": "",
            "status": "",
            "entry_date": None,
            "posted_at": None,
            "reversal_of_id": None,
            "reversal_entry_id": None,
        }

    reversal_entry = getattr(entry, "reversal_entries", None)
    latest_reversal = reversal_entry.order_by("-id").first() if reversal_entry is not None else None

    return {
        "id": entry.id,
        "entry_number": getattr(entry, "entry_number", ""),
        "status": getattr(entry, "status", ""),
        "entry_date": _date_to_string(getattr(entry, "entry_date", None)),
        "posted_at": _datetime_to_string(getattr(entry, "posted_at", None)),
        "reversal_of_id": getattr(entry, "reversal_of_id", None),
        "reversal_entry_id": getattr(latest_reversal, "id", None),
        "reversal_entry_number": getattr(latest_reversal, "entry_number", ""),
        "reversal_entry_status": getattr(latest_reversal, "status", ""),
    }


def _serialize_treasury_transaction(transaction: Any) -> dict[str, Any]:
    if not transaction:
        return {
            "id": None,
            "transaction_number": "",
            "status": "",
            "transaction_type": "",
            "source_type": "",
            "source_app": "",
            "source_model": "",
            "source_object_id": None,
            "amount": "0.00",
            "balance_before": "0.00",
            "balance_after": "0.00",
            "posted_at": None,
            "cancelled_at": None,
            "cancellation_reason": "",
            "accounting_entry_id": None,
            "is_accounting_posted": False,
        }

    return {
        "id": transaction.id,
        "transaction_number": getattr(transaction, "transaction_number", ""),
        "status": getattr(transaction, "status", ""),
        "transaction_type": getattr(transaction, "transaction_type", ""),
        "source_type": getattr(transaction, "source_type", ""),
        "source_app": getattr(transaction, "source_app", ""),
        "source_model": getattr(transaction, "source_model", ""),
        "source_object_id": getattr(transaction, "source_object_id", None),
        "amount": _decimal_to_string(getattr(transaction, "amount", None)),
        "balance_before": _decimal_to_string(getattr(transaction, "balance_before", None)),
        "balance_after": _decimal_to_string(getattr(transaction, "balance_after", None)),
        "posted_at": _datetime_to_string(getattr(transaction, "posted_at", None)),
        "posted_by_id": getattr(transaction, "posted_by_id", None),
        "cancelled_at": _datetime_to_string(getattr(transaction, "cancelled_at", None)),
        "cancelled_by_id": getattr(transaction, "cancelled_by_id", None),
        "cancellation_reason": getattr(transaction, "cancellation_reason", ""),
        "accounting_entry_id": getattr(transaction, "accounting_entry_id", None),
        "is_accounting_posted": bool(getattr(transaction, "is_accounting_posted", False)),
    }


def _serialize_sales_invoice(invoice: Any) -> dict[str, Any]:
    if not invoice:
        return {
            "id": None,
            "invoice_number": "",
            "status": "",
            "payment_status": "",
            "total_amount": "0.00",
            "paid_amount": "0.00",
            "balance_due": "0.00",
            "issue_date": None,
            "due_date": None,
            "customer_name": "",
        }

    return {
        "id": invoice.id,
        "invoice_number": getattr(invoice, "invoice_number", ""),
        "status": getattr(invoice, "status", ""),
        "payment_status": getattr(invoice, "payment_status", ""),
        "total_amount": _decimal_to_string(getattr(invoice, "total_amount", None)),
        "paid_amount": _decimal_to_string(getattr(invoice, "paid_amount", None)),
        "balance_due": _decimal_to_string(getattr(invoice, "balance_due", None)),
        "issue_date": _date_to_string(getattr(invoice, "issue_date", None)),
        "due_date": _date_to_string(getattr(invoice, "due_date", None)),
        "customer_name": getattr(invoice, "customer_name", ""),
    }


def serialize_customer_payment(payment: CustomerPayment) -> dict[str, Any]:
    treasury_transaction = payment.treasury_transaction
    accounting_entry = payment.accounting_entry
    sales_invoice = payment.sales_invoice

    accounting_payload = _serialize_accounting_entry(accounting_entry)
    transaction_payload = _serialize_treasury_transaction(treasury_transaction)
    invoice_payload = _serialize_sales_invoice(sales_invoice)

    return {
        "id": payment.id,
        "company_id": payment.company_id,
        "payment_number": payment.payment_number,
        "customer_id": payment.customer_id,
        "customer_name": payment.customer_name,
        "customer_phone": payment.customer_phone,

        # Sales invoice flat fields
        "sales_invoice_id": payment.sales_invoice_id,
        "sales_invoice_number": invoice_payload["invoice_number"],
        "invoice_number": invoice_payload["invoice_number"],
        "invoice_status": invoice_payload["status"],
        "invoice_payment_status": invoice_payload["payment_status"],
        "invoice_total_amount": invoice_payload["total_amount"],
        "invoice_paid_amount": invoice_payload["paid_amount"],
        "invoice_balance_due": invoice_payload["balance_due"],

        # Sales invoice nested snapshot
        "sales_invoice": invoice_payload,

        # Treasury account fields
        "treasury_account_id": payment.treasury_account_id,
        "treasury_account_name": getattr(payment.treasury_account, "name", ""),
        "treasury_account_type": getattr(payment.treasury_account, "account_type", ""),
        "treasury_account_currency": getattr(payment.treasury_account, "currency", ""),

        # Treasury transaction flat fields
        "treasury_transaction_id": payment.treasury_transaction_id,
        "treasury_transaction_number": transaction_payload["transaction_number"],
        "treasury_transaction_status": transaction_payload["status"],
        "treasury_transaction_type": transaction_payload["transaction_type"],
        "treasury_transaction": transaction_payload,

        # Payment core fields
        "amount": _decimal_to_string(payment.amount),
        "currency": payment.currency,
        "payment_method": payment.payment_method,
        "payment_method_label": payment.get_payment_method_display(),
        "status": payment.status,
        "status_label": payment.get_status_display(),
        "payment_date": _date_to_string(payment.payment_date),
        "reference": payment.reference,
        "description": payment.description,
        "notes": payment.notes,

        # Confirmation/cancellation fields
        "confirmed_at": _datetime_to_string(payment.confirmed_at),
        "confirmed_by_id": payment.confirmed_by_id,
        "confirmed_by_name": _get_user_display(payment.confirmed_by),
        "cancelled_at": _datetime_to_string(payment.cancelled_at),
        "cancelled_by_id": payment.cancelled_by_id,
        "cancelled_by_name": _get_user_display(payment.cancelled_by),
        "cancellation_reason": payment.cancellation_reason,

        # Accounting flat fields
        "accounting_entry_id": payment.accounting_entry_id,
        "accounting_entry_number": accounting_payload["entry_number"],
        "accounting_entry_status": accounting_payload["status"],
        "accounting_entry_date": accounting_payload["entry_date"],
        "accounting_entry_posted_at": accounting_payload["posted_at"],
        "accounting_reversal_entry_id": accounting_payload["reversal_entry_id"],
        "accounting_reversal_entry_number": accounting_payload["reversal_entry_number"],
        "accounting_reversal_entry_status": accounting_payload["reversal_entry_status"],
        "is_accounting_posted": payment.is_accounting_posted,
        "accounting_posted_at": _datetime_to_string(payment.accounting_posted_at),
        "accounting_entry": accounting_payload,

        # Audit fields
        "created_by_id": payment.created_by_id,
        "created_by_name": _get_user_display(payment.created_by),
        "updated_by_id": payment.updated_by_id,
        "updated_by_name": _get_user_display(payment.updated_by),
        "created_at": _datetime_to_string(payment.created_at),
        "updated_at": _datetime_to_string(payment.updated_at),
    }


def _apply_filters(queryset: QuerySet[CustomerPayment], request: Request) -> QuerySet[CustomerPayment]:
    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().upper()
    payment_method = (request.GET.get("payment_method") or "").strip().upper()
    treasury_account_id = (request.GET.get("treasury_account_id") or "").strip()
    customer_id = (request.GET.get("customer_id") or "").strip()
    sales_invoice_id = (request.GET.get("sales_invoice_id") or "").strip()
    accounting_entry_id = (request.GET.get("accounting_entry_id") or "").strip()
    treasury_transaction_id = (request.GET.get("treasury_transaction_id") or "").strip()
    transaction_status = (request.GET.get("treasury_transaction_status") or "").strip().upper()
    invoice_payment_status = (request.GET.get("invoice_payment_status") or "").strip().upper()
    date_from = parse_date((request.GET.get("date_from") or "").strip())
    date_to = parse_date((request.GET.get("date_to") or "").strip())
    is_accounting_posted = (request.GET.get("is_accounting_posted") or "").strip().lower()

    if search:
        queryset = queryset.filter(
            Q(payment_number__icontains=search)
            | Q(reference__icontains=search)
            | Q(description__icontains=search)
            | Q(notes__icontains=search)
            | Q(customer_name__icontains=search)
            | Q(customer_phone__icontains=search)
            | Q(treasury_account__name__icontains=search)
            | Q(treasury_transaction__transaction_number__icontains=search)
            | Q(accounting_entry__entry_number__icontains=search)
            | Q(sales_invoice__invoice_number__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if payment_method:
        queryset = queryset.filter(payment_method=payment_method)

    if treasury_account_id.isdigit():
        queryset = queryset.filter(treasury_account_id=int(treasury_account_id))

    if customer_id.isdigit():
        queryset = queryset.filter(customer_id=int(customer_id))

    if sales_invoice_id.isdigit():
        queryset = queryset.filter(sales_invoice_id=int(sales_invoice_id))

    if accounting_entry_id.isdigit():
        queryset = queryset.filter(accounting_entry_id=int(accounting_entry_id))

    if treasury_transaction_id.isdigit():
        queryset = queryset.filter(treasury_transaction_id=int(treasury_transaction_id))

    if transaction_status:
        queryset = queryset.filter(treasury_transaction__status=transaction_status)

    if invoice_payment_status:
        queryset = queryset.filter(sales_invoice__payment_status=invoice_payment_status)

    if date_from:
        queryset = queryset.filter(payment_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(payment_date__lte=date_to)

    if is_accounting_posted in {"true", "1", "yes"}:
        queryset = queryset.filter(is_accounting_posted=True)
    elif is_accounting_posted in {"false", "0", "no"}:
        queryset = queryset.filter(is_accounting_posted=False)

    return queryset


def _apply_ordering(queryset: QuerySet[CustomerPayment], request: Request) -> QuerySet[CustomerPayment]:
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
        "accounting_posted_at",
        "-accounting_posted_at",
        "confirmed_at",
        "-confirmed_at",
        "cancelled_at",
        "-cancelled_at",
    }

    if ordering not in allowed_ordering:
        ordering = "-payment_date"

    return queryset.order_by(ordering, "-id")


def _paginate(
    queryset: QuerySet[CustomerPayment],
    request: Request,
) -> tuple[list[CustomerPayment], dict[str, Any]]:
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
        "boolean_filters": [
            {"value": "true", "label": "Yes"},
            {"value": "false", "label": "No"},
        ],
    }


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def customer_payments_list(request: Request) -> Response:
    """
    GET /api/company/treasury/customer-payments/
    POST /api/company/treasury/customer-payments/
    """
    try:
        company = _get_request_company(request)

        if request.method == "GET":
            queryset = get_customer_payments_queryset(company)
            queryset = _apply_filters(queryset, request)
            queryset = _apply_ordering(queryset, request)
            items, pagination = _paginate(queryset, request)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Customer payments loaded successfully.",
                    "count": pagination["count"],
                    "pagination": pagination,
                    "results": [serialize_customer_payment(item) for item in items],
                    "choices": _choices_payload(),
                },
                status=200,
            )

        payload = request.data or {}

        treasury_account_id = payload.get("treasury_account_id") or payload.get("account_id")
        if not treasury_account_id:
            raise CustomerPaymentsAPIError("treasury_account_id is required.")

        treasury_account = get_treasury_account_or_raise(company, int(treasury_account_id))

        sales_invoice = None
        sales_invoice_id = payload.get("sales_invoice_id") or payload.get("invoice_id")
        if sales_invoice_id not in (None, ""):
            sales_invoice = get_sales_invoice_or_raise(company, int(sales_invoice_id))

        payment_date = parse_date(str(payload.get("payment_date") or "")) or None

        payment = create_customer_payment(
            company=company,
            treasury_account=treasury_account,
            user=request.user,
            amount=payload.get("amount"),
            payment_method=payload.get("payment_method") or PaymentMethod.CASH,
            payment_date=payment_date,
            customer_id=payload.get("customer_id"),
            customer_name=payload.get("customer_name", ""),
            customer_phone=payload.get("customer_phone", ""),
            sales_invoice=sales_invoice,
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
                "message": "Customer payment created successfully.",
                "item": serialize_customer_payment(payment),
            },
            status=201,
        )

    except CustomerPaymentsAPIError as exc:
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
                "message": "Customer payment request is invalid.",
                "errors": getattr(exc, "message_dict", None) or {"detail": str(exc)},
            },
            status=400,
        )


customer_payments_list.required_company_permissions = [
    "company.treasury.customer_payments.view",
    "company.treasury.customer_payments.create",
]
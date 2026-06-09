# ============================================================
# 📂 api/company/pos/orders/list.py
# 🧠 PrimeyAcc | Company POS Orders List API V1.1
# ------------------------------------------------------------
# ✅ List POS orders for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, status, payment status, session, register and date filters
# ✅ Safe pagination and ordering
# ✅ Summary payload without relying on non-existing remaining_amount field
# ✅ Compatible with actual POSOrderStatus choices
# ✅ Choices payload for frontend filters/forms
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - لا يتم إنشاء أو إلغاء أو دفع Order من list API
# - صلاحية العرض المطلوبة: company.pos.orders.view
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q, Sum
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSOrder, POSOrderStatus, POSPaymentStatus


class POSOrderListAPIError(Exception):
    """
    Small API-level error for POS orders list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderListAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize query text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like query text.
    """
    return _clean_text(value).upper()


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


def _decimal_to_string(value: Any) -> str:
    """
    Serialize decimal-like values safely.
    """
    if value is None:
        value = Decimal("0.00")

    return str(value)


def _safe_iso(value: Any):
    """
    Return ISO formatted date/datetime safely.
    """
    if not value:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def _safe_display_name(obj) -> str:
    """
    Return a safe display name for related models.
    """
    if not obj:
        return ""

    return (
        getattr(obj, "display_name", None)
        or getattr(obj, "name_ar", "")
        or getattr(obj, "name_en", "")
        or getattr(obj, "name", "")
        or str(obj)
    )


def _serialize_user(user) -> dict[str, Any] | None:
    """
    Serialize user safely.
    """
    if not user:
        return None

    return {
        "id": user.id,
        "username": getattr(user, "username", ""),
        "email": getattr(user, "email", ""),
    }


def _enum_value(enum_class, name: str, fallback: str) -> str:
    """
    Return enum value safely when a choice attribute may not exist.
    """
    return getattr(enum_class, name, fallback)


def _status_exists(status_value: str) -> bool:
    """
    Check whether POSOrderStatus contains a specific value.
    """
    return status_value in [value for value, _label in POSOrderStatus.choices]


def _payment_status_exists(status_value: str) -> bool:
    """
    Check whether POSPaymentStatus contains a specific value.
    """
    return status_value in [value for value, _label in POSPaymentStatus.choices]


def _calculate_remaining_amount(order) -> Decimal:
    """
    Calculate remaining amount safely because POSOrder has no remaining_amount field.
    """
    total_amount = Decimal(str(getattr(order, "total_amount", Decimal("0.00")) or "0.00"))
    paid_amount = Decimal(str(getattr(order, "paid_amount", Decimal("0.00")) or "0.00"))
    remaining = total_amount - paid_amount

    if remaining < Decimal("0.00"):
        return Decimal("0.00")

    return remaining


def serialize_pos_order(order: POSOrder, include_lines: bool = False) -> dict[str, Any]:
    """
    Serialize POS order for company APIs.
    """
    session = getattr(order, "session", None)
    register = getattr(order, "register", None) or getattr(session, "register", None)
    branch = getattr(order, "branch", None) or getattr(register, "branch", None)
    warehouse = getattr(order, "warehouse", None) or getattr(session, "warehouse", None)
    treasury_account = (
        getattr(order, "treasury_account", None)
        or getattr(session, "treasury_account", None)
        or getattr(register, "treasury_account", None)
    )

    customer = getattr(order, "customer", None)
    cashier = (
        getattr(order, "cashier", None)
        or getattr(order, "created_by", None)
        or getattr(session, "opened_by", None)
    )

    order_status = getattr(order, "status", "")
    cancelled_status = _enum_value(POSOrderStatus, "CANCELLED", "CANCELLED")
    draft_status = _enum_value(POSOrderStatus, "DRAFT", "DRAFT")
    completed_status = _enum_value(POSOrderStatus, "COMPLETED", "COMPLETED")
    confirmed_status = _enum_value(POSOrderStatus, "CONFIRMED", completed_status)

    add_payment_statuses = [draft_status, completed_status, confirmed_status]
    add_payment_statuses = list(dict.fromkeys(add_payment_statuses))

    payload = {
        "id": order.id,
        "order_number": getattr(order, "order_number", ""),
        "status": order_status,
        "status_label": order.get_status_display()
        if hasattr(order, "get_status_display")
        else order_status,
        "payment_status": getattr(order, "payment_status", ""),
        "payment_status_label": order.get_payment_status_display()
        if hasattr(order, "get_payment_status_display")
        else getattr(order, "payment_status", ""),
        "session": {
            "id": session.id if session else None,
            "session_number": getattr(session, "session_number", "") if session else "",
            "status": getattr(session, "status", "") if session else "",
        }
        if session
        else None,
        "register": {
            "id": register.id if register else None,
            "name": _safe_display_name(register),
            "display_name": getattr(register, "display_name", "") if register else "",
            "code": getattr(register, "code", "") if register else "",
        }
        if register
        else None,
        "branch": {
            "id": branch.id if branch else None,
            "name": _safe_display_name(branch),
            "code": getattr(branch, "branch_code", "") if branch else "",
        }
        if branch
        else None,
        "warehouse": {
            "id": warehouse.id if warehouse else None,
            "name": _safe_display_name(warehouse),
            "code": getattr(warehouse, "code", "") if warehouse else "",
        }
        if warehouse
        else None,
        "treasury_account": {
            "id": treasury_account.id if treasury_account else None,
            "name": _safe_display_name(treasury_account),
            "code": getattr(treasury_account, "code", "") if treasury_account else "",
        }
        if treasury_account
        else None,
        "customer": {
            "id": customer.id if customer else None,
            "name": _safe_display_name(customer),
            "code": getattr(customer, "code", "") if customer else "",
            "phone": getattr(customer, "phone", "") if customer else "",
        }
        if customer
        else None,
        "cashier": _serialize_user(cashier),
        "subtotal_amount": _decimal_to_string(
            getattr(order, "subtotal_amount", Decimal("0.00"))
        ),
        "discount_amount": _decimal_to_string(
            getattr(order, "discount_amount", Decimal("0.00"))
        ),
        "taxable_amount": _decimal_to_string(
            getattr(order, "taxable_amount", Decimal("0.00"))
        ),
        "tax_amount": _decimal_to_string(
            getattr(order, "tax_amount", Decimal("0.00"))
        ),
        "total_amount": _decimal_to_string(
            getattr(order, "total_amount", Decimal("0.00"))
        ),
        "paid_amount": _decimal_to_string(
            getattr(order, "paid_amount", Decimal("0.00"))
        ),
        "remaining_amount": _decimal_to_string(_calculate_remaining_amount(order)),
        "change_amount": _decimal_to_string(
            getattr(order, "change_amount", Decimal("0.00"))
        ),
        "notes": getattr(order, "notes", ""),
        "created_at": _safe_iso(getattr(order, "created_at", None)),
        "updated_at": _safe_iso(getattr(order, "updated_at", None)),
        "allowed_actions": {
            "view": True,
            "add_item": order_status == draft_status,
            "add_payment": order_status in add_payment_statuses
            and order_status != cancelled_status,
            "cancel": order_status != cancelled_status,
        },
    }

    if include_lines:
        payload["lines"] = []
        lines_manager = getattr(order, "items", None) or getattr(order, "lines", None)

        if lines_manager is not None:
            try:
                order_lines = lines_manager.all()
            except Exception:
                order_lines = []

            payload["lines"] = [
                serialize_pos_order_item(line)
                for line in order_lines
            ]

    return payload


def serialize_pos_order_item(item) -> dict[str, Any]:
    """
    Serialize POS order item safely.
    """
    catalog_item = getattr(item, "catalog_item", None)

    return {
        "id": item.id,
        "catalog_item": {
            "id": catalog_item.id if catalog_item else None,
            "name": _safe_display_name(catalog_item),
            "code": getattr(catalog_item, "code", "") if catalog_item else "",
            "sku": getattr(catalog_item, "sku", "") if catalog_item else "",
            "barcode": getattr(catalog_item, "barcode", "") if catalog_item else "",
        }
        if catalog_item
        else None,
        "item_code": getattr(item, "item_code", ""),
        "item_sku": getattr(item, "item_sku", ""),
        "item_barcode": getattr(item, "item_barcode", ""),
        "item_name": getattr(item, "item_name", ""),
        "quantity": _decimal_to_string(getattr(item, "quantity", Decimal("0.00"))),
        "unit_price": _decimal_to_string(getattr(item, "unit_price", Decimal("0.00"))),
        "discount_amount": _decimal_to_string(
            getattr(item, "discount_amount", Decimal("0.00"))
        ),
        "taxable_amount": _decimal_to_string(
            getattr(item, "taxable_amount", Decimal("0.00"))
        ),
        "tax_amount": _decimal_to_string(getattr(item, "tax_amount", Decimal("0.00"))),
        "line_total": _decimal_to_string(getattr(item, "line_total", Decimal("0.00"))),
    }


def serialize_pos_order_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in POSOrderStatus.choices
        ],
        "payment_statuses": [
            {"value": value, "label": label}
            for value, label in POSPaymentStatus.choices
        ],
        "ordering": [
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "order_number", "label": "Order number A-Z"},
            {"value": "-order_number", "label": "Order number Z-A"},
            {"value": "-total_amount", "label": "Highest total"},
            {"value": "total_amount", "label": "Lowest total"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
        ],
    }


def get_pos_orders_queryset(company):
    """
    Return company-scoped POS orders queryset.
    """
    return POSOrder.objects.filter(company=company)


def _apply_pos_order_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to POS orders queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_upper(request.query_params.get("status") or "")
    payment_status = _clean_upper(request.query_params.get("payment_status") or "")
    session_id = _clean_text(request.query_params.get("session_id") or "")
    register_id = _clean_text(request.query_params.get("register_id") or "")
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    date_from = _clean_text(request.query_params.get("date_from") or "")
    date_to = _clean_text(request.query_params.get("date_to") or "")

    if search:
        queryset = queryset.filter(
            Q(order_number__icontains=search)
            | Q(status__icontains=search)
            | Q(payment_status__icontains=search)
            | Q(session__session_number__icontains=search)
            | Q(register__name__icontains=search)
            | Q(register__code__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)

    if session_id:
        queryset = queryset.filter(session_id=session_id)

    if register_id:
        queryset = queryset.filter(register_id=register_id)

    if branch_id:
        queryset = queryset.filter(
            Q(branch_id=branch_id) | Q(register__branch_id=branch_id)
        )

    parsed_date_from = parse_date(date_from) if date_from else None
    parsed_date_to = parse_date(date_to) if date_to else None

    if parsed_date_from:
        queryset = queryset.filter(created_at__date__gte=parsed_date_from)

    if parsed_date_to:
        queryset = queryset.filter(created_at__date__lte=parsed_date_to)

    return queryset


def _apply_pos_order_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "-created_at": "-created_at",
        "created_at": "created_at",
        "order_number": "order_number",
        "-order_number": "-order_number",
        "-total_amount": "-total_amount",
        "total_amount": "total_amount",
        "status": "status",
        "-status": "-status",
        "payment_status": "payment_status",
        "-payment_status": "-payment_status",
    }

    selected_ordering = allowed_ordering.get(ordering, "-created_at")
    return queryset.order_by(selected_ordering, "-id")


def _build_pos_order_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for filtered POS orders queryset.
    """
    totals = queryset.aggregate(
        subtotal_total=Sum("subtotal_amount"),
        discount_total=Sum("discount_amount"),
        tax_total=Sum("tax_amount"),
        sales_total=Sum("total_amount"),
        paid_total=Sum("paid_amount"),
    )

    sales_total = totals.get("sales_total") or Decimal("0.00")
    paid_total = totals.get("paid_total") or Decimal("0.00")
    remaining_total = sales_total - paid_total

    if remaining_total < Decimal("0.00"):
        remaining_total = Decimal("0.00")

    draft_status = _enum_value(POSOrderStatus, "DRAFT", "DRAFT")
    cancelled_status = _enum_value(POSOrderStatus, "CANCELLED", "CANCELLED")
    completed_status = _enum_value(POSOrderStatus, "COMPLETED", "COMPLETED")
    paid_status = _enum_value(POSPaymentStatus, "PAID", "PAID")
    unpaid_status = _enum_value(POSPaymentStatus, "UNPAID", "UNPAID")

    return {
        "total_orders": queryset.count(),
        "draft_orders": queryset.filter(status=draft_status).count()
        if _status_exists(draft_status)
        else 0,
        "completed_orders": queryset.filter(status=completed_status).count()
        if _status_exists(completed_status)
        else 0,
        "cancelled_orders": queryset.filter(status=cancelled_status).count()
        if _status_exists(cancelled_status)
        else 0,
        "paid_orders": queryset.filter(payment_status=paid_status).count()
        if _payment_status_exists(paid_status)
        else 0,
        "unpaid_orders": queryset.filter(payment_status=unpaid_status).count()
        if _payment_status_exists(unpaid_status)
        else 0,
        "subtotal_total": _decimal_to_string(totals.get("subtotal_total")),
        "discount_total": _decimal_to_string(totals.get("discount_total")),
        "tax_total": _decimal_to_string(totals.get("tax_total")),
        "sales_total": _decimal_to_string(sales_total),
        "paid_total": _decimal_to_string(paid_total),
        "remaining_total": _decimal_to_string(remaining_total),
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_orders_list(request: Request) -> Response:
    """
    GET /api/company/pos/orders/
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
            or "-created_at"
        )

        queryset = (
            get_pos_orders_queryset(company)
            .select_related(
                "company",
                "session",
                "register",
                "branch",
                "warehouse",
                "customer",
                "created_by",
            )
        )

        queryset = _apply_pos_order_filters(queryset, request)
        queryset = _apply_pos_order_ordering(queryset, ordering)

        summary = _build_pos_order_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        orders = [
            serialize_pos_order(order)
            for order in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS orders loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "payment_status": request.query_params.get("payment_status") or "",
                    "session_id": request.query_params.get("session_id") or "",
                    "register_id": request.query_params.get("register_id") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": orders,
                "results": orders,
                "choices": serialize_pos_order_choices(),
            },
            status=200,
        )

    except POSOrderListAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )


pos_orders_list.required_company_permissions = [
    "company.pos.orders.view",
]
# ============================================================
# 📂 api/company/pos/orders/payments.py
# 🧠 Mhamcloud | Company POS Order Payments API V1.0
# ------------------------------------------------------------
# ✅ List POS order payment lines for current company only
# ✅ Add POS payment line for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe POS order lookup inside current company
# ✅ Safe payment method lookup inside current company
# ✅ Safe treasury account lookup inside current company
# ✅ Uses pos.services.add_pos_payment_line
# ✅ Updates order payment status through service layer
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم قبول Payment Method من شركة أخرى
# - لا يتم قبول Treasury Account من شركة أخرى
# - منطق تحديث paid_amount / remaining_amount / payment_status يبقى داخل pos/services.py
# - صلاحية الدفع المطلوبة: company.pos.orders.pay
# ============================================================

from __future__ import annotations

import inspect
from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from payments.models import CompanyPaymentMethod
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response
from treasury.models import TreasuryAccount

from api.permissions import HasAnyCompanyPermission
from pos.models import (
    POSOrderStatus,
    POSPaymentLineStatus,
    POSPaymentLineType,
)
from pos.services import add_pos_payment_line

from .detail import get_pos_order_for_company
from .list import serialize_pos_order


class POSOrderPaymentsAPIError(Exception):
    """
    Small API-level error for POS order payments endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderPaymentsAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like values.
    """
    return _clean_text(value).upper()


def _clean_id(value: Any, field_name: str) -> int:
    """
    Safely parse required integer ids.
    """
    if value in [None, ""]:
        raise ValidationError({field_name: f"{field_name} is required."})

    try:
        parsed_id = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if parsed_id < 1:
        raise ValidationError({field_name: f"Invalid {field_name}."})

    return parsed_id


def _clean_decimal(
    value: Any,
    field_name: str,
    *,
    required: bool = True,
    default: Decimal | None = None,
    allow_zero: bool = False,
) -> Decimal:
    """
    Safely parse decimal request values.
    """
    if value in [None, ""]:
        if required:
            raise ValidationError({field_name: f"{field_name} is required."})

        return default if default is not None else Decimal("0.00")

    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if allow_zero:
        if number < Decimal("0.00"):
            raise ValidationError({field_name: f"{field_name} cannot be negative."})
    else:
        if number <= Decimal("0.00"):
            raise ValidationError(
                {field_name: f"{field_name} must be greater than zero."}
            )

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


def _service_accepts_parameter(function, parameter_name: str) -> bool:
    """
    Check whether a service function accepts a given keyword parameter.
    """
    try:
        signature = inspect.signature(function)
    except (TypeError, ValueError):
        return False

    return parameter_name in signature.parameters


def _get_payment_method_for_company(company, payment_method_id: Any) -> CompanyPaymentMethod:
    """
    Return payment method scoped to current company only.
    """
    parsed_id = _clean_id(payment_method_id, "payment_method_id")

    payment_method = (
        CompanyPaymentMethod.objects.filter(
            company=company,
            id=parsed_id,
        )
        .first()
    )

    if not payment_method:
        raise POSOrderPaymentsAPIError("Payment method was not found.")

    return payment_method


def _get_treasury_account_for_company(company, treasury_account_id: Any) -> TreasuryAccount:
    """
    Return treasury account scoped to current company only.
    """
    parsed_id = _clean_id(treasury_account_id, "treasury_account_id")

    treasury_account = (
        TreasuryAccount.objects.filter(
            company=company,
            id=parsed_id,
        )
        .first()
    )

    if not treasury_account:
        raise POSOrderPaymentsAPIError("Treasury account was not found.")

    return treasury_account


def _resolve_payment_method(company, data: dict[str, Any]) -> CompanyPaymentMethod:
    """
    Resolve payment method safely from payload.
    """
    return _get_payment_method_for_company(
        company=company,
        payment_method_id=data.get("payment_method_id") or data.get("payment_method"),
    )


def _resolve_treasury_account(company, order, data: dict[str, Any]) -> TreasuryAccount:
    """
    Resolve treasury account safely from payload or POS context.
    """
    treasury_account_id = data.get("treasury_account_id") or data.get("treasury_account")

    if treasury_account_id:
        return _get_treasury_account_for_company(
            company=company,
            treasury_account_id=treasury_account_id,
        )

    session = getattr(order, "session", None)
    register = getattr(order, "register", None) or getattr(session, "register", None)

    treasury_account = (
        getattr(order, "treasury_account", None)
        or getattr(session, "treasury_account", None)
        or getattr(register, "treasury_account", None)
        or getattr(register, "default_treasury_account", None)
    )

    if not treasury_account:
        raise ValidationError(
            {
                "treasury_account_id": "treasury_account_id is required.",
            }
        )

    if getattr(treasury_account, "company_id", None) != company.id:
        raise POSOrderPaymentsAPIError("Treasury account was not found.")

    return treasury_account


def _get_order_payments_manager(order):
    """
    Return order payment lines manager safely.
    """
    manager = (
        getattr(order, "payment_lines", None)
        or getattr(order, "payments", None)
        or getattr(order, "pos_payments", None)
    )

    if manager is None:
        raise POSOrderPaymentsAPIError("POS order payment lines relation was not found.")

    return manager


def _validate_order_allows_payment(order) -> None:
    """
    Validate whether order allows payment.
    """
    if getattr(order, "status", "") in [
        POSOrderStatus.CANCELLED,
    ]:
        raise ValidationError(
            {
                "status": "Payments cannot be added to a cancelled POS order.",
            }
        )


def _normalize_payment_type(value: Any) -> str:
    """
    Normalize payment type with a safe CASH fallback.
    """
    payment_type = _clean_upper(value or "")

    allowed_values = [choice_value for choice_value, _ in POSPaymentLineType.choices]

    if not payment_type:
        return POSPaymentLineType.CASH

    if payment_type not in allowed_values:
        raise ValidationError({"payment_type": "Invalid payment_type."})

    return payment_type


def _clean_confirm_now(value: Any) -> bool:
    """
    Convert confirm_now-like values to bool.
    """
    if isinstance(value, bool):
        return value

    text = _clean_text(value).lower()

    if text in ["1", "true", "yes", "y", "confirm", "confirmed"]:
        return True

    if text in ["0", "false", "no", "n", "draft", "pending"]:
        return False

    return True


def _call_add_pos_payment_line_service(
    *,
    company,
    order,
    payment_method,
    amount: Decimal,
    payment_type: str,
    treasury_account,
    confirm_now: bool,
    user,
):
    """
    Call add_pos_payment_line safely based on its actual service signature.
    """
    kwargs = {
        "company": company,
        "order": order,
        "payment_method": payment_method,
        "amount": amount,
    }

    if _service_accepts_parameter(add_pos_payment_line, "payment_type"):
        kwargs["payment_type"] = payment_type

    if _service_accepts_parameter(add_pos_payment_line, "treasury_account"):
        kwargs["treasury_account"] = treasury_account

    if _service_accepts_parameter(add_pos_payment_line, "confirm_now"):
        kwargs["confirm_now"] = confirm_now

    if _service_accepts_parameter(add_pos_payment_line, "user"):
        kwargs["user"] = user

    if _service_accepts_parameter(add_pos_payment_line, "created_by"):
        kwargs["created_by"] = user

    return add_pos_payment_line(**kwargs)


def serialize_pos_payment_line(payment_line) -> dict[str, Any]:
    """
    Serialize POS payment line safely.
    """
    payment_method = getattr(payment_line, "payment_method", None)
    treasury_account = getattr(payment_line, "treasury_account", None)
    created_by = getattr(payment_line, "created_by", None) or getattr(
        payment_line,
        "user",
        None,
    )

    return {
        "id": payment_line.id,
        "payment_method": {
            "id": payment_method.id if payment_method else None,
            "name": _safe_display_name(payment_method),
            "code": getattr(payment_method, "code", "") if payment_method else "",
        }
        if payment_method
        else None,
        "payment_type": getattr(payment_line, "payment_type", ""),
        "payment_type_label": payment_line.get_payment_type_display()
        if hasattr(payment_line, "get_payment_type_display")
        else getattr(payment_line, "payment_type", ""),
        "status": getattr(payment_line, "status", ""),
        "status_label": payment_line.get_status_display()
        if hasattr(payment_line, "get_status_display")
        else getattr(payment_line, "status", ""),
        "amount": _decimal_to_string(getattr(payment_line, "amount", Decimal("0.00"))),
        "treasury_account": {
            "id": treasury_account.id if treasury_account else None,
            "name": _safe_display_name(treasury_account),
            "code": getattr(treasury_account, "code", "") if treasury_account else "",
        }
        if treasury_account
        else None,
        "reference": getattr(payment_line, "reference", ""),
        "notes": getattr(payment_line, "notes", ""),
        "created_by": {
            "id": created_by.id,
            "username": getattr(created_by, "username", ""),
            "email": getattr(created_by, "email", ""),
        }
        if created_by
        else None,
        "created_at": _safe_iso(getattr(payment_line, "created_at", None)),
        "updated_at": _safe_iso(getattr(payment_line, "updated_at", None)),
    }


def _apply_optional_payment_fields(payment_line, data: dict[str, Any], user):
    """
    Apply optional payment metadata if matching fields exist.
    """
    update_fields: list[str] = []

    reference = _clean_text(data.get("reference") or data.get("external_reference"))
    notes = _clean_text(data.get("notes"))

    if reference and hasattr(payment_line, "reference"):
        payment_line.reference = reference
        update_fields.append("reference")

    if reference and hasattr(payment_line, "external_reference"):
        payment_line.external_reference = reference
        update_fields.append("external_reference")

    if notes and hasattr(payment_line, "notes"):
        payment_line.notes = notes
        update_fields.append("notes")

    if hasattr(payment_line, "updated_by"):
        payment_line.updated_by = (
            user if getattr(user, "is_authenticated", False) else None
        )
        update_fields.append("updated_by")

    if update_fields:
        if hasattr(payment_line, "updated_at"):
            update_fields.append("updated_at")

        payment_line.full_clean()
        payment_line.save(update_fields=update_fields)

    return payment_line


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_payments_list(request: Request, order_id: int) -> Response:
    """
    GET /api/company/pos/orders/<order_id>/payments/
    """
    try:
        company = _get_request_company(request)
        order = get_pos_order_for_company(company, order_id)

        payments_manager = _get_order_payments_manager(order)
        payment_lines = [
            serialize_pos_payment_line(payment_line)
            for payment_line in payments_manager.all().order_by("id")
        ]

        serialized_order = serialize_pos_order(order, include_lines=False)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order payments loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "order": serialized_order,
                "items": payment_lines,
                "results": payment_lines,
                "count": len(payment_lines),
                "choices": {
                    "payment_types": [
                        {"value": value, "label": label}
                        for value, label in POSPaymentLineType.choices
                    ],
                    "payment_statuses": [
                        {"value": value, "label": label}
                        for value, label in POSPaymentLineStatus.choices
                    ],
                },
            },
            status=200,
        )

    except POSOrderPaymentsAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_payment_add(request: Request, order_id: int) -> Response:
    """
    POST /api/company/pos/orders/<order_id>/payments/add/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        order = get_pos_order_for_company(company, order_id)
        _validate_order_allows_payment(order)

        payment_method = _resolve_payment_method(company, data)
        treasury_account = _resolve_treasury_account(company, order, data)

        amount = _clean_decimal(
            data.get("amount"),
            "amount",
            required=True,
        )
        payment_type = _normalize_payment_type(data.get("payment_type"))
        confirm_now = _clean_confirm_now(data.get("confirm_now", True))

        payment_line = _call_add_pos_payment_line_service(
            company=company,
            order=order,
            payment_method=payment_method,
            amount=amount,
            payment_type=payment_type,
            treasury_account=treasury_account,
            confirm_now=confirm_now,
            user=request.user,
        )

        payment_line = _apply_optional_payment_fields(
            payment_line=payment_line,
            data=data,
            user=request.user,
        )

        order.refresh_from_db()

        serialized_payment = serialize_pos_payment_line(payment_line)
        serialized_order = serialize_pos_order(order, include_lines=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order payment added successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_payment,
                "order": serialized_order,
                "result": {
                    "payment": serialized_payment,
                    "order": serialized_order,
                },
            },
            status=201,
        )

    except POSOrderPaymentsAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS order payment could not be added.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS order payment could not be added.",
                "errors": {
                    "detail": "POS order payment could not be added because of a duplicate value.",
                },
            },
            status=400,
        )


pos_order_payments_list.required_company_permissions = [
    "company.pos.orders.view",
]

pos_order_payment_add.required_company_permissions = [
    "company.pos.orders.pay",
    "company.pos.orders.update",
]
# ============================================================
# 📂 api/company/payments/methods/detail.py
# 🧠 Mhamcloud | Company Payment Method Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve payment method for current company only
# ✅ Update payment method for current company only
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا نسمح بتعديل طريقة دفع تابعة لشركة أخرى
# - لا نستخدم حذف فعلي في هذه المرحلة
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.methods.list import _get_gateway_for_company
from api.permissions import HasAnyCompanyPermission
from payments.models import CompanyPaymentMethod
from payments.services import (
    serialize_payment_method,
    update_payment_method,
)


class PaymentMethodDetailAPIError(Exception):
    """
    Small API-level error for payment method detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentMethodDetailAPIError("Current company context was not resolved.")

    return company


def get_payment_method_or_raise(company, method_id: int) -> CompanyPaymentMethod:
    """
    Return company-scoped payment method or raise API-level error.
    """
    method = CompanyPaymentMethod.objects.select_related("gateway").filter(
        company=company,
        id=method_id,
    ).first()

    if not method:
        raise PaymentMethodDetailAPIError("Payment method was not found.")

    return method


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean body values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _build_update_payload(company, data: dict[str, Any]) -> dict[str, Any]:
    """
    Build safe update payload.
    """
    allowed_fields = {
        "name",
        "code",
        "method_type",
        "settlement_behavior",
        "cashbox_account_code",
        "bank_account_code",
        "settlement_account_code",
        "fee_account_code",
        "fee_percentage",
        "fixed_fee",
        "requires_reference",
        "requires_manual_confirmation",
        "allow_customer_checkout",
        "allow_pos",
        "is_active",
        "is_default",
        "sort_order",
        "notes",
    }

    payload: dict[str, Any] = {}

    if "gateway_id" in data or "gateway" in data:
        payload["gateway"] = _get_gateway_for_company(
            company,
            data.get("gateway_id") or data.get("gateway"),
        )

    for field in allowed_fields:
        if field in data:
            payload[field] = data.get(field)

    if "type" in data and "method_type" not in payload:
        payload["method_type"] = data.get("type")

    for bool_field in [
        "requires_reference",
        "requires_manual_confirmation",
        "allow_customer_checkout",
        "allow_pos",
        "is_active",
        "is_default",
    ]:
        if bool_field in payload:
            parsed = _to_bool(payload[bool_field])
            payload[bool_field] = bool(parsed)

    return payload


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def payment_method_detail(request: Request, method_id: int) -> Response:
    """
    GET /api/company/payments/methods/<method_id>/
    PATCH /api/company/payments/methods/<method_id>/
    PUT /api/company/payments/methods/<method_id>/
    """
    try:
        company = _get_request_company(request)
        method = get_payment_method_or_raise(company, method_id)

        if request.method == "GET":
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment method loaded successfully.",
                    "item": serialize_payment_method(method),
                    "result": serialize_payment_method(method),
                },
                status=200,
            )

        update_payload = _build_update_payload(company, request.data or {})

        method = update_payment_method(
            method=method,
            payload=update_payload,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment method updated successfully.",
                "item": serialize_payment_method(method),
                "result": serialize_payment_method(method),
            },
            status=200,
        )

    except PaymentMethodDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment method validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment method already exists.",
                "errors": {
                    "detail": "Payment method code already exists for this company.",
                },
            },
            status=400,
        )


payment_method_detail.required_company_permissions = [
    "company.payments.methods.view",
    "company.payments.methods.update",
]
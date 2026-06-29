# ============================================================
# 📂 api/company/payments/gateways/detail.py
# 🧠 Mhamcloud | Company Payment Gateway Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve payment gateway for current company only
# ✅ Update payment gateway for current company only
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا نسمح بتعديل بوابة دفع تابعة لشركة أخرى
# - لا نستخدم حذف فعلي في هذه المرحلة
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from payments.models import CompanyPaymentGateway
from payments.services import (
    serialize_payment_gateway,
    update_payment_gateway,
)


class PaymentGatewayDetailAPIError(Exception):
    """
    Small API-level error for payment gateway detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentGatewayDetailAPIError("Current company context was not resolved.")

    return company


def get_payment_gateway_or_raise(company, gateway_id: int) -> CompanyPaymentGateway:
    """
    Return company-scoped payment gateway or raise API-level error.
    """
    gateway = CompanyPaymentGateway.objects.filter(
        company=company,
        id=gateway_id,
    ).first()

    if not gateway:
        raise PaymentGatewayDetailAPIError("Payment gateway was not found.")

    return gateway


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


def _build_update_payload(data: dict[str, Any]) -> dict[str, Any]:
    """
    Build safe update payload.
    """
    allowed_fields = {
        "name",
        "code",
        "gateway_type",
        "environment",
        "settings",
        "public_key",
        "merchant_id",
        "settlement_account_code",
        "fee_account_code",
        "supports_refunds",
        "supports_partial_refunds",
        "supports_webhooks",
        "is_active",
        "is_default",
        "notes",
    }

    payload: dict[str, Any] = {}

    for field in allowed_fields:
        if field in data:
            payload[field] = data.get(field)

    if "type" in data and "gateway_type" not in payload:
        payload["gateway_type"] = data.get("type")

    for bool_field in [
        "supports_refunds",
        "supports_partial_refunds",
        "supports_webhooks",
        "is_active",
        "is_default",
    ]:
        if bool_field in payload:
            parsed = _to_bool(payload[bool_field])
            payload[bool_field] = bool(parsed)

    return payload


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def payment_gateway_detail(request: Request, gateway_id: int) -> Response:
    """
    GET /api/company/payments/gateways/<gateway_id>/
    PATCH /api/company/payments/gateways/<gateway_id>/
    PUT /api/company/payments/gateways/<gateway_id>/
    """
    try:
        company = _get_request_company(request)
        gateway = get_payment_gateway_or_raise(company, gateway_id)

        if request.method == "GET":
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment gateway loaded successfully.",
                    "item": serialize_payment_gateway(gateway, include_settings=True),
                    "result": serialize_payment_gateway(gateway, include_settings=True),
                },
                status=200,
            )

        update_payload = _build_update_payload(request.data or {})

        gateway = update_payment_gateway(
            gateway=gateway,
            payload=update_payload,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment gateway updated successfully.",
                "item": serialize_payment_gateway(gateway, include_settings=True),
                "result": serialize_payment_gateway(gateway, include_settings=True),
            },
            status=200,
        )

    except PaymentGatewayDetailAPIError as exc:
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
                "message": "Payment gateway validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment gateway already exists.",
                "errors": {
                    "detail": "Payment gateway code already exists for this company.",
                },
            },
            status=400,
        )


payment_gateway_detail.required_company_permissions = [
    "company.payments.gateways.view",
    "company.payments.gateways.update",
]
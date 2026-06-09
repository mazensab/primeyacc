# ============================================================
# 📂 api/company/payments/gateways/status.py
# 🧠 PrimeyAcc | Company Payment Gateway Status API V1.0
# ------------------------------------------------------------
# ✅ Activate payment gateway for current company only
# ✅ Deactivate payment gateway for current company only
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No destructive delete
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - التعطيل لا يحذف السجل
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.gateways.detail import get_payment_gateway_or_raise
from api.permissions import HasAnyCompanyPermission
from payments.services import (
    serialize_payment_gateway,
    set_payment_gateway_status,
)


class PaymentGatewayStatusAPIError(Exception):
    """
    Small API-level error for payment gateway status endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentGatewayStatusAPIError("Current company context was not resolved.")

    return company


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean body values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on", "active", "activate"}:
        return True

    if text in {"0", "false", "no", "n", "off", "inactive", "deactivate"}:
        return False

    return None


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payment_gateway_status(request: Request, gateway_id: int) -> Response:
    """
    POST /api/company/payments/gateways/<gateway_id>/status/
    PATCH /api/company/payments/gateways/<gateway_id>/status/
    """
    try:
        company = _get_request_company(request)
        gateway = get_payment_gateway_or_raise(company, gateway_id)

        data = request.data or {}

        requested_status = (
            data.get("is_active")
            if "is_active" in data
            else data.get("status")
        )

        is_active = _to_bool(requested_status)

        if is_active is None:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Payment gateway status is required.",
                    "errors": {
                        "is_active": "Send is_active=true/false or status=active/inactive.",
                    },
                },
                status=400,
            )

        gateway = set_payment_gateway_status(
            gateway,
            is_active=is_active,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment gateway status updated successfully.",
                "item": serialize_payment_gateway(gateway, include_settings=False),
                "result": serialize_payment_gateway(gateway, include_settings=False),
            },
            status=200,
        )

    except PaymentGatewayStatusAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment gateway status validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )


payment_gateway_status.required_company_permissions = [
    "company.payments.gateways.status",
    "company.payments.gateways.update",
]
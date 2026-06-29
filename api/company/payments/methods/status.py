# ============================================================
# 📂 api/company/payments/methods/status.py
# 🧠 Mhamcloud | Company Payment Method Status API V1.0
# ------------------------------------------------------------
# ✅ Activate payment method for current company only
# ✅ Deactivate payment method for current company only
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

from api.company.payments.methods.detail import get_payment_method_or_raise
from api.permissions import HasAnyCompanyPermission
from payments.services import (
    serialize_payment_method,
    set_payment_method_status,
)


class PaymentMethodStatusAPIError(Exception):
    """
    Small API-level error for payment method status endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentMethodStatusAPIError("Current company context was not resolved.")

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
def payment_method_status(request: Request, method_id: int) -> Response:
    """
    POST /api/company/payments/methods/<method_id>/status/
    PATCH /api/company/payments/methods/<method_id>/status/
    """
    try:
        company = _get_request_company(request)
        method = get_payment_method_or_raise(company, method_id)

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
                    "message": "Payment method status is required.",
                    "errors": {
                        "is_active": "Send is_active=true/false or status=active/inactive.",
                    },
                },
                status=400,
            )

        method = set_payment_method_status(
            method,
            is_active=is_active,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment method status updated successfully.",
                "item": serialize_payment_method(method),
                "result": serialize_payment_method(method),
            },
            status=200,
        )

    except PaymentMethodStatusAPIError as exc:
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
                "message": "Payment method status validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )


payment_method_status.required_company_permissions = [
    "company.payments.methods.status",
    "company.payments.methods.update",
]
# ============================================================
# 📂 api/company/payments/terminals/detail.py
# 🧠 Mhamcloud | Company Payment Terminal Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve payment terminal for current company only
# ✅ Update payment terminal for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe branch/gateway/method company validation
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا نسمح بتعديل جهاز دفع تابع لشركة أخرى
# - لا نستخدم حذف فعلي في هذه المرحلة
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.terminals.list import (
    _get_branch_for_company,
    _get_gateway_for_company,
    _get_method_for_company,
    serialize_payment_terminal_full,
)
from api.permissions import HasAnyCompanyPermission
from payments.models import CompanyPaymentTerminal
from payments.services import update_payment_terminal


class PaymentTerminalDetailAPIError(Exception):
    """
    Small API-level error for payment terminal detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentTerminalDetailAPIError("Current company context was not resolved.")

    return company


def get_payment_terminal_or_raise(company, terminal_id: int) -> CompanyPaymentTerminal:
    """
    Return company-scoped payment terminal or raise API-level error.
    """
    terminal = CompanyPaymentTerminal.objects.select_related(
        "branch",
        "gateway",
        "payment_method",
    ).filter(
        company=company,
        id=terminal_id,
    ).first()

    if not terminal:
        raise PaymentTerminalDetailAPIError("Payment terminal was not found.")

    return terminal


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
        "terminal_code",
        "code",
        "terminal_id",
        "serial_number",
        "provider_name",
        "location_note",
        "status",
        "is_active",
        "is_default_for_branch",
        "settings",
        "notes",
        "last_seen_at",
    }

    payload: dict[str, Any] = {}

    if "branch_id" in data or "branch" in data:
        payload["branch"] = _get_branch_for_company(
            company,
            data.get("branch_id") or data.get("branch"),
        )

    if "gateway_id" in data or "gateway" in data:
        payload["gateway"] = _get_gateway_for_company(
            company,
            data.get("gateway_id") or data.get("gateway"),
        )

    if "payment_method_id" in data or "method_id" in data or "payment_method" in data:
        payload["payment_method"] = _get_method_for_company(
            company,
            data.get("payment_method_id")
            or data.get("method_id")
            or data.get("payment_method"),
        )

    for field in allowed_fields:
        if field in data:
            payload[field] = data.get(field)

    for bool_field in [
        "is_active",
        "is_default_for_branch",
    ]:
        if bool_field in payload:
            parsed = _to_bool(payload[bool_field])
            payload[bool_field] = bool(parsed)

    return payload


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def payment_terminal_detail(request: Request, terminal_id: int) -> Response:
    """
    GET /api/company/payments/terminals/<terminal_id>/
    PATCH /api/company/payments/terminals/<terminal_id>/
    PUT /api/company/payments/terminals/<terminal_id>/
    """
    try:
        company = _get_request_company(request)
        terminal = get_payment_terminal_or_raise(company, terminal_id)

        if request.method == "GET":
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment terminal loaded successfully.",
                    "item": serialize_payment_terminal_full(terminal),
                    "result": serialize_payment_terminal_full(terminal),
                },
                status=200,
            )

        update_payload = _build_update_payload(company, request.data or {})

        terminal = update_payment_terminal(
            terminal=terminal,
            payload=update_payload,
        )

        terminal = get_payment_terminal_or_raise(company, terminal.id)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment terminal updated successfully.",
                "item": serialize_payment_terminal_full(terminal),
                "result": serialize_payment_terminal_full(terminal),
            },
            status=200,
        )

    except PaymentTerminalDetailAPIError as exc:
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
                "message": "Payment terminal validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment terminal already exists.",
                "errors": {
                    "detail": "Payment terminal code already exists for this company.",
                },
            },
            status=400,
        )


payment_terminal_detail.required_company_permissions = [
    "company.payments.terminals.view",
    "company.payments.terminals.update",
]
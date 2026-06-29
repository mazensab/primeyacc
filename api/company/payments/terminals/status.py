# ============================================================
# 📂 api/company/payments/terminals/status.py
# 🧠 Mhamcloud | Company Payment Terminal Status API V1.0
# ------------------------------------------------------------
# ✅ Activate payment terminal for current company only
# ✅ Deactivate payment terminal for current company only
# ✅ Maintenance / retired status support
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

from api.company.payments.terminals.detail import get_payment_terminal_or_raise
from api.company.payments.terminals.list import serialize_payment_terminal_full
from api.permissions import HasAnyCompanyPermission
from payments.models import CompanyPaymentTerminal
from payments.services import set_payment_terminal_status


class PaymentTerminalStatusAPIError(Exception):
    """
    Small API-level error for payment terminal status endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentTerminalStatusAPIError("Current company context was not resolved.")

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


def _normalize_status(value: Any) -> str | None:
    """
    Normalize terminal status text.
    """
    if value in [None, ""]:
        return None

    status = str(value).strip().upper()

    aliases = {
        "ACTIVE": CompanyPaymentTerminal.TerminalStatus.ACTIVE,
        "ACTIVATE": CompanyPaymentTerminal.TerminalStatus.ACTIVE,
        "INACTIVE": CompanyPaymentTerminal.TerminalStatus.INACTIVE,
        "DEACTIVATE": CompanyPaymentTerminal.TerminalStatus.INACTIVE,
        "MAINTENANCE": CompanyPaymentTerminal.TerminalStatus.MAINTENANCE,
        "RETIRED": CompanyPaymentTerminal.TerminalStatus.RETIRED,
    }

    return aliases.get(status)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payment_terminal_status(request: Request, terminal_id: int) -> Response:
    """
    POST /api/company/payments/terminals/<terminal_id>/status/
    PATCH /api/company/payments/terminals/<terminal_id>/status/
    """
    try:
        company = _get_request_company(request)
        terminal = get_payment_terminal_or_raise(company, terminal_id)

        data = request.data or {}

        normalized_status = _normalize_status(data.get("status"))
        parsed_is_active = _to_bool(data.get("is_active"))

        if normalized_status:
            is_active = normalized_status == CompanyPaymentTerminal.TerminalStatus.ACTIVE
            terminal = set_payment_terminal_status(
                terminal,
                is_active=is_active,
                status=normalized_status,
            )
        elif parsed_is_active is not None:
            terminal = set_payment_terminal_status(
                terminal,
                is_active=parsed_is_active,
            )
        else:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Payment terminal status is required.",
                    "errors": {
                        "is_active": "Send is_active=true/false or status=ACTIVE/INACTIVE/MAINTENANCE/RETIRED.",
                    },
                },
                status=400,
            )

        terminal = get_payment_terminal_or_raise(company, terminal.id)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment terminal status updated successfully.",
                "item": serialize_payment_terminal_full(terminal),
                "result": serialize_payment_terminal_full(terminal),
            },
            status=200,
        )

    except PaymentTerminalStatusAPIError as exc:
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
                "message": "Payment terminal status validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )


payment_terminal_status.required_company_permissions = [
    "company.payments.terminals.status",
    "company.payments.terminals.update",
]
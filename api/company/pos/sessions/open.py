# ============================================================
# 📂 api/company/pos/sessions/open.py
# 🧠 Mhamcloud | Company POS Sessions Open API V1.0
# ------------------------------------------------------------
# ✅ Open POS session for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe register lookup inside current company
# ✅ Uses pos.services.open_pos_session
# ✅ Prevents opening session on another company register
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم فتح Session إلا على Register داخل نفس الشركة
# - منطق فتح الجلسة يبقى داخل pos/services.py
# - صلاحية فتح الجلسة المطلوبة: company.pos.sessions.open
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from api.company.pos.registers.detail import get_pos_register_for_company
from pos.services import open_pos_session

from .list import serialize_pos_session


class POSSessionOpenAPIError(Exception):
    """
    Small API-level error for POS session open endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSSessionOpenAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


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


def _clean_decimal(value: Any, field_name: str, default: Decimal = Decimal("0.00")) -> Decimal:
    """
    Safely parse decimal request values.
    """
    if value in [None, ""]:
        return default

    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if amount < Decimal("0.00"):
        raise ValidationError({field_name: f"{field_name} cannot be negative."})

    return amount


def _resolve_register(company, data: dict[str, Any]):
    """
    Resolve POS register safely for current company only.
    """
    register_id = _clean_id(
        data.get("register_id") or data.get("register"),
        "register_id",
    )

    return get_pos_register_for_company(company, register_id)


def _apply_optional_session_notes(session, data: dict[str, Any], user):
    """
    Store optional notes after service creates the session.

    This keeps opening business rules inside pos/services.py while allowing
    API payload notes to be saved when matching model fields exist.
    """
    update_fields: list[str] = []

    opening_notes = _clean_text(data.get("opening_notes"))
    notes = _clean_text(data.get("notes"))

    if opening_notes and hasattr(session, "opening_notes"):
        session.opening_notes = opening_notes
        update_fields.append("opening_notes")

    if notes and hasattr(session, "notes"):
        session.notes = notes
        update_fields.append("notes")

    if hasattr(session, "updated_by"):
        session.updated_by = user if getattr(user, "is_authenticated", False) else None
        update_fields.append("updated_by")

    if update_fields:
        if hasattr(session, "updated_at"):
            update_fields.append("updated_at")

        session.full_clean()
        session.save(update_fields=update_fields)

    return session


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_session_open(request: Request) -> Response:
    """
    POST /api/company/pos/sessions/open/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        register = _resolve_register(company, data)
        opening_cash_amount = _clean_decimal(
            data.get("opening_cash_amount")
            or data.get("opening_cash")
            or data.get("cash_amount"),
            "opening_cash_amount",
            default=Decimal("0.00"),
        )

        session = open_pos_session(
            company=company,
            register=register,
            opening_cash_amount=opening_cash_amount,
            user=request.user,
        )

        session = _apply_optional_session_notes(
            session=session,
            data=data,
            user=request.user,
        )

        serialized_session = serialize_pos_session(session)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS session opened successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_session,
                "result": serialized_session,
            },
            status=201,
        )

    except POSSessionOpenAPIError as exc:
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
                "message": "POS session opening failed.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )


pos_session_open.required_company_permissions = [
    "company.pos.sessions.open",
    "company.pos.sessions.create",
]
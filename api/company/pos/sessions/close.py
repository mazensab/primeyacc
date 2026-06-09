# ============================================================
# 📂 api/company/pos/sessions/close.py
# 🧠 PrimeyAcc | Company POS Sessions Close API V1.0
# ------------------------------------------------------------
# ✅ Close POS session for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe session lookup inside current company
# ✅ Uses pos.services.close_pos_session
# ✅ Prevents closing another company session
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إغلاق Session إلا إذا كانت داخل نفس الشركة
# - منطق إغلاق الجلسة يبقى داخل pos/services.py
# - صلاحية إغلاق الجلسة المطلوبة: company.pos.sessions.close
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.services import close_pos_session

from .detail import get_pos_session_for_company
from .list import serialize_pos_session


class POSSessionCloseAPIError(Exception):
    """
    Small API-level error for POS session close endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSSessionCloseAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


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


def _apply_optional_closing_notes(session, data: dict[str, Any], user):
    """
    Store optional close notes after service closes the session.

    This keeps closing business rules inside pos/services.py while allowing
    API payload notes to be saved when matching model fields exist.
    """
    update_fields: list[str] = []

    closing_notes = _clean_text(data.get("closing_notes"))
    notes = _clean_text(data.get("notes"))

    if closing_notes and hasattr(session, "closing_notes"):
        session.closing_notes = closing_notes
        update_fields.append("closing_notes")

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
def pos_session_close(request: Request, session_id: int) -> Response:
    """
    POST /api/company/pos/sessions/<session_id>/close/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        session = get_pos_session_for_company(company, session_id)

        closing_cash_amount = _clean_decimal(
            data.get("closing_cash_amount")
            or data.get("closing_cash")
            or data.get("cash_amount"),
            "closing_cash_amount",
            default=Decimal("0.00"),
        )

        session = close_pos_session(
            company=company,
            session=session,
            closing_cash_amount=closing_cash_amount,
            user=request.user,
        )

        session = _apply_optional_closing_notes(
            session=session,
            data=data,
            user=request.user,
        )

        session = get_pos_session_for_company(company, session.id)
        serialized_session = serialize_pos_session(session)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS session closed successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_session,
                "result": serialized_session,
            },
            status=200,
        )

    except POSSessionCloseAPIError as exc:
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
                "message": "POS session closing failed.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )


pos_session_close.required_company_permissions = [
    "company.pos.sessions.close",
    "company.pos.sessions.update",
]
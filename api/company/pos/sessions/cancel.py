# ============================================================
# 📂 api/company/pos/sessions/cancel.py
# 🧠 PrimeyAcc | Company POS Sessions Cancel API V1.1
# ------------------------------------------------------------
# ✅ Cancel POS session for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe session lookup inside current company
# ✅ Uses pos.services.cancel_pos_session safely
# ✅ Supports service signatures with or without reason parameter
# ✅ Prevents cancelling another company session
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إلغاء Session إلا إذا كانت داخل نفس الشركة
# - منطق إلغاء الجلسة يبقى داخل pos/services.py
# - لا يتم تنفيذ بيع أو تحصيل أو ترحيل من هذا الملف
# - صلاحية الإلغاء المطلوبة: company.pos.sessions.cancel
# ============================================================

from __future__ import annotations

import inspect
from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.services import cancel_pos_session

from .detail import get_pos_session_for_company
from .list import serialize_pos_session


class POSSessionCancelAPIError(Exception):
    """
    Small API-level error for POS session cancel endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSSessionCancelAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _service_accepts_parameter(function, parameter_name: str) -> bool:
    """
    Check whether a service function accepts a given keyword parameter.
    """
    try:
        signature = inspect.signature(function)
    except (TypeError, ValueError):
        return False

    return parameter_name in signature.parameters


def _call_cancel_pos_session_service(*, company, session, cancellation_reason: str, user):
    """
    Call cancel_pos_session safely based on its actual service signature.

    Phase 13.1 service may not accept cancellation_reason, so this helper avoids
    passing unsupported kwargs while keeping API payload support.
    """
    kwargs = {
        "company": company,
        "session": session,
    }

    if _service_accepts_parameter(cancel_pos_session, "user"):
        kwargs["user"] = user

    if _service_accepts_parameter(cancel_pos_session, "cancellation_reason"):
        kwargs["cancellation_reason"] = cancellation_reason
    elif _service_accepts_parameter(cancel_pos_session, "reason"):
        kwargs["reason"] = cancellation_reason
    elif _service_accepts_parameter(cancel_pos_session, "cancel_reason"):
        kwargs["cancel_reason"] = cancellation_reason
    elif _service_accepts_parameter(cancel_pos_session, "notes"):
        kwargs["notes"] = cancellation_reason

    return cancel_pos_session(**kwargs)


def _apply_optional_cancellation_notes(session, data: dict[str, Any], user):
    """
    Store optional cancellation notes after service cancels the session.

    This keeps cancellation business rules inside pos/services.py while allowing
    API payload notes to be saved when matching model fields exist.
    """
    update_fields: list[str] = []

    cancellation_reason = _clean_text(
        data.get("cancellation_reason")
        or data.get("reason")
        or ""
    )
    notes = _clean_text(data.get("notes"))

    if cancellation_reason and hasattr(session, "cancellation_reason"):
        session.cancellation_reason = cancellation_reason
        update_fields.append("cancellation_reason")

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
def pos_session_cancel(request: Request, session_id: int) -> Response:
    """
    POST /api/company/pos/sessions/<session_id>/cancel/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        session = get_pos_session_for_company(company, session_id)

        cancellation_reason = _clean_text(
            data.get("cancellation_reason")
            or data.get("reason")
            or ""
        )

        session = _call_cancel_pos_session_service(
            company=company,
            session=session,
            cancellation_reason=cancellation_reason,
            user=request.user,
        )

        session = _apply_optional_cancellation_notes(
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
                "message": "POS session cancelled successfully.",
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

    except POSSessionCancelAPIError as exc:
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
                "message": "POS session cancellation failed.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )


pos_session_cancel.required_company_permissions = [
    "company.pos.sessions.cancel",
    "company.pos.sessions.update",
]
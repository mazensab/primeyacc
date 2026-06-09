# ============================================================
# 📂 api/company/pos/sessions/detail.py
# 🧠 PrimeyAcc | Company POS Sessions Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve POS session details for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe session lookup inside current company
# ✅ Uses actual POSSession relations only
# ✅ Includes serialized session payload
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم عرض أي Session خارج شركة المستخدم الحالية
# - لا يتم فتح أو إغلاق أو إلغاء Session من detail API
# - صلاحية العرض المطلوبة: company.pos.sessions.view
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSSession

from .list import serialize_pos_session


class POSSessionDetailAPIError(Exception):
    """
    Small API-level error for POS session detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSSessionDetailAPIError("Current company context was not resolved.")

    return company


def _clean_positive_int(value: Any, field_name: str = "id") -> int:
    """
    Safely parse positive integer path params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise POSSessionDetailAPIError(f"Invalid {field_name}.")

    if number < 1:
        raise POSSessionDetailAPIError(f"Invalid {field_name}.")

    return number


def get_pos_session_for_company(company, session_id: Any) -> POSSession:
    """
    Return POS session scoped to the current company only.
    """
    parsed_id = _clean_positive_int(session_id, "session id")

    session = (
        POSSession.objects.select_related(
            "company",
            "register",
            "register__branch",
            "branch",
            "warehouse",
            "treasury_account",
            "opened_by",
            "closed_by",
            "cancelled_by",
        )
        .filter(
            company=company,
            id=parsed_id,
        )
        .first()
    )

    if not session:
        raise POSSessionDetailAPIError("POS session was not found.")

    return session


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_session_detail(request: Request, session_id: int) -> Response:
    """
    GET /api/company/pos/sessions/<session_id>/
    """
    try:
        company = _get_request_company(request)
        session = get_pos_session_for_company(company, session_id)
        serialized_session = serialize_pos_session(session)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS session loaded successfully.",
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

    except POSSessionDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )


pos_session_detail.required_company_permissions = [
    "company.pos.sessions.view",
]
# ============================================================
# 📂 api/company/pos/registers/status.py
# 🧠 Mhamcloud | Company POS Registers Status API V1.0
# ------------------------------------------------------------
# ✅ Activate POS register for current company only
# ✅ Deactivate POS register for current company only
# ✅ Maintenance status support
# ✅ Tenant isolation through request.company
# ✅ Safe register lookup inside current company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم تغيير حالة أي Register خارج شركة المستخدم الحالية
# - لا يتم فتح جلسة أو بيع أو تحصيل من status API
# - لا يتم تعطيل Register لديه جلسة مفتوحة إلا بعد إغلاقها
# - صلاحية تغيير الحالة المطلوبة: company.pos.registers.update
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSRegisterStatus, POSSession, POSSessionStatus

from .detail import get_pos_register_for_company
from .list import serialize_pos_register


class POSRegisterStatusAPIError(Exception):
    """
    Small API-level error for POS register status endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSRegisterStatusAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like text.
    """
    return _clean_text(value).upper()


def _has_open_session(company, register) -> bool:
    """
    Check if register has an open POS session.
    """
    return POSSession.objects.filter(
        company=company,
        register=register,
        status=POSSessionStatus.OPEN,
    ).exists()


def _apply_register_status(*, company, register, action: str, request: Request):
    """
    Apply safe status transition for POS register.
    """
    action = _clean_upper(action)

    if action in ["ACTIVATE", "ACTIVE"]:
        register.activate(user=request.user if request.user.is_authenticated else None)
        return register

    if action in ["DEACTIVATE", "INACTIVE"]:
        if _has_open_session(company, register):
            raise ValidationError(
                {
                    "register": "Cannot deactivate a POS register with an open session.",
                }
            )

        register.deactivate(user=request.user if request.user.is_authenticated else None)
        return register

    if action in ["MAINTENANCE", "SET_MAINTENANCE"]:
        if _has_open_session(company, register):
            raise ValidationError(
                {
                    "register": "Cannot set maintenance while register has an open session.",
                }
            )

        register.status = POSRegisterStatus.MAINTENANCE
        register.is_active = False
        register.updated_by = request.user if request.user.is_authenticated else None
        register.full_clean()
        register.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )
        return register

    raise ValidationError(
        {
            "action": "Invalid status action. Allowed: activate, deactivate, maintenance.",
        }
    )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_register_status(request: Request, register_id: int) -> Response:
    """
    POST /api/company/pos/registers/<register_id>/status/
    """
    try:
        company = _get_request_company(request)
        register = get_pos_register_for_company(company, register_id)
        data = request.data or {}

        action = (
            data.get("action")
            or data.get("status")
            or data.get("target_status")
            or ""
        )

        if not action:
            raise ValidationError(
                {
                    "action": "Status action is required.",
                }
            )

        register = _apply_register_status(
            company=company,
            register=register,
            action=action,
            request=request,
        )
        register = get_pos_register_for_company(company, register.id)
        serialized_register = serialize_pos_register(register)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS register status updated successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_register,
                "result": serialized_register,
            },
            status=200,
        )

    except POSRegisterStatusAPIError as exc:
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
                "message": "POS register status update failed.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )


pos_register_status.required_company_permissions = [
    "company.pos.registers.update",
]
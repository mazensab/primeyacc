# ============================================================
# 📂 api/company/hr/leave_types/actions.py
# 🧠 PrimeyAcc | Company HR Leave Types Actions APIs V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveType
from hr.services import activate_leave_type, deactivate_leave_type

from .serializers import serialize_leave_type


def _validation_errors_payload(exc: ValidationError):
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": [str(exc)]}


def _get_company_leave_type_or_response(*, request: Request, leave_type_id: int):
    company = getattr(request, "company", None)
    if not company:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Active company context is required.",
            },
            status=401,
        )

    try:
        leave_type = LeaveType.objects.get(id=leave_type_id, company=company)
    except LeaveType.DoesNotExist:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave type was not found.",
            },
            status=404,
        )

    return leave_type, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_type_activate(request: Request, leave_type_id: int) -> Response:
    leave_type, error_response = _get_company_leave_type_or_response(
        request=request,
        leave_type_id=leave_type_id,
    )
    if error_response:
        return error_response

    try:
        updated = activate_leave_type(
            leave_type=leave_type,
            updated_by=request.user,
        )
        serialized = serialize_leave_type(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave type activated successfully.",
                "leave_type": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave type could not be activated.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_type_activate.required_company_permissions = [
    "company.hr.leave_types.activate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_type_deactivate(request: Request, leave_type_id: int) -> Response:
    leave_type, error_response = _get_company_leave_type_or_response(
        request=request,
        leave_type_id=leave_type_id,
    )
    if error_response:
        return error_response

    try:
        updated = deactivate_leave_type(
            leave_type=leave_type,
            updated_by=request.user,
        )
        serialized = serialize_leave_type(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave type deactivated successfully.",
                "leave_type": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave type could not be deactivated.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_type_deactivate.required_company_permissions = [
    "company.hr.leave_types.deactivate",
]
# ============================================================
# 📂 api/company/hr/leave_requests/update.py
# 🧠 PrimeyAcc | Company HR Leave Requests Update API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveRequest
from hr.services import update_leave_request

from .serializers import (
    build_leave_request_update_data_from_request,
    serialize_leave_request,
)


def _validation_errors_payload(exc: ValidationError):
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": [str(exc)]}


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_update(request: Request, leave_request_id: int) -> Response:
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Active company context is required.",
            },
            status=401,
        )

    try:
        leave_request = (
            LeaveRequest.objects.select_related(
                "company",
                "employee",
                "leave_type",
            )
            .get(id=leave_request_id, company=company)
        )
    except LeaveRequest.DoesNotExist:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request was not found.",
            },
            status=404,
        )

    try:
        data = build_leave_request_update_data_from_request(
            company=company,
            payload=request.data,
        )

        updated = update_leave_request(
            leave_request=leave_request,
            updated_by=request.user,
            data=data,
        )

        serialized = serialize_leave_request(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave request updated successfully.",
                "leave_request": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request data is invalid.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_request_update.required_company_permissions = [
    "company.hr.leave_requests.update",
]
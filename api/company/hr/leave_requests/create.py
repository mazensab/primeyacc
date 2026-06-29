# ============================================================
# 📂 api/company/hr/leave_requests/create.py
# 🧠 Mhamcloud | Company HR Leave Requests Create API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_leave_request

from .serializers import (
    build_leave_request_data_from_request,
    serialize_leave_request,
    validate_leave_request_required_fields,
)


def _validation_errors_payload(exc: ValidationError):
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": [str(exc)]}


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_create(request: Request) -> Response:
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
        employee, leave_type, data = build_leave_request_data_from_request(
            company=company,
            payload=request.data,
        )
        validate_leave_request_required_fields(data)

        leave_request = create_leave_request(
            company=company,
            employee=employee,
            leave_type=leave_type,
            created_by=request.user,
            data=data,
        )

        serialized = serialize_leave_request(leave_request)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave request created successfully.",
                "leave_request": serialized,
                "data": serialized,
            },
            status=201,
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


company_hr_leave_request_create.required_company_permissions = [
    "company.hr.leave_requests.create",
]
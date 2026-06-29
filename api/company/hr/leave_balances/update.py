# ============================================================
# 📂 api/company/hr/leave_balances/update.py
# 🧠 Mhamcloud | Company HR Leave Balances Update API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_or_update_leave_balance

from .serializers import (
    build_leave_balance_data_from_request,
    serialize_leave_balance,
)


def _validation_errors_payload(exc: ValidationError):
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": [str(exc)]}


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_balance_update(request: Request) -> Response:
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
        employee, leave_type, year, data = build_leave_balance_data_from_request(
            company=company,
            payload=request.data,
        )

        balance = create_or_update_leave_balance(
            company=company,
            employee=employee,
            leave_type=leave_type,
            year=year,
            updated_by=request.user,
            data=data,
        )

        serialized = serialize_leave_balance(balance)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave balance saved successfully.",
                "leave_balance": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave balance data is invalid.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_balance_update.required_company_permissions = [
    "company.hr.leave_balances.update",
]
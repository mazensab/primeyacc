# ============================================================
# 📂 api/company/hr/employees/update.py
# 🧠 Mhamcloud | Company HR Employee Update API V1.0
# ------------------------------------------------------------
# ✅ Update company-scoped employee
# ✅ Tenant isolation through request.company
# ✅ Ignores frontend company_id
# ✅ Validates branch inside current company
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن تحديث موظف خارج الشركة الحالية
# - منطق التحديث يتم عبر hr.services.update_employee
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee
from hr.services import update_employee

from .serializers import (
    build_employee_data_from_request,
    serialize_employee,
)


def _validation_errors_payload(exc: ValidationError):
    """
    Convert Django ValidationError into API-friendly errors payload.
    """

    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {
            "detail": exc.messages,
        }

    return {
        "detail": [str(exc)],
    }


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_employee_update(request: Request, employee_id: int) -> Response:
    """
    POST/PATCH /api/company/hr/employees/<employee_id>/update/

    Update one employee inside the current company.
    """

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
        employee = Employee.objects.get(
            id=employee_id,
            company=company,
        )
    except Employee.DoesNotExist:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Employee was not found.",
            },
            status=404,
        )

    try:
        data = build_employee_data_from_request(
            company=company,
            payload=request.data,
        )

        updated = update_employee(
            employee=employee,
            updated_by=request.user,
            data=data,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Employee updated successfully.",
                "employee": serialize_employee(updated),
                "data": serialize_employee(updated),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Employee data is invalid.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_employee_update.required_company_permissions = [
    "company.hr.employees.update",
]
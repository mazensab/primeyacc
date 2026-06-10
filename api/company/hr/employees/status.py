# ============================================================
# 📂 api/company/hr/employees/status.py
# 🧠 PrimeyAcc | Company HR Employee Status APIs V1.0
# ------------------------------------------------------------
# ✅ Activate company-scoped employee
# ✅ Deactivate company-scoped employee
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن تغيير حالة موظف خارج الشركة الحالية
# - منطق الحالة يتم عبر hr.services
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee
from hr.services import activate_employee, deactivate_employee

from .serializers import serialize_employee


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


def _get_company_employee_or_response(*, request: Request, employee_id: int):
    """
    Resolve employee inside current company or return an API response.
    """

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
        employee = Employee.objects.get(
            id=employee_id,
            company=company,
        )
    except Employee.DoesNotExist:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Employee was not found.",
            },
            status=404,
        )

    return employee, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_employee_activate(request: Request, employee_id: int) -> Response:
    """
    POST /api/company/hr/employees/<employee_id>/activate/
    """

    employee, error_response = _get_company_employee_or_response(
        request=request,
        employee_id=employee_id,
    )
    if error_response:
        return error_response

    try:
        updated = activate_employee(
            employee=employee,
            updated_by=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Employee activated successfully.",
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
                "message": "Employee could not be activated.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_employee_activate.required_company_permissions = [
    "company.hr.employees.activate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_employee_deactivate(request: Request, employee_id: int) -> Response:
    """
    POST /api/company/hr/employees/<employee_id>/deactivate/
    """

    employee, error_response = _get_company_employee_or_response(
        request=request,
        employee_id=employee_id,
    )
    if error_response:
        return error_response

    try:
        updated = deactivate_employee(
            employee=employee,
            updated_by=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Employee deactivated successfully.",
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
                "message": "Employee could not be deactivated.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_employee_deactivate.required_company_permissions = [
    "company.hr.employees.deactivate",
]
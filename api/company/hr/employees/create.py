# ============================================================
# 📂 api/company/hr/employees/create.py
# 🧠 Mhamcloud | Company HR Employees Create API V1.0
# ------------------------------------------------------------
# ✅ Create company-scoped employee
# ✅ Tenant isolation through request.company
# ✅ Ignores frontend company_id
# ✅ Validates branch inside current company
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - branch_id إن وصل يجب أن يكون داخل نفس الشركة
# - منطق الإنشاء يتم عبر hr.services.create_employee
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_employee

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


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_employee_create(request: Request) -> Response:
    """
    POST /api/company/hr/employees/create/

    Create one employee inside the current company.
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
        data = build_employee_data_from_request(
            company=company,
            payload=request.data,
        )

        employee = create_employee(
            company=company,
            created_by=request.user,
            data=data,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Employee created successfully.",
                "employee": serialize_employee(employee),
                "data": serialize_employee(employee),
            },
            status=201,
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


company_hr_employee_create.required_company_permissions = [
    "company.hr.employees.create",
]
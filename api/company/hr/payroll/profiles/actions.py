# ============================================================
# ?? api/company/hr/payroll/profiles/actions.py
# ?? PrimeyAcc | Employee Salary Profile Actions API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeSalaryProfile
from hr.services import (
    activate_employee_salary_profile,
    deactivate_employee_salary_profile,
)

from .serializers import serialize_employee_salary_profile


def _get_company_profile(request, profile_id: int):
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

    profile = EmployeeSalaryProfile.objects.filter(
        company=company,
        id=profile_id,
    ).first()

    if not profile:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Salary profile not found.",
            },
            status=404,
        )

    return profile, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def salary_profile_activate(request, profile_id: int):
    profile, error_response = _get_company_profile(request, profile_id)
    if error_response:
        return error_response

    try:
        profile = activate_employee_salary_profile(
            profile=profile,
            updated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not activate salary profile.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary profile activated successfully.",
            "profile": serialize_employee_salary_profile(profile),
        }
    )


salary_profile_activate.required_company_permissions = [
    "company.hr.payroll.profiles.activate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def salary_profile_deactivate(request, profile_id: int):
    profile, error_response = _get_company_profile(request, profile_id)
    if error_response:
        return error_response

    try:
        profile = deactivate_employee_salary_profile(
            profile=profile,
            updated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not deactivate salary profile.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary profile deactivated successfully.",
            "profile": serialize_employee_salary_profile(profile),
        }
    )


salary_profile_deactivate.required_company_permissions = [
    "company.hr.payroll.profiles.deactivate",
]

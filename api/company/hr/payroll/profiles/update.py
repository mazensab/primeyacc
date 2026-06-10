# ============================================================
# ?? api/company/hr/payroll/profiles/update.py
# ?? PrimeyAcc | Employee Salary Profile Update API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeSalaryProfile
from hr.services import update_employee_salary_profile

from .serializers import (
    build_salary_profile_data_from_request,
    resolve_company_employee,
    serialize_employee_salary_profile,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def salary_profile_update(request, profile_id: int):
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

    profile = EmployeeSalaryProfile.objects.filter(
        company=company,
        id=profile_id,
    ).first()

    if not profile:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Salary profile not found.",
            },
            status=404,
        )

    try:
        data = build_salary_profile_data_from_request(request, partial=True)

        if "employee_id" in request.data:
            data["employee"] = resolve_company_employee(
                company,
                request.data.get("employee_id"),
            )

        profile = update_employee_salary_profile(
            profile=profile,
            updated_by=request.user,
            data=data,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Invalid salary profile data.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Employee already has an active salary profile.",
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary profile updated successfully.",
            "profile": serialize_employee_salary_profile(profile),
        }
    )


salary_profile_update.required_company_permissions = [
    "company.hr.payroll.profiles.update",
]

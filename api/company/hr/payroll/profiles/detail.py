# ============================================================
# ?? api/company/hr/payroll/profiles/detail.py
# ?? PrimeyAcc | Employee Salary Profile Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeSalaryProfile

from .serializers import serialize_employee_salary_profile


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def salary_profile_detail(request, profile_id: int):
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

    profile = EmployeeSalaryProfile.objects.select_related(
        "employee",
    ).filter(
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

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary profile loaded successfully.",
            "profile": serialize_employee_salary_profile(profile),
        }
    )


salary_profile_detail.required_company_permissions = [
    "company.hr.payroll.profiles.view",
]

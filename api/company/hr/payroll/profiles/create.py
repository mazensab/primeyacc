# ============================================================
# ?? api/company/hr/payroll/profiles/create.py
# ?? Mhamcloud | Employee Salary Profile Create API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_employee_salary_profile

from .serializers import (
    build_salary_profile_data_from_request,
    resolve_company_employee,
    serialize_employee_salary_profile,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def salary_profile_create(request):
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
        employee = resolve_company_employee(
            company,
            request.data.get("employee_id"),
        )
        data = build_salary_profile_data_from_request(request)
        profile = create_employee_salary_profile(
            company=company,
            employee=employee,
            created_by=request.user,
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
            "message": "Salary profile created successfully.",
            "profile": serialize_employee_salary_profile(profile),
        },
        status=201,
    )


salary_profile_create.required_company_permissions = [
    "company.hr.payroll.profiles.create",
]

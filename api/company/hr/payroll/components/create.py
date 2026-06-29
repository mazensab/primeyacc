# ============================================================
# ?? api/company/hr/payroll/components/create.py
# ?? Mhamcloud | Salary Component Create API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_salary_component

from .serializers import (
    build_salary_component_data_from_request,
    serialize_salary_component,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def salary_component_create(request):
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
        data = build_salary_component_data_from_request(request)
        component = create_salary_component(
            company=company,
            created_by=request.user,
            data=data,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Invalid salary component data.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Salary component code already exists for this company.",
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary component created successfully.",
            "component": serialize_salary_component(component),
        },
        status=201,
    )


salary_component_create.required_company_permissions = [
    "company.hr.payroll.components.create",
]

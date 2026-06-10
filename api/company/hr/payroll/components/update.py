# ============================================================
# ?? api/company/hr/payroll/components/update.py
# ?? PrimeyAcc | Salary Component Update API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import SalaryComponent
from hr.services import update_salary_component

from .serializers import (
    build_salary_component_data_from_request,
    serialize_salary_component,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def salary_component_update(request, component_id: int):
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

    component = SalaryComponent.objects.filter(
        company=company,
        id=component_id,
    ).first()

    if not component:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Salary component not found.",
            },
            status=404,
        )

    try:
        data = build_salary_component_data_from_request(request, partial=True)
        component = update_salary_component(
            component=component,
            updated_by=request.user,
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
            "message": "Salary component updated successfully.",
            "component": serialize_salary_component(component),
        }
    )


salary_component_update.required_company_permissions = [
    "company.hr.payroll.components.update",
]

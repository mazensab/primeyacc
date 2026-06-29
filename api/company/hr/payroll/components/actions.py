# ============================================================
# ?? api/company/hr/payroll/components/actions.py
# ?? Mhamcloud | Salary Component Actions API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import SalaryComponent
from hr.services import (
    activate_salary_component,
    deactivate_salary_component,
)

from .serializers import serialize_salary_component


def _get_company_component(request, component_id: int):
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

    component = SalaryComponent.objects.filter(
        company=company,
        id=component_id,
    ).first()

    if not component:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Salary component not found.",
            },
            status=404,
        )

    return component, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def salary_component_activate(request, component_id: int):
    component, error_response = _get_company_component(request, component_id)
    if error_response:
        return error_response

    try:
        component = activate_salary_component(
            component=component,
            updated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not activate salary component.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary component activated successfully.",
            "component": serialize_salary_component(component),
        }
    )


salary_component_activate.required_company_permissions = [
    "company.hr.payroll.components.activate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def salary_component_deactivate(request, component_id: int):
    component, error_response = _get_company_component(request, component_id)
    if error_response:
        return error_response

    try:
        component = deactivate_salary_component(
            component=component,
            updated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not deactivate salary component.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary component deactivated successfully.",
            "component": serialize_salary_component(component),
        }
    )


salary_component_deactivate.required_company_permissions = [
    "company.hr.payroll.components.deactivate",
]

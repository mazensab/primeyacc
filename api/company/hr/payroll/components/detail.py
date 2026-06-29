# ============================================================
# ?? api/company/hr/payroll/components/detail.py
# ?? Mhamcloud | Salary Component Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import SalaryComponent

from .serializers import serialize_salary_component


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def salary_component_detail(request, component_id: int):
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

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary component loaded successfully.",
            "component": serialize_salary_component(component),
        }
    )


salary_component_detail.required_company_permissions = [
    "company.hr.payroll.components.view",
]

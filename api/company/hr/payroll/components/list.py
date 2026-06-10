# ============================================================
# ?? api/company/hr/payroll/components/list.py
# ?? PrimeyAcc | Salary Components List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import SalaryComponent

from .serializers import (
    serialize_salary_component,
    serialize_salary_component_choices,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def salary_components_list(request):
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

    query = SalaryComponent.objects.filter(company=company)

    search = str(request.query_params.get("search", "")).strip()
    if search:
        query = query.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(notes__icontains=search)
        )

    component_type = str(request.query_params.get("component_type", "")).strip()
    if component_type:
        query = query.filter(component_type=component_type)

    calculation_type = str(request.query_params.get("calculation_type", "")).strip()
    if calculation_type:
        query = query.filter(calculation_type=calculation_type)

    is_active = request.query_params.get("is_active")
    if is_active not in [None, ""]:
        is_active_value = str(is_active).lower() in ["1", "true", "yes", "on"]
        query = query.filter(is_active=is_active_value)

    query = query.order_by("sort_order", "name", "id")

    try:
        page = max(int(request.query_params.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get("page_size", 50))
    except (TypeError, ValueError):
        page_size = 50

    page_size = min(max(page_size, 1), 200)

    total = query.count()
    start = (page - 1) * page_size
    end = start + page_size

    results = [
        serialize_salary_component(component)
        for component in query[start:end]
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary components loaded successfully.",
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
            "choices": serialize_salary_component_choices(),
        }
    )


salary_components_list.required_company_permissions = [
    "company.hr.payroll.components.view",
]

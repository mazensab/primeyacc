# ============================================================
# ?? api/company/hr/payroll/payslip_items/list.py
# ?? Mhamcloud | Payroll Payslip Items List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayslipItem

from .serializers import (
    serialize_payslip_item,
    serialize_payslip_item_choices,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payslip_items_list(request):
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

    query = PayslipItem.objects.select_related(
        "payslip",
        "payslip__employee",
        "payslip__payroll_run",
        "payslip__period",
        "component",
    ).filter(company=company)

    search = str(request.query_params.get("search", "")).strip()
    if search:
        query = query.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(notes__icontains=search)
            | Q(payslip__payslip_number__icontains=search)
            | Q(payslip__employee__employee_number__icontains=search)
            | Q(payslip__employee__first_name__icontains=search)
            | Q(payslip__employee__last_name__icontains=search)
            | Q(payslip__employee__display_name__icontains=search)
        )

    payslip_id = request.query_params.get("payslip_id")
    if payslip_id:
        query = query.filter(payslip_id=payslip_id)

    payroll_run_id = request.query_params.get("payroll_run_id")
    if payroll_run_id:
        query = query.filter(payslip__payroll_run_id=payroll_run_id)

    employee_id = request.query_params.get("employee_id")
    if employee_id:
        query = query.filter(payslip__employee_id=employee_id)

    component_type = str(request.query_params.get("component_type", "")).strip()
    if component_type:
        query = query.filter(component_type=component_type)

    component_id = request.query_params.get("component_id")
    if component_id:
        query = query.filter(component_id=component_id)

    query = query.order_by("payslip__payslip_number", "id")

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
        serialize_payslip_item(item)
        for item in query[start:end]
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip items loaded successfully.",
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
            "choices": serialize_payslip_item_choices(),
        }
    )


payslip_items_list.required_company_permissions = [
    "company.hr.payroll.payslip_items.view",
]

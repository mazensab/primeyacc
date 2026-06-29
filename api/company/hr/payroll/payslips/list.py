# ============================================================
# ?? api/company/hr/payroll/payslips/list.py
# ?? Mhamcloud | Payroll Payslips List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Payslip

from .serializers import (
    serialize_payslip,
    serialize_payslip_choices,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payslips_list(request):
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

    query = Payslip.objects.select_related(
        "payroll_run",
        "period",
        "employee",
        "salary_profile",
    ).filter(company=company)

    search = str(request.query_params.get("search", "")).strip()
    if search:
        query = query.filter(
            Q(payslip_number__icontains=search)
            | Q(employee__employee_number__icontains=search)
            | Q(employee__first_name__icontains=search)
            | Q(employee__middle_name__icontains=search)
            | Q(employee__last_name__icontains=search)
            | Q(employee__display_name__icontains=search)
            | Q(employee__job_title__icontains=search)
            | Q(employee__department_name__icontains=search)
            | Q(payroll_run__run_number__icontains=search)
            | Q(payroll_run__name__icontains=search)
            | Q(notes__icontains=search)
        )

    payroll_run_id = request.query_params.get("payroll_run_id")
    if payroll_run_id:
        query = query.filter(payroll_run_id=payroll_run_id)

    period_id = request.query_params.get("period_id")
    if period_id:
        query = query.filter(period_id=period_id)

    employee_id = request.query_params.get("employee_id")
    if employee_id:
        query = query.filter(employee_id=employee_id)

    status_value = str(request.query_params.get("status", "")).strip()
    if status_value:
        query = query.filter(status=status_value)

    year = request.query_params.get("year")
    if year:
        query = query.filter(period__year=year)

    month = request.query_params.get("month")
    if month:
        query = query.filter(period__month=month)

    query = query.order_by("-created_at", "-id")

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
        serialize_payslip(payslip)
        for payslip in query[start:end]
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslips loaded successfully.",
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
            "choices": serialize_payslip_choices(),
        }
    )


payslips_list.required_company_permissions = [
    "company.hr.payroll.payslips.view",
]

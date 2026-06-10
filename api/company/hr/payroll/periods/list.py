# ============================================================
# ?? api/company/hr/payroll/periods/list.py
# ?? PrimeyAcc | Payroll Periods List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollPeriod

from .serializers import (
    serialize_payroll_period,
    serialize_payroll_period_choices,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payroll_periods_list(request):
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

    query = PayrollPeriod.objects.filter(company=company)

    search = str(request.query_params.get("search", "")).strip()
    if search:
        query = query.filter(
            Q(name__icontains=search)
            | Q(notes__icontains=search)
        )

    year = request.query_params.get("year")
    if year:
        query = query.filter(year=year)

    month = request.query_params.get("month")
    if month:
        query = query.filter(month=month)

    status_value = str(request.query_params.get("status", "")).strip()
    if status_value:
        query = query.filter(status=status_value)

    query = query.order_by("-year", "-month", "-id")

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
        serialize_payroll_period(period)
        for period in query[start:end]
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll periods loaded successfully.",
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
            "choices": serialize_payroll_period_choices(),
        }
    )


payroll_periods_list.required_company_permissions = [
    "company.hr.payroll.periods.view",
]

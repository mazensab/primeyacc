# ============================================================
# ?? api/company/hr/payroll/runs/list.py
# ?? PrimeyAcc | Payroll Runs List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollRun

from .serializers import (
    serialize_payroll_run,
    serialize_payroll_run_choices,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payroll_runs_list(request):
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

    query = PayrollRun.objects.select_related(
        "period",
    ).filter(company=company)

    search = str(request.query_params.get("search", "")).strip()
    if search:
        query = query.filter(
            Q(run_number__icontains=search)
            | Q(name__icontains=search)
            | Q(period__name__icontains=search)
            | Q(notes__icontains=search)
        )

    period_id = request.query_params.get("period_id")
    if period_id:
        query = query.filter(period_id=period_id)

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
        serialize_payroll_run(payroll_run)
        for payroll_run in query[start:end]
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll runs loaded successfully.",
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
            "choices": serialize_payroll_run_choices(),
        }
    )


payroll_runs_list.required_company_permissions = [
    "company.hr.payroll.runs.view",
]

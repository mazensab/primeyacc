# ============================================================
# ?? api/company/hr/payroll/profiles/list.py
# ?? PrimeyAcc | Employee Salary Profiles List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeSalaryProfile

from .serializers import serialize_employee_salary_profile


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def salary_profiles_list(request):
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

    query = EmployeeSalaryProfile.objects.select_related(
        "employee",
        "company",
    ).filter(company=company)

    search = str(request.query_params.get("search", "")).strip()
    if search:
        query = query.filter(
            Q(employee__employee_number__icontains=search)
            | Q(employee__first_name__icontains=search)
            | Q(employee__middle_name__icontains=search)
            | Q(employee__last_name__icontains=search)
            | Q(employee__display_name__icontains=search)
            | Q(employee__job_title__icontains=search)
            | Q(employee__department_name__icontains=search)
            | Q(bank_name__icontains=search)
            | Q(iban__icontains=search)
        )

    employee_id = request.query_params.get("employee_id")
    if employee_id:
        query = query.filter(employee_id=employee_id)

    is_active = request.query_params.get("is_active")
    if is_active not in [None, ""]:
        is_active_value = str(is_active).lower() in ["1", "true", "yes", "on"]
        query = query.filter(is_active=is_active_value)

    currency = str(request.query_params.get("currency", "")).strip().upper()
    if currency:
        query = query.filter(currency=currency)

    query = query.order_by("employee__employee_number", "-effective_from", "-id")

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
        serialize_employee_salary_profile(profile)
        for profile in query[start:end]
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Salary profiles loaded successfully.",
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
        }
    )


salary_profiles_list.required_company_permissions = [
    "company.hr.payroll.profiles.view",
]

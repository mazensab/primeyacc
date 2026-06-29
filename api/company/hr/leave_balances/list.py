# ============================================================
# 📂 api/company/hr/leave_balances/list.py
# 🧠 Mhamcloud | Company HR Leave Balances List API V1.0
# ============================================================

from __future__ import annotations

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveBalance

from .serializers import serialize_leave_balance


def _parse_positive_int(value, default: int, maximum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    if parsed < 1:
        parsed = default

    if maximum is not None:
        parsed = min(parsed, maximum)

    return parsed


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_balances_list(request: Request) -> Response:
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

    query_params = request.query_params

    qs = (
        LeaveBalance.objects.select_related(
            "company",
            "employee",
            "leave_type",
        )
        .filter(company=company)
        .order_by("-year", "employee__employee_number", "leave_type__name", "id")
    )

    search = (query_params.get("search") or query_params.get("q") or "").strip()
    employee_id = query_params.get("employee_id")
    leave_type_id = query_params.get("leave_type_id")
    year = query_params.get("year")

    if search:
        qs = qs.filter(
            Q(employee__employee_number__icontains=search)
            | Q(employee__first_name__icontains=search)
            | Q(employee__middle_name__icontains=search)
            | Q(employee__last_name__icontains=search)
            | Q(employee__display_name__icontains=search)
            | Q(leave_type__name__icontains=search)
            | Q(leave_type__code__icontains=search)
            | Q(notes__icontains=search)
        )

    if employee_id:
        qs = qs.filter(employee_id=employee_id)

    if leave_type_id:
        qs = qs.filter(leave_type_id=leave_type_id)

    if year:
        qs = qs.filter(year=year)

    total_records = qs.count()

    page = _parse_positive_int(query_params.get("page"), default=1)
    page_size = _parse_positive_int(
        query_params.get("page_size"),
        default=25,
        maximum=100,
    )

    paginator = Paginator(qs, page_size)

    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages or 1)

    items = [
        serialize_leave_balance(balance)
        for balance in page_obj.object_list
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Leave balances loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "filters": {
                "search": search,
                "employee_id": employee_id,
                "leave_type_id": leave_type_id,
                "year": year,
            },
            "count": total_records,
            "page": page_obj.number,
            "page_size": page_size,
            "num_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "items": items,
            "results": items,
        },
        status=200,
    )


company_hr_leave_balances_list.required_company_permissions = [
    "company.hr.leave_balances.view",
]
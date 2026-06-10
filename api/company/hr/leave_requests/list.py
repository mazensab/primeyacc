# ============================================================
# 📂 api/company/hr/leave_requests/list.py
# 🧠 PrimeyAcc | Company HR Leave Requests List API V1.0
# ============================================================

from __future__ import annotations

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveRequest

from .serializers import serialize_leave_request, serialize_leave_request_choices


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
def company_hr_leave_requests_list(request: Request) -> Response:
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
        LeaveRequest.objects.select_related(
            "company",
            "employee",
            "leave_type",
            "approved_by",
            "rejected_by",
            "cancelled_by",
        )
        .filter(company=company)
        .order_by("-start_date", "-id")
    )

    search = (query_params.get("search") or query_params.get("q") or "").strip()
    employee_id = query_params.get("employee_id")
    leave_type_id = query_params.get("leave_type_id")
    status_value = (query_params.get("status") or "").strip()
    date_from = query_params.get("date_from") or query_params.get("from")
    date_to = query_params.get("date_to") or query_params.get("to")

    if search:
        qs = qs.filter(
            Q(employee__employee_number__icontains=search)
            | Q(employee__first_name__icontains=search)
            | Q(employee__middle_name__icontains=search)
            | Q(employee__last_name__icontains=search)
            | Q(employee__display_name__icontains=search)
            | Q(leave_type__name__icontains=search)
            | Q(leave_type__code__icontains=search)
            | Q(reason__icontains=search)
            | Q(employee_note__icontains=search)
            | Q(manager_note__icontains=search)
        )

    if employee_id:
        qs = qs.filter(employee_id=employee_id)

    if leave_type_id:
        qs = qs.filter(leave_type_id=leave_type_id)

    if status_value:
        qs = qs.filter(status=status_value)

    if date_from:
        qs = qs.filter(start_date__gte=date_from)

    if date_to:
        qs = qs.filter(end_date__lte=date_to)

    total_records = qs.count()
    total_requested_units = qs.aggregate(total=Sum("requested_units"))["total"] or 0

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
        serialize_leave_request(leave_request)
        for leave_request in page_obj.object_list
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Leave requests loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "filters": {
                "search": search,
                "employee_id": employee_id,
                "leave_type_id": leave_type_id,
                "status": status_value,
                "date_from": date_from,
                "date_to": date_to,
            },
            "count": total_records,
            "page": page_obj.number,
            "page_size": page_size,
            "num_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "summary": {
                "total_records": total_records,
                "total_requested_units": str(total_requested_units),
            },
            "items": items,
            "results": items,
            "choices": serialize_leave_request_choices(),
        },
        status=200,
    )


company_hr_leave_requests_list.required_company_permissions = [
    "company.hr.leave_requests.view",
]
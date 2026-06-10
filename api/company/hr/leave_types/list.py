# ============================================================
# 📂 api/company/hr/leave_types/list.py
# 🧠 PrimeyAcc | Company HR Leave Types List API V1.0
# ============================================================

from __future__ import annotations

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveType

from .serializers import serialize_leave_type, serialize_leave_type_choices


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


def _parse_bool(value):
    if value is None:
        return None

    normalized = str(value).strip().lower()
    if normalized in ["1", "true", "yes", "y", "on"]:
        return True
    if normalized in ["0", "false", "no", "n", "off"]:
        return False

    return None


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_types_list(request: Request) -> Response:
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

    qs = LeaveType.objects.filter(company=company).order_by("name", "id")

    search = (query_params.get("search") or query_params.get("q") or "").strip()
    is_active = _parse_bool(query_params.get("is_active"))
    unit = (query_params.get("unit") or "").strip()

    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(notes__icontains=search)
        )

    if is_active is not None:
        qs = qs.filter(is_active=is_active)

    if unit:
        qs = qs.filter(unit=unit)

    total_records = qs.count()
    active_records = qs.filter(is_active=True).count()
    inactive_records = qs.filter(is_active=False).count()

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

    items = [serialize_leave_type(leave_type) for leave_type in page_obj.object_list]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Leave types loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "filters": {
                "search": search,
                "is_active": is_active,
                "unit": unit,
            },
            "count": total_records,
            "page": page_obj.number,
            "page_size": page_size,
            "num_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "summary": {
                "total_records": total_records,
                "active_records": active_records,
                "inactive_records": inactive_records,
            },
            "items": items,
            "results": items,
            "choices": serialize_leave_type_choices(),
        },
        status=200,
    )


company_hr_leave_types_list.required_company_permissions = [
    "company.hr.leave_types.view",
]
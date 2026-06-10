# ============================================================
# 📂 api/company/hr/attendance/list.py
# 🧠 PrimeyAcc | Company HR Attendance List API V1.0
# ------------------------------------------------------------
# ✅ List company-scoped attendance records
# ✅ Tenant isolation through request.company
# ✅ Filters by employee, branch, status, source, date range
# ✅ Search by employee number/name
# ✅ Pagination
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن عرض حضور شركة أخرى
# ============================================================

from __future__ import annotations

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import AttendanceRecord

from .serializers import serialize_attendance_choices, serialize_attendance_record


def _parse_positive_int(value, default: int, maximum: int | None = None) -> int:
    """
    Parse positive int from query params safely.
    """

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
    """
    Parse boolean-like query values.
    """

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
def company_hr_attendance_list(request: Request) -> Response:
    """
    GET /api/company/hr/attendance/

    List attendance records for current company only.
    """

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
        AttendanceRecord.objects.select_related(
            "company",
            "branch",
            "employee",
        )
        .filter(company=company)
        .order_by("-work_date", "-check_in_at", "-id")
    )

    search = (query_params.get("search") or query_params.get("q") or "").strip()
    employee_id = query_params.get("employee_id")
    branch_id = query_params.get("branch_id") or query_params.get("branch")
    status_value = (query_params.get("status") or "").strip()
    source_value = (query_params.get("source") or "").strip()
    date_from = query_params.get("date_from") or query_params.get("from")
    date_to = query_params.get("date_to") or query_params.get("to")
    is_open = _parse_bool(query_params.get("is_open"))

    if search:
        qs = qs.filter(
            Q(employee__employee_number__icontains=search)
            | Q(employee__first_name__icontains=search)
            | Q(employee__middle_name__icontains=search)
            | Q(employee__last_name__icontains=search)
            | Q(employee__display_name__icontains=search)
            | Q(employee__email__icontains=search)
            | Q(employee__mobile__icontains=search)
            | Q(check_in_note__icontains=search)
            | Q(check_out_note__icontains=search)
            | Q(notes__icontains=search)
        )

    if employee_id:
        qs = qs.filter(employee_id=employee_id)

    if branch_id:
        qs = qs.filter(branch_id=branch_id)

    if status_value:
        qs = qs.filter(status=status_value)

    if source_value:
        qs = qs.filter(source=source_value)

    if date_from:
        qs = qs.filter(work_date__gte=date_from)

    if date_to:
        qs = qs.filter(work_date__lte=date_to)

    if is_open is True:
        qs = qs.filter(check_out_at__isnull=True).exclude(status="CANCELLED")

    if is_open is False:
        qs = qs.filter(check_out_at__isnull=False)

    total_records = qs.count()
    open_records = qs.filter(check_out_at__isnull=True).exclude(status="CANCELLED").count()
    closed_records = qs.filter(check_out_at__isnull=False).count()
    total_minutes = sum(qs.values_list("total_minutes", flat=True) or [0])

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
        serialize_attendance_record(record)
        for record in page_obj.object_list
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Attendance records loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "filters": {
                "search": search,
                "employee_id": employee_id,
                "branch_id": branch_id,
                "status": status_value,
                "source": source_value,
                "date_from": date_from,
                "date_to": date_to,
                "is_open": is_open,
            },
            "count": total_records,
            "page": page_obj.number,
            "page_size": page_size,
            "num_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "summary": {
                "total_records": total_records,
                "open_records": open_records,
                "closed_records": closed_records,
                "total_minutes": total_minutes,
                "total_hours": round(total_minutes / 60, 2) if total_minutes else 0,
            },
            "items": items,
            "results": items,
            "choices": serialize_attendance_choices(),
        },
        status=200,
    )


company_hr_attendance_list.required_company_permissions = [
    "company.hr.attendance.view",
]
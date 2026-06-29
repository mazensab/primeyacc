# ============================================================
# 📂 api/company/hr/employees/list.py
# 🧠 Mhamcloud | Company HR Employees List API V1.0
# ------------------------------------------------------------
# ✅ List company-scoped employees
# ✅ Search and safe filters
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe pagination response
# ✅ Choices payload for frontend forms
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقرأ company_id من الفرونت كمصدر ثقة
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - كل Query يجب أن يكون محصورًا في request.company
# - صلاحية العرض المطلوبة: company.hr.employees.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q, QuerySet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee

from .serializers import serialize_employee, serialize_employee_choices


def _clean_text(value: Any) -> str:
    """
    Safely clean query params.
    """

    return str(value or "").strip()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """

    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _apply_filters(queryset: QuerySet[Employee], request: Request) -> QuerySet[Employee]:
    """
    Apply safe filters inside current company scope.
    """

    search = _clean_text(request.query_params.get("search") or request.query_params.get("q"))
    status = _clean_text(request.query_params.get("status")).upper()
    employment_type = _clean_text(
        request.query_params.get("employment_type") or request.query_params.get("type")
    ).upper()
    department_name = _clean_text(
        request.query_params.get("department_name") or request.query_params.get("department")
    )
    job_title = _clean_text(request.query_params.get("job_title"))
    branch_id = _clean_text(request.query_params.get("branch_id") or request.query_params.get("branch"))
    is_active = _clean_text(request.query_params.get("is_active")).lower()

    if search:
        queryset = queryset.filter(
            Q(employee_number__icontains=search)
            | Q(first_name__icontains=search)
            | Q(middle_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(display_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
            | Q(mobile__icontains=search)
            | Q(national_id__icontains=search)
            | Q(job_title__icontains=search)
            | Q(department_name__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__name_ar__icontains=search)
            | Q(branch__name_en__icontains=search)
            | Q(branch__branch_code__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if employment_type:
        queryset = queryset.filter(employment_type=employment_type)

    if department_name:
        queryset = queryset.filter(department_name__icontains=department_name)

    if job_title:
        queryset = queryset.filter(job_title__icontains=job_title)

    if branch_id:
        try:
            queryset = queryset.filter(branch_id=int(branch_id))
        except (TypeError, ValueError):
            queryset = queryset.none()

    if is_active in {"1", "true", "yes", "active"}:
        queryset = queryset.filter(is_active=True)
    elif is_active in {"0", "false", "no", "inactive"}:
        queryset = queryset.filter(is_active=False)

    return queryset


def _apply_ordering(queryset: QuerySet[Employee], request: Request) -> QuerySet[Employee]:
    """
    Apply restricted safe ordering.
    """

    ordering = _clean_text(request.query_params.get("ordering") or request.query_params.get("sort"))

    allowed_ordering = {
        "employee_number": "employee_number",
        "-employee_number": "-employee_number",
        "name": "display_name",
        "-name": "-display_name",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "hire_date": "hire_date",
        "-hire_date": "-hire_date",
        "department_name": "department_name",
        "-department_name": "-department_name",
        "job_title": "job_title",
        "-job_title": "-job_title",
    }

    return queryset.order_by(
        allowed_ordering.get(ordering, "employee_number"),
        "id",
    )


def _summary_payload(base_queryset: QuerySet[Employee]) -> dict[str, Any]:
    """
    Return quick HR employees summary for company workspace UI.
    """

    return {
        "total": base_queryset.count(),
        "active": base_queryset.filter(is_active=True).count(),
        "inactive": base_queryset.filter(is_active=False).count(),
        "on_leave": base_queryset.filter(status="ON_LEAVE").count(),
        "terminated": base_queryset.filter(status="TERMINATED").count(),
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_employees_list(request: Request) -> Response:
    """
    GET /api/company/hr/employees/

    Return employees for the current company only.
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

    page = _clean_positive_int(
        request.query_params.get("page"),
        default=1,
    )
    page_size = _clean_positive_int(
        request.query_params.get("page_size") or request.query_params.get("per_page"),
        default=25,
        maximum=100,
    )

    base_queryset = (
        Employee.objects.select_related("company", "branch", "user")
        .filter(company=company)
    )

    queryset = _apply_filters(base_queryset, request)
    queryset = _apply_ordering(queryset, request)

    paginator = Paginator(queryset, page_size)

    try:
        page_obj = paginator.page(page)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages or 1)

    items = [
        serialize_employee(employee)
        for employee in page_obj.object_list
    ]

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Employees loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "filters": {
                "search": request.query_params.get("search")
                or request.query_params.get("q")
                or "",
                "status": request.query_params.get("status") or "",
                "employment_type": request.query_params.get("employment_type")
                or request.query_params.get("type")
                or "",
                "department_name": request.query_params.get("department_name")
                or request.query_params.get("department")
                or "",
                "job_title": request.query_params.get("job_title") or "",
                "branch_id": request.query_params.get("branch_id")
                or request.query_params.get("branch")
                or "",
                "is_active": request.query_params.get("is_active") or "",
            },
            "count": paginator.count,
            "page": page_obj.number,
            "page_size": page_size,
            "num_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "summary": _summary_payload(base_queryset),
            "items": items,
            "results": items,
            "choices": serialize_employee_choices(),
        },
        status=200,
    )


company_hr_employees_list.required_company_permissions = [
    "company.hr.employees.view",
]
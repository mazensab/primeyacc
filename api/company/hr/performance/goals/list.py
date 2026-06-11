from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeGoal

from .serializers import serialize_employee_goal


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def employee_goals_list(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    qs = (
        EmployeeGoal.objects.filter(company=company)
        .select_related("employee", "cycle")
        .order_by("-created_at", "-id")
    )

    employee_id = request.query_params.get("employee_id")
    if employee_id:
        qs = qs.filter(employee_id=employee_id)

    cycle_id = request.query_params.get("cycle_id")
    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)

    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    priority = request.query_params.get("priority")
    if priority:
        qs = qs.filter(priority=priority)

    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(employee__employee_number__icontains=search)
            | Q(employee__display_name__icontains=search)
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "results": [serialize_employee_goal(goal) for goal in qs],
        }
    )


employee_goals_list.required_company_permissions = [
    "company.hr.performance.goals.view",
]

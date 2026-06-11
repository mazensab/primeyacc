from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeGoal

from .serializers import serialize_employee_goal


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def employee_goal_detail(request, goal_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        goal = EmployeeGoal.objects.select_related("employee", "cycle").get(id=goal_id, company=company)
    except EmployeeGoal.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Employee goal not found."},
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "goal": serialize_employee_goal(goal),
        }
    )


employee_goal_detail.required_company_permissions = [
    "company.hr.performance.goals.view",
]

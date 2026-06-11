from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee, EmployeeGoal, PerformanceCycle
from hr.services import update_employee_goal

from .serializers import serialize_employee_goal


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def employee_goal_update(request, goal_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        goal = EmployeeGoal.objects.get(id=goal_id, company=company)
    except EmployeeGoal.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Employee goal not found."},
            status=404,
        )

    data = dict(request.data)

    if "employee_id" in data:
        try:
            data["employee"] = Employee.objects.get(
                id=data.pop("employee_id"),
                company=company,
            )
        except Employee.DoesNotExist:
            return Response(
                {"ok": False, "success": False, "message": "Employee not found."},
                status=404,
            )

    if "cycle_id" in data:
        cycle_id = data.pop("cycle_id")
        if cycle_id:
            try:
                data["cycle"] = PerformanceCycle.objects.get(id=cycle_id, company=company)
            except PerformanceCycle.DoesNotExist:
                return Response(
                    {"ok": False, "success": False, "message": "Performance cycle not found."},
                    status=404,
                )
        else:
            data["cycle"] = None

    try:
        goal = update_employee_goal(
            goal=goal,
            updated_by=request.user,
            data=data,
        )
    except ValidationError as exc:
        return Response(
            {"ok": False, "success": False, "message": "Validation error.", "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages},
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Employee goal updated successfully.",
            "goal": serialize_employee_goal(goal),
        }
    )


employee_goal_update.required_company_permissions = [
    "company.hr.performance.goals.update",
]

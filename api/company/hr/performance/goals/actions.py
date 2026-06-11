from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeeGoal
from hr.services import (
    activate_employee_goal,
    cancel_employee_goal,
    complete_employee_goal,
)

from .serializers import serialize_employee_goal


def _get_goal_or_response(*, company, goal_id: int):
    try:
        return EmployeeGoal.objects.select_related("employee", "cycle").get(id=goal_id, company=company), None
    except EmployeeGoal.DoesNotExist:
        return None, Response(
            {"ok": False, "success": False, "message": "Employee goal not found."},
            status=404,
        )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def employee_goal_activate(request, goal_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    goal, error_response = _get_goal_or_response(company=company, goal_id=goal_id)
    if error_response:
        return error_response

    try:
        goal = activate_employee_goal(goal=goal, updated_by=request.user)
    except ValidationError as exc:
        return Response(
            {"ok": False, "success": False, "message": "Validation error.", "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages},
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Employee goal activated successfully.",
            "goal": serialize_employee_goal(goal),
        }
    )


employee_goal_activate.required_company_permissions = [
    "company.hr.performance.goals.activate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def employee_goal_complete(request, goal_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    goal, error_response = _get_goal_or_response(company=company, goal_id=goal_id)
    if error_response:
        return error_response

    try:
        goal = complete_employee_goal(
            goal=goal,
            completed_by=request.user,
            note=request.data.get("note", ""),
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
            "message": "Employee goal completed successfully.",
            "goal": serialize_employee_goal(goal),
        }
    )


employee_goal_complete.required_company_permissions = [
    "company.hr.performance.goals.complete",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def employee_goal_cancel(request, goal_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    goal, error_response = _get_goal_or_response(company=company, goal_id=goal_id)
    if error_response:
        return error_response

    try:
        goal = cancel_employee_goal(
            goal=goal,
            cancelled_by=request.user,
            note=request.data.get("note", ""),
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
            "message": "Employee goal cancelled successfully.",
            "goal": serialize_employee_goal(goal),
        }
    )


employee_goal_cancel.required_company_permissions = [
    "company.hr.performance.goals.cancel",
]

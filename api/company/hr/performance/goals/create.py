from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee, PerformanceCycle
from hr.services import create_employee_goal

from .serializers import serialize_employee_goal


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def employee_goal_create(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    employee_id = request.data.get("employee_id") or request.data.get("employee")

    try:
        employee = Employee.objects.get(id=employee_id, company=company)
    except Employee.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Employee not found."},
            status=404,
        )

    data = dict(request.data)
    data.pop("employee", None)
    data.pop("employee_id", None)

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

    try:
        goal = create_employee_goal(
            company=company,
            employee=employee,
            created_by=request.user,
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
            "message": "Employee goal created successfully.",
            "goal": serialize_employee_goal(goal),
        },
        status=201,
    )


employee_goal_create.required_company_permissions = [
    "company.hr.performance.goals.create",
]

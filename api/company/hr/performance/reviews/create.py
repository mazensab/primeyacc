from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee, PerformanceCycle
from hr.services import create_employee_performance_review

from .serializers import serialize_employee_performance_review


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_review_create(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    cycle_id = request.data.get("cycle_id") or request.data.get("cycle")
    employee_id = request.data.get("employee_id") or request.data.get("employee")

    try:
        cycle = PerformanceCycle.objects.get(id=cycle_id, company=company)
    except PerformanceCycle.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance cycle not found."},
            status=404,
        )

    try:
        employee = Employee.objects.get(id=employee_id, company=company)
    except Employee.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Employee not found."},
            status=404,
        )

    data = dict(request.data)
    data.pop("cycle", None)
    data.pop("cycle_id", None)
    data.pop("employee", None)
    data.pop("employee_id", None)

    try:
        review = create_employee_performance_review(
            company=company,
            cycle=cycle,
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
            "message": "Performance review created successfully.",
            "review": serialize_employee_performance_review(review),
        },
        status=201,
    )


performance_review_create.required_company_permissions = [
    "company.hr.performance.reviews.create",
]

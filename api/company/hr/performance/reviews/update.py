from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee, EmployeePerformanceReview, PerformanceCycle
from hr.services import update_employee_performance_review

from .serializers import serialize_employee_performance_review


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def performance_review_update(request, review_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        review = EmployeePerformanceReview.objects.get(id=review_id, company=company)
    except EmployeePerformanceReview.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance review not found."},
            status=404,
        )

    data = dict(request.data)

    if "cycle_id" in data:
        try:
            data["cycle"] = PerformanceCycle.objects.get(id=data.pop("cycle_id"), company=company)
        except PerformanceCycle.DoesNotExist:
            return Response(
                {"ok": False, "success": False, "message": "Performance cycle not found."},
                status=404,
            )

    if "employee_id" in data:
        try:
            data["employee"] = Employee.objects.get(id=data.pop("employee_id"), company=company)
        except Employee.DoesNotExist:
            return Response(
                {"ok": False, "success": False, "message": "Employee not found."},
                status=404,
            )

    try:
        review = update_employee_performance_review(
            review=review,
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
            "message": "Performance review updated successfully.",
            "review": serialize_employee_performance_review(review),
        }
    )


performance_review_update.required_company_permissions = [
    "company.hr.performance.reviews.update",
]

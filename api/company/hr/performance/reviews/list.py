from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeePerformanceReview

from .serializers import serialize_employee_performance_review


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_reviews_list(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    qs = (
        EmployeePerformanceReview.objects.filter(company=company)
        .select_related("cycle", "employee", "reviewer")
        .order_by("-created_at", "-id")
    )

    cycle_id = request.query_params.get("cycle_id")
    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)

    employee_id = request.query_params.get("employee_id")
    if employee_id:
        qs = qs.filter(employee_id=employee_id)

    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    return Response(
        {
            "ok": True,
            "success": True,
            "results": [
                serialize_employee_performance_review(review)
                for review in qs
            ],
        }
    )


performance_reviews_list.required_company_permissions = [
    "company.hr.performance.reviews.view",
]

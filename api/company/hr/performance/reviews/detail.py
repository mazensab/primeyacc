from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeePerformanceReview

from .serializers import serialize_employee_performance_review


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_review_detail(request, review_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        review = (
            EmployeePerformanceReview.objects.select_related(
                "cycle",
                "employee",
                "reviewer",
                "approved_by",
                "cancelled_by",
            )
            .prefetch_related("scores__criterion")
            .get(id=review_id, company=company)
        )
    except EmployeePerformanceReview.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance review not found."},
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "review": serialize_employee_performance_review(review, include_scores=True),
        }
    )


performance_review_detail.required_company_permissions = [
    "company.hr.performance.reviews.view",
]

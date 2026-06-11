from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeePerformanceReview, PerformanceCriterion
from hr.services import create_performance_review_score

from .serializers import serialize_performance_review_score


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_score_create(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    review_id = request.data.get("review_id") or request.data.get("review")
    criterion_id = request.data.get("criterion_id") or request.data.get("criterion")

    try:
        review = EmployeePerformanceReview.objects.get(id=review_id, company=company)
    except EmployeePerformanceReview.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance review not found."},
            status=404,
        )

    try:
        criterion = PerformanceCriterion.objects.get(id=criterion_id, company=company)
    except PerformanceCriterion.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance criterion not found."},
            status=404,
        )

    data = dict(request.data)
    data.pop("review", None)
    data.pop("review_id", None)
    data.pop("criterion", None)
    data.pop("criterion_id", None)

    try:
        score = create_performance_review_score(
            company=company,
            review=review,
            criterion=criterion,
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
            "message": "Performance score created successfully.",
            "score": serialize_performance_review_score(score),
        },
        status=201,
    )


performance_score_create.required_company_permissions = [
    "company.hr.performance.scores.create",
]

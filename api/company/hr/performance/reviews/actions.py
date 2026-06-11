from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeePerformanceReview
from hr.services import (
    approve_employee_performance_review,
    cancel_employee_performance_review,
    submit_employee_performance_review,
)

from .serializers import serialize_employee_performance_review


def _get_review_or_response(*, company, review_id: int):
    try:
        return EmployeePerformanceReview.objects.get(id=review_id, company=company), None
    except EmployeePerformanceReview.DoesNotExist:
        return None, Response(
            {"ok": False, "success": False, "message": "Performance review not found."},
            status=404,
        )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_review_submit(request, review_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    review, error_response = _get_review_or_response(company=company, review_id=review_id)
    if error_response:
        return error_response

    try:
        review = submit_employee_performance_review(
            review=review,
            submitted_by=request.user,
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
            "message": "Performance review submitted successfully.",
            "review": serialize_employee_performance_review(review),
        }
    )


performance_review_submit.required_company_permissions = [
    "company.hr.performance.reviews.submit",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_review_approve(request, review_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    review, error_response = _get_review_or_response(company=company, review_id=review_id)
    if error_response:
        return error_response

    try:
        review = approve_employee_performance_review(
            review=review,
            approved_by=request.user,
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
            "message": "Performance review approved successfully.",
            "review": serialize_employee_performance_review(review),
        }
    )


performance_review_approve.required_company_permissions = [
    "company.hr.performance.reviews.approve",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_review_cancel(request, review_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    review, error_response = _get_review_or_response(company=company, review_id=review_id)
    if error_response:
        return error_response

    try:
        review = cancel_employee_performance_review(
            review=review,
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
            "message": "Performance review cancelled successfully.",
            "review": serialize_employee_performance_review(review),
        }
    )


performance_review_cancel.required_company_permissions = [
    "company.hr.performance.reviews.cancel",
]

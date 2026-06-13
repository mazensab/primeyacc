from __future__ import annotations

import json
from typing import Any

from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse

from accounts.models import (
    CompanyMembership,
    MembershipStatus,
)
from sales.models import SalesOrder


def api_error(
    message: str,
    *,
    status: int = 400,
    errors: Any = None,
) -> JsonResponse:
    payload = {
        "success": False,
        "message": message,
    }

    if errors is not None:
        payload["errors"] = errors

    return JsonResponse(
        payload,
        status=status,
    )


def validation_error_response(
    exc: ValidationError,
) -> JsonResponse:
    if hasattr(exc, "message_dict"):
        errors = exc.message_dict
    else:
        errors = exc.messages

    return api_error(
        "Validation failed.",
        status=400,
        errors=errors,
    )


def parse_json_body(
    request: HttpRequest,
) -> dict[str, Any]:
    if not request.body:
        return {}

    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )
    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
    ) as exc:
        raise ValidationError(
            {"body": "Invalid JSON body."}
        ) from exc

    if not isinstance(payload, dict):
        raise ValidationError(
            {"body": "JSON body must be an object."}
        )

    return payload


def resolve_request_membership(
    request: HttpRequest,
) -> CompanyMembership | None:
    if not request.user.is_authenticated:
        return None

    request_membership = getattr(
        request,
        "company_membership",
        None,
    )

    if (
        request_membership
        and request_membership.user_id
        == request.user.id
        and request_membership.is_active_membership
    ):
        return request_membership

    request_company = getattr(
        request,
        "company",
        None,
    )

    queryset = (
        CompanyMembership.objects
        .select_related("company")
        .filter(
            user=request.user,
            status=MembershipStatus.ACTIVE,
            company__is_active=True,
        )
        .order_by(
            "-is_primary",
            "-created_at",
        )
    )

    if request_company is not None:
        queryset = queryset.filter(
            company=request_company,
        )

    for membership in queryset:
        if membership.is_active_membership:
            return membership

    return None


def require_company_permission(
    request: HttpRequest,
    permission: str,
):
    if not request.user.is_authenticated:
        return None, api_error(
            "Authentication is required.",
            status=401,
        )

    membership = resolve_request_membership(
        request
    )

    if not membership:
        return None, api_error(
            "Active company membership is required.",
            status=403,
        )

    if not membership.has_company_permission(
        permission
    ):
        return None, api_error(
            "You do not have permission for this action.",
            status=403,
        )

    return membership, None


def get_company_order(
    *,
    company,
    order_id: int,
) -> SalesOrder | None:
    return (
        SalesOrder.objects
        .select_related(
            "company",
            "branch",
            "customer",
            "source_quotation",
            "created_by",
            "updated_by",
            "confirmed_by",
            "processing_by",
            "completed_by",
            "cancelled_by",
        )
        .filter(
            company=company,
            id=order_id,
        )
        .first()
    )

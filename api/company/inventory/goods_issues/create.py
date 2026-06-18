from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import (
    create_goods_issue,
    post_goods_issue,
    serialize_goods_issue,
)

from ._shared import (
    GoodsIssueAPIError,
    company_payload,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_goods_issue_create(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        issue = create_goods_issue(
            company=company,
            payload=payload,
            user=user,
        )

        if payload.get("post_now"):
            issue = post_goods_issue(
                issue=issue,
                user=user,
            )

        data = serialize_goods_issue(
            issue,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Goods issue created successfully.",
                "company": company_payload(company),
                "goods_issue": data,
                "data": data,
            },
            status=201,
        )

    except GoodsIssueAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Goods issue could not be created.",
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_goods_issue_create.required_company_permissions = [
    "company.inventory.goods_issues.create",
]

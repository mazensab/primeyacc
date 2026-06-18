from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import (
    post_goods_issue,
    serialize_goods_issue,
)

from ._shared import (
    GoodsIssueAPIError,
    get_company_goods_issue,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_goods_issue_post(
    request: Request,
    goods_issue_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)

        issue = get_company_goods_issue(
            company=company,
            goods_issue_id=goods_issue_id,
        )

        if not issue:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Goods issue was not found.",
                    "errors": {
                        "detail": "Goods issue was not found.",
                    },
                },
                status=404,
            )

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
                "message": "Goods issue posted successfully.",
                "goods_issue": data,
                "data": data,
            },
            status=200,
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
                "message": "Goods issue could not be posted.",
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_goods_issue_post.required_company_permissions = [
    "company.inventory.goods_issues.post",
]

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import (
    cancel_goods_issue,
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
def company_goods_issue_cancel(
    request: Request,
    goods_issue_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

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

        reason = str(
            payload.get("reason")
            or payload.get("cancellation_reason")
            or ""
        ).strip()

        issue = cancel_goods_issue(
            issue=issue,
            reason=reason,
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
                "message": "Goods issue cancelled successfully.",
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
                "message": "Goods issue could not be cancelled.",
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_goods_issue_cancel.required_company_permissions = [
    "company.inventory.goods_issues.cancel",
]

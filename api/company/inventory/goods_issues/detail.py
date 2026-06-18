from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import serialize_goods_issue

from ._shared import (
    GoodsIssueAPIError,
    company_payload,
    get_company_goods_issue,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_goods_issue_detail(
    request: Request,
    goods_issue_id: int,
) -> Response:
    try:
        company = get_request_company(request)

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

        data = serialize_goods_issue(
            issue,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
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


company_goods_issue_detail.required_company_permissions = [
    "company.inventory.goods_issues.view",
]

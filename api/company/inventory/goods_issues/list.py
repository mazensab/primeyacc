from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import GoodsIssueStatus
from inventory.services import (
    get_company_goods_issues,
    serialize_goods_issue,
)

from ._shared import (
    GoodsIssueAPIError,
    company_payload,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_goods_issues_list(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)

        queryset = get_company_goods_issues(company)

        search = str(
            request.query_params.get("q")
            or request.query_params.get("search")
            or ""
        ).strip()

        status_value = str(
            request.query_params.get("status")
            or ""
        ).strip().upper()

        sales_order_id = request.query_params.get(
            "sales_order_id"
        )
        warehouse_id = request.query_params.get(
            "warehouse_id"
        )
        location_id = request.query_params.get(
            "location_id"
        )
        date_from = request.query_params.get(
            "date_from"
        )
        date_to = request.query_params.get(
            "date_to"
        )

        if search:
            queryset = queryset.filter(
                Q(issue_number__icontains=search)
                | Q(sales_order__order_number__icontains=search)
                | Q(warehouse__code__icontains=search)
                | Q(warehouse__name__icontains=search)
                | Q(location__code__icontains=search)
                | Q(location__name__icontains=search)
                | Q(notes__icontains=search)
            )

        if status_value:
            queryset = queryset.filter(status=status_value)

        if sales_order_id:
            queryset = queryset.filter(
                sales_order_id=sales_order_id
            )

        if warehouse_id:
            queryset = queryset.filter(
                warehouse_id=warehouse_id
            )

        if location_id:
            queryset = queryset.filter(
                location_id=location_id
            )

        if date_from:
            queryset = queryset.filter(
                issue_date__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                issue_date__lte=date_to
            )

        results = [
            serialize_goods_issue(issue, include_items=False)
            for issue in queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "count": len(results),
                "results": results,
                "items": results,
                "choices": {
                    "statuses": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in GoodsIssueStatus.choices
                    ],
                },
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


company_goods_issues_list.required_company_permissions = [
    "company.inventory.goods_issues.view",
]

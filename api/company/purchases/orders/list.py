from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.models import PurchaseOrder
from purchases.services import serialize_purchase_order

from ._shared import (
    PurchaseOrderAPIError,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_orders_list(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)

        queryset = (
            PurchaseOrder.objects
            .select_related(
                "company",
                "branch",
                "supplier",
            )
            .filter(company=company)
        )

        status_value = (
            request.query_params.get("status")
            or ""
        ).strip().upper()

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        supplier_id = (
            request.query_params.get("supplier_id")
            or request.query_params.get("supplier")
        )

        if supplier_id:
            queryset = queryset.filter(
                supplier_id=supplier_id
            )

        branch_id = (
            request.query_params.get("branch_id")
            or request.query_params.get("branch")
        )

        if branch_id:
            queryset = queryset.filter(
                branch_id=branch_id
            )

        search = (
            request.query_params.get("search")
            or ""
        ).strip()

        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(
                    supplier_reference__icontains=search
                )
                | Q(
                    supplier__display_name__icontains=search
                )
                | Q(
                    supplier__legal_name__icontains=search
                )
            )

        queryset = queryset.order_by(
            "-order_date",
            "-created_at",
            "-id",
        )

        results = [
            serialize_purchase_order(
                order,
                include_items=False,
            )
            for order in queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase orders loaded successfully."
                ),
                "count": len(results),
                "results": results,
                "data": results,
            },
            status=200,
        )

    except PurchaseOrderAPIError as exc:
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


company_purchase_orders_list.required_company_permissions = [
    "company.purchases.orders.view",
]

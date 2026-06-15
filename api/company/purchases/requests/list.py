# ============================================================
# ?? api/company/purchases/requests/list.py
# ?? PrimeyAcc | Purchase Requests List API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.models import PurchaseRequest
from purchases.services import serialize_purchase_request

from ._shared import (
    PurchaseRequestAPIError,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_requests_list(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)

        queryset = (
            PurchaseRequest.objects
            .select_related(
                "company",
                "branch",
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

        priority = (
            request.query_params.get("priority")
            or ""
        ).strip().upper()

        if priority:
            queryset = queryset.filter(
                priority=priority
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
                Q(request_number__icontains=search)
                | Q(purpose__icontains=search)
                | Q(notes__icontains=search)
            )

        queryset = queryset.order_by(
            "-request_date",
            "-created_at",
            "-id",
        )

        results = [
            serialize_purchase_request(
                purchase_request,
                include_items=False,
            )
            for purchase_request in queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase requests loaded successfully."
                ),
                "count": len(results),
                "results": results,
                "data": results,
            },
            status=200,
        )

    except PurchaseRequestAPIError as exc:
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


company_purchase_requests_list.required_company_permissions = [
    "company.purchases.requests.view",
]

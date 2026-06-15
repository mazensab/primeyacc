# ============================================================
# ?? api/company/purchases/requests/detail.py
# ?? PrimeyAcc | Purchase Request Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    serialize_purchase_order,
    serialize_purchase_request,
)

from ._shared import (
    PurchaseRequestAPIError,
    get_company_purchase_request,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_request_detail(
    request: Request,
    request_id: int,
) -> Response:
    try:
        company = get_request_company(request)

        purchase_request = get_company_purchase_request(
            company=company,
            request_id=request_id,
        )

        if not purchase_request:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Purchase request was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Purchase request was not found."
                        ),
                    },
                },
                status=404,
            )

        data = serialize_purchase_request(
            purchase_request,
            include_items=True,
        )

        data["purchase_orders"] = [
            serialize_purchase_order(
                order,
                include_items=False,
            )
            for order in (
                purchase_request.purchase_orders
                .select_related(
                    "company",
                    "branch",
                    "supplier",
                    "purchase_request",
                )
                .order_by(
                    "-order_date",
                    "-id",
                )
            )
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase request loaded successfully."
                ),
                "purchase_request": data,
                "data": data,
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


company_purchase_request_detail.required_company_permissions = [
    "company.purchases.requests.view",
]

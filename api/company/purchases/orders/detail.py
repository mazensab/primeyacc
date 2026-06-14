from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import serialize_purchase_order

from ._shared import (
    PurchaseOrderAPIError,
    get_company_purchase_order,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_order_detail(
    request: Request,
    order_id: int,
) -> Response:
    try:
        company = get_request_company(request)

        order = get_company_purchase_order(
            company=company,
            order_id=order_id,
        )

        if not order:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Purchase order was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Purchase order was not found."
                        ),
                    },
                },
                status=404,
            )

        data = serialize_purchase_order(
            order,
            include_items=True,
        )

        data["bills"] = [
            {
                "id": bill.id,
                "bill_number": bill.bill_number,
                "status": bill.status,
                "bill_date": (
                    bill.bill_date.isoformat()
                    if bill.bill_date
                    else None
                ),
                "total_amount": str(
                    bill.total_amount
                ),
            }
            for bill in order.bills.order_by(
                "-bill_date",
                "-id",
            )
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase order loaded successfully."
                ),
                "purchase_order": data,
                "data": data,
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


company_purchase_order_detail.required_company_permissions = [
    "company.purchases.orders.view",
]

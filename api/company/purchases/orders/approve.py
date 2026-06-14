from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    approve_purchase_order,
    serialize_purchase_order,
)

from ._shared import (
    PurchaseOrderAPIError,
    get_company_purchase_order,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_order_approve(
    request: Request,
    order_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)

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

        order = approve_purchase_order(
            order=order,
            user=user,
        )

        data = serialize_purchase_order(
            order,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase order approved successfully."
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Purchase order could not be approved."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_order_approve.required_company_permissions = [
    "company.purchases.orders.approve",
]

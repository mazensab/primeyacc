# ============================================================
# ?? api/company/purchases/requests/convert_order.py
# ?? PrimeyAcc | Purchase Request to Order API
# ============================================================

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
    convert_purchase_request_to_order,
    serialize_purchase_order,
    serialize_purchase_request,
)

from ._shared import (
    PurchaseRequestAPIError,
    get_company_purchase_request,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_request_convert_order(
    request: Request,
    request_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

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

        order = convert_purchase_request_to_order(
            company=company,
            purchase_request=purchase_request,
            payload=payload,
            user=user,
        )

        purchase_request.refresh_from_db()

        request_data = serialize_purchase_request(
            purchase_request,
            include_items=True,
        )
        order_data = serialize_purchase_order(
            order,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase order created from request "
                    "successfully."
                ),
                "purchase_request": request_data,
                "purchase_order": order_data,
                "data": {
                    "purchase_request": request_data,
                    "purchase_order": order_data,
                },
            },
            status=201,
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Purchase order could not be created "
                    "from request."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_request_convert_order.required_company_permissions = [
    "company.purchases.requests.convert_order",
]

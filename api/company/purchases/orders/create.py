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
    create_purchase_order,
    serialize_purchase_order,
)

from ._shared import (
    PurchaseOrderAPIError,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_order_create(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        order = create_purchase_order(
            company=company,
            payload=payload,
            user=user,
        )

        if bool(payload.get("approve_now")):
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
                    "Purchase order created successfully."
                ),
                "purchase_order": data,
                "data": data,
            },
            status=201,
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
                    "Purchase order could not be created."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_order_create.required_company_permissions = [
    "company.purchases.orders.create",
]

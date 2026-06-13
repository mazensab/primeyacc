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
    confirm_purchase_return,
    serialize_purchase_return,
)

from ._shared import (
    PurchaseReturnAPIError,
    get_company_purchase_return,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_return_confirm(
    request: Request,
    purchase_return_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)

        purchase_return = get_company_purchase_return(
            company=company,
            purchase_return_id=purchase_return_id,
        )

        if not purchase_return:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Purchase return was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Purchase return was not found."
                        ),
                    },
                },
                status=404,
            )

        purchase_return = confirm_purchase_return(
            purchase_return=purchase_return,
            user=user,
        )

        data = serialize_purchase_return(
            purchase_return,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase return confirmed successfully."
                ),
                "purchase_return": data,
                "data": data,
            },
            status=200,
        )

    except PurchaseReturnAPIError as exc:
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
                    "Purchase return could not be confirmed."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_return_confirm.required_company_permissions = [
    "company.purchases.returns.confirm",
]

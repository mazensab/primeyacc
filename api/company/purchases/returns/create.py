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
    create_purchase_return,
    serialize_purchase_return,
)

from ._shared import (
    PurchaseReturnAPIError,
    company_payload,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_return_create(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        purchase_return = create_purchase_return(
            company=company,
            payload=payload,
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
                    "Purchase return created successfully."
                ),
                "company": company_payload(company),
                "purchase_return": data,
                "data": data,
            },
            status=201,
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
                    "Purchase return could not be created."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_return_create.required_company_permissions = [
    "company.purchases.returns.create",
]

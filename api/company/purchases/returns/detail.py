from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    serialize_purchase_return,
)

from ._shared import (
    PurchaseReturnAPIError,
    company_payload,
    get_company_purchase_return,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_return_detail(
    request: Request,
    purchase_return_id: int,
) -> Response:
    try:
        company = get_request_company(request)

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

        data = serialize_purchase_return(
            purchase_return,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
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


company_purchase_return_detail.required_company_permissions = [
    "company.purchases.returns.view",
]

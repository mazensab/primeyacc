from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    serialize_purchase_receipt,
)

from ._shared import (
    PurchaseReceiptAPIError,
    company_payload,
    get_company_purchase_receipt,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_receipt_detail(
    request: Request,
    purchase_receipt_id: int,
) -> Response:
    try:
        company = get_request_company(request)

        receipt = get_company_purchase_receipt(
            company=company,
            purchase_receipt_id=purchase_receipt_id,
        )

        if not receipt:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Purchase receipt was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Purchase receipt was not found."
                        ),
                    },
                },
                status=404,
            )

        data = serialize_purchase_receipt(
            receipt,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "purchase_receipt": data,
                "data": data,
            },
            status=200,
        )

    except PurchaseReceiptAPIError as exc:
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


company_purchase_receipt_detail.required_company_permissions = [
    "company.purchases.receipts.view",
]

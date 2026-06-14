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
    cancel_purchase_receipt,
    serialize_purchase_receipt,
)

from ._shared import (
    PurchaseReceiptAPIError,
    get_company_purchase_receipt,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_receipt_cancel(
    request: Request,
    purchase_receipt_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

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

        reason = str(
            payload.get("reason")
            or payload.get("cancellation_reason")
            or ""
        ).strip()

        receipt = cancel_purchase_receipt(
            receipt=receipt,
            reason=reason,
            user=user,
        )

        data = serialize_purchase_receipt(
            receipt,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase receipt cancelled successfully."
                ),
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Purchase receipt could not be cancelled."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_receipt_cancel.required_company_permissions = [
    "company.purchases.receipts.cancel",
]

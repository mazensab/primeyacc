# ============================================================
# ?? api/company/purchases/requests/update.py
# ?? PrimeyAcc | Purchase Request Update API
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
    serialize_purchase_request,
    update_purchase_request,
)

from ._shared import (
    PurchaseRequestAPIError,
    get_company_purchase_request,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["PATCH", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_request_update(
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

        purchase_request = update_purchase_request(
            purchase_request=purchase_request,
            payload=payload,
            user=user,
        )

        data = serialize_purchase_request(
            purchase_request,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase request updated successfully."
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Purchase request could not be updated."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_request_update.required_company_permissions = [
    "company.purchases.requests.update",
]

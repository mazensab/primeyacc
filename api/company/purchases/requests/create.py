# ============================================================
# ?? api/company/purchases/requests/create.py
# ?? Mhamcloud | Purchase Request Create API
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
    create_purchase_request,
    serialize_purchase_request,
    submit_purchase_request,
)

from ._shared import (
    PurchaseRequestAPIError,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_request_create(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        purchase_request = create_purchase_request(
            company=company,
            payload=payload,
            user=user,
        )

        if bool(payload.get("submit_now")):
            purchase_request = submit_purchase_request(
                purchase_request=purchase_request,
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
                    "Purchase request created successfully."
                ),
                "purchase_request": data,
                "data": data,
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
                    "Purchase request could not be created."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_request_create.required_company_permissions = [
    "company.purchases.requests.create",
]

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.services import (
    create_sales_return,
    serialize_sales_return,
)

from .common import (
    SalesReturnAPIError,
    error_response,
    get_payload,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_return_create(
    request: Request,
) -> Response:
    """
    Create a draft partial or full sales return.
    """
    try:
        company = get_request_company(
            request
        )
        user = get_request_user(
            request
        )
        payload = get_payload(
            request
        )

        invoice_id = (
            payload.get("invoice_id")
            or payload.get(
                "sales_invoice_id"
            )
        )

        items = (
            payload.get("items")
            if "items" in payload
            else None
        )

        sales_return = create_sales_return(
            company=company,
            invoice_id=invoice_id,
            user=user,
            return_date=payload.get(
                "return_date"
            ),
            reason=payload.get(
                "reason"
            ),
            reason_details=payload.get(
                "reason_details"
            )
            or "",
            public_notes=payload.get(
                "public_notes"
            )
            or "",
            internal_notes=payload.get(
                "internal_notes"
            )
            or "",
            items=items,
            extra_data=payload.get(
                "extra_data"
            )
            or {},
        )

        data = serialize_sales_return(
            sales_return,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Sales return created "
                    "successfully."
                ),
                "sales_return": data,
                "return": data,
                "data": data,
            },
            status=201,
        )

    except SalesReturnAPIError as exc:
        return error_response(
            str(exc)
        )

    except ValidationError as exc:
        return error_response(
            "Sales return could not be created.",
            errors=validation_error_payload(
                exc
            ),
        )


company_sales_return_create.required_company_permissions = [
    "company.sales.returns.create",
]

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
    confirm_sales_return,
    serialize_sales_return,
)

from .common import (
    SalesReturnAPIError,
    error_response,
    get_company_sales_return,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_return_confirm(
    request: Request,
    return_id: int,
) -> Response:
    """
    Confirm a draft sales return.
    """
    try:
        company = get_request_company(
            request
        )
        user = get_request_user(
            request
        )

        sales_return = (
            get_company_sales_return(
                company=company,
                return_id=return_id,
            )
        )

        if not sales_return:
            return error_response(
                "Sales return was not found.",
                status=404,
            )

        sales_return = confirm_sales_return(
            company=company,
            sales_return=sales_return,
            user=user,
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
                    "Sales return confirmed "
                    "successfully."
                ),
                "sales_return": data,
                "return": data,
                "data": data,
            },
            status=200,
        )

    except SalesReturnAPIError as exc:
        return error_response(
            str(exc)
        )

    except ValidationError as exc:
        return error_response(
            "Sales return could not be confirmed.",
            errors=validation_error_payload(
                exc
            ),
        )


company_sales_return_confirm.required_company_permissions = [
    "company.sales.returns.confirm",
]

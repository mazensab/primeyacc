from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.services import serialize_sales_return

from .common import (
    SalesReturnAPIError,
    error_response,
    get_company_sales_return,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_return_detail(
    request: Request,
    return_id: int,
) -> Response:
    """
    Return one company-scoped sales return.
    """
    try:
        company = get_request_company(
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

        data = serialize_sales_return(
            sales_return,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Sales return loaded "
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


company_sales_return_detail.required_company_permissions = [
    "company.sales.returns.view",
]

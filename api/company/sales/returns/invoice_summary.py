from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.services import (
    serialize_invoice_return_summary,
)

from .common import (
    SalesReturnAPIError,
    error_response,
    get_company_invoice,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoice_returns_summary(
    request: Request,
    invoice_id: int,
) -> Response:
    """
    Return sales-return progress for one invoice.
    """
    try:
        company = get_request_company(
            request
        )

        invoice = get_company_invoice(
            company=company,
            invoice_id=invoice_id,
        )

        if not invoice:
            return error_response(
                "Sales invoice was not found.",
                status=404,
            )

        summary = (
            serialize_invoice_return_summary(
                invoice
            )
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Invoice return summary "
                    "loaded successfully."
                ),
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "summary": summary,
                "data": summary,
            },
            status=200,
        )

    except SalesReturnAPIError as exc:
        return error_response(
            str(exc)
        )


company_sales_invoice_returns_summary.required_company_permissions = [
    "company.sales.returns.view",
]

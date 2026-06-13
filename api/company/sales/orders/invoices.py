from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from sales.services import (
    serialize_order_invoice_summary,
)

from .common import (
    api_error,
    get_company_order,
    require_company_permission,
    validation_error_response,
)


@require_GET
def sales_order_invoices(
    request,
    order_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.invoices.view",
    )

    if error:
        return error

    order = get_company_order(
        company=membership.company,
        order_id=order_id,
    )

    if not order:
        return api_error(
            "Sales order was not found.",
            status=404,
        )

    try:
        summary = serialize_order_invoice_summary(
            order
        )

        return JsonResponse(
            {
                "success": True,
                "company": {
                    "id": membership.company_id,
                    "name": (
                        membership.company.display_name
                    ),
                },
                "summary": summary,
            }
        )

    except ValidationError as exc:
        return validation_error_response(exc)

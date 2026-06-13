from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sales.services import (
    serialize_sales_order,
    start_processing_sales_order,
)

from .common import (
    api_error,
    get_company_order,
    require_company_permission,
    validation_error_response,
)


@require_POST
def sales_order_process(
    request,
    order_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.process",
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
        order = start_processing_sales_order(
            company=membership.company,
            order=order,
            user=request.user,
        )

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales order moved to processing successfully.",
                "order": serialize_sales_order(
                    order,
                    include_items=True,
                ),
            }
        )

    except ValidationError as exc:
        return validation_error_response(exc)

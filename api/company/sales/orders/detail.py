from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from sales.services import serialize_sales_order

from .common import (
    api_error,
    get_company_order,
    require_company_permission,
)


@require_GET
def sales_order_detail(
    request,
    order_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.view",
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

    return JsonResponse(
        {
            "success": True,
            "order": serialize_sales_order(
                order,
                include_items=True,
            ),
        }
    )

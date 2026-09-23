from __future__ import annotations

from api.company.branch_enforcement import require_object_branch

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from sales.models import SalesOrder
from sales.services import (
    serialize_sales_order,
    serialize_sales_quotation,
)

from .common import (
    api_error,
    get_company_quotation,
    require_company_permission,
)


@require_GET
def sales_quotation_detail(
    request,
    quotation_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.quotations.view",
    )

    if error:
        return error

    quotation = get_company_quotation(
        company=membership.company,
        quotation_id=quotation_id,
    )

    if not quotation:
        return api_error(
            "Sales quotation was not found.",
            status=404,
        )

    require_object_branch(request, quotation, branch_attr="branch_id")

    payload = serialize_sales_quotation(
        quotation,
        include_items=True,
    )

    linked_orders = list(
        SalesOrder.objects
        .select_related(
            "branch",
            "customer",
            "source_quotation",
        )
        .filter(
            company=membership.company,
            source_quotation_id=quotation.id,
            branch_id=quotation.branch_id,
        )
        .order_by(
            "-order_date",
            "-id",
        )
    )

    payload["linked_sales_orders"] = [
        serialize_sales_order(
            order,
            include_items=False,
        )
        for order in linked_orders
    ]
    payload["linked_sales_order_count"] = len(linked_orders)
    payload["conversion_state"] = (
        "CONVERTED"
        if linked_orders
        else "NONE"
    )

    return JsonResponse(
        {
            "success": True,
            "quotation": payload,
        }
    )

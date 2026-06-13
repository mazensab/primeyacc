from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from sales.services import serialize_sales_quotation

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

    return JsonResponse(
        {
            "success": True,
            "quotation": serialize_sales_quotation(
                quotation,
                include_items=True,
            ),
        }
    )

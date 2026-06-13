from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sales.services import (
    accept_sales_quotation,
    serialize_sales_quotation,
)

from .common import (
    api_error,
    get_company_quotation,
    require_company_permission,
    validation_error_response,
)


@require_POST
def sales_quotation_accept(
    request,
    quotation_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.quotations.accept",
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

    try:
        quotation = accept_sales_quotation(
            company=membership.company,
            quotation=quotation,
            user=request.user,
        )

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales quotation accepted successfully.",
                "quotation": serialize_sales_quotation(
                    quotation,
                    include_items=True,
                ),
            }
        )

    except ValidationError as exc:
        return validation_error_response(exc)

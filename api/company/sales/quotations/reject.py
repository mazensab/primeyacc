from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sales.services import (
    reject_sales_quotation,
    serialize_sales_quotation,
)

from .common import (
    api_error,
    get_company_quotation,
    parse_json_body,
    require_company_permission,
    validation_error_response,
)


@require_POST
def sales_quotation_reject(
    request,
    quotation_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.quotations.reject",
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
        payload = parse_json_body(request)

        quotation = reject_sales_quotation(
            company=membership.company,
            quotation=quotation,
            reason=payload.get("reason", ""),
            user=request.user,
        )

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales quotation rejected successfully.",
                "quotation": serialize_sales_quotation(
                    quotation,
                    include_items=True,
                ),
            }
        )

    except ValidationError as exc:
        return validation_error_response(exc)

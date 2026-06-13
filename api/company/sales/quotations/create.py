from __future__ import annotations

from django.core.exceptions import ValidationError
from django.views.decorators.http import require_POST

from sales.services import (
    create_sales_quotation,
    send_sales_quotation,
    serialize_sales_quotation,
)

from .common import (
    parse_json_body,
    require_company_permission,
    validation_error_response,
)
from django.http import JsonResponse


@require_POST
def sales_quotation_create(request):
    membership, error = require_company_permission(
        request,
        "company.sales.quotations.create",
    )

    if error:
        return error

    try:
        payload = parse_json_body(request)

        quotation = create_sales_quotation(
            company=membership.company,
            user=request.user,
            branch_id=payload.get("branch_id"),
            customer_id=payload.get("customer_id"),
            quotation_date=payload.get(
                "quotation_date"
            ),
            valid_until=payload.get(
                "valid_until"
            ),
            source=payload.get("source") or "MANUAL",
            terms_and_conditions=payload.get(
                "terms_and_conditions",
                "",
            ),
            public_notes=payload.get(
                "public_notes",
                "",
            ),
            internal_notes=payload.get(
                "internal_notes",
                "",
            ),
            items=payload.get("items") or [],
            extra_data=payload.get(
                "extra_data"
            ) or {},
        )

        if payload.get("send_now"):
            if not membership.has_company_permission(
                "company.sales.quotations.send"
            ):
                return JsonResponse(
                    {
                        "success": False,
                        "message":
                            "You do not have permission to send quotations.",
                    },
                    status=403,
                )

            quotation = send_sales_quotation(
                company=membership.company,
                quotation=quotation,
                user=request.user,
            )

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales quotation created successfully.",
                "quotation": serialize_sales_quotation(
                    quotation,
                    include_items=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return validation_error_response(exc)

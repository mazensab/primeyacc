from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sales.models import SalesQuotation
from sales.services import (
    confirm_sales_order,
    create_sales_order_from_quotation,
    serialize_sales_order,
)

from .common import (
    api_error,
    parse_json_body,
    require_company_permission,
    validation_error_response,
)


@require_POST
def sales_order_create_from_quotation(
    request,
    quotation_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.create_from_quotation",
    )

    if error:
        return error

    quotation = (
        SalesQuotation.objects
        .select_related(
            "company",
            "branch",
            "customer",
        )
        .filter(
            company=membership.company,
            id=quotation_id,
        )
        .first()
    )

    if not quotation:
        return api_error(
            "Sales quotation was not found.",
            status=404,
        )

    try:
        payload = parse_json_body(request)

        order = create_sales_order_from_quotation(
            company=membership.company,
            quotation=quotation,
            user=request.user,
            order_date=payload.get("order_date"),
            expected_delivery_date=payload.get(
                "expected_delivery_date"
            ),
            public_notes=payload.get(
                "public_notes"
            ),
            internal_notes=payload.get(
                "internal_notes"
            ),
            extra_data=payload.get(
                "extra_data"
            ) or {},
        )

        if payload.get("confirm_now"):
            if not membership.has_company_permission(
                "company.sales.orders.confirm"
            ):
                return JsonResponse(
                    {
                        "success": False,
                        "message":
                            "You do not have permission to confirm sales orders.",
                    },
                    status=403,
                )

            order = confirm_sales_order(
                company=membership.company,
                order=order,
                user=request.user,
            )

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales order created from quotation successfully.",
                "order": serialize_sales_order(
                    order,
                    include_items=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return validation_error_response(exc)

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sales.services import (
    confirm_sales_order,
    create_sales_order,
    serialize_sales_order,
)

from .common import (
    parse_json_body,
    require_company_permission,
    validation_error_response,
)


@require_POST
def sales_order_create(request):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.create",
    )

    if error:
        return error

    try:
        payload = parse_json_body(request)

        order = create_sales_order(
            company=membership.company,
            user=request.user,
            branch_id=payload.get("branch_id"),
            customer_id=payload.get("customer_id"),
            order_date=payload.get("order_date"),
            expected_delivery_date=payload.get(
                "expected_delivery_date"
            ),
            source=payload.get("source") or "MANUAL",
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
                    "Sales order created successfully.",
                "order": serialize_sales_order(
                    order,
                    include_items=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return validation_error_response(exc)

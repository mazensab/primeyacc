from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sales.services import (
    create_sales_invoice_from_order,
    serialize_sales_invoice,
    serialize_sales_order,
)

from .common import (
    api_error,
    get_company_order,
    parse_json_body,
    require_company_permission,
    validation_error_response,
)


@require_POST
def sales_order_create_invoice(
    request,
    order_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.create_invoice",
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
        payload = parse_json_body(request)

        issue_now = bool(
            payload.get("issue_now", False)
        )

        if (
            issue_now
            and not membership.has_company_permission(
                "company.sales.invoices.issue"
            )
        ):
            return api_error(
                "You do not have permission to issue sales invoices.",
                status=403,
            )

        items = (
            payload.get("items")
            if "items" in payload
            else None
        )

        invoice = create_sales_invoice_from_order(
            company=membership.company,
            order=order,
            user=request.user,
            invoice_date=payload.get(
                "invoice_date"
            ),
            due_date=payload.get(
                "due_date"
            ),
            items=items,
            issue_now=issue_now,
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

        order.refresh_from_db()

        return JsonResponse(
            {
                "success": True,
                "message": (
                    "Sales invoice created "
                    "from order successfully."
                ),
                "invoice": serialize_sales_invoice(
                    invoice,
                    include_items=True,
                ),
                "order": serialize_sales_order(
                    order,
                    include_items=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return validation_error_response(exc)

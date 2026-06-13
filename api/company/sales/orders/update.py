from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from sales.models import SalesOrderStatus
from sales.services import (
    create_sales_order_item,
    normalize_invoice_date,
    normalize_text,
    resolve_company_branch,
    resolve_customer,
    serialize_sales_order,
)

from .common import (
    api_error,
    get_company_order,
    parse_json_body,
    require_company_permission,
    validation_error_response,
)


@require_http_methods(["PUT", "PATCH"])
@transaction.atomic
def sales_order_update(
    request,
    order_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.orders.update",
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

    if order.status != SalesOrderStatus.DRAFT:
        return api_error(
            "Only draft sales orders can be updated.",
            status=400,
        )

    try:
        payload = parse_json_body(request)

        if "branch_id" in payload:
            order.branch = resolve_company_branch(
                membership.company,
                payload.get("branch_id"),
            )

        if "customer_id" in payload:
            order.customer = resolve_customer(
                membership.company,
                payload.get("customer_id"),
            )

        if "order_date" in payload:
            order.order_date = normalize_invoice_date(
                payload.get("order_date"),
                field_name="order_date",
                default_today=True,
            )

        if "expected_delivery_date" in payload:
            order.expected_delivery_date = (
                normalize_invoice_date(
                    payload.get(
                        "expected_delivery_date"
                    ),
                    field_name=(
                        "expected_delivery_date"
                    ),
                    default_today=False,
                )
            )

        if "source" in payload:
            order.source = (
                payload.get("source") or "MANUAL"
            )

        if "public_notes" in payload:
            order.public_notes = normalize_text(
                payload.get("public_notes")
            )

        if "internal_notes" in payload:
            order.internal_notes = normalize_text(
                payload.get("internal_notes")
            )

        if "extra_data" in payload:
            order.extra_data = (
                payload.get("extra_data") or {}
            )

        order.updated_by = request.user
        order.full_clean()
        order.save()
        order.refresh_snapshots(save=True)

        if "items" in payload:
            items = payload.get("items")

            if not isinstance(items, list):
                raise ValidationError(
                    {"items": "Items must be a list."}
                )

            order.items.all().delete()

            for index, item_payload in enumerate(
                items,
                start=1,
            ):
                create_sales_order_item(
                    order=order,
                    company=membership.company,
                    payload=item_payload,
                    line_number=index,
                )

        order.recalculate_totals(save=True)
        order.refresh_from_db()

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales order updated successfully.",
                "order": serialize_sales_order(
                    order,
                    include_items=True,
                ),
            }
        )

    except ValidationError as exc:
        return validation_error_response(exc)

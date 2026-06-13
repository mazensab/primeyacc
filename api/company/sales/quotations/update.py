from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from sales.models import SalesQuotationStatus
from sales.services import (
    create_sales_quotation_item,
    normalize_invoice_date,
    normalize_text,
    resolve_company_branch,
    resolve_customer,
    serialize_sales_quotation,
)

from .common import (
    api_error,
    get_company_quotation,
    parse_json_body,
    require_company_permission,
    validation_error_response,
)


@require_http_methods(["PUT", "PATCH"])
@transaction.atomic
def sales_quotation_update(
    request,
    quotation_id: int,
):
    membership, error = require_company_permission(
        request,
        "company.sales.quotations.update",
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

    if quotation.status != SalesQuotationStatus.DRAFT:
        return api_error(
            "Only draft quotations can be updated.",
            status=400,
        )

    try:
        payload = parse_json_body(request)

        if "branch_id" in payload:
            quotation.branch = resolve_company_branch(
                membership.company,
                payload.get("branch_id"),
            )

        if "customer_id" in payload:
            quotation.customer = resolve_customer(
                membership.company,
                payload.get("customer_id"),
            )

        if "quotation_date" in payload:
            quotation.quotation_date = (
                normalize_invoice_date(
                    payload.get("quotation_date"),
                    field_name="quotation_date",
                    default_today=True,
                )
            )

        if "valid_until" in payload:
            quotation.valid_until = (
                normalize_invoice_date(
                    payload.get("valid_until"),
                    field_name="valid_until",
                    default_today=False,
                )
            )

        if "source" in payload:
            quotation.source = (
                payload.get("source") or "MANUAL"
            )

        if "terms_and_conditions" in payload:
            quotation.terms_and_conditions = (
                normalize_text(
                    payload.get(
                        "terms_and_conditions"
                    )
                )
            )

        if "public_notes" in payload:
            quotation.public_notes = normalize_text(
                payload.get("public_notes")
            )

        if "internal_notes" in payload:
            quotation.internal_notes = normalize_text(
                payload.get("internal_notes")
            )

        if "extra_data" in payload:
            quotation.extra_data = (
                payload.get("extra_data") or {}
            )

        quotation.updated_by = request.user
        quotation.full_clean()
        quotation.save()

        quotation.refresh_snapshots(save=True)

        if "items" in payload:
            items = payload.get("items")

            if not isinstance(items, list):
                raise ValidationError(
                    {"items": "Items must be a list."}
                )

            quotation.items.all().delete()

            for index, item_payload in enumerate(
                items,
                start=1,
            ):
                create_sales_quotation_item(
                    quotation=quotation,
                    company=membership.company,
                    payload=item_payload,
                    line_number=index,
                )

        quotation.recalculate_totals(save=True)
        quotation.refresh_from_db()

        return JsonResponse(
            {
                "success": True,
                "message":
                    "Sales quotation updated successfully.",
                "quotation": serialize_sales_quotation(
                    quotation,
                    include_items=True,
                ),
            }
        )

    except ValidationError as exc:
        return validation_error_response(exc)

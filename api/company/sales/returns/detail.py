from __future__ import annotations

from decimal import Decimal

from api.company.branch_enforcement import require_object_branch
from django.contrib.auth import get_user_model
from business_controls.models import LegacyObjectMap

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import CustomerCreditBalance, SalesCreditNote
from sales.services import serialize_sales_return

from .common import (
    SalesReturnAPIError,
    error_response,
    get_company_sales_return,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_return_detail(
    request: Request,
    return_id: int,
) -> Response:
    """
    Return one company-scoped sales return.
    """
    try:
        company = get_request_company(
            request
        )

        sales_return = (
            get_company_sales_return(
                company=company,
                return_id=return_id,
            )
        )

        if not sales_return:
            return error_response(
                "Sales return was not found.",
                status=404,
            )

        require_object_branch(request, sales_return, branch_attr="branch_id")

        data = serialize_sales_return(
            sales_return,
            include_items=True,
        )

        # Read-only enrichment for the sales return detail screen.
        return_items = list(
            sales_return.items.select_related("catalog_item").order_by("line_number", "id")
        )

        # Historical read reconstruction only: exact legacy line match.
        if not return_items and not data.get("items"):
            return_migration = sales_return.extra_data.get("migration", {}) if isinstance(sales_return.extra_data, dict) else {}
            return_source = return_migration.get("source_payload", {}) if isinstance(return_migration, dict) else {}
            parent_lines = return_source.get("return_parent_sell_lines", []) if isinstance(return_source, dict) else []
            invoice = sales_return.invoice
            if invoice is not None and isinstance(parent_lines, list) and parent_lines:
                invoice_items = list(invoice.items.select_related("catalog_item").order_by("line_number", "id"))
                invoice_by_legacy_line = {}
                for invoice_item in invoice_items:
                    item_migration = invoice_item.extra_data.get("migration", {}) if isinstance(invoice_item.extra_data, dict) else {}
                    source_line = item_migration.get("source_line", {}) if isinstance(item_migration, dict) else {}
                    legacy_line_id = str(source_line.get("id")) if isinstance(source_line, dict) and source_line.get("id") is not None else None
                    if legacy_line_id:
                        invoice_by_legacy_line[legacy_line_id] = invoice_item

                reconstructed = []
                for parent_line in parent_lines:
                    if not isinstance(parent_line, dict):
                        continue
                    legacy_line_id = str(parent_line.get("id")) if parent_line.get("id") is not None else None
                    invoice_item = invoice_by_legacy_line.get(legacy_line_id or "")
                    if invoice_item is None:
                        continue
                    returned_qty = parent_line.get("quantity_returned")
                    if returned_qty in (None, ""):
                        returned_qty = parent_line.get("quantity")
                    catalog_item = invoice_item.catalog_item
                    display_code = invoice_item.item_code_snapshot or ""
                    if catalog_item is not None:
                        catalog_code = str(catalog_item.code or "").strip()
                        catalog_sku = str(catalog_item.sku or "").strip()
                        catalog_migration = catalog_item.extra_data.get("migration", {}) if isinstance(catalog_item.extra_data, dict) else {}
                        legacy_product = catalog_migration.get("legacy_product_payload", {}) if isinstance(catalog_migration, dict) else {}
                        legacy_variation = catalog_migration.get("legacy_variation_payload", {}) if isinstance(catalog_migration, dict) else {}
                        if not isinstance(legacy_product, dict): legacy_product = {}
                        if not isinstance(legacy_variation, dict): legacy_variation = {}
                        if catalog_code and not catalog_code.startswith("LEGACY-P-"):
                            display_code = catalog_sku or catalog_code
                        elif catalog_code.startswith("LEGACY-P-"):
                            display_code = str(legacy_product.get("sku") or "").strip() or str(legacy_variation.get("sub_sku") or "").strip() or catalog_sku or str(catalog_migration.get("legacy_product_id") or "").strip() or catalog_code
                        else:
                            display_code = catalog_sku or catalog_code or display_code
                    quantity_value = Decimal(str(returned_qty or invoice_item.quantity))
                    unit_price_value = Decimal(str(invoice_item.unit_price))
                    discount_value = Decimal(str(invoice_item.discount_amount))
                    tax_rate_value = Decimal(str(invoice_item.tax_rate))
                    tax_amount_value = Decimal(str(invoice_item.tax_amount))
                    line_total_value = Decimal(str(invoice_item.line_total))
                    line_subtotal_value = unit_price_value * quantity_value
                    taxable_amount_value = line_subtotal_value - discount_value

                    reconstructed.append({
                        "id": None,
                        "line_number": invoice_item.line_number,
                        "invoice_item_id": invoice_item.id,
                        "catalog_item_id": invoice_item.catalog_item_id,
                        "item_code": invoice_item.item_code_snapshot,
                        "display_item_code": display_code,
                        "item_name": invoice_item.item_name_snapshot,
                        "description": invoice_item.item_description_snapshot,
                        "unit_name": invoice_item.unit_name_snapshot,
                        "quantity": str(quantity_value),
                        "unit_price": str(unit_price_value),
                        "line_subtotal": str(line_subtotal_value),
                        "discount_amount": str(discount_value),
                        "taxable": bool(tax_rate_value or tax_amount_value),
                        "tax_rate": str(tax_rate_value),
                        "taxable_amount": str(taxable_amount_value),
                        "tax_amount": str(tax_amount_value),
                        "line_total": str(line_total_value),
                        "restock": False,
                        "condition_notes": "",
                        "notes": "",
                        "extra_data": {
                            "historical_reconstruction": True,
                            "legacy_source_line_id": legacy_line_id,
                            "source": "return_parent_sell_lines+invoice_exact_line_match",
                        },
                        "created_at": None,
                        "updated_at": None,
                        "historical_reconstruction": True,
                        "legacy_source_line_id": legacy_line_id,
                    })
                if reconstructed:
                    data["items"] = reconstructed
                    data["historical_items_reconstructed"] = True
                    data["historical_items_source"] = "return_parent_sell_lines+invoice_exact_line_match"

        display_items = data.get("items", [])
        data["total_quantity"] = str(sum((Decimal(str(item.get("quantity") or "0")) for item in display_items), start=Decimal("0")))
        data["items_tax_amount"] = str(sum((Decimal(str(item.get("tax_amount") or "0")) for item in display_items), start=Decimal("0")))
        data["display_tax_amount"] = str(sales_return.tax_amount)

        for item_data, return_item in zip(data.get("items", []), return_items):
            catalog_item = return_item.catalog_item
            display_code = return_item.item_code_snapshot or ""
            if catalog_item is not None:
                catalog_code = str(catalog_item.code or "").strip()
                catalog_sku = str(catalog_item.sku or "").strip()
                migration = catalog_item.extra_data.get("migration", {}) if isinstance(catalog_item.extra_data, dict) else {}
                legacy_product = migration.get("legacy_product_payload", {}) if isinstance(migration, dict) else {}
                legacy_variation = migration.get("legacy_variation_payload", {}) if isinstance(migration, dict) else {}
                if not isinstance(legacy_product, dict): legacy_product = {}
                if not isinstance(legacy_variation, dict): legacy_variation = {}
                if catalog_code and not catalog_code.startswith("LEGACY-P-"):
                    display_code = catalog_sku or catalog_code
                elif catalog_code.startswith("LEGACY-P-"):
                    display_code = (
                        str(legacy_product.get("sku") or "").strip()
                        or str(legacy_variation.get("sub_sku") or "").strip()
                        or catalog_sku
                        or str(migration.get("legacy_product_id") or "").strip()
                        or catalog_code
                    )
                else:
                    display_code = catalog_sku or catalog_code or display_code
            item_data["display_item_code"] = display_code

        customer = sales_return.customer
        if customer is not None:
            migration = customer.extra_data.get("migration", {}) if isinstance(customer.extra_data, dict) else {}
            legacy_payload = migration.get("legacy_payload", {}) if isinstance(migration, dict) else {}
            if not isinstance(legacy_payload, dict): legacy_payload = {}
            data["customer_detail"] = {
                "id": customer.id, "code": customer.code,
                "display_name": customer.display_name, "legal_name": customer.legal_name,
                "contact_person": customer.contact_person, "phone": customer.phone,
                "mobile": customer.mobile, "whatsapp_number": customer.whatsapp_number,
                "email": customer.email, "website": customer.website,
                "commercial_registration": customer.commercial_registration,
                "vat_number": customer.vat_number, "national_id": customer.national_id,
                "country": customer.country, "city": customer.city,
                "district": customer.district, "street": customer.street,
                "building_number": customer.building_number or legacy_payload.get("address_line_2") or "",
                "additional_number": customer.additional_number,
                "postal_code": customer.postal_code or legacy_payload.get("zip_code") or "",
                "short_address": customer.short_address,
                "address_line": customer.address_line or legacy_payload.get("address_line_1") or "",
            }

        def _user_label(user):
            if user is None: return None
            profile = getattr(user, "profile", None)
            profile_name = str(getattr(profile, "display_name", "") or "").strip() if profile is not None else ""
            fn = getattr(user, "get_full_name", None)
            full_name = str(fn() or "").strip() if callable(fn) else ""
            return profile_name or full_name or str(getattr(user, "username", "") or "").strip() or str(getattr(user, "email", "") or "").strip() or f"User #{user.pk}"

        def _mapped_legacy_user(legacy_user_id):
            if not legacy_user_id: return None
            mapping = LegacyObjectMap.objects.filter(
                source_system="mhamcloud_v1", source_table="users",
                legacy_id=str(legacy_user_id), company=company,
            ).order_by("-id").first()
            if mapping is None or not mapping.target_object_id: return None
            return get_user_model().objects.filter(pk=mapping.target_object_id).first()

        migration = sales_return.extra_data.get("migration", {}) if isinstance(sales_return.extra_data, dict) else {}
        source_payload = migration.get("source_payload", {}) if isinstance(migration, dict) else {}
        if not isinstance(source_payload, dict): source_payload = {}
        legacy_created_by = source_payload.get("created_by")
        legacy_updated_by = source_payload.get("updated_by")
        legacy_created_at = source_payload.get("created_at")
        legacy_updated_at = source_payload.get("updated_at")
        created_by_user = sales_return.created_by or _mapped_legacy_user(legacy_created_by)
        updated_by_user = sales_return.updated_by or _mapped_legacy_user(legacy_updated_by)
        created_by_label = _user_label(created_by_user)
        if not created_by_label and legacy_created_by:
            created_by_label = f"مستخدم قديم #{legacy_created_by}"
        updated_by_label = _user_label(updated_by_user)
        created_at_value = legacy_created_at or (sales_return.created_at.isoformat() if sales_return.created_at else None)
        updated_at_value = legacy_updated_at or (sales_return.updated_at.isoformat() if sales_return.updated_at else None)
        was_modified = bool(created_at_value and updated_at_value and str(created_at_value) != str(updated_at_value))
        data["audit_metadata"] = {
            "created_by": created_by_label,
            "created_by_user_id": created_by_user.pk if created_by_user is not None else None,
            "created_at": created_at_value, "was_modified": was_modified,
            "updated_by": updated_by_label if was_modified else None,
            "updated_by_user_id": updated_by_user.pk if was_modified and updated_by_user is not None else None,
            "updated_at": updated_at_value if was_modified else None,
            "source": "legacy" if legacy_created_at else "current",
        }

        credit_notes = list(SalesCreditNote.objects.filter(company=company, sales_return=sales_return).order_by("id"))
        settlement_notes = [
            {
                "id": note.id,
                "number": note.credit_note_number,
                "status": note.status,
                "date": str(note.credit_note_date) if note.credit_note_date else None,
                "total_amount": str(note.total_amount),
                "allocated_amount": str(note.allocated_amount),
            }
            for note in credit_notes
        ]
        credit_balance = None
        if sales_return.customer_id:
            balance = CustomerCreditBalance.objects.filter(
                company=company,
                customer=sales_return.customer,
                currency_code=sales_return.currency_code,
            ).first()
            if balance is not None:
                credit_balance = {
                    "id": balance.id,
                    "total_credit": str(balance.total_credit),
                    "allocated_amount": str(balance.allocated_amount),
                    "available_amount": str(balance.available_amount),
                }
        if isinstance(data.get("invoice"), dict) and sales_return.invoice_id:
            source_invoice = sales_return.invoice
            data["invoice"].update({
                "customer_name": source_invoice.customer.display_name if source_invoice.customer_id and source_invoice.customer else None,
                "total_amount": str(source_invoice.total_amount),
            })

        data["financial_settlement"] = {
            "status": "RECORDED" if settlement_notes or credit_balance else "NOT_RECORDED",
            "credit_notes": settlement_notes,
            "customer_credit_balance": credit_balance,
        }
        data["tax_identity"] = {
            "source_tax_id": source_payload.get("tax_id") if isinstance(source_payload, dict) else None,
            "is_tax_registered": bool(source_payload.get("tax_id")) if isinstance(source_payload, dict) else False,
        }

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Sales return loaded "
                    "successfully."
                ),
                "sales_return": data,
                "return": data,
                "data": data,
            },
            status=200,
        )

    except SalesReturnAPIError as exc:
        return error_response(
            str(exc)
        )


company_sales_return_detail.required_company_permissions = [
    "company.sales.returns.view",
]

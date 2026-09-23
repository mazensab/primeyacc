# ============================================================
# 📂 api/company/sales/invoices/detail.py
# 🧠 Mhamcloud | Company Sales Invoice Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one company-scoped sales invoice
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Includes invoice items
# ✅ Blocks cross-company access
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - هذا الملف مسؤول عن عرض تفاصيل فاتورة مبيعات واحدة فقط
# - صلاحية العرض المطلوبة: company.sales.invoices.view
# ============================================================

from __future__ import annotations

from api.company.branch_enforcement import require_object_branch

from django.contrib.auth import get_user_model

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from business_controls.models import LegacyObjectMap
from sales.models import SalesInvoice
from sales.services import serialize_sales_invoice
from treasury.models import CustomerPayment


class SalesInvoiceDetailAPIError(Exception):
    """
    Small API-level error for sales invoice detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceDetailAPIError("Current company context was not resolved.")

    return company


def _get_company_invoice(*, company, invoice_id: int | str) -> SalesInvoice | None:
    """
    Return invoice only if it belongs to the current company.
    """
    return (
        SalesInvoice.objects.select_related(
            "company",
            "branch",
            "customer",
            "created_by",
            "updated_by",
            "issued_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__catalog_item",
        )
        .filter(
            company=company,
            id=invoice_id,
        )
        .first()
    )


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoice_detail(request: Request, invoice_id: int) -> Response:
    """
    Return sales invoice details for the current company only.
    """
    try:
        company = _get_request_company(request)
        invoice = _get_company_invoice(
            company=company,
            invoice_id=invoice_id,
        )

        if not invoice:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Sales invoice was not found.",
                    "errors": {
                        "detail": "Sales invoice was not found.",
                    },
                },
                status=404,
            )

        require_object_branch(request, invoice, branch_attr="branch_id")

        data = serialize_sales_invoice(invoice, include_items=True)

        # Read-only enrichment for the commercial invoice detail screen.
        # Historical accounting values on the invoice header remain authoritative.
        payment_qs = (
            CustomerPayment.objects.filter(
                company=company,
                sales_invoice=invoice,
                status="CONFIRMED",
            )
            .select_related("treasury_account")
            .order_by("payment_date", "id")
        )

        payments = []

        for payment in payment_qs:
            treasury_account = None

            if payment.treasury_account_id:
                treasury_account = {
                    "id": payment.treasury_account_id,
                    "name": payment.treasury_account.name,
                    "code": payment.treasury_account.code,
                }

            payments.append(
                {
                    "id": payment.id,
                    "payment_number": payment.payment_number,
                    "amount": str(payment.amount),
                    "currency": payment.currency,
                    "payment_method": payment.payment_method,
                    "payment_date": (
                        payment.payment_date.isoformat()
                        if payment.payment_date
                        else None
                    ),
                    "reference": payment.reference,
                    "description": payment.description,
                    "notes": payment.notes,
                    "treasury_account": treasury_account,
                }
            )

        data["payments"] = payments
        data["total_quantity"] = str(
            sum(
                (item.quantity for item in invoice.items.all()),
                start=0,
            )
        )
        data["items_tax_amount"] = str(
            sum(
                (item.tax_amount for item in invoice.items.all()),
                start=0,
            )
        )

        # Do not recalculate the migrated document-header tax from tax_rate.
        data["display_tax_amount"] = str(invoice.tax_amount)

        for item_data, invoice_item in zip(
            data.get("items", []),
            invoice.items.select_related("catalog_item").order_by("line_number", "id"),
        ):
            catalog_item = invoice_item.catalog_item
            display_code = invoice_item.item_code_snapshot or ""
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

        customer = invoice.customer
        if customer is not None:
            migration = customer.extra_data.get("migration", {}) if isinstance(customer.extra_data, dict) else {}
            legacy_payload = migration.get("legacy_payload", {}) if isinstance(migration, dict) else {}
            if not isinstance(legacy_payload, dict):
                legacy_payload = {}
            data["customer_detail"] = {
                "id": customer.id,
                "code": customer.code,
                "display_name": customer.display_name,
                "legal_name": customer.legal_name,
                "contact_person": customer.contact_person,
                "phone": customer.phone,
                "mobile": customer.mobile,
                "whatsapp_number": customer.whatsapp_number,
                "email": customer.email,
                "website": customer.website,
                "commercial_registration": customer.commercial_registration,
                "vat_number": customer.vat_number,
                "national_id": customer.national_id,
                "country": customer.country,
                "city": customer.city,
                "district": customer.district,
                "street": customer.street,
                "building_number": customer.building_number or legacy_payload.get("address_line_2") or "",
                "additional_number": customer.additional_number,
                "postal_code": customer.postal_code or legacy_payload.get("zip_code") or "",
                "short_address": customer.short_address,
                "address_line": customer.address_line or legacy_payload.get("address_line_1") or "",
            }

        def _user_label(user):
            if user is None:
                return None
            profile = getattr(user, "profile", None)
            profile_name = str(getattr(profile, "display_name", "") or "").strip() if profile is not None else ""
            fn = getattr(user, "get_full_name", None)
            full_name = str(fn() or "").strip() if callable(fn) else ""
            return profile_name or full_name or str(getattr(user, "username", "") or "").strip() or str(getattr(user, "email", "") or "").strip() or f"User #{user.pk}"

        def _mapped_legacy_user(legacy_user_id):
            if not legacy_user_id:
                return None
            mapping = LegacyObjectMap.objects.filter(
                source_system="mhamcloud_v1",
                source_table="users",
                legacy_id=str(legacy_user_id),
                company=company,
            ).order_by("-id").first()
            if mapping is None or not mapping.target_object_id:
                return None
            return get_user_model().objects.filter(pk=mapping.target_object_id).first()

        migration = invoice.extra_data.get("migration", {}) if isinstance(invoice.extra_data, dict) else {}
        source_payload = migration.get("source_payload", {}) if isinstance(migration, dict) else {}
        if not isinstance(source_payload, dict):
            source_payload = {}
        legacy_created_by = source_payload.get("created_by")
        legacy_updated_by = source_payload.get("updated_by")
        legacy_created_at = source_payload.get("created_at")
        legacy_updated_at = source_payload.get("updated_at")
        created_by_user = invoice.created_by or _mapped_legacy_user(legacy_created_by)
        updated_by_user = invoice.updated_by or _mapped_legacy_user(legacy_updated_by)
        created_by_label = _user_label(created_by_user)
        if not created_by_label and legacy_created_by:
            created_by_label = f"مستخدم قديم #{legacy_created_by}"
        updated_by_label = _user_label(updated_by_user)
        created_at_value = legacy_created_at or (invoice.created_at.isoformat() if invoice.created_at else None)
        updated_at_value = legacy_updated_at or (invoice.updated_at.isoformat() if invoice.updated_at else None)
        was_modified = bool(created_at_value and updated_at_value and str(created_at_value) != str(updated_at_value))
        data["audit_metadata"] = {
            "created_by": created_by_label,
            "created_by_user_id": created_by_user.pk if created_by_user is not None else None,
            "created_at": created_at_value,
            "was_modified": was_modified,
            "updated_by": updated_by_label if was_modified else None,
            "updated_by_user_id": updated_by_user.pk if was_modified and updated_by_user is not None else None,
            "updated_at": updated_at_value if was_modified else None,
            "source": "legacy" if legacy_created_at else "current",
        }

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoice loaded successfully.",
                "invoice": data,
                "data": data,
            },
            status=200,
        )

    except SalesInvoiceDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )


company_sales_invoice_detail.required_company_permissions = [
    "company.sales.invoices.view",
]
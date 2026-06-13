# ============================================================
# 📂 sales/services.py
# 🧠 PrimeyAcc | Sales Services V1.5
# ------------------------------------------------------------
# ✅ Company-scoped invoice helpers
# ✅ Invoice number generation
# ✅ Safe invoice/due date normalization
# ✅ Default branch resolver
# ✅ Customer / catalog item tenant validation
# ✅ Draft invoice creation
# ✅ Invoice item creation
# ✅ Issue / cancel helpers
# ✅ Phase 10.1 automatic accounting posting for invoices
# ✅ Phase 21.1 sales quotations services foundation
# ✅ Quotation creation, lifecycle, serialization, and isolation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الخدمات هنا هي مصدر منطق المبيعات الأساسي
# - APIs تستدعي هذه الخدمات بدل تكرار المنطق
# - لا نثق بأي company_id قادم من الفرونت
# - الشركة يجب أن تأتي من عضوية المستخدم أو context الخاص بـ /company
# - التواريخ قد تصل من الواجهة كنص YYYY-MM-DD ويجب تطبيعها هنا
# - عند إصدار فاتورة البيع يتم إنشاء قيد محاسبي تلقائي
# - عروض الأسعار لا تنشئ قيودًا محاسبية ولا حركات مخزون
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from accounting.services import (
    AccountingServiceError,
    post_sales_invoice_to_accounting,
)
from catalog.models import CatalogItem, CatalogItemStatus
from companies.models import Branch, Company
from parties.models import (
    BusinessParty,
    BusinessPartyStatus,
    BusinessPartyType,
)
from sales.models import (
    MONEY_ZERO,
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoiceSource,
    SalesInvoiceStatus,
    SalesOrder,
    SalesOrderBillingStatus,
    SalesOrderItem,
    SalesOrderSource,
    SalesOrderStatus,
    SalesQuotation,
    SalesQuotationItem,
    SalesQuotationSource,
    SalesQuotationStatus,
    quantize_money,
    quantize_quantity,
)


@dataclass(frozen=True)
class InvoiceItemPayload:
    """
    Normalized sales document line payload.

    Used by invoices and quotations because both documents currently share
    the same line pricing, discount, tax, catalog, and snapshot rules.
    """

    catalog_item_id: int | None = None
    description: str = ""
    quantity: Decimal = Decimal("1.0000")
    unit_price: Decimal | None = None
    discount_amount: Decimal = MONEY_ZERO
    taxable: bool | None = None
    tax_rate: Decimal | None = None
    item_name: str = ""


def normalize_text(value: Any) -> str:
    """
    Normalize a text value safely.
    """
    return str(value or "").strip()


def normalize_invoice_date(
    value: Any,
    *,
    field_name: str = "invoice_date",
    default_today: bool = False,
) -> date | None:
    """
    Normalize sales document date values safely.

    Accepts:
    - None / empty string
    - datetime.date
    - datetime.datetime
    - YYYY-MM-DD string

    Raises ValidationError for unsupported formats.
    """
    if value in [None, ""]:
        return timezone.localdate() if default_today else None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        normalized_value = value.strip()

        if not normalized_value:
            return timezone.localdate() if default_today else None

        try:
            return date.fromisoformat(normalized_value)
        except ValueError as exc:
            raise ValidationError(
                {
                    field_name: "Date must be in YYYY-MM-DD format.",
                }
            ) from exc

    raise ValidationError(
        {
            field_name: "Invalid date value.",
        }
    )


def get_default_branch(company: Company) -> Branch | None:
    """
    Return the default active branch for a company when available.
    """
    return (
        Branch.objects.filter(
            company=company,
            is_default=True,
            is_active=True,
        )
        .order_by("id")
        .first()
    )


def resolve_company_branch(
    company: Company,
    branch_id: int | str | None = None,
) -> Branch | None:
    """
    Resolve a branch inside the same company.

    When branch_id is not provided, the default active branch is returned.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not branch_id:
        return get_default_branch(company)

    branch = (
        Branch.objects.filter(
            company=company,
            id=branch_id,
        )
        .first()
    )

    if not branch:
        raise ValidationError(
            {
                "branch":
                "Selected branch was not found for this company."
            }
        )

    if not branch.is_active:
        raise ValidationError(
            {"branch": "Selected branch is not active."}
        )

    return branch


def resolve_customer(
    company: Company,
    customer_id: int | str | None = None,
) -> BusinessParty | None:
    """
    Resolve an active customer inside the same company.

    The customer may remain optional while a document is in draft.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not customer_id:
        return None

    customer = (
        BusinessParty.objects.filter(
            company=company,
            id=customer_id,
        )
        .first()
    )

    if not customer:
        raise ValidationError(
            {
                "customer":
                "Selected customer was not found for this company."
            }
        )

    if customer.party_type not in [
        BusinessPartyType.CUSTOMER,
        BusinessPartyType.BOTH,
    ]:
        raise ValidationError(
            {"customer": "Selected party is not a customer."}
        )

    if customer.status != BusinessPartyStatus.ACTIVE:
        raise ValidationError(
            {"customer": "Selected customer is not active."}
        )

    return customer


def resolve_catalog_item(
    company: Company,
    catalog_item_id: int | str | None = None,
) -> CatalogItem | None:
    """
    Resolve an active sellable catalog item inside the same company.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not catalog_item_id:
        return None

    catalog_item = (
        CatalogItem.objects.select_related("unit")
        .filter(
            company=company,
            id=catalog_item_id,
        )
        .first()
    )

    if not catalog_item:
        raise ValidationError(
            {
                "catalog_item":
                "Selected catalog item was not found for this company."
            }
        )

    if catalog_item.status != CatalogItemStatus.ACTIVE:
        raise ValidationError(
            {
                "catalog_item":
                "Selected catalog item is not active."
            }
        )

    if not catalog_item.is_sellable:
        raise ValidationError(
            {
                "catalog_item":
                "Selected catalog item is not sellable."
            }
        )

    return catalog_item


def generate_invoice_number(
    company: Company,
    invoice_date=None,
) -> str:
    """
    Generate a company-scoped invoice number.

    Format:
        INV-YYYY-000001
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    normalized_date = normalize_invoice_date(
        invoice_date,
        field_name="invoice_date",
        default_today=True,
    )
    year = normalized_date.year

    prefix = "INV"

    settings_obj = getattr(
        company,
        "operational_settings",
        None,
    )

    if (
        settings_obj
        and getattr(settings_obj, "invoice_prefix", None)
    ):
        prefix = (
            normalize_text(settings_obj.invoice_prefix)
            or "INV"
        )

    starts_with = f"{prefix}-{year}-"

    last_invoice = (
        SalesInvoice.objects.filter(
            company=company,
            invoice_number__startswith=starts_with,
        )
        .order_by("-invoice_number", "-id")
        .first()
    )

    next_number = 1

    if last_invoice and last_invoice.invoice_number:
        try:
            next_number = (
                int(
                    last_invoice.invoice_number.split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = last_invoice.id + 1

    return f"{starts_with}{next_number:06d}"


def normalize_invoice_item_payload(
    raw_item: dict[str, Any],
) -> InvoiceItemPayload:
    """
    Normalize invoice or quotation line data from an API or test.
    """
    if not isinstance(raw_item, dict):
        raise ValidationError(
            {"items": "Each sales document item must be an object."}
        )

    return InvoiceItemPayload(
        catalog_item_id=(
            raw_item.get("catalog_item_id")
            or raw_item.get("item_id")
        ),
        description=normalize_text(
            raw_item.get("description")
        ),
        quantity=quantize_quantity(
            raw_item.get("quantity")
            or Decimal("1.0000")
        ),
        unit_price=(
            quantize_money(raw_item.get("unit_price"))
            if raw_item.get("unit_price") not in [None, ""]
            else None
        ),
        discount_amount=quantize_money(
            raw_item.get("discount_amount")
            or MONEY_ZERO
        ),
        taxable=(
            raw_item.get("taxable")
            if raw_item.get("taxable") is not None
            else None
        ),
        tax_rate=(
            quantize_money(raw_item.get("tax_rate"))
            if raw_item.get("tax_rate") not in [None, ""]
            else None
        ),
        item_name=normalize_text(
            raw_item.get("item_name")
            or raw_item.get("name")
            or raw_item.get("item_name_snapshot")
        ),
    )


@transaction.atomic
def create_sales_invoice(
    *,
    company: Company,
    user=None,
    branch_id: int | str | None = None,
    customer_id: int | str | None = None,
    invoice_date=None,
    due_date=None,
    source: str = SalesInvoiceSource.MANUAL,
    public_notes: str = "",
    internal_notes: str = "",
    items: list[dict[str, Any]] | None = None,
    extra_data: dict[str, Any] | None = None,
) -> SalesInvoice:
    """
    Create a draft sales invoice with optional lines.

    Issuing remains a separate explicit operation.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    normalized_invoice_date = normalize_invoice_date(
        invoice_date,
        field_name="invoice_date",
        default_today=True,
    )
    normalized_due_date = normalize_invoice_date(
        due_date,
        field_name="due_date",
        default_today=False,
    )

    if (
        normalized_due_date
        and normalized_due_date < normalized_invoice_date
    ):
        raise ValidationError(
            {
                "due_date":
                "Due date cannot be before invoice date."
            }
        )

    branch = resolve_company_branch(
        company,
        branch_id,
    )
    customer = resolve_customer(
        company,
        customer_id,
    )

    actor = (
        user
        if getattr(user, "is_authenticated", False)
        else None
    )

    invoice = SalesInvoice(
        company=company,
        branch=branch,
        customer=customer,
        invoice_number=generate_invoice_number(
            company,
            invoice_date=normalized_invoice_date,
        ),
        status=SalesInvoiceStatus.DRAFT,
        source=source or SalesInvoiceSource.MANUAL,
        invoice_date=normalized_invoice_date,
        due_date=normalized_due_date,
        public_notes=normalize_text(public_notes),
        internal_notes=normalize_text(internal_notes),
        currency_code=(
            normalize_text(company.currency_code)
            or "SAR"
        ),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )

    invoice.full_clean()
    invoice.save()
    invoice.refresh_snapshots(save=True)

    for index, item_payload in enumerate(
        items or [],
        start=1,
    ):
        create_sales_invoice_item(
            invoice=invoice,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    invoice.recalculate_totals(save=True)

    return invoice


@transaction.atomic
def create_sales_invoice_item(
    *,
    invoice: SalesInvoice,
    company: Company,
    payload: dict[str, Any],
    line_number: int | None = None,
) -> SalesInvoiceItem:
    """
    Create one invoice line and refresh invoice totals.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not invoice:
        raise ValidationError(
            {"invoice": "Invoice is required."}
        )

    if invoice.company_id != company.id:
        raise ValidationError(
            {
                "company":
                "Invoice does not belong to this company."
            }
        )

    if invoice.status != SalesInvoiceStatus.DRAFT:
        raise ValidationError(
            {"invoice": "Only draft invoices can be edited."}
        )

    normalized = normalize_invoice_item_payload(payload)

    if normalized.quantity <= Decimal("0.0000"):
        raise ValidationError(
            {"quantity": "Quantity must be greater than zero."}
        )

    catalog_item = resolve_catalog_item(
        company,
        normalized.catalog_item_id,
    )

    if not catalog_item and not normalized.item_name:
        raise ValidationError(
            {
                "item_name":
                "Item name is required when no catalog item is selected."
            }
        )

    if line_number is None:
        last_line = (
            SalesInvoiceItem.objects.filter(
                invoice=invoice,
            )
            .order_by("-line_number")
            .first()
        )

        line_number = (
            last_line.line_number + 1
            if last_line
            else 1
        )

    item = SalesInvoiceItem(
        invoice=invoice,
        company=company,
        catalog_item=catalog_item,
        line_number=line_number,
        quantity=normalized.quantity,
        discount_amount=normalized.discount_amount,
        notes=normalized.description,
    )

    if catalog_item:
        item.apply_catalog_snapshot()

    if normalized.item_name:
        item.item_name_snapshot = normalized.item_name

    if normalized.description:
        item.item_description_snapshot = (
            normalized.description
        )

    if normalized.unit_price is not None:
        item.unit_price = normalized.unit_price

    if normalized.taxable is not None:
        item.taxable = bool(normalized.taxable)

    if normalized.tax_rate is not None:
        item.tax_rate = normalized.tax_rate

    item.full_clean()
    item.save()

    invoice.recalculate_totals(save=True)

    return item


@transaction.atomic
def issue_sales_invoice(
    *,
    company: Company,
    invoice: SalesInvoice,
    user=None,
) -> SalesInvoice:
    """
    Issue a draft invoice and create its automatic accounting entry.

    If accounting posting fails, the transaction is rolled back.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not invoice:
        raise ValidationError(
            {"invoice": "Invoice is required."}
        )

    if invoice.company_id != company.id:
        raise ValidationError(
            {
                "invoice":
                "Invoice does not belong to this company."
            }
        )

    invoice.recalculate_totals(save=True)
    invoice.issue(user=user)

    try:
        post_sales_invoice_to_accounting(
            invoice,
            actor=user,
            auto_post=True,
        )
    except AccountingServiceError as exc:
        raise ValidationError(
            {
                "accounting": str(exc),
            }
        ) from exc

    return invoice


@transaction.atomic
def cancel_sales_invoice(
    *,
    company: Company,
    invoice: SalesInvoice,
    reason: str = "",
    user=None,
) -> SalesInvoice:
    """
    Cancel an issued invoice.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not invoice:
        raise ValidationError(
            {"invoice": "Invoice is required."}
        )

    if invoice.company_id != company.id:
        raise ValidationError(
            {
                "invoice":
                "Invoice does not belong to this company."
            }
        )

    source_order = (
        invoice.source_order
        if invoice.source_order_id
        else None
    )

    invoice.cancel(
        reason=reason,
        user=user,
    )

    if source_order:
        source_order.refresh_invoice_progress(
            save=True
        )
        source_order.refresh_from_db()

    return invoice


def serialize_invoice_item(
    item: SalesInvoiceItem,
) -> dict[str, Any]:
    """
    Serialize an invoice line for APIs.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "catalog_item_id": item.catalog_item_id,
        "source_order_item_id": (
            item.source_order_item_id
        ),
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "description": item.item_description_snapshot,
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "unit_price": str(item.unit_price),
        "line_subtotal": str(item.line_subtotal),
        "discount_amount": str(item.discount_amount),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "taxable_amount": str(item.taxable_amount),
        "tax_amount": str(item.tax_amount),
        "line_total": str(item.line_total),
        "notes": item.notes,
        "extra_data": item.extra_data,
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        ),
        "updated_at": (
            item.updated_at.isoformat()
            if item.updated_at
            else None
        ),
    }


def serialize_sales_invoice(
    invoice: SalesInvoice,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize a sales invoice for APIs.
    """
    data = {
        "id": invoice.id,
        "company_id": invoice.company_id,
        "branch": (
            {
                "id": invoice.branch_id,
                "name": invoice.branch.display_name,
                "code": invoice.branch.branch_code,
            }
            if invoice.branch_id
            else None
        ),
        "customer": (
            {
                "id": invoice.customer_id,
                "display_name": (
                    invoice.customer.display_name
                ),
                "code": invoice.customer.code,
                "phone": invoice.customer.phone,
                "mobile": invoice.customer.mobile,
                "vat_number": invoice.customer.vat_number,
            }
            if invoice.customer_id
            else None
        ),
        "source_order": (
            {
                "id": invoice.source_order_id,
                "order_number": (
                    invoice.source_order.order_number
                ),
                "status": invoice.source_order.status,
                "billing_status": (
                    invoice.source_order.billing_status
                ),
                "order_date": (
                    invoice.source_order.order_date.isoformat()
                    if invoice.source_order.order_date
                    else None
                ),
                "total_amount": str(
                    invoice.source_order.total_amount
                ),
            }
            if invoice.source_order_id
            else None
        ),
        "invoice_number": invoice.invoice_number,
        "status": invoice.status,
        "payment_status": invoice.payment_status,
        "source": invoice.source,
        "invoice_date": (
            invoice.invoice_date.isoformat()
            if invoice.invoice_date
            else None
        ),
        "due_date": (
            invoice.due_date.isoformat()
            if invoice.due_date
            else None
        ),
        "issued_at": (
            invoice.issued_at.isoformat()
            if invoice.issued_at
            else None
        ),
        "cancelled_at": (
            invoice.cancelled_at.isoformat()
            if invoice.cancelled_at
            else None
        ),
        "cancelled_reason": invoice.cancelled_reason,
        "subtotal": str(invoice.subtotal),
        "discount_amount": str(invoice.discount_amount),
        "taxable_amount": str(invoice.taxable_amount),
        "tax_amount": str(invoice.tax_amount),
        "total_amount": str(invoice.total_amount),
        "paid_amount": str(invoice.paid_amount),
        "balance_due": str(invoice.balance_due),
        "currency_code": invoice.currency_code,
        "customer_snapshot": invoice.customer_snapshot,
        "billing_address_snapshot": (
            invoice.billing_address_snapshot
        ),
        "tax_snapshot": invoice.tax_snapshot,
        "public_notes": invoice.public_notes,
        "internal_notes": invoice.internal_notes,
        "extra_data": invoice.extra_data,
        "can_be_edited": invoice.can_be_edited,
        "can_be_issued": invoice.can_be_issued,
        "can_be_cancelled": invoice.can_be_cancelled,
        "created_at": (
            invoice.created_at.isoformat()
            if invoice.created_at
            else None
        ),
        "updated_at": (
            invoice.updated_at.isoformat()
            if invoice.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            serialize_invoice_item(item)
            for item in invoice.items.select_related(
                "catalog_item"
            ).order_by(
                "line_number",
                "id",
            )
        ]

    return data

def generate_quotation_number(
    company: Company,
    quotation_date=None,
) -> str:
    """
    Generate a company-scoped sales quotation number.

    Format:
        QUO-YYYY-000001
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    normalized_date = normalize_invoice_date(
        quotation_date,
        field_name="quotation_date",
        default_today=True,
    )
    year = normalized_date.year
    prefix = "QUO"
    starts_with = f"{prefix}-{year}-"

    last_quotation = (
        SalesQuotation.objects.filter(
            company=company,
            quotation_number__startswith=starts_with,
        )
        .order_by("-quotation_number", "-id")
        .first()
    )

    next_number = 1

    if last_quotation and last_quotation.quotation_number:
        try:
            next_number = (
                int(
                    last_quotation.quotation_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = last_quotation.id + 1

    return f"{starts_with}{next_number:06d}"


@transaction.atomic
def create_sales_quotation(
    *,
    company: Company,
    user=None,
    branch_id: int | str | None = None,
    customer_id: int | str | None = None,
    quotation_date=None,
    valid_until=None,
    source: str = SalesQuotationSource.MANUAL,
    terms_and_conditions: str = "",
    public_notes: str = "",
    internal_notes: str = "",
    items: list[dict[str, Any]] | None = None,
    extra_data: dict[str, Any] | None = None,
) -> SalesQuotation:
    """
    Create a company-scoped draft sales quotation.

    Quotations do not move inventory and do not create accounting entries.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    normalized_quotation_date = normalize_invoice_date(
        quotation_date,
        field_name="quotation_date",
        default_today=True,
    )
    normalized_valid_until = normalize_invoice_date(
        valid_until,
        field_name="valid_until",
        default_today=False,
    )

    if (
        normalized_valid_until
        and normalized_valid_until
        < normalized_quotation_date
    ):
        raise ValidationError(
            {
                "valid_until":
                "Valid until date cannot be before quotation date."
            }
        )

    branch = resolve_company_branch(
        company,
        branch_id,
    )
    customer = resolve_customer(
        company,
        customer_id,
    )

    actor = (
        user
        if getattr(user, "is_authenticated", False)
        else None
    )

    quotation = SalesQuotation(
        company=company,
        branch=branch,
        customer=customer,
        quotation_number=generate_quotation_number(
            company,
            quotation_date=normalized_quotation_date,
        ),
        status=SalesQuotationStatus.DRAFT,
        source=source or SalesQuotationSource.MANUAL,
        quotation_date=normalized_quotation_date,
        valid_until=normalized_valid_until,
        terms_and_conditions=normalize_text(
            terms_and_conditions
        ),
        public_notes=normalize_text(public_notes),
        internal_notes=normalize_text(internal_notes),
        currency_code=(
            normalize_text(company.currency_code)
            or "SAR"
        ),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )

    quotation.full_clean()
    quotation.save()
    quotation.refresh_snapshots(save=True)

    for index, item_payload in enumerate(
        items or [],
        start=1,
    ):
        create_sales_quotation_item(
            quotation=quotation,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    quotation.recalculate_totals(save=True)

    return quotation


@transaction.atomic
def create_sales_quotation_item(
    *,
    quotation: SalesQuotation,
    company: Company,
    payload: dict[str, Any],
    line_number: int | None = None,
) -> SalesQuotationItem:
    """
    Create one quotation line and refresh quotation totals.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Quotation is required."}
        )

    if quotation.company_id != company.id:
        raise ValidationError(
            {
                "company":
                "Quotation does not belong to this company."
            }
        )

    if quotation.status != SalesQuotationStatus.DRAFT:
        raise ValidationError(
            {
                "quotation":
                "Only draft quotations can be edited."
            }
        )

    normalized = normalize_invoice_item_payload(payload)

    if normalized.quantity <= Decimal("0.0000"):
        raise ValidationError(
            {"quantity": "Quantity must be greater than zero."}
        )

    catalog_item = resolve_catalog_item(
        company,
        normalized.catalog_item_id,
    )

    if not catalog_item and not normalized.item_name:
        raise ValidationError(
            {
                "item_name":
                "Item name is required when no catalog item is selected."
            }
        )

    if line_number is None:
        last_line = (
            SalesQuotationItem.objects.filter(
                quotation=quotation,
            )
            .order_by("-line_number")
            .first()
        )

        line_number = (
            last_line.line_number + 1
            if last_line
            else 1
        )

    item = SalesQuotationItem(
        quotation=quotation,
        company=company,
        catalog_item=catalog_item,
        line_number=line_number,
        quantity=normalized.quantity,
        discount_amount=normalized.discount_amount,
        notes=normalized.description,
    )

    if catalog_item:
        item.apply_catalog_snapshot()

    if normalized.item_name:
        item.item_name_snapshot = normalized.item_name

    if normalized.description:
        item.item_description_snapshot = (
            normalized.description
        )

    if normalized.unit_price is not None:
        item.unit_price = normalized.unit_price

    if normalized.taxable is not None:
        item.taxable = bool(normalized.taxable)

    if normalized.tax_rate is not None:
        item.tax_rate = normalized.tax_rate

    item.full_clean()
    item.save()

    quotation.recalculate_totals(save=True)

    return item


@transaction.atomic
def send_sales_quotation(
    *,
    company: Company,
    quotation: SalesQuotation,
    user=None,
) -> SalesQuotation:
    """
    Send a draft sales quotation.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Quotation is required."}
        )

    if quotation.company_id != company.id:
        raise ValidationError(
            {
                "quotation":
                "Quotation does not belong to this company."
            }
        )

    quotation.recalculate_totals(save=True)
    quotation.send(user=user)

    return quotation


@transaction.atomic
def accept_sales_quotation(
    *,
    company: Company,
    quotation: SalesQuotation,
    user=None,
) -> SalesQuotation:
    """
    Accept a sent sales quotation.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Quotation is required."}
        )

    if quotation.company_id != company.id:
        raise ValidationError(
            {
                "quotation":
                "Quotation does not belong to this company."
            }
        )

    quotation.accept(user=user)

    return quotation


@transaction.atomic
def reject_sales_quotation(
    *,
    company: Company,
    quotation: SalesQuotation,
    reason: str = "",
    user=None,
) -> SalesQuotation:
    """
    Reject a sent sales quotation.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Quotation is required."}
        )

    if quotation.company_id != company.id:
        raise ValidationError(
            {
                "quotation":
                "Quotation does not belong to this company."
            }
        )

    quotation.reject(
        reason=reason,
        user=user,
    )

    return quotation


@transaction.atomic
def expire_sales_quotation(
    *,
    company: Company,
    quotation: SalesQuotation,
    user=None,
) -> SalesQuotation:
    """
    Mark a sent sales quotation as expired.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Quotation is required."}
        )

    if quotation.company_id != company.id:
        raise ValidationError(
            {
                "quotation":
                "Quotation does not belong to this company."
            }
        )

    quotation.expire(user=user)

    return quotation


@transaction.atomic
def cancel_sales_quotation(
    *,
    company: Company,
    quotation: SalesQuotation,
    reason: str = "",
    user=None,
) -> SalesQuotation:
    """
    Cancel a draft or sent sales quotation.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Quotation is required."}
        )

    if quotation.company_id != company.id:
        raise ValidationError(
            {
                "quotation":
                "Quotation does not belong to this company."
            }
        )

    quotation.cancel(
        reason=reason,
        user=user,
    )

    return quotation


def serialize_quotation_item(
    item: SalesQuotationItem,
) -> dict[str, Any]:
    """
    Serialize a quotation line for APIs.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "catalog_item_id": item.catalog_item_id,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "description": item.item_description_snapshot,
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "unit_price": str(item.unit_price),
        "line_subtotal": str(item.line_subtotal),
        "discount_amount": str(item.discount_amount),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "taxable_amount": str(item.taxable_amount),
        "tax_amount": str(item.tax_amount),
        "line_total": str(item.line_total),
        "notes": item.notes,
        "extra_data": item.extra_data,
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        ),
        "updated_at": (
            item.updated_at.isoformat()
            if item.updated_at
            else None
        ),
    }


def serialize_sales_quotation(
    quotation: SalesQuotation,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize a sales quotation for APIs.
    """
    data = {
        "id": quotation.id,
        "company_id": quotation.company_id,
        "branch": (
            {
                "id": quotation.branch_id,
                "name": quotation.branch.display_name,
                "code": quotation.branch.branch_code,
            }
            if quotation.branch_id
            else None
        ),
        "customer": (
            {
                "id": quotation.customer_id,
                "display_name": (
                    quotation.customer.display_name
                ),
                "code": quotation.customer.code,
                "phone": quotation.customer.phone,
                "mobile": quotation.customer.mobile,
                "vat_number": quotation.customer.vat_number,
            }
            if quotation.customer_id
            else None
        ),
        "quotation_number": quotation.quotation_number,
        "status": quotation.status,
        "source": quotation.source,
        "quotation_date": (
            quotation.quotation_date.isoformat()
            if quotation.quotation_date
            else None
        ),
        "valid_until": (
            quotation.valid_until.isoformat()
            if quotation.valid_until
            else None
        ),
        "sent_at": (
            quotation.sent_at.isoformat()
            if quotation.sent_at
            else None
        ),
        "accepted_at": (
            quotation.accepted_at.isoformat()
            if quotation.accepted_at
            else None
        ),
        "rejected_at": (
            quotation.rejected_at.isoformat()
            if quotation.rejected_at
            else None
        ),
        "expired_at": (
            quotation.expired_at.isoformat()
            if quotation.expired_at
            else None
        ),
        "cancelled_at": (
            quotation.cancelled_at.isoformat()
            if quotation.cancelled_at
            else None
        ),
        "rejection_reason": quotation.rejection_reason,
        "cancelled_reason": quotation.cancelled_reason,
        "subtotal": str(quotation.subtotal),
        "discount_amount": str(
            quotation.discount_amount
        ),
        "taxable_amount": str(
            quotation.taxable_amount
        ),
        "tax_amount": str(quotation.tax_amount),
        "total_amount": str(quotation.total_amount),
        "currency_code": quotation.currency_code,
        "customer_snapshot": quotation.customer_snapshot,
        "billing_address_snapshot": (
            quotation.billing_address_snapshot
        ),
        "tax_snapshot": quotation.tax_snapshot,
        "terms_and_conditions": (
            quotation.terms_and_conditions
        ),
        "public_notes": quotation.public_notes,
        "internal_notes": quotation.internal_notes,
        "extra_data": quotation.extra_data,
        "can_be_edited": quotation.can_be_edited,
        "can_be_sent": quotation.can_be_sent,
        "can_be_accepted": quotation.can_be_accepted,
        "can_be_rejected": quotation.can_be_rejected,
        "can_be_expired": quotation.can_be_expired,
        "can_be_cancelled": quotation.can_be_cancelled,
        "created_at": (
            quotation.created_at.isoformat()
            if quotation.created_at
            else None
        ),
        "updated_at": (
            quotation.updated_at.isoformat()
            if quotation.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            serialize_quotation_item(item)
            for item in quotation.items.select_related(
                "catalog_item"
            ).order_by(
                "line_number",
                "id",
            )
        ]

    return data

# ============================================================
# Phase 21.2 - Sales Orders Services Foundation
# ============================================================


def generate_order_number(
    company: Company,
    order_date=None,
) -> str:
    """
    Generate a company-scoped sales order number.

    Format:
        SO-YYYY-000001
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    normalized_date = normalize_invoice_date(
        order_date,
        field_name="order_date",
        default_today=True,
    )

    year = normalized_date.year
    prefix = "SO"
    starts_with = f"{prefix}-{year}-"

    last_order = (
        SalesOrder.objects.filter(
            company=company,
            order_number__startswith=starts_with,
        )
        .order_by("-order_number", "-id")
        .first()
    )

    next_number = 1

    if last_order and last_order.order_number:
        try:
            next_number = (
                int(
                    last_order.order_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = last_order.id + 1

    return f"{starts_with}{next_number:06d}"


@transaction.atomic
def create_sales_order(
    *,
    company: Company,
    user=None,
    branch_id: int | str | None = None,
    customer_id: int | str | None = None,
    order_date=None,
    expected_delivery_date=None,
    source: str = SalesOrderSource.MANUAL,
    public_notes: str = "",
    internal_notes: str = "",
    items: list[dict[str, Any]] | None = None,
    extra_data: dict[str, Any] | None = None,
) -> SalesOrder:
    """
    Create a company-scoped draft sales order manually.

    The order does not create accounting entries or inventory movements.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    normalized_order_date = normalize_invoice_date(
        order_date,
        field_name="order_date",
        default_today=True,
    )

    normalized_delivery_date = normalize_invoice_date(
        expected_delivery_date,
        field_name="expected_delivery_date",
        default_today=False,
    )

    if (
        normalized_delivery_date
        and normalized_delivery_date < normalized_order_date
    ):
        raise ValidationError(
            {
                "expected_delivery_date":
                "Expected delivery date cannot be before order date."
            }
        )

    branch = resolve_company_branch(
        company,
        branch_id,
    )

    customer = resolve_customer(
        company,
        customer_id,
    )

    actor = (
        user
        if getattr(user, "is_authenticated", False)
        else None
    )

    order = SalesOrder(
        company=company,
        branch=branch,
        customer=customer,
        order_number=generate_order_number(
            company,
            order_date=normalized_order_date,
        ),
        status=SalesOrderStatus.DRAFT,
        source=source or SalesOrderSource.MANUAL,
        order_date=normalized_order_date,
        expected_delivery_date=normalized_delivery_date,
        public_notes=normalize_text(public_notes),
        internal_notes=normalize_text(internal_notes),
        currency_code=(
            normalize_text(company.currency_code)
            or "SAR"
        ),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )

    order.full_clean()
    order.save()
    order.refresh_snapshots(save=True)

    for index, item_payload in enumerate(
        items or [],
        start=1,
    ):
        create_sales_order_item(
            order=order,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    order.recalculate_totals(save=True)
    order.refresh_from_db()

    return order


@transaction.atomic
def create_sales_order_item(
    *,
    order: SalesOrder,
    company: Company,
    payload: dict[str, Any],
    line_number: int | None = None,
) -> SalesOrderItem:
    """
    Create one sales order line and refresh order totals.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not order:
        raise ValidationError(
            {"order": "Sales order is required."}
        )

    if order.company_id != company.id:
        raise ValidationError(
            {
                "company":
                "Sales order does not belong to this company."
            }
        )

    if order.status != SalesOrderStatus.DRAFT:
        raise ValidationError(
            {
                "order":
                "Only draft sales orders can be edited."
            }
        )

    normalized = normalize_invoice_item_payload(payload)

    if normalized.quantity <= Decimal("0.0000"):
        raise ValidationError(
            {"quantity": "Quantity must be greater than zero."}
        )

    catalog_item = resolve_catalog_item(
        company,
        normalized.catalog_item_id,
    )

    if not catalog_item and not normalized.item_name:
        raise ValidationError(
            {
                "item_name":
                "Item name is required when no catalog item is selected."
            }
        )

    if line_number is None:
        last_line = (
            SalesOrderItem.objects.filter(
                order=order,
            )
            .order_by("-line_number")
            .first()
        )

        line_number = (
            last_line.line_number + 1
            if last_line
            else 1
        )

    item = SalesOrderItem(
        order=order,
        company=company,
        catalog_item=catalog_item,
        line_number=line_number,
        quantity=normalized.quantity,
        discount_amount=normalized.discount_amount,
        notes=normalized.description,
    )

    if catalog_item:
        item.apply_catalog_snapshot()

    if normalized.item_name:
        item.item_name_snapshot = normalized.item_name

    if normalized.description:
        item.item_description_snapshot = (
            normalized.description
        )

    if normalized.unit_price is not None:
        item.unit_price = normalized.unit_price

    if normalized.taxable is not None:
        item.taxable = bool(normalized.taxable)

    if normalized.tax_rate is not None:
        item.tax_rate = normalized.tax_rate

    item.full_clean()
    item.save()

    order.recalculate_totals(save=True)

    return item


@transaction.atomic
def create_sales_order_from_quotation(
    *,
    company: Company,
    quotation: SalesQuotation,
    user=None,
    order_date=None,
    expected_delivery_date=None,
    public_notes: str | None = None,
    internal_notes: str | None = None,
    extra_data: dict[str, Any] | None = None,
) -> SalesOrder:
    """
    Create one draft sales order from an accepted quotation.

    Rules:
    - quotation must belong to the current company
    - quotation must be accepted
    - quotation must contain lines
    - one quotation can create only one sales order
    - customer, branch, prices, taxes, and snapshots are copied safely
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not quotation:
        raise ValidationError(
            {"quotation": "Sales quotation is required."}
        )

    quotation = (
        SalesQuotation.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "customer",
        )
        .filter(
            id=quotation.id,
            company=company,
        )
        .first()
    )

    if not quotation:
        raise ValidationError(
            {
                "quotation":
                "Quotation does not belong to this company."
            }
        )

    if quotation.status != SalesQuotationStatus.ACCEPTED:
        raise ValidationError(
            {
                "quotation":
                "Only accepted quotations can create sales orders."
            }
        )

    if not quotation.customer_id:
        raise ValidationError(
            {
                "customer":
                "Accepted quotation must have a customer."
            }
        )

    if not quotation.items.exists():
        raise ValidationError(
            {
                "items":
                "Quotation cannot be converted without items."
            }
        )

    if SalesOrder.objects.filter(
        source_quotation=quotation,
    ).exists():
        raise ValidationError(
            {
                "quotation":
                "This quotation has already been converted to a sales order."
            }
        )

    normalized_order_date = normalize_invoice_date(
        order_date,
        field_name="order_date",
        default_today=True,
    )

    normalized_delivery_date = normalize_invoice_date(
        expected_delivery_date,
        field_name="expected_delivery_date",
        default_today=False,
    )

    if (
        normalized_delivery_date
        and normalized_delivery_date < normalized_order_date
    ):
        raise ValidationError(
            {
                "expected_delivery_date":
                "Expected delivery date cannot be before order date."
            }
        )

    actor = (
        user
        if getattr(user, "is_authenticated", False)
        else None
    )

    order = SalesOrder(
        company=company,
        branch=quotation.branch,
        customer=quotation.customer,
        source_quotation=quotation,
        order_number=generate_order_number(
            company,
            order_date=normalized_order_date,
        ),
        status=SalesOrderStatus.DRAFT,
        source=SalesOrderSource.QUOTATION,
        order_date=normalized_order_date,
        expected_delivery_date=normalized_delivery_date,
        public_notes=(
            normalize_text(public_notes)
            if public_notes is not None
            else quotation.public_notes
        ),
        internal_notes=(
            normalize_text(internal_notes)
            if internal_notes is not None
            else quotation.internal_notes
        ),
        currency_code=(
            normalize_text(quotation.currency_code)
            or normalize_text(company.currency_code)
            or "SAR"
        ),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )

    order.full_clean()
    order.save()
    order.refresh_snapshots(save=True)

    quotation_items = (
        quotation.items
        .select_related(
            "catalog_item",
            "catalog_item__unit",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    for source_item in quotation_items:
        order_item = SalesOrderItem(
            order=order,
            company=company,
            catalog_item=source_item.catalog_item,
            source_quotation_item=source_item,
            line_number=source_item.line_number,
            item_code_snapshot=(
                source_item.item_code_snapshot
            ),
            item_name_snapshot=(
                source_item.item_name_snapshot
            ),
            item_description_snapshot=(
                source_item.item_description_snapshot
            ),
            unit_name_snapshot=(
                source_item.unit_name_snapshot
            ),
            quantity=source_item.quantity,
            unit_price=source_item.unit_price,
            discount_amount=(
                source_item.discount_amount
            ),
            taxable=source_item.taxable,
            tax_rate=source_item.tax_rate,
            notes=source_item.notes,
            extra_data=dict(
                source_item.extra_data or {}
            ),
        )

        order_item.full_clean()
        order_item.save()

    order.recalculate_totals(save=True)
    order.refresh_snapshots(save=True)
    order.refresh_from_db()

    return order


@transaction.atomic
def confirm_sales_order(
    *,
    company: Company,
    order: SalesOrder,
    user=None,
) -> SalesOrder:
    """
    Confirm a draft sales order.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not order:
        raise ValidationError(
            {"order": "Sales order is required."}
        )

    if order.company_id != company.id:
        raise ValidationError(
            {
                "order":
                "Sales order does not belong to this company."
            }
        )

    order.recalculate_totals(save=True)
    order.confirm(user=user)
    order.refresh_from_db()

    return order


@transaction.atomic
def start_processing_sales_order(
    *,
    company: Company,
    order: SalesOrder,
    user=None,
) -> SalesOrder:
    """
    Move a confirmed sales order into processing.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not order:
        raise ValidationError(
            {"order": "Sales order is required."}
        )

    if order.company_id != company.id:
        raise ValidationError(
            {
                "order":
                "Sales order does not belong to this company."
            }
        )

    order.start_processing(user=user)
    order.refresh_from_db()

    return order


@transaction.atomic
def complete_sales_order(
    *,
    company: Company,
    order: SalesOrder,
    user=None,
) -> SalesOrder:
    """
    Complete a processing sales order.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not order:
        raise ValidationError(
            {"order": "Sales order is required."}
        )

    if order.company_id != company.id:
        raise ValidationError(
            {
                "order":
                "Sales order does not belong to this company."
            }
        )

    order.complete(user=user)
    order.refresh_from_db()

    return order


@transaction.atomic
def cancel_sales_order(
    *,
    company: Company,
    order: SalesOrder,
    reason: str = "",
    user=None,
) -> SalesOrder:
    """
    Cancel a draft, confirmed, or processing sales order.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not order:
        raise ValidationError(
            {"order": "Sales order is required."}
        )

    if order.company_id != company.id:
        raise ValidationError(
            {
                "order":
                "Sales order does not belong to this company."
            }
        )

    order.cancel(
        reason=reason,
        user=user,
    )
    order.refresh_from_db()

    return order


def serialize_order_item(
    item: SalesOrderItem,
) -> dict[str, Any]:
    """
    Serialize one sales order line for APIs.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "catalog_item_id": item.catalog_item_id,
        "source_quotation_item_id": (
            item.source_quotation_item_id
        ),
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "description": (
            item.item_description_snapshot
        ),
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "invoiced_quantity": str(
            item.invoiced_quantity
        ),
        "remaining_quantity": str(
            item.remaining_quantity
        ),
        "unit_price": str(item.unit_price),
        "line_subtotal": str(item.line_subtotal),
        "discount_amount": str(
            item.discount_amount
        ),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "taxable_amount": str(
            item.taxable_amount
        ),
        "tax_amount": str(item.tax_amount),
        "line_total": str(item.line_total),
        "notes": item.notes,
        "extra_data": item.extra_data,
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        ),
        "updated_at": (
            item.updated_at.isoformat()
            if item.updated_at
            else None
        ),
    }


def serialize_sales_order(
    order: SalesOrder,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize a sales order for APIs.
    """
    data = {
        "id": order.id,
        "company_id": order.company_id,
        "branch": (
            {
                "id": order.branch_id,
                "name": order.branch.display_name,
                "code": order.branch.branch_code,
            }
            if order.branch_id
            else None
        ),
        "customer": (
            {
                "id": order.customer_id,
                "display_name": (
                    order.customer.display_name
                ),
                "code": order.customer.code,
                "phone": order.customer.phone,
                "mobile": order.customer.mobile,
                "vat_number": order.customer.vat_number,
            }
            if order.customer_id
            else None
        ),
        "source_quotation": (
            {
                "id": order.source_quotation_id,
                "quotation_number": (
                    order.source_quotation.quotation_number
                ),
                "status": order.source_quotation.status,
                "quotation_date": (
                    order.source_quotation
                    .quotation_date.isoformat()
                    if order.source_quotation.quotation_date
                    else None
                ),
                "total_amount": str(
                    order.source_quotation.total_amount
                ),
            }
            if order.source_quotation_id
            else None
        ),
        "order_number": order.order_number,
        "status": order.status,
        "billing_status": order.billing_status,
        "invoiced_amount": str(
            order.invoiced_amount
        ),
        "remaining_invoice_amount": str(
            order.remaining_invoice_amount
        ),
        "source": order.source,
        "order_date": (
            order.order_date.isoformat()
            if order.order_date
            else None
        ),
        "expected_delivery_date": (
            order.expected_delivery_date.isoformat()
            if order.expected_delivery_date
            else None
        ),
        "confirmed_at": (
            order.confirmed_at.isoformat()
            if order.confirmed_at
            else None
        ),
        "processing_at": (
            order.processing_at.isoformat()
            if order.processing_at
            else None
        ),
        "completed_at": (
            order.completed_at.isoformat()
            if order.completed_at
            else None
        ),
        "cancelled_at": (
            order.cancelled_at.isoformat()
            if order.cancelled_at
            else None
        ),
        "cancelled_reason": order.cancelled_reason,
        "subtotal": str(order.subtotal),
        "discount_amount": str(
            order.discount_amount
        ),
        "taxable_amount": str(
            order.taxable_amount
        ),
        "tax_amount": str(order.tax_amount),
        "total_amount": str(order.total_amount),
        "currency_code": order.currency_code,
        "customer_snapshot": order.customer_snapshot,
        "billing_address_snapshot": (
            order.billing_address_snapshot
        ),
        "tax_snapshot": order.tax_snapshot,
        "quotation_snapshot": (
            order.quotation_snapshot
        ),
        "public_notes": order.public_notes,
        "internal_notes": order.internal_notes,
        "extra_data": order.extra_data,
        "can_be_edited": order.can_be_edited,
        "can_be_confirmed": (
            order.can_be_confirmed
        ),
        "can_start_processing": (
            order.can_start_processing
        ),
        "can_be_completed": (
            order.can_be_completed
        ),
        "can_be_cancelled": (
            order.can_be_cancelled
        ),
        "can_be_invoiced": order.can_be_invoiced,
        "generated_invoices_count": (
            order.generated_invoices.count()
        ),
        "created_at": (
            order.created_at.isoformat()
            if order.created_at
            else None
        ),
        "updated_at": (
            order.updated_at.isoformat()
            if order.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            serialize_order_item(item)
            for item in order.items.select_related(
                "catalog_item",
                "source_quotation_item",
            ).order_by(
                "line_number",
                "id",
            )
        ]

    return data


# End Phase 21.2 - Sales Orders Services Foundation
# ============================================================

# ============================================================
# Phase 21.3 - Sales Order Fulfillment & Invoice Conversion Services
# ============================================================


def normalize_order_invoice_items(
    *,
    order: SalesOrder,
    items: list[dict[str, Any]] | None,
) -> list[tuple[SalesOrderItem, Decimal]]:
    """
    Resolve requested sales-order quantities for invoicing.

    When items is omitted, every remaining order quantity is selected.
    """
    order_items = list(
        SalesOrderItem.objects
        .select_for_update()
        .select_related(
            "catalog_item",
            "catalog_item__unit",
        )
        .filter(order=order)
        .order_by(
            "line_number",
            "id",
        )
    )

    if not order_items:
        raise ValidationError(
            {
                "items":
                "Sales order cannot be invoiced without items."
            }
        )

    for order_item in order_items:
        order_item.refresh_invoicing_quantities(
            save=True
        )

    order_items_by_id = {
        item.id: item
        for item in order_items
    }

    if items is None:
        selected = []

        for order_item in order_items:
            remaining = quantize_quantity(
                order_item.remaining_quantity
            )

            if remaining > Decimal("0.0000"):
                selected.append(
                    (order_item, remaining)
                )

        if not selected:
            raise ValidationError(
                {
                    "items":
                    "Sales order is already fully invoiced."
                }
            )

        return selected

    if not isinstance(items, list) or not items:
        raise ValidationError(
            {
                "items":
                "At least one order item is required."
            }
        )

    selected = []
    seen_ids = set()

    for raw_item in items:
        if not isinstance(raw_item, dict):
            raise ValidationError(
                {
                    "items":
                    "Each invoice item must be an object."
                }
            )

        order_item_id = (
            raw_item.get("order_item_id")
            or raw_item.get("sales_order_item_id")
            or raw_item.get("source_order_item_id")
        )

        if not order_item_id:
            raise ValidationError(
                {
                    "order_item_id":
                    "Sales order item is required."
                }
            )

        try:
            normalized_order_item_id = int(
                order_item_id
            )
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                {
                    "order_item_id":
                    "Invalid sales order item."
                }
            ) from exc

        if normalized_order_item_id in seen_ids:
            raise ValidationError(
                {
                    "items":
                    "A sales order item cannot appear "
                    "more than once in the same invoice."
                }
            )

        seen_ids.add(normalized_order_item_id)

        order_item = order_items_by_id.get(
            normalized_order_item_id
        )

        if not order_item:
            raise ValidationError(
                {
                    "order_item_id":
                    "Sales order item was not found "
                    "inside this order."
                }
            )

        quantity = quantize_quantity(
            raw_item.get("quantity")
        )

        if quantity <= Decimal("0.0000"):
            raise ValidationError(
                {
                    "quantity":
                    "Invoice quantity must be greater than zero."
                }
            )

        remaining = quantize_quantity(
            order_item.remaining_quantity
        )

        if quantity > remaining:
            raise ValidationError(
                {
                    "quantity":
                    "Invoice quantity cannot exceed "
                    "the remaining sales order quantity."
                }
            )

        selected.append(
            (order_item, quantity)
        )

    return selected


def prorate_order_item_discount(
    *,
    order_item: SalesOrderItem,
    invoice_quantity: Decimal,
) -> Decimal:
    """
    Prorate the order-line discount for partial invoicing.
    """
    ordered_quantity = quantize_quantity(
        order_item.quantity
    )

    if (
        ordered_quantity <= Decimal("0.0000")
        or order_item.discount_amount <= MONEY_ZERO
    ):
        return MONEY_ZERO

    ratio = (
        invoice_quantity
        / ordered_quantity
    )

    return quantize_money(
        order_item.discount_amount * ratio
    )


@transaction.atomic
def create_sales_invoice_from_order(
    *,
    company: Company,
    order: SalesOrder,
    user=None,
    invoice_date=None,
    due_date=None,
    items: list[dict[str, Any]] | None = None,
    issue_now: bool = False,
    public_notes: str | None = None,
    internal_notes: str | None = None,
    extra_data: dict[str, Any] | None = None,
) -> SalesInvoice:
    """
    Create a full or partial sales invoice from a sales order.

    When items is omitted, all remaining quantities are invoiced.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if not order:
        raise ValidationError(
            {"order": "Sales order is required."}
        )

    locked_order = (
        SalesOrder.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "customer",
        )
        .filter(
            id=order.id,
            company=company,
        )
        .first()
    )

    if not locked_order:
        raise ValidationError(
            {
                "order":
                "Sales order does not belong to this company."
            }
        )

    locked_order.refresh_invoice_progress(
        save=True
    )
    locked_order.refresh_from_db()

    if locked_order.status in [
        SalesOrderStatus.DRAFT,
        SalesOrderStatus.CANCELLED,
    ]:
        raise ValidationError(
            {
                "status":
                "Only confirmed, processing, or completed "
                "sales orders can be invoiced."
            }
        )

    if not locked_order.customer_id:
        raise ValidationError(
            {
                "customer":
                "Sales order customer is required."
            }
        )

    if (
        locked_order.billing_status
        == SalesOrderBillingStatus.FULL
    ):
        raise ValidationError(
            {
                "billing_status":
                "Sales order is already fully invoiced."
            }
        )

    selected_items = normalize_order_invoice_items(
        order=locked_order,
        items=items,
    )

    normalized_invoice_date = normalize_invoice_date(
        invoice_date,
        field_name="invoice_date",
        default_today=True,
    )

    normalized_due_date = normalize_invoice_date(
        due_date,
        field_name="due_date",
        default_today=False,
    )

    if (
        normalized_due_date
        and normalized_due_date
        < normalized_invoice_date
    ):
        raise ValidationError(
            {
                "due_date":
                "Due date cannot be before invoice date."
            }
        )

    actor = (
        user
        if getattr(user, "is_authenticated", False)
        else None
    )

    invoice = SalesInvoice(
        company=company,
        branch=locked_order.branch,
        customer=locked_order.customer,
        source_order=locked_order,
        invoice_number=generate_invoice_number(
            company,
            invoice_date=normalized_invoice_date,
        ),
        status=SalesInvoiceStatus.DRAFT,
        source=SalesInvoiceSource.SALES_ORDER,
        invoice_date=normalized_invoice_date,
        due_date=normalized_due_date,
        public_notes=(
            normalize_text(public_notes)
            if public_notes is not None
            else locked_order.public_notes
        ),
        internal_notes=(
            normalize_text(internal_notes)
            if internal_notes is not None
            else locked_order.internal_notes
        ),
        currency_code=(
            normalize_text(locked_order.currency_code)
            or normalize_text(company.currency_code)
            or "SAR"
        ),
        extra_data={
            **dict(extra_data or {}),
            "source_order_id": locked_order.id,
            "source_order_number": (
                locked_order.order_number
            ),
        },
        created_by=actor,
        updated_by=actor,
    )

    invoice.full_clean()
    invoice.save()
    invoice.refresh_snapshots(save=True)

    for line_number, (
        order_item,
        invoice_quantity,
    ) in enumerate(
        selected_items,
        start=1,
    ):
        invoice_item = SalesInvoiceItem(
            invoice=invoice,
            company=company,
            catalog_item=order_item.catalog_item,
            source_order_item=order_item,
            line_number=line_number,
            item_code_snapshot=(
                order_item.item_code_snapshot
            ),
            item_name_snapshot=(
                order_item.item_name_snapshot
            ),
            item_description_snapshot=(
                order_item.item_description_snapshot
            ),
            unit_name_snapshot=(
                order_item.unit_name_snapshot
            ),
            quantity=invoice_quantity,
            unit_price=order_item.unit_price,
            discount_amount=(
                prorate_order_item_discount(
                    order_item=order_item,
                    invoice_quantity=invoice_quantity,
                )
            ),
            taxable=order_item.taxable,
            tax_rate=order_item.tax_rate,
            notes=order_item.notes,
            extra_data={
                **dict(order_item.extra_data or {}),
                "source_order_item_id": (
                    order_item.id
                ),
                "source_order_line_number": (
                    order_item.line_number
                ),
            },
        )

        invoice_item.full_clean()
        invoice_item.save()

    invoice.recalculate_totals(save=True)
    locked_order.refresh_invoice_progress(
        save=True
    )

    if issue_now:
        invoice = issue_sales_invoice(
            company=company,
            invoice=invoice,
            user=user,
        )

    invoice.refresh_from_db()
    locked_order.refresh_from_db()

    return invoice


def serialize_order_invoice_summary(
    order: SalesOrder,
) -> dict[str, Any]:
    """
    Serialize invoice fulfillment data for a sales order.
    """
    order.refresh_invoice_progress(save=True)
    order.refresh_from_db()

    invoices = (
        order.generated_invoices
        .select_related(
            "customer",
            "branch",
        )
        .order_by(
            "invoice_date",
            "id",
        )
    )

    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "billing_status": order.billing_status,
        "total_amount": str(order.total_amount),
        "invoiced_amount": str(
            order.invoiced_amount
        ),
        "remaining_invoice_amount": str(
            order.remaining_invoice_amount
        ),
        "can_be_invoiced": order.can_be_invoiced,
        "invoices_count": invoices.count(),
        "invoices": [
            serialize_sales_invoice(
                invoice,
                include_items=True,
            )
            for invoice in invoices
        ],
    }


# End Phase 21.3 - Sales Order Fulfillment & Invoice Conversion Services
# ============================================================


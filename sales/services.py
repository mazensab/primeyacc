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
from django.db import models, transaction
from django.utils import timezone

from accounting.services import (
    AccountingServiceError,
    post_sales_invoice_to_accounting,
    post_sales_credit_note_to_accounting,

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
    SalesCreditNote,
    SalesCreditNoteItem,
    SalesCreditNoteStatus,
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
    SalesReturn,
    SalesReturnItem,
    SalesReturnReason,
    SalesReturnStatus,
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

# ============================================================
# Phase 21.4.2 - Sales Returns Services Foundation
# ------------------------------------------------------------
# Company-scoped sales return creation and lifecycle services.
# Partial and full invoice returns.
# Quantity and tenant validation.
# Return serialization and invoice return summary.
# Inventory, accounting, and credit notes are added later.
# ============================================================


def generate_sales_return_number(
    company: Company,
    return_date=None,
) -> str:
    """
    Generate a company-scoped sales return number.

    Format:
        SR-YYYY-000001
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    normalized_return_date = (
        normalize_invoice_date(
            return_date,
            field_name="return_date",
            default_today=True,
        )
    )

    year = normalized_return_date.year
    prefix = "SR"
    starts_with = f"{prefix}-{year}-"

    last_return = (
        SalesReturn.objects
        .filter(
            company=company,
            return_number__startswith=(
                starts_with
            ),
        )
        .order_by(
            "-return_number",
            "-id",
        )
        .first()
    )

    next_number = 1

    if (
        last_return
        and last_return.return_number
    ):
        try:
            next_number = (
                int(
                    last_return.return_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = (
                last_return.id + 1
            )

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def resolve_sales_return_invoice(
    *,
    company: Company,
    invoice_id: int | str | None,
    lock: bool = False,
) -> SalesInvoice:
    """
    Resolve an issued sales invoice inside the company.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not invoice_id:
        raise ValidationError(
            {
                "invoice":
                "Sales invoice is required."
            }
        )

    queryset = (
        SalesInvoice.objects
        .select_related(
            "company",
            "branch",
            "customer",
        )
        .filter(
            company=company,
            id=invoice_id,
        )
    )

    if lock:
        queryset = (
            queryset.select_for_update()
        )

    invoice = queryset.first()

    if not invoice:
        raise ValidationError(
            {
                "invoice":
                "Sales invoice was not found "
                "for this company."
            }
        )

    if (
        invoice.status
        != SalesInvoiceStatus.ISSUED
    ):
        raise ValidationError(
            {
                "invoice":
                "Only issued sales invoices "
                "can be returned."
            }
        )

    return invoice


def resolve_sales_return_invoice_item(
    *,
    company: Company,
    invoice: SalesInvoice,
    invoice_item_id: int | str | None,
    lock: bool = False,
) -> SalesInvoiceItem:
    """
    Resolve one invoice item inside the selected invoice.
    """
    if not invoice_item_id:
        raise ValidationError(
            {
                "invoice_item":
                "Sales invoice item is required."
            }
        )

    queryset = (
        SalesInvoiceItem.objects
        .select_related(
            "invoice",
            "catalog_item",
            "catalog_item__unit",
        )
        .filter(
            company=company,
            invoice=invoice,
            id=invoice_item_id,
        )
    )

    if lock:
        queryset = (
            queryset.select_for_update()
        )

    invoice_item = queryset.first()

    if not invoice_item:
        raise ValidationError(
            {
                "invoice_item":
                "Sales invoice item was not found "
                "inside this invoice."
            }
        )

    return invoice_item


def normalize_sales_return_items(
    *,
    company: Company,
    invoice: SalesInvoice,
    items: list[dict[str, Any]] | None,
) -> list[
    tuple[
        SalesInvoiceItem,
        Decimal,
        bool,
        str,
        str,
        dict[str, Any],
    ]
]:
    """
    Normalize requested return lines.

    When items is omitted, all remaining invoice quantities
    are selected for a full return.
    """
    invoice_items = list(
        SalesInvoiceItem.objects
        .select_for_update()
        .select_related(
            "invoice",
            "catalog_item",
            "catalog_item__unit",
        )
        .filter(
            company=company,
            invoice=invoice,
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not invoice_items:
        raise ValidationError(
            {
                "items":
                "Sales invoice has no items "
                "available for return."
            }
        )

    invoice_items_by_id = {
        item.id: item
        for item in invoice_items
    }

    if items is None:
        selected_items = []

        for invoice_item in invoice_items:
            remaining_quantity = (
                quantize_quantity(
                    invoice_item
                    .returnable_quantity
                )
            )

            if (
                remaining_quantity
                > Decimal("0.0000")
            ):
                selected_items.append(
                    (
                        invoice_item,
                        remaining_quantity,
                        True,
                        "",
                        "",
                        {},
                    )
                )

        if not selected_items:
            raise ValidationError(
                {
                    "items":
                    "Sales invoice is already "
                    "fully returned."
                }
            )

        return selected_items

    if (
        not isinstance(items, list)
        or not items
    ):
        raise ValidationError(
            {
                "items":
                "At least one return item "
                "is required."
            }
        )

    selected_items = []
    seen_invoice_item_ids = set()

    for raw_item in items:
        if not isinstance(raw_item, dict):
            raise ValidationError(
                {
                    "items":
                    "Each return item must "
                    "be an object."
                }
            )

        invoice_item_id = (
            raw_item.get("invoice_item_id")
            or raw_item.get(
                "sales_invoice_item_id"
            )
            or raw_item.get(
                "source_invoice_item_id"
            )
        )

        if not invoice_item_id:
            raise ValidationError(
                {
                    "invoice_item_id":
                    "Sales invoice item "
                    "is required."
                }
            )

        try:
            normalized_item_id = int(
                invoice_item_id
            )
        except (
            TypeError,
            ValueError,
        ) as exc:
            raise ValidationError(
                {
                    "invoice_item_id":
                    "Invalid sales invoice item."
                }
            ) from exc

        if (
            normalized_item_id
            in seen_invoice_item_ids
        ):
            raise ValidationError(
                {
                    "items":
                    "A sales invoice item cannot "
                    "appear more than once "
                    "in the same return."
                }
            )

        seen_invoice_item_ids.add(
            normalized_item_id
        )

        invoice_item = (
            invoice_items_by_id.get(
                normalized_item_id
            )
        )

        if not invoice_item:
            raise ValidationError(
                {
                    "invoice_item_id":
                    "Sales invoice item was not "
                    "found inside this invoice."
                }
            )

        quantity = quantize_quantity(
            raw_item.get("quantity")
        )

        if quantity <= Decimal("0.0000"):
            raise ValidationError(
                {
                    "quantity":
                    "Returned quantity must "
                    "be greater than zero."
                }
            )

        returnable_quantity = (
            quantize_quantity(
                invoice_item
                .returnable_quantity
            )
        )

        if quantity > returnable_quantity:
            raise ValidationError(
                {
                    "quantity":
                    "Returned quantity cannot exceed "
                    "the remaining invoice quantity."
                }
            )

        selected_items.append(
            (
                invoice_item,
                quantity,
                bool(
                    raw_item.get(
                        "restock",
                        True,
                    )
                ),
                normalize_text(
                    raw_item.get(
                        "condition_notes"
                    )
                ),
                normalize_text(
                    raw_item.get("notes")
                ),
                (
                    raw_item.get("extra_data")
                    if isinstance(
                        raw_item.get(
                            "extra_data"
                        ),
                        dict,
                    )
                    else {}
                ),
            )
        )

    return selected_items


@transaction.atomic
def create_sales_return(
    *,
    company: Company,
    invoice: SalesInvoice | None = None,
    invoice_id: int | str | None = None,
    user=None,
    return_date=None,
    reason: str = (
        SalesReturnReason.CUSTOMER_REQUEST
    ),
    reason_details: str = "",
    public_notes: str = "",
    internal_notes: str = "",
    items: list[dict[str, Any]] | None = None,
    extra_data: dict[str, Any] | None = None,
) -> SalesReturn:
    """
    Create a draft partial or full sales return.

    Passing items=None creates a full return for all remaining
    quantities on the invoice.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    selected_invoice_id = (
        invoice.id
        if invoice is not None
        else invoice_id
    )

    locked_invoice = (
        resolve_sales_return_invoice(
            company=company,
            invoice_id=selected_invoice_id,
            lock=True,
        )
    )

    normalized_return_date = (
        normalize_invoice_date(
            return_date,
            field_name="return_date",
            default_today=True,
        )
    )

    if (
        normalized_return_date
        < locked_invoice.invoice_date
    ):
        raise ValidationError(
            {
                "return_date":
                "Return date cannot be before "
                "invoice date."
            }
        )

    selected_items = (
        normalize_sales_return_items(
            company=company,
            invoice=locked_invoice,
            items=items,
        )
    )

    actor = (
        user
        if getattr(
            user,
            "is_authenticated",
            False,
        )
        else None
    )

    sales_return = SalesReturn(
        company=company,
        branch=locked_invoice.branch,
        customer=locked_invoice.customer,
        invoice=locked_invoice,
        return_number=(
            generate_sales_return_number(
                company,
                return_date=(
                    normalized_return_date
                ),
            )
        ),
        status=SalesReturnStatus.DRAFT,
        reason=(
            reason
            or SalesReturnReason
            .CUSTOMER_REQUEST
        ),
        reason_details=normalize_text(
            reason_details
        ),
        return_date=normalized_return_date,
        currency_code=(
            normalize_text(
                locked_invoice.currency_code
            )
            or normalize_text(
                company.currency_code
            )
            or "SAR"
        ),
        public_notes=normalize_text(
            public_notes
        ),
        internal_notes=normalize_text(
            internal_notes
        ),
        extra_data={
            **dict(extra_data or {}),
            "source_invoice_id": (
                locked_invoice.id
            ),
            "source_invoice_number": (
                locked_invoice.invoice_number
            ),
        },
        created_by=actor,
        updated_by=actor,
    )

    sales_return.full_clean()
    sales_return.save()
    sales_return.refresh_snapshots(
        save=True
    )

    for line_number, (
        invoice_item,
        quantity,
        restock,
        condition_notes,
        notes,
        item_extra_data,
    ) in enumerate(
        selected_items,
        start=1,
    ):
        return_item = SalesReturnItem(
            sales_return=sales_return,
            company=company,
            invoice_item=invoice_item,
            catalog_item=(
                invoice_item.catalog_item
            ),
            line_number=line_number,
            quantity=quantity,
            restock=restock,
            condition_notes=(
                condition_notes
            ),
            notes=notes,
            extra_data={
                **dict(item_extra_data or {}),
                "source_invoice_item_id": (
                    invoice_item.id
                ),
                "source_invoice_line_number": (
                    invoice_item.line_number
                ),
            },
        )

        return_item.apply_invoice_item_snapshot()
        return_item.full_clean()
        return_item.save()

    sales_return.recalculate_totals(
        save=True
    )
    sales_return.refresh_from_db()

    return sales_return


@transaction.atomic
def confirm_sales_return(
    *,
    company: Company,
    sales_return: SalesReturn,
    user=None,
) -> SalesReturn:
    """
    Confirm a draft sales return.

    Confirmation consumes invoice returnable quantities.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not sales_return:
        raise ValidationError(
            {
                "sales_return":
                "Sales return is required."
            }
        )

    locked_return = (
        SalesReturn.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "customer",
            "invoice",
        )
        .filter(
            id=sales_return.id,
            company=company,
        )
        .first()
    )

    if not locked_return:
        raise ValidationError(
            {
                "sales_return":
                "Sales return does not belong "
                "to this company."
            }
        )

    locked_return.recalculate_totals(
        save=True
    )
    locked_return.confirm(
        user=user
    )
    locked_return.refresh_from_db()

    return locked_return


@transaction.atomic
def cancel_sales_return(
    *,
    company: Company,
    sales_return: SalesReturn,
    reason: str = "",
    user=None,
) -> SalesReturn:
    """
    Cancel a draft or confirmed sales return.

    Posted returns require a dedicated reversal process.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not sales_return:
        raise ValidationError(
            {
                "sales_return":
                "Sales return is required."
            }
        )

    locked_return = (
        SalesReturn.objects
        .select_for_update()
        .filter(
            id=sales_return.id,
            company=company,
        )
        .first()
    )

    if not locked_return:
        raise ValidationError(
            {
                "sales_return":
                "Sales return does not belong "
                "to this company."
            }
        )

    locked_return.cancel(
        reason=reason,
        user=user,
    )
    locked_return.refresh_from_db()

    return locked_return


def serialize_sales_return_item(
    item: SalesReturnItem,
) -> dict[str, Any]:
    """
    Serialize one sales return line.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "invoice_item_id": (
            item.invoice_item_id
        ),
        "catalog_item_id": (
            item.catalog_item_id
        ),
        "item_code": (
            item.item_code_snapshot
        ),
        "item_name": (
            item.item_name_snapshot
        ),
        "description": (
            item
            .item_description_snapshot
        ),
        "unit_name": (
            item.unit_name_snapshot
        ),
        "quantity": str(item.quantity),
        "unit_price": str(
            item.unit_price
        ),
        "line_subtotal": str(
            item.line_subtotal
        ),
        "discount_amount": str(
            item.discount_amount
        ),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "taxable_amount": str(
            item.taxable_amount
        ),
        "tax_amount": str(
            item.tax_amount
        ),
        "line_total": str(
            item.line_total
        ),
        "restock": item.restock,
        "condition_notes": (
            item.condition_notes
        ),
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


def serialize_sales_return(
    sales_return: SalesReturn,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize a sales return for company APIs.
    """
    data = {
        "id": sales_return.id,
        "company_id": (
            sales_return.company_id
        ),
        "branch": (
            {
                "id": sales_return.branch_id,
                "name": (
                    sales_return
                    .branch
                    .display_name
                ),
                "code": (
                    sales_return
                    .branch
                    .branch_code
                ),
            }
            if sales_return.branch_id
            else None
        ),
        "customer": (
            {
                "id": (
                    sales_return.customer_id
                ),
                "display_name": (
                    sales_return
                    .customer
                    .display_name
                ),
                "code": (
                    sales_return
                    .customer
                    .code
                ),
                "phone": (
                    sales_return
                    .customer
                    .phone
                ),
                "mobile": (
                    sales_return
                    .customer
                    .mobile
                ),
                "vat_number": (
                    sales_return
                    .customer
                    .vat_number
                ),
            }
            if sales_return.customer_id
            else None
        ),
        "invoice": {
            "id": sales_return.invoice_id,
            "invoice_number": (
                sales_return
                .invoice
                .invoice_number
            ),
            "invoice_date": (
                sales_return
                .invoice
                .invoice_date
                .isoformat()
                if (
                    sales_return
                    .invoice
                    .invoice_date
                )
                else None
            ),
            "status": (
                sales_return
                .invoice
                .status
            ),
            "payment_status": (
                sales_return
                .invoice
                .payment_status
            ),
            "total_amount": str(
                sales_return
                .invoice
                .total_amount
            ),
        },
        "return_number": (
            sales_return.return_number
        ),
        "status": sales_return.status,
        "reason": sales_return.reason,
        "reason_details": (
            sales_return.reason_details
        ),
        "return_date": (
            sales_return
            .return_date
            .isoformat()
            if sales_return.return_date
            else None
        ),
        "confirmed_at": (
            sales_return
            .confirmed_at
            .isoformat()
            if sales_return.confirmed_at
            else None
        ),
        "posted_at": (
            sales_return
            .posted_at
            .isoformat()
            if sales_return.posted_at
            else None
        ),
        "cancelled_at": (
            sales_return
            .cancelled_at
            .isoformat()
            if sales_return.cancelled_at
            else None
        ),
        "cancelled_reason": (
            sales_return
            .cancelled_reason
        ),
        "subtotal": str(
            sales_return.subtotal
        ),
        "discount_amount": str(
            sales_return.discount_amount
        ),
        "taxable_amount": str(
            sales_return.taxable_amount
        ),
        "tax_amount": str(
            sales_return.tax_amount
        ),
        "total_amount": str(
            sales_return.total_amount
        ),
        "currency_code": (
            sales_return.currency_code
        ),
        "customer_snapshot": (
            sales_return
            .customer_snapshot
        ),
        "invoice_snapshot": (
            sales_return
            .invoice_snapshot
        ),
        "tax_snapshot": (
            sales_return.tax_snapshot
        ),
        "public_notes": (
            sales_return.public_notes
        ),
        "internal_notes": (
            sales_return.internal_notes
        ),
        "extra_data": (
            sales_return.extra_data
        ),
        "can_be_edited": (
            sales_return.can_be_edited
        ),
        "can_be_confirmed": (
            sales_return
            .can_be_confirmed
        ),
        "can_be_posted": (
            sales_return.can_be_posted
        ),
        "can_be_cancelled": (
            sales_return
            .can_be_cancelled
        ),
        "created_at": (
            sales_return
            .created_at
            .isoformat()
            if sales_return.created_at
            else None
        ),
        "updated_at": (
            sales_return
            .updated_at
            .isoformat()
            if sales_return.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            serialize_sales_return_item(
                item
            )
            for item in (
                sales_return.items
                .select_related(
                    "invoice_item",
                    "catalog_item",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return data


def serialize_invoice_return_summary(
    invoice: SalesInvoice,
) -> dict[str, Any]:
    """
    Serialize return progress for one sales invoice.
    """
    invoice_items = list(
        invoice.items
        .select_related(
            "catalog_item"
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    active_returns = (
        invoice.sales_returns
        .exclude(
            status=(
                SalesReturnStatus.CANCELLED
            )
        )
        .select_related(
            "customer",
            "branch",
        )
        .order_by(
            "return_date",
            "id",
        )
    )

    confirmed_or_posted = (
        active_returns.filter(
            status__in=[
                SalesReturnStatus.CONFIRMED,
                SalesReturnStatus.POSTED,
            ]
        )
    )

    total_returned_amount = (
        confirmed_or_posted
        .aggregate(
            total=models.Sum(
                "total_amount"
            )
        )
        .get("total")
        or MONEY_ZERO
    )

    return {
        "invoice_id": invoice.id,
        "invoice_number": (
            invoice.invoice_number
        ),
        "invoice_status": (
            invoice.status
        ),
        "invoice_total_amount": str(
            invoice.total_amount
        ),
        "returned_amount": str(
            quantize_money(
                total_returned_amount
            )
        ),
        "net_amount": str(
            max(
                quantize_money(
                    invoice.total_amount
                    - total_returned_amount
                ),
                MONEY_ZERO,
            )
        ),
        "returns_count": (
            active_returns.count()
        ),
        "items": [
            {
                "invoice_item_id": (
                    item.id
                ),
                "line_number": (
                    item.line_number
                ),
                "item_name": (
                    item.item_name_snapshot
                ),
                "invoiced_quantity": str(
                    item.quantity
                ),
                "returned_quantity": str(
                    item.returned_quantity
                ),
                "returnable_quantity": str(
                    item.returnable_quantity
                ),
            }
            for item in invoice_items
        ],
        "returns": [
            serialize_sales_return(
                sales_return,
                include_items=True,
            )
            for sales_return in active_returns
        ],
    }


# End Phase 21.4.2 - Sales Returns Services Foundation
# ============================================================


# ============================================================
# Phase 21.5.2 - Sales Credit Notes Services Foundation
# ------------------------------------------------------------
# Company-scoped credit note creation from confirmed returns.
# Immutable commercial values copied from return items.
# Issue and cancel lifecycle services.
# API serializers.
# Accounting posting and POSTED transition remain deferred.
# ============================================================


def generate_sales_credit_note_number(
    company: Company,
    credit_note_date=None,
) -> str:
    """
    Generate a company-scoped sales credit note number.

    Format:
        SCN-YYYY-000001
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    normalized_date = normalize_invoice_date(
        credit_note_date,
        field_name="credit_note_date",
        default_today=True,
    )

    year = normalized_date.year
    prefix = "SCN"
    starts_with = f"{prefix}-{year}-"

    last_credit_note = (
        SalesCreditNote.objects
        .filter(
            company=company,
            credit_note_number__startswith=(
                starts_with
            ),
        )
        .order_by(
            "-credit_note_number",
            "-id",
        )
        .first()
    )

    next_number = 1

    if (
        last_credit_note
        and last_credit_note.credit_note_number
    ):
        try:
            next_number = (
                int(
                    last_credit_note
                    .credit_note_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = (
                last_credit_note.id + 1
            )

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def resolve_sales_credit_note_return(
    *,
    company: Company,
    sales_return_id: int | str | None,
    lock: bool = False,
) -> SalesReturn:
    """
    Resolve a confirmed or posted sales return inside the company.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not sales_return_id:
        raise ValidationError(
            {
                "sales_return":
                "Sales return is required."
            }
        )

    queryset = (
        SalesReturn.objects
        .select_related(
            "company",
            "branch",
            "customer",
            "invoice",
        )
        .filter(
            company=company,
            id=sales_return_id,
        )
    )

    if lock:
        queryset = queryset.select_for_update()

    sales_return = queryset.first()

    if not sales_return:
        raise ValidationError(
            {
                "sales_return":
                "Sales return was not found "
                "for this company."
            }
        )

    if sales_return.status not in [
        SalesReturnStatus.CONFIRMED,
        SalesReturnStatus.POSTED,
    ]:
        raise ValidationError(
            {
                "sales_return":
                "Only confirmed or posted sales returns "
                "can create credit notes."
            }
        )

    return sales_return


@transaction.atomic
def create_sales_credit_note_from_return(
    *,
    company: Company,
    sales_return: SalesReturn | None = None,
    sales_return_id: int | str | None = None,
    user=None,
    credit_note_date=None,
    public_notes: str | None = None,
    internal_notes: str | None = None,
    extra_data: dict[str, Any] | None = None,
    issue_now: bool = False,
) -> SalesCreditNote:
    """
    Create one credit note from one confirmed or posted sales return.

    Rules:
    - return must belong to the current company
    - return must be confirmed or posted
    - one return can create only one credit note
    - all return lines are copied without accepting commercial overrides
    - totals must exactly match the sales return
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    selected_return_id = (
        sales_return.id
        if sales_return is not None
        else sales_return_id
    )

    locked_return = resolve_sales_credit_note_return(
        company=company,
        sales_return_id=selected_return_id,
        lock=True,
    )

    if SalesCreditNote.objects.filter(
        sales_return=locked_return,
    ).exists():
        raise ValidationError(
            {
                "sales_return":
                "This sales return already has "
                "a credit note."
            }
        )

    return_items = list(
        SalesReturnItem.objects
        .select_for_update()
        .select_related(
            "invoice_item",
            "catalog_item",
        )
        .filter(
            sales_return=locked_return,
            company=company,
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not return_items:
        raise ValidationError(
            {
                "items":
                "Sales return cannot create a credit note "
                "without items."
            }
        )

    normalized_credit_note_date = (
        normalize_invoice_date(
            credit_note_date,
            field_name="credit_note_date",
            default_today=True,
        )
    )

    if (
        normalized_credit_note_date
        < locked_return.return_date
    ):
        raise ValidationError(
            {
                "credit_note_date":
                "Credit note date cannot be before "
                "sales return date."
            }
        )

    actor = (
        user
        if getattr(
            user,
            "is_authenticated",
            False,
        )
        else None
    )

    credit_note = SalesCreditNote(
        company=company,
        branch=locked_return.branch,
        customer=locked_return.customer,
        invoice=locked_return.invoice,
        sales_return=locked_return,
        credit_note_number=(
            generate_sales_credit_note_number(
                company,
                credit_note_date=(
                    normalized_credit_note_date
                ),
            )
        ),
        status=SalesCreditNoteStatus.DRAFT,
        credit_note_date=(
            normalized_credit_note_date
        ),
        currency_code=(
            normalize_text(
                locked_return.currency_code
            )
            or normalize_text(
                company.currency_code
            )
            or "SAR"
        ),
        public_notes=(
            normalize_text(public_notes)
            if public_notes is not None
            else locked_return.public_notes
        ),
        internal_notes=(
            normalize_text(internal_notes)
            if internal_notes is not None
            else locked_return.internal_notes
        ),
        extra_data={
            **dict(extra_data or {}),
            "source_sales_return_id": (
                locked_return.id
            ),
            "source_sales_return_number": (
                locked_return.return_number
            ),
            "source_invoice_id": (
                locked_return.invoice_id
            ),
            "source_invoice_number": (
                locked_return
                .invoice
                .invoice_number
            ),
        },
        created_by=actor,
        updated_by=actor,
    )

    credit_note.full_clean()
    credit_note.save()
    credit_note.refresh_snapshots(
        save=True
    )

    for line_number, return_item in enumerate(
        return_items,
        start=1,
    ):
        credit_note_item = SalesCreditNoteItem(
            credit_note=credit_note,
            company=company,
            sales_return_item=return_item,
            invoice_item=return_item.invoice_item,
            catalog_item=return_item.catalog_item,
            line_number=line_number,
            quantity=return_item.quantity,
        )

        credit_note_item.apply_sales_return_item_snapshot()
        credit_note_item.full_clean()
        credit_note_item.save()

    credit_note.recalculate_totals(
        save=True
    )
    credit_note.refresh_snapshots(
        save=True
    )
    credit_note.refresh_from_db()

    if (
        quantize_money(
            credit_note.total_amount
        )
        != quantize_money(
            locked_return.total_amount
        )
    ):
        raise ValidationError(
            {
                "total_amount":
                "Credit note total must match "
                "sales return total."
            }
        )

    if issue_now:
        credit_note = issue_sales_credit_note(
            company=company,
            credit_note=credit_note,
            user=user,
        )

    credit_note.refresh_from_db()

    return credit_note


@transaction.atomic
def issue_sales_credit_note(
    *,
    company: Company,
    credit_note: SalesCreditNote,
    user=None,
) -> SalesCreditNote:
    """
    Issue a draft sales credit note.

    Accounting posting is intentionally deferred.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not credit_note:
        raise ValidationError(
            {
                "credit_note":
                "Sales credit note is required."
            }
        )

    locked_credit_note = (
        SalesCreditNote.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "customer",
            "invoice",
            "sales_return",
        )
        .filter(
            id=credit_note.id,
            company=company,
        )
        .first()
    )

    if not locked_credit_note:
        raise ValidationError(
            {
                "credit_note":
                "Sales credit note does not belong "
                "to this company."
            }
        )

    locked_credit_note.recalculate_totals(
        save=True
    )
    locked_credit_note.issue(
        user=user
    )
    locked_credit_note.refresh_from_db()

    return locked_credit_note



@transaction.atomic
def post_sales_credit_note(
    *,
    company: Company,
    credit_note: SalesCreditNote,
    user=None,
) -> SalesCreditNote:
    """
    Post an issued sales credit note.

    Atomic workflow:
    - lock the credit note and linked sales return
    - validate company isolation and lifecycle
    - create and post the accounting journal entry
    - mark the credit note as posted
    - mark the linked sales return as posted

    Any failure rolls back the full transaction.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not credit_note:
        raise ValidationError(
            {
                "credit_note":
                "Sales credit note is required."
            }
        )

    locked_credit_note = (
        SalesCreditNote.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "customer",
            "invoice",
            "sales_return",
        )
        .filter(
            id=credit_note.id,
            company=company,
        )
        .first()
    )

    if not locked_credit_note:
        raise ValidationError(
            {
                "credit_note":
                "Sales credit note does not belong "
                "to this company."
            }
        )

    if (
        locked_credit_note.status
        != SalesCreditNoteStatus.ISSUED
    ):
        raise ValidationError(
            {
                "status":
                "Only issued sales credit notes "
                "can be posted."
            }
        )

    if not locked_credit_note.sales_return_id:
        raise ValidationError(
            {
                "sales_return":
                "Sales credit note must reference "
                "a sales return before posting."
            }
        )

    locked_return = (
        SalesReturn.objects
        .select_for_update()
        .filter(
            id=locked_credit_note.sales_return_id,
            company=company,
        )
        .first()
    )

    if not locked_return:
        raise ValidationError(
            {
                "sales_return":
                "Linked sales return was not found "
                "for this company."
            }
        )

    if (
        locked_return.status
        != SalesReturnStatus.CONFIRMED
    ):
        raise ValidationError(
            {
                "sales_return":
                "Only confirmed sales returns "
                "can be posted with a credit note."
            }
        )

    locked_credit_note.recalculate_totals(
        save=True
    )
    locked_credit_note.refresh_from_db()

    if (
        quantize_money(
            locked_credit_note.total_amount
        )
        != quantize_money(
            locked_return.total_amount
        )
    ):
        raise ValidationError(
            {
                "total_amount":
                "Credit note total must match "
                "sales return total before posting."
            }
        )

    try:
        post_sales_credit_note_to_accounting(
            locked_credit_note,
            actor=user,
            auto_post=True,
        )
    except AccountingServiceError as exc:
        raise ValidationError(
            {
                "accounting": str(exc),
            }
        ) from exc

    locked_credit_note.mark_posted(
        user=user
    )
    locked_return.mark_posted(
        user=user
    )

    locked_credit_note.refresh_from_db()
    locked_return.refresh_from_db()

    return locked_credit_note


@transaction.atomic
def cancel_sales_credit_note(
    *,
    company: Company,
    credit_note: SalesCreditNote,
    reason: str = "",
    user=None,
) -> SalesCreditNote:
    """
    Cancel a draft or issued sales credit note.

    Posted credit notes require a dedicated reversal flow.
    """
    if not company:
        raise ValidationError(
            {
                "company":
                "Company context is required."
            }
        )

    if not credit_note:
        raise ValidationError(
            {
                "credit_note":
                "Sales credit note is required."
            }
        )

    locked_credit_note = (
        SalesCreditNote.objects
        .select_for_update()
        .filter(
            id=credit_note.id,
            company=company,
        )
        .first()
    )

    if not locked_credit_note:
        raise ValidationError(
            {
                "credit_note":
                "Sales credit note does not belong "
                "to this company."
            }
        )

    locked_credit_note.cancel(
        reason=reason,
        user=user,
    )
    locked_credit_note.refresh_from_db()

    return locked_credit_note


def serialize_sales_credit_note_item(
    item: SalesCreditNoteItem,
) -> dict[str, Any]:
    """
    Serialize one sales credit note line.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "sales_return_item_id": (
            item.sales_return_item_id
        ),
        "invoice_item_id": (
            item.invoice_item_id
        ),
        "catalog_item_id": (
            item.catalog_item_id
        ),
        "item_code": (
            item.item_code_snapshot
        ),
        "item_name": (
            item.item_name_snapshot
        ),
        "description": (
            item.item_description_snapshot
        ),
        "unit_name": (
            item.unit_name_snapshot
        ),
        "quantity": str(
            item.quantity
        ),
        "unit_price": str(
            item.unit_price
        ),
        "line_subtotal": str(
            item.line_subtotal
        ),
        "discount_amount": str(
            item.discount_amount
        ),
        "taxable": item.taxable,
        "tax_rate": str(
            item.tax_rate
        ),
        "taxable_amount": str(
            item.taxable_amount
        ),
        "tax_amount": str(
            item.tax_amount
        ),
        "line_total": str(
            item.line_total
        ),
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


def serialize_sales_credit_note(
    credit_note: SalesCreditNote,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize a sales credit note for company APIs.
    """
    data = {
        "id": credit_note.id,
        "company_id": (
            credit_note.company_id
        ),
        "branch": (
            {
                "id": credit_note.branch_id,
                "name": (
                    credit_note
                    .branch
                    .display_name
                ),
                "code": (
                    credit_note
                    .branch
                    .branch_code
                ),
            }
            if credit_note.branch_id
            else None
        ),
        "customer": (
            {
                "id": credit_note.customer_id,
                "display_name": (
                    credit_note
                    .customer
                    .display_name
                ),
                "code": (
                    credit_note
                    .customer
                    .code
                ),
                "phone": (
                    credit_note
                    .customer
                    .phone
                ),
                "mobile": (
                    credit_note
                    .customer
                    .mobile
                ),
                "vat_number": (
                    credit_note
                    .customer
                    .vat_number
                ),
            }
            if credit_note.customer_id
            else None
        ),
        "invoice": {
            "id": credit_note.invoice_id,
            "invoice_number": (
                credit_note
                .invoice
                .invoice_number
            ),
            "invoice_date": (
                credit_note
                .invoice
                .invoice_date
                .isoformat()
                if credit_note.invoice.invoice_date
                else None
            ),
            "status": (
                credit_note.invoice.status
            ),
            "payment_status": (
                credit_note
                .invoice
                .payment_status
            ),
            "total_amount": str(
                credit_note
                .invoice
                .total_amount
            ),
        },
        "sales_return": (
            {
                "id": (
                    credit_note.sales_return_id
                ),
                "return_number": (
                    credit_note
                    .sales_return
                    .return_number
                ),
                "return_date": (
                    credit_note
                    .sales_return
                    .return_date
                    .isoformat()
                    if (
                        credit_note
                        .sales_return
                        .return_date
                    )
                    else None
                ),
                "status": (
                    credit_note
                    .sales_return
                    .status
                ),
                "total_amount": str(
                    credit_note
                    .sales_return
                    .total_amount
                ),
            }
            if credit_note.sales_return_id
            else None
        ),
        "credit_note_number": (
            credit_note.credit_note_number
        ),
        "status": credit_note.status,
        "credit_note_date": (
            credit_note
            .credit_note_date
            .isoformat()
            if credit_note.credit_note_date
            else None
        ),
        "issued_at": (
            credit_note
            .issued_at
            .isoformat()
            if credit_note.issued_at
            else None
        ),
        "posted_at": (
            credit_note
            .posted_at
            .isoformat()
            if credit_note.posted_at
            else None
        ),
        "cancelled_at": (
            credit_note
            .cancelled_at
            .isoformat()
            if credit_note.cancelled_at
            else None
        ),
        "cancelled_reason": (
            credit_note.cancelled_reason
        ),
        "subtotal": str(
            credit_note.subtotal
        ),
        "discount_amount": str(
            credit_note.discount_amount
        ),
        "taxable_amount": str(
            credit_note.taxable_amount
        ),
        "tax_amount": str(
            credit_note.tax_amount
        ),
        "total_amount": str(
            credit_note.total_amount
        ),
        "currency_code": (
            credit_note.currency_code
        ),
        "customer_snapshot": (
            credit_note.customer_snapshot
        ),
        "invoice_snapshot": (
            credit_note.invoice_snapshot
        ),
        "return_snapshot": (
            credit_note.return_snapshot
        ),
        "tax_snapshot": (
            credit_note.tax_snapshot
        ),
        "public_notes": (
            credit_note.public_notes
        ),
        "internal_notes": (
            credit_note.internal_notes
        ),
        "extra_data": (
            credit_note.extra_data
        ),
        "can_be_edited": (
            credit_note.can_be_edited
        ),
        "can_be_issued": (
            credit_note.can_be_issued
        ),
        "can_be_posted": (
            credit_note.can_be_posted
        ),
        "can_be_cancelled": (
            credit_note.can_be_cancelled
        ),
        "created_at": (
            credit_note
            .created_at
            .isoformat()
            if credit_note.created_at
            else None
        ),
        "updated_at": (
            credit_note
            .updated_at
            .isoformat()
            if credit_note.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            serialize_sales_credit_note_item(
                item
            )
            for item in (
                credit_note.items
                .select_related(
                    "sales_return_item",
                    "invoice_item",
                    "catalog_item",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return data


# End Phase 21.5.2 - Sales Credit Notes Services Foundation
# ============================================================


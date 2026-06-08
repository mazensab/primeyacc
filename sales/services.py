# ============================================================
# 📂 sales/services.py
# 🧠 PrimeyAcc | Sales Services V1.2
# ------------------------------------------------------------
# ✅ Company-scoped invoice helpers
# ✅ Invoice number generation
# ✅ Safe invoice/due date normalization
# ✅ Default branch resolver
# ✅ Customer / catalog item tenant validation
# ✅ Draft invoice creation
# ✅ Invoice item creation
# ✅ Issue / cancel helpers
# ✅ Phase 10.1 automatic accounting posting for issued sales invoices
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الخدمات هنا هي مصدر منطق المبيعات الأساسي
# - APIs تستدعي هذه الخدمات بدل تكرار المنطق
# - لا نثق بأي company_id قادم من الفرونت
# - الشركة يجب أن تأتي من عضوية المستخدم أو context الخاص بـ /company
# - invoice_date و due_date قد تصل من الواجهة كنص YYYY-MM-DD ويجب تطبيعها هنا
# - عند إصدار فاتورة البيع يتم إنشاء قيد محاسبي تلقائي من خلال accounting.services
# - لا ننشئ حركات مخزون في هذه الخطوة؛ المخزون له جزء لاحق في Phase 10
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
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from sales.models import (
    MONEY_ZERO,
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoiceSource,
    SalesInvoiceStatus,
    quantize_money,
    quantize_quantity,
)


@dataclass(frozen=True)
class InvoiceItemPayload:
    """
    Normalized invoice item payload used by services and APIs.
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


def normalize_invoice_date(value: Any, *, field_name: str = "invoice_date", default_today: bool = False) -> date | None:
    """
    Normalize invoice date values safely.

    Accepts:
    - None / empty string
    - datetime.date
    - datetime.datetime
    - "YYYY-MM-DD"

    Raises ValidationError for unsupported formats.
    """
    if value in [None, ""]:
        return timezone.localdate() if default_today else None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        value = value.strip()
        if not value:
            return timezone.localdate() if default_today else None

        try:
            return date.fromisoformat(value)
        except ValueError:
            raise ValidationError(
                {
                    field_name: "Date must be in YYYY-MM-DD format.",
                }
            )

    raise ValidationError(
        {
            field_name: "Invalid date value.",
        }
    )


def get_default_branch(company: Company) -> Branch | None:
    """
    Return the default active branch for a company if available.
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


def resolve_company_branch(company: Company, branch_id: int | str | None = None) -> Branch | None:
    """
    Resolve branch inside the same company.

    If branch_id is not provided, returns the company's default active branch
    when available.
    """
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
        raise ValidationError({"branch": "Selected branch was not found for this company."})

    if not branch.is_active:
        raise ValidationError({"branch": "Selected branch is not active."})

    return branch


def resolve_customer(company: Company, customer_id: int | str | None = None) -> BusinessParty | None:
    """
    Resolve customer inside the same company.

    Customer is optional in this phase unless company settings later require it.
    """
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
        raise ValidationError({"customer": "Selected customer was not found for this company."})

    if customer.party_type not in [
        BusinessPartyType.CUSTOMER,
        BusinessPartyType.BOTH,
    ]:
        raise ValidationError({"customer": "Selected party is not a customer."})

    if customer.status != BusinessPartyStatus.ACTIVE:
        raise ValidationError({"customer": "Selected customer is not active."})

    return customer


def resolve_catalog_item(company: Company, catalog_item_id: int | str | None = None) -> CatalogItem | None:
    """
    Resolve sellable catalog item inside the same company.
    """
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
        raise ValidationError({"catalog_item": "Selected catalog item was not found for this company."})

    if catalog_item.status != CatalogItemStatus.ACTIVE:
        raise ValidationError({"catalog_item": "Selected catalog item is not active."})

    if not catalog_item.is_sellable:
        raise ValidationError({"catalog_item": "Selected catalog item is not sellable."})

    return catalog_item


def generate_invoice_number(company: Company, invoice_date=None) -> str:
    """
    Generate a simple company-scoped invoice number.

    Format:
        INV-YYYY-000001

    Later we can replace this with a dedicated sequence model per company/branch.
    """
    invoice_date = normalize_invoice_date(
        invoice_date,
        field_name="invoice_date",
        default_today=True,
    )
    year = invoice_date.year

    prefix = "INV"

    settings_obj = getattr(company, "operational_settings", None)
    if settings_obj and getattr(settings_obj, "invoice_prefix", None):
        prefix = normalize_text(settings_obj.invoice_prefix) or "INV"

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
            next_number = int(last_invoice.invoice_number.split("-")[-1]) + 1
        except (TypeError, ValueError):
            next_number = last_invoice.id + 1

    return f"{starts_with}{next_number:06d}"


def normalize_invoice_item_payload(raw_item: dict[str, Any]) -> InvoiceItemPayload:
    """
    Normalize invoice item data from API or tests.
    """
    return InvoiceItemPayload(
        catalog_item_id=raw_item.get("catalog_item_id") or raw_item.get("item_id"),
        description=normalize_text(raw_item.get("description")),
        quantity=quantize_quantity(raw_item.get("quantity") or Decimal("1.0000")),
        unit_price=(
            quantize_money(raw_item.get("unit_price"))
            if raw_item.get("unit_price") not in [None, ""]
            else None
        ),
        discount_amount=quantize_money(raw_item.get("discount_amount") or MONEY_ZERO),
        taxable=raw_item.get("taxable") if raw_item.get("taxable") is not None else None,
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
    Create a draft sales invoice with optional items.

    The invoice is created as DRAFT. Issuing is a separate explicit step.
    """
    if not company:
        raise ValidationError({"company": "Company context is required."})

    invoice_date = normalize_invoice_date(
        invoice_date,
        field_name="invoice_date",
        default_today=True,
    )
    due_date = normalize_invoice_date(
        due_date,
        field_name="due_date",
        default_today=False,
    )

    branch = resolve_company_branch(company, branch_id)
    customer = resolve_customer(company, customer_id)

    invoice = SalesInvoice(
        company=company,
        branch=branch,
        customer=customer,
        invoice_number=generate_invoice_number(company, invoice_date=invoice_date),
        status=SalesInvoiceStatus.DRAFT,
        source=source or SalesInvoiceSource.MANUAL,
        invoice_date=invoice_date,
        due_date=due_date,
        public_notes=normalize_text(public_notes),
        internal_notes=normalize_text(internal_notes),
        currency_code=normalize_text(company.currency_code) or "SAR",
        extra_data=extra_data or {},
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )

    invoice.full_clean()
    invoice.save()

    invoice.refresh_snapshots(save=True)

    for index, item_payload in enumerate(items or [], start=1):
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
    Create one invoice item and refresh invoice totals.
    """
    if not invoice:
        raise ValidationError({"invoice": "Invoice is required."})

    if invoice.company_id != company.id:
        raise ValidationError({"company": "Invoice does not belong to this company."})

    if invoice.status != SalesInvoiceStatus.DRAFT:
        raise ValidationError({"invoice": "Only draft invoices can be edited."})

    normalized = normalize_invoice_item_payload(payload)
    catalog_item = resolve_catalog_item(company, normalized.catalog_item_id)

    if line_number is None:
        last_line = (
            SalesInvoiceItem.objects.filter(invoice=invoice)
            .order_by("-line_number")
            .first()
        )
        line_number = (last_line.line_number + 1) if last_line else 1

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
        item.item_description_snapshot = normalized.description

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
    Issue a draft invoice and create its automatic accounting journal entry.

    Phase 10.1:
    - Sales invoice issue is still handled here as the single source of truth.
    - Accounting posting is delegated to accounting.services.
    - If accounting posting fails, the transaction is rolled back and the invoice remains unissued.
    """
    if not company:
        raise ValidationError({"company": "Company context is required."})

    if not invoice:
        raise ValidationError({"invoice": "Invoice is required."})

    if invoice.company_id != company.id:
        raise ValidationError({"invoice": "Invoice does not belong to this company."})

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
        )

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

    Phase 10 note:
    - Reversing/cancelling the linked accounting entry will be handled in a later step.
    - Current behavior keeps the existing sales cancellation behavior unchanged.
    """
    if not company:
        raise ValidationError({"company": "Company context is required."})

    if not invoice:
        raise ValidationError({"invoice": "Invoice is required."})

    if invoice.company_id != company.id:
        raise ValidationError({"invoice": "Invoice does not belong to this company."})

    invoice.cancel(reason=reason, user=user)

    return invoice


def serialize_invoice_item(item: SalesInvoiceItem) -> dict[str, Any]:
    """
    Serialize invoice line for APIs.
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
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_sales_invoice(invoice: SalesInvoice, include_items: bool = False) -> dict[str, Any]:
    """
    Serialize sales invoice for APIs.
    """
    data = {
        "id": invoice.id,
        "company_id": invoice.company_id,
        "branch": {
            "id": invoice.branch_id,
            "name": invoice.branch.display_name if invoice.branch_id else "",
            "code": invoice.branch.branch_code if invoice.branch_id else "",
        }
        if invoice.branch_id
        else None,
        "customer": {
            "id": invoice.customer_id,
            "display_name": invoice.customer.display_name if invoice.customer_id else "",
            "code": invoice.customer.code if invoice.customer_id else "",
            "phone": invoice.customer.phone if invoice.customer_id else "",
            "mobile": invoice.customer.mobile if invoice.customer_id else "",
            "vat_number": invoice.customer.vat_number if invoice.customer_id else "",
        }
        if invoice.customer_id
        else None,
        "invoice_number": invoice.invoice_number,
        "status": invoice.status,
        "payment_status": invoice.payment_status,
        "source": invoice.source,
        "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "issued_at": invoice.issued_at.isoformat() if invoice.issued_at else None,
        "cancelled_at": invoice.cancelled_at.isoformat() if invoice.cancelled_at else None,
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
        "billing_address_snapshot": invoice.billing_address_snapshot,
        "tax_snapshot": invoice.tax_snapshot,
        "public_notes": invoice.public_notes,
        "internal_notes": invoice.internal_notes,
        "extra_data": invoice.extra_data,
        "can_be_edited": invoice.can_be_edited,
        "can_be_issued": invoice.can_be_issued,
        "can_be_cancelled": invoice.can_be_cancelled,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None,
    }

    if include_items:
        data["items"] = [
            serialize_invoice_item(item)
            for item in invoice.items.select_related("catalog_item").order_by("line_number", "id")
        ]

    return data
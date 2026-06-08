# ============================================================
# 📂 purchases/services.py
# 🧠 PrimeyAcc | Purchases Services V1.1
# ------------------------------------------------------------
# ✅ Backend-only service layer for supplier bills
# ✅ Company-scoped tenant isolation
# ✅ No frontend company_id trust
# ✅ Supplier, branch, and catalog item validation
# ✅ Safe purchase bill number generation
# ✅ Create, update, post, and cancel helpers
# ✅ Totals handled by models
# ✅ Phase 10.2 automatic accounting posting for posted supplier bills
# ✅ Duplicate accounting entry prevention
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل العمليات تستقبل company من request.company أو membership
# - لا نثق بأي company_id قادم من الواجهة
# - المورد يجب أن يكون من نفس الشركة ونوعه SUPPLIER أو BOTH
# - الصنف يجب أن يكون من نفس الشركة وقابلًا للشراء
# - الفاتورة لا تعدل بعد POSTED أو CANCELLED
# - عند ترحيل فاتورة المورد يتم إنشاء قيد محاسبي تلقائي مرة واحدة فقط
# ============================================================

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from accounting.models import (
    AccountingAccountPurpose,
    AccountingRoutingSource,
    JournalEntry,
    JournalEntryStatus,
    PostingSource,
)
from accounting.services import (
    AccountingPostingError,
    EntryLinePayload,
    create_journal_entry_header,
    generate_journal_entry_number,
    get_account_by_purpose,
    get_default_tax_rate,
    post_journal_entry,
    replace_journal_entry_lines,
    seed_company_chart_of_accounts,
)
from catalog.models import CatalogItem
from companies.models import Branch, Company
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from purchases.models import PurchaseBill, PurchaseBillItem, PurchaseBillStatus


MONEY_ZERO = Decimal("0.00")
MONEY_QUANT = Decimal("0.01")
AUTO_SOURCE_TYPE_PURCHASE_BILL = "purchase_bill"

ACCOUNT_PURPOSE_EXPENSE = getattr(
    AccountingAccountPurpose,
    "EXPENSE",
    AccountingAccountPurpose.OTHER,
)

POSTING_SOURCE_PURCHASE_BILL = getattr(
    PostingSource,
    "PURCHASE_BILL",
    AccountingRoutingSource.PURCHASE_BILL,
)


def normalize_date(value: Any, *, field_name: str) -> date | None:
    """
    Normalize date input safely.

    Accepts:
    - None
    - date
    - datetime
    - YYYY-MM-DD string
    """
    if value in [None, ""]:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip())
        except ValueError as exc:
            raise ValidationError({field_name: "Invalid date format. Use YYYY-MM-DD."}) from exc

    raise ValidationError({field_name: "Invalid date value."})


def normalize_decimal(value: Any, *, field_name: str, default: Decimal = Decimal("0.00")) -> Decimal:
    """
    Normalize decimal input safely.
    """
    if value in [None, ""]:
        return default

    try:
        return Decimal(str(value))
    except Exception as exc:
        raise ValidationError({field_name: "Invalid decimal value."}) from exc


def quantize_money(value: Any) -> Decimal:
    """
    Normalize money to 2 decimal places.
    """
    return Decimal(str(value or "0.00")).quantize(MONEY_QUANT)


def normalize_text(value: Any) -> str:
    """
    Normalize text safely.
    """
    return str(value or "").strip()


def get_company_purchase_prefix(company: Company) -> str:
    """
    Read purchase prefix from company operational settings when available.
    """
    settings_obj = getattr(company, "operational_settings", None)

    if settings_obj and getattr(settings_obj, "purchase_prefix", ""):
        return settings_obj.purchase_prefix.strip() or "PUR"

    return "PUR"


def generate_purchase_bill_number(company: Company) -> str:
    """
    Generate a simple company-scoped purchase bill number.

    Format:
    PUR-YYYYMMDD-000001

    This is safe enough for the current backend foundation.
    Later we can move numbering to a dedicated sequence service.
    """
    today = timezone.localdate()
    prefix = get_company_purchase_prefix(company)
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_bill = (
        PurchaseBill.objects.filter(
            company=company,
            bill_number__startswith=starts_with,
        )
        .order_by("-bill_number")
        .first()
    )

    next_number = 1

    if last_bill:
        try:
            next_number = int(last_bill.bill_number.split("-")[-1]) + 1
        except (TypeError, ValueError):
            next_number = 1

    return f"{starts_with}{next_number:06d}"


def get_supplier_for_company(company: Company, supplier_id: int | str) -> BusinessParty:
    """
    Return a valid supplier for one company.
    """
    try:
        supplier = BusinessParty.objects.get(
            id=supplier_id,
            company=company,
        )
    except BusinessParty.DoesNotExist as exc:
        raise ValidationError({"supplier": "Supplier was not found for this company."}) from exc

    if supplier.party_type not in [
        BusinessPartyType.SUPPLIER,
        BusinessPartyType.BOTH,
    ]:
        raise ValidationError({"supplier": "Selected party is not a supplier."})

    if supplier.status != BusinessPartyStatus.ACTIVE:
        raise ValidationError({"supplier": "Selected supplier is not active."})

    return supplier


def get_branch_for_company(company: Company, branch_id: int | str | None) -> Branch | None:
    """
    Return a branch owned by the company.
    """
    if branch_id in [None, ""]:
        return None

    try:
        return Branch.objects.get(
            id=branch_id,
            company=company,
        )
    except Branch.DoesNotExist as exc:
        raise ValidationError({"branch": "Branch was not found for this company."}) from exc


def get_purchase_item_for_company(company: Company, item_id: int | str) -> CatalogItem:
    """
    Return a valid purchasable catalog item for one company.
    """
    try:
        item = CatalogItem.objects.get(
            id=item_id,
            company=company,
        )
    except CatalogItem.DoesNotExist as exc:
        raise ValidationError({"item": "Catalog item was not found for this company."}) from exc

    if not item.is_purchasable:
        raise ValidationError({"item": "Selected catalog item is not purchasable."})

    return item


def get_item_purchase_price(item: CatalogItem) -> Decimal:
    """
    Resolve current purchase/cost price from the catalog item.

    Supports both field names used across phases:
    - purchase_price
    - cost_price
    """
    purchase_price = getattr(item, "purchase_price", None)

    if purchase_price not in [None, ""]:
        return normalize_decimal(
            purchase_price,
            field_name="purchase_price",
            default=MONEY_ZERO,
        )

    cost_price = getattr(item, "cost_price", None)

    return normalize_decimal(
        cost_price,
        field_name="cost_price",
        default=MONEY_ZERO,
    )


def build_purchase_bill_item(
    *,
    bill: PurchaseBill,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
) -> PurchaseBillItem:
    """
    Build and save one purchase bill item.
    """
    item = get_purchase_item_for_company(
        company,
        payload.get("item_id") or payload.get("item"),
    )

    item_default_price = get_item_purchase_price(item)

    bill_item = PurchaseBillItem(
        bill=bill,
        company=company,
        item=item,
        line_number=int(payload.get("line_number") or line_number),
        quantity=normalize_decimal(
            payload.get("quantity", Decimal("1.0000")),
            field_name="quantity",
            default=Decimal("1.0000"),
        ),
        unit_price=normalize_decimal(
            payload.get("unit_price", item_default_price),
            field_name="unit_price",
            default=item_default_price,
        ),
        discount_amount=normalize_decimal(
            payload.get("discount_amount", Decimal("0.00")),
            field_name="discount_amount",
            default=Decimal("0.00"),
        ),
        notes=str(payload.get("notes") or ""),
        extra_data=payload.get("extra_data") if isinstance(payload.get("extra_data"), dict) else {},
    )
    bill_item.save()

    return bill_item


@transaction.atomic
def create_purchase_bill(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> PurchaseBill:
    """
    Create a draft purchase bill with items.
    """
    if not company:
        raise ValidationError("Company is required.")

    supplier = get_supplier_for_company(
        company,
        payload.get("supplier_id") or payload.get("supplier"),
    )
    branch = get_branch_for_company(
        company,
        payload.get("branch_id") or payload.get("branch"),
    )

    items_payload = payload.get("items") or []
    if not isinstance(items_payload, list) or not items_payload:
        raise ValidationError({"items": "At least one purchase bill item is required."})

    bill_date = normalize_date(
        payload.get("bill_date") or timezone.localdate(),
        field_name="bill_date",
    )
    due_date = normalize_date(
        payload.get("due_date"),
        field_name="due_date",
    )

    bill = PurchaseBill(
        company=company,
        branch=branch,
        supplier=supplier,
        status=PurchaseBillStatus.DRAFT,
        bill_number=(payload.get("bill_number") or "").strip() or generate_purchase_bill_number(company),
        supplier_bill_number=(payload.get("supplier_bill_number") or "").strip(),
        bill_date=bill_date or timezone.localdate(),
        due_date=due_date,
        currency_code=(payload.get("currency_code") or company.currency_code or "SAR").strip().upper(),
        notes=str(payload.get("notes") or ""),
        extra_data=payload.get("extra_data") if isinstance(payload.get("extra_data"), dict) else {},
        created_by=user,
        updated_by=user,
    )
    bill.full_clean()
    bill.save()

    for index, item_payload in enumerate(items_payload, start=1):
        if not isinstance(item_payload, dict):
            raise ValidationError({"items": "Each item must be an object."})

        build_purchase_bill_item(
            bill=bill,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    bill.recalculate_totals(save=True)

    return bill


@transaction.atomic
def update_purchase_bill(
    *,
    bill: PurchaseBill,
    payload: dict[str, Any],
    user=None,
) -> PurchaseBill:
    """
    Update an existing draft purchase bill.

    If items are provided, old items are replaced.
    """
    if not bill.can_edit:
        raise ValidationError("Only draft purchase bills can be updated.")

    company = bill.company

    if "supplier_id" in payload or "supplier" in payload:
        bill.supplier = get_supplier_for_company(
            company,
            payload.get("supplier_id") or payload.get("supplier"),
        )

    if "branch_id" in payload or "branch" in payload:
        bill.branch = get_branch_for_company(
            company,
            payload.get("branch_id") or payload.get("branch"),
        )

    if "bill_number" in payload:
        bill.bill_number = (payload.get("bill_number") or "").strip()

    if "supplier_bill_number" in payload:
        bill.supplier_bill_number = (payload.get("supplier_bill_number") or "").strip()

    if "bill_date" in payload:
        bill.bill_date = normalize_date(
            payload.get("bill_date"),
            field_name="bill_date",
        ) or bill.bill_date

    if "due_date" in payload:
        bill.due_date = normalize_date(
            payload.get("due_date"),
            field_name="due_date",
        )

    if "currency_code" in payload:
        bill.currency_code = (payload.get("currency_code") or "SAR").strip().upper()

    if "notes" in payload:
        bill.notes = str(payload.get("notes") or "")

    if isinstance(payload.get("extra_data"), dict):
        bill.extra_data = payload["extra_data"]

    bill.updated_by = user
    bill.full_clean()
    bill.save()

    if "items" in payload:
        items_payload = payload.get("items") or []

        if not isinstance(items_payload, list) or not items_payload:
            raise ValidationError({"items": "At least one purchase bill item is required."})

        bill.items.all().delete()

        for index, item_payload in enumerate(items_payload, start=1):
            if not isinstance(item_payload, dict):
                raise ValidationError({"items": "Each item must be an object."})

            build_purchase_bill_item(
                bill=bill,
                company=company,
                payload=item_payload,
                line_number=index,
            )

    bill.recalculate_totals(save=True)

    return bill


def source_id(value: Any) -> str:
    """
    Normalize source id for JournalEntry.source_id.
    """
    if value in [None, ""]:
        return ""

    return str(value).strip()


def get_existing_purchase_bill_auto_entry(bill: PurchaseBill) -> JournalEntry | None:
    """
    Return existing automatic journal entry for a purchase bill.

    This prevents duplicate accounting posting for the same supplier bill.
    """
    if not bill:
        return None

    company = getattr(bill, "company", None)

    if not company:
        return None

    bill_number = normalize_text(getattr(bill, "bill_number", ""))

    return (
        JournalEntry.objects.filter(
            company=company,
            source_type=AUTO_SOURCE_TYPE_PURCHASE_BILL,
            source_id=source_id(getattr(bill, "pk", None)),
            source_number=bill_number,
            is_auto_posted=True,
        )
        .exclude(status=JournalEntryStatus.CANCELLED)
        .order_by("id")
        .first()
    )


def find_purchase_bill_journal_entry(bill: PurchaseBill) -> JournalEntry | None:
    """
    Public helper to find the automatic accounting entry linked to a purchase bill.
    """
    return get_existing_purchase_bill_auto_entry(bill)


def get_purchase_bill_posting_buckets(bill: PurchaseBill) -> dict[str, Decimal]:
    """
    Split purchase bill debit amount into inventory and expense buckets.

    Rules:
    - If any line item tracks inventory, its taxable/net amount goes to inventory.
    - Non-inventory/service lines go to purchase expense.
    - VAT is posted separately as input VAT.
    """
    inventory_amount = MONEY_ZERO
    expense_amount = MONEY_ZERO

    items_qs = bill.items.select_related("item").order_by("line_number", "id")

    for line in items_qs:
        item = getattr(line, "item", None)

        line_net = quantize_money(
            getattr(line, "taxable_amount", None)
            or (
                quantize_money(getattr(line, "quantity", MONEY_ZERO))
                * quantize_money(getattr(line, "unit_price", MONEY_ZERO))
                - quantize_money(getattr(line, "discount_amount", MONEY_ZERO))
            )
        )

        if item and bool(getattr(item, "track_inventory", False)):
            inventory_amount += line_net
        else:
            expense_amount += line_net

    return {
        "inventory_amount": quantize_money(inventory_amount),
        "expense_amount": quantize_money(expense_amount),
    }


@transaction.atomic
def post_purchase_bill_to_accounting(
    bill: PurchaseBill,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Create and optionally post an automatic accounting journal entry for a posted supplier bill.

    Accounting treatment:
    - Debit  Inventory or Purchase Expense = bill.total_amount - bill.tax_amount
    - Debit  Input VAT                     = bill.tax_amount, when tax exists
    - Credit Accounts Payable             = bill.total_amount

    Safety:
    - Uses bill.company as tenant source.
    - Prevents duplicate entries.
    - Refuses non-posted bills.
    - Refuses zero-value bills.
    """
    if not bill:
        raise AccountingPostingError("فاتورة المورد مطلوبة للترحيل المحاسبي.")

    company = getattr(bill, "company", None)

    if not company:
        raise AccountingPostingError("الشركة مطلوبة لترحيل فاتورة المورد.")

    if getattr(bill, "company_id", None) != getattr(company, "pk", None):
        raise AccountingPostingError("فاتورة المورد لا تتبع الشركة المحددة.")

    bill_number = normalize_text(getattr(bill, "bill_number", "")) or f"PURCHASE-BILL-{bill.pk}"

    existing = get_existing_purchase_bill_auto_entry(bill)

    if existing:
        if auto_post and existing.status == JournalEntryStatus.DRAFT:
            return post_journal_entry(existing, actor=actor)

        return existing

    bill_status = normalize_text(getattr(bill, "status", "")).upper()

    if bill_status != str(PurchaseBillStatus.POSTED).upper():
        raise AccountingPostingError("لا يمكن ترحيل فاتورة مورد غير مرحلة محاسبيًا.")

    total_amount = quantize_money(getattr(bill, "total_amount", MONEY_ZERO))
    tax_amount = quantize_money(getattr(bill, "tax_amount", MONEY_ZERO))

    if total_amount <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن ترحيل فاتورة مورد بإجمالي صفري.")

    if tax_amount < MONEY_ZERO:
        raise AccountingPostingError("ضريبة فاتورة المورد لا يمكن أن تكون سالبة.")

    seed_company_chart_of_accounts(company)

    accounts_payable_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.ACCOUNTS_PAYABLE,
        source=AccountingRoutingSource.PURCHASE_BILL,
        required=True,
    )

    inventory_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.INVENTORY,
        source=AccountingRoutingSource.PURCHASE_BILL,
        required=False,
    )

    purchase_expense_account = get_account_by_purpose(
        company,
        ACCOUNT_PURPOSE_EXPENSE,
        source=AccountingRoutingSource.PURCHASE_BILL,
        required=False,
    )

    input_vat_account = None
    default_tax_rate = None

    if tax_amount > MONEY_ZERO:
        input_vat_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.INPUT_VAT,
            source=AccountingRoutingSource.PURCHASE_BILL,
            required=True,
        )
        default_tax_rate = get_default_tax_rate(company)

    buckets = get_purchase_bill_posting_buckets(bill)
    inventory_amount = buckets["inventory_amount"]
    expense_amount = buckets["expense_amount"]

    if inventory_amount <= MONEY_ZERO and expense_amount <= MONEY_ZERO:
        base_amount = quantize_money(total_amount - tax_amount)

        if inventory_account:
            inventory_amount = base_amount
        elif purchase_expense_account:
            expense_amount = base_amount
        else:
            raise AccountingPostingError("لا يوجد حساب مخزون أو مصروف مشتريات لترحيل فاتورة المورد.")

    if inventory_amount > MONEY_ZERO and not inventory_account:
        raise AccountingPostingError("لا يوجد حساب مخزون صالح لترحيل فاتورة المورد.")

    if expense_amount > MONEY_ZERO and not purchase_expense_account:
        raise AccountingPostingError("لا يوجد حساب مصروف مشتريات صالح لترحيل فاتورة المورد.")

    currency = normalize_text(getattr(bill, "currency_code", "") or "SAR").upper()
    entry_date = getattr(bill, "bill_date", None) or timezone.localdate()
    supplier_id = normalize_text(getattr(bill, "supplier_id", "") or "")

    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(company, prefix="PBILL"),
        posting_source=POSTING_SOURCE_PURCHASE_BILL,
        reference=bill_number,
        external_reference=normalize_text(getattr(bill, "supplier_bill_number", "")) or bill_number,
        description=f"قيد تلقائي لفاتورة مورد {bill_number}",
        notes="تم إنشاء هذا القيد تلقائيًا عند ترحيل فاتورة المورد.",
        currency=currency,
        source_type=AUTO_SOURCE_TYPE_PURCHASE_BILL,
        source_id=source_id(bill.pk),
        source_number=bill_number,
        is_auto_posted=True,
        actor=actor,
    )

    lines: list[EntryLinePayload] = []
    sort_order = 1

    if inventory_amount > MONEY_ZERO:
        lines.append(
            EntryLinePayload(
                account=inventory_account,
                description=f"مخزون عن فاتورة مورد {bill_number}",
                debit_amount=inventory_amount,
                credit_amount=MONEY_ZERO,
                currency=currency,
                party_type="supplier" if supplier_id else "",
                party_id=supplier_id,
                source_line_id="purchase-inventory",
                sort_order=sort_order,
                metadata={
                    "source": AUTO_SOURCE_TYPE_PURCHASE_BILL,
                    "bill_id": bill.pk,
                    "bill_number": bill_number,
                    "bucket": "inventory",
                },
            )
        )
        sort_order += 1

    if expense_amount > MONEY_ZERO:
        lines.append(
            EntryLinePayload(
                account=purchase_expense_account,
                description=f"مصروف مشتريات عن فاتورة مورد {bill_number}",
                debit_amount=expense_amount,
                credit_amount=MONEY_ZERO,
                currency=currency,
                party_type="supplier" if supplier_id else "",
                party_id=supplier_id,
                source_line_id="purchase-expense",
                sort_order=sort_order,
                metadata={
                    "source": AUTO_SOURCE_TYPE_PURCHASE_BILL,
                    "bill_id": bill.pk,
                    "bill_number": bill_number,
                    "bucket": "expense",
                },
            )
        )
        sort_order += 1

    if tax_amount > MONEY_ZERO and input_vat_account:
        lines.append(
            EntryLinePayload(
                account=input_vat_account,
                description=f"ضريبة مدخلات لفاتورة مورد {bill_number}",
                debit_amount=tax_amount,
                credit_amount=MONEY_ZERO,
                currency=currency,
                tax_rate=default_tax_rate,
                tax_amount=tax_amount,
                party_type="supplier" if supplier_id else "",
                party_id=supplier_id,
                source_line_id="purchase-input-vat",
                sort_order=sort_order,
                metadata={
                    "source": AUTO_SOURCE_TYPE_PURCHASE_BILL,
                    "bill_id": bill.pk,
                    "bill_number": bill_number,
                    "tax_amount": str(tax_amount),
                },
            )
        )
        sort_order += 1

    lines.append(
        EntryLinePayload(
            account=accounts_payable_account,
            description=f"ذمم دائنة عن فاتورة مورد {bill_number}",
            debit_amount=MONEY_ZERO,
            credit_amount=total_amount,
            currency=currency,
            party_type="supplier" if supplier_id else "",
            party_id=supplier_id,
            source_line_id="purchase-payable",
            sort_order=sort_order,
            metadata={
                "source": AUTO_SOURCE_TYPE_PURCHASE_BILL,
                "bill_id": bill.pk,
                "bill_number": bill_number,
            },
        )
    )

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": AUTO_SOURCE_TYPE_PURCHASE_BILL,
        "source_app": "purchases",
        "bill_id": bill.pk,
        "bill_number": bill_number,
        "supplier_id": supplier_id,
        "total_amount": str(total_amount),
        "tax_amount": str(tax_amount),
        "inventory_amount": str(inventory_amount),
        "expense_amount": str(expense_amount),
        "auto_posted_by_phase": "phase_10_2",
    }

    metadata_update_fields = ["metadata", "updated_at"]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        metadata_update_fields.append("updated_by")

    entry.save(update_fields=metadata_update_fields)

    if auto_post:
        entry = post_journal_entry(entry, actor=actor)

    return entry


@transaction.atomic
def post_purchase_bill(
    *,
    bill: PurchaseBill,
    user=None,
) -> PurchaseBill:
    """
    Post a draft purchase bill and create its automatic accounting entry.
    """
    bill.post(user=user)
    bill.refresh_from_db()

    post_purchase_bill_to_accounting(
        bill,
        actor=user,
        auto_post=True,
    )

    return bill


@transaction.atomic
def cancel_purchase_bill(
    *,
    bill: PurchaseBill,
    reason: str = "",
    user=None,
) -> PurchaseBill:
    """
    Cancel a draft or posted purchase bill.
    """
    bill.cancel(reason=reason, user=user)
    bill.refresh_from_db()
    return bill
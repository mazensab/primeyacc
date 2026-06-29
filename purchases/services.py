# ============================================================
# 📂 purchases/services.py
# 🧠 Mhamcloud | Purchases Services V1.1
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
from django.db.models import Sum
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
    post_supplier_debit_note_to_accounting,
)
from catalog.models import (
    CatalogItem,
    CatalogItemType,
)
from companies.models import Branch, Company
from inventory.models import (
    StockItem,
    StockMovement,
    StockMovementStatus,
    StockMovementType,
    Warehouse,
    WarehouseStatus,
)
from inventory.services import (
    create_stock_movement,
    issue_stock,
)
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from purchases.models import (
    PurchaseBill,
    PurchaseBillItem,
    PurchaseBillStatus,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    PurchaseRequest,
    PurchaseRequestItem,
    PurchaseRequestStatus,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseReceiptStatus,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchaseReturnReason,
    PurchaseReturnStatus,
    SupplierDebitNote,
    SupplierDebitNoteItem,
    SupplierDebitNoteStatus,
    SupplierCredit,
    SupplierCreditStatus,
    quantize_quantity,
)


MONEY_ZERO = Decimal("0.00")
MONEY_QUANT = Decimal("0.01")
AUTO_SOURCE_TYPE_PURCHASE_BILL = "purchase_bill"

PURCHASE_RETURN_STOCK_REFERENCE = (
    "purchase_return_item"
)

PURCHASE_RECEIPT_STOCK_REFERENCE = (
    "purchase_receipt_item"
)

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


# ============================================================
# Purchase Requests Services Foundation
# ============================================================


def get_company_purchase_request_prefix(
    company: Company,
) -> str:
    """
    Resolve purchase request number prefix.
    """
    settings_obj = getattr(
        company,
        "operational_settings",
        None,
    )

    configured_prefix = (
        getattr(
            settings_obj,
            "purchase_request_prefix",
            "",
        )
        if settings_obj
        else ""
    )

    return normalize_text(
        configured_prefix
    ) or "PR"


def generate_purchase_request_number(
    company: Company,
) -> str:
    """
    Generate a company-scoped purchase request number.

    Format:
    PR-YYYYMMDD-000001
    """
    today = timezone.localdate()
    prefix = get_company_purchase_request_prefix(
        company
    )
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_request = (
        PurchaseRequest.objects
        .filter(
            company=company,
            request_number__startswith=starts_with,
        )
        .order_by("-request_number")
        .first()
    )

    next_number = 1

    if last_request:
        try:
            next_number = (
                int(
                    last_request.request_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = 1

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def normalize_purchase_request_priority(
    value: Any,
) -> str:
    """
    Normalize and validate purchase request priority.
    """
    priority = normalize_text(
        value or "NORMAL"
    ).upper()

    valid_priorities = {
        "LOW",
        "NORMAL",
        "HIGH",
        "URGENT",
    }

    if priority not in valid_priorities:
        raise ValidationError(
            {
                "priority":
                    "Invalid purchase request priority."
            }
        )

    return priority


def get_purchase_request_for_company(
    *,
    company: Company,
    request_id: int | str,
) -> PurchaseRequest:
    """
    Return one company-scoped purchase request.
    """
    purchase_request = (
        PurchaseRequest.objects
        .select_related(
            "company",
            "branch",
            "created_by",
            "updated_by",
            "submitted_by",
            "approved_by",
            "rejected_by",
            "cancelled_by",
        )
        .filter(
            id=request_id,
            company=company,
        )
        .first()
    )

    if not purchase_request:
        raise ValidationError(
            {
                "purchase_request":
                    "Purchase request was not found "
                    "for this company."
            }
        )

    return purchase_request


def get_convertible_purchase_request_for_company(
    *,
    company: Company,
    request_id: int | str,
) -> PurchaseRequest:
    """
    Return an approved request eligible for conversion.
    """
    purchase_request = (
        get_purchase_request_for_company(
            company=company,
            request_id=request_id,
        )
    )

    if not purchase_request.can_be_converted:
        raise ValidationError(
            {
                "purchase_request":
                    "Purchase request must be approved "
                    "before order conversion."
            }
        )

    if (
        purchase_request.remaining_quantity
        <= Decimal("0.0000")
    ):
        raise ValidationError(
            {
                "purchase_request":
                    "Purchase request has no remaining "
                    "quantity available for conversion."
            }
        )

    return purchase_request


def get_purchase_request_item_for_company(
    *,
    company: Company,
    purchase_request: PurchaseRequest,
    request_item_id: int | str,
) -> PurchaseRequestItem:
    """
    Return one request item belonging to the request and company.
    """
    request_item = (
        PurchaseRequestItem.objects
        .select_related(
            "request",
            "company",
            "item",
            "item__unit",
        )
        .filter(
            id=request_item_id,
            company=company,
            request=purchase_request,
        )
        .first()
    )

    if not request_item:
        raise ValidationError(
            {
                "purchase_request_item":
                    "Purchase request item was not found "
                    "for this request and company."
            }
        )

    return request_item


def build_purchase_request_item(
    *,
    purchase_request: PurchaseRequest,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
) -> PurchaseRequestItem:
    """
    Build and save one draft purchase request item.
    """
    if not purchase_request.can_be_edited:
        raise ValidationError(
            "Only draft purchase requests can be edited."
        )

    item_id = (
        payload.get("item_id")
        or payload.get("item")
    )

    if not item_id:
        raise ValidationError(
            {
                "item":
                    "Catalog item is required."
            }
        )

    item = get_purchase_item_for_company(
        company,
        item_id,
    )

    default_price = get_item_purchase_price(
        item
    )

    request_item = PurchaseRequestItem(
        request=purchase_request,
        company=company,
        item=item,
        line_number=int(
            payload.get("line_number")
            or line_number
        ),
        quantity=quantize_quantity(
            normalize_decimal(
                payload.get(
                    "quantity",
                    Decimal("1.0000"),
                ),
                field_name="quantity",
                default=Decimal("1.0000"),
            )
        ),
        suggested_unit_price=quantize_money(
            normalize_decimal(
                payload.get(
                    "suggested_unit_price",
                    payload.get(
                        "unit_price",
                        default_price,
                    ),
                ),
                field_name="suggested_unit_price",
                default=default_price,
            )
        ),
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
    )
    request_item.save()

    return request_item


@transaction.atomic
def create_purchase_request(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> PurchaseRequest:
    """
    Create a draft internal purchase request with items.
    """
    if not company:
        raise ValidationError(
            "Company is required."
        )

    items_payload = payload.get("items") or []

    if (
        not isinstance(items_payload, list)
        or not items_payload
    ):
        raise ValidationError(
            {
                "items":
                    "At least one purchase request "
                    "item is required."
            }
        )

    branch = get_branch_for_company(
        company,
        payload.get("branch_id")
        or payload.get("branch"),
    )

    request_date = normalize_date(
        payload.get("request_date")
        or timezone.localdate(),
        field_name="request_date",
    )
    required_date = normalize_date(
        payload.get("required_date"),
        field_name="required_date",
    )

    purchase_request = PurchaseRequest(
        company=company,
        branch=branch,
        request_number=(
            normalize_text(
                payload.get("request_number")
            )
            or generate_purchase_request_number(
                company
            )
        ),
        request_date=(
            request_date
            or timezone.localdate()
        ),
        required_date=required_date,
        status=PurchaseRequestStatus.DRAFT,
        priority=normalize_purchase_request_priority(
            payload.get("priority")
        ),
        purpose=normalize_text(
            payload.get("purpose")
        ),
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
        created_by=user,
        updated_by=user,
    )
    purchase_request.full_clean()
    purchase_request.save()

    for index, item_payload in enumerate(
        items_payload,
        start=1,
    ):
        if not isinstance(item_payload, dict):
            raise ValidationError(
                {
                    "items":
                        "Each purchase request item "
                        "must be an object."
                }
            )

        build_purchase_request_item(
            purchase_request=purchase_request,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    purchase_request.refresh_from_db()

    return purchase_request


@transaction.atomic
def update_purchase_request(
    *,
    purchase_request: PurchaseRequest,
    payload: dict[str, Any],
    user=None,
) -> PurchaseRequest:
    """
    Update a draft purchase request.

    When items are supplied, existing request lines are replaced.
    """
    locked_request = (
        PurchaseRequest.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
        )
        .get(pk=purchase_request.pk)
    )

    if not locked_request.can_be_edited:
        raise ValidationError(
            "Only draft purchase requests can be updated."
        )

    company = locked_request.company

    if "branch_id" in payload or "branch" in payload:
        locked_request.branch = (
            get_branch_for_company(
                company,
                payload.get("branch_id")
                or payload.get("branch"),
            )
        )

    if "request_number" in payload:
        locked_request.request_number = (
            normalize_text(
                payload.get("request_number")
            )
        )

    if "request_date" in payload:
        locked_request.request_date = (
            normalize_date(
                payload.get("request_date"),
                field_name="request_date",
            )
            or locked_request.request_date
        )

    if "required_date" in payload:
        locked_request.required_date = (
            normalize_date(
                payload.get("required_date"),
                field_name="required_date",
            )
        )

    if "priority" in payload:
        locked_request.priority = (
            normalize_purchase_request_priority(
                payload.get("priority")
            )
        )

    if "purpose" in payload:
        locked_request.purpose = normalize_text(
            payload.get("purpose")
        )

    if "notes" in payload:
        locked_request.notes = normalize_text(
            payload.get("notes")
        )

    if isinstance(
        payload.get("extra_data"),
        dict,
    ):
        locked_request.extra_data = (
            payload["extra_data"]
        )

    locked_request.updated_by = user
    locked_request.full_clean()
    locked_request.save()

    if "items" in payload:
        items_payload = payload.get("items") or []

        if (
            not isinstance(items_payload, list)
            or not items_payload
        ):
            raise ValidationError(
                {
                    "items":
                        "At least one purchase request "
                        "item is required."
                }
            )

        locked_request.items.all().delete()

        for index, item_payload in enumerate(
            items_payload,
            start=1,
        ):
            if not isinstance(item_payload, dict):
                raise ValidationError(
                    {
                        "items":
                            "Each purchase request item "
                            "must be an object."
                    }
                )

            build_purchase_request_item(
                purchase_request=locked_request,
                company=company,
                payload=item_payload,
                line_number=index,
            )

    locked_request.refresh_from_db()

    return locked_request


@transaction.atomic
def submit_purchase_request(
    *,
    purchase_request: PurchaseRequest,
    user=None,
) -> PurchaseRequest:
    """
    Submit a draft purchase request for approval.
    """
    locked_request = (
        PurchaseRequest.objects
        .select_for_update()
        .get(pk=purchase_request.pk)
    )

    locked_request.submit(user=user)
    locked_request.refresh_from_db()

    return locked_request


@transaction.atomic
def approve_purchase_request(
    *,
    purchase_request: PurchaseRequest,
    user=None,
) -> PurchaseRequest:
    """
    Approve a submitted purchase request.
    """
    locked_request = (
        PurchaseRequest.objects
        .select_for_update()
        .get(pk=purchase_request.pk)
    )

    locked_request.approve(user=user)
    locked_request.refresh_from_db()

    return locked_request


@transaction.atomic
def reject_purchase_request(
    *,
    purchase_request: PurchaseRequest,
    reason: str,
    user=None,
) -> PurchaseRequest:
    """
    Reject a submitted purchase request.
    """
    locked_request = (
        PurchaseRequest.objects
        .select_for_update()
        .get(pk=purchase_request.pk)
    )

    locked_request.reject(
        reason=normalize_text(reason),
        user=user,
    )
    locked_request.refresh_from_db()

    return locked_request


@transaction.atomic
def cancel_purchase_request(
    *,
    purchase_request: PurchaseRequest,
    reason: str = "",
    user=None,
) -> PurchaseRequest:
    """
    Cancel an eligible purchase request.
    """
    locked_request = (
        PurchaseRequest.objects
        .select_for_update()
        .get(pk=purchase_request.pk)
    )

    locked_request.cancel(
        reason=normalize_text(reason),
        user=user,
    )
    locked_request.refresh_from_db()

    return locked_request


def validate_purchase_request_conversion_quantity(
    *,
    request_item: PurchaseRequestItem,
    quantity: Decimal,
) -> None:
    """
    Prevent conversion above the remaining request quantity.
    """
    quantity = quantize_quantity(quantity)

    if quantity <= Decimal("0.0000"):
        raise ValidationError(
            {
                "quantity":
                    "Order quantity must be greater than zero."
            }
        )

    if quantity > request_item.remaining_quantity:
        raise ValidationError(
            {
                "quantity":
                    "Order quantity cannot exceed "
                    "the remaining purchase request quantity."
            }
        )


def build_purchase_order_item_from_request(
    *,
    order: PurchaseOrder,
    request_item: PurchaseRequestItem,
    quantity: Decimal,
    line_number: int,
    payload: dict[str, Any] | None = None,
) -> PurchaseOrderItem:
    """
    Create one purchase order item from a request item.
    """
    payload = payload or {}

    validate_purchase_request_conversion_quantity(
        request_item=request_item,
        quantity=quantity,
    )

    unit_price = quantize_money(
        normalize_decimal(
            payload.get(
                "unit_price",
                request_item.suggested_unit_price,
            ),
            field_name="unit_price",
            default=request_item.suggested_unit_price,
        )
    )

    discount_amount = quantize_money(
        normalize_decimal(
            payload.get(
                "discount_amount",
                MONEY_ZERO,
            ),
            field_name="discount_amount",
            default=MONEY_ZERO,
        )
    )

    order_item = PurchaseOrderItem(
        order=order,
        company=order.company,
        item=request_item.item,
        purchase_request_item=request_item,
        line_number=int(
            payload.get("line_number")
            or line_number
        ),
        quantity=quantity,
        unit_price=unit_price,
        discount_amount=discount_amount,
        notes=normalize_text(
            payload.get("notes")
            or request_item.notes
        ),
        extra_data={
            **(request_item.extra_data or {}),
            **(
                payload.get("extra_data")
                if isinstance(
                    payload.get("extra_data"),
                    dict,
                )
                else {}
            ),
            "source": "purchase_request",
            "purchase_request_id": (
                request_item.request_id
            ),
            "purchase_request_item_id": (
                request_item.id
            ),
        },
    )
    order_item.save()

    return order_item


@transaction.atomic
def convert_purchase_request_to_order(
    *,
    company: Company,
    purchase_request: PurchaseRequest,
    payload: dict[str, Any],
    user=None,
) -> PurchaseOrder:
    """
    Convert all or selected remaining request quantities
    into one draft purchase order.

    Required:
    - supplier_id

    Optional items:
    [
        {
            "purchase_request_item_id": 1,
            "quantity": "2.0000",
            "unit_price": "15.00",
            "discount_amount": "0.00"
        }
    ]

    When items are omitted, all remaining request quantities
    are converted.
    """
    if not company:
        raise ValidationError(
            "Company is required."
        )

    locked_request = (
        PurchaseRequest.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
        )
        .filter(
            pk=purchase_request.pk,
            company=company,
        )
        .first()
    )

    if not locked_request:
        raise ValidationError(
            {
                "purchase_request":
                    "Purchase request was not found "
                    "for the current company."
            }
        )

    if not locked_request.can_be_converted:
        raise ValidationError(
            {
                "purchase_request":
                    "Purchase request must be approved "
                    "before order conversion."
            }
        )

    supplier_id = (
        payload.get("supplier_id")
        or payload.get("supplier")
    )

    if not supplier_id:
        raise ValidationError(
            {
                "supplier":
                    "Supplier is required."
            }
        )

    supplier = get_supplier_for_company(
        company,
        supplier_id,
    )

    branch = locked_request.branch

    if "branch_id" in payload or "branch" in payload:
        branch = get_branch_for_company(
            company,
            payload.get("branch_id")
            or payload.get("branch"),
        )

    order_date = normalize_date(
        payload.get("order_date")
        or timezone.localdate(),
        field_name="order_date",
    )
    expected_date = normalize_date(
        payload.get("expected_date")
        or locked_request.required_date,
        field_name="expected_date",
    )

    order = PurchaseOrder(
        company=company,
        branch=branch,
        supplier=supplier,
        purchase_request=locked_request,
        order_number=(
            normalize_text(
                payload.get("order_number")
            )
            or generate_purchase_order_number(
                company
            )
        ),
        supplier_reference=normalize_text(
            payload.get("supplier_reference")
        ),
        order_date=(
            order_date
            or timezone.localdate()
        ),
        expected_date=expected_date,
        status=PurchaseOrderStatus.DRAFT,
        currency_code=normalize_text(
            payload.get("currency_code")
            or company.currency_code
            or "SAR"
        ).upper(),
        notes=normalize_text(
            payload.get("notes")
            or locked_request.notes
        ),
        extra_data={
            **(
                payload.get("extra_data")
                if isinstance(
                    payload.get("extra_data"),
                    dict,
                )
                else {}
            ),
            "source": "purchase_request",
            "purchase_request_id": locked_request.id,
        },
        created_by=user,
        updated_by=user,
    )
    order.full_clean()
    order.save()

    requested_items = payload.get("items")
    source_items: list[dict[str, Any]] = []
    used_request_item_ids: set[int] = set()

    if requested_items in [None, []]:
        for request_item in (
            locked_request.items
            .select_for_update()
            .select_related(
                "item",
                "item__unit",
            )
            .order_by(
                "line_number",
                "id",
            )
        ):
            remaining = request_item.remaining_quantity

            if remaining > Decimal("0.0000"):
                source_items.append(
                    {
                        "request_item": request_item,
                        "quantity": remaining,
                        "payload": {},
                    }
                )
    else:
        if not isinstance(requested_items, list):
            raise ValidationError(
                {
                    "items":
                        "Purchase order items must be a list."
                }
            )

        for item_payload in requested_items:
            if not isinstance(item_payload, dict):
                raise ValidationError(
                    {
                        "items":
                            "Each purchase order item "
                            "must be an object."
                    }
                )

            request_item_id = (
                item_payload.get(
                    "purchase_request_item_id"
                )
                or item_payload.get(
                    "request_item_id"
                )
                or item_payload.get(
                    "purchase_request_item"
                )
            )

            if not request_item_id:
                raise ValidationError(
                    {
                        "purchase_request_item":
                            "Purchase request item is required."
                    }
                )

            request_item = (
                get_purchase_request_item_for_company(
                    company=company,
                    purchase_request=locked_request,
                    request_item_id=request_item_id,
                )
            )

            if request_item.id in used_request_item_ids:
                raise ValidationError(
                    {
                        "items":
                            "A purchase request item cannot "
                            "appear more than once in the "
                            "same conversion."
                    }
                )

            used_request_item_ids.add(
                request_item.id
            )

            quantity = quantize_quantity(
                normalize_decimal(
                    item_payload.get("quantity"),
                    field_name="quantity",
                    default=(
                        request_item.remaining_quantity
                    ),
                )
            )

            source_items.append(
                {
                    "request_item": request_item,
                    "quantity": quantity,
                    "payload": item_payload,
                }
            )

    if not source_items:
        raise ValidationError(
            {
                "items":
                    "Purchase request has no remaining "
                    "quantity available for conversion."
            }
        )

    for source in source_items:
        validate_purchase_request_conversion_quantity(
            request_item=source["request_item"],
            quantity=source["quantity"],
        )

    for index, source in enumerate(
        source_items,
        start=1,
    ):
        build_purchase_order_item_from_request(
            order=order,
            request_item=source["request_item"],
            quantity=source["quantity"],
            line_number=index,
            payload=source["payload"],
        )

    order.recalculate_totals(save=True)
    locked_request.refresh_conversion_status(
        save=True
    )

    order.refresh_from_db()
    locked_request.refresh_from_db()

    return order


def serialize_purchase_request_item(
    item: PurchaseRequestItem,
) -> dict[str, Any]:
    """
    Serialize one purchase request item.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "catalog_item_id": item.item_id,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": (
            item.item_name_ar_snapshot
        ),
        "item_name_en": (
            item.item_name_en_snapshot
        ),
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "converted_quantity": str(
            item.converted_quantity
        ),
        "remaining_quantity": str(
            item.remaining_quantity
        ),
        "suggested_unit_price": str(
            item.suggested_unit_price
        ),
        "notes": item.notes,
        "extra_data": item.extra_data or {},
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


def serialize_purchase_request(
    purchase_request: PurchaseRequest,
    *,
    include_items: bool = True,
) -> dict[str, Any]:
    """
    Serialize a purchase request for company APIs.
    """
    result = {
        "id": purchase_request.id,
        "request_number": (
            purchase_request.request_number
        ),
        "request_date": (
            purchase_request.request_date.isoformat()
            if purchase_request.request_date
            else None
        ),
        "required_date": (
            purchase_request.required_date.isoformat()
            if purchase_request.required_date
            else None
        ),
        "status": purchase_request.status,
        "priority": purchase_request.priority,
        "purpose": purchase_request.purpose,
        "company": {
            "id": purchase_request.company_id,
            "name": purchase_request.company.name,
        },
        "branch": (
            {
                "id": purchase_request.branch_id,
                "name": purchase_request.branch.name,
            }
            if purchase_request.branch_id
            else None
        ),
        "requested_quantity": str(
            purchase_request.requested_quantity
        ),
        "converted_quantity": str(
            purchase_request.converted_quantity
        ),
        "remaining_quantity": str(
            purchase_request.remaining_quantity
        ),
        "notes": purchase_request.notes,
        "extra_data": (
            purchase_request.extra_data or {}
        ),
        "submitted_at": (
            purchase_request.submitted_at.isoformat()
            if purchase_request.submitted_at
            else None
        ),
        "approved_at": (
            purchase_request.approved_at.isoformat()
            if purchase_request.approved_at
            else None
        ),
        "rejected_at": (
            purchase_request.rejected_at.isoformat()
            if purchase_request.rejected_at
            else None
        ),
        "rejection_reason": (
            purchase_request.rejection_reason
        ),
        "cancelled_at": (
            purchase_request.cancelled_at.isoformat()
            if purchase_request.cancelled_at
            else None
        ),
        "cancellation_reason": (
            purchase_request.cancellation_reason
        ),
        "allowed_actions": {
            "update": purchase_request.can_be_edited,
            "submit": purchase_request.can_be_submitted,
            "approve": purchase_request.can_be_approved,
            "reject": purchase_request.can_be_rejected,
            "cancel": purchase_request.can_be_cancelled,
            "convert_to_order": (
                purchase_request.can_be_converted
                and purchase_request.remaining_quantity
                > Decimal("0.0000")
            ),
        },
        "created_at": (
            purchase_request.created_at.isoformat()
            if purchase_request.created_at
            else None
        ),
        "updated_at": (
            purchase_request.updated_at.isoformat()
            if purchase_request.updated_at
            else None
        ),
    }

    if include_items:
        result["items"] = [
            serialize_purchase_request_item(item)
            for item in (
                purchase_request.items
                .select_related(
                    "item",
                    "item__unit",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return result


# ============================================================
# Purchase Orders Services Foundation
# ============================================================


def get_company_purchase_order_prefix(
    company: Company,
) -> str:
    """
    Resolve purchase order number prefix.
    """
    settings_obj = getattr(
        company,
        "operational_settings",
        None,
    )

    configured_prefix = (
        getattr(
            settings_obj,
            "purchase_order_prefix",
            "",
        )
        if settings_obj
        else ""
    )

    return normalize_text(
        configured_prefix
    ) or "PO"


def generate_purchase_order_number(
    company: Company,
) -> str:
    """
    Generate a company-scoped purchase order number.

    Format:
    PO-YYYYMMDD-000001
    """
    today = timezone.localdate()
    prefix = get_company_purchase_order_prefix(
        company
    )
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_order = (
        PurchaseOrder.objects
        .filter(
            company=company,
            order_number__startswith=starts_with,
        )
        .order_by("-order_number")
        .first()
    )

    next_number = 1

    if last_order:
        try:
            next_number = (
                int(
                    last_order.order_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = 1

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def get_purchase_order_for_company(
    *,
    company: Company,
    order_id: int | str,
) -> PurchaseOrder:
    """
    Return one company-scoped purchase order.
    """
    try:
        return (
            PurchaseOrder.objects
            .select_related(
                "company",
                "branch",
                "supplier",
            )
            .get(
                id=order_id,
                company=company,
            )
        )
    except PurchaseOrder.DoesNotExist as exc:
        raise ValidationError(
            {
                "purchase_order":
                    "Purchase order was not found "
                    "for this company."
            }
        ) from exc


def get_approved_purchase_order_for_company(
    *,
    company: Company,
    order_id: int | str,
) -> PurchaseOrder:
    """
    Return a purchase order eligible for receiving or billing.
    """
    order = get_purchase_order_for_company(
        company=company,
        order_id=order_id,
    )

    if order.status not in [
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.BILLED,
    ]:
        raise ValidationError(
            {
                "purchase_order":
                    "Purchase order must be approved "
                    "before receiving or billing."
            }
        )

    return order


def get_purchase_order_item_for_company(
    *,
    company: Company,
    order: PurchaseOrder,
    order_item_id: int | str,
) -> PurchaseOrderItem:
    """
    Return one purchase order item for the same company and order.
    """
    try:
        return (
            PurchaseOrderItem.objects
            .select_related(
                "order",
                "company",
                "item",
            )
            .get(
                id=order_item_id,
                company=company,
                order=order,
            )
        )
    except PurchaseOrderItem.DoesNotExist as exc:
        raise ValidationError(
            {
                "purchase_order_item":
                    "Purchase order item was not found "
                    "for this order and company."
            }
        ) from exc


def build_purchase_order_item(
    *,
    order: PurchaseOrder,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
) -> PurchaseOrderItem:
    """
    Build and save one draft purchase order item.
    """
    if not order.can_be_edited:
        raise ValidationError(
            "Only draft purchase orders can be edited."
        )

    item_id = (
        payload.get("item_id")
        or payload.get("item")
    )

    if not item_id:
        raise ValidationError(
            {
                "item":
                    "Catalog item is required."
            }
        )

    item = get_purchase_item_for_company(
        company,
        item_id,
    )
    default_price = get_item_purchase_price(
        item
    )

    order_item = PurchaseOrderItem(
        order=order,
        company=company,
        item=item,
        line_number=int(
            payload.get("line_number")
            or line_number
        ),
        quantity=normalize_decimal(
            payload.get(
                "quantity",
                Decimal("1.0000"),
            ),
            field_name="quantity",
            default=Decimal("1.0000"),
        ),
        unit_price=normalize_decimal(
            payload.get(
                "unit_price",
                default_price,
            ),
            field_name="unit_price",
            default=default_price,
        ),
        discount_amount=normalize_decimal(
            payload.get(
                "discount_amount",
                MONEY_ZERO,
            ),
            field_name="discount_amount",
            default=MONEY_ZERO,
        ),
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
    )
    order_item.save()

    return order_item


@transaction.atomic
def create_purchase_order(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> PurchaseOrder:
    """
    Create a draft purchase order with items.
    """
    if not company:
        raise ValidationError(
            "Company is required."
        )

    supplier_id = (
        payload.get("supplier_id")
        or payload.get("supplier")
    )

    if not supplier_id:
        raise ValidationError(
            {
                "supplier":
                    "Supplier is required."
            }
        )

    supplier = get_supplier_for_company(
        company,
        supplier_id,
    )
    branch = get_branch_for_company(
        company,
        payload.get("branch_id")
        or payload.get("branch"),
    )

    items_payload = payload.get("items") or []

    if (
        not isinstance(items_payload, list)
        or not items_payload
    ):
        raise ValidationError(
            {
                "items":
                    "At least one purchase order "
                    "item is required."
            }
        )

    order_date = normalize_date(
        payload.get("order_date")
        or timezone.localdate(),
        field_name="order_date",
    )
    expected_date = normalize_date(
        payload.get("expected_date"),
        field_name="expected_date",
    )

    order = PurchaseOrder(
        company=company,
        branch=branch,
        supplier=supplier,
        order_number=(
            normalize_text(
                payload.get("order_number")
            )
            or generate_purchase_order_number(
                company
            )
        ),
        supplier_reference=normalize_text(
            payload.get("supplier_reference")
        ),
        order_date=(
            order_date
            or timezone.localdate()
        ),
        expected_date=expected_date,
        status=PurchaseOrderStatus.DRAFT,
        currency_code=normalize_text(
            payload.get("currency_code")
            or company.currency_code
            or "SAR"
        ).upper(),
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
        created_by=user,
        updated_by=user,
    )
    order.full_clean()
    order.save()

    for index, item_payload in enumerate(
        items_payload,
        start=1,
    ):
        if not isinstance(item_payload, dict):
            raise ValidationError(
                {
                    "items":
                        "Each purchase order item "
                        "must be an object."
                }
            )

        build_purchase_order_item(
            order=order,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    order.recalculate_totals(save=True)
    order.refresh_from_db()

    return order


@transaction.atomic
def update_purchase_order(
    *,
    order: PurchaseOrder,
    payload: dict[str, Any],
    user=None,
) -> PurchaseOrder:
    """
    Update a draft purchase order.

    When items are included, existing lines are replaced.
    """
    locked_order = (
        PurchaseOrder.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "supplier",
        )
        .get(pk=order.pk)
    )

    if not locked_order.can_be_edited:
        raise ValidationError(
            "Only draft purchase orders can be updated."
        )

    company = locked_order.company

    if "supplier_id" in payload or "supplier" in payload:
        locked_order.supplier = (
            get_supplier_for_company(
                company,
                payload.get("supplier_id")
                or payload.get("supplier"),
            )
        )

    if "branch_id" in payload or "branch" in payload:
        locked_order.branch = (
            get_branch_for_company(
                company,
                payload.get("branch_id")
                or payload.get("branch"),
            )
        )

    if "order_number" in payload:
        locked_order.order_number = normalize_text(
            payload.get("order_number")
        )

    if "supplier_reference" in payload:
        locked_order.supplier_reference = (
            normalize_text(
                payload.get("supplier_reference")
            )
        )

    if "order_date" in payload:
        locked_order.order_date = (
            normalize_date(
                payload.get("order_date"),
                field_name="order_date",
            )
            or locked_order.order_date
        )

    if "expected_date" in payload:
        locked_order.expected_date = (
            normalize_date(
                payload.get("expected_date"),
                field_name="expected_date",
            )
        )

    if "currency_code" in payload:
        locked_order.currency_code = normalize_text(
            payload.get("currency_code")
            or "SAR"
        ).upper()

    if "notes" in payload:
        locked_order.notes = normalize_text(
            payload.get("notes")
        )

    if isinstance(
        payload.get("extra_data"),
        dict,
    ):
        locked_order.extra_data = (
            payload["extra_data"]
        )

    locked_order.updated_by = user
    locked_order.full_clean()
    locked_order.save()

    if "items" in payload:
        items_payload = payload.get("items") or []

        if (
            not isinstance(items_payload, list)
            or not items_payload
        ):
            raise ValidationError(
                {
                    "items":
                        "At least one purchase order "
                        "item is required."
                }
            )

        locked_order.items.all().delete()

        for index, item_payload in enumerate(
            items_payload,
            start=1,
        ):
            if not isinstance(item_payload, dict):
                raise ValidationError(
                    {
                        "items":
                            "Each purchase order item "
                            "must be an object."
                    }
                )

            build_purchase_order_item(
                order=locked_order,
                company=company,
                payload=item_payload,
                line_number=index,
            )

    locked_order.recalculate_totals(save=True)
    locked_order.refresh_from_db()

    return locked_order


@transaction.atomic
def approve_purchase_order(
    *,
    order: PurchaseOrder,
    user=None,
) -> PurchaseOrder:
    """
    Approve a draft purchase order.
    """
    locked_order = (
        PurchaseOrder.objects
        .select_for_update()
        .select_related(
            "company",
            "supplier",
            "branch",
        )
        .get(pk=order.pk)
    )

    locked_order.approve(user=user)
    locked_order.refresh_from_db()

    return locked_order


@transaction.atomic
def cancel_purchase_order(
    *,
    order: PurchaseOrder,
    reason: str = "",
    user=None,
) -> PurchaseOrder:
    """
    Cancel an eligible purchase order.
    """
    locked_order = (
        PurchaseOrder.objects
        .select_for_update()
        .get(pk=order.pk)
    )

    source_request_id = (
        locked_order.purchase_request_id
    )

    locked_order.cancel(
        reason=normalize_text(reason),
        user=user,
    )
    locked_order.refresh_from_db()

    if source_request_id:
        source_request = (
            PurchaseRequest.objects
            .select_for_update()
            .filter(
                pk=source_request_id,
                company=locked_order.company,
            )
            .first()
        )

        if source_request:
            source_request.refresh_conversion_status(
                save=True
            )

    return locked_order


def validate_purchase_order_bill_item_quantity(
    *,
    order_item: PurchaseOrderItem,
    quantity: Decimal,
) -> None:
    """
    Prevent billing above the remaining ordered quantity.
    """
    quantity = quantize_quantity(quantity)

    if quantity <= Decimal("0.0000"):
        raise ValidationError(
            {
                "quantity":
                    "Bill quantity must be greater than zero."
            }
        )

    if quantity > order_item.remaining_to_bill_quantity:
        raise ValidationError(
            {
                "quantity":
                    "Bill quantity cannot exceed "
                    "the remaining purchase order quantity."
            }
        )


def build_purchase_bill_item_from_order(
    *,
    bill: PurchaseBill,
    order_item: PurchaseOrderItem,
    quantity: Decimal,
    line_number: int,
) -> PurchaseBillItem:
    """
    Create one purchase bill item from an order item.
    """
    validate_purchase_order_bill_item_quantity(
        order_item=order_item,
        quantity=quantity,
    )

    ratio = (
        quantity / order_item.quantity
        if order_item.quantity > Decimal("0.0000")
        else Decimal("0")
    )

    discount_amount = quantize_money(
        order_item.discount_amount * ratio
    )

    bill_item = PurchaseBillItem(
        bill=bill,
        company=bill.company,
        item=order_item.item,
        purchase_order_item=order_item,
        line_number=line_number,
        quantity=quantity,
        unit_price=order_item.unit_price,
        discount_amount=discount_amount,
        notes=order_item.notes,
        extra_data={
            **(order_item.extra_data or {}),
            "source": "purchase_order",
            "purchase_order_id": order_item.order_id,
            "purchase_order_item_id": order_item.id,
        },
    )
    bill_item.save()

    return bill_item


@transaction.atomic
def create_purchase_bill_from_order(
    *,
    company: Company,
    order: PurchaseOrder,
    payload: dict[str, Any] | None = None,
    user=None,
) -> PurchaseBill:
    """
    Create a draft supplier bill from remaining order quantities.

    Optional payload items:
    [
        {
            "purchase_order_item_id": 1,
            "quantity": "2.0000"
        }
    ]

    When items are omitted, all remaining quantities are billed.
    """
    payload = payload or {}

    locked_order = (
        PurchaseOrder.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "supplier",
        )
        .filter(
            pk=order.pk,
            company=company,
        )
        .first()
    )

    if not locked_order:
        raise ValidationError(
            {
                "purchase_order":
                    "Purchase order was not found "
                    "for the current company."
            }
        )

    if locked_order.status not in [
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        PurchaseOrderStatus.RECEIVED,
    ]:
        raise ValidationError(
            {
                "purchase_order":
                    "Purchase order is not eligible "
                    "for bill conversion."
            }
        )

    bill_date = normalize_date(
        payload.get("bill_date")
        or timezone.localdate(),
        field_name="bill_date",
    )
    due_date = normalize_date(
        payload.get("due_date"),
        field_name="due_date",
    )

    bill = PurchaseBill(
        company=company,
        branch=locked_order.branch,
        supplier=locked_order.supplier,
        purchase_order=locked_order,
        status=PurchaseBillStatus.DRAFT,
        bill_number=(
            normalize_text(
                payload.get("bill_number")
            )
            or generate_purchase_bill_number(
                company
            )
        ),
        supplier_bill_number=normalize_text(
            payload.get("supplier_bill_number")
        ),
        bill_date=(
            bill_date
            or timezone.localdate()
        ),
        due_date=due_date,
        currency_code=locked_order.currency_code,
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data={
            **(
                payload.get("extra_data")
                if isinstance(
                    payload.get("extra_data"),
                    dict,
                )
                else {}
            ),
            "source": "purchase_order",
            "purchase_order_id": locked_order.id,
        },
        created_by=user,
        updated_by=user,
    )
    bill.full_clean()
    bill.save()

    requested_items = payload.get("items")

    if requested_items in [None, []]:
        source_items = []

        for order_item in (
            locked_order.items
            .select_related("item")
            .order_by("line_number", "id")
        ):
            remaining = (
                order_item.remaining_to_bill_quantity
            )

            if remaining > Decimal("0.0000"):
                source_items.append(
                    {
                        "order_item": order_item,
                        "quantity": remaining,
                    }
                )
    else:
        if not isinstance(requested_items, list):
            raise ValidationError(
                {
                    "items":
                        "Purchase bill items must be a list."
                }
            )

        source_items = []

        for item_payload in requested_items:
            if not isinstance(item_payload, dict):
                raise ValidationError(
                    {
                        "items":
                            "Each purchase bill item "
                            "must be an object."
                    }
                )

            order_item_id = (
                item_payload.get(
                    "purchase_order_item_id"
                )
                or item_payload.get(
                    "order_item_id"
                )
                or item_payload.get(
                    "purchase_order_item"
                )
            )

            if not order_item_id:
                raise ValidationError(
                    {
                        "purchase_order_item":
                            "Purchase order item is required."
                    }
                )

            order_item = (
                get_purchase_order_item_for_company(
                    company=company,
                    order=locked_order,
                    order_item_id=order_item_id,
                )
            )

            quantity = quantize_quantity(
                normalize_decimal(
                    item_payload.get("quantity"),
                    field_name="quantity",
                    default=(
                        order_item
                        .remaining_to_bill_quantity
                    ),
                )
            )

            source_items.append(
                {
                    "order_item": order_item,
                    "quantity": quantity,
                }
            )

    if not source_items:
        raise ValidationError(
            {
                "items":
                    "Purchase order has no remaining "
                    "quantity available for billing."
            }
        )

    for index, source in enumerate(
        source_items,
        start=1,
    ):
        build_purchase_bill_item_from_order(
            bill=bill,
            order_item=source["order_item"],
            quantity=source["quantity"],
            line_number=index,
        )

    bill.recalculate_totals(save=True)
    locked_order.refresh_fulfillment_status(
        save=True
    )
    bill.refresh_from_db()

    return bill


def serialize_purchase_order_item(
    item: PurchaseOrderItem,
) -> dict[str, Any]:
    """
    Serialize one purchase order item.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "catalog_item_id": item.item_id,
        "purchase_request_item_id": (
            item.purchase_request_item_id
        ),
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": (
            item.item_name_ar_snapshot
        ),
        "item_name_en": (
            item.item_name_en_snapshot
        ),
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "received_quantity": str(
            item.received_quantity
        ),
        "billed_quantity": str(
            item.billed_quantity
        ),
        "remaining_to_receive_quantity": str(
            item.remaining_to_receive_quantity
        ),
        "remaining_to_bill_quantity": str(
            item.remaining_to_bill_quantity
        ),
        "unit_price": str(item.unit_price),
        "discount_amount": str(
            item.discount_amount
        ),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "subtotal_amount": str(
            item.subtotal_amount
        ),
        "taxable_amount": str(
            item.taxable_amount
        ),
        "tax_amount": str(item.tax_amount),
        "total_amount": str(
            item.total_amount
        ),
        "notes": item.notes,
        "extra_data": item.extra_data or {},
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


def serialize_purchase_order(
    order: PurchaseOrder,
    *,
    include_items: bool = True,
) -> dict[str, Any]:
    """
    Serialize a purchase order for company APIs.
    """
    result = {
        "id": order.id,
        "order_number": order.order_number,
        "supplier_reference": (
            order.supplier_reference
        ),
        "order_date": (
            order.order_date.isoformat()
            if order.order_date
            else None
        ),
        "expected_date": (
            order.expected_date.isoformat()
            if order.expected_date
            else None
        ),
        "status": order.status,
        "currency_code": order.currency_code,
        "company": {
            "id": order.company_id,
            "name": order.company.name,
        },
        "branch": (
            {
                "id": order.branch_id,
                "name": order.branch.name,
            }
            if order.branch_id
            else None
        ),
        "supplier": {
            "id": order.supplier_id,
            "display_name": (
                order.supplier.display_name
            ),
        },
        "purchase_request": (
            {
                "id": order.purchase_request_id,
                "request_number": (
                    order.purchase_request.request_number
                ),
                "status": (
                    order.purchase_request.status
                ),
            }
            if order.purchase_request_id
            else None
        ),
        "ordered_quantity": str(
            order.ordered_quantity
        ),
        "received_quantity": str(
            order.received_quantity
        ),
        "billed_quantity": str(
            order.billed_quantity
        ),
        "subtotal_amount": str(
            order.subtotal_amount
        ),
        "discount_amount": str(
            order.discount_amount
        ),
        "taxable_amount": str(
            order.taxable_amount
        ),
        "tax_amount": str(
            order.tax_amount
        ),
        "total_amount": str(
            order.total_amount
        ),
        "notes": order.notes,
        "extra_data": order.extra_data or {},
        "approved_at": (
            order.approved_at.isoformat()
            if order.approved_at
            else None
        ),
        "cancelled_at": (
            order.cancelled_at.isoformat()
            if order.cancelled_at
            else None
        ),
        "cancellation_reason": (
            order.cancellation_reason
        ),
        "allowed_actions": {
            "update": order.can_be_edited,
            "approve": order.can_be_approved,
            "cancel": order.can_be_cancelled,
            "create_bill": order.status in [
                PurchaseOrderStatus.APPROVED,
                PurchaseOrderStatus.PARTIALLY_RECEIVED,
                PurchaseOrderStatus.RECEIVED,
            ],
        },
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
        result["items"] = [
            serialize_purchase_order_item(item)
            for item in (
                order.items
                .select_related("item")
                .order_by("line_number", "id")
            )
        ]

    return result


# ============================================================
# Purchase Receiving Services Foundation
# ============================================================


def get_company_purchase_receipt_prefix(
    company: Company,
) -> str:
    """
    Resolve purchase receipt number prefix.
    """
    settings_obj = getattr(
        company,
        "operational_settings",
        None,
    )

    configured_prefix = (
        getattr(
            settings_obj,
            "purchase_receipt_prefix",
            "",
        )
        if settings_obj
        else ""
    )

    return normalize_text(
        configured_prefix
    ) or "PREC"


def generate_purchase_receipt_number(
    company: Company,
) -> str:
    """
    Generate a company-scoped purchase receipt number.

    Format:
    PREC-YYYYMMDD-000001
    """
    today = timezone.localdate()
    prefix = get_company_purchase_receipt_prefix(
        company
    )
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_receipt = (
        PurchaseReceipt.objects
        .filter(
            company=company,
            receipt_number__startswith=starts_with,
        )
        .order_by("-receipt_number")
        .first()
    )

    next_number = 1

    if last_receipt:
        try:
            next_number = (
                int(
                    last_receipt.receipt_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = 1

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def get_active_warehouse_for_company(
    *,
    company: Company,
    warehouse_id: int | str,
) -> Warehouse:
    """
    Return an active warehouse owned by the company.
    """
    try:
        warehouse = (
            Warehouse.objects
            .select_related(
                "company",
                "branch",
            )
            .get(
                id=warehouse_id,
                company=company,
                status=WarehouseStatus.ACTIVE,
                is_active=True,
            )
        )
    except Warehouse.DoesNotExist as exc:
        raise ValidationError(
            {
                "warehouse":
                    "Active warehouse was not found "
                    "for this company."
            }
        ) from exc

    return warehouse


def get_purchase_bill_item_for_receipt(
    *,
    company: Company,
    bill: PurchaseBill,
    bill_item_id: int | str,
) -> PurchaseBillItem:
    """
    Return a stock-tracked purchase bill item
    eligible for receiving.
    """
    try:
        bill_item = (
            PurchaseBillItem.objects
            .select_related(
                "bill",
                "company",
                "item",
            )
            .get(
                id=bill_item_id,
                company=company,
                bill=bill,
            )
        )
    except PurchaseBillItem.DoesNotExist as exc:
        raise ValidationError(
            {
                "bill_item":
                    "Purchase bill item was not found "
                    "for this bill and company."
            }
        ) from exc

    item = bill_item.item

    if (
        item.item_type != CatalogItemType.PRODUCT
        or not bool(
            getattr(
                item,
                "track_inventory",
                False,
            )
        )
    ):
        raise ValidationError(
            {
                "bill_item":
                    "Only stock-tracked product items "
                    "can be received into inventory."
            }
        )

    if bill_item.receivable_quantity <= Decimal("0.0000"):
        raise ValidationError(
            {
                "bill_item":
                    "This purchase bill item is already "
                    "fully received."
            }
        )

    return bill_item


def build_purchase_receipt_item(
    *,
    receipt: PurchaseReceipt,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
) -> PurchaseReceiptItem:
    """
    Build and save one draft purchase receipt item.
    """
    if not receipt.can_be_edited:
        raise ValidationError(
            "Only draft purchase receipts can be edited."
        )

    bill_item_id = (
        payload.get("bill_item_id")
        or payload.get("bill_item")
    )

    if not bill_item_id:
        raise ValidationError(
            {
                "bill_item":
                    "Purchase bill item is required."
            }
        )

    bill_item = get_purchase_bill_item_for_receipt(
        company=company,
        bill=receipt.bill,
        bill_item_id=bill_item_id,
    )

    quantity = quantize_quantity(
        normalize_decimal(
            payload.get("quantity"),
            field_name="quantity",
            default=Decimal("0.0000"),
        )
    )

    if quantity <= Decimal("0.0000"):
        raise ValidationError(
            {
                "quantity":
                    "Receipt quantity must be greater "
                    "than zero."
            }
        )

    if quantity > bill_item.receivable_quantity:
        raise ValidationError(
            {
                "quantity":
                    "Receipt quantity cannot exceed "
                    "the remaining bill quantity."
            }
        )

    receipt_item = PurchaseReceiptItem(
        receipt=receipt,
        company=company,
        bill_item=bill_item,
        item=bill_item.item,
        line_number=int(
            payload.get("line_number")
            or line_number
        ),
        quantity=quantity,
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
    )

    receipt_item.save()

    return receipt_item


@transaction.atomic
def create_purchase_receipt(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> PurchaseReceipt:
    """
    Create a draft purchase receipt.

    When items are omitted or receive_all=True, all remaining
    stock-tracked bill quantities are added automatically.
    """
    if not company:
        raise ValidationError(
            "Company is required."
        )

    bill_id = (
        payload.get("bill_id")
        or payload.get("bill")
    )

    if not bill_id:
        raise ValidationError(
            {
                "bill":
                    "Purchase bill is required."
            }
        )

    bill = get_posted_purchase_bill_for_company(
        company=company,
        bill_id=bill_id,
    )

    warehouse_id = (
        payload.get("warehouse_id")
        or payload.get("warehouse")
    )

    if not warehouse_id:
        raise ValidationError(
            {
                "warehouse":
                    "Warehouse is required."
            }
        )

    warehouse = get_active_warehouse_for_company(
        company=company,
        warehouse_id=warehouse_id,
    )

    if (
        bill.branch_id
        and warehouse.branch_id
        and bill.branch_id != warehouse.branch_id
    ):
        raise ValidationError(
            {
                "warehouse":
                    "Warehouse branch must match "
                    "the purchase bill branch."
            }
        )

    receipt_date = normalize_date(
        payload.get("receipt_date")
        or timezone.localdate(),
        field_name="receipt_date",
    )

    receipt = PurchaseReceipt(
        company=company,
        branch=bill.branch,
        supplier=bill.supplier,
        bill=bill,
        warehouse=warehouse,
        receipt_number=(
            normalize_text(
                payload.get("receipt_number")
            )
            or generate_purchase_receipt_number(
                company
            )
        ),
        receipt_date=(
            receipt_date
            or timezone.localdate()
        ),
        status=PurchaseReceiptStatus.DRAFT,
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
        created_by=user,
        updated_by=user,
    )

    receipt.full_clean()
    receipt.save()

    items_payload = payload.get("items")
    receive_all = bool(
        payload.get("receive_all")
    )

    if receive_all or items_payload in [None, []]:
        items_payload = []

        bill_items = (
            bill.items
            .select_related("item")
            .order_by(
                "line_number",
                "id",
            )
        )

        for bill_item in bill_items:
            item = bill_item.item

            if (
                item.item_type == CatalogItemType.PRODUCT
                and bool(
                    getattr(
                        item,
                        "track_inventory",
                        False,
                    )
                )
                and bill_item.receivable_quantity
                > Decimal("0.0000")
            ):
                items_payload.append(
                    {
                        "bill_item_id": bill_item.id,
                        "quantity": str(
                            bill_item.receivable_quantity
                        ),
                    }
                )

    if (
        not isinstance(items_payload, list)
        or not items_payload
    ):
        raise ValidationError(
            {
                "items":
                    "At least one receivable inventory "
                    "item is required."
            }
        )

    for index, item_payload in enumerate(
        items_payload,
        start=1,
    ):
        if not isinstance(item_payload, dict):
            raise ValidationError(
                {
                    "items":
                        "Each purchase receipt item "
                        "must be an object."
                }
            )

        build_purchase_receipt_item(
            receipt=receipt,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    receipt.refresh_from_db()

    return receipt


@transaction.atomic
def update_purchase_receipt(
    *,
    receipt: PurchaseReceipt,
    payload: dict[str, Any],
    user=None,
) -> PurchaseReceipt:
    """
    Update a draft purchase receipt.
    """
    locked_receipt = (
        PurchaseReceipt.objects
        .select_for_update()
        .select_related(
            "company",
            "bill",
            "warehouse",
        )
        .get(pk=receipt.pk)
    )

    if not locked_receipt.can_be_edited:
        raise ValidationError(
            "Only draft purchase receipts can be updated."
        )

    if "receipt_number" in payload:
        locked_receipt.receipt_number = (
            normalize_text(
                payload.get("receipt_number")
            )
        )

    if "receipt_date" in payload:
        locked_receipt.receipt_date = (
            normalize_date(
                payload.get("receipt_date"),
                field_name="receipt_date",
            )
            or locked_receipt.receipt_date
        )

    if "warehouse_id" in payload or "warehouse" in payload:
        warehouse_id = (
            payload.get("warehouse_id")
            or payload.get("warehouse")
        )

        warehouse = get_active_warehouse_for_company(
            company=locked_receipt.company,
            warehouse_id=warehouse_id,
        )

        if (
            locked_receipt.bill.branch_id
            and warehouse.branch_id
            and locked_receipt.bill.branch_id
            != warehouse.branch_id
        ):
            raise ValidationError(
                {
                    "warehouse":
                        "Warehouse branch must match "
                        "the purchase bill branch."
                }
            )

        locked_receipt.warehouse = warehouse

    if "notes" in payload:
        locked_receipt.notes = normalize_text(
            payload.get("notes")
        )

    if isinstance(
        payload.get("extra_data"),
        dict,
    ):
        locked_receipt.extra_data = (
            payload["extra_data"]
        )

    locked_receipt.updated_by = user
    locked_receipt.full_clean()
    locked_receipt.save()

    if "items" in payload:
        items_payload = payload.get("items") or []

        if (
            not isinstance(items_payload, list)
            or not items_payload
        ):
            raise ValidationError(
                {
                    "items":
                        "At least one purchase receipt "
                        "item is required."
                }
            )

        locked_receipt.items.all().delete()

        for index, item_payload in enumerate(
            items_payload,
            start=1,
        ):
            if not isinstance(item_payload, dict):
                raise ValidationError(
                    {
                        "items":
                            "Each purchase receipt item "
                            "must be an object."
                    }
                )

            build_purchase_receipt_item(
                receipt=locked_receipt,
                company=locked_receipt.company,
                payload=item_payload,
                line_number=index,
            )

    locked_receipt.refresh_from_db()

    return locked_receipt


def get_existing_purchase_receipt_stock_movement(
    receipt_item: PurchaseReceiptItem,
) -> StockMovement | None:
    """
    Return the stock movement already linked to a receipt item.
    """
    if receipt_item.stock_movement_id:
        return receipt_item.stock_movement

    return (
        StockMovement.objects
        .filter(
            company=receipt_item.company,
            reference_type=(
                PURCHASE_RECEIPT_STOCK_REFERENCE
            ),
            reference_id=receipt_item.id,
        )
        .exclude(
            status=StockMovementStatus.CANCELLED,
        )
        .order_by("id")
        .first()
    )


def post_purchase_receipt_item_to_inventory(
    *,
    receipt_item: PurchaseReceiptItem,
    user=None,
) -> StockMovement:
    """
    Create one posted inventory receipt movement.

    No separate accounting entry is created because the
    purchase bill already created the financial entry.
    """
    existing = (
        get_existing_purchase_receipt_stock_movement(
            receipt_item
        )
    )

    if existing:
        if existing.status != StockMovementStatus.POSTED:
            raise ValidationError(
                {
                    "inventory":
                        "Existing receipt stock movement "
                        "is not posted."
                }
            )

        if not receipt_item.stock_movement_id:
            PurchaseReceiptItem.objects.filter(
                pk=receipt_item.pk,
                stock_movement__isnull=True,
            ).update(
                stock_movement=existing,
                updated_at=timezone.now(),
            )
            receipt_item.stock_movement = existing

        return existing

    movement = create_stock_movement(
        company=receipt_item.company,
        warehouse=receipt_item.receipt.warehouse,
        item=receipt_item.item,
        movement_type=StockMovementType.IN,
        quantity=receipt_item.quantity,
        unit_cost=receipt_item.unit_cost,
        movement_date=(
            receipt_item.receipt.receipt_date
        ),
        reference_type=(
            PURCHASE_RECEIPT_STOCK_REFERENCE
        ),
        reference_id=receipt_item.id,
        reference_number=(
            receipt_item.receipt.receipt_number
        ),
        notes=(
            "Purchase bill inventory receipt "
            f"{receipt_item.receipt.receipt_number}"
        ),
        extra_data={
            "source": "purchase_receipt",
            "purchase_receipt_id": (
                receipt_item.receipt_id
            ),
            "purchase_receipt_item_id": (
                receipt_item.id
            ),
            "purchase_bill_id": (
                receipt_item.bill_item.bill_id
            ),
            "purchase_bill_item_id": (
                receipt_item.bill_item_id
            ),
        },
        user=user,
        post_immediately=True,
        post_accounting=False,
    )

    PurchaseReceiptItem.objects.filter(
        pk=receipt_item.pk,
        stock_movement__isnull=True,
    ).update(
        stock_movement=movement,
        updated_at=timezone.now(),
    )
    receipt_item.stock_movement = movement

    return movement


@transaction.atomic
def post_purchase_receipt(
    *,
    receipt: PurchaseReceipt,
    user=None,
) -> PurchaseReceipt:
    """
    Atomically post a purchase receipt and increase inventory.

    Safety:
    - Locks receipt and bill items.
    - Prevents receipt quantities above remaining bill quantity.
    - Prevents duplicate stock movements.
    - Supports partial and full receiving.
    """
    locked_receipt = (
        PurchaseReceipt.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
            "warehouse",
        )
        .get(pk=receipt.pk)
    )

    if locked_receipt.status == PurchaseReceiptStatus.POSTED:
        return locked_receipt

    if not locked_receipt.can_be_posted:
        raise ValidationError(
            "Only draft purchase receipts can be posted."
        )

    if locked_receipt.bill.status != PurchaseBillStatus.POSTED:
        raise ValidationError(
            {
                "bill":
                    "Linked purchase bill must remain posted."
            }
        )

    locked_items = list(
        locked_receipt.items
        .select_for_update()
        .select_related(
            "receipt",
            "receipt__warehouse",
            "bill_item",
            "bill_item__bill",
            "item",
            "stock_movement",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not locked_items:
        raise ValidationError(
            "Cannot post a purchase receipt without items."
        )

    for receipt_item in locked_items:
        bill_item = (
            PurchaseBillItem.objects
            .select_for_update()
            .get(pk=receipt_item.bill_item_id)
        )

        received_before = (
            PurchaseReceiptItem.objects
            .filter(
                bill_item=bill_item,
                receipt__status=(
                    PurchaseReceiptStatus.POSTED
                ),
            )
            .exclude(pk=receipt_item.pk)
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        received_before = quantize_quantity(
            received_before or Decimal("0.0000")
        )

        remaining = quantize_quantity(
            bill_item.quantity
            - received_before
        )

        if receipt_item.quantity > remaining:
            raise ValidationError(
                {
                    "quantity":
                        "One or more receipt quantities "
                        "exceed the remaining purchase "
                        "bill quantities."
                }
            )

        post_purchase_receipt_item_to_inventory(
            receipt_item=receipt_item,
            user=user,
        )

    locked_receipt.mark_posted(
        user=user
    )
    locked_receipt.refresh_from_db()

    return locked_receipt


@transaction.atomic
def cancel_purchase_receipt(
    *,
    receipt: PurchaseReceipt,
    reason: str = "",
    user=None,
) -> PurchaseReceipt:
    """
    Cancel a draft purchase receipt.
    """
    locked_receipt = (
        PurchaseReceipt.objects
        .select_for_update()
        .get(pk=receipt.pk)
    )

    locked_receipt.cancel(
        reason=normalize_text(reason),
        user=user,
    )
    locked_receipt.refresh_from_db()

    return locked_receipt


def serialize_purchase_receipt_item(
    item: PurchaseReceiptItem,
) -> dict[str, Any]:
    """
    Serialize one purchase receipt item.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "bill_item_id": item.bill_item_id,
        "catalog_item_id": item.item_id,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": (
            item.item_name_ar_snapshot
        ),
        "item_name_en": (
            item.item_name_en_snapshot
        ),
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "unit_cost": str(item.unit_cost),
        "stock_movement_id": (
            item.stock_movement_id
        ),
        "original_bill_quantity": str(
            item.bill_item.quantity
        ),
        "received_quantity": str(
            item.bill_item.received_quantity
        ),
        "remaining_receivable_quantity": str(
            item.bill_item.receivable_quantity
        ),
        "notes": item.notes,
        "extra_data": item.extra_data or {},
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


def serialize_purchase_receipt(
    receipt: PurchaseReceipt,
    *,
    include_items: bool = True,
) -> dict[str, Any]:
    """
    Serialize a purchase receipt for company APIs.
    """
    result = {
        "id": receipt.id,
        "receipt_number": receipt.receipt_number,
        "receipt_date": (
            receipt.receipt_date.isoformat()
            if receipt.receipt_date
            else None
        ),
        "status": receipt.status,
        "total_quantity": str(
            receipt.total_quantity
        ),
        "company": {
            "id": receipt.company_id,
            "name": receipt.company.name,
        },
        "branch": (
            {
                "id": receipt.branch_id,
                "name": receipt.branch.name,
            }
            if receipt.branch_id
            else None
        ),
        "supplier": {
            "id": receipt.supplier_id,
            "display_name": (
                receipt.supplier.display_name
            ),
        },
        "bill": {
            "id": receipt.bill_id,
            "bill_number": (
                receipt.bill.bill_number
            ),
            "supplier_bill_number": (
                receipt.bill.supplier_bill_number
            ),
            "bill_date": (
                receipt.bill.bill_date.isoformat()
            ),
        },
        "warehouse": {
            "id": receipt.warehouse_id,
            "code": receipt.warehouse.code,
            "name": receipt.warehouse.display_name,
        },
        "notes": receipt.notes,
        "extra_data": receipt.extra_data or {},
        "posted_at": (
            receipt.posted_at.isoformat()
            if receipt.posted_at
            else None
        ),
        "cancelled_at": (
            receipt.cancelled_at.isoformat()
            if receipt.cancelled_at
            else None
        ),
        "cancellation_reason": (
            receipt.cancellation_reason
        ),
        "allowed_actions": {
            "update": receipt.can_be_edited,
            "post": receipt.can_be_posted,
            "cancel": receipt.can_be_cancelled,
        },
        "created_at": (
            receipt.created_at.isoformat()
            if receipt.created_at
            else None
        ),
        "updated_at": (
            receipt.updated_at.isoformat()
            if receipt.updated_at
            else None
        ),
    }

    if include_items:
        result["items"] = [
            serialize_purchase_receipt_item(item)
            for item in (
                receipt.items
                .select_related(
                    "bill_item",
                    "item",
                    "stock_movement",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return result


# ============================================================
# Purchase Returns Services Foundation
# ============================================================


def get_company_purchase_return_prefix(
    company: Company,
) -> str:
    """
    Resolve company purchase return prefix.
    """
    settings_obj = getattr(
        company,
        "operational_settings",
        None,
    )

    configured_prefix = (
        getattr(
            settings_obj,
            "purchase_return_prefix",
            "",
        )
        if settings_obj
        else ""
    )

    return normalize_text(
        configured_prefix
    ) or "PRET"


def generate_purchase_return_number(
    company: Company,
) -> str:
    """
    Generate a company-scoped purchase return number.

    Format:
    PRET-YYYYMMDD-000001
    """
    today = timezone.localdate()
    prefix = get_company_purchase_return_prefix(
        company
    )
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_return = (
        PurchaseReturn.objects
        .filter(
            company=company,
            return_number__startswith=starts_with,
        )
        .order_by("-return_number")
        .first()
    )

    next_number = 1

    if last_return:
        try:
            next_number = (
                int(
                    last_return.return_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = 1

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def get_posted_purchase_bill_for_company(
    *,
    company: Company,
    bill_id: int | str,
) -> PurchaseBill:
    """
    Return a posted purchase bill owned by the company.
    """
    try:
        bill = (
            PurchaseBill.objects
            .select_related(
                "company",
                "branch",
                "supplier",
            )
            .get(
                id=bill_id,
                company=company,
            )
        )
    except PurchaseBill.DoesNotExist as exc:
        raise ValidationError(
            {
                "bill":
                    "Purchase bill was not found "
                    "for this company."
            }
        ) from exc

    if bill.status != PurchaseBillStatus.POSTED:
        raise ValidationError(
            {
                "bill":
                    "Only posted purchase bills "
                    "can be returned."
            }
        )

    return bill


def get_purchase_bill_item_for_return(
    *,
    company: Company,
    bill: PurchaseBill,
    bill_item_id: int | str,
) -> PurchaseBillItem:
    """
    Return a bill item eligible for purchase return.
    """
    try:
        bill_item = (
            PurchaseBillItem.objects
            .select_related(
                "bill",
                "item",
                "company",
            )
            .get(
                id=bill_item_id,
                company=company,
                bill=bill,
            )
        )
    except PurchaseBillItem.DoesNotExist as exc:
        raise ValidationError(
            {
                "bill_item":
                    "Purchase bill item was not found "
                    "for this bill and company."
            }
        ) from exc

    if (
        bill_item.returnable_quantity
        <= Decimal("0.0000")
    ):
        raise ValidationError(
            {
                "bill_item":
                    "This purchase bill item has no "
                    "remaining quantity available "
                    "for return."
            }
        )

    return bill_item


def normalize_purchase_return_reason(
    value: Any,
) -> str:
    """
    Validate and normalize purchase return reason.
    """
    reason = normalize_text(
        value or PurchaseReturnReason.OTHER
    ).upper()

    valid_reasons = {
        choice
        for choice, _label
        in PurchaseReturnReason.choices
    }

    if reason not in valid_reasons:
        raise ValidationError(
            {
                "reason":
                    "Invalid purchase return reason."
            }
        )

    return reason


def build_purchase_return_item(
    *,
    purchase_return: PurchaseReturn,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
) -> PurchaseReturnItem:
    """
    Build and save one purchase return item.
    """
    if not purchase_return.can_be_edited:
        raise ValidationError(
            "Only draft purchase returns can be edited."
        )

    bill_item_id = (
        payload.get("bill_item_id")
        or payload.get("bill_item")
    )

    if not bill_item_id:
        raise ValidationError(
            {
                "bill_item":
                    "Purchase bill item is required."
            }
        )

    bill_item = get_purchase_bill_item_for_return(
        company=company,
        bill=purchase_return.bill,
        bill_item_id=bill_item_id,
    )

    quantity = quantize_quantity(
        normalize_decimal(
            payload.get("quantity"),
            field_name="quantity",
            default=Decimal("0.0000"),
        )
    )

    if quantity <= Decimal("0.0000"):
        raise ValidationError(
            {
                "quantity":
                    "Return quantity must be greater "
                    "than zero."
            }
        )

    purchase_return_item = PurchaseReturnItem(
        purchase_return=purchase_return,
        company=company,
        bill_item=bill_item,
        item=bill_item.item,
        line_number=int(
            payload.get("line_number")
            or line_number
        ),
        quantity=quantity,
        condition_notes=normalize_text(
            payload.get("condition_notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
    )

    purchase_return_item.save()

    return purchase_return_item


@transaction.atomic
def create_purchase_return(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> PurchaseReturn:
    """
    Create a draft purchase return with its items.
    """
    if not company:
        raise ValidationError(
            "Company is required."
        )

    bill_id = (
        payload.get("bill_id")
        or payload.get("bill")
    )

    if not bill_id:
        raise ValidationError(
            {
                "bill":
                    "Purchase bill is required."
            }
        )

    bill = get_posted_purchase_bill_for_company(
        company=company,
        bill_id=bill_id,
    )

    items_payload = payload.get("items") or []

    if (
        not isinstance(items_payload, list)
        or not items_payload
    ):
        raise ValidationError(
            {
                "items":
                    "At least one purchase return "
                    "item is required."
            }
        )

    return_date = normalize_date(
        payload.get("return_date")
        or timezone.localdate(),
        field_name="return_date",
    )

    purchase_return = PurchaseReturn(
        company=company,
        branch=bill.branch,
        supplier=bill.supplier,
        bill=bill,
        return_number=(
            normalize_text(
                payload.get("return_number")
            )
            or generate_purchase_return_number(
                company
            )
        ),
        return_date=(
            return_date
            or timezone.localdate()
        ),
        status=PurchaseReturnStatus.DRAFT,
        reason=normalize_purchase_return_reason(
            payload.get("reason")
        ),
        reason_details=normalize_text(
            payload.get("reason_details")
        ),
        currency_code=bill.currency_code,
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
        created_by=user,
        updated_by=user,
    )

    purchase_return.full_clean()
    purchase_return.save()

    for index, item_payload in enumerate(
        items_payload,
        start=1,
    ):
        if not isinstance(item_payload, dict):
            raise ValidationError(
                {
                    "items":
                        "Each purchase return item "
                        "must be an object."
                }
            )

        build_purchase_return_item(
            purchase_return=purchase_return,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    purchase_return.recalculate_totals(
        save=True
    )
    purchase_return.refresh_from_db()

    return purchase_return


@transaction.atomic
def update_purchase_return(
    *,
    purchase_return: PurchaseReturn,
    payload: dict[str, Any],
    user=None,
) -> PurchaseReturn:
    """
    Update a draft purchase return.

    If items are supplied, existing items are replaced.
    """
    if not purchase_return.can_be_edited:
        raise ValidationError(
            "Only draft purchase returns can be updated."
        )

    company = purchase_return.company

    if "return_number" in payload:
        purchase_return.return_number = (
            normalize_text(
                payload.get("return_number")
            )
        )

    if "return_date" in payload:
        purchase_return.return_date = (
            normalize_date(
                payload.get("return_date"),
                field_name="return_date",
            )
            or purchase_return.return_date
        )

    if "reason" in payload:
        purchase_return.reason = (
            normalize_purchase_return_reason(
                payload.get("reason")
            )
        )

    if "reason_details" in payload:
        purchase_return.reason_details = (
            normalize_text(
                payload.get("reason_details")
            )
        )

    if "notes" in payload:
        purchase_return.notes = (
            normalize_text(
                payload.get("notes")
            )
        )

    if isinstance(
        payload.get("extra_data"),
        dict,
    ):
        purchase_return.extra_data = (
            payload["extra_data"]
        )

    purchase_return.updated_by = user
    purchase_return.full_clean()
    purchase_return.save()

    if "items" in payload:
        items_payload = payload.get("items") or []

        if (
            not isinstance(items_payload, list)
            or not items_payload
        ):
            raise ValidationError(
                {
                    "items":
                        "At least one purchase return "
                        "item is required."
                }
            )

        purchase_return.items.all().delete()

        for index, item_payload in enumerate(
            items_payload,
            start=1,
        ):
            if not isinstance(
                item_payload,
                dict,
            ):
                raise ValidationError(
                    {
                        "items":
                            "Each purchase return item "
                            "must be an object."
                    }
                )

            build_purchase_return_item(
                purchase_return=purchase_return,
                company=company,
                payload=item_payload,
                line_number=index,
            )

    purchase_return.recalculate_totals(
        save=True
    )
    purchase_return.refresh_from_db()

    return purchase_return


@transaction.atomic
def confirm_purchase_return(
    *,
    purchase_return: PurchaseReturn,
    user=None,
) -> PurchaseReturn:
    """
    Confirm a draft purchase return.

    Confirmed quantities are counted against each bill item.
    """
    locked_return = (
        PurchaseReturn.objects
        .select_for_update()
        .select_related(
            "company",
            "bill",
            "supplier",
            "branch",
        )
        .get(pk=purchase_return.pk)
    )

    if not locked_return.can_be_confirmed:
        raise ValidationError(
            "Only draft purchase returns can be confirmed."
        )

    locked_items = list(
        locked_return.items
        .select_for_update()
        .select_related(
            "bill_item",
            "bill_item__bill",
            "item",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not locked_items:
        raise ValidationError(
            "Cannot confirm a purchase return without items."
        )

    for return_item in locked_items:
        bill_item = (
            PurchaseBillItem.objects
            .select_for_update()
            .get(pk=return_item.bill_item_id)
        )

        available_quantity = (
            bill_item.returnable_quantity
        )

        if (
            return_item.quantity
            > available_quantity
        ):
            raise ValidationError(
                {
                    "quantity":
                        "One or more return quantities "
                        "exceed the remaining purchase "
                        "bill quantities."
                }
            )

        return_item.full_clean()

    locked_return.confirm(user=user)
    locked_return.refresh_from_db()

    return locked_return


@transaction.atomic
def cancel_purchase_return(
    *,
    purchase_return: PurchaseReturn,
    reason: str = "",
    user=None,
) -> PurchaseReturn:
    """
    Cancel a draft or confirmed purchase return.

    Posted returns cannot be cancelled through this helper.
    """
    locked_return = (
        PurchaseReturn.objects
        .select_for_update()
        .get(pk=purchase_return.pk)
    )

    locked_return.cancel(
        reason=normalize_text(reason),
        user=user,
    )
    locked_return.refresh_from_db()

    return locked_return


def serialize_purchase_return_item(
    item: PurchaseReturnItem,
) -> dict[str, Any]:
    """
    Serialize one purchase return item.
    """
    bill_item = item.bill_item

    return {
        "id": item.id,
        "line_number": item.line_number,
        "bill_item_id": item.bill_item_id,
        "catalog_item_id": item.item_id,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": (
            item.item_name_ar_snapshot
        ),
        "item_name_en": (
            item.item_name_en_snapshot
        ),
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "original_bill_quantity": str(
            bill_item.quantity
        ),
        "remaining_returnable_quantity": str(
            bill_item.returnable_quantity
        ),
        "unit_price": str(item.unit_price),
        "discount_amount": str(
            item.discount_amount
        ),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "subtotal_amount": str(
            item.subtotal_amount
        ),
        "taxable_amount": str(
            item.taxable_amount
        ),
        "tax_amount": str(item.tax_amount),
        "total_amount": str(
            item.total_amount
        ),
        "condition_notes": (
            item.condition_notes
        ),
        "extra_data": item.extra_data or {},
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


def serialize_purchase_return(
    purchase_return: PurchaseReturn,
    *,
    include_items: bool = True,
) -> dict[str, Any]:
    """
    Serialize a purchase return for company APIs.
    """
    result = {
        "id": purchase_return.id,
        "return_number": (
            purchase_return.return_number
        ),
        "return_date": (
            purchase_return.return_date.isoformat()
            if purchase_return.return_date
            else None
        ),
        "status": purchase_return.status,
        "reason": purchase_return.reason,
        "reason_details": (
            purchase_return.reason_details
        ),
        "currency_code": (
            purchase_return.currency_code
        ),
        "company": {
            "id": purchase_return.company_id,
            "name": purchase_return.company.name,
        },
        "branch": (
            {
                "id": purchase_return.branch_id,
                "name": purchase_return.branch.name,
            }
            if purchase_return.branch_id
            else None
        ),
        "supplier": {
            "id": purchase_return.supplier_id,
            "display_name": (
                purchase_return
                .supplier
                .display_name
            ),
        },
        "bill": {
            "id": purchase_return.bill_id,
            "bill_number": (
                purchase_return.bill.bill_number
            ),
            "supplier_bill_number": (
                purchase_return
                .bill
                .supplier_bill_number
            ),
            "bill_date": (
                purchase_return
                .bill
                .bill_date
                .isoformat()
            ),
        },
        "subtotal_amount": str(
            purchase_return.subtotal_amount
        ),
        "discount_amount": str(
            purchase_return.discount_amount
        ),
        "taxable_amount": str(
            purchase_return.taxable_amount
        ),
        "tax_amount": str(
            purchase_return.tax_amount
        ),
        "total_amount": str(
            purchase_return.total_amount
        ),
        "notes": purchase_return.notes,
        "extra_data": (
            purchase_return.extra_data or {}
        ),
        "confirmed_at": (
            purchase_return.confirmed_at.isoformat()
            if purchase_return.confirmed_at
            else None
        ),
        "posted_at": (
            purchase_return.posted_at.isoformat()
            if purchase_return.posted_at
            else None
        ),
        "cancelled_at": (
            purchase_return.cancelled_at.isoformat()
            if purchase_return.cancelled_at
            else None
        ),
        "cancellation_reason": (
            purchase_return.cancellation_reason
        ),
        "allowed_actions": {
            "update": (
                purchase_return.can_be_edited
            ),
            "confirm": (
                purchase_return.can_be_confirmed
            ),
            "post": (
                purchase_return.can_be_posted
            ),
            "cancel": (
                purchase_return.can_be_cancelled
            ),
        },
        "created_at": (
            purchase_return.created_at.isoformat()
            if purchase_return.created_at
            else None
        ),
        "updated_at": (
            purchase_return.updated_at.isoformat()
            if purchase_return.updated_at
            else None
        ),
    }

    if include_items:
        result["items"] = [
            serialize_purchase_return_item(item)
            for item in (
                purchase_return.items
                .select_related(
                    "bill_item",
                    "item",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return result


# ============================================================
# Supplier Debit Notes Services Foundation
# ============================================================


def get_company_supplier_debit_note_prefix(
    company: Company,
) -> str:
    """
    Resolve company supplier debit note prefix.
    """
    settings_obj = getattr(
        company,
        "operational_settings",
        None,
    )

    configured_prefix = (
        getattr(
            settings_obj,
            "supplier_debit_note_prefix",
            "",
        )
        if settings_obj
        else ""
    )

    return normalize_text(
        configured_prefix
    ) or "SDN"


def generate_supplier_debit_note_number(
    company: Company,
) -> str:
    """
    Generate a company-scoped supplier debit note number.

    Format:
    SDN-YYYYMMDD-000001
    """
    today = timezone.localdate()
    prefix = get_company_supplier_debit_note_prefix(
        company
    )
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_note = (
        SupplierDebitNote.objects
        .filter(
            company=company,
            debit_note_number__startswith=starts_with,
        )
        .order_by("-debit_note_number")
        .first()
    )

    next_number = 1

    if last_note:
        try:
            next_number = (
                int(
                    last_note.debit_note_number
                    .split("-")[-1]
                )
                + 1
            )
        except (TypeError, ValueError):
            next_number = 1

    return (
        f"{starts_with}"
        f"{next_number:06d}"
    )


def get_purchase_return_for_debit_note(
    *,
    company: Company,
    purchase_return_id: int | str,
) -> PurchaseReturn:
    """
    Return a confirmed or posted purchase return
    eligible for supplier debit note creation.
    """
    try:
        purchase_return = (
            PurchaseReturn.objects
            .select_related(
                "company",
                "branch",
                "supplier",
                "bill",
            )
            .get(
                id=purchase_return_id,
                company=company,
            )
        )
    except PurchaseReturn.DoesNotExist as exc:
        raise ValidationError(
            {
                "purchase_return":
                    "Purchase return was not found "
                    "for this company."
            }
        ) from exc

    if purchase_return.status not in [
        PurchaseReturnStatus.CONFIRMED,
        PurchaseReturnStatus.POSTED,
    ]:
        raise ValidationError(
            {
                "purchase_return":
                    "Purchase return must be confirmed "
                    "or posted before creating "
                    "a supplier debit note."
            }
        )

    if SupplierDebitNote.objects.filter(
        purchase_return=purchase_return,
    ).exists():
        raise ValidationError(
            {
                "purchase_return":
                    "A supplier debit note already exists "
                    "for this purchase return."
            }
        )

    if not purchase_return.items.exists():
        raise ValidationError(
            {
                "purchase_return":
                    "Purchase return has no items."
            }
        )

    return purchase_return


def build_supplier_debit_note_item(
    *,
    debit_note: SupplierDebitNote,
    purchase_return_item: PurchaseReturnItem,
    line_number: int,
) -> SupplierDebitNoteItem:
    """
    Create one supplier debit note item from
    a purchase return item.
    """
    if not debit_note.can_be_edited:
        raise ValidationError(
            "Only draft supplier debit notes can be edited."
        )

    if (
        purchase_return_item.purchase_return_id
        != debit_note.purchase_return_id
    ):
        raise ValidationError(
            {
                "purchase_return_item":
                    "Purchase return item does not belong "
                    "to the debit note purchase return."
            }
        )

    item = SupplierDebitNoteItem(
        debit_note=debit_note,
        company=debit_note.company,
        purchase_return_item=purchase_return_item,
        bill_item=purchase_return_item.bill_item,
        item=purchase_return_item.item,
        line_number=line_number,
        quantity=purchase_return_item.quantity,
        unit_price=purchase_return_item.unit_price,
        discount_amount=(
            purchase_return_item.discount_amount
        ),
        taxable=purchase_return_item.taxable,
        tax_rate=purchase_return_item.tax_rate,
        notes=purchase_return_item.condition_notes,
        extra_data={
            "source": "purchase_return",
            "purchase_return_id": (
                purchase_return_item.purchase_return_id
            ),
            "purchase_return_item_id": (
                purchase_return_item.id
            ),
        },
    )
    item.save()

    return item


@transaction.atomic
def create_supplier_debit_note(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> SupplierDebitNote:
    """
    Create a draft supplier debit note from
    a confirmed or posted purchase return.
    """
    if not company:
        raise ValidationError(
            "Company is required."
        )

    purchase_return_id = (
        payload.get("purchase_return_id")
        or payload.get("purchase_return")
    )

    if not purchase_return_id:
        raise ValidationError(
            {
                "purchase_return":
                    "Purchase return is required."
            }
        )

    purchase_return = (
        get_purchase_return_for_debit_note(
            company=company,
            purchase_return_id=purchase_return_id,
        )
    )

    debit_note_date = normalize_date(
        payload.get("debit_note_date")
        or timezone.localdate(),
        field_name="debit_note_date",
    )

    debit_note = SupplierDebitNote(
        company=company,
        branch=purchase_return.branch,
        supplier=purchase_return.supplier,
        bill=purchase_return.bill,
        purchase_return=purchase_return,
        debit_note_number=(
            normalize_text(
                payload.get("debit_note_number")
            )
            or generate_supplier_debit_note_number(
                company
            )
        ),
        supplier_reference=normalize_text(
            payload.get("supplier_reference")
        ),
        debit_note_date=(
            debit_note_date
            or timezone.localdate()
        ),
        status=SupplierDebitNoteStatus.DRAFT,
        currency_code=(
            purchase_return.currency_code
        ),
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(
                payload.get("extra_data"),
                dict,
            )
            else {}
        ),
        created_by=user,
        updated_by=user,
    )

    debit_note.full_clean()
    debit_note.save()

    return_items = list(
        purchase_return.items
        .select_related(
            "bill_item",
            "item",
            "purchase_return",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    for index, return_item in enumerate(
        return_items,
        start=1,
    ):
        build_supplier_debit_note_item(
            debit_note=debit_note,
            purchase_return_item=return_item,
            line_number=index,
        )

    debit_note.recalculate_totals(
        save=True
    )
    debit_note.refresh_from_db()

    return debit_note


@transaction.atomic
def update_supplier_debit_note(
    *,
    debit_note: SupplierDebitNote,
    payload: dict[str, Any],
    user=None,
) -> SupplierDebitNote:
    """
    Update editable header fields for a draft
    supplier debit note.

    Source items remain synchronized with
    the linked purchase return and are not manually replaced.
    """
    if not debit_note.can_be_edited:
        raise ValidationError(
            "Only draft supplier debit notes can be updated."
        )

    if "debit_note_number" in payload:
        debit_note.debit_note_number = (
            normalize_text(
                payload.get("debit_note_number")
            )
        )

    if "supplier_reference" in payload:
        debit_note.supplier_reference = (
            normalize_text(
                payload.get("supplier_reference")
            )
        )

    if "debit_note_date" in payload:
        debit_note.debit_note_date = (
            normalize_date(
                payload.get("debit_note_date"),
                field_name="debit_note_date",
            )
            or debit_note.debit_note_date
        )

    if "notes" in payload:
        debit_note.notes = normalize_text(
            payload.get("notes")
        )

    if isinstance(
        payload.get("extra_data"),
        dict,
    ):
        debit_note.extra_data = (
            payload["extra_data"]
        )

    debit_note.updated_by = user
    debit_note.full_clean()
    debit_note.save()
    debit_note.refresh_from_db()

    return debit_note


@transaction.atomic
def issue_supplier_debit_note(
    *,
    debit_note: SupplierDebitNote,
    user=None,
) -> SupplierDebitNote:
    """
    Issue a draft supplier debit note.
    """
    locked_note = (
        SupplierDebitNote.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
            "purchase_return",
        )
        .get(pk=debit_note.pk)
    )

    if not locked_note.can_be_issued:
        raise ValidationError(
            "Only draft supplier debit notes can be issued."
        )

    source_return = locked_note.purchase_return

    if not source_return:
        raise ValidationError(
            {
                "purchase_return":
                    "Supplier debit note must reference "
                    "a purchase return."
            }
        )

    if source_return.status not in [
        PurchaseReturnStatus.CONFIRMED,
        PurchaseReturnStatus.POSTED,
    ]:
        raise ValidationError(
            {
                "purchase_return":
                    "Linked purchase return must remain "
                    "confirmed or posted."
            }
        )

    locked_items = list(
        locked_note.items
        .select_for_update()
        .select_related(
            "purchase_return_item",
            "bill_item",
            "item",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not locked_items:
        raise ValidationError(
            "Cannot issue a supplier debit note without items."
        )

    source_item_ids = set(
        source_return.items.values_list(
            "id",
            flat=True,
        )
    )
    note_source_item_ids = {
        item.purchase_return_item_id
        for item in locked_items
        if item.purchase_return_item_id
    }

    if source_item_ids != note_source_item_ids:
        raise ValidationError(
            {
                "items":
                    "Supplier debit note items do not match "
                    "the linked purchase return items."
            }
        )

    for item in locked_items:
        item.full_clean()

    locked_note.issue(user=user)
    locked_note.refresh_from_db()

    return locked_note


@transaction.atomic
def cancel_supplier_debit_note(
    *,
    debit_note: SupplierDebitNote,
    reason: str = "",
    user=None,
) -> SupplierDebitNote:
    """
    Cancel a draft or issued supplier debit note.

    Posted notes require a dedicated financial
    and accounting reversal workflow.
    """
    locked_note = (
        SupplierDebitNote.objects
        .select_for_update()
        .get(pk=debit_note.pk)
    )

    locked_note.cancel(
        reason=normalize_text(reason),
        user=user,
    )
    locked_note.refresh_from_db()

    return locked_note



def resolve_purchase_return_warehouse(
    *,
    company: Company,
    branch: Branch | None = None,
) -> Warehouse:
    """
    Resolve the active warehouse used for a purchase return.

    Priority:
    1. Default active warehouse for the bill branch.
    2. Any active warehouse for the bill branch.
    3. Default active company warehouse.
    4. Any active company warehouse.
    """
    warehouses = Warehouse.objects.filter(
        company=company,
        status=WarehouseStatus.ACTIVE,
        is_active=True,
    )

    if branch:
        branch_warehouse = (
            warehouses.filter(
                branch=branch,
                is_default=True,
            )
            .order_by("id")
            .first()
        )

        if branch_warehouse:
            return branch_warehouse

        branch_warehouse = (
            warehouses.filter(
                branch=branch,
            )
            .order_by("id")
            .first()
        )

        if branch_warehouse:
            return branch_warehouse

    warehouse = (
        warehouses.filter(
            is_default=True,
        )
        .order_by("id")
        .first()
    )

    if warehouse:
        return warehouse

    warehouse = warehouses.order_by("id").first()

    if not warehouse:
        raise ValidationError(
            {
                "warehouse":
                    "An active warehouse is required "
                    "before posting a supplier debit note "
                    "containing inventory items."
            }
        )

    return warehouse


def is_supplier_debit_note_inventory_item(
    item: CatalogItem | None,
) -> bool:
    """
    Determine whether a debit note item affects stock.
    """
    if not item:
        return False

    return (
        item.item_type == CatalogItemType.PRODUCT
        and bool(
            getattr(
                item,
                "track_inventory",
                False,
            )
        )
    )


def calculate_return_unit_cost(
    return_item: PurchaseReturnItem,
) -> Decimal:
    """
    Resolve the stock issue cost used for the purchase return.

    The value is based on the returned taxable/net amount so
    the stock movement value matches the unified debit note
    accounting inventory bucket.
    """
    quantity = Decimal(
        str(
            return_item.quantity
            or "0.0000"
        )
    )

    if quantity <= Decimal("0.0000"):
        raise ValidationError(
            {
                "quantity":
                    "Purchase return item quantity "
                    "must be greater than zero."
            }
        )

    return quantize_money(
        Decimal(
            str(
                return_item.taxable_amount
                or "0.00"
            )
        )
        / quantity
    )


def get_existing_purchase_return_stock_movement(
    return_item: PurchaseReturnItem,
):
    """
    Find an existing posted stock movement for one
    purchase return item.
    """
    if return_item.stock_movement_id:
        return return_item.stock_movement

    return (
        return_item.company.stock_movements.filter(
            reference_type=(
                PURCHASE_RETURN_STOCK_REFERENCE
            ),
            reference_id=return_item.id,
        )
        .exclude(
            status=StockMovementStatus.CANCELLED,
        )
        .order_by("id")
        .first()
    )


def post_purchase_return_item_to_inventory(
    *,
    return_item: PurchaseReturnItem,
    warehouse: Warehouse,
    debit_note: SupplierDebitNote,
    user=None,
):
    """
    Post one purchase return item to inventory.

    Service and non-stock items do not create movements.
    """
    item = return_item.item

    if not is_supplier_debit_note_inventory_item(
        item
    ):
        return None

    existing = (
        get_existing_purchase_return_stock_movement(
            return_item
        )
    )

    if existing:
        if (
            existing.status
            != StockMovementStatus.POSTED
        ):
            raise ValidationError(
                {
                    "inventory":
                        "An existing purchase return "
                        "stock movement is not posted."
                }
            )

        if not return_item.stock_movement_id:
            PurchaseReturnItem.objects.filter(
                pk=return_item.pk,
                stock_movement__isnull=True,
            ).update(
                stock_movement=existing,
                updated_at=timezone.now(),
            )
            return_item.stock_movement = existing

        return existing

    stock_item = (
        StockItem.objects
        .select_for_update()
        .select_related("location")
        .filter(
            company=return_item.company,
            warehouse=warehouse,
            item=item,
            quantity_on_hand__gte=return_item.quantity,
        )
        .order_by(
            "-location__is_default",
            "-quantity_on_hand",
            "id",
        )
        .first()
    )

    if not stock_item:
        raise ValidationError(
            {
                "inventory":
                    "No stock balance exists for "
                    f"{item.name} in the selected warehouse."
            }
        )

    if stock_item.quantity_on_hand < return_item.quantity:
        raise ValidationError(
            {
                "inventory":
                    "Insufficient stock quantity for "
                    f"{item.name}."
            }
        )

    movement = issue_stock(
        company=return_item.company,
        warehouse=warehouse,
        location=stock_item.location,
        item=item,
        quantity=return_item.quantity,
        unit_cost=calculate_return_unit_cost(
            return_item
        ),
        reference_type=(
            PURCHASE_RETURN_STOCK_REFERENCE
        ),
        reference_id=return_item.id,
        reference_number=(
            return_item
            .purchase_return
            .return_number
        ),
        notes=(
            "Supplier return posted through "
            f"debit note {debit_note.debit_note_number}"
        ),
        extra_data={
            "source": "supplier_debit_note",
            "debit_note_id": debit_note.id,
            "debit_note_number": (
                debit_note.debit_note_number
            ),
            "purchase_return_id": (
                return_item.purchase_return_id
            ),
            "purchase_return_item_id": (
                return_item.id
            ),
            "bill_id": debit_note.bill_id,
        },
        user=user,
        post_accounting=False,
    )

    PurchaseReturnItem.objects.filter(
        pk=return_item.pk,
        stock_movement__isnull=True,
    ).update(
        stock_movement=movement,
        updated_at=timezone.now(),
    )
    return_item.stock_movement = movement

    return movement


@transaction.atomic
def post_supplier_debit_note(
    *,
    debit_note: SupplierDebitNote,
    user=None,
) -> SupplierDebitNote:
    """
    Atomically post an issued supplier debit note.

    Effects:
    - Apply the note against the purchase bill balance.
    - Create supplier credit for any excess.
    - Issue stock for returned inventory products.
    - Create one unified accounting journal entry.
    - Mark the purchase return and debit note as posted.
    - Prevent duplicate effects.
    """
    locked_note = (
        SupplierDebitNote.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
            "purchase_return",
        )
        .get(pk=debit_note.pk)
    )

    if (
        locked_note.status
        == SupplierDebitNoteStatus.POSTED
    ):
        return locked_note

    if not locked_note.can_be_posted:
        raise ValidationError(
            "Only issued supplier debit notes "
            "can be posted."
        )

    if not locked_note.purchase_return_id:
        raise ValidationError(
            {
                "purchase_return":
                    "Supplier debit note must reference "
                    "a purchase return."
            }
        )

    locked_bill = (
        PurchaseBill.objects
        .select_for_update()
        .get(pk=locked_note.bill_id)
    )

    locked_return = (
        PurchaseReturn.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
        )
        .get(
            pk=locked_note.purchase_return_id
        )
    )

    if (
        locked_return.status
        == PurchaseReturnStatus.POSTED
    ):
        raise ValidationError(
            {
                "purchase_return":
                    "Linked purchase return has already "
                    "been posted."
            }
        )

    if not locked_return.can_be_posted:
        raise ValidationError(
            {
                "purchase_return":
                    "Linked purchase return must be "
                    "confirmed before posting."
            }
        )

    if (
        locked_return.company_id
        != locked_note.company_id
        or locked_return.bill_id
        != locked_note.bill_id
        or locked_return.supplier_id
        != locked_note.supplier_id
    ):
        raise ValidationError(
            {
                "purchase_return":
                    "Linked purchase return does not match "
                    "the supplier debit note."
            }
        )

    locked_items = list(
        locked_note.items
        .select_for_update()
        .select_related(
            "item",
            "bill_item",
            "purchase_return_item",
            "purchase_return_item__purchase_return",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not locked_items:
        raise ValidationError(
            "Cannot post a supplier debit note "
            "without items."
        )

    total_amount = quantize_money(
        locked_note.total_amount
    )

    if total_amount <= MONEY_ZERO:
        raise ValidationError(
            {
                "total_amount":
                    "Supplier debit note total must be "
                    "greater than zero."
            }
        )

    current_balance = quantize_money(
        locked_bill.balance_due
    )
    applied_to_bill_amount = min(
        total_amount,
        current_balance,
    )
    supplier_credit_amount = quantize_money(
        total_amount
        - applied_to_bill_amount
    )

    inventory_items = [
        note_item.purchase_return_item
        for note_item in locked_items
        if (
            note_item.purchase_return_item_id
            and is_supplier_debit_note_inventory_item(
                note_item.item
            )
        )
    ]

    warehouse = None

    if inventory_items:
        warehouse = resolve_purchase_return_warehouse(
            company=locked_note.company,
            branch=locked_note.branch,
        )

        for return_item in inventory_items:
            post_purchase_return_item_to_inventory(
                return_item=return_item,
                warehouse=warehouse,
                debit_note=locked_note,
                user=user,
            )

    if applied_to_bill_amount > MONEY_ZERO:
        locked_bill.apply_debit_note_amount(
            applied_to_bill_amount,
            save=True,
            user=user,
        )

    if supplier_credit_amount > MONEY_ZERO:
        supplier_credit, created = (
            SupplierCredit.objects.get_or_create(
                debit_note=locked_note,
                defaults={
                    "company": locked_note.company,
                    "supplier": locked_note.supplier,
                    "status": (
                        SupplierCreditStatus.ACTIVE
                    ),
                    "currency_code": (
                        locked_note.currency_code
                    ),
                    "original_amount": (
                        supplier_credit_amount
                    ),
                    "remaining_amount": (
                        supplier_credit_amount
                    ),
                    "created_by": (
                        user
                        if getattr(
                            user,
                            "is_authenticated",
                            False,
                        )
                        else None
                    ),
                    "updated_by": (
                        user
                        if getattr(
                            user,
                            "is_authenticated",
                            False,
                        )
                        else None
                    ),
                },
            )
        )

        if not created:
            if (
                supplier_credit.original_amount
                != supplier_credit_amount
                or supplier_credit.remaining_amount
                != supplier_credit_amount
                or supplier_credit.status
                != SupplierCreditStatus.ACTIVE
            ):
                raise ValidationError(
                    {
                        "supplier_credit":
                            "Existing supplier credit "
                            "does not match this debit note."
                    }
                )

    try:
        post_supplier_debit_note_to_accounting(
            locked_note,
            actor=user,
            auto_post=True,
        )
    except AccountingPostingError as exc:
        raise ValidationError(
            {
                "accounting": str(exc),
            }
        ) from exc

    locked_return.mark_posted(
        user=user
    )

    locked_note.mark_posted(
        applied_to_bill_amount=(
            applied_to_bill_amount
        ),
        supplier_credit_amount=(
            supplier_credit_amount
        ),
        user=user,
    )

    locked_note.refresh_from_db()

    return locked_note


def serialize_supplier_debit_note_item(
    item: SupplierDebitNoteItem,
) -> dict[str, Any]:
    """
    Serialize one supplier debit note item.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "purchase_return_item_id": (
            item.purchase_return_item_id
        ),
        "bill_item_id": item.bill_item_id,
        "catalog_item_id": item.item_id,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": (
            item.item_name_ar_snapshot
        ),
        "item_name_en": (
            item.item_name_en_snapshot
        ),
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "unit_price": str(item.unit_price),
        "discount_amount": str(
            item.discount_amount
        ),
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "subtotal_amount": str(
            item.subtotal_amount
        ),
        "taxable_amount": str(
            item.taxable_amount
        ),
        "tax_amount": str(
            item.tax_amount
        ),
        "total_amount": str(
            item.total_amount
        ),
        "notes": item.notes,
        "extra_data": item.extra_data or {},
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


def serialize_supplier_debit_note(
    debit_note: SupplierDebitNote,
    *,
    include_items: bool = True,
) -> dict[str, Any]:
    """
    Serialize a supplier debit note for company APIs.
    """
    result = {
        "id": debit_note.id,
        "debit_note_number": (
            debit_note.debit_note_number
        ),
        "supplier_reference": (
            debit_note.supplier_reference
        ),
        "debit_note_date": (
            debit_note.debit_note_date.isoformat()
            if debit_note.debit_note_date
            else None
        ),
        "status": debit_note.status,
        "currency_code": (
            debit_note.currency_code
        ),
        "company": {
            "id": debit_note.company_id,
            "name": debit_note.company.name,
        },
        "branch": (
            {
                "id": debit_note.branch_id,
                "name": debit_note.branch.name,
            }
            if debit_note.branch_id
            else None
        ),
        "supplier": {
            "id": debit_note.supplier_id,
            "display_name": (
                debit_note.supplier.display_name
            ),
        },
        "bill": {
            "id": debit_note.bill_id,
            "bill_number": (
                debit_note.bill.bill_number
            ),
            "supplier_bill_number": (
                debit_note.bill.supplier_bill_number
            ),
            "bill_date": (
                debit_note.bill.bill_date.isoformat()
            ),
            "payment_status": (
                debit_note.bill.payment_status
            ),
            "paid_amount": str(
                debit_note.bill.paid_amount
            ),
            "debit_note_applied_amount": str(
                debit_note
                .bill
                .debit_note_applied_amount
            ),
            "balance_due": str(
                debit_note.bill.balance_due
            ),
        },
        "purchase_return": (
            {
                "id": debit_note.purchase_return_id,
                "return_number": (
                    debit_note
                    .purchase_return
                    .return_number
                ),
                "return_date": (
                    debit_note
                    .purchase_return
                    .return_date
                    .isoformat()
                ),
                "status": (
                    debit_note
                    .purchase_return
                    .status
                ),
            }
            if debit_note.purchase_return_id
            else None
        ),
        "subtotal_amount": str(
            debit_note.subtotal_amount
        ),
        "discount_amount": str(
            debit_note.discount_amount
        ),
        "taxable_amount": str(
            debit_note.taxable_amount
        ),
        "tax_amount": str(
            debit_note.tax_amount
        ),
        "total_amount": str(
            debit_note.total_amount
        ),
        "applied_to_bill_amount": str(
            debit_note.applied_to_bill_amount
        ),
        "supplier_credit_amount": str(
            debit_note.supplier_credit_amount
        ),
        "unapplied_amount": str(
            debit_note.unapplied_amount
        ),
        "supplier_credit": (
            {
                "id": debit_note.supplier_credit.id,
                "status": (
                    debit_note.supplier_credit.status
                ),
                "original_amount": str(
                    debit_note
                    .supplier_credit
                    .original_amount
                ),
                "remaining_amount": str(
                    debit_note
                    .supplier_credit
                    .remaining_amount
                ),
                "currency_code": (
                    debit_note
                    .supplier_credit
                    .currency_code
                ),
            }
            if hasattr(
                debit_note,
                "supplier_credit",
            )
            else None
        ),
        "notes": debit_note.notes,
        "extra_data": (
            debit_note.extra_data or {}
        ),
        "issued_at": (
            debit_note.issued_at.isoformat()
            if debit_note.issued_at
            else None
        ),
        "posted_at": (
            debit_note.posted_at.isoformat()
            if debit_note.posted_at
            else None
        ),
        "cancelled_at": (
            debit_note.cancelled_at.isoformat()
            if debit_note.cancelled_at
            else None
        ),
        "cancellation_reason": (
            debit_note.cancellation_reason
        ),
        "allowed_actions": {
            "update": debit_note.can_be_edited,
            "issue": debit_note.can_be_issued,
            "post": debit_note.can_be_posted,
            "cancel": debit_note.can_be_cancelled,
        },
        "created_at": (
            debit_note.created_at.isoformat()
            if debit_note.created_at
            else None
        ),
        "updated_at": (
            debit_note.updated_at.isoformat()
            if debit_note.updated_at
            else None
        ),
    }

    if include_items:
        result["items"] = [
            serialize_supplier_debit_note_item(
                item
            )
            for item in (
                debit_note.items
                .select_related(
                    "purchase_return_item",
                    "bill_item",
                    "item",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return result

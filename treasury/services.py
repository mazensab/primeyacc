# ============================================================
# ًں“‚ treasury/services.py
# ًں§  Mhamcloud | Treasury & Payments Services V1.4
# ------------------------------------------------------------
# âœ… Phase 11.1 Treasury Accounts Foundation services
# âœ… Phase 11.2 Treasury Transactions Foundation services
# âœ… Phase 11.3 Treasury APIs Foundation services
# âœ… Phase 11.4 Customer & Supplier Payments Foundation services
# âœ… Phase 11.5 Payment Allocation Foundation services
# âœ… Phase 11.6 Automatic Accounting Posting for Payments
# âœ… Company-scoped treasury account creation/update
# âœ… Company-scoped treasury transaction creation/post/cancel
# âœ… Company-scoped customer payment create/confirm/cancel
# âœ… Company-scoped supplier payment create/confirm/cancel
# âœ… Customer payment allocation to SalesInvoice
# âœ… Supplier payment allocation to PurchaseBill
# âœ… Automatic accounting posting for confirmed CustomerPayment
# âœ… Automatic accounting posting for confirmed SupplierPayment
# âœ… Safe balance updates only on posting/confirmation
# âœ… Negative balance prevention for outflows/transfers/supplier payments
# âœ… Overpayment prevention for sales invoices and purchase bills
# âœ… Duplicate posting/confirmation prevention
# âœ… Summary helpers for /company treasury dashboard
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹ظ…ط§ط±ظٹط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ„ط§ ظٹطھظ… ط§ظ„ط§ط¹طھظ…ط§ط¯ ط¹ظ„ظ‰ company_id ط§ظ„ظ‚ط§ط¯ظ… ظ…ظ† ط§ظ„ظپط±ظˆظ†طھ
# - ط§ظ„ط´ط±ظƒط© ظٹط¬ط¨ ط£ظ† طھطµظ„ ظ„ظ„ط®ط¯ظ…ط© ظ…ظ† ط¹ط¶ظˆظٹط© ط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ط­ط§ظ„ظٹط© ط¯ط§ط®ظ„ /company
# - ظƒظ„ ط­ط³ط§ط¨ ط®ط²ظٹظ†ط© ظˆط­ط±ظƒط© ط®ط²ظٹظ†ط© ظˆط¯ظپط¹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط¯ط§ط®ظ„ ظ†ظپط³ ط§ظ„ط´ط±ظƒط©
# - ط§ظ„ط±طµظٹط¯ ظ„ط§ ظٹطھط؛ظٹط± ط¹ظ†ط¯ ط¥ظ†ط´ط§ط، DraftطŒ ظٹطھط؛ظٹط± ظپظ‚ط· ط¹ظ†ط¯ POSTED / CONFIRMED
# - طھط£ظƒظٹط¯ ط¯ظپط¹ط© ط§ظ„ط¹ظ…ظٹظ„ ظٹظ†ط´ط¦ ط­ط±ظƒط© ط®ط²ظٹظ†ط© ظˆط§ط±ط¯ط© INFLOW ظˆظٹط­ط¯ط« ظپط§طھظˆط±ط© ط§ظ„ظ…ط¨ظٹط¹ط§طھ ط¥ظ† ظˆط¬ط¯طھ
# - طھط£ظƒظٹط¯ ط¯ظپط¹ط© ط§ظ„ظ…ظˆط±ط¯ ظٹظ†ط´ط¦ ط­ط±ظƒط© ط®ط²ظٹظ†ط© طµط§ط¯ط±ط© OUTFLOW ظˆظٹط­ط¯ط« ظپط§طھظˆط±ط© ط§ظ„ظ…ط´طھط±ظٹط§طھ ط¥ظ† ظˆط¬ط¯طھ
# - طھط£ظƒظٹط¯ ط§ظ„ط¯ظپط¹ط© ظٹط±ط­ظ„ ظ‚ظٹط¯ ظ…ط­ط§ط³ط¨ظٹ طھظ„ظ‚ط§ط¦ظٹ ظˆظٹظ…ظ†ط¹ ط§ظ„طھظƒط±ط§ط±
# - ط¥ظ„ط؛ط§ط، ط¯ظپط¹ط© ظ…ط¤ظƒط¯ط© ظٹظ„ط؛ظٹ ط­ط±ظƒط© ط§ظ„ط®ط²ظٹظ†ط© ظˆظٹط¹ظƒط³ ط§ظ„ط±طµظٹط¯ ظˆظٹط¹ظƒط³ ط£ط«ط± ط§ظ„ظپط§طھظˆط±ط© ط¨ط£ظ…ط§ظ†
# - ط¥ط°ط§ طھظ… طھط±ط­ظٹظ„ ط§ظ„ط¯ظپط¹ط© ظ…ط­ط§ط³ط¨ظٹظ‹ط§ ظ„ط§ ظٹطھظ… ط¥ظ„ط؛ط§ط¤ظ‡ط§ ط¥ظ„ط§ ط¹ط¨ط± ظ…ط³ط§ط± ط¹ظƒط³ ظ…ط­ط§ط³ط¨ظٹ ظ„ط§ط­ظ‚
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, QuerySet, Sum
from django.utils import timezone

from accounting.models import (
    Account,
    AccountNature,
    AccountType as AccountingAccountType,
    AccountingAccountPurpose,
    JournalEntry,
    PostingSource,
)

from accounting.services import (
    post_customer_payment_to_accounting,
    seed_company_chart_of_accounts,
    post_supplier_payment_to_accounting,
    reverse_journal_entry,
    EntryLinePayload,
    create_manual_journal_entry,
    get_account_by_purpose,
    post_journal_entry,
)
from purchases.models import PurchaseBill
from sales.models import SalesInvoice

from .models import (
    CustomerPayment,
    PaymentStatus,
    SupplierPayment,
    TreasuryAccount,
    TreasuryTransaction,
)


ZERO = Decimal("0.00")


@dataclass(frozen=True)
class TreasurySummary:
    total_accounts: int
    active_accounts: int
    inactive_accounts: int
    total_balance: Decimal
    cash_balance: Decimal
    bank_balance: Decimal
    wallet_balance: Decimal
    posted_inflows: Decimal
    posted_outflows: Decimal
    draft_transactions: int
    posted_transactions: int
    cancelled_transactions: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "total_accounts": self.total_accounts,
            "active_accounts": self.active_accounts,
            "inactive_accounts": self.inactive_accounts,
            "total_balance": self.total_balance,
            "cash_balance": self.cash_balance,
            "bank_balance": self.bank_balance,
            "wallet_balance": self.wallet_balance,
            "posted_inflows": self.posted_inflows,
            "posted_outflows": self.posted_outflows,
            "draft_transactions": self.draft_transactions,
            "posted_transactions": self.posted_transactions,
            "cancelled_transactions": self.cancelled_transactions,
        }


# ---------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------


def normalize_decimal(value: Any, *, field_name: str = "amount") -> Decimal:
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Invalid decimal value."}) from exc

    return decimal_value.quantize(Decimal("0.01"))


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_code(value: Any) -> str:
    return normalize_text(value).upper()


def normalize_currency(value: Any) -> str:
    currency = normalize_code(value or "SAR")
    return currency or "SAR"


def normalize_optional_positive_int(value: Any, *, field_name: str) -> int | None:
    if value in (None, ""):
        return None

    try:
        integer_value = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Invalid integer value."}) from exc

    if integer_value <= 0:
        raise ValidationError({field_name: "Value must be greater than zero."})

    return integer_value


def ensure_same_company(company, obj: Any, *, field_name: str) -> None:
    if obj is None:
        return

    if not hasattr(obj, "company_id"):
        raise ValidationError({field_name: "Object does not support company isolation."})

    if obj.company_id != company.id:
        raise ValidationError({field_name: "Object must belong to the same company."})


def ensure_payment_is_editable(payment, *, field_name: str = "status") -> None:
    if payment.status == PaymentStatus.CONFIRMED:
        raise ValidationError({field_name: "Confirmed payment cannot be edited directly."})

    if payment.status == PaymentStatus.CANCELLED:
        raise ValidationError({field_name: "Cancelled payment cannot be edited."})


def get_sales_invoice_or_raise(company, invoice_id: int) -> SalesInvoice:
    try:
        invoice = SalesInvoice.objects.get(id=invoice_id, company=company)
    except SalesInvoice.DoesNotExist as exc:
        raise ValidationError({"sales_invoice": "Sales invoice was not found."}) from exc

    return invoice


def get_purchase_bill_or_raise(company, bill_id: int) -> PurchaseBill:
    try:
        bill = PurchaseBill.objects.get(id=bill_id, company=company)
    except PurchaseBill.DoesNotExist as exc:
        raise ValidationError({"purchase_bill": "Purchase bill was not found."}) from exc

    return bill


# ---------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------


def get_treasury_accounts_queryset(company) -> QuerySet[TreasuryAccount]:
    return TreasuryAccount.objects.filter(company=company).order_by(
        "account_type",
        "name",
        "id",
    )


def get_treasury_transactions_queryset(company) -> QuerySet[TreasuryTransaction]:
    return (
        TreasuryTransaction.objects.filter(company=company)
        .select_related(
            "company",
            "account",
            "counterparty_account",
            "accounting_entry",
            "created_by",
            "updated_by",
            "posted_by",
            "cancelled_by",
        )
        .order_by("-transaction_date", "-id")
    )


def get_customer_payments_queryset(company) -> QuerySet[CustomerPayment]:
    return (
        CustomerPayment.objects.filter(company=company)
        .select_related(
            "company",
            "sales_invoice",
            "treasury_account",
            "treasury_transaction",
            "accounting_entry",
            "confirmed_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )
        .order_by("-payment_date", "-id")
    )


def get_supplier_payments_queryset(company) -> QuerySet[SupplierPayment]:
    return (
        SupplierPayment.objects.filter(company=company)
        .select_related(
            "company",
            "purchase_bill",
            "treasury_account",
            "treasury_transaction",
            "accounting_entry",
            "confirmed_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )
        .order_by("-payment_date", "-id")
    )


def get_treasury_account_or_raise(company, account_id: int) -> TreasuryAccount:
    try:
        account = TreasuryAccount.objects.get(id=account_id, company=company)
    except TreasuryAccount.DoesNotExist as exc:
        raise ValidationError({"account": "Treasury account was not found."}) from exc

    return account


def get_treasury_transaction_or_raise(company, transaction_id: int) -> TreasuryTransaction:
    try:
        treasury_transaction = TreasuryTransaction.objects.select_related(
            "company",
            "account",
            "counterparty_account",
            "accounting_entry",
        ).get(id=transaction_id, company=company)
    except TreasuryTransaction.DoesNotExist as exc:
        raise ValidationError({"transaction": "Treasury transaction was not found."}) from exc

    return treasury_transaction


def get_customer_payment_or_raise(company, payment_id: int) -> CustomerPayment:
    try:
        payment = get_customer_payments_queryset(company).get(id=payment_id)
    except CustomerPayment.DoesNotExist as exc:
        raise ValidationError({"payment": "Customer payment was not found."}) from exc

    return payment


def get_supplier_payment_or_raise(company, payment_id: int) -> SupplierPayment:
    try:
        payment = get_supplier_payments_queryset(company).get(id=payment_id)
    except SupplierPayment.DoesNotExist as exc:
        raise ValidationError({"payment": "Supplier payment was not found."}) from exc

    return payment



# ---------------------------------------------------------------------
# Treasury accounting-account helpers
# ---------------------------------------------------------------------

def _treasury_accounting_config(account_type: str) -> dict[str, str]:
    if account_type == TreasuryAccount.AccountType.BANK:
        return {
            "parent_code": "1102",
            "code_prefix": "110201",
            "purpose": AccountingAccountPurpose.BANK,
            "name_en_prefix": "Bank Account",
        }

    if account_type == TreasuryAccount.AccountType.WALLET:
        return {
            "parent_code": "1101",
            "code_prefix": "110103",
            "purpose": AccountingAccountPurpose.CASH,
            "name_en_prefix": "Wallet Account",
        }

    return {
        "parent_code": "1101",
        "code_prefix": "110101",
        "purpose": AccountingAccountPurpose.CASH,
        "name_en_prefix": "Cash Account",
    }


def _validate_accounting_account_for_treasury(*, company, account: Account) -> Account:
    ensure_same_company(company, account, field_name="accounting_account")

    if account.is_group:
        raise ValidationError({"accounting_account": "Accounting account cannot be a group account."})

    if not account.is_active:
        raise ValidationError({"accounting_account": "Accounting account must be active."})

    if not account.allow_manual_posting:
        raise ValidationError({"accounting_account": "Accounting account must allow posting."})

    if account.account_type != AccountingAccountType.ASSET:
        raise ValidationError({"accounting_account": "Treasury accounting account must be an asset account."})

    if account.nature != AccountNature.DEBIT:
        raise ValidationError({"accounting_account": "Treasury accounting account must have debit nature."})

    return account


def _generate_treasury_accounting_account_code(*, company, code_prefix: str) -> str:
    existing_codes = Account.objects.filter(
        company=company,
        code__startswith=code_prefix,
    ).values_list("code", flat=True)

    max_suffix = 0

    for existing_code in existing_codes:
        suffix = str(existing_code or "")[len(code_prefix):]
        if suffix.isdigit():
            max_suffix = max(max_suffix, int(suffix))

    return f"{code_prefix}{max_suffix + 1:03d}"


def ensure_treasury_accounting_account(
    *,
    company,
    name: str,
    account_type: str,
    currency: str = "SAR",
) -> Account:
    """
    Ensure a postable accounting account for a treasury account.

    Step 2 scope:
    - Create/link the ledger account.
    - Do not create opening journal entry yet.
    """
    if not company:
        raise ValidationError({"company": "Company is required."})

    clean_name = normalize_text(name)
    if not clean_name:
        raise ValidationError({"name": "Treasury account name is required."})

    config = _treasury_accounting_config(account_type)

    parent = Account.objects.filter(
        company=company,
        code=config["parent_code"],
    ).first()

    if not parent:
        seed_company_chart_of_accounts(company)
        parent = Account.objects.filter(
            company=company,
            code=config["parent_code"],
        ).first()

    if not parent:
        raise ValidationError(
            {
                "accounting_account": (
                    f"Parent accounting account {config['parent_code']} was not found."
                )
            }
        )

    if not parent.is_group:
        raise ValidationError(
            {
                "accounting_account": (
                    f"Parent accounting account {parent.code} must be a group account."
                )
            }
        )

    account_code = _generate_treasury_accounting_account_code(
        company=company,
        code_prefix=config["code_prefix"],
    )

    account = Account(
        company=company,
        code=account_code,
        name=clean_name,
        name_en=f"{config['name_en_prefix']} - {clean_name}",
        account_type=AccountingAccountType.ASSET,
        nature=AccountNature.DEBIT,
        purpose=config["purpose"],
        parent=parent,
        is_group=False,
        is_active=True,
        is_system=False,
        allow_manual_posting=True,
        currency=normalize_currency(currency),
        description="Auto-created for treasury account posting.",
        metadata={
            "source": "treasury_account",
            "auto_created": True,
            "treasury_account_type": account_type,
        },
    )
    account.full_clean()
    account.save()

    return account



AUTO_SOURCE_TYPE_TREASURY_OPENING_BALANCE = "treasury_account_opening_balance"
def create_treasury_opening_balance_entry(
    *,
    company,
    treasury_account: TreasuryAccount,
    amount,
    entry_date=None,
    user=None,
) -> JournalEntry | None:
    """
    Create and post the opening balance journal entry for a treasury account.
    Accounting effect:
    - Debit  linked treasury accounting account
    - Credit opening equity account
    """
    amount_decimal = normalize_decimal(amount, field_name="opening_balance")
    if amount_decimal <= ZERO:
        return None
    ensure_same_company(company, treasury_account, field_name="treasury_account")
    with transaction.atomic():
        treasury_account = (
            TreasuryAccount.objects.select_for_update()
            .select_related(
                "accounting_account",
                "opening_accounting_entry",
            )
            .get(
                id=treasury_account.id,
                company=company,
            )
        )
        if treasury_account.opening_accounting_entry_id:
            return treasury_account.opening_accounting_entry
        if not treasury_account.accounting_account_id:
            raise ValidationError(
                {
                    "accounting_account": (
                        "Treasury account must be linked to an accounting account before posting opening balance."
                    )
                }
            )
        treasury_posting_account = _validate_accounting_account_for_treasury(
            company=company,
            account=treasury_account.accounting_account,
        )
        opening_equity_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.OPENING_EQUITY,
            required=True,
        )
        entry = create_manual_journal_entry(
            company=company,
            entry_date=entry_date or timezone.localdate(),
            description=f"Opening balance for treasury account: {treasury_account.name}",
            reference=f"TREASURY-OPENING-{treasury_account.id}",
            external_reference=treasury_account.code or str(treasury_account.id),
            currency=treasury_account.currency,
            actor=user,
            auto_post=False,
            lines=[
                EntryLinePayload(
                    account=treasury_posting_account,
                    description=f"Opening balance debit for {treasury_account.name}",
                    debit_amount=amount_decimal,
                    credit_amount=ZERO,
                    currency=treasury_account.currency,
                    source_line_id=f"treasury-account:{treasury_account.id}:debit",
                    sort_order=1,
                    metadata={
                        "source": "treasury_opening_balance",
                        "treasury_account_id": treasury_account.id,
                    },
                ),
                EntryLinePayload(
                    account=opening_equity_account,
                    description=f"Opening balance credit for {treasury_account.name}",
                    debit_amount=ZERO,
                    credit_amount=amount_decimal,
                    currency=treasury_account.currency,
                    source_line_id=f"treasury-account:{treasury_account.id}:credit",
                    sort_order=2,
                    metadata={
                        "source": "treasury_opening_balance",
                        "treasury_account_id": treasury_account.id,
                    },
                ),
            ],
        )
        entry.posting_source = PostingSource.OPENING_BALANCE
        entry.source_type = AUTO_SOURCE_TYPE_TREASURY_OPENING_BALANCE
        entry.source_id = str(treasury_account.id)
        entry.source_number = treasury_account.code or str(treasury_account.id)
        entry.is_auto_posted = True
        entry.save(
            update_fields=[
                "posting_source",
                "source_type",
                "source_id",
                "source_number",
                "is_auto_posted",
                "updated_at",
            ]
        )
        entry = post_journal_entry(entry, actor=user)
        treasury_account.opening_accounting_entry = entry
        treasury_account.save(
            update_fields=[
                "opening_accounting_entry",
                "updated_at",
            ]
        )
        return entry
# ---------------------------------------------------------------------
# Treasury account services
# ---------------------------------------------------------------------


def create_treasury_account(
    *,
    company,
    user=None,
    name: str,
    account_type: str = TreasuryAccount.AccountType.CASH,
    code: str = "",
    currency: str = "SAR",
    opening_balance: Any = ZERO,
    bank_name: str = "",
    bank_account_number: str = "",
    iban: str = "",
    is_default: bool = False,
    notes: str = "",
    status: str = TreasuryAccount.AccountStatus.ACTIVE,
    accounting_account: Account | None = None,
    auto_create_accounting_account: bool = True,
) -> TreasuryAccount:
    opening_balance_decimal = normalize_decimal(
        opening_balance,
        field_name="opening_balance",
    )

    if not normalize_text(name):
        raise ValidationError({"name": "Treasury account name is required."})

    with transaction.atomic():
        linked_account = accounting_account

        if linked_account is not None:
            linked_account = _validate_accounting_account_for_treasury(
                company=company,
                account=linked_account,
            )
        elif auto_create_accounting_account:
            linked_account = ensure_treasury_accounting_account(
                company=company,
                name=normalize_text(name),
                account_type=account_type,
                currency=normalize_currency(currency),
            )

        account = TreasuryAccount(
            company=company,
            accounting_account=linked_account,
            name=normalize_text(name),
            code=normalize_code(code),
            account_type=account_type,
            status=status,
            currency=normalize_currency(currency),
            opening_balance=opening_balance_decimal,
            current_balance=opening_balance_decimal,
            bank_name=normalize_text(bank_name),
            bank_account_number=normalize_text(bank_account_number),
            iban=normalize_code(iban),
            is_default=bool(is_default),
            notes=normalize_text(notes),
            created_by=user if getattr(user, "is_authenticated", False) else None,
            updated_by=user if getattr(user, "is_authenticated", False) else None,
        )

        account.full_clean()
        account.save()

        if account.is_default:
            (
                TreasuryAccount.objects.filter(company=company)
                .exclude(id=account.id)
                .update(is_default=False)
            )

        if opening_balance_decimal > ZERO:
            create_treasury_opening_balance_entry(
                company=company,
                treasury_account=account,
                amount=opening_balance_decimal,
                entry_date=timezone.localdate(),
                user=user,
            )
            account.refresh_from_db()

        return account


def update_treasury_account(
    *,
    company,
    account: TreasuryAccount,
    user=None,
    name: str | None = None,
    account_type: str | None = None,
    code: str | None = None,
    currency: str | None = None,
    bank_name: str | None = None,
    bank_account_number: str | None = None,
    iban: str | None = None,
    is_default: bool | None = None,
    notes: str | None = None,
    status: str | None = None,
) -> TreasuryAccount:
    ensure_same_company(company, account, field_name="account")

    with transaction.atomic():
        account = TreasuryAccount.objects.select_for_update().get(
            id=account.id,
            company=company,
        )

        if name is not None:
            if not normalize_text(name):
                raise ValidationError({"name": "Treasury account name is required."})
            account.name = normalize_text(name)

        if account_type is not None:
            account.account_type = account_type

        if code is not None:
            account.code = normalize_code(code)

        if currency is not None:
            account.currency = normalize_currency(currency)

        if bank_name is not None:
            account.bank_name = normalize_text(bank_name)

        if bank_account_number is not None:
            account.bank_account_number = normalize_text(bank_account_number)

        if iban is not None:
            account.iban = normalize_code(iban)

        if is_default is not None:
            account.is_default = bool(is_default)

        if notes is not None:
            account.notes = normalize_text(notes)

        if status is not None:
            account.status = status

        account.updated_by = user if getattr(user, "is_authenticated", False) else None
        account.full_clean()
        account.save()

        if account.is_default:
            (
                TreasuryAccount.objects.filter(company=company)
                .exclude(id=account.id)
                .update(is_default=False)
            )

        return account


def deactivate_treasury_account(
    *,
    company,
    account: TreasuryAccount,
    user=None,
) -> TreasuryAccount:
    return update_treasury_account(
        company=company,
        account=account,
        user=user,
        status=TreasuryAccount.AccountStatus.INACTIVE,
    )


# ---------------------------------------------------------------------
# Treasury transaction services
# ---------------------------------------------------------------------


def generate_treasury_transaction_number(company) -> str:
    year = timezone.localdate().year
    prefix = f"TR-{year}-"

    last_transaction = (
        TreasuryTransaction.objects.filter(
            company=company,
            transaction_number__startswith=prefix,
        )
        .order_by("-id")
        .first()
    )

    if not last_transaction or not last_transaction.transaction_number:
        next_number = 1
    else:
        try:
            next_number = int(last_transaction.transaction_number.replace(prefix, "")) + 1
        except ValueError:
            next_number = last_transaction.id + 1

    return f"{prefix}{next_number:06d}"


def create_treasury_transaction(
    *,
    company,
    account: TreasuryAccount,
    user=None,
    transaction_type: str,
    amount: Any,
    transaction_date=None,
    counterparty_account: TreasuryAccount | None = None,
    source_type: str = TreasuryTransaction.SourceType.MANUAL,
    source_app: str = "",
    source_model: str = "",
    source_object_id: int | None = None,
    reference: str = "",
    description: str = "",
    notes: str = "",
    currency: str | None = None,
    transaction_number: str = "",
    status: str = TreasuryTransaction.TransactionStatus.DRAFT,
) -> TreasuryTransaction:
    ensure_same_company(company, account, field_name="account")

    if counterparty_account is not None:
        ensure_same_company(company, counterparty_account, field_name="counterparty_account")

    amount_decimal = normalize_decimal(amount)

    if amount_decimal <= ZERO:
        raise ValidationError({"amount": "Treasury transaction amount must be greater than zero."})

    if transaction_type == TreasuryTransaction.TransactionType.TRANSFER and counterparty_account is None:
        raise ValidationError(
            {"counterparty_account": "Counterparty account is required for transfers."}
        )

    if transaction_type != TreasuryTransaction.TransactionType.TRANSFER and counterparty_account is not None:
        raise ValidationError(
            {"counterparty_account": "Counterparty account is only allowed for transfers."}
        )

    with transaction.atomic():
        if not transaction_number:
            transaction_number = generate_treasury_transaction_number(company)

        treasury_transaction = TreasuryTransaction(
            company=company,
            account=account,
            counterparty_account=counterparty_account,
            transaction_number=normalize_code(transaction_number),
            transaction_type=transaction_type,
            status=TreasuryTransaction.TransactionStatus.DRAFT,
            source_type=source_type,
            source_app=normalize_text(source_app),
            source_model=normalize_text(source_model),
            source_object_id=source_object_id,
            amount=amount_decimal,
            currency=normalize_currency(currency or account.currency),
            transaction_date=transaction_date or timezone.localdate(),
            reference=normalize_text(reference),
            description=normalize_text(description),
            notes=normalize_text(notes),
            created_by=user if getattr(user, "is_authenticated", False) else None,
            updated_by=user if getattr(user, "is_authenticated", False) else None,
        )

        treasury_transaction.full_clean()
        treasury_transaction.save()

        if status == TreasuryTransaction.TransactionStatus.POSTED:
            treasury_transaction = post_treasury_transaction(
                company=company,
                treasury_transaction=treasury_transaction,
                user=user,
            )

        return treasury_transaction


def _apply_posting_balance_effect(
    *,
    account: TreasuryAccount,
    treasury_transaction: TreasuryTransaction,
) -> tuple[Decimal, Decimal]:
    balance_before = account.current_balance or ZERO
    amount = treasury_transaction.amount

    if treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.INFLOW:
        balance_after = balance_before + amount
    elif treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.OUTFLOW:
        if balance_before < amount:
            raise ValidationError({"amount": "Insufficient treasury account balance."})
        balance_after = balance_before - amount
    elif treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.ADJUSTMENT:
        balance_after = balance_before + amount
    elif treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.TRANSFER:
        if balance_before < amount:
            raise ValidationError({"amount": "Insufficient treasury account balance for transfer."})
        balance_after = balance_before - amount
    else:
        raise ValidationError({"transaction_type": "Unsupported treasury transaction type."})

    account.current_balance = balance_after
    account.save(update_fields=["current_balance", "updated_at"])

    return balance_before, balance_after


def _apply_transfer_counterparty_effect(
    *,
    counterparty_account: TreasuryAccount,
    amount: Decimal,
) -> tuple[Decimal, Decimal]:
    balance_before = counterparty_account.current_balance or ZERO
    balance_after = balance_before + amount

    counterparty_account.current_balance = balance_after
    counterparty_account.save(update_fields=["current_balance", "updated_at"])

    return balance_before, balance_after


def post_treasury_transaction(
    *,
    company,
    treasury_transaction: TreasuryTransaction,
    user=None,
) -> TreasuryTransaction:
    ensure_same_company(company, treasury_transaction, field_name="transaction")

    with transaction.atomic():
        treasury_transaction = TreasuryTransaction.objects.select_for_update().select_related(
            "account",
            "counterparty_account",
        ).get(
            id=treasury_transaction.id,
            company=company,
        )

        if treasury_transaction.status == TreasuryTransaction.TransactionStatus.POSTED:
            return treasury_transaction

        if treasury_transaction.status == TreasuryTransaction.TransactionStatus.CANCELLED:
            raise ValidationError({"status": "Cancelled treasury transaction cannot be posted."})

        account = TreasuryAccount.objects.select_for_update().get(
            id=treasury_transaction.account_id,
            company=company,
        )

        if account.status != TreasuryAccount.AccountStatus.ACTIVE:
            raise ValidationError({"account": "Treasury account is inactive."})

        counterparty_account = None
        if treasury_transaction.counterparty_account_id:
            counterparty_account = TreasuryAccount.objects.select_for_update().get(
                id=treasury_transaction.counterparty_account_id,
                company=company,
            )

            if counterparty_account.status != TreasuryAccount.AccountStatus.ACTIVE:
                raise ValidationError(
                    {"counterparty_account": "Counterparty treasury account is inactive."}
                )

        balance_before, balance_after = _apply_posting_balance_effect(
            account=account,
            treasury_transaction=treasury_transaction,
        )

        if treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.TRANSFER:
            if counterparty_account is None:
                raise ValidationError(
                    {"counterparty_account": "Counterparty account is required for transfers."}
                )
            _apply_transfer_counterparty_effect(
                counterparty_account=counterparty_account,
                amount=treasury_transaction.amount,
            )

        treasury_transaction.balance_before = balance_before
        treasury_transaction.balance_after = balance_after
        treasury_transaction.status = TreasuryTransaction.TransactionStatus.POSTED
        treasury_transaction.posted_at = timezone.now()
        treasury_transaction.posted_by = user if getattr(user, "is_authenticated", False) else None
        treasury_transaction.updated_by = user if getattr(user, "is_authenticated", False) else None
        treasury_transaction.save(
            update_fields=[
                "balance_before",
                "balance_after",
                "status",
                "posted_at",
                "posted_by",
                "updated_by",
                "updated_at",
            ]
        )

        return treasury_transaction


def cancel_treasury_transaction(
    *,
    company,
    treasury_transaction: TreasuryTransaction,
    user=None,
    reason: str = "",
) -> TreasuryTransaction:
    ensure_same_company(company, treasury_transaction, field_name="transaction")

    with transaction.atomic():
        treasury_transaction = TreasuryTransaction.objects.select_for_update().select_related(
            "account",
            "counterparty_account",
        ).get(
            id=treasury_transaction.id,
            company=company,
        )

        if treasury_transaction.status == TreasuryTransaction.TransactionStatus.CANCELLED:
            return treasury_transaction

        if treasury_transaction.is_accounting_posted or treasury_transaction.accounting_entry_id:
            raise ValidationError(
                {
                    "accounting_entry": (
                        "Accounting-posted treasury transaction cannot be cancelled "
                        "without a reversal workflow."
                    )
                }
            )

        if treasury_transaction.status == TreasuryTransaction.TransactionStatus.POSTED:
            _reverse_posted_treasury_transaction_balance(
                company=company,
                treasury_transaction=treasury_transaction,
            )

        treasury_transaction.status = TreasuryTransaction.TransactionStatus.CANCELLED
        treasury_transaction.cancelled_at = timezone.now()
        treasury_transaction.cancelled_by = user if getattr(user, "is_authenticated", False) else None
        treasury_transaction.cancellation_reason = normalize_text(reason)
        treasury_transaction.updated_by = user if getattr(user, "is_authenticated", False) else None
        treasury_transaction.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancellation_reason",
                "updated_by",
                "updated_at",
            ]
        )

        return treasury_transaction


def _reverse_posted_treasury_transaction_balance(
    *,
    company,
    treasury_transaction: TreasuryTransaction,
) -> None:
    account = TreasuryAccount.objects.select_for_update().get(
        id=treasury_transaction.account_id,
        company=company,
    )

    amount = treasury_transaction.amount

    if treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.INFLOW:
        if account.current_balance < amount:
            raise ValidationError(
                {
                    "amount": (
                        "Treasury account balance is lower than the posted inflow amount; "
                        "cannot cancel safely."
                    )
                }
            )
        account.current_balance = account.current_balance - amount

    elif treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.OUTFLOW:
        account.current_balance = account.current_balance + amount

    elif treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.ADJUSTMENT:
        if account.current_balance < amount:
            raise ValidationError(
                {
                    "amount": (
                        "Treasury account balance is lower than the posted adjustment amount; "
                        "cannot cancel safely."
                    )
                }
            )
        account.current_balance = account.current_balance - amount

    elif treasury_transaction.transaction_type == TreasuryTransaction.TransactionType.TRANSFER:
        counterparty_account = TreasuryAccount.objects.select_for_update().get(
            id=treasury_transaction.counterparty_account_id,
            company=company,
        )

        if counterparty_account.current_balance < amount:
            raise ValidationError(
                {
                    "counterparty_account": (
                        "Counterparty balance is lower than the transferred amount; "
                        "cannot cancel safely."
                    )
                }
            )

        account.current_balance = account.current_balance + amount
        counterparty_account.current_balance = counterparty_account.current_balance - amount
        counterparty_account.save(update_fields=["current_balance", "updated_at"])

    else:
        raise ValidationError({"transaction_type": "Unsupported treasury transaction type."})

    account.save(update_fields=["current_balance", "updated_at"])


# ---------------------------------------------------------------------
# Payment allocation helpers
# ---------------------------------------------------------------------


def _lock_customer_payment_invoice(company, payment: CustomerPayment) -> SalesInvoice | None:
    if not payment.sales_invoice_id:
        return None

    return SalesInvoice.objects.select_for_update().get(
        id=payment.sales_invoice_id,
        company=company,
    )


def _lock_supplier_payment_bill(company, payment: SupplierPayment) -> PurchaseBill | None:
    if not payment.purchase_bill_id:
        return None

    return PurchaseBill.objects.select_for_update().get(
        id=payment.purchase_bill_id,
        company=company,
    )


def _apply_customer_payment_invoice_allocation(
    *,
    company,
    payment: CustomerPayment,
    user=None,
) -> None:
    invoice = _lock_customer_payment_invoice(company, payment)
    if invoice is None:
        return

    invoice.apply_payment_allocation(
        payment.amount,
        save=True,
        user=user,
    )


def _reverse_customer_payment_invoice_allocation(
    *,
    company,
    payment: CustomerPayment,
    user=None,
) -> None:
    invoice = _lock_customer_payment_invoice(company, payment)
    if invoice is None:
        return

    invoice.reverse_payment_allocation(
        payment.amount,
        save=True,
        user=user,
    )


def _apply_supplier_payment_bill_allocation(
    *,
    company,
    payment: SupplierPayment,
    user=None,
) -> None:
    bill = _lock_supplier_payment_bill(company, payment)
    if bill is None:
        return

    bill.apply_payment_allocation(
        payment.amount,
        save=True,
        user=user,
    )


def _reverse_supplier_payment_bill_allocation(
    *,
    company,
    payment: SupplierPayment,
    user=None,
) -> None:
    bill = _lock_supplier_payment_bill(company, payment)
    if bill is None:
        return

    bill.reverse_payment_allocation(
        payment.amount,
        save=True,
        user=user,
    )


# ---------------------------------------------------------------------
# Customer payment services
# ---------------------------------------------------------------------


def generate_customer_payment_number(company) -> str:
    year = timezone.localdate().year
    prefix = f"CP-{year}-"

    last_payment = (
        CustomerPayment.objects.filter(
            company=company,
            payment_number__startswith=prefix,
        )
        .order_by("-id")
        .first()
    )

    if not last_payment or not last_payment.payment_number:
        next_number = 1
    else:
        try:
            next_number = int(last_payment.payment_number.replace(prefix, "")) + 1
        except ValueError:
            next_number = last_payment.id + 1

    return f"{prefix}{next_number:06d}"


def create_customer_payment(
    *,
    company,
    treasury_account: TreasuryAccount,
    user=None,
    amount: Any,
    payment_method: str,
    payment_date=None,
    customer_id: Any = None,
    customer_name: str = "",
    customer_phone: str = "",
    sales_invoice=None,
    currency: str | None = None,
    payment_number: str = "",
    reference: str = "",
    description: str = "",
    notes: str = "",
    status: str = PaymentStatus.DRAFT,
) -> CustomerPayment:
    ensure_same_company(company, treasury_account, field_name="treasury_account")
    ensure_same_company(company, sales_invoice, field_name="sales_invoice")

    amount_decimal = normalize_decimal(amount)

    if amount_decimal <= ZERO:
        raise ValidationError({"amount": "Customer payment amount must be greater than zero."})

    with transaction.atomic():
        if not payment_number:
            payment_number = generate_customer_payment_number(company)

        payment = CustomerPayment(
            company=company,
            payment_number=normalize_code(payment_number),
            customer_id=normalize_optional_positive_int(
                customer_id,
                field_name="customer_id",
            ),
            customer_name=normalize_text(customer_name),
            customer_phone=normalize_text(customer_phone),
            sales_invoice=sales_invoice,
            treasury_account=treasury_account,
            amount=amount_decimal,
            currency=normalize_currency(currency or treasury_account.currency),
            payment_method=payment_method,
            status=PaymentStatus.DRAFT,
            payment_date=payment_date or timezone.localdate(),
            reference=normalize_text(reference),
            description=normalize_text(description),
            notes=normalize_text(notes),
            created_by=user if getattr(user, "is_authenticated", False) else None,
            updated_by=user if getattr(user, "is_authenticated", False) else None,
        )

        payment.full_clean()
        payment.save()

        if status == PaymentStatus.CONFIRMED:
            payment = confirm_customer_payment(
                company=company,
                payment=payment,
                user=user,
            )

        return payment


def update_customer_payment(
    *,
    company,
    payment: CustomerPayment,
    user=None,
    treasury_account: TreasuryAccount | None = None,
    amount: Any | None = None,
    payment_method: str | None = None,
    payment_date=None,
    customer_id: Any = None,
    customer_name: str | None = None,
    customer_phone: str | None = None,
    sales_invoice=None,
    currency: str | None = None,
    reference: str | None = None,
    description: str | None = None,
    notes: str | None = None,
) -> CustomerPayment:
    ensure_same_company(company, payment, field_name="payment")

    with transaction.atomic():
        payment = CustomerPayment.objects.select_for_update().get(
            id=payment.id,
            company=company,
        )

        ensure_payment_is_editable(payment)

        if treasury_account is not None:
            ensure_same_company(company, treasury_account, field_name="treasury_account")
            payment.treasury_account = treasury_account

        if amount is not None:
            amount_decimal = normalize_decimal(amount)
            if amount_decimal <= ZERO:
                raise ValidationError({"amount": "Customer payment amount must be greater than zero."})
            payment.amount = amount_decimal

        if payment_method is not None:
            payment.payment_method = payment_method

        if payment_date is not None:
            payment.payment_date = payment_date

        if customer_id is not None:
            payment.customer_id = normalize_optional_positive_int(
                customer_id,
                field_name="customer_id",
            )

        if customer_name is not None:
            payment.customer_name = normalize_text(customer_name)

        if customer_phone is not None:
            payment.customer_phone = normalize_text(customer_phone)

        if sales_invoice is not None:
            ensure_same_company(company, sales_invoice, field_name="sales_invoice")
            payment.sales_invoice = sales_invoice

        if currency is not None:
            payment.currency = normalize_currency(currency)

        if reference is not None:
            payment.reference = normalize_text(reference)

        if description is not None:
            payment.description = normalize_text(description)

        if notes is not None:
            payment.notes = normalize_text(notes)

        payment.updated_by = user if getattr(user, "is_authenticated", False) else None
        payment.full_clean()
        payment.save()

        return payment


def confirm_customer_payment(
    *,
    company,
    payment: CustomerPayment,
    user=None,
) -> CustomerPayment:
    ensure_same_company(company, payment, field_name="payment")

    with transaction.atomic():
        payment = CustomerPayment.objects.select_for_update().select_related(
            "sales_invoice",
            "treasury_account",
            "treasury_transaction",
            "accounting_entry",
        ).get(
            id=payment.id,
            company=company,
        )

        if payment.status == PaymentStatus.CONFIRMED:
            return payment

        if payment.status == PaymentStatus.CANCELLED:
            raise ValidationError({"status": "Cancelled customer payment cannot be confirmed."})

        _apply_customer_payment_invoice_allocation(
            company=company,
            payment=payment,
            user=user,
        )

        if payment.treasury_transaction_id:
            treasury_transaction = payment.treasury_transaction
            if treasury_transaction.status != TreasuryTransaction.TransactionStatus.POSTED:
                treasury_transaction = post_treasury_transaction(
                    company=company,
                    treasury_transaction=treasury_transaction,
                    user=user,
                )
        else:
            treasury_transaction = create_treasury_transaction(
                company=company,
                account=payment.treasury_account,
                user=user,
                transaction_type=TreasuryTransaction.TransactionType.INFLOW,
                amount=payment.amount,
                transaction_date=payment.payment_date,
                source_type=TreasuryTransaction.SourceType.CUSTOMER_PAYMENT,
                source_app="treasury",
                source_model="CustomerPayment",
                source_object_id=payment.id,
                reference=payment.reference,
                description=payment.description
                or f"Customer payment {payment.payment_number}",
                notes=payment.notes,
                currency=payment.currency,
                status=TreasuryTransaction.TransactionStatus.POSTED,
            )

        payment.treasury_transaction = treasury_transaction
        payment.status = PaymentStatus.CONFIRMED
        payment.confirmed_at = timezone.now()
        payment.confirmed_by = user if getattr(user, "is_authenticated", False) else None
        payment.updated_by = user if getattr(user, "is_authenticated", False) else None
        payment.save(
            update_fields=[
                "treasury_transaction",
                "status",
                "confirmed_at",
                "confirmed_by",
                "updated_by",
                "updated_at",
            ]
        )

        post_customer_payment_to_accounting(
            payment,
            actor=user,
            auto_post=True,
        )
        payment.refresh_from_db()

        return payment


def cancel_customer_payment(
    *,
    company,
    payment: CustomerPayment,
    user=None,
    reason: str = "",
) -> CustomerPayment:
    ensure_same_company(company, payment, field_name="payment")

    with transaction.atomic():
        payment = CustomerPayment.objects.select_for_update().select_related(
            "sales_invoice",
            "treasury_transaction",
            "accounting_entry",
        ).get(
            id=payment.id,
            company=company,
        )

        if payment.status == PaymentStatus.CANCELLED:
            return payment

        was_confirmed = payment.status == PaymentStatus.CONFIRMED

        if payment.is_accounting_posted or payment.accounting_entry_id:
            if not payment.accounting_entry_id:
                raise ValidationError(
                    {
                        "accounting_entry": (
                            "Accounting-posted customer payment is missing its journal entry."
                        )
                    }
                )

            reverse_journal_entry(
                payment.accounting_entry,
                reason=reason or f"Customer payment {payment.payment_number} cancelled.",
                actor=user,
            )

        if payment.treasury_transaction_id:
            cancel_treasury_transaction(
                company=company,
                treasury_transaction=payment.treasury_transaction,
                user=user,
                reason=reason or f"Customer payment {payment.payment_number} cancelled.",
            )

        if was_confirmed:
            _reverse_customer_payment_invoice_allocation(
                company=company,
                payment=payment,
                user=user,
            )

        payment.status = PaymentStatus.CANCELLED
        payment.cancelled_at = timezone.now()
        payment.cancelled_by = user if getattr(user, "is_authenticated", False) else None
        payment.cancellation_reason = normalize_text(reason)
        payment.updated_by = user if getattr(user, "is_authenticated", False) else None
        payment.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancellation_reason",
                "updated_by",
                "updated_at",
            ]
        )

        return payment


# ---------------------------------------------------------------------
# Supplier payment services
# ---------------------------------------------------------------------


def generate_supplier_payment_number(company) -> str:
    year = timezone.localdate().year
    prefix = f"SP-{year}-"

    last_payment = (
        SupplierPayment.objects.filter(
            company=company,
            payment_number__startswith=prefix,
        )
        .order_by("-id")
        .first()
    )

    if not last_payment or not last_payment.payment_number:
        next_number = 1
    else:
        try:
            next_number = int(last_payment.payment_number.replace(prefix, "")) + 1
        except ValueError:
            next_number = last_payment.id + 1

    return f"{prefix}{next_number:06d}"


def create_supplier_payment(
    *,
    company,
    treasury_account: TreasuryAccount,
    user=None,
    amount: Any,
    payment_method: str,
    payment_date=None,
    supplier_id: Any = None,
    supplier_name: str = "",
    supplier_phone: str = "",
    purchase_bill=None,
    currency: str | None = None,
    payment_number: str = "",
    reference: str = "",
    description: str = "",
    notes: str = "",
    status: str = PaymentStatus.DRAFT,
) -> SupplierPayment:
    ensure_same_company(company, treasury_account, field_name="treasury_account")
    ensure_same_company(company, purchase_bill, field_name="purchase_bill")

    amount_decimal = normalize_decimal(amount)

    if amount_decimal <= ZERO:
        raise ValidationError({"amount": "Supplier payment amount must be greater than zero."})

    with transaction.atomic():
        if not payment_number:
            payment_number = generate_supplier_payment_number(company)

        payment = SupplierPayment(
            company=company,
            payment_number=normalize_code(payment_number),
            supplier_id=normalize_optional_positive_int(
                supplier_id,
                field_name="supplier_id",
            ),
            supplier_name=normalize_text(supplier_name),
            supplier_phone=normalize_text(supplier_phone),
            purchase_bill=purchase_bill,
            treasury_account=treasury_account,
            amount=amount_decimal,
            currency=normalize_currency(currency or treasury_account.currency),
            payment_method=payment_method,
            status=PaymentStatus.DRAFT,
            payment_date=payment_date or timezone.localdate(),
            reference=normalize_text(reference),
            description=normalize_text(description),
            notes=normalize_text(notes),
            created_by=user if getattr(user, "is_authenticated", False) else None,
            updated_by=user if getattr(user, "is_authenticated", False) else None,
        )

        payment.full_clean()
        payment.save()

        if status == PaymentStatus.CONFIRMED:
            payment = confirm_supplier_payment(
                company=company,
                payment=payment,
                user=user,
            )

        return payment


def update_supplier_payment(
    *,
    company,
    payment: SupplierPayment,
    user=None,
    treasury_account: TreasuryAccount | None = None,
    amount: Any | None = None,
    payment_method: str | None = None,
    payment_date=None,
    supplier_id: Any = None,
    supplier_name: str | None = None,
    supplier_phone: str | None = None,
    purchase_bill=None,
    currency: str | None = None,
    reference: str | None = None,
    description: str | None = None,
    notes: str | None = None,
) -> SupplierPayment:
    ensure_same_company(company, payment, field_name="payment")

    with transaction.atomic():
        payment = SupplierPayment.objects.select_for_update().get(
            id=payment.id,
            company=company,
        )

        ensure_payment_is_editable(payment)

        if treasury_account is not None:
            ensure_same_company(company, treasury_account, field_name="treasury_account")
            payment.treasury_account = treasury_account

        if amount is not None:
            amount_decimal = normalize_decimal(amount)
            if amount_decimal <= ZERO:
                raise ValidationError({"amount": "Supplier payment amount must be greater than zero."})
            payment.amount = amount_decimal

        if payment_method is not None:
            payment.payment_method = payment_method

        if payment_date is not None:
            payment.payment_date = payment_date

        if supplier_id is not None:
            payment.supplier_id = normalize_optional_positive_int(
                supplier_id,
                field_name="supplier_id",
            )

        if supplier_name is not None:
            payment.supplier_name = normalize_text(supplier_name)

        if supplier_phone is not None:
            payment.supplier_phone = normalize_text(supplier_phone)

        if purchase_bill is not None:
            ensure_same_company(company, purchase_bill, field_name="purchase_bill")
            payment.purchase_bill = purchase_bill

        if currency is not None:
            payment.currency = normalize_currency(currency)

        if reference is not None:
            payment.reference = normalize_text(reference)

        if description is not None:
            payment.description = normalize_text(description)

        if notes is not None:
            payment.notes = normalize_text(notes)

        payment.updated_by = user if getattr(user, "is_authenticated", False) else None
        payment.full_clean()
        payment.save()

        return payment


def confirm_supplier_payment(
    *,
    company,
    payment: SupplierPayment,
    user=None,
) -> SupplierPayment:
    ensure_same_company(company, payment, field_name="payment")

    with transaction.atomic():
        payment = SupplierPayment.objects.select_for_update().select_related(
            "purchase_bill",
            "treasury_account",
            "treasury_transaction",
            "accounting_entry",
        ).get(
            id=payment.id,
            company=company,
        )

        if payment.status == PaymentStatus.CONFIRMED:
            return payment

        if payment.status == PaymentStatus.CANCELLED:
            raise ValidationError({"status": "Cancelled supplier payment cannot be confirmed."})

        _apply_supplier_payment_bill_allocation(
            company=company,
            payment=payment,
            user=user,
        )

        if payment.treasury_transaction_id:
            treasury_transaction = payment.treasury_transaction
            if treasury_transaction.status != TreasuryTransaction.TransactionStatus.POSTED:
                treasury_transaction = post_treasury_transaction(
                    company=company,
                    treasury_transaction=treasury_transaction,
                    user=user,
                )
        else:
            treasury_transaction = create_treasury_transaction(
                company=company,
                account=payment.treasury_account,
                user=user,
                transaction_type=TreasuryTransaction.TransactionType.OUTFLOW,
                amount=payment.amount,
                transaction_date=payment.payment_date,
                source_type=TreasuryTransaction.SourceType.SUPPLIER_PAYMENT,
                source_app="treasury",
                source_model="SupplierPayment",
                source_object_id=payment.id,
                reference=payment.reference,
                description=payment.description
                or f"Supplier payment {payment.payment_number}",
                notes=payment.notes,
                currency=payment.currency,
                status=TreasuryTransaction.TransactionStatus.POSTED,
            )

        payment.treasury_transaction = treasury_transaction
        payment.status = PaymentStatus.CONFIRMED
        payment.confirmed_at = timezone.now()
        payment.confirmed_by = user if getattr(user, "is_authenticated", False) else None
        payment.updated_by = user if getattr(user, "is_authenticated", False) else None
        payment.save(
            update_fields=[
                "treasury_transaction",
                "status",
                "confirmed_at",
                "confirmed_by",
                "updated_by",
                "updated_at",
            ]
        )

        post_supplier_payment_to_accounting(
            payment,
            actor=user,
            auto_post=True,
        )
        payment.refresh_from_db()

        return payment


def cancel_supplier_payment(
    *,
    company,
    payment: SupplierPayment,
    user=None,
    reason: str = "",
) -> SupplierPayment:
    ensure_same_company(company, payment, field_name="payment")

    with transaction.atomic():
        payment = SupplierPayment.objects.select_for_update().select_related(
            "purchase_bill",
            "treasury_transaction",
            "accounting_entry",
        ).get(
            id=payment.id,
            company=company,
        )

        if payment.status == PaymentStatus.CANCELLED:
            return payment

        was_confirmed = payment.status == PaymentStatus.CONFIRMED

        if payment.is_accounting_posted or payment.accounting_entry_id:
            if not payment.accounting_entry_id:
                raise ValidationError(
                    {
                        "accounting_entry": (
                            "Accounting-posted supplier payment is missing its journal entry."
                        )
                    }
                )

            reverse_journal_entry(
                payment.accounting_entry,
                reason=reason or f"Supplier payment {payment.payment_number} cancelled.",
                actor=user,
            )

        if payment.treasury_transaction_id:
            cancel_treasury_transaction(
                company=company,
                treasury_transaction=payment.treasury_transaction,
                user=user,
                reason=reason or f"Supplier payment {payment.payment_number} cancelled.",
            )

        if was_confirmed:
            _reverse_supplier_payment_bill_allocation(
                company=company,
                payment=payment,
                user=user,
            )

        payment.status = PaymentStatus.CANCELLED
        payment.cancelled_at = timezone.now()
        payment.cancelled_by = user if getattr(user, "is_authenticated", False) else None
        payment.cancellation_reason = normalize_text(reason)
        payment.updated_by = user if getattr(user, "is_authenticated", False) else None
        payment.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancellation_reason",
                "updated_by",
                "updated_at",
            ]
        )

        return payment


# ---------------------------------------------------------------------
# Summary services
# ---------------------------------------------------------------------


def get_treasury_summary(company) -> TreasurySummary:
    accounts = TreasuryAccount.objects.filter(company=company)

    account_stats = accounts.aggregate(
        total_accounts=Count("id"),
        active_accounts=Count(
            "id",
            filter=Q(status=TreasuryAccount.AccountStatus.ACTIVE),
        ),
        inactive_accounts=Count(
            "id",
            filter=Q(status=TreasuryAccount.AccountStatus.INACTIVE),
        ),
        total_balance=Sum("current_balance"),
        cash_balance=Sum(
            "current_balance",
            filter=Q(account_type=TreasuryAccount.AccountType.CASH),
        ),
        bank_balance=Sum(
            "current_balance",
            filter=Q(account_type=TreasuryAccount.AccountType.BANK),
        ),
        wallet_balance=Sum(
            "current_balance",
            filter=Q(account_type=TreasuryAccount.AccountType.WALLET),
        ),
    )

    transactions = TreasuryTransaction.objects.filter(company=company)

    transaction_stats = transactions.aggregate(
        posted_inflows=Sum(
            "amount",
            filter=Q(
                status=TreasuryTransaction.TransactionStatus.POSTED,
                transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            ),
        ),
        posted_outflows=Sum(
            "amount",
            filter=Q(
                status=TreasuryTransaction.TransactionStatus.POSTED,
                transaction_type=TreasuryTransaction.TransactionType.OUTFLOW,
            ),
        ),
        draft_transactions=Count(
            "id",
            filter=Q(status=TreasuryTransaction.TransactionStatus.DRAFT),
        ),
        posted_transactions=Count(
            "id",
            filter=Q(status=TreasuryTransaction.TransactionStatus.POSTED),
        ),
        cancelled_transactions=Count(
            "id",
            filter=Q(status=TreasuryTransaction.TransactionStatus.CANCELLED),
        ),
    )

    return TreasurySummary(
        total_accounts=account_stats["total_accounts"] or 0,
        active_accounts=account_stats["active_accounts"] or 0,
        inactive_accounts=account_stats["inactive_accounts"] or 0,
        total_balance=account_stats["total_balance"] or ZERO,
        cash_balance=account_stats["cash_balance"] or ZERO,
        bank_balance=account_stats["bank_balance"] or ZERO,
        wallet_balance=account_stats["wallet_balance"] or ZERO,
        posted_inflows=transaction_stats["posted_inflows"] or ZERO,
        posted_outflows=transaction_stats["posted_outflows"] or ZERO,
        draft_transactions=transaction_stats["draft_transactions"] or 0,
        posted_transactions=transaction_stats["posted_transactions"] or 0,
        cancelled_transactions=transaction_stats["cancelled_transactions"] or 0,
    )


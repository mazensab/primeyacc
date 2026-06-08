# ============================================================
# 📂 treasury/services.py
# 🧠 PrimeyAcc | Treasury & Payments Services V1.0
# ------------------------------------------------------------
# ✅ Phase 11.1 Treasury Accounts Foundation services
# ✅ Phase 11.2 Treasury Transactions Foundation services
# ✅ Company-scoped treasury account creation/update
# ✅ Company-scoped treasury transaction creation/post/cancel
# ✅ Safe balance updates only on posting
# ✅ Negative balance prevention for outflows/transfers
# ✅ Duplicate posting prevention
# ✅ Summary helpers for /company treasury dashboard
# ------------------------------------------------------------
# القاعدة المعمارية المعتمدة:
# - لا يتم الاعتماد على company_id القادم من الفرونت
# - الشركة يجب أن تصل للخدمة من عضوية المستخدم الحالية داخل /company
# - كل حساب خزينة وحركة خزينة يجب أن تكون داخل نفس الشركة
# - الرصيد لا يتغير عند إنشاء Draft، يتغير فقط عند POSTED
# - لا نسمح بتكرار الترحيل أو خلط الشركات
# - الترحيل المحاسبي التفصيلي سيتم ربطه لاحقًا مع Phase 11 accounting integration
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, QuerySet, Sum
from django.utils import timezone

from .models import TreasuryAccount, TreasuryTransaction


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


def ensure_same_company(company, obj: Any, *, field_name: str) -> None:
    if obj is None:
        return

    if not hasattr(obj, "company_id"):
        raise ValidationError({field_name: "Object does not support company isolation."})

    if obj.company_id != company.id:
        raise ValidationError({field_name: "Object must belong to the same company."})


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
) -> TreasuryAccount:
    opening_balance_decimal = normalize_decimal(
        opening_balance,
        field_name="opening_balance",
    )

    if not normalize_text(name):
        raise ValidationError({"name": "Treasury account name is required."})

    with transaction.atomic():
        account = TreasuryAccount(
            company=company,
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
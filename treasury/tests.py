# ============================================================
# ًں“‚ treasury/tests.py
# ًں§  PrimeyAcc | Treasury & Payments Tests V1.1
# ------------------------------------------------------------
# âœ… Phase 11.1 Treasury Accounts Foundation tests
# âœ… Phase 11.2 Treasury Transactions Foundation tests
# âœ… Phase 11.3 Treasury APIs Foundation tests
# âœ… Company isolation validation
# âœ… Safe posting and balance updates
# âœ… Negative balance prevention
# âœ… Duplicate posting prevention
# âœ… Transfer and cancellation behavior
# âœ… Treasury summary validation
# âœ… Treasury accounts API validation
# âœ… Treasury transactions API validation
# âœ… Treasury summary API validation
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹ظ…ط§ط±ظٹط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ„ط§ ظٹطھظ… ط§ظ„ط§ط¹طھظ…ط§ط¯ ط¹ظ„ظ‰ company_id ط§ظ„ظ‚ط§ط¯ظ… ظ…ظ† ط§ظ„ظپط±ظˆظ†طھ
# - ظƒظ„ ط§ط®طھط¨ط§ط± ظٹط«ط¨طھ ط£ظ† ط§ظ„ط´ط±ظƒط© ظ‡ظٹ ظ†ط·ط§ظ‚ ط§ظ„ط¹ط²ظ„ ط§ظ„ط£ط³ط§ط³ظٹ
# - ط§ظ„ط±طµظٹط¯ ظ„ط§ ظٹطھط؛ظٹط± ط¹ظ†ط¯ ط¥ظ†ط´ط§ط، Draft
# - ط§ظ„ط±طµظٹط¯ ظٹطھط؛ظٹط± ظپظ‚ط· ط¹ظ†ط¯ طھط±ط­ظٹظ„ ط§ظ„ط­ط±ظƒط© POSTED
# - ظ„ط§ ظٹط³ظ…ط­ ط¨ط®ظ„ط· ط­ط³ط§ط¨ط§طھ ط£ظˆ ط­ط±ظƒط§طھ ط¨ظٹظ† ط´ط±ظƒط§طھ ظ…ط®طھظ„ظپط©
# - APIs طھط¹طھظ…ط¯ ط¹ظ„ظ‰ request.company ظ…ظ† ط¹ط¶ظˆظٹط© ط§ظ„ط´ط±ظƒط© ط§ظ„ط­ط§ظ„ظٹط©
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, UserProfile
from .models import (
    CustomerPayment,
    PaymentMethod,
    PaymentStatus,
    SupplierPayment,
    TreasuryAccount,
    TreasuryTransaction,
)
from .services import (
    cancel_customer_payment,
    cancel_supplier_payment,
    cancel_treasury_transaction,
    confirm_customer_payment,
    confirm_supplier_payment,
    create_customer_payment,
    create_supplier_payment,
    create_treasury_account,
    create_treasury_transaction,
    get_treasury_summary,
    post_treasury_transaction,
)


# ============================================================
# Shared test factory
# ============================================================


class PrimeyAccTestFactoryMixin:
    """
    Shared lightweight factory helpers for PrimeyAcc tests.

    ط§ظ„ظ‡ط¯ظپ:
    ط¨ظ†ط§ط، ط´ط±ظƒط§طھ ظˆظ…ط³طھط®ط¯ظ…ظٹظ† ظˆط¹ط¶ظˆظٹط§طھ ط¨ط·ط±ظٹظ‚ط© ظ…ط±ظ†ط© ظ„ط§ طھظƒط³ط± ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ
    ط¹ظ†ط¯ ط¥ط¶ط§ظپط© ط­ظ‚ظˆظ„ ط§ط®طھظٹط§ط±ظٹط© ظ…ط³طھظ‚ط¨ظ„ظ‹ط§ ط¹ظ„ظ‰ Company.
    """

    @classmethod
    def create_company(
        cls,
        *,
        name: str,
        code: str,
        email: str,
    ):
        """
        Create a Company record while staying tolerant to future Company model fields.
        """
        Company = apps.get_model("companies", "Company")

        explicit_values: dict[str, Any] = {
            "name": name,
            "company_name": name,
            "legal_name": name,
            "display_name": name,
            "code": code,
            "company_code": code,
            "slug": code.lower(),
            "email": email,
            "contact_email": email,
            "phone": "0500000000",
            "contact_phone": "0500000000",
            "city": "Riyadh",
            "country": "SA",
            "currency": "SAR",
            "is_active": True,
            "can_access_company": True,
            "can_access_system": False,
        }

        payload: dict[str, Any] = {}

        for field in Company._meta.fields:
            if field.primary_key or field.auto_created:
                continue

            if field.name in explicit_values:
                payload[field.name] = explicit_values[field.name]
                continue

            if field.has_default() or field.null or field.blank:
                continue

            if isinstance(field, models.CharField):
                payload[field.name] = f"{field.name}-{code}"
            elif isinstance(field, models.TextField):
                payload[field.name] = f"{field.name} for {name}"
            elif isinstance(field, models.EmailField):
                payload[field.name] = email
            elif isinstance(field, models.BooleanField):
                payload[field.name] = True
            elif isinstance(field, models.IntegerField):
                payload[field.name] = 1
            elif isinstance(field, models.DecimalField):
                payload[field.name] = Decimal("0.00")
            elif isinstance(field, models.DateField):
                from django.utils import timezone

                payload[field.name] = timezone.localdate()
            elif isinstance(field, models.DateTimeField):
                from django.utils import timezone

                payload[field.name] = timezone.now()

        return Company.objects.create(**payload)

    @classmethod
    def create_user_with_company_membership(
        cls,
        *,
        username: str,
        email: str,
        company,
        role: str = CompanyRole.ACCOUNTANT,
    ):
        """
        Create user + UserProfile + active CompanyMembership.
        """
        User = get_user_model()

        user = User.objects.create_user(
            username=username,
            email=email,
            password="StrongPass12345",
        )

        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "display_name": username,
                "default_company": company,
                "is_system_user": False,
            },
        )
        profile.default_company = company
        profile.save(update_fields=["default_company", "updated_at"])

        CompanyMembership.objects.create(
            user=user,
            company=company,
            role=role,
            status="ACTIVE",
            is_primary=True,
        )

        return user


# ============================================================
# Service tests
# ============================================================


class TreasuryServiceTests(PrimeyAccTestFactoryMixin, TestCase):
    """
    Tests for the Phase 11 treasury foundation.

    ظ‡ط°ظ‡ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ طھط¨ظ†ظٹ ط´ط±ظƒط§طھ ظˆط­ط³ط§ط¨ط§طھ ط®ط²ظٹظ†ط© ظˆط­ط±ظƒط§طھ ظ…ط§ظ„ظٹط©
    ظˆطھطھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط¹ط²ظ„ ظˆط§ظ„ط±طµظٹط¯ ظˆط§ظ„طھط±ط­ظٹظ„.
    """

    @classmethod
    def setUpTestData(cls) -> None:
        User = get_user_model()

        cls.user = User.objects.create_user(
            username="treasury_user",
            email="treasury@example.com",
            password="StrongPass12345",
        )

        cls.company_a = cls.create_company(
            name="PrimeyAcc Company A",
            code="TST-A",
            email="company-a@example.com",
        )
        cls.company_b = cls.create_company(
            name="PrimeyAcc Company B",
            code="TST-B",
            email="company-b@example.com",
        )

    def test_create_treasury_account_sets_opening_and_current_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Main Cash",
            code="cash-main",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="1000.00",
            is_default=True,
        )

        self.assertEqual(account.company_id, self.company_a.id)
        self.assertEqual(account.code, "CASH-MAIN")
        self.assertEqual(account.currency, "SAR")
        self.assertEqual(account.opening_balance, Decimal("1000.00"))
        self.assertEqual(account.current_balance, Decimal("1000.00"))
        self.assertTrue(account.is_default)
        self.assertEqual(account.created_by_id, self.user.id)

    def test_duplicate_account_name_is_blocked_inside_same_company(self) -> None:
        create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Main Bank",
            code="bank-1",
            account_type=TreasuryAccount.AccountType.BANK,
            opening_balance="0",
            bank_name="Al Rajhi",
        )

        with self.assertRaises(ValidationError):
            create_treasury_account(
                company=self.company_a,
                user=self.user,
                name="Main Bank",
                code="bank-2",
                account_type=TreasuryAccount.AccountType.BANK,
                opening_balance="0",
                bank_name="SNB",
            )

    def test_same_account_name_is_allowed_in_different_companies(self) -> None:
        account_a = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Branch Cash",
            code="branch-cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100",
        )

        account_b = create_treasury_account(
            company=self.company_b,
            user=self.user,
            name="Branch Cash",
            code="branch-cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="200",
        )

        self.assertNotEqual(account_a.company_id, account_b.company_id)
        self.assertEqual(account_a.name, account_b.name)

    def test_bank_account_requires_bank_name(self) -> None:
        with self.assertRaises(ValidationError):
            create_treasury_account(
                company=self.company_a,
                user=self.user,
                name="Bank Without Name",
                account_type=TreasuryAccount.AccountType.BANK,
                opening_balance="0",
            )

    def test_draft_transaction_does_not_change_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Draft Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="500.00",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="250.00",
            description="Draft receipt",
        )

        account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(treasury_transaction.status, TreasuryTransaction.TransactionStatus.DRAFT)
        self.assertEqual(account.current_balance, Decimal("500.00"))
        self.assertIsNone(treasury_transaction.balance_before)
        self.assertIsNone(treasury_transaction.balance_after)

    def test_post_inflow_increases_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Receipt Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="75.50",
            description="Customer receipt",
        )

        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )

        account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("175.50"))
        self.assertEqual(treasury_transaction.status, TreasuryTransaction.TransactionStatus.POSTED)
        self.assertEqual(treasury_transaction.balance_before, Decimal("100.00"))
        self.assertEqual(treasury_transaction.balance_after, Decimal("175.50"))
        self.assertEqual(treasury_transaction.posted_by_id, self.user.id)

    def test_post_outflow_decreases_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Payment Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.OUTFLOW,
            amount="125.00",
            description="Supplier payment",
        )

        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )

        account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("175.00"))
        self.assertEqual(treasury_transaction.balance_before, Decimal("300.00"))
        self.assertEqual(treasury_transaction.balance_after, Decimal("175.00"))

    def test_outflow_is_blocked_when_balance_is_insufficient(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Small Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="50.00",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.OUTFLOW,
            amount="100.00",
            description="Too large payment",
        )

        with self.assertRaises(ValidationError):
            post_treasury_transaction(
                company=self.company_a,
                treasury_transaction=treasury_transaction,
                user=self.user,
            )

        account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("50.00"))
        self.assertEqual(treasury_transaction.status, TreasuryTransaction.TransactionStatus.DRAFT)

    def test_posting_same_transaction_twice_does_not_duplicate_balance_effect(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="No Duplicate Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="40.00",
        )

        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )
        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )

        account.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("140.00"))

    def test_transfer_between_accounts_inside_same_company(self) -> None:
        source_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Transfer Source",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="1000.00",
        )

        target_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Transfer Target",
            account_type=TreasuryAccount.AccountType.BANK,
            opening_balance="50.00",
            bank_name="SNB",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=source_account,
            counterparty_account=target_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.TRANSFER,
            amount="300.00",
            source_type=TreasuryTransaction.SourceType.TRANSFER,
            description="Cash to bank transfer",
        )

        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )

        source_account.refresh_from_db()
        target_account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(source_account.current_balance, Decimal("700.00"))
        self.assertEqual(target_account.current_balance, Decimal("350.00"))
        self.assertEqual(treasury_transaction.status, TreasuryTransaction.TransactionStatus.POSTED)

    def test_cross_company_account_is_blocked_when_creating_transaction(self) -> None:
        account_b = create_treasury_account(
            company=self.company_b,
            user=self.user,
            name="Other Company Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="500.00",
        )

        with self.assertRaises(ValidationError):
            create_treasury_transaction(
                company=self.company_a,
                account=account_b,
                user=self.user,
                transaction_type=TreasuryTransaction.TransactionType.INFLOW,
                amount="10.00",
            )

    def test_cross_company_counterparty_account_is_blocked_for_transfer(self) -> None:
        source_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Company A Transfer Source",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="500.00",
        )

        foreign_target_account = create_treasury_account(
            company=self.company_b,
            user=self.user,
            name="Company B Transfer Target",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="0.00",
        )

        with self.assertRaises(ValidationError):
            create_treasury_transaction(
                company=self.company_a,
                account=source_account,
                counterparty_account=foreign_target_account,
                user=self.user,
                transaction_type=TreasuryTransaction.TransactionType.TRANSFER,
                amount="50.00",
                source_type=TreasuryTransaction.SourceType.TRANSFER,
            )

    def test_cancel_posted_inflow_reverses_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Cancellation Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="200.00",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="80.00",
        )

        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )

        cancel_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
            reason="Wrong receipt",
        )

        account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("200.00"))
        self.assertEqual(treasury_transaction.status, TreasuryTransaction.TransactionStatus.CANCELLED)
        self.assertEqual(treasury_transaction.cancelled_by_id, self.user.id)
        self.assertEqual(treasury_transaction.cancellation_reason, "Wrong receipt")

    def test_cancel_posted_transfer_reverses_both_accounts(self) -> None:
        source_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Cancel Transfer Source",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="600.00",
        )

        target_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Cancel Transfer Target",
            account_type=TreasuryAccount.AccountType.BANK,
            opening_balance="100.00",
            bank_name="Alinma",
        )

        treasury_transaction = create_treasury_transaction(
            company=self.company_a,
            account=source_account,
            counterparty_account=target_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.TRANSFER,
            amount="250.00",
            source_type=TreasuryTransaction.SourceType.TRANSFER,
        )

        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
        )

        cancel_treasury_transaction(
            company=self.company_a,
            treasury_transaction=treasury_transaction,
            user=self.user,
            reason="Transfer cancelled",
        )

        source_account.refresh_from_db()
        target_account.refresh_from_db()
        treasury_transaction.refresh_from_db()

        self.assertEqual(source_account.current_balance, Decimal("600.00"))
        self.assertEqual(target_account.current_balance, Decimal("100.00"))
        self.assertEqual(treasury_transaction.status, TreasuryTransaction.TransactionStatus.CANCELLED)

    def test_treasury_summary_returns_company_scoped_metrics(self) -> None:
        cash_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Summary Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        bank_account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Summary Bank",
            account_type=TreasuryAccount.AccountType.BANK,
            opening_balance="300.00",
            bank_name="Al Rajhi",
        )

        other_company_account = create_treasury_account(
            company=self.company_b,
            user=self.user,
            name="Other Summary Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="999.00",
        )

        inflow = create_treasury_transaction(
            company=self.company_a,
            account=cash_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="50.00",
        )
        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=inflow,
            user=self.user,
        )

        outflow = create_treasury_transaction(
            company=self.company_a,
            account=bank_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.OUTFLOW,
            amount="25.00",
        )
        post_treasury_transaction(
            company=self.company_a,
            treasury_transaction=outflow,
            user=self.user,
        )

        create_treasury_transaction(
            company=self.company_b,
            account=other_company_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="500.00",
        )

        summary = get_treasury_summary(self.company_a)

        self.assertEqual(summary.total_accounts, 2)
        self.assertEqual(summary.active_accounts, 2)
        self.assertEqual(summary.inactive_accounts, 0)
        self.assertEqual(summary.cash_balance, Decimal("150.00"))
        self.assertEqual(summary.bank_balance, Decimal("275.00"))
        self.assertEqual(summary.wallet_balance, Decimal("0.00"))
        self.assertEqual(summary.total_balance, Decimal("425.00"))
        self.assertEqual(summary.posted_inflows, Decimal("50.00"))
        self.assertEqual(summary.posted_outflows, Decimal("25.00"))
        self.assertEqual(summary.posted_transactions, 2)
        self.assertEqual(summary.draft_transactions, 0)
        self.assertEqual(summary.cancelled_transactions, 0)

        summary_dict = summary.as_dict()
        self.assertEqual(summary_dict["total_accounts"], 2)
        self.assertEqual(summary_dict["total_balance"], Decimal("425.00"))



# ============================================================
# Payment service tests
# ============================================================


class TreasuryPaymentServiceTests(PrimeyAccTestFactoryMixin, TestCase):
    """
    Tests for CustomerPayment and SupplierPayment services.

    ??? ?????????? ???? ?? ????????? ?? ???? ?????? ??? Draft
    ??? ??????? ???? ???? ????? ??????? ??? ??????? ???? ??????.
    """

    @classmethod
    def setUpTestData(cls) -> None:
        User = get_user_model()

        cls.user = User.objects.create_user(
            username="treasury_payment_user",
            email="treasury-payment@example.com",
            password="StrongPass12345",
        )

        cls.company_a = cls.create_company(
            name="PrimeyAcc Payment Company A",
            code="PAY-A",
            email="payment-a@example.com",
        )
        cls.company_b = cls.create_company(
            name="PrimeyAcc Payment Company B",
            code="PAY-B",
            email="payment-b@example.com",
        )

    def test_create_customer_payment_draft_does_not_change_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer Draft Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="75.00",
            payment_method=PaymentMethod.CASH,
            customer_id=1,
            customer_name="Test Customer",
            reference="CP-DRAFT",
        )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.DRAFT)
        self.assertIsNone(payment.treasury_transaction_id)
        self.assertEqual(account.current_balance, Decimal("100.00"))
        self.assertEqual(payment.amount, Decimal("75.00"))
        self.assertEqual(payment.customer_id, 1)
        self.assertEqual(payment.created_by_id, self.user.id)

    def test_confirm_customer_payment_creates_inflow_and_increases_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer Confirm Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="150.00",
            payment_method=PaymentMethod.CASH,
            customer_name="Confirmed Customer",
            reference="CP-CONFIRM",
        )

        payment = confirm_customer_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(payment.treasury_transaction_id)
        self.assertEqual(account.current_balance, Decimal("250.00"))
        self.assertEqual(payment.confirmed_by_id, self.user.id)

        treasury_transaction = payment.treasury_transaction
        self.assertEqual(
            treasury_transaction.transaction_type,
            TreasuryTransaction.TransactionType.INFLOW,
        )
        self.assertEqual(
            treasury_transaction.source_type,
            TreasuryTransaction.SourceType.CUSTOMER_PAYMENT,
        )
        self.assertEqual(treasury_transaction.source_model, "CustomerPayment")
        self.assertEqual(treasury_transaction.source_object_id, payment.id)
        self.assertEqual(
            treasury_transaction.status,
            TreasuryTransaction.TransactionStatus.POSTED,
        )
        self.assertEqual(treasury_transaction.amount, Decimal("150.00"))

    def test_confirm_customer_payment_twice_does_not_duplicate_balance_effect(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer No Duplicate Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="40.00",
            payment_method=PaymentMethod.CASH,
            customer_name="No Duplicate Customer",
        )

        confirm_customer_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )
        confirm_customer_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("140.00"))
        self.assertEqual(payment.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(payment.treasury_transaction_id)
        self.assertEqual(
            TreasuryTransaction.objects.filter(
                company=self.company_a,
                source_type=TreasuryTransaction.SourceType.CUSTOMER_PAYMENT,
                source_object_id=payment.id,
            ).count(),
            1,
        )

    def test_cancel_confirmed_customer_payment_reverses_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer Cancel Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="60.00",
            payment_method=PaymentMethod.CASH,
            customer_name="Cancelled Customer",
            status=PaymentStatus.CONFIRMED,
        )

        account.refresh_from_db()
        self.assertEqual(account.current_balance, Decimal("160.00"))

        cancel_customer_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
            reason="Customer refund",
        )

        account.refresh_from_db()
        payment.refresh_from_db()
        payment.treasury_transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("100.00"))
        self.assertEqual(payment.status, PaymentStatus.CANCELLED)
        self.assertEqual(payment.cancelled_by_id, self.user.id)
        self.assertEqual(payment.cancellation_reason, "Customer refund")
        self.assertEqual(
            payment.treasury_transaction.status,
            TreasuryTransaction.TransactionStatus.CANCELLED,
        )

    def test_customer_payment_rejects_cross_company_treasury_account(self) -> None:
        foreign_account = create_treasury_account(
            company=self.company_b,
            user=self.user,
            name="Foreign Customer Payment Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        with self.assertRaises(ValidationError):
            create_customer_payment(
                company=self.company_a,
                treasury_account=foreign_account,
                user=self.user,
                amount="10.00",
                payment_method=PaymentMethod.CASH,
                customer_name="Cross Company Customer",
            )

    def test_create_supplier_payment_draft_does_not_change_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Draft Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="75.00",
            payment_method=PaymentMethod.CASH,
            supplier_id=1,
            supplier_name="Test Supplier",
            reference="SP-DRAFT",
        )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.DRAFT)
        self.assertIsNone(payment.treasury_transaction_id)
        self.assertEqual(account.current_balance, Decimal("300.00"))
        self.assertEqual(payment.amount, Decimal("75.00"))
        self.assertEqual(payment.supplier_id, 1)
        self.assertEqual(payment.created_by_id, self.user.id)

    def test_confirm_supplier_payment_creates_outflow_and_decreases_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Confirm Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="500.00",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="125.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="Confirmed Supplier",
            reference="SP-CONFIRM",
        )

        payment = confirm_supplier_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(payment.treasury_transaction_id)
        self.assertEqual(account.current_balance, Decimal("375.00"))
        self.assertEqual(payment.confirmed_by_id, self.user.id)

        treasury_transaction = payment.treasury_transaction
        self.assertEqual(
            treasury_transaction.transaction_type,
            TreasuryTransaction.TransactionType.OUTFLOW,
        )
        self.assertEqual(
            treasury_transaction.source_type,
            TreasuryTransaction.SourceType.SUPPLIER_PAYMENT,
        )
        self.assertEqual(treasury_transaction.source_model, "SupplierPayment")
        self.assertEqual(treasury_transaction.source_object_id, payment.id)
        self.assertEqual(
            treasury_transaction.status,
            TreasuryTransaction.TransactionStatus.POSTED,
        )
        self.assertEqual(treasury_transaction.amount, Decimal("125.00"))

    def test_confirm_supplier_payment_twice_does_not_duplicate_balance_effect(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier No Duplicate Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="40.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="No Duplicate Supplier",
        )

        confirm_supplier_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )
        confirm_supplier_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("260.00"))
        self.assertEqual(payment.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(payment.treasury_transaction_id)
        self.assertEqual(
            TreasuryTransaction.objects.filter(
                company=self.company_a,
                source_type=TreasuryTransaction.SourceType.SUPPLIER_PAYMENT,
                source_object_id=payment.id,
            ).count(),
            1,
        )

    def test_cancel_confirmed_supplier_payment_reverses_balance(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Cancel Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="80.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="Cancelled Supplier",
            status=PaymentStatus.CONFIRMED,
        )

        account.refresh_from_db()
        self.assertEqual(account.current_balance, Decimal("220.00"))

        cancel_supplier_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
            reason="Supplier payment cancelled",
        )

        account.refresh_from_db()
        payment.refresh_from_db()
        payment.treasury_transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("300.00"))
        self.assertEqual(payment.status, PaymentStatus.CANCELLED)
        self.assertEqual(payment.cancelled_by_id, self.user.id)
        self.assertEqual(payment.cancellation_reason, "Supplier payment cancelled")
        self.assertEqual(
            payment.treasury_transaction.status,
            TreasuryTransaction.TransactionStatus.CANCELLED,
        )

    def test_supplier_payment_is_blocked_when_balance_is_insufficient(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Insufficient Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="50.00",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="100.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="Insufficient Supplier",
        )

        with self.assertRaises(ValidationError):
            confirm_supplier_payment(
                company=self.company_a,
                payment=payment,
                user=self.user,
            )

        account.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("50.00"))
        self.assertEqual(payment.status, PaymentStatus.DRAFT)
        self.assertIsNone(payment.treasury_transaction_id)

    def test_supplier_payment_rejects_cross_company_treasury_account(self) -> None:
        foreign_account = create_treasury_account(
            company=self.company_b,
            user=self.user,
            name="Foreign Supplier Payment Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        with self.assertRaises(ValidationError):
            create_supplier_payment(
                company=self.company_a,
                treasury_account=foreign_account,
                user=self.user,
                amount="10.00",
                payment_method=PaymentMethod.CASH,
                supplier_name="Cross Company Supplier",
            )



# ============================================================
# Payment allocation service tests
# ============================================================


class TreasuryPaymentAllocationServiceTests(PrimeyAccTestFactoryMixin, TestCase):
    """
    Tests for linking confirmed payments to sales invoices and purchase bills.

    الهدف:
    - تأكيد دفعة العميل يحدث فاتورة المبيعات
    - إلغاء دفعة العميل يعكس فاتورة المبيعات
    - تأكيد دفعة المورد يحدث فاتورة المشتريات
    - إلغاء دفعة المورد يعكس فاتورة المشتريات
    - منع الدفع الزائد عن المتبقي
    """

    @classmethod
    def setUpTestData(cls) -> None:
        User = get_user_model()

        cls.user = User.objects.create_user(
            username="treasury_allocation_user",
            email="treasury-allocation@example.com",
            password="StrongPass12345",
        )

        cls.company_a = cls.create_company(
            name="PrimeyAcc Allocation Company A",
            code="ALLOC-A",
            email="allocation-a@example.com",
        )
        cls.company_b = cls.create_company(
            name="PrimeyAcc Allocation Company B",
            code="ALLOC-B",
            email="allocation-b@example.com",
        )

    @classmethod
    def create_business_party(
        cls,
        *,
        company,
        name: str,
        code: str,
        party_type: str,
    ):
        """
        Create BusinessParty while staying tolerant to future optional fields.
        """
        BusinessParty = apps.get_model("parties", "BusinessParty")

        explicit_values: dict[str, Any] = {
            "company": company,
            "company_id": company.id,
            "code": code,
            "name": name,
            "display_name": name,
            "legal_name": name,
            "party_type": party_type,
            "status": "ACTIVE",
            "email": f"{code.lower()}@example.com",
            "phone": "0500000000",
            "mobile": "0500000000",
            "country": "SA",
            "city": "Riyadh",
            "currency_code": "SAR",
            "currency": "SAR",
            "is_active": True,
        }

        payload: dict[str, Any] = {}

        for field in BusinessParty._meta.fields:
            if field.primary_key or field.auto_created:
                continue

            if field.name in explicit_values:
                payload[field.name] = explicit_values[field.name]
                continue

            if field.has_default() or field.null or field.blank:
                continue

            if isinstance(field, models.ForeignKey):
                if field.remote_field and field.remote_field.model._meta.model_name == "company":
                    payload[field.name] = company
                continue
            elif isinstance(field, models.CharField):
                payload[field.name] = f"{field.name}-{code}"
            elif isinstance(field, models.TextField):
                payload[field.name] = ""
            elif isinstance(field, models.EmailField):
                payload[field.name] = f"{code.lower()}@example.com"
            elif isinstance(field, models.BooleanField):
                payload[field.name] = True
            elif isinstance(field, models.IntegerField):
                payload[field.name] = 1
            elif isinstance(field, models.DecimalField):
                payload[field.name] = Decimal("0.00")
            elif isinstance(field, models.DateField):
                from django.utils import timezone

                payload[field.name] = timezone.localdate()
            elif isinstance(field, models.DateTimeField):
                from django.utils import timezone

                payload[field.name] = timezone.now()

        return BusinessParty.objects.create(**payload)

    @classmethod
    def create_sales_invoice(
        cls,
        *,
        company,
        total: str = "100.00",
        paid: str = "0.00",
        invoice_number: str = "ALLOC-SI-001",
    ):
        """
        Create issued SalesInvoice directly for allocation tests.
        """
        SalesInvoice = apps.get_model("sales", "SalesInvoice")

        total_amount = Decimal(total)
        paid_amount = Decimal(paid)
        balance_due = total_amount - paid_amount

        invoice = SalesInvoice.objects.create(
            company=company,
            invoice_number=invoice_number,
            status="ISSUED",
            payment_status="UNPAID" if paid_amount == Decimal("0.00") else "PARTIAL",
            subtotal=total_amount,
            discount_amount=Decimal("0.00"),
            taxable_amount=total_amount,
            tax_amount=Decimal("0.00"),
            total_amount=total_amount,
            paid_amount=paid_amount,
            balance_due=balance_due,
            currency_code="SAR",
        )
        invoice.full_clean()
        invoice.save()

        return invoice

    @classmethod
    def create_purchase_bill(
        cls,
        *,
        company,
        supplier,
        total: str = "100.00",
        paid: str = "0.00",
        bill_number: str = "ALLOC-PB-001",
    ):
        """
        Create posted PurchaseBill directly for allocation tests.
        """
        PurchaseBill = apps.get_model("purchases", "PurchaseBill")

        total_amount = Decimal(total)
        paid_amount = Decimal(paid)
        balance_due = total_amount - paid_amount

        bill = PurchaseBill.objects.create(
            company=company,
            supplier=supplier,
            bill_number=bill_number,
            status="POSTED",
            payment_status="UNPAID" if paid_amount == Decimal("0.00") else "PARTIAL",
            subtotal_amount=total_amount,
            discount_amount=Decimal("0.00"),
            taxable_amount=total_amount,
            tax_amount=Decimal("0.00"),
            total_amount=total_amount,
            paid_amount=paid_amount,
            balance_due=balance_due,
            currency_code="SAR",
        )
        bill.full_clean()
        bill.save()

        return bill

    def test_confirm_customer_payment_allocates_sales_invoice(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer Allocation Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        invoice = self.create_sales_invoice(
            company=self.company_a,
            total="100.00",
            invoice_number="ALLOC-SI-CONFIRM",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="40.00",
            payment_method=PaymentMethod.CASH,
            customer_name="Allocation Customer",
            sales_invoice=invoice,
        )

        confirm_customer_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )

        account.refresh_from_db()
        invoice.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("140.00"))
        self.assertEqual(payment.status, PaymentStatus.CONFIRMED)
        self.assertEqual(invoice.paid_amount, Decimal("40.00"))
        self.assertEqual(invoice.balance_due, Decimal("60.00"))
        self.assertEqual(invoice.payment_status, "PARTIAL")

    def test_cancel_customer_payment_reverses_sales_invoice_allocation(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer Allocation Cancel Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        invoice = self.create_sales_invoice(
            company=self.company_a,
            total="100.00",
            invoice_number="ALLOC-SI-CANCEL",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="40.00",
            payment_method=PaymentMethod.CASH,
            customer_name="Allocation Customer",
            sales_invoice=invoice,
            status=PaymentStatus.CONFIRMED,
        )

        invoice.refresh_from_db()
        self.assertEqual(invoice.paid_amount, Decimal("40.00"))
        self.assertEqual(invoice.balance_due, Decimal("60.00"))

        cancel_customer_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
            reason="Reverse allocation",
        )

        account.refresh_from_db()
        invoice.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("100.00"))
        self.assertEqual(payment.status, PaymentStatus.CANCELLED)
        self.assertEqual(invoice.paid_amount, Decimal("0.00"))
        self.assertEqual(invoice.balance_due, Decimal("100.00"))
        self.assertEqual(invoice.payment_status, "UNPAID")

    def test_customer_payment_over_invoice_balance_is_blocked(self) -> None:
        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Customer Overpayment Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        invoice = self.create_sales_invoice(
            company=self.company_a,
            total="100.00",
            invoice_number="ALLOC-SI-OVER",
        )

        payment = create_customer_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="150.00",
            payment_method=PaymentMethod.CASH,
            customer_name="Overpayment Customer",
            sales_invoice=invoice,
        )

        with self.assertRaises(ValidationError):
            confirm_customer_payment(
                company=self.company_a,
                payment=payment,
                user=self.user,
            )

        account.refresh_from_db()
        invoice.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("100.00"))
        self.assertEqual(payment.status, PaymentStatus.DRAFT)
        self.assertIsNone(payment.treasury_transaction_id)
        self.assertEqual(invoice.paid_amount, Decimal("0.00"))
        self.assertEqual(invoice.balance_due, Decimal("100.00"))
        self.assertEqual(invoice.payment_status, "UNPAID")

    def test_confirm_supplier_payment_allocates_purchase_bill(self) -> None:
        supplier = self.create_business_party(
            company=self.company_a,
            name="Allocation Supplier",
            code="ALLOC-SUP-1",
            party_type="SUPPLIER",
        )

        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Allocation Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        bill = self.create_purchase_bill(
            company=self.company_a,
            supplier=supplier,
            total="100.00",
            bill_number="ALLOC-PB-CONFIRM",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="40.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="Allocation Supplier",
            purchase_bill=bill,
        )

        confirm_supplier_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
        )

        account.refresh_from_db()
        bill.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("260.00"))
        self.assertEqual(payment.status, PaymentStatus.CONFIRMED)
        self.assertEqual(bill.paid_amount, Decimal("40.00"))
        self.assertEqual(bill.balance_due, Decimal("60.00"))
        self.assertEqual(bill.payment_status, "PARTIAL")

    def test_cancel_supplier_payment_reverses_purchase_bill_allocation(self) -> None:
        supplier = self.create_business_party(
            company=self.company_a,
            name="Cancel Allocation Supplier",
            code="ALLOC-SUP-2",
            party_type="SUPPLIER",
        )

        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Allocation Cancel Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        bill = self.create_purchase_bill(
            company=self.company_a,
            supplier=supplier,
            total="100.00",
            bill_number="ALLOC-PB-CANCEL",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="40.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="Allocation Supplier",
            purchase_bill=bill,
            status=PaymentStatus.CONFIRMED,
        )

        bill.refresh_from_db()
        self.assertEqual(bill.paid_amount, Decimal("40.00"))
        self.assertEqual(bill.balance_due, Decimal("60.00"))

        cancel_supplier_payment(
            company=self.company_a,
            payment=payment,
            user=self.user,
            reason="Reverse supplier allocation",
        )

        account.refresh_from_db()
        bill.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("300.00"))
        self.assertEqual(payment.status, PaymentStatus.CANCELLED)
        self.assertEqual(bill.paid_amount, Decimal("0.00"))
        self.assertEqual(bill.balance_due, Decimal("100.00"))
        self.assertEqual(bill.payment_status, "UNPAID")

    def test_supplier_payment_over_bill_balance_is_blocked(self) -> None:
        supplier = self.create_business_party(
            company=self.company_a,
            name="Over Allocation Supplier",
            code="ALLOC-SUP-3",
            party_type="SUPPLIER",
        )

        account = create_treasury_account(
            company=self.company_a,
            user=self.user,
            name="Supplier Overpayment Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="300.00",
        )

        bill = self.create_purchase_bill(
            company=self.company_a,
            supplier=supplier,
            total="100.00",
            bill_number="ALLOC-PB-OVER",
        )

        payment = create_supplier_payment(
            company=self.company_a,
            treasury_account=account,
            user=self.user,
            amount="150.00",
            payment_method=PaymentMethod.CASH,
            supplier_name="Overpayment Supplier",
            purchase_bill=bill,
        )

        with self.assertRaises(ValidationError):
            confirm_supplier_payment(
                company=self.company_a,
                payment=payment,
                user=self.user,
            )

        account.refresh_from_db()
        bill.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("300.00"))
        self.assertEqual(payment.status, PaymentStatus.DRAFT)
        self.assertIsNone(payment.treasury_transaction_id)
        self.assertEqual(bill.paid_amount, Decimal("0.00"))
        self.assertEqual(bill.balance_due, Decimal("100.00"))
        self.assertEqual(bill.payment_status, "UNPAID")

# ============================================================
# API tests
# ============================================================


class TreasuryAPITests(PrimeyAccTestFactoryMixin, TestCase):
    """
    API tests for Phase 11 treasury endpoints.

    ظ‡ط°ظ‡ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ طھطھط­ظ‚ظ‚ ظ…ظ† ط£ظ† endpoints طھط¹ظ…ظ„ ط¹ط¨ط± ط¹ط¶ظˆظٹط© ط§ظ„ط´ط±ظƒط© ط§ظ„ط­ط§ظ„ظٹط©
    ظˆظ„ط§ طھط¹طھظ…ط¯ ط¹ظ„ظ‰ company_id ظ…ظ† ط§ظ„ظپط±ظˆظ†طھ.
    """

    @classmethod
    def setUpTestData(cls) -> None:
        cls.company = cls.create_company(
            name="PrimeyAcc API Company",
            code="API-A",
            email="api-company@example.com",
        )
        cls.other_company = cls.create_company(
            name="PrimeyAcc Other API Company",
            code="API-B",
            email="api-company-b@example.com",
        )

        cls.user = cls.create_user_with_company_membership(
            username="treasury_api_user",
            email="treasury-api@example.com",
            company=cls.company,
            role=CompanyRole.ACCOUNTANT,
        )

        cls.viewer_user = cls.create_user_with_company_membership(
            username="treasury_viewer_user",
            email="treasury-viewer@example.com",
            company=cls.company,
            role=CompanyRole.VIEWER,
        )

    def setUp(self) -> None:
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_summary_api_returns_company_scoped_summary(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Summary Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        other_account = create_treasury_account(
            company=self.other_company,
            user=self.user,
            name="Other API Summary Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="999.00",
        )

        transaction = create_treasury_transaction(
            company=self.company,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="50.00",
        )
        post_treasury_transaction(
            company=self.company,
            treasury_transaction=transaction,
            user=self.user,
        )

        create_treasury_transaction(
            company=self.other_company,
            account=other_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="300.00",
        )

        response = self.client.get("/api/company/treasury/summary/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["summary"]["total_accounts"], 1)
        self.assertEqual(response.data["summary"]["total_balance"], "150.00")
        self.assertEqual(response.data["summary"]["posted_inflows"], "50.00")

    def test_accounts_list_api_returns_current_company_accounts_only(self) -> None:
        create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Main Cash",
            code="api-cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        create_treasury_account(
            company=self.other_company,
            user=self.user,
            name="Foreign Cash",
            code="foreign-cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="900.00",
        )

        response = self.client.get("/api/company/treasury/accounts/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "API Main Cash")
        self.assertEqual(response.data["results"][0]["company_id"], self.company.id)

    def test_accounts_create_api_creates_account_for_current_company(self) -> None:
        response = self.client.post(
            "/api/company/treasury/accounts/",
            data={
                "name": "API Created Bank",
                "code": "api-bank",
                "account_type": TreasuryAccount.AccountType.BANK,
                "opening_balance": "250.00",
                "bank_name": "SNB",
                "iban": "SA0380000000608010167519",
                "is_default": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["name"], "API Created Bank")
        self.assertEqual(response.data["item"]["company_id"], self.company.id)
        self.assertEqual(response.data["item"]["current_balance"], "250.00")

        account = TreasuryAccount.objects.get(id=response.data["item"]["id"])
        self.assertEqual(account.company_id, self.company.id)
        self.assertEqual(account.created_by_id, self.user.id)

    def test_account_detail_api_returns_account(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Detail Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="75.00",
        )

        response = self.client.get(f"/api/company/treasury/accounts/{account.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["id"], account.id)
        self.assertEqual(response.data["item"]["name"], "API Detail Cash")

    def test_account_update_api_updates_draft_safe_fields(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Update Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        response = self.client.patch(
            f"/api/company/treasury/accounts/{account.id}/",
            data={
                "name": "API Updated Cash",
                "notes": "Updated through API",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["name"], "API Updated Cash")

        account.refresh_from_db()
        self.assertEqual(account.name, "API Updated Cash")
        self.assertEqual(account.notes, "Updated through API")

    def test_account_deactivate_api_marks_account_inactive(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Deactivate Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        response = self.client.post(
            f"/api/company/treasury/accounts/{account.id}/",
            data={"action": "deactivate"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])

        account.refresh_from_db()
        self.assertEqual(account.status, TreasuryAccount.AccountStatus.INACTIVE)

    def test_transactions_list_api_returns_current_company_transactions_only(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        other_account = create_treasury_account(
            company=self.other_company,
            user=self.user,
            name="Other API Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        current_tx = create_treasury_transaction(
            company=self.company,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="20.00",
            reference="CURRENT-TX",
        )
        create_treasury_transaction(
            company=self.other_company,
            account=other_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="999.00",
            reference="FOREIGN-TX",
        )

        response = self.client.get("/api/company/treasury/transactions/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], current_tx.id)
        self.assertEqual(response.data["results"][0]["reference"], "CURRENT-TX")

    def test_transactions_create_api_creates_draft_without_balance_effect(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Draft Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="500.00",
        )

        response = self.client.post(
            "/api/company/treasury/transactions/",
            data={
                "account_id": account.id,
                "transaction_type": TreasuryTransaction.TransactionType.INFLOW,
                "amount": "125.00",
                "description": "API draft receipt",
                "reference": "API-DRAFT-001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["status"], TreasuryTransaction.TransactionStatus.DRAFT)
        self.assertEqual(response.data["item"]["amount"], "125.00")

        account.refresh_from_db()
        self.assertEqual(account.current_balance, Decimal("500.00"))

    def test_transactions_create_api_can_create_posted_transaction(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Posted Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        response = self.client.post(
            "/api/company/treasury/transactions/",
            data={
                "account_id": account.id,
                "transaction_type": TreasuryTransaction.TransactionType.INFLOW,
                "amount": "25.00",
                "status": TreasuryTransaction.TransactionStatus.POSTED,
                "description": "Create and post",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["status"], TreasuryTransaction.TransactionStatus.POSTED)

        account.refresh_from_db()
        self.assertEqual(account.current_balance, Decimal("125.00"))

    def test_transaction_detail_api_returns_transaction(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Detail Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        transaction = create_treasury_transaction(
            company=self.company,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="30.00",
            description="Detail transaction",
        )

        response = self.client.get(f"/api/company/treasury/transactions/{transaction.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["id"], transaction.id)
        self.assertEqual(response.data["item"]["description"], "Detail transaction")

    def test_transaction_update_api_updates_draft_transaction_only(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Update Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        transaction = create_treasury_transaction(
            company=self.company,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="30.00",
            description="Before update",
        )

        response = self.client.patch(
            f"/api/company/treasury/transactions/{transaction.id}/",
            data={
                "amount": "45.00",
                "description": "After update",
                "reference": "UPDATED-TX",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["amount"], "45.00")
        self.assertEqual(response.data["item"]["description"], "After update")

        transaction.refresh_from_db()
        self.assertEqual(transaction.amount, Decimal("45.00"))
        self.assertEqual(transaction.reference, "UPDATED-TX")

    def test_post_transaction_api_posts_transaction_and_updates_balance(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Post Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        transaction = create_treasury_transaction(
            company=self.company,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="80.00",
        )

        response = self.client.post(
            f"/api/company/treasury/transactions/{transaction.id}/post/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["status"], TreasuryTransaction.TransactionStatus.POSTED)

        account.refresh_from_db()
        self.assertEqual(account.current_balance, Decimal("180.00"))

    def test_cancel_transaction_api_cancels_posted_transaction_and_reverses_balance(self) -> None:
        account = create_treasury_account(
            company=self.company,
            user=self.user,
            name="API Cancel Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        transaction = create_treasury_transaction(
            company=self.company,
            account=account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="80.00",
        )
        post_treasury_transaction(
            company=self.company,
            treasury_transaction=transaction,
            user=self.user,
        )

        response = self.client.post(
            f"/api/company/treasury/transactions/{transaction.id}/cancel/",
            data={"reason": "API cancellation"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["status"], TreasuryTransaction.TransactionStatus.CANCELLED)

        account.refresh_from_db()
        transaction.refresh_from_db()

        self.assertEqual(account.current_balance, Decimal("100.00"))
        self.assertEqual(transaction.cancellation_reason, "API cancellation")

    def test_api_rejects_foreign_account_detail_access(self) -> None:
        foreign_account = create_treasury_account(
            company=self.other_company,
            user=self.user,
            name="Foreign Detail Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )

        response = self.client.get(f"/api/company/treasury/accounts/{foreign_account.id}/")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_api_rejects_foreign_transaction_detail_access(self) -> None:
        foreign_account = create_treasury_account(
            company=self.other_company,
            user=self.user,
            name="Foreign Tx Cash",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance="100.00",
        )
        foreign_transaction = create_treasury_transaction(
            company=self.other_company,
            account=foreign_account,
            user=self.user,
            transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            amount="10.00",
        )

        response = self.client.get(
            f"/api/company/treasury/transactions/{foreign_transaction.id}/"
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_unauthenticated_api_request_is_rejected(self) -> None:
        anonymous_client = APIClient()

        response = anonymous_client.get("/api/company/treasury/accounts/")

        self.assertIn(response.status_code, [401, 403])

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from billing.models import (
    PlatformPaymentReconciliation,
)
from billing.payment_services import (
    create_or_get_subscription_payment,
)
from billing.reconciliation_services import (
    reconcile_platform_payment,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentResult,
    PaymentStatus,
)
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.tests import (
    SubscriptionServiceTests,
)


User = get_user_model()


class PlatformPaymentReconciliationTests(
    TestCase
):
    def setUp(self):
        self.user = (
            User.objects.create_user(
                username="phase29c-reconciliation",
                email="phase29c-reconciliation@example.com",
                password="StrongPass123!",
            )
        )

        self.company = (
            SubscriptionServiceTests
            .create_company(
                self,
                name=(
                    "Phase 29C Reconciliation Company"
                ),
            )
        )

        self.plan = (
            SubscriptionPlan.objects.create(
                name="Phase 29C Plan",
                code=(
                    SubscriptionPlan
                    .PlanCode
                    .PROFESSIONAL
                ),
                slug="phase29c-plan",
                monthly_price=Decimal(
                    "100.00"
                ),
                yearly_price=Decimal(
                    "1000.00"
                ),
                max_users=20,
                max_branches=3,
                max_warehouses=2,
                max_pos=2,
                features=[
                    "accounting"
                ],
                is_active=True,
                is_public=True,
            )
        )

        self.subscription = (
            CompanySubscription.objects.create(
                company=self.company,
                plan=self.plan,
                status=(
                    CompanySubscription
                    .Status
                    .PENDING_PAYMENT
                ),
                action=(
                    CompanySubscription
                    .SubscriptionAction
                    .NEW
                ),
                billing_cycle=(
                    CompanySubscription
                    .BillingCycle
                    .MONTHLY
                ),
                start_date=(
                    timezone.localdate()
                ),
                end_date=(
                    timezone.localdate()
                    + timedelta(days=30)
                ),
                price=Decimal(
                    "100.00"
                ),
                discount_amount=Decimal(
                    "0.00"
                ),
                tax_amount=Decimal(
                    "15.00"
                ),
                total_amount=Decimal(
                    "115.00"
                ),
                billing_reference=(
                    "PH29C-BILL-001"
                ),
                created_by=self.user,
            )
        )

        self.payment, created = (
            create_or_get_subscription_payment(
                subscription=self.subscription,
                idempotency_key=(
                    "phase29c:reconciliation:1"
                ),
                gateway="MOYASAR",
                payment_method="CARD",
                gateway_payment_id=(
                    "pay_phase29c_001"
                ),
                created_by=self.user,
            )
        )

        self.assertTrue(
            created
        )

    def provider_result(
        self,
        *,
        status=PaymentStatus.PENDING,
        amount=11500,
        currency="SAR",
        provider_id="pay_phase29c_001",
        reference=None,
        raw=None,
    ):
        return PaymentResult(
            gateway=(
                PaymentGatewayName
                .MOYASAR
            ),
            provider_payment_id=(
                provider_id
            ),
            status=status,
            amount=amount,
            currency=currency,
            reference=(
                reference
                if reference is not None
                else self.payment.payment_reference
            ),
            raw=(
                raw
                or {
                    "id": provider_id,
                    "status": status.value,
                }
            ),
        )

    def test_matching_provider_state_creates_matched_history(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.return_value = (
            self.provider_result()
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            actor=self.user,
            adapter=adapter,
        )

        self.assertEqual(
            row.status,
            PlatformPaymentReconciliation
            .Status
            .MATCHED,
        )

        self.assertEqual(
            row.discrepancies,
            [],
        )

        adapter.retrieve_payment.assert_called_once_with(
            "pay_phase29c_001"
        )

        self.payment.refresh_from_db()

        # Reconciliation is read-only.
        self.assertEqual(
            self.payment.status,
            "PENDING",
        )

    def test_amount_mismatch_is_recorded_without_mutation(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.return_value = (
            self.provider_result(
                amount=1
            )
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            actor=self.user,
            adapter=adapter,
        )

        self.assertEqual(
            row.status,
            PlatformPaymentReconciliation
            .Status
            .DISCREPANCY,
        )

        self.assertIn(
            "AMOUNT_MISMATCH",
            row.discrepancies,
        )

        self.payment.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            "PENDING",
        )

    def test_currency_reference_and_id_mismatches_are_audited(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.return_value = (
            self.provider_result(
                provider_id="wrong-provider-id",
                currency="USD",
                reference="wrong-reference",
            )
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            adapter=adapter,
        )

        self.assertEqual(
            row.status,
            PlatformPaymentReconciliation
            .Status
            .DISCREPANCY,
        )

        self.assertIn(
            "PROVIDER_PAYMENT_ID_MISMATCH",
            row.discrepancies,
        )

        self.assertIn(
            "CURRENCY_MISMATCH",
            row.discrepancies,
        )

        self.assertIn(
            "REFERENCE_MISMATCH",
            row.discrepancies,
        )

    def test_status_mismatch_is_recorded(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.return_value = (
            self.provider_result(
                status=PaymentStatus.PAID
            )
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            adapter=adapter,
        )

        self.assertIn(
            "STATUS_MISMATCH",
            row.discrepancies,
        )

        self.assertEqual(
            row.provider_status,
            "paid",
        )

        self.payment.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            "PENDING",
        )

    def test_missing_provider_reference_is_warning_not_false_mismatch(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.return_value = (
            self.provider_result(
                reference=""
            )
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            adapter=adapter,
        )

        self.assertEqual(
            row.status,
            PlatformPaymentReconciliation
            .Status
            .MATCHED,
        )

        self.assertIn(
            "PROVIDER_REFERENCE_NOT_RETURNED",
            row.warnings,
        )

    def test_provider_failure_is_persisted_as_error_without_secret_leak(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.side_effect = (
            RuntimeError(
                "super-secret-provider-token"
            )
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            adapter=adapter,
        )

        self.assertEqual(
            row.status,
            PlatformPaymentReconciliation
            .Status
            .ERROR,
        )

        self.assertEqual(
            row.error_code,
            "RUNTIMEERROR",
        )

        self.assertNotIn(
            "super-secret-provider-token",
            row.error_message,
        )

    def test_provider_snapshot_redacts_secrets(
        self,
    ):
        adapter = MagicMock()

        adapter.retrieve_payment.return_value = (
            self.provider_result(
                raw={
                    "id": "pay_phase29c_001",
                    "secret_token": "hidden",
                    "nested": {
                        "authorization": "hidden-too",
                        "status": "pending",
                    },
                }
            )
        )

        row = reconcile_platform_payment(
            payment=self.payment,
            adapter=adapter,
        )

        self.assertEqual(
            row.provider_snapshot[
                "secret_token"
            ],
            "[REDACTED]",
        )

        self.assertEqual(
            row.provider_snapshot[
                "nested"
            ][
                "authorization"
            ],
            "[REDACTED]",
        )

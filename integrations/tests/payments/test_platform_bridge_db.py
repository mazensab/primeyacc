from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from billing.models import PlatformBillingDocumentStatus, PlatformSubscriptionPayment
from billing.payment_services import create_or_get_subscription_payment
from integrations.payments.platform_bridge import apply_gateway_result, verify_and_apply_gateway_payment
from integrations.payments.types import PaymentGatewayName, PaymentResult, PaymentStatus
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.tests import SubscriptionServiceTests

User = get_user_model()


class PlatformGatewayDatabaseLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="phase21-gateway-admin",
            email="phase21-gateway@mhamcloud.test",
            password="StrongPass123!",
        )

        self.company = SubscriptionServiceTests.create_company(
            self,
            name="Phase 21 Gateway Company",
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Phase 21 Gateway Professional",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="phase21-gateway-professional",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=20,
            max_branches=3,
            max_warehouses=2,
            max_pos=2,
            features=["accounting"],
            is_active=True,
            is_public=True,
        )

        self.pending = CompanySubscription.objects.create(
            company=self.company,
            plan=self.plan,
            status=CompanySubscription.Status.PENDING_PAYMENT,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            billing_reference="PH21-BILL-001",
            created_by=self.user,
        )

    def create_payment(self, provider_id=""):
        payment, created = create_or_get_subscription_payment(
            subscription=self.pending,
            idempotency_key=f"phase21:{PlatformSubscriptionPayment.objects.count()+1}",
            gateway="MOYASAR",
            payment_method="CARD",
            gateway_payment_id=provider_id,
            created_by=self.user,
        )
        self.assertTrue(created)
        return payment

    def result(self, payment, status, provider_id="pay_phase21_001", raw=None):
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=provider_id,
            status=status,
            amount=11500,
            currency="SAR",
            reference=payment.payment_reference,
            raw=raw or {"id": provider_id, "status": status.value},
        )

    def test_processing_then_paid_closes_cycle(self):
        payment = self.create_payment()

        processed = apply_gateway_result(
            payment=payment,
            result=self.result(payment, PaymentStatus.PENDING),
            actor=self.user,
        )
        processed.refresh_from_db()
        self.assertEqual(processed.status, PlatformSubscriptionPayment.Status.PROCESSING)

        paid, subscription, receipt = apply_gateway_result(
            payment=processed,
            result=self.result(
                processed,
                PaymentStatus.PAID,
                raw={"id": "pay_phase21_001", "status": "paid", "verified": True},
            ),
            actor=self.user,
        )

        paid.refresh_from_db()
        subscription.refresh_from_db()
        paid.invoice.refresh_from_db()

        self.assertEqual(paid.status, PlatformSubscriptionPayment.Status.PAID)
        self.assertEqual(subscription.status, CompanySubscription.Status.ACTIVE)
        self.assertIsNotNone(receipt)
        self.assertEqual(paid.invoice.status, PlatformBillingDocumentStatus.PAID)

    def test_failed_does_not_activate(self):
        payment = self.create_payment()
        failed = apply_gateway_result(
            payment=payment,
            result=self.result(payment, PaymentStatus.FAILED),
            actor=self.user,
        )
        failed.refresh_from_db()
        self.pending.refresh_from_db()
        self.assertEqual(failed.status, PlatformSubscriptionPayment.Status.FAILED)
        self.assertEqual(self.pending.status, CompanySubscription.Status.PENDING_PAYMENT)

    def test_cancelled_does_not_activate(self):
        payment = self.create_payment()
        cancelled = apply_gateway_result(
            payment=payment,
            result=self.result(payment, PaymentStatus.CANCELLED, "pay_phase21_cancelled"),
            actor=self.user,
        )
        cancelled.refresh_from_db()
        self.pending.refresh_from_db()
        self.assertEqual(cancelled.status, PlatformSubscriptionPayment.Status.CANCELLED)
        self.assertEqual(self.pending.status, CompanySubscription.Status.PENDING_PAYMENT)

    def test_terminal_cannot_return_to_processing(self):
        payment = self.create_payment()
        apply_gateway_result(
            payment=payment,
            result=self.result(payment, PaymentStatus.FAILED),
            actor=self.user,
        )
        payment.refresh_from_db()
        with self.assertRaises(ValidationError):
            apply_gateway_result(
                payment=payment,
                result=self.result(payment, PaymentStatus.PENDING),
                actor=self.user,
            )

    def test_verify_fetches_provider_before_activation(self):
        payment = self.create_payment("pay_phase21_verify")
        adapter = MagicMock()
        adapter.retrieve_payment.return_value = self.result(
            payment,
            PaymentStatus.PAID,
            "pay_phase21_verify",
            {"id": "pay_phase21_verify", "status": "paid", "source": "provider-verification"},
        )

        paid, subscription, receipt = verify_and_apply_gateway_payment(
            payment=payment,
            actor=self.user,
            adapter=adapter,
        )

        adapter.retrieve_payment.assert_called_once_with("pay_phase21_verify")
        paid.refresh_from_db()
        subscription.refresh_from_db()
        self.assertEqual(paid.status, PlatformSubscriptionPayment.Status.PAID)
        self.assertEqual(subscription.status, CompanySubscription.Status.ACTIVE)
        self.assertIsNotNone(receipt)

    def test_verify_requires_provider_payment_id(self):
        payment = self.create_payment()
        adapter = MagicMock()

        with self.assertRaises(ValidationError):
            verify_and_apply_gateway_payment(
                payment=payment,
                actor=self.user,
                adapter=adapter,
            )

        adapter.retrieve_payment.assert_not_called()

    def test_verify_rejects_provider_payment_id_mismatch(self):
        payment = self.create_payment(
            "pay_phase22_expected"
        )

        adapter = MagicMock()
        adapter.retrieve_payment.return_value = self.result(
            payment,
            PaymentStatus.PAID,
            "pay_phase22_other",
        )

        from integrations.payments.exceptions import (
            PaymentGatewayVerificationError,
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_and_apply_gateway_payment(
                payment=payment,
                actor=self.user,
                adapter=adapter,
            )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_verify_applies_provider_failed_state(self):
        payment = self.create_payment(
            "pay_phase22_failed"
        )

        adapter = MagicMock()
        adapter.retrieve_payment.return_value = self.result(
            payment,
            PaymentStatus.FAILED,
            "pay_phase22_failed",
        )

        failed = verify_and_apply_gateway_payment(
            payment=payment,
            actor=self.user,
            adapter=adapter,
        )

        failed.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            failed.status,
            PlatformSubscriptionPayment.Status.FAILED,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_verify_rejects_amount_mismatch_before_activation(self):
        payment = self.create_payment(
            "pay_phase22_amount"
        )

        adapter = MagicMock()
        adapter.retrieve_payment.return_value = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_phase22_amount",
            status=PaymentStatus.PAID,
            amount=1,
            currency="SAR",
            reference=payment.payment_reference,
            raw={
                "id": "pay_phase22_amount",
                "status": "paid",
            },
        )

        from integrations.payments.exceptions import (
            PaymentGatewayVerificationError,
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_and_apply_gateway_payment(
                payment=payment,
                actor=self.user,
                adapter=adapter,
            )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_verify_rejects_currency_mismatch_before_activation(self):
        payment = self.create_payment(
            "pay_phase22_currency"
        )

        adapter = MagicMock()
        adapter.retrieve_payment.return_value = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_phase22_currency",
            status=PaymentStatus.PAID,
            amount=11500,
            currency="USD",
            reference=payment.payment_reference,
            raw={
                "id": "pay_phase22_currency",
                "status": "paid",
            },
        )

        from integrations.payments.exceptions import (
            PaymentGatewayVerificationError,
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_and_apply_gateway_payment(
                payment=payment,
                actor=self.user,
                adapter=adapter,
            )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_verify_rejects_reference_mismatch_before_activation(self):
        payment = self.create_payment(
            "pay_phase22_reference"
        )

        adapter = MagicMock()
        adapter.retrieve_payment.return_value = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_phase22_reference",
            status=PaymentStatus.PAID,
            amount=11500,
            currency="SAR",
            reference="wrong-reference",
            raw={
                "id": "pay_phase22_reference",
                "status": "paid",
            },
        )

        from integrations.payments.exceptions import (
            PaymentGatewayVerificationError,
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_and_apply_gateway_payment(
                payment=payment,
                actor=self.user,
                adapter=adapter,
            )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_paid_verification_is_idempotent(self):
        payment = self.create_payment(
            "pay_phase22_idempotent"
        )

        adapter = MagicMock()
        adapter.retrieve_payment.return_value = self.result(
            payment,
            PaymentStatus.PAID,
            "pay_phase22_idempotent",
        )

        paid, subscription, receipt = verify_and_apply_gateway_payment(
            payment=payment,
            actor=self.user,
            adapter=adapter,
        )

        paid.refresh_from_db()

        paid_again, subscription_again, receipt_again = (
            verify_and_apply_gateway_payment(
                payment=paid,
                actor=self.user,
                adapter=adapter,
            )
        )

        self.assertEqual(
            paid_again.pk,
            paid.pk,
        )
        self.assertEqual(
            subscription_again.pk,
            subscription.pk,
        )
        self.assertEqual(
            receipt_again.pk,
            receipt.pk,
        )
        self.assertEqual(
            adapter.retrieve_payment.call_count,
            2,
        )

    def test_authorized_provider_state_moves_to_processing(self):
        payment = self.create_payment(
            "pay_phase22_authorized"
        )

        processed = apply_gateway_result(
            payment=payment,
            result=self.result(
                payment,
                PaymentStatus.AUTHORIZED,
                "pay_phase22_authorized",
            ),
            actor=self.user,
        )

        processed.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            processed.status,
            PlatformSubscriptionPayment.Status.PROCESSING,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_verify_rejects_unsupported_provider_states(self):
        from integrations.payments.exceptions import (
            PaymentGatewayVerificationError,
        )

        unsupported_statuses = (
            PaymentStatus.UNKNOWN,
            PaymentStatus.REFUNDED,
            PaymentStatus.PARTIALLY_REFUNDED,
        )

        for index, status in enumerate(
            unsupported_statuses,
            start=1,
        ):
            with self.subTest(status=status):
                provider_id = (
                    f"pay_phase22_unsupported_{index}"
                )

                payment = self.create_payment(
                    provider_id
                )

                adapter = MagicMock()
                adapter.retrieve_payment.return_value = (
                    self.result(
                        payment,
                        status,
                        provider_id,
                    )
                )

                with self.assertRaises(
                    PaymentGatewayVerificationError
                ):
                    verify_and_apply_gateway_payment(
                        payment=payment,
                        actor=self.user,
                        adapter=adapter,
                    )

                payment.refresh_from_db()
                self.pending.refresh_from_db()

                self.assertEqual(
                    payment.status,
                    PlatformSubscriptionPayment.Status.PENDING,
                )
                self.assertEqual(
                    self.pending.status,
                    CompanySubscription.Status.PENDING_PAYMENT,
                )

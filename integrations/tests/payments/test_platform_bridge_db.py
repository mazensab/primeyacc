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
        adapter.verify_payment.return_value = self.result(
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

        adapter.verify_payment.assert_called_once_with("pay_phase21_verify")
        paid.refresh_from_db()
        subscription.refresh_from_db()
        self.assertEqual(paid.status, PlatformSubscriptionPayment.Status.PAID)
        self.assertEqual(subscription.status, CompanySubscription.Status.ACTIVE)
        self.assertIsNotNone(receipt)

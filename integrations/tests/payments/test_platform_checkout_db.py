from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from billing.models import PlatformSubscriptionPayment, PlatformSubscriptionPaymentEvent
from billing.payment_services import create_or_get_subscription_payment
from integrations.payments.platform_checkout import attach_moyasar_client_payment, initiate_platform_checkout
from integrations.payments.types import PaymentGatewayName, PaymentResult, PaymentStatus
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.tests import SubscriptionServiceTests

User = get_user_model()


class PlatformCheckoutDatabaseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="phase22-checkout-admin",
            email="phase22-checkout@mhamcloud.test",
            password="StrongPass123!",
        )

        self.company = SubscriptionServiceTests.create_company(
            self,
            name="Phase 22 Checkout Company",
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Phase 22 Checkout Professional",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="phase22-checkout-professional",
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
            billing_reference="PH22-BILL-001",
            created_by=self.user,
        )

    def create_payment(self, gateway):
        payment, created = create_or_get_subscription_payment(
            subscription=self.pending,
            idempotency_key=f"phase22:{gateway.lower()}:{PlatformSubscriptionPayment.objects.count()+1}",
            gateway=gateway,
            payment_method="CARD",
            created_by=self.user,
        )
        self.assertTrue(created)
        self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PENDING)
        return payment

    def checkout_result(self, payment, gateway, provider_id, checkout_url, status=PaymentStatus.INITIATED):
        return PaymentResult(
            gateway=gateway,
            provider_payment_id=provider_id,
            status=status,
            amount=11500,
            currency="SAR",
            checkout_url=checkout_url,
            reference=payment.payment_reference,
            raw={
                "id": provider_id,
                "status": status.value,
                "checkout_url": checkout_url,
                "token": "must-not-be-stored",
            },
        )

    def assert_server_checkout(self, gateway_name, gateway_enum, provider_id):
        payment = self.create_payment(gateway_name)
        adapter = MagicMock()
        adapter.create_payment.return_value = self.checkout_result(
            payment,
            gateway_enum,
            provider_id,
            "https://checkout.example/" + provider_id,
        )

        checkout = initiate_platform_checkout(
            payment=payment,
            metadata={"channel": "system"},
            description="Mhamcloud subscription",
            adapter=adapter,
        )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PROCESSING)
        self.assertEqual(payment.gateway_payment_id, provider_id)
        self.assertIsNotNone(payment.processing_at)
        self.assertIsNone(payment.receipt_id)
        self.assertEqual(self.pending.status, CompanySubscription.Status.PENDING_PAYMENT)
        self.assertEqual(payment.provider_response_snapshot["token"], "[REDACTED]")
        self.assertEqual(payment.provider_request_snapshot["reference"], payment.payment_reference)
        self.assertEqual(checkout.mode, "redirect")
        self.assertEqual(checkout.provider_payment_id, provider_id)
        self.assertTrue(checkout.checkout_url)

        self.assertTrue(
            PlatformSubscriptionPaymentEvent.objects.filter(
                payment=payment,
                event_type="PROCESSING",
            ).exists()
        )

        request = adapter.create_payment.call_args.args[0]
        self.assertEqual(request.amount, 11500)
        self.assertEqual(request.currency, "SAR")
        self.assertEqual(request.reference, payment.payment_reference)

    def test_tamara_checkout_moves_pending_to_processing(self):
        self.assert_server_checkout(
            "TAMARA",
            PaymentGatewayName.TAMARA,
            "tamara_order_22",
        )

    def test_tabby_checkout_moves_pending_to_processing(self):
        self.assert_server_checkout(
            "TABBY",
            PaymentGatewayName.TABBY,
            "tabby_payment_22",
        )

    def test_moyasar_checkout_stays_pending_until_client_attaches_payment(self):
        payment = self.create_payment("MOYASAR")
        adapter = MagicMock()

        checkout = initiate_platform_checkout(
            payment=payment,
            adapter=adapter,
        )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        adapter.create_payment.assert_not_called()
        self.assertEqual(checkout.mode, "client")
        self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PENDING)
        self.assertEqual(payment.gateway_payment_id, "")
        self.assertIsNone(payment.receipt_id)
        self.assertEqual(self.pending.status, CompanySubscription.Status.PENDING_PAYMENT)

    def test_moyasar_attach_moves_pending_to_processing(self):
        payment = self.create_payment("MOYASAR")

        result = attach_moyasar_client_payment(
            payment=payment,
            provider_payment_id="moyasar_pay_22",
        )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(result.mode, "client")
        self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PROCESSING)
        self.assertEqual(payment.gateway_payment_id, "moyasar_pay_22")
        self.assertIsNotNone(payment.processing_at)
        self.assertIsNone(payment.receipt_id)
        self.assertEqual(self.pending.status, CompanySubscription.Status.PENDING_PAYMENT)

        self.assertTrue(
            PlatformSubscriptionPaymentEvent.objects.filter(
                payment=payment,
                event_type="PROCESSING",
            ).exists()
        )

    def test_moyasar_cannot_replace_existing_provider_payment_id(self):
        payment = self.create_payment("MOYASAR")

        attach_moyasar_client_payment(
            payment=payment,
            provider_payment_id="moyasar_original",
        )

        payment.refresh_from_db()

        with self.assertRaises(ValidationError):
            attach_moyasar_client_payment(
                payment=payment,
                provider_payment_id="moyasar_different",
            )

        payment.refresh_from_db()
        self.assertEqual(payment.gateway_payment_id, "moyasar_original")

    def test_server_checkout_rejects_paid_result_without_verification(self):
        payment = self.create_payment("TAMARA")
        adapter = MagicMock()
        adapter.create_payment.return_value = self.checkout_result(
            payment,
            PaymentGatewayName.TAMARA,
            "tamara_paid_invalid",
            "https://checkout.example/invalid",
            PaymentStatus.PAID,
        )

        with self.assertRaises(ValidationError):
            initiate_platform_checkout(
                payment=payment,
                adapter=adapter,
            )

        payment.refresh_from_db()
        self.pending.refresh_from_db()
        self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PENDING)
        self.assertEqual(payment.gateway_payment_id, "")
        self.assertEqual(self.pending.status, CompanySubscription.Status.PENDING_PAYMENT)

    def test_terminal_payment_cannot_start_new_checkout(self):
        payment = self.create_payment("TABBY")
        payment.status = PlatformSubscriptionPayment.Status.FAILED
        payment.failed_at = timezone.now()
        payment.save(
            update_fields=[
                "status",
                "failed_at",
                "updated_at",
            ]
        )

        adapter = MagicMock()

        with self.assertRaises(ValidationError):
            initiate_platform_checkout(
                payment=payment,
                adapter=adapter,
            )

        adapter.create_payment.assert_not_called()

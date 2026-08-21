from __future__ import annotations
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformSubscriptionPayment,
    PlatformSubscriptionPaymentEvent,
)
from billing.payment_services import (
    cancel_subscription_payment_attempt,
    confirm_subscription_payment,
    create_or_get_subscription_payment,
    fail_subscription_payment,
)
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.tests import SubscriptionServiceTests
User = get_user_model()
class PlatformSubscriptionPaymentLifecycleTests(
    TestCase
):
    def setUp(self):
        self.user = User.objects.create_user(
            username="phase19-payment-admin",
            email="phase19-payment@Mhamcloud.test",
            password="StrongPass123!",
        )
        self.company = (
            SubscriptionServiceTests.create_company(
                self,
                name="Phase 19 Payment Company",
            )
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Phase 19 Professional",
            code=(
                SubscriptionPlan
                .PlanCode
                .PROFESSIONAL
            ),
            slug="phase19-professional",
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
            start_date=timezone.localdate(),
            end_date=(
                timezone.localdate()
                + timedelta(days=30)
            ),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            billing_reference="PH19-BILL-001",
            created_by=self.user,
        )
    def test_create_payment_creates_invoice_and_attempt(
        self,
    ):
        payment, created = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="phase19-create-1",
                gateway="MANUAL",
                payment_method="BANK_TRANSFER",
                created_by=self.user,
            )
        )
        self.assertTrue(created)
        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            payment.amount,
            Decimal("115.00"),
        )
        self.assertEqual(
            payment.subscription_id,
            self.pending.id,
        )
        self.assertEqual(
            payment.company_id,
            self.company.id,
        )
        self.assertTrue(
            payment.payment_reference.startswith(
                "PPAY-"
            )
        )
        self.assertEqual(
            payment.invoice.document_type,
            PlatformBillingDocumentType
            .SUBSCRIPTION_INVOICE,
        )
        self.assertEqual(
            payment.invoice.status,
            PlatformBillingDocumentStatus.ISSUED,
        )
    def test_create_payment_is_idempotent(self):
        first, first_created = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="same-key",
                created_by=self.user,
            )
        )
        second, second_created = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="same-key",
                created_by=self.user,
            )
        )
        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first.id, second.id)
        self.assertEqual(
            PlatformSubscriptionPayment.objects.count(),
            1,
        )
    def test_confirm_payment_closes_full_cycle(self):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="confirm-cycle",
                gateway="MANUAL",
                payment_method="BANK_TRANSFER",
                created_by=self.user,
            )
        )
        payment, subscription, receipt = (
            confirm_subscription_payment(
                payment=payment,
                actor=self.user,
                transaction_reference="TX-PH19-001",
            )
        )
        payment.refresh_from_db()
        subscription.refresh_from_db()
        payment.invoice.refresh_from_db()
        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PAID,
        )
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.ACTIVE,
        )
        self.assertEqual(
            payment.invoice.status,
            PlatformBillingDocumentStatus.PAID,
        )
        self.assertIsNotNone(receipt)
        self.assertEqual(
            receipt.document_type,
            PlatformBillingDocumentType
            .PAYMENT_RECEIPT,
        )
        self.assertEqual(
            payment.receipt_id,
            receipt.id,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.filter(
                subscription=subscription,
                document_type=(
                    PlatformBillingDocumentType
                    .SUBSCRIPTION_INVOICE
                ),
            ).count(),
            1,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.filter(
                subscription=subscription,
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
            ).count(),
            1,
        )
    def test_confirm_payment_twice_is_idempotent(
        self,
    ):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="confirm-twice",
                created_by=self.user,
            )
        )
        first = confirm_subscription_payment(
            payment=payment,
            actor=self.user,
        )
        second = confirm_subscription_payment(
            payment=payment,
            actor=self.user,
        )
        self.assertEqual(
            first[0].id,
            second[0].id,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.filter(
                subscription=self.pending,
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
            ).count(),
            1,
        )
        self.assertEqual(
            PlatformSubscriptionPayment.objects.filter(
                subscription=self.pending,
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .PAID
                ),
            ).count(),
            1,
        )
    def test_failed_payment_does_not_activate_subscription(
        self,
    ):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="failed-payment",
                created_by=self.user,
            )
        )
        fail_subscription_payment(
            payment=payment,
            actor=self.user,
            failure_code="DECLINED",
            failure_message="Payment declined",
        )
        self.pending.refresh_from_db()
        payment.refresh_from_db()
        payment.invoice.refresh_from_db()
        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.FAILED,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            payment.invoice.status,
            PlatformBillingDocumentStatus.ISSUED,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.filter(
                subscription=self.pending,
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
            ).count(),
            0,
        )
    def test_cancelled_payment_does_not_activate_subscription(
        self,
    ):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="cancel-payment",
                created_by=self.user,
            )
        )
        cancel_subscription_payment_attempt(
            payment=payment,
            actor=self.user,
            reason="Customer cancelled",
        )
        self.pending.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment
            .Status
            .CANCELLED,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription
            .Status
            .PENDING_PAYMENT,
        )
    def test_failed_payment_can_retry_with_new_attempt(
        self,
    ):
        first, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="retry-first",
                created_by=self.user,
            )
        )
        fail_subscription_payment(
            payment=first,
            actor=self.user,
            failure_code="DECLINED",
        )
        second, created = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="retry-second",
                created_by=self.user,
            )
        )
        self.assertTrue(created)
        self.assertNotEqual(first.id, second.id)
        self.assertEqual(first.attempt_number, 1)
        self.assertEqual(second.attempt_number, 2)
    def test_failed_attempt_cannot_be_reanimated_to_paid(
        self,
    ):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="no-reanimate",
                created_by=self.user,
            )
        )
        fail_subscription_payment(
            payment=payment,
            actor=self.user,
        )
        with self.assertRaises(ValidationError):
            confirm_subscription_payment(
                payment=payment,
                actor=self.user,
            )
    def test_payment_amount_mismatch_blocks_confirmation(
        self,
    ):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="amount-mismatch",
                created_by=self.user,
            )
        )
        PlatformSubscriptionPayment.objects.filter(
            pk=payment.pk
        ).update(
            amount=Decimal("999.00")
        )
        payment.refresh_from_db()
        with self.assertRaises(ValidationError):
            confirm_subscription_payment(
                payment=payment,
                actor=self.user,
            )
        self.pending.refresh_from_db()
        self.assertEqual(
            self.pending.status,
            CompanySubscription
            .Status
            .PENDING_PAYMENT,
        )
    def test_audit_events_are_created(self):
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.pending,
                idempotency_key="audit-events",
                created_by=self.user,
            )
        )
        self.assertEqual(
            PlatformSubscriptionPaymentEvent.objects
            .filter(payment=payment)
            .count(),
            1,
        )
        confirm_subscription_payment(
            payment=payment,
            actor=self.user,
        )
        events = list(
            PlatformSubscriptionPaymentEvent.objects
            .filter(payment=payment)
            .values_list(
                "event_type",
                flat=True,
            )
        )
        self.assertIn("CREATED", events)
        self.assertIn("PAID", events)


    def test_provider_managed_payment_requires_verified_confirmation(self):
        payment, _ = create_or_get_subscription_payment(
            subscription=self.pending,
            idempotency_key="phase22d-provider-guard",
            gateway="MOYASAR",
            payment_method="CARD",
            gateway_payment_id="pay_phase22d_guard",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            confirm_subscription_payment(
                payment=payment,
                actor=self.user,
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

    def test_provider_verified_confirmation_succeeds(self):
        payment, _ = create_or_get_subscription_payment(
            subscription=self.pending,
            idempotency_key="phase22d-provider-ok",
            gateway="MOYASAR",
            payment_method="CARD",
            gateway_payment_id="pay_phase22d_ok",
            created_by=self.user,
        )

        paid, subscription, receipt = confirm_subscription_payment(
            payment=payment,
            actor=self.user,
            gateway_payment_id="pay_phase22d_ok",
            provider_verified=True,
        )

        self.assertEqual(
            paid.status,
            PlatformSubscriptionPayment.Status.PAID,
        )
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.ACTIVE,
        )
        self.assertIsNotNone(receipt)

    def test_provider_payment_id_cannot_be_replaced(self):
        payment, _ = create_or_get_subscription_payment(
            subscription=self.pending,
            idempotency_key="phase22d-provider-id",
            gateway="MOYASAR",
            payment_method="CARD",
            gateway_payment_id="pay_original",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            confirm_subscription_payment(
                payment=payment,
                actor=self.user,
                gateway_payment_id="pay_different",
                provider_verified=True,
            )

        payment.refresh_from_db()
        self.pending.refresh_from_db()

        self.assertEqual(
            payment.gateway_payment_id,
            "pay_original",
        )
        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            self.pending.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

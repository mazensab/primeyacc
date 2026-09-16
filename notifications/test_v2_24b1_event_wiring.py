from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from billing.models import PlatformSubscriptionPayment
from billing.payment_services import (
    cancel_subscription_payment_attempt,
    create_or_get_subscription_payment,
)
from billing.refund_services import (
    create_or_get_platform_refund,
    execute_platform_refund,
)
from companies.models import Company, CompanyStatus
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentResult,
    PaymentStatus,
)
from notifications.models import NotificationEvent
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.services import cancel_subscription, suspend_subscription

User = get_user_model()


class _RefundSucceededAdapter:
    def refund_payment(self, request):
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=request.provider_payment_id,
            status=PaymentStatus.PARTIALLY_REFUNDED,
            amount=request.amount or 0,
            currency="SAR",
            raw={"id": "v224b1-refund-success"},
        )


class _RefundFailedAdapter:
    def refund_payment(self, request):
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=request.provider_payment_id,
            status=PaymentStatus.FAILED,
            amount=request.amount or 0,
            currency="SAR",
            raw={"id": "v224b1-refund-failed"},
        )


class V224B1EventWiringTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="v224b1-admin",
            email="v224b1@example.com",
            password="SafeV224B1Password!",
        )
        self.company = Company.objects.create(
            name="V2 24B1 Company",
            company_code="V224B1-COMPANY",
            owner=self.user,
            status=CompanyStatus.ACTIVE,
            is_active=True,
            currency_code="SAR",
        )
        self.plan = SubscriptionPlan.objects.create(
            name="V2 24B1 Plan",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="v2-24b1-plan",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=5,
            max_warehouses=5,
            max_pos=5,
            features=["accounting"],
            is_active=True,
            is_public=False,
        )

    def _subscription(self, status=CompanySubscription.Status.ACTIVE):
        now = timezone.now()
        return CompanySubscription.objects.create(
            company=self.company,
            plan=self.plan,
            status=status,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            paid_at=now if status == CompanySubscription.Status.ACTIVE else None,
            activated_at=now if status == CompanySubscription.Status.ACTIVE else None,
            created_by=self.user,
        )

    def _pending_payment(self):
        subscription = self._subscription(
            status=CompanySubscription.Status.PENDING_PAYMENT
        )
        return create_or_get_subscription_payment(
            subscription=subscription,
            idempotency_key="v224b1-payment",
            gateway="MANUAL",
            payment_method="BANK_TRANSFER",
            created_by=self.user,
        )[0]

    def _paid_gateway_payment(self):
        subscription = self._subscription(
            status=CompanySubscription.Status.PENDING_PAYMENT
        )
        payment, _ = create_or_get_subscription_payment(
            subscription=subscription,
            idempotency_key="v224b1-refund-payment",
            gateway="MOYASAR",
            payment_method="CARD",
            created_by=self.user,
        )
        PlatformSubscriptionPayment.objects.filter(
            pk=payment.pk
        ).update(
            status=PlatformSubscriptionPayment.Status.PAID,
            gateway_payment_id="pay_v224b1",
            paid_at=timezone.now(),
        )
        payment.refresh_from_db()
        return payment

    def test_cancel_subscription_event_is_idempotent_and_tracks_actor(self):
        subscription = self._subscription()
        with patch("notifications.services.deliver_notification_event"):
            with self.captureOnCommitCallbacks(execute=True):
                cancel_subscription(
                    subscription=subscription,
                    actor=self.user,
                    reason="Customer request",
                )
                cancel_subscription(
                    subscription=subscription,
                    actor=self.user,
                    reason="Customer request",
                )

        qs = NotificationEvent.objects.filter(
            company=self.company,
            event_type="subscription.cancelled",
            event_key=f"subscription:{subscription.id}:cancelled",
        )
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.get().created_by_id, self.user.id)

    def test_suspend_subscription_event_is_idempotent_and_tracks_actor(self):
        subscription = self._subscription()
        with patch("notifications.services.deliver_notification_event"):
            with self.captureOnCommitCallbacks(execute=True):
                suspend_subscription(
                    subscription=subscription,
                    actor=self.user,
                    reason="Compliance review",
                )

        qs = NotificationEvent.objects.filter(
            company=self.company,
            event_type="subscription.suspended",
            event_key=f"subscription:{subscription.id}:suspended",
        )
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.get().created_by_id, self.user.id)

    def test_payment_cancelled_event_is_idempotent(self):
        payment = self._pending_payment()
        with patch("notifications.services.deliver_notification_event"):
            with self.captureOnCommitCallbacks(execute=True):
                cancel_subscription_payment_attempt(
                    payment=payment,
                    actor=self.user,
                    reason="Customer cancelled",
                )
                cancel_subscription_payment_attempt(
                    payment=payment,
                    actor=self.user,
                    reason="Customer cancelled",
                )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type="payment.cancelled",
                event_key=f"platform-payment:{payment.id}:cancelled",
            ).count(),
            1,
        )

    def test_refund_succeeded_event_is_emitted(self):
        payment = self._paid_gateway_payment()
        refund, _ = create_or_get_platform_refund(
            payment=payment,
            amount=Decimal("25.00"),
            idempotency_key="v224b1-refund-success",
            created_by=self.user,
        )
        with patch("notifications.services.deliver_notification_event"):
            with self.captureOnCommitCallbacks(execute=True):
                execute_platform_refund(
                    refund=refund,
                    actor=self.user,
                    adapter=_RefundSucceededAdapter(),
                )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type="refund.succeeded",
                event_key=f"platform-refund:{refund.id}:succeeded",
            ).count(),
            1,
        )

    def test_refund_failed_event_is_emitted(self):
        payment = self._paid_gateway_payment()
        refund, _ = create_or_get_platform_refund(
            payment=payment,
            amount=Decimal("25.00"),
            idempotency_key="v224b1-refund-failed",
            created_by=self.user,
        )
        with patch("notifications.services.deliver_notification_event"):
            with self.captureOnCommitCallbacks(execute=True):
                execute_platform_refund(
                    refund=refund,
                    actor=self.user,
                    adapter=_RefundFailedAdapter(),
                )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type="refund.failed",
                event_key=f"platform-refund:{refund.id}:failed",
            ).count(),
            1,
        )

    def test_reactivate_api_wiring_contract_is_present(self):
        source = (
            Path("api/system/subscriptions/reactivate.py")
            .read_text(encoding="utf-8")
        )
        self.assertIn('event_type="subscription.reactivated"', source)
        self.assertIn("reactivation_marker", source)
        self.assertIn("created_by_id=getattr(request.user", source)

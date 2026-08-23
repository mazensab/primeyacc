from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from subscriptions.commercial import (
    calculate_commercial_pricing,
    calculate_subscription_proration,
    resolve_promotion,
)
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
    SubscriptionPromotion,
    SubscriptionPromotionRedemption,
)
from subscriptions.services import (
    create_commercial_pending_subscription,
)
from subscriptions.tests import SubscriptionServiceTests


User = get_user_model()


class Phase28CommercialRulesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="phase28-commercial",
            email="phase28-commercial@mhamcloud.test",
            password="StrongPass123!",
        )

        self.company = (
            SubscriptionServiceTests.create_company(
                self,
                name="Phase 28 Commercial Company",
            )
        )

        self.basic = SubscriptionPlan.objects.create(
            name="Phase 28 Basic",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="phase28-basic",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=1,
            is_active=True,
            is_public=True,
        )

        self.pro = SubscriptionPlan.objects.create(
            name="Phase 28 Pro",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="phase28-pro",
            monthly_price=Decimal("300.00"),
            yearly_price=Decimal("3000.00"),
            max_users=50,
            max_branches=5,
            is_active=True,
            is_public=True,
        )

    def create_active(
        self,
        *,
        plan=None,
        days_total=30,
        days_remaining=15,
    ):
        today = timezone.localdate()

        start = (
            today
            - timedelta(
                days=days_total - days_remaining
            )
        )

        end = (
            start
            + timedelta(days=days_total - 1)
        )

        selected = plan or self.basic

        price = selected.monthly_price

        return CompanySubscription.objects.create(
            company=self.company,
            plan=selected,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=start,
            end_date=end,
            price=price,
            discount_amount=Decimal("0.00"),
            tax_amount=(
                price * Decimal("0.15")
            ).quantize(Decimal("0.01")),
            total_amount=(
                price * Decimal("1.15")
            ).quantize(Decimal("0.01")),
            created_by=self.user,
        )

    def test_percentage_promotion(self):
        promo = SubscriptionPromotion.objects.create(
            name="Ten percent",
            code="SAVE10",
            discount_type=(
                SubscriptionPromotion
                .DiscountType
                .PERCENTAGE
            ),
            discount_value=Decimal("10.00"),
            max_redemptions=10,
            max_redemptions_per_company=1,
            is_active=True,
            created_by=self.user,
        )

        promo.plans.add(self.basic)

        result = resolve_promotion(
            code="save10",
            amount=Decimal("100.00"),
            plan=self.basic,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            company=self.company,
        )

        self.assertEqual(
            result.discount_amount,
            Decimal("10.00"),
        )

        self.assertEqual(
            result.amount_after_discount,
            Decimal("90.00"),
        )

    def test_fixed_promotion_cannot_exceed_amount(self):
        SubscriptionPromotion.objects.create(
            name="Large fixed",
            code="FREEISH",
            discount_type=(
                SubscriptionPromotion
                .DiscountType
                .FIXED
            ),
            discount_value=Decimal("500.00"),
            max_redemptions_per_company=1,
            is_active=True,
        )

        result = resolve_promotion(
            code="FREEISH",
            amount=Decimal("100.00"),
            plan=self.basic,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            company=self.company,
        )

        self.assertEqual(
            result.discount_amount,
            Decimal("100.00"),
        )

        self.assertEqual(
            result.amount_after_discount,
            Decimal("0.00"),
        )

    def test_invalid_promotion_is_rejected(self):
        with self.assertRaises(ValidationError):
            resolve_promotion(
                code="DOES-NOT-EXIST",
                amount=Decimal("100.00"),
                plan=self.basic,
                billing_cycle=(
                    CompanySubscription
                    .BillingCycle
                    .MONTHLY
                ),
                company=self.company,
            )

    def test_upgrade_proration_charges_positive_difference(self):
        current = self.create_active(
            plan=self.basic,
            days_total=30,
            days_remaining=15,
        )

        result = calculate_subscription_proration(
            current_subscription=current,
            new_plan=self.pro,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            effective_date=timezone.localdate(),
        )

        self.assertGreater(
            result.charge_amount,
            Decimal("0.00"),
        )

        self.assertEqual(
            result.credit_amount,
            Decimal("0.00"),
        )

    def test_downgrade_proration_creates_credit_not_negative_charge(self):
        current = self.create_active(
            plan=self.pro,
            days_total=30,
            days_remaining=15,
        )

        result = calculate_subscription_proration(
            current_subscription=current,
            new_plan=self.basic,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            effective_date=timezone.localdate(),
        )

        self.assertEqual(
            result.charge_amount,
            Decimal("0.00"),
        )

        self.assertGreater(
            result.credit_amount,
            Decimal("0.00"),
        )

    def test_commercial_pricing_applies_discount_before_vat(self):
        SubscriptionPromotion.objects.create(
            name="Twenty percent",
            code="SAVE20",
            discount_type=(
                SubscriptionPromotion
                .DiscountType
                .PERCENTAGE
            ),
            discount_value=Decimal("20.00"),
            is_active=True,
        )

        result = calculate_commercial_pricing(
            plan=self.basic,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            company=self.company,
            promotion_code="SAVE20",
            manual_discount_amount=Decimal("5.00"),
        )

        self.assertEqual(
            result.subtotal,
            Decimal("100.00"),
        )
        self.assertEqual(
            result.promotion_discount,
            Decimal("20.00"),
        )
        self.assertEqual(
            result.manual_discount,
            Decimal("5.00"),
        )
        self.assertEqual(
            result.taxable_amount,
            Decimal("75.00"),
        )
        self.assertEqual(
            result.tax_amount,
            Decimal("11.25"),
        )
        self.assertEqual(
            result.total_amount,
            Decimal("86.25"),
        )

    def test_commercial_pending_persists_snapshot_and_redemption(self):
        promo = SubscriptionPromotion.objects.create(
            name="Commercial ten",
            code="COMM10",
            discount_type=(
                SubscriptionPromotion
                .DiscountType
                .PERCENTAGE
            ),
            discount_value=Decimal("10.00"),
            max_redemptions=5,
            max_redemptions_per_company=1,
            is_active=True,
        )

        subscription = (
            create_commercial_pending_subscription(
                company=self.company,
                plan=self.basic,
                billing_cycle=(
                    CompanySubscription
                    .BillingCycle
                    .MONTHLY
                ),
                promotion_code="COMM10",
                auto_renew=False,
                created_by=self.user,
            )
        )

        subscription.refresh_from_db()
        promo.refresh_from_db()

        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            subscription.promotion_code,
            "COMM10",
        )
        self.assertEqual(
            subscription.promotion_discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            subscription.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            subscription.tax_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            subscription.total_amount,
            Decimal("103.50"),
        )
        self.assertTrue(
            isinstance(
                subscription.commercial_snapshot,
                dict,
            )
        )

        self.assertEqual(
            promo.redemption_count,
            1,
        )

        self.assertTrue(
            SubscriptionPromotionRedemption.objects
            .filter(
                promotion=promo,
                company=self.company,
                subscription=subscription,
            )
            .exists()
        )

    def test_company_redemption_limit_is_enforced(self):
        promo = SubscriptionPromotion.objects.create(
            name="Single company use",
            code="ONCE",
            discount_type=(
                SubscriptionPromotion
                .DiscountType
                .FIXED
            ),
            discount_value=Decimal("10.00"),
            max_redemptions=10,
            max_redemptions_per_company=1,
            is_active=True,
        )

        first = create_commercial_pending_subscription(
            company=self.company,
            plan=self.basic,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            promotion_code="ONCE",
            created_by=self.user,
        )

        self.assertEqual(
            first.promotion_code,
            "ONCE",
        )

        # The first redemption is immutable commercial history.
        # Do not delete it: the second redemption attempt by the
        # same company must be rejected while the first remains.
        with self.assertRaises(ValidationError):
            create_commercial_pending_subscription(
                company=self.company,
                plan=self.basic,
                billing_cycle=(
                    CompanySubscription
                    .BillingCycle
                    .MONTHLY
                ),
                promotion_code="ONCE",
                created_by=self.user,
            )


# ===== Phase 28B Refund Behavior Tests =====

from billing.models import PlatformSubscriptionPayment, PlatformSubscriptionRefund
from billing.payment_services import confirm_subscription_payment, create_or_get_subscription_payment
from billing.refund_services import create_or_get_platform_refund, get_refundable_amount


class Phase28RefundBehaviorTests(Phase28CommercialRulesTests):
    def _paid_payment(self):
        subscription = create_commercial_pending_subscription(
            company=self.company,
            plan=self.basic,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            created_by=self.user,
        )
        payment, _ = create_or_get_subscription_payment(
            subscription=subscription,
            idempotency_key='phase28-refund-payment',
            gateway='MOYASAR',
            payment_method='CARD',
            gateway_payment_id='pay_phase28_refund',
            created_by=self.user,
        )
        payment, _, _ = confirm_subscription_payment(
            payment=payment,
            actor=self.user,
            gateway_payment_id='pay_phase28_refund',
            provider_verified=True,
        )
        return payment

    def test_refund_creation_is_idempotent(self):
        payment = self._paid_payment()
        first, created1 = create_or_get_platform_refund(
            payment=payment,
            amount=Decimal('20.00'),
            idempotency_key='phase28-refund-idem',
            created_by=self.user,
        )
        second, created2 = create_or_get_platform_refund(
            payment=payment,
            amount=Decimal('20.00'),
            idempotency_key='phase28-refund-idem',
            created_by=self.user,
        )
        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(first.id, second.id)

    def test_reserved_refund_blocks_over_refund(self):
        payment = self._paid_payment()
        create_or_get_platform_refund(
            payment=payment,
            amount=Decimal('100.00'),
            idempotency_key='phase28-refund-reserve',
            created_by=self.user,
        )
        self.assertEqual(
            get_refundable_amount(payment),
            Decimal('15.00'),
        )
        with self.assertRaises(ValidationError):
            create_or_get_platform_refund(
                payment=payment,
                amount=Decimal('16.00'),
                idempotency_key='phase28-refund-over',
                created_by=self.user,
            )


# Phase28 successful refund behavior
from billing.refund_services import execute_platform_refund, get_successful_refunded_amount
from billing.models import PlatformSubscriptionRefundEvent
from integrations.payments.types import PaymentGatewayName, PaymentResult, PaymentStatus

class Phase28RefundAdapter:
    def __init__(self):
        self.calls = []
    def refund_payment(self, request):
        self.calls.append(request)
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=request.provider_payment_id,
            status=PaymentStatus.PARTIALLY_REFUNDED,
            amount=request.amount or 0,
            currency='SAR',
            raw={'id': 'refund_phase28_ok', 'secret': 'hidden'},
        )

def _phase28_successful_refund(self):
    payment = self._paid_payment()
    refund, _ = create_or_get_platform_refund(
        payment=payment,
        amount=Decimal('25.00'),
        idempotency_key='phase28-refund-success',
        created_by=self.user,
    )
    adapter = Phase28RefundAdapter()
    refund = execute_platform_refund(
        refund=refund, actor=self.user, adapter=adapter
    )
    refund.refresh_from_db()
    payment.refresh_from_db()
    self.assertEqual(refund.status, PlatformSubscriptionRefund.Status.SUCCEEDED)
    self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PAID)
    self.assertEqual(get_successful_refunded_amount(payment), Decimal('25.00'))
    self.assertEqual(get_refundable_amount(payment), Decimal('90.00'))
    self.assertEqual(adapter.calls[0].amount, 2500)
    self.assertEqual(refund.provider_response_snapshot['secret'], '[REDACTED]')
    events = list(
        PlatformSubscriptionRefundEvent.objects.filter(refund=refund)
        .values_list('event_type', flat=True)
    )
    self.assertEqual(events, ['CREATED', 'PROCESSING', 'SUCCEEDED'])

Phase28RefundBehaviorTests.test_successful_partial_refund_keeps_payment_paid = _phase28_successful_refund


# Phase28 auto renew idempotency behavior
from subscriptions.auto_renew import prepare_auto_renewals

def _phase28_auto_renew_idempotent(self):
    payment = self._paid_payment()
    subscription = payment.subscription
    today = timezone.localdate()
    CompanySubscription.objects.filter(pk=subscription.pk).update(
        end_date=today + timedelta(days=3),
        auto_renew=True,
    )
    subscription.refresh_from_db()
    first = prepare_auto_renewals(
        today=today,
        days_ahead=7,
        company_id=self.company.id,
    )
    renewal = CompanySubscription.objects.get(
        previous_subscription=subscription,
        action=CompanySubscription.SubscriptionAction.RENEWAL,
        status=CompanySubscription.Status.PENDING_PAYMENT,
    )
    prepared = PlatformSubscriptionPayment.objects.get(subscription=renewal)
    self.assertEqual(first.evaluated, 1)
    self.assertEqual(prepared.gateway, 'MOYASAR')
    self.assertEqual(prepared.status, PlatformSubscriptionPayment.Status.PENDING)
    self.assertFalse(prepared.metadata.get('automatic_charge'))
    self.assertEqual(prepared.metadata.get('source'), 'phase28-auto-renew')
    payment.refresh_from_db()
    self.assertEqual(payment.status, PlatformSubscriptionPayment.Status.PAID)
    second = prepare_auto_renewals(
        today=today,
        days_ahead=7,
        company_id=self.company.id,
    )
    self.assertEqual(second.evaluated, 1)
    self.assertEqual(second.existing, 1)
    self.assertEqual(
        CompanySubscription.objects.filter(
            previous_subscription=subscription,
            action=CompanySubscription.SubscriptionAction.RENEWAL,
        ).count(),
        1,
    )
    self.assertEqual(
        PlatformSubscriptionPayment.objects.filter(subscription=renewal).count(),
        1,
    )

Phase28RefundBehaviorTests.test_auto_renew_is_idempotent_and_never_auto_charges = _phase28_auto_renew_idempotent


# Phase28 auto renew no gateway behavior

def _phase28_auto_renew_without_gateway(self):
    subscription = self.create_active(
        plan=self.basic,
        days_total=30,
        days_remaining=2,
    )
    subscription.auto_renew = True
    subscription.save(update_fields=['auto_renew', 'updated_at'])
    result = prepare_auto_renewals(
        today=timezone.localdate(),
        days_ahead=7,
        company_id=self.company.id,
    )
    renewal = CompanySubscription.objects.get(
        previous_subscription=subscription,
        action=CompanySubscription.SubscriptionAction.RENEWAL,
    )
    self.assertEqual(result.evaluated, 1)
    self.assertEqual(result.skipped, 1)
    self.assertEqual(
        PlatformSubscriptionPayment.objects.filter(subscription=renewal).count(),
        0,
    )
    self.assertEqual(renewal.status, CompanySubscription.Status.PENDING_PAYMENT)

Phase28RefundBehaviorTests.test_auto_renew_without_gateway_prepares_no_payment = _phase28_auto_renew_without_gateway

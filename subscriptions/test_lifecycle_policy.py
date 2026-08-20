from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from subscriptions.access_policy import (
    SubscriptionAccessReason,
    SubscriptionWorkspaceAccess,
    evaluate_subscription_access,
)
from subscriptions.models import CompanySubscription
from subscriptions.services import (
    build_subscription_summary,
    create_renewal_pending_subscription,
    expire_due_subscriptions,
    get_active_grace_subscription,
    get_current_subscription,
)
from subscriptions.tests import SubscriptionServiceTests


User = get_user_model()


class SubscriptionLifecyclePolicyTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="subscription-lifecycle-admin",
            email="subscription-lifecycle@primey.test",
            password="StrongPass123!",
        )

        self.company = SubscriptionServiceTests.create_company(
            self,
            name="Subscription Lifecycle Company",
        )

        self.basic_plan = SubscriptionServiceTests.setUp.__globals__[
            "SubscriptionPlan"
        ].objects.create(
            name="Lifecycle Basic",
            code="BASIC",
            slug="lifecycle-basic",
            description="Phase 18B.3B lifecycle test plan.",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=2,
            max_warehouses=1,
            max_pos=1,
            features=["accounting"],
            is_active=True,
            is_public=True,
            sort_order=90,
        )

    def create_subscription(
        self,
        *,
        status,
        start_date,
        end_date,
        action=CompanySubscription.SubscriptionAction.NEW,
    ):
        return CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic_plan,
            status=status,
            action=action,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=start_date,
            end_date=end_date,
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            created_by=self.user,
        )

    def test_active_subscription_is_current_inside_date_range(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5),
        )

        current = get_current_subscription(self.company)

        self.assertIsNotNone(current)
        self.assertEqual(current.id, subscription.id)

        policy = evaluate_subscription_access(self.company)

        self.assertEqual(policy.access, SubscriptionWorkspaceAccess.FULL)
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.SUBSCRIPTION_ACTIVE,
        )
        self.assertTrue(policy.can_use_workspace)

    def test_trial_subscription_is_current_inside_date_range(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.TRIAL,
            start_date=today,
            end_date=today + timedelta(days=14),
        )

        current = get_current_subscription(self.company)

        self.assertIsNotNone(current)
        self.assertEqual(current.id, subscription.id)

        policy = evaluate_subscription_access(self.company)

        self.assertEqual(policy.access, SubscriptionWorkspaceAccess.FULL)
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.TRIAL_ACTIVE,
        )

    def test_future_active_subscription_is_not_current(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=32),
        )

        self.assertIsNone(get_current_subscription(self.company))

        policy = evaluate_subscription_access(self.company)

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.BILLING_ONLY,
        )
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.PAYMENT_REQUIRED,
        )
        self.assertFalse(policy.can_use_workspace)
        self.assertFalse(policy.can_renew)
        self.assertEqual(policy.subscription_id, subscription.id)

    def test_active_subscription_is_in_grace_on_day_one(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=31),
            end_date=today - timedelta(days=1),
        )

        changed = subscription.mark_expired_if_needed()

        subscription.refresh_from_db()

        self.assertFalse(changed)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.ACTIVE,
        )

    def test_active_subscription_is_in_grace_on_day_seven(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=37),
            end_date=today - timedelta(days=7),
        )

        changed = subscription.mark_expired_if_needed()

        subscription.refresh_from_db()

        self.assertFalse(changed)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.ACTIVE,
        )

    def test_active_subscription_expires_after_grace_day_seven(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=38),
            end_date=today - timedelta(days=8),
        )

        changed = subscription.mark_expired_if_needed()

        subscription.refresh_from_db()

        self.assertTrue(changed)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.EXPIRED,
        )

    def test_expired_trial_does_not_receive_grace(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.TRIAL,
            start_date=today - timedelta(days=15),
            end_date=today - timedelta(days=1),
        )

        changed = subscription.mark_expired_if_needed()

        subscription.refresh_from_db()

        self.assertTrue(changed)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.EXPIRED,
        )

    def test_suspended_subscription_does_not_receive_grace(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.SUSPENDED,
            start_date=today - timedelta(days=40),
            end_date=today - timedelta(days=8),
        )

        changed = subscription.mark_expired_if_needed()

        subscription.refresh_from_db()

        self.assertFalse(changed)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.SUSPENDED,
        )

    def test_cancelled_subscription_does_not_receive_grace(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.CANCELLED,
            start_date=today - timedelta(days=40),
            end_date=today - timedelta(days=8),
        )

        changed = subscription.mark_expired_if_needed()

        subscription.refresh_from_db()

        self.assertFalse(changed)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.CANCELLED,
        )

    def test_no_subscription_is_billing_only(self):
        policy = evaluate_subscription_access(self.company)

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.BILLING_ONLY,
        )
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.NO_SUBSCRIPTION,
        )
        self.assertFalse(policy.can_use_workspace)
        self.assertTrue(policy.can_manage_subscription)
        self.assertTrue(policy.can_pay)

    def test_unexpired_renewal_starts_day_after_current_end(self):
        today = timezone.localdate()

        current = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=10),
        )

        renewal = create_renewal_pending_subscription(
            current_subscription=current,
            billing_reference="BILL-NO-OVERLAP",
            created_by=self.user,
        )

        self.assertEqual(
            renewal.start_date,
            current.end_date + timedelta(days=1),
        )
        self.assertGreater(renewal.start_date, current.end_date)
        self.assertEqual(
            renewal.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            renewal.previous_subscription_id,
            current.id,
        )

    def test_renewal_on_end_date_starts_next_day(self):
        today = timezone.localdate()

        current = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=30),
            end_date=today,
        )

        renewal = create_renewal_pending_subscription(
            current_subscription=current,
            billing_reference="BILL-END-DATE",
            created_by=self.user,
        )

        self.assertEqual(
            renewal.start_date,
            today + timedelta(days=1),
        )

    def test_expired_renewal_starts_today(self):
        today = timezone.localdate()

        expired = self.create_subscription(
            status=CompanySubscription.Status.EXPIRED,
            start_date=today - timedelta(days=60),
            end_date=today - timedelta(days=5),
        )

        renewal = create_renewal_pending_subscription(
            current_subscription=expired,
            billing_reference="BILL-EXPIRED",
            created_by=self.user,
        )

        self.assertEqual(renewal.start_date, today)
        self.assertGreater(renewal.start_date, expired.end_date)

    def test_pending_renewal_does_not_block_current_workspace(self):
        today = timezone.localdate()

        current = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=10),
        )

        renewal = create_renewal_pending_subscription(
            current_subscription=current,
            billing_reference="BILL-PENDING-RENEWAL",
            created_by=self.user,
        )

        self.assertEqual(
            renewal.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

        policy = evaluate_subscription_access(self.company)

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.FULL,
        )
        self.assertEqual(
            policy.subscription_id,
            current.id,
        )
        self.assertTrue(policy.can_use_workspace)

    def test_grace_day_one_policy_is_full(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=31),
            end_date=today - timedelta(days=1),
        )

        self.assertIsNone(
            get_current_subscription(self.company)
        )

        grace = get_active_grace_subscription(
            self.company
        )

        self.assertIsNotNone(grace)
        self.assertEqual(grace.id, subscription.id)
        self.assertTrue(
            subscription.is_in_active_grace
        )

        policy = evaluate_subscription_access(
            self.company
        )

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.FULL,
        )
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.SUBSCRIPTION_GRACE,
        )
        self.assertEqual(
            policy.subscription_id,
            subscription.id,
        )
        self.assertTrue(policy.can_use_workspace)
        self.assertTrue(policy.can_renew)
        self.assertTrue(policy.is_in_grace)
        self.assertIsNotNone(
            policy.grace_expires_at
        )
        self.assertGreaterEqual(
            policy.grace_days_remaining,
            0,
        )

    def test_grace_day_seven_policy_is_full(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=37),
            end_date=today - timedelta(days=7),
        )

        policy = evaluate_subscription_access(
            self.company
        )

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.FULL,
        )
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.SUBSCRIPTION_GRACE,
        )
        self.assertEqual(
            policy.subscription_id,
            subscription.id,
        )
        self.assertTrue(policy.is_in_grace)
        self.assertEqual(
            policy.grace_days_remaining,
            0,
        )
        self.assertEqual(
            policy.grace_expires_at,
            today,
        )

    def test_grace_day_eight_policy_is_billing_only(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=38),
            end_date=today - timedelta(days=8),
        )

        self.assertIsNone(
            get_active_grace_subscription(
                self.company
            )
        )

        policy = evaluate_subscription_access(
            self.company
        )

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.BILLING_ONLY,
        )
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.SUBSCRIPTION_EXPIRED,
        )
        self.assertEqual(
            policy.subscription_id,
            subscription.id,
        )
        self.assertFalse(policy.can_use_workspace)
        self.assertFalse(policy.is_in_grace)
        self.assertEqual(
            policy.grace_days_remaining,
            0,
        )
        self.assertIsNone(
            policy.grace_expires_at
        )

    def test_pending_renewal_during_grace_keeps_workspace(self):
        today = timezone.localdate()

        current = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=31),
            end_date=today - timedelta(days=1),
        )

        renewal = create_renewal_pending_subscription(
            current_subscription=current,
            billing_reference="BILL-GRACE-RENEWAL",
            created_by=self.user,
        )

        self.assertEqual(
            renewal.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            renewal.start_date,
            today,
        )

        policy = evaluate_subscription_access(
            self.company
        )

        self.assertEqual(
            policy.access,
            SubscriptionWorkspaceAccess.FULL,
        )
        self.assertEqual(
            policy.reason,
            SubscriptionAccessReason.SUBSCRIPTION_GRACE,
        )
        self.assertEqual(
            policy.subscription_id,
            current.id,
        )
        self.assertNotEqual(
            policy.subscription_id,
            renewal.id,
        )
        self.assertTrue(
            policy.can_use_workspace
        )

    def test_subscription_summary_exposes_grace(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=31),
            end_date=today - timedelta(days=1),
        )

        summary = build_subscription_summary(
            self.company
        )

        self.assertTrue(
            summary["has_subscription"]
        )
        self.assertIsNone(
            summary["current"]
        )
        self.assertIsNotNone(
            summary["grace"]
        )
        self.assertIsNotNone(
            summary["effective"]
        )
        self.assertEqual(
            summary["grace"]["id"],
            subscription.id,
        )
        self.assertEqual(
            summary["effective"]["id"],
            subscription.id,
        )
        self.assertTrue(
            summary["grace"]["is_in_grace"]
        )
        self.assertIsNotNone(
            summary["grace"]["grace_expires_at"]
        )

    def test_expiry_service_expires_active_after_grace(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            start_date=today - timedelta(days=38),
            end_date=today - timedelta(days=8),
        )

        changed = expire_due_subscriptions()

        self.assertEqual(changed, 1)

        subscription.refresh_from_db()

        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.EXPIRED,
        )

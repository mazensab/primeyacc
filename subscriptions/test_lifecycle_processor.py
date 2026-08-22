from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from subscriptions.lifecycle import (
    preview_subscription_lifecycle,
    process_subscription_lifecycle,
)
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.tests import SubscriptionServiceTests


User = get_user_model()


class SubscriptionLifecycleProcessorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="phase24-lifecycle",
            email="phase24-lifecycle@mhamcloud.test",
            password="StrongPass123!",
        )

        self.company = SubscriptionServiceTests.create_company(
            self,
            name="Phase 24 Lifecycle Company",
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Phase 24 Basic",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="phase24-basic",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=2,
            max_warehouses=1,
            max_pos=1,
            features=["accounting"],
            is_active=True,
            is_public=True,
        )

    def create_subscription(
        self,
        *,
        status,
        end_date,
    ):
        return CompanySubscription.objects.create(
            company=self.company,
            plan=self.plan,
            status=status,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=end_date - timedelta(days=30),
            end_date=end_date,
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            created_by=self.user,
        )

    def test_trial_expires_day_after_end_date(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.TRIAL,
            end_date=today - timedelta(days=1),
        )

        result = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 1)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.EXPIRED,
        )
        self.assertEqual(
            result.actions[0].reason,
            "TRIAL_ENDED",
        )

    def test_active_stays_active_on_grace_day_seven(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            end_date=today - timedelta(days=7),
        )

        result = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.ACTIVE,
        )

    def test_active_expires_after_grace(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            end_date=today - timedelta(days=8),
        )

        result = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 1)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.EXPIRED,
        )
        self.assertEqual(
            result.actions[0].reason,
            "ACTIVE_GRACE_ENDED",
        )

    def test_dry_run_does_not_modify_database(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.TRIAL,
            end_date=today - timedelta(days=1),
        )

        result = process_subscription_lifecycle(
            today=today,
            dry_run=True,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.would_change, 1)
        self.assertEqual(result.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.TRIAL,
        )

    def test_processing_is_idempotent(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            end_date=today - timedelta(days=8),
        )

        first = process_subscription_lifecycle(
            today=today,
        )
        second = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(first.changed, 1)
        self.assertEqual(second.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.EXPIRED,
        )

    def test_pending_payment_is_not_modified(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.PENDING_PAYMENT,
            end_date=today - timedelta(days=30),
        )

        result = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )

    def test_suspended_is_not_modified(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.SUSPENDED,
            end_date=today - timedelta(days=30),
        )

        result = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.SUSPENDED,
        )

    def test_cancelled_is_not_modified(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.CANCELLED,
            end_date=today - timedelta(days=30),
        )

        result = process_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.CANCELLED,
        )

    def test_company_filter_limits_processing(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.TRIAL,
            end_date=today - timedelta(days=1),
        )

        result = process_subscription_lifecycle(
            today=today,
            company_id=self.company.id + 999,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.changed, 0)
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.TRIAL,
        )

    def test_preview_matches_expected_transition(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.ACTIVE,
            end_date=today - timedelta(days=8),
        )

        result = preview_subscription_lifecycle(
            today=today,
        )

        subscription.refresh_from_db()

        self.assertEqual(result.would_change, 1)
        self.assertEqual(result.changed, 0)
        self.assertEqual(
            result.actions[0].subscription_id,
            subscription.id,
        )
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.ACTIVE,
        )

    def test_management_command_dry_run(self):
        today = timezone.localdate()

        subscription = self.create_subscription(
            status=CompanySubscription.Status.TRIAL,
            end_date=today - timedelta(days=1),
        )

        stdout = StringIO()

        call_command(
            "process_subscription_lifecycle",
            "--dry-run",
            "--date",
            today.isoformat(),
            stdout=stdout,
        )

        subscription.refresh_from_db()

        output = stdout.getvalue()

        self.assertIn("MODE=DRY_RUN", output)
        self.assertIn("WOULD_CHANGE=1", output)
        self.assertIn(
            "SUBSCRIPTION_LIFECYCLE_DRY_RUN=PASS",
            output,
        )
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.TRIAL,
        )

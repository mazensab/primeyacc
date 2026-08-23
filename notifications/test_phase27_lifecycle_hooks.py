from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import transaction
from django.test import (
    TestCase,
    TransactionTestCase,
)
from django.utils import timezone

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
)
from billing.models import (
    PlatformSubscriptionPayment,
)
from billing.payment_services import (
    confirm_subscription_payment,
    create_or_get_subscription_payment,
    fail_subscription_payment,
)
from companies.models import (
    Branch,
    BranchType,
    Company,
    CompanyOnboarding,
    CompanyOnboardingStatus,
    CompanySettings,
    CompanyStatus,
)
from companies.onboarding import (
    complete_company_onboarding,
)
from notifications.models import (
    NotificationEvent,
)
from notifications.lifecycle import (
    resolve_company_notification_recipient,
)
from subscriptions.lifecycle import (
    process_subscription_lifecycle,
)
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.services import (
    activate_pending_subscription,
    create_pending_subscription,
)


User = get_user_model()


class Phase27DLifecycleFixtureMixin:
    def build_fixture(
        self,
        *,
        suffix: str,
    ):
        self.user = User.objects.create_user(
            username=f"phase27d-{suffix}",
            email=(
                f"phase27d-{suffix}"
                "@mhamcloud.test"
            ),
            password="SafePhase27DPassword!",
        )

        self.company = Company.objects.create(
            name=f"Phase 27D {suffix}",
            company_code=(
                f"PH27D-{suffix.upper()}"
            ),
            owner=self.user,
            status=CompanyStatus.ACTIVE,
            is_active=True,
            currency_code="SAR",
        )

        self.membership = (
            CompanyMembership.objects.create(
                user=self.user,
                company=self.company,
                role=CompanyRole.OWNER,
                status=MembershipStatus.ACTIVE,
                is_primary=True,
            )
        )

        self.plan = (
            SubscriptionPlan.objects.create(
                name=f"Phase 27D Plan {suffix}",
                code=(
                    SubscriptionPlan
                    .PlanCode
                    .BASIC
                ),
                slug=f"phase27d-{suffix}",
                monthly_price=Decimal(
                    "100.00"
                ),
                yearly_price=Decimal(
                    "1000.00"
                ),
                max_users=10,
                max_branches=5,
                max_warehouses=5,
                max_pos=5,
                features=["accounting"],
                is_active=True,
                is_public=False,
            )
        )


class Phase27DRecipientTests(
    Phase27DLifecycleFixtureMixin,
    TestCase,
):
    def setUp(self):
        self.build_fixture(
            suffix="recipient"
        )

    def test_company_owner_is_primary_recipient(self):
        recipient = (
            resolve_company_notification_recipient(
                self.company
            )
        )

        self.assertEqual(
            recipient.id,
            self.user.id,
        )

    def test_owner_membership_is_fallback(self):
        self.company.owner = None
        self.company.save(
            update_fields=[
                "owner",
                "updated_at",
            ]
        )

        recipient = (
            resolve_company_notification_recipient(
                self.company
            )
        )

        self.assertEqual(
            recipient.id,
            self.user.id,
        )


class Phase27DPostCommitHookTests(
    Phase27DLifecycleFixtureMixin,
    TransactionTestCase,
):
    reset_sequences = True

    def setUp(self):
        self.build_fixture(
            suffix="hooks"
        )

    def _pending(
        self,
        *,
        action=(
            CompanySubscription
            .SubscriptionAction
            .NEW
        ),
        previous=None,
    ):
        return create_pending_subscription(
            company=self.company,
            plan=self.plan,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
            action=action,
            previous_subscription=previous,
            created_by=self.user,
        )

    def test_activation_emits_after_commit(self):
        subscription = self._pending()

        with patch(
            "notifications.services."
            "deliver_notification_event"
        ) as mocked_delivery:
            activated = (
                activate_pending_subscription(
                    subscription=subscription,
                )
            )

        event = NotificationEvent.objects.get(
            company=self.company,
            event_type=(
                "subscription.activated"
            ),
        )

        self.assertEqual(
            activated.status,
            CompanySubscription.Status.ACTIVE,
        )

        self.assertEqual(
            event.event_key,
            (
                f"subscription:{activated.id}:"
                "subscription.activated"
            ),
        )

        self.assertTrue(
            mocked_delivery.called
        )

    def test_renewal_activation_uses_renewed_event(self):
        today = timezone.localdate()

        current = (
            CompanySubscription.objects.create(
                company=self.company,
                plan=self.plan,
                status=(
                    CompanySubscription
                    .Status
                    .ACTIVE
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
                    today
                    - timedelta(days=20)
                ),
                end_date=(
                    today
                    + timedelta(days=10)
                ),
                price=Decimal("100.00"),
                discount_amount=Decimal(
                    "0.00"
                ),
                tax_amount=Decimal("15.00"),
                total_amount=Decimal(
                    "115.00"
                ),
                created_by=self.user,
            )
        )

        renewal = self._pending(
            action=(
                CompanySubscription
                .SubscriptionAction
                .RENEWAL
            ),
            previous=current,
        )

        with patch(
            "notifications.services."
            "deliver_notification_event"
        ):
            activated = (
                activate_pending_subscription(
                    subscription=renewal,
                )
            )

        self.assertTrue(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type=(
                    "subscription.renewed"
                ),
                event_key=(
                    f"subscription:{activated.id}:"
                    "subscription.renewed"
                ),
            ).exists()
        )

    def test_lifecycle_expired_event_is_idempotent(self):
        today = timezone.localdate()

        subscription = (
            CompanySubscription.objects.create(
                company=self.company,
                plan=self.plan,
                status=(
                    CompanySubscription
                    .Status
                    .ACTIVE
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
                    today
                    - timedelta(days=40)
                ),
                end_date=(
                    today
                    - timedelta(days=8)
                ),
                price=Decimal("100.00"),
                discount_amount=Decimal(
                    "0.00"
                ),
                tax_amount=Decimal("15.00"),
                total_amount=Decimal(
                    "115.00"
                ),
                created_by=self.user,
            )
        )

        with patch(
            "notifications.services."
            "deliver_notification_event"
        ):
            first = (
                process_subscription_lifecycle(
                    today=today
                )
            )

            second = (
                process_subscription_lifecycle(
                    today=today
                )
            )

        self.assertEqual(
            first.changed,
            1,
        )

        self.assertEqual(
            second.changed,
            0,
        )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type=(
                    "subscription.expired"
                ),
                event_key=(
                    f"subscription:"
                    f"{subscription.id}:expired"
                ),
            ).count(),
            1,
        )

    def test_grace_started_event_is_idempotent(self):
        today = timezone.localdate()

        subscription = (
            CompanySubscription.objects.create(
                company=self.company,
                plan=self.plan,
                status=(
                    CompanySubscription
                    .Status
                    .ACTIVE
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
                    today
                    - timedelta(days=31)
                ),
                end_date=(
                    today
                    - timedelta(days=1)
                ),
                price=Decimal("100.00"),
                discount_amount=Decimal(
                    "0.00"
                ),
                tax_amount=Decimal("15.00"),
                total_amount=Decimal(
                    "115.00"
                ),
                created_by=self.user,
            )
        )

        with patch(
            "notifications.services."
            "deliver_notification_event"
        ):
            process_subscription_lifecycle(
                today=today
            )

            process_subscription_lifecycle(
                today=today
            )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type=(
                    "subscription.grace_started"
                ),
                event_key=(
                    f"subscription:"
                    f"{subscription.id}:"
                    f"grace-started:"
                    f"{subscription.end_date.isoformat()}"
                ),
            ).count(),
            1,
        )

    def test_expiring_soon_event_is_idempotent(self):
        today = timezone.localdate()

        subscription = (
            CompanySubscription.objects.create(
                company=self.company,
                plan=self.plan,
                status=(
                    CompanySubscription
                    .Status
                    .ACTIVE
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
                    today
                    - timedelta(days=25)
                ),
                end_date=(
                    today
                    + timedelta(days=5)
                ),
                price=Decimal("100.00"),
                discount_amount=Decimal(
                    "0.00"
                ),
                tax_amount=Decimal("15.00"),
                total_amount=Decimal(
                    "115.00"
                ),
                created_by=self.user,
            )
        )

        with patch(
            "notifications.services."
            "deliver_notification_event"
        ):
            process_subscription_lifecycle(
                today=today
            )

            process_subscription_lifecycle(
                today=today
            )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type=(
                    "subscription.expiring_soon"
                ),
                event_key=(
                    f"subscription:"
                    f"{subscription.id}:"
                    f"expiring-soon:"
                    f"{subscription.end_date.isoformat()}"
                ),
            ).count(),
            1,
        )


class Phase27DOnboardingHookTests(
    Phase27DLifecycleFixtureMixin,
    TransactionTestCase,
):
    reset_sequences = True

    def setUp(self):
        self.build_fixture(
            suffix="onboarding"
        )

        self.settings = (
            CompanySettings.objects.create(
                company=self.company,
                default_language="ar",
                timezone_name="Asia/Riyadh",
                fiscal_year_start_month=1,
                fiscal_year_start_day=1,
                enable_vat=False,
            )
        )

        self.branch = (
            Branch.objects.create(
                company=self.company,
                name="Main Branch",
                name_ar="الفرع الرئيسي",
                name_en="Main Branch",
                branch_type=(
                    BranchType.HEAD_OFFICE
                ),
                is_active=True,
            )
        )

        self.onboarding = (
            CompanyOnboarding.objects.create(
                company=self.company,
                status=(
                    CompanyOnboardingStatus
                    .IN_PROGRESS
                ),
                current_step="company_setup",
            )
        )

    def test_onboarding_ready_event_is_idempotent(self):
        with patch(
            "notifications.services."
            "deliver_notification_event"
        ):
            complete_company_onboarding(
                company=self.company,
                user=self.user,
                settings_obj=self.settings,
                default_branch=self.branch,
            )

            complete_company_onboarding(
                company=self.company,
                user=self.user,
                settings_obj=self.settings,
                default_branch=self.branch,
            )

        self.assertEqual(
            NotificationEvent.objects.filter(
                company=self.company,
                event_type="onboarding.ready",
                event_key=(
                    f"company:"
                    f"{self.company.id}:"
                    "onboarding-ready"
                ),
            ).count(),
            1,
        )

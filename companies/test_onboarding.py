from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
    WorkspaceType,
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
from companies.provisioning import (
    provision_company_tenant,
)
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.services import (
    activate_pending_subscription,
)


User = get_user_model()


class CompanyOnboardingLifecycleTests(
    TestCase
):
    def setUp(self):
        self.client = Client()

        self.owner = User.objects.create_user(
            username="phase26-owner",
            email="phase26-owner@example.com",
            password="Safe-Phase26-Password!",
        )

        self.plan = (
            SubscriptionPlan.objects.create(
                name="Phase 26 Plan",
                code=(
                    SubscriptionPlan
                    .PlanCode
                    .BASIC
                ),
                slug="phase26-plan",
                monthly_price=Decimal("100.00"),
                yearly_price=Decimal("1000.00"),
                max_users=10,
                max_branches=3,
                max_warehouses=1,
                max_pos=1,
                features=[
                    "accounting",
                    "sales",
                ],
                is_active=True,
                is_public=True,
            )
        )

    def _provision(self):
        return provision_company_tenant(
            name="Phase 26 Company",
            owner=self.owner,
            acting_user=self.owner,
            commercial_registration="1010260001",
            city="Riyadh",
            initial_plan=self.plan,
            billing_cycle=(
                CompanySubscription
                .BillingCycle
                .MONTHLY
            ),
        )

    def _activate(self, result):
        return activate_pending_subscription(
            subscription=result.subscription,
            billing_reference=(
                "PHASE26-PAID"
            ),
        )

    def test_pending_payment_precedes_onboarding_route(self):
        result = self._provision()

        onboarding = (
            CompanyOnboarding.objects.get(
                company=result.company
            )
        )

        self.assertEqual(
            onboarding.status,
            CompanyOnboardingStatus.REQUIRED,
        )

        self.client.force_login(
            self.owner
        )

        whoami = self.client.get(
            "/api/auth/whoami/"
        )

        self.assertEqual(
            whoami.status_code,
            200,
        )

        payload = whoami.json()

        self.assertEqual(
            payload["dashboard_path"],
            "/company/subscription",
        )

        self.assertFalse(
            payload[
                "can_use_company_workspace"
            ]
        )

        setup = self.client.get(
            "/api/company/setup/"
        )

        self.assertEqual(
            setup.status_code,
            403,
        )

        self.assertEqual(
            setup.json()["code"],
            "SUBSCRIPTION_ACCESS_REQUIRED",
        )

    def test_active_subscription_routes_to_setup(self):
        result = self._provision()

        self._activate(result)

        self.client.force_login(
            self.owner
        )

        response = self.client.get(
            "/api/auth/whoami/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["dashboard_path"],
            "/company/setup",
        )

        self.assertTrue(
            payload["onboarding"][
                "required"
            ]
        )

        self.assertFalse(
            payload[
                "can_use_company_workspace"
            ]
        )

    def test_operational_api_blocked_until_ready(self):
        result = self._provision()

        self._activate(result)

        self.client.force_login(
            self.owner
        )

        setup = self.client.get(
            "/api/company/setup/"
        )

        self.assertEqual(
            setup.status_code,
            200,
        )

        branches = self.client.get(
            "/api/company/branches/"
        )

        self.assertEqual(
            branches.status_code,
            403,
        )

    def test_setup_patch_moves_to_in_progress(self):
        result = self._provision()

        self._activate(result)

        self.client.force_login(
            self.owner
        )

        response = self.client.patch(
            "/api/company/setup/",
            data={
                "enable_vat": False,
                "default_branch": {
                    "name": "Main Branch",
                    "name_ar": "الفرع الرئيسي",
                    "name_en": "Main Branch",
                    "city": "Riyadh",
                },
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        onboarding = (
            CompanyOnboarding.objects.get(
                company=result.company
            )
        )

        self.assertEqual(
            onboarding.status,
            CompanyOnboardingStatus.IN_PROGRESS,
        )

        self.assertEqual(
            onboarding.current_step,
            "setup",
        )

        self.assertTrue(
            Branch.objects.filter(
                company=result.company,
                is_default=True,
                is_active=True,
            ).exists()
        )

    def test_complete_is_idempotent_and_unlocks_workspace(self):
        result = self._provision()

        self._activate(result)

        self.client.force_login(
            self.owner
        )

        patch_response = (
            self.client.patch(
                "/api/company/setup/",
                data={
                    "enable_vat": False,
                    "default_branch": {
                        "name": "Main Branch",
                        "city": "Riyadh",
                    },
                },
                content_type="application/json",
            )
        )

        self.assertEqual(
            patch_response.status_code,
            200,
        )

        first = self.client.post(
            "/api/company/setup/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            first.status_code,
            200,
        )

        onboarding = (
            CompanyOnboarding.objects.get(
                company=result.company
            )
        )

        completed_at = (
            onboarding.completed_at
        )

        self.assertEqual(
            onboarding.status,
            CompanyOnboardingStatus.READY,
        )

        self.assertIsNotNone(
            completed_at
        )

        second = self.client.post(
            "/api/company/setup/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            second.status_code,
            200,
        )

        onboarding.refresh_from_db()

        self.assertEqual(
            onboarding.completed_at,
            completed_at,
        )

        whoami = self.client.get(
            "/api/auth/whoami/"
        )

        self.assertEqual(
            whoami.json()[
                "dashboard_path"
            ],
            "/company",
        )

        self.assertTrue(
            whoami.json()[
                "can_use_company_workspace"
            ]
        )

        branches = self.client.get(
            "/api/company/branches/"
        )

        self.assertEqual(
            branches.status_code,
            200,
        )

    def test_completion_rejects_missing_required_setup(self):
        result = self._provision()

        self._activate(result)

        settings = (
            CompanySettings.objects.get(
                company=result.company
            )
        )

        settings.enable_vat = False
        settings.save(
            update_fields=[
                "enable_vat",
                "updated_at",
            ]
        )

        self.client.force_login(
            self.owner
        )

        response = self.client.post(
            "/api/company/setup/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertEqual(
            response.json()["code"],
            "ONBOARDING_INCOMPLETE",
        )

        onboarding = (
            CompanyOnboarding.objects.get(
                company=result.company
            )
        )

        self.assertNotEqual(
            onboarding.status,
            CompanyOnboardingStatus.READY,
        )

    def test_legacy_company_without_onboarding_remains_ready(self):
        legacy_owner = (
            User.objects.create_user(
                username="phase26-legacy",
                email="phase26-legacy@example.com",
                password="Legacy-Password!",
            )
        )

        company = Company.objects.create(
            name="Phase 26 Legacy Company",
            company_code="PHASE26-LEGACY",
            status=CompanyStatus.ACTIVE,
            is_active=True,
            currency_code="SAR",
        )

        profile = UserProfile.objects.create(
            user=legacy_owner,
            display_name="Legacy Owner",
            default_company=company,
            default_workspace=(
                WorkspaceType.COMPANY
            ),
        )

        CompanyMembership.objects.create(
            user=legacy_owner,
            company=company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        CompanySettings.objects.create(
            company=company,
            enable_vat=False,
        )

        Branch.objects.create(
            company=company,
            name="Legacy Main",
            branch_code="MAIN",
            branch_type=(
                BranchType.HEAD_OFFICE
            ),
            is_default=True,
        )

        today = timezone.localdate()

        CompanySubscription.objects.create(
            company=company,
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
            start_date=today,
            end_date=(
                today
                + timedelta(days=30)
            ),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            paid_at=timezone.now(),
            activated_at=timezone.now(),
        )

        self.assertFalse(
            CompanyOnboarding.objects.filter(
                company=company
            ).exists()
        )

        self.client.force_login(
            legacy_owner
        )

        whoami = self.client.get(
            "/api/auth/whoami/"
        )

        self.assertEqual(
            whoami.status_code,
            200,
        )

        self.assertEqual(
            whoami.json()[
                "dashboard_path"
            ],
            "/company",
        )

        self.assertTrue(
            whoami.json()[
                "onboarding"
            ][
                "ready"
            ]
        )

        branches = self.client.get(
            "/api/company/branches/"
        )

        self.assertEqual(
            branches.status_code,
            200,
        )

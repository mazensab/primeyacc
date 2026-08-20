from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
    WorkspaceType,
)
from companies.models import CompanySettings, CompanyStatus
from companies.provisioning import provision_company_tenant
from subscriptions.models import CompanySubscription, SubscriptionPlan


User = get_user_model()


class TenantProvisioningTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="provision-owner",
            email="provision-owner@example.com",
            password="Safe-Test-Password-2026!",
        )

    def test_provisions_company_foundation_atomically(self):
        result = provision_company_tenant(
            name="Provisioning Test Company",
            owner=self.owner,
            acting_user=self.owner,
            commercial_registration="1010101010",
            tax_number="310000000000003",
            building_number="1234",
            street_name="King Road",
            district="Test District",
            city="Riyadh",
            region="Riyadh",
            postal_code="12345",
        )

        company = result.company

        self.assertTrue(company.company_code.startswith("CMP-"))
        self.assertEqual(company.status, CompanyStatus.TRIAL)
        self.assertEqual(company.owner_id, self.owner.id)

        self.assertTrue(
            CompanySettings.objects.filter(
                company=company
            ).exists()
        )

        profile = UserProfile.objects.get(user=self.owner)

        self.assertEqual(
            profile.default_company_id,
            company.id,
        )
        self.assertEqual(
            profile.default_workspace,
            WorkspaceType.COMPANY,
        )

        membership = CompanyMembership.objects.get(
            user=self.owner,
            company=company,
        )

        self.assertEqual(membership.role, CompanyRole.OWNER)
        self.assertEqual(
            membership.status,
            MembershipStatus.ACTIVE,
        )
        self.assertTrue(membership.is_primary)

        self.assertIsNone(result.subscription)
        self.assertGreaterEqual(
            result.accounting_seed.get("created", 0)
            + result.accounting_seed.get("existing", 0),
            1,
        )

    def test_optional_plan_creates_pending_subscription_only(self):
        plan = SubscriptionPlan.objects.create(
            name="Provisioning Plan",
            code="PROVISIONING-PLAN",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            is_active=True,
        )

        result = provision_company_tenant(
            name="Paid Provisioning Company",
            owner=self.owner,
            acting_user=self.owner,
            initial_plan=plan,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
        )

        self.assertIsNotNone(result.subscription)
        self.assertEqual(
            result.subscription.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            result.subscription.company_id,
            result.company.id,
        )
        self.assertEqual(
            result.subscription.plan_id,
            plan.id,
        )
        self.assertFalse(
            CompanySubscription.objects.filter(
                company=result.company,
                status=CompanySubscription.Status.ACTIVE,
            ).exists()
        )

    def test_missing_billing_cycle_rolls_back_entire_tenant(self):
        plan = SubscriptionPlan.objects.create(
            name="Rollback Plan",
            code="ROLLBACK-PLAN",
            monthly_price=Decimal("50.00"),
            yearly_price=Decimal("500.00"),
            is_active=True,
        )

        before = CompanyMembership.objects.count()

        with self.assertRaises(Exception):
            provision_company_tenant(
                name="Must Roll Back Company",
                owner=self.owner,
                acting_user=self.owner,
                initial_plan=plan,
                billing_cycle=None,
            )

        self.assertFalse(
            self.owner.owned_Mhamcloud_companies.filter(
                name="Must Roll Back Company"
            ).exists()
        )
        self.assertEqual(
            CompanyMembership.objects.count(),
            before,
        )

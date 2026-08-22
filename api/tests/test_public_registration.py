from __future__ import annotations

import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import resolve

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
)
from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformSubscriptionPayment,
    PlatformSubscriptionPaymentEvent,
)
from companies.models import Company, CompanyStatus
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)


User = get_user_model()


class PublicRegistrationContractTests(TestCase):
    def setUp(self):
        self.plan = SubscriptionPlan.objects.create(
            name="Phase 25 Public Basic",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="phase25-public-basic",
            description="Phase 25 public registration plan",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=2,
            max_warehouses=1,
            max_pos=1,
            features=["general_accounting"],
            is_active=True,
            is_public=True,
            sort_order=1,
        )

        self.private_plan = SubscriptionPlan.objects.create(
            name="Phase 25 Private",
            code=SubscriptionPlan.PlanCode.CUSTOM,
            slug="phase25-private",
            description="Private plan",
            monthly_price=Decimal("500.00"),
            yearly_price=Decimal("5000.00"),
            max_users=100,
            max_branches=20,
            max_warehouses=20,
            max_pos=20,
            features=["general_accounting"],
            is_active=True,
            is_public=False,
            sort_order=99,
        )

        self.inactive_plan = SubscriptionPlan.objects.create(
            name="Phase 25 Inactive",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="phase25-inactive",
            description="Inactive public plan",
            monthly_price=Decimal("250.00"),
            yearly_price=Decimal("2500.00"),
            max_users=50,
            max_branches=5,
            max_warehouses=5,
            max_pos=5,
            features=["general_accounting"],
            is_active=False,
            is_public=True,
            sort_order=50,
        )

    def payload(self, **overrides):
        data = {
            "owner_name": "Phase 25 Owner",
            "phone": "0537000001",
            "email": "phase25-owner@example.com",
            "password": "StrongPass123!",
            "company_name": "Phase 25 Company",
            "commercial_registration": "1012345678",
            "tax_number": "310123456700003",
            "city": "Riyadh",
            "plan_id": self.plan.id,
            "billing_cycle": "MONTHLY",
            "gateway": "MOYASAR",
            "auto_renew": False,
        }
        data.update(overrides)
        return data

    def post(self, payload):
        return self.client.post(
            "/api/public/registration/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_public_routes_resolve(self):
        self.assertEqual(
            resolve("/api/public/registration/").url_name,
            "registration",
        )
        self.assertEqual(
            resolve(
                "/api/public/registration/options/"
            ).url_name,
            "registration_options",
        )

    def test_options_expose_only_public_active_plans(self):
        response = self.client.get(
            "/api/public/registration/options/"
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertTrue(payload["ok"])

        plan_ids = {
            item["id"]
            for item in payload["data"]["plans"]
        }

        self.assertIn(self.plan.id, plan_ids)
        self.assertNotIn(self.private_plan.id, plan_ids)
        self.assertNotIn(self.inactive_plan.id, plan_ids)

        self.assertEqual(
            set(payload["data"]["gateways"]),
            {"MOYASAR", "TAMARA", "TABBY"},
        )

    def test_registration_creates_complete_pending_contract(self):
        response = self.post(self.payload())

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        body = response.json()

        self.assertTrue(body["ok"])
        self.assertEqual(
            body["code"],
            "REGISTRATION_CREATED",
        )

        owner = User.objects.get(
            email="phase25-owner@example.com"
        )

        self.assertEqual(
            owner.get_username(),
            "0537000001",
        )

        self.assertTrue(
            owner.check_password("StrongPass123!")
        )

        profile = UserProfile.objects.get(
            user=owner
        )

        company = Company.objects.get(
            commercial_registration="1012345678"
        )

        membership = CompanyMembership.objects.get(
            user=owner,
            company=company,
        )

        self.assertEqual(
            membership.role,
            CompanyRole.OWNER,
        )
        self.assertEqual(
            membership.status,
            MembershipStatus.ACTIVE,
        )
        self.assertTrue(membership.is_primary)
        self.assertEqual(
            profile.default_company_id,
            company.id,
        )

        self.assertEqual(
            company.owner_id,
            owner.id,
        )
        self.assertEqual(
            company.status,
            CompanyStatus.TRIAL,
        )
        self.assertTrue(company.is_active)

        subscription = CompanySubscription.objects.get(
            company=company
        )

        self.assertEqual(
            subscription.plan_id,
            self.plan.id,
        )
        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            subscription.action,
            CompanySubscription.SubscriptionAction.NEW,
        )
        self.assertEqual(
            subscription.billing_cycle,
            CompanySubscription.BillingCycle.MONTHLY,
        )

        payment = PlatformSubscriptionPayment.objects.get(
            subscription=subscription
        )

        self.assertEqual(
            payment.company_id,
            company.id,
        )
        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertEqual(
            payment.gateway,
            "MOYASAR",
        )
        self.assertEqual(
            payment.payment_method,
            "MOYASAR",
        )
        self.assertEqual(
            payment.amount,
            subscription.total_amount,
        )
        self.assertEqual(
            payment.currency_code,
            "SAR",
        )
        self.assertEqual(
            payment.idempotency_key,
            f"public-registration:{subscription.id}",
        )

        invoice = payment.invoice

        self.assertEqual(
            invoice.company_id,
            company.id,
        )
        self.assertEqual(
            invoice.subscription_id,
            subscription.id,
        )
        self.assertEqual(
            invoice.document_type,
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        )
        self.assertEqual(
            invoice.status,
            PlatformBillingDocumentStatus.ISSUED,
        )
        self.assertEqual(
            invoice.total_amount,
            payment.amount,
        )

        self.assertIsNone(payment.receipt_id)

        self.assertFalse(
            PlatformBillingDocument.objects.filter(
                subscription=subscription,
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
            ).exists()
        )

        self.assertEqual(
            PlatformSubscriptionPaymentEvent.objects.filter(
                payment=payment,
                event_type="CREATED",
            ).count(),
            1,
        )

        self.assertEqual(
            body["data"]["company"]["id"],
            company.id,
        )
        self.assertEqual(
            body["data"]["subscription"]["id"],
            subscription.id,
        )
        self.assertEqual(
            body["data"]["subscription"]["status"],
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            body["data"]["payment"]["id"],
            payment.id,
        )
        self.assertEqual(
            body["data"]["payment"]["status"],
            PlatformSubscriptionPayment.Status.PENDING,
        )

    def test_phone_is_normalized_before_persistence(self):
        response = self.post(
            self.payload(
                phone="+966537000002",
                email="phase25-phone@example.com",
                commercial_registration="1012345679",
            )
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        owner = User.objects.get(
            email="phase25-phone@example.com"
        )

        self.assertEqual(
            owner.get_username(),
            "0537000002",
        )

        profile = UserProfile.objects.get(
            user=owner
        )

        self.assertEqual(
            profile.phone,
            "0537000002",
        )
        self.assertEqual(
            profile.mobile,
            "0537000002",
        )
        self.assertEqual(
            profile.whatsapp_number,
            "0537000002",
        )

    def test_private_plan_is_rejected_without_side_effects(self):
        response = self.post(
            self.payload(
                plan_id=self.private_plan.id,
            )
        )

        self.assertEqual(response.status_code, 400)

        self.assertFalse(
            User.objects.filter(
                email="phase25-owner@example.com"
            ).exists()
        )
        self.assertFalse(
            Company.objects.filter(
                commercial_registration="1012345678"
            ).exists()
        )
        self.assertEqual(
            PlatformSubscriptionPayment.objects.count(),
            0,
        )

    def test_inactive_plan_is_rejected_without_side_effects(self):
        response = self.post(
            self.payload(
                plan_id=self.inactive_plan.id,
            )
        )

        self.assertEqual(response.status_code, 400)

        self.assertFalse(
            User.objects.filter(
                email="phase25-owner@example.com"
            ).exists()
        )
        self.assertEqual(Company.objects.count(), 0)
        self.assertEqual(
            CompanySubscription.objects.count(),
            0,
        )
        self.assertEqual(
            PlatformSubscriptionPayment.objects.count(),
            0,
        )

    def test_invalid_gateway_is_rejected_before_creation(self):
        response = self.post(
            self.payload(
                gateway="UNSUPPORTED_GATEWAY",
            )
        )

        self.assertEqual(response.status_code, 400)

        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Company.objects.count(), 0)
        self.assertEqual(
            CompanySubscription.objects.count(),
            0,
        )
        self.assertEqual(
            PlatformSubscriptionPayment.objects.count(),
            0,
        )

    def test_invalid_billing_cycle_is_rejected_before_creation(self):
        response = self.post(
            self.payload(
                billing_cycle="WEEKLY",
            )
        )

        self.assertEqual(response.status_code, 400)

        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Company.objects.count(), 0)
        self.assertEqual(
            CompanySubscription.objects.count(),
            0,
        )

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(
            username="0537999999",
            email="phase25-owner@example.com",
            password="ExistingPass123!",
        )

        response = self.post(self.payload())

        self.assertEqual(response.status_code, 400)

        self.assertEqual(
            User.objects.filter(
                email="phase25-owner@example.com"
            ).count(),
            1,
        )
        self.assertEqual(Company.objects.count(), 0)

    def test_duplicate_phone_is_rejected(self):
        User.objects.create_user(
            username="0537000001",
            email="existing-phone@example.com",
            password="ExistingPass123!",
        )

        response = self.post(self.payload())

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Company.objects.count(), 0)

    def test_duplicate_commercial_registration_is_rejected(self):
        first = self.post(self.payload())

        self.assertEqual(
            first.status_code,
            201,
            first.content,
        )

        second = self.post(
            self.payload(
                phone="0537000003",
                email="phase25-second@example.com",
            )
        )

        self.assertEqual(second.status_code, 400)

        self.assertEqual(
            Company.objects.filter(
                commercial_registration="1012345678"
            ).count(),
            1,
        )

        self.assertFalse(
            User.objects.filter(
                email="phase25-second@example.com"
            ).exists()
        )

    def test_gateway_payment_failure_rolls_back_entire_registration(self):
        with patch(
            "api.public.registration."
            "create_or_get_subscription_payment",
            side_effect=RuntimeError(
                "Simulated payment creation failure"
            ),
        ):
            with self.assertRaises(RuntimeError):
                self.post(self.payload())

        self.assertFalse(
            User.objects.filter(
                email="phase25-owner@example.com"
            ).exists()
        )
        self.assertFalse(
            Company.objects.filter(
                commercial_registration="1012345678"
            ).exists()
        )
        self.assertEqual(
            CompanyMembership.objects.count(),
            0,
        )
        self.assertEqual(
            CompanySubscription.objects.count(),
            0,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )
        self.assertEqual(
            PlatformSubscriptionPayment.objects.count(),
            0,
        )

    def test_registration_never_marks_provider_payment_paid(self):
        response = self.post(
            self.payload(
                gateway="MOYASAR",
            )
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payment = (
            PlatformSubscriptionPayment.objects
            .get()
        )

        subscription = payment.subscription

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment.Status.PENDING,
        )
        self.assertIsNone(payment.paid_at)
        self.assertIsNone(payment.receipt_id)

        self.assertEqual(
            subscription.status,
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertIsNone(subscription.paid_at)
        self.assertIsNone(subscription.activated_at)

    def test_registration_records_payment_source_metadata(self):
        response = self.post(self.payload())

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payment = PlatformSubscriptionPayment.objects.get()

        self.assertEqual(
            payment.metadata.get("source"),
            "public-registration",
        )
        self.assertEqual(
            payment.metadata.get("company_id"),
            payment.company_id,
        )

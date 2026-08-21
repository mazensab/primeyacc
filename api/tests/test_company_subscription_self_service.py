from __future__ import annotations

import json
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import resolve
from django.utils import timezone

from accounts.models import CompanyMembership
from billing.models import PlatformSubscriptionPayment
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.tests import SubscriptionServiceTests


User = get_user_model()


def _membership(user, company):
    fields = {field.name for field in CompanyMembership._meta.fields}
    payload = {"user": user, "company": company}
    if "role" in fields:
        payload["role"] = "OWNER"
    if "status" in fields:
        payload["status"] = "ACTIVE"
    if "is_active" in fields:
        payload["is_active"] = True
    if "is_primary" in fields:
        payload["is_primary"] = True
    return CompanyMembership.objects.create(**payload)


class CompanySubscriptionSelfServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="phase23-company-owner",
            email="phase23-owner@example.com",
            password="StrongPass123!",
        )
        self.company = SubscriptionServiceTests.create_company(
            self, name="Phase 23 Company"
        )
        self.other_company = SubscriptionServiceTests.create_company(
            self,
            name="Phase 23 Other Company",
            company_code="phase23-other-company",
        )
        _membership(self.user, self.company)

        self.basic = SubscriptionPlan.objects.create(
            name="Phase 23 Basic",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="phase23-basic",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=2,
            max_warehouses=1,
            max_pos=1,
            features=["accounting"],
            is_active=True,
            is_public=True,
            sort_order=1,
        )
        self.pro = SubscriptionPlan.objects.create(
            name="Phase 23 Pro",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="phase23-pro",
            monthly_price=Decimal("250.00"),
            yearly_price=Decimal("2500.00"),
            max_users=50,
            max_branches=5,
            max_warehouses=3,
            max_pos=3,
            features=["accounting", "inventory"],
            is_active=True,
            is_public=True,
            sort_order=2,
        )
        self.private = SubscriptionPlan.objects.create(
            name="Phase 23 Private",
            code=SubscriptionPlan.PlanCode.CUSTOM,
            slug="phase23-private",
            monthly_price=Decimal("500.00"),
            yearly_price=Decimal("5000.00"),
            is_active=True,
            is_public=False,
            sort_order=99,
        )
        self.current = CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=timezone.localdate() - timedelta(days=5),
            end_date=timezone.localdate() + timedelta(days=20),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            auto_renew=False,
            created_by=self.user,
        )
        self.client.force_login(self.user)

    def post_json(self, path, payload):
        return self.client.post(
            path,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_routes_resolve(self):
        cases = [
            ("/api/company/subscription/", "company_subscription_detail"),
            ("/api/company/subscription/plans/", "company_subscription_plans"),
            ("/api/company/subscription/billing/", "company_subscription_billing"),
            ("/api/company/subscription/renew/", "company_subscription_renew"),
            (
                "/api/company/subscription/change-plan/",
                "company_subscription_change_plan",
            ),
        ]
        for path, name in cases:
            with self.subTest(path=path):
                self.assertEqual(resolve(path).url_name, name)

    def test_detail_returns_current_company_only(self):
        response = self.client.get("/api/company/subscription/")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["company"]["id"], self.company.id)
        self.assertEqual(data["effective_subscription"]["id"], self.current.id)

    def test_plans_only_returns_public_active_plans(self):
        response = self.client.get("/api/company/subscription/plans/")
        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.json()["data"]["items"]}
        self.assertIn(self.basic.id, ids)
        self.assertIn(self.pro.id, ids)
        self.assertNotIn(self.private.id, ids)

    def test_renew_creates_pending_payment_without_closing_current(self):
        response = self.post_json(
            "/api/company/subscription/renew/",
            {"gateway": "MOYASAR"},
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()["data"]

        self.current.refresh_from_db()
        self.assertEqual(self.current.status, CompanySubscription.Status.ACTIVE)

        pending = CompanySubscription.objects.get(pk=payload["subscription"]["id"])
        self.assertEqual(pending.status, CompanySubscription.Status.PENDING_PAYMENT)
        self.assertEqual(
            pending.action,
            CompanySubscription.SubscriptionAction.RENEWAL,
        )
        payment = PlatformSubscriptionPayment.objects.get(
            pk=payload["payment"]["id"]
        )
        self.assertEqual(payment.company_id, self.company.id)
        self.assertEqual(payment.subscription_id, pending.id)
        self.assertEqual(payment.gateway, "MOYASAR")

    def test_second_pending_change_is_blocked(self):
        first = self.post_json(
            "/api/company/subscription/renew/",
            {"gateway": "MOYASAR"},
        )
        self.assertEqual(first.status_code, 201)

        second = self.post_json(
            "/api/company/subscription/renew/",
            {"gateway": "MOYASAR"},
        )
        self.assertEqual(second.status_code, 409)
        self.assertEqual(
            second.json()["code"],
            "PENDING_SUBSCRIPTION_CHANGE_EXISTS",
        )

    def test_change_plan_action_is_computed_server_side(self):
        response = self.post_json(
            "/api/company/subscription/change-plan/",
            {
                "plan_id": self.pro.id,
                "gateway": "TAMARA",
                "action": "DOWNGRADE",
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(
            data["action"],
            CompanySubscription.SubscriptionAction.UPGRADE,
        )
        pending = CompanySubscription.objects.get(pk=data["subscription"]["id"])
        self.assertEqual(
            pending.action,
            CompanySubscription.SubscriptionAction.UPGRADE,
        )

    def test_private_plan_cannot_be_selected(self):
        response = self.post_json(
            "/api/company/subscription/change-plan/",
            {"plan_id": self.private.id, "gateway": "TABBY"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "PLAN_NOT_AVAILABLE")

    def test_billing_is_tenant_scoped(self):
        response = self.post_json(
            "/api/company/subscription/renew/",
            {"gateway": "MOYASAR"},
        )
        self.assertEqual(response.status_code, 201)

        other_pending = CompanySubscription.objects.create(
            company=self.other_company,
            plan=self.basic,
            status=CompanySubscription.Status.PENDING_PAYMENT,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
        )
        from billing.payment_services import create_or_get_subscription_payment

        other_payment, _ = create_or_get_subscription_payment(
            subscription=other_pending,
            idempotency_key="phase23-other-payment",
            gateway="MOYASAR",
            payment_method="MOYASAR",
        )

        billing = self.client.get("/api/company/subscription/billing/")
        self.assertEqual(billing.status_code, 200)
        payment_ids = {
            item["id"] for item in billing.json()["data"]["payments"]
        }
        self.assertNotIn(other_payment.id, payment_ids)

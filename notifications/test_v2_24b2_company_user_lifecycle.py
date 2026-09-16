from __future__ import annotations

import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    SystemRole,
    UserProfile,
    UserProfileStatus,
)
from companies.models import Company, CompanyStatus
from companies.provisioning import provision_company_tenant
from subscriptions.models import CompanySubscription, SubscriptionPlan
from notifications.models import NotificationEvent

User = get_user_model()


class V224B2CompanyUserLifecycleTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            username="v224b2-root",
            email="v224b2-root@example.com",
            password="StrongPass123!",
        )
        self.owner = User.objects.create_user(
            username="v224b2-owner",
            email="v224b2-owner@example.com",
            password="StrongPass123!",
        )

    def _capture(self):
        return self.captureOnCommitCallbacks(execute=True)

    def _company(self):
        with patch("notifications.services.deliver_notification_event"):
            with self._capture():
                result = provision_company_tenant(
                    name="V2 24B2 Company",
                    owner=self.owner,
                    acting_user=self.actor,
                    commercial_registration="1010240001",
                    tax_number="310000000000024",
                    building_number="2424",
                    street_name="King Road",
                    district="Test District",
                    city="Riyadh",
                    region="Riyadh",
                    postal_code="12424",
                )
        return result.company

    def _event(self, company, event_type):
        return NotificationEvent.objects.filter(
            company=company,
            event_type=event_type,
        )

    def _enable_company_workspace(self, company):
        plan, _ = SubscriptionPlan.objects.get_or_create(
            code="V224B2-WORKSPACE",
            defaults={"name":"V2 24B2 Workspace","monthly_price":"100.00","yearly_price":"1000.00","is_active":True},
        )
        today = timezone.localdate()
        CompanySubscription.objects.create(
            company=company, plan=plan, status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=today, end_date=today + __import__("datetime").timedelta(days=30),
            price="100.00", discount_amount="0.00", tax_amount="15.00", total_amount="115.00",
            paid_at=timezone.now(), activated_at=timezone.now(), created_by=self.actor,
        )

    def test_company_created_event(self):
        company = self._company()
        qs = self._event(company, "company.created")
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.get().created_by_id, self.actor.id)

    def test_company_status_lifecycle_events(self):
        company = self._company()
        self.client.force_login(self.actor)
        with patch("api.system.companies.status.user_has_system_permission", return_value=True):
            actions = [
                ("deactivate", "company.deactivated", {}),
                ("activate", "company.activated", {}),
                ("suspend", "company.suspended", {"reason": "Compliance"}),
                ("restore", "company.reactivated", {}),
            ]
            for action, event_type, extra in actions:
                with patch("notifications.services.deliver_notification_event"):
                    with self._capture():
                        response = self.client.post(
                            f"/api/system/companies/{company.id}/status/",
                            data=json.dumps({"action": action, **extra}),
                            content_type="application/json",
                        )
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(self._event(company, event_type).count(), 1)

    def test_company_user_created_event(self):
        company = self._company()
        self.client.force_login(self.actor)
        with patch("api.system.companies.company_users.user_has_system_permission", return_value=True):
            with patch("notifications.services.deliver_notification_event"):
                with self._capture():
                    response = self.client.post(
                        f"/api/system/companies/{company.id}/users/create/",
                        data=json.dumps({
                            "username": "v224b2-member",
                            "email": "v224b2-member@example.com",
                            "role": "ADMIN",
                            "status": "ACTIVE",
                        }),
                        content_type="application/json",
                    )
        self.assertEqual(response.status_code, 201, response.content)
        membership_id = response.json()["data"]["membership"]["id"]
        qs = self._event(company, "user.created")
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.get().payload["membership_id"], membership_id)

    def test_company_membership_status_lifecycle_events(self):
        company = self._company()
        self._enable_company_workspace(company)
        target = User.objects.create_user(
            username="v224b2-employee",
            email="v224b2-employee@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.update_or_create(
            user=target,
            defaults={
                "display_name": "V2 Employee",
                "default_company": company,
            },
        )
        membership = CompanyMembership.objects.create(
            user=target,
            company=company,
            role=CompanyRole.EMPLOYEE,
            status=MembershipStatus.ACTIVE,
            is_primary=False,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.client.force_login(self.owner)
        actions = [
            ("suspend", "user.suspended", {"reason": "Review"}),
            ("activate", "user.reactivated", {}),
            ("deactivate", "user.deactivated", {}),
            ("activate", "user.activated", {}),
        ]
        for action, event_type, extra in actions:
            with patch("notifications.services.deliver_notification_event"):
                with self._capture():
                    response = self.client.post(
                        f"/api/company/users/{membership.id}/{action}/",
                        data=json.dumps(extra),
                        content_type="application/json",
                    )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(self._event(company, event_type).count(), 1)

    def test_system_user_role_changed_and_status_events_with_real_tenant(self):
        company = self._company()
        target = User.objects.create_user(
            username="v224b2-support",
            email="v224b2-support@example.com",
            password="StrongPass123!",
        )
        profile, _ = UserProfile.objects.update_or_create(
            user=target,
            defaults={
                "display_name": "V2 Support",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPPORT,
                "default_company": company,
            },
        )
        CompanyMembership.objects.create(
            user=target,
            company=company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.actor,
            updated_by=self.actor,
        )
        self.client.force_login(self.actor)

        with patch("notifications.services.deliver_notification_event"):
            with self._capture():
                role = self.client.patch(
                    f"/api/system/users/{target.id}/",
                    data=json.dumps({"system_role": "BILLING_MANAGER"}),
                    content_type="application/json",
                )
        self.assertEqual(role.status_code, 200, role.content)
        self.assertEqual(self._event(company, "user.role_changed").count(), 1)

        actions = [
            ("suspend", "user.suspended", {"reason": "Security review"}),
            ("activate", "user.reactivated", {}),
            ("deactivate", "user.deactivated", {"reason": "Employment ended"}),
            ("activate", "user.activated", {}),
        ]
        for action, event_type, extra in actions:
            with patch("notifications.services.deliver_notification_event"):
                with self._capture():
                    response = self.client.post(
                        f"/api/system/users/{target.id}/status/",
                        data=json.dumps({"action": action, **extra}),
                        content_type="application/json",
                    )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertGreaterEqual(self._event(company, event_type).count(), 1)

        profile.refresh_from_db()
        self.assertEqual(profile.status, UserProfileStatus.ACTIVE)

    def test_system_user_without_membership_does_not_create_synthetic_tenant_event(self):
        target = User.objects.create_user(
            username="v224b2-global",
            email="v224b2-global@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.update_or_create(
            user=target,
            defaults={
                "display_name": "V2 Global",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPPORT,
            },
        )
        self.client.force_login(self.actor)
        before = NotificationEvent.objects.count()
        with patch("notifications.services.deliver_notification_event"):
            with self._capture():
                response = self.client.patch(
                    f"/api/system/users/{target.id}/",
                    data=json.dumps({"system_role": "BILLING_MANAGER"}),
                    content_type="application/json",
                )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(NotificationEvent.objects.count(), before)

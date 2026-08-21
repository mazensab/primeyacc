
from __future__ import annotations

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import RequestFactory, SimpleTestCase

from api.permissions import (
    HasAnyCompanyPermission,
    HasCompanyPermission,
    IsCompanyMember,
)
from subscriptions.access_policy import (
    SubscriptionAccessPolicy,
    SubscriptionWorkspaceAccess,
)


def make_policy(access: str) -> SubscriptionAccessPolicy:
    return SubscriptionAccessPolicy(
        access=access,
        reason="TEST",
        status=None,
        subscription_id=None,
        plan_id=None,
        plan_name="",
        can_use_workspace=access == SubscriptionWorkspaceAccess.FULL,
        can_manage_subscription=access in {
            SubscriptionWorkspaceAccess.FULL,
            SubscriptionWorkspaceAccess.BILLING_ONLY,
        },
        can_pay=access != SubscriptionWorkspaceAccess.FULL,
        can_renew=access != SubscriptionWorkspaceAccess.FULL,
        can_change_plan=access != SubscriptionWorkspaceAccess.DENIED,
        days_remaining=0,
        expires_at=None,
        is_in_grace=False,
        grace_days_remaining=0,
        grace_expires_at=None,
    )


class SubscriptionPermissionEnforcementTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = Mock()
        self.user.is_authenticated = True

        self.membership = Mock()
        self.membership.is_active_membership = True
        self.membership.company_permissions = ["*"]
        self.membership.has_company_permission.return_value = True

        self.view = Mock()
        self.view.required_company_permission = None
        self.view.required_company_permissions = []

    def request(self):
        request = self.factory.get("/api/company/test/")
        request.user = self.user
        return request

    @patch("api.permissions.attach_subscription_access")
    @patch("api.permissions.attach_company_context")
    def test_full_subscription_allows_company_member(
        self,
        attach_company_context,
        attach_subscription_access,
    ):
        attach_company_context.return_value = self.membership
        attach_subscription_access.return_value = make_policy(
            SubscriptionWorkspaceAccess.FULL
        )

        allowed = IsCompanyMember().has_permission(
            self.request(),
            self.view,
        )

        self.assertTrue(allowed)

    @patch("api.permissions.attach_subscription_access")
    @patch("api.permissions.attach_company_context")
    def test_billing_only_blocks_normal_company_workspace(
        self,
        attach_company_context,
        attach_subscription_access,
    ):
        attach_company_context.return_value = self.membership
        attach_subscription_access.return_value = make_policy(
            SubscriptionWorkspaceAccess.BILLING_ONLY
        )

        permission = IsCompanyMember()

        allowed = permission.has_permission(
            self.request(),
            self.view,
        )

        self.assertFalse(allowed)
        self.assertEqual(
            permission.message,
            "SUBSCRIPTION_ACCESS_REQUIRED",
        )

    @patch("api.permissions.attach_subscription_access")
    @patch("api.permissions.attach_company_context")
    def test_denied_blocks_company_permission(
        self,
        attach_company_context,
        attach_subscription_access,
    ):
        attach_company_context.return_value = self.membership
        attach_subscription_access.return_value = make_policy(
            SubscriptionWorkspaceAccess.DENIED
        )

        permission = HasCompanyPermission()

        allowed = permission.has_permission(
            self.request(),
            self.view,
        )

        self.assertFalse(allowed)
        self.assertEqual(
            permission.message,
            "SUBSCRIPTION_ACCESS_REQUIRED",
        )

    @patch("api.permissions.attach_subscription_access")
    @patch("api.permissions.attach_company_context")
    def test_billing_only_blocks_any_company_permission(
        self,
        attach_company_context,
        attach_subscription_access,
    ):
        attach_company_context.return_value = self.membership
        attach_subscription_access.return_value = make_policy(
            SubscriptionWorkspaceAccess.BILLING_ONLY
        )

        permission = HasAnyCompanyPermission()

        allowed = permission.has_permission(
            self.request(),
            self.view,
        )

        self.assertFalse(allowed)
        self.assertEqual(
            permission.message,
            "SUBSCRIPTION_ACCESS_REQUIRED",
        )

    @patch("api.permissions.attach_subscription_access")
    @patch("api.permissions.attach_company_context")
    def test_inactive_membership_is_rejected_before_subscription(
        self,
        attach_company_context,
        attach_subscription_access,
    ):
        self.membership.is_active_membership = False
        attach_company_context.return_value = self.membership

        allowed = IsCompanyMember().has_permission(
            self.request(),
            self.view,
        )

        self.assertFalse(allowed)
        attach_subscription_access.assert_not_called()

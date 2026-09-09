# ============================================================
# 📂 api/test_unified_auth.py
# 🧪 Mhamcloud | Unified Login Regression Tests
# ============================================================

from __future__ import annotations

import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase

from accounts.auth_identity import resolve_login_identity
from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    SystemRole,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from companies.models import Company, CompanyStatus
from subscriptions.access_policy import SubscriptionWorkspaceAccess


class _SubscriptionAccessStub:
    def __init__(self, access: str = SubscriptionWorkspaceAccess.FULL):
        self.access = access

    def as_dict(self) -> dict[str, object]:
        return {
            "access": self.access,
            "reason": "test",
            "status": "ACTIVE",
            "can_use_workspace": (
                self.access == SubscriptionWorkspaceAccess.FULL
            ),
            "can_manage_subscription": True,
        }


class _OnboardingAccessStub:
    required = False
    ready = True
    managed = False

    def as_dict(self) -> dict[str, object]:
        return {
            "managed": self.managed,
            "required": self.required,
            "ready": self.ready,
            "status": "READY",
            "current_step": "",
            "onboarding_id": None,
        }


class UnifiedAuthTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.User = get_user_model()
        self.company = Company.objects.create(
            name="Unified Auth Test Company",
            company_code="UNIFIED-AUTH-TEST",
            status=CompanyStatus.ACTIVE,
            is_active=True,
        )

        self.subscription_patcher = patch(
            "api.auth.whoami.evaluate_subscription_access",
            side_effect=lambda company: _SubscriptionAccessStub(),
        )
        self.onboarding_patcher = patch(
            "api.auth.whoami.get_company_onboarding_access",
            side_effect=lambda company: _OnboardingAccessStub(),
        )
        self.subscription_patcher.start()
        self.onboarding_patcher.start()
        self.addCleanup(self.subscription_patcher.stop)
        self.addCleanup(self.onboarding_patcher.stop)

    def _create_company_user(
        self,
        *,
        username: str,
        password: str = "StrongPass123!",
        email: str = "",
        mobile: str = "",
        role: str = CompanyRole.ADMIN,
    ):
        user = self.User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=True,
        )
        profile = UserProfile.objects.create(
            user=user,
            display_name=username,
            mobile=mobile,
            status=UserProfileStatus.ACTIVE,
            default_workspace=WorkspaceType.COMPANY,
            default_company=self.company,
        )
        membership = CompanyMembership.objects.create(
            user=user,
            company=self.company,
            role=role,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )
        return user, profile, membership

    def _post_login(
        self,
        *,
        identifier: str,
        password: str = "StrongPass123!",
        remember: bool = False,
    ):
        return self.client.post(
            "/api/auth/login/",
            data=json.dumps(
                {
                    "identifier": identifier,
                    "password": password,
                    "remember": remember,
                }
            ),
            content_type="application/json",
        )

    def test_company_user_routes_to_company(self) -> None:
        self._create_company_user(username="company-login")

        response = self._post_login(identifier="company-login")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["workspace"], WorkspaceType.COMPANY)
        self.assertEqual(response.json()["dashboard_path"], "/company")

    def test_system_user_has_priority_over_company_membership(self) -> None:
        user, profile, _membership = self._create_company_user(
            username="system-and-company"
        )
        profile.is_system_user = True
        profile.system_role = SystemRole.SUPPORT
        profile.default_workspace = WorkspaceType.COMPANY
        profile.save(
            update_fields=[
                "is_system_user",
                "system_role",
                "default_workspace",
                "updated_at",
            ]
        )

        response = self._post_login(identifier=user.username)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["workspace"], WorkspaceType.SYSTEM)
        self.assertEqual(response.json()["dashboard_path"], "/system")

    def test_django_superuser_routes_to_system_without_profile_flags(self) -> None:
        superuser = self.User.objects.create_superuser(
            username="django-superuser",
            email="root@example.com",
            password="StrongPass123!",
        )
        self.client.force_login(superuser)

        response = self.client.get("/api/auth/whoami/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["workspace"], WorkspaceType.SYSTEM)
        self.assertEqual(payload["dashboard_path"], "/system")
        self.assertTrue(payload["can_access_system"])
        self.assertEqual(payload["system_permissions"], ["*"])
        self.assertEqual(payload["system_role"], SystemRole.SUPER_ADMIN)

    def test_login_accepts_normalized_saudi_mobile(self) -> None:
        self._create_company_user(
            username="mobile-login",
            mobile="0501234567",
        )

        resolution = resolve_login_identity("+966501234567")
        self.assertTrue(resolution.found)
        self.assertEqual(resolution.user.username, "mobile-login")

        response = self._post_login(identifier="+966501234567")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["dashboard_path"], "/company")

    def test_ambiguous_mobile_identifier_fails_closed(self) -> None:
        self._create_company_user(
            username="duplicate-mobile-a",
            mobile="0509999999",
        )
        second_user = self.User.objects.create_user(
            username="duplicate-mobile-b",
            password="StrongPass123!",
        )
        UserProfile.objects.create(
            user=second_user,
            display_name="duplicate-mobile-b",
            mobile="+966509999999",
            status=UserProfileStatus.ACTIVE,
        )

        resolution = resolve_login_identity("0509999999")
        self.assertTrue(resolution.ambiguous)

        response = self._post_login(identifier="0509999999")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_credentials")

    def test_imported_unusable_password_is_rejected_safely(self) -> None:
        user = self.User(username="imported-no-password", is_active=True)
        user.set_unusable_password()
        user.save()
        UserProfile.objects.create(
            user=user,
            display_name="Imported user",
            status=UserProfileStatus.ACTIVE,
            default_workspace=WorkspaceType.COMPANY,
            default_company=self.company,
        )
        CompanyMembership.objects.create(
            user=user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        response = self._post_login(
            identifier=user.username,
            password="OldLegacyPassword!",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_credentials")
        self.assertFalse(response.json()["authenticated"])

    def test_account_without_workspace_is_not_logged_in(self) -> None:
        user = self.User.objects.create_user(
            username="no-workspace",
            password="StrongPass123!",
        )
        UserProfile.objects.create(
            user=user,
            display_name="No workspace",
            status=UserProfileStatus.ACTIVE,
        )

        response = self._post_login(identifier=user.username)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "workspace_access_denied")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_remember_me_controls_browser_session_expiry(self) -> None:
        self._create_company_user(username="remember-login")

        response = self._post_login(
            identifier="remember-login",
            remember=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["session_persistent"])
        self.assertFalse(self.client.session.get_expire_at_browser_close())

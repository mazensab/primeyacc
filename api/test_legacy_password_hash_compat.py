from __future__ import annotations

import json
from unittest.mock import patch

import bcrypt
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import identify_hasher, make_password
from django.test import TestCase

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from companies.models import Company, CompanyStatus
from subscriptions.access_policy import SubscriptionWorkspaceAccess


PASSWORD = "LegacyPass123!"


def legacy_encoded(password: str = PASSWORD) -> str:
    generated = bcrypt.hashpw(
        password.encode("utf-8")[:72],
        bcrypt.gensalt(rounds=4, prefix=b"2b"),
    )
    return "laravel_bcrypt$" + (b"$2y$" + generated[4:]).decode("ascii")


class _Subscription:
    access = SubscriptionWorkspaceAccess.FULL

    def as_dict(self):
        return {
            "access": self.access,
            "reason": "test",
            "status": "ACTIVE",
            "can_use_workspace": True,
            "can_manage_subscription": True,
        }


class _Onboarding:
    managed = False
    required = False
    ready = True

    def as_dict(self):
        return {
            "managed": False,
            "required": False,
            "ready": True,
            "status": "READY",
            "current_step": "",
            "onboarding_id": None,
        }


class LegacyPasswordCompatibilityTests(TestCase):
    def test_laravel_bcrypt_and_default_hasher(self):
        encoded = legacy_encoded()
        hasher = identify_hasher(encoded)
        self.assertEqual(hasher.algorithm, "laravel_bcrypt")
        self.assertTrue(hasher.verify(PASSWORD, encoded))
        self.assertFalse(hasher.verify("wrong", encoded))
        self.assertEqual(identify_hasher(make_password(PASSWORD)).algorithm, "pbkdf2_sha256")

    @patch("api.auth.whoami.evaluate_subscription_access", return_value=_Subscription())
    @patch("api.auth.whoami.get_company_onboarding_access", return_value=_Onboarding())
    def test_unified_login_accepts_legacy_hash(self, _onboarding, _subscription):
        User = get_user_model()
        company = Company.objects.create(
            name="Legacy Password Test",
            company_code="LEGACY-PASSWORD-TEST",
            status=CompanyStatus.ACTIVE,
            is_active=True,
        )
        user = User.objects.create(
            username="legacy-login-user",
            email="legacy-login@example.com",
            password=legacy_encoded(),
            is_active=True,
        )
        UserProfile.objects.create(
            user=user,
            display_name="Legacy User",
            status=UserProfileStatus.ACTIVE,
            default_workspace=WorkspaceType.COMPANY,
            default_company=company,
        )
        CompanyMembership.objects.create(
            user=user,
            company=company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"identifier": user.username, "password": PASSWORD}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["dashboard_path"], "/company")

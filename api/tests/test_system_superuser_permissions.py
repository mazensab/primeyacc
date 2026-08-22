from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from api.permissions import (
    request_has_company_access,
    request_has_company_permission,
    user_can_access_system,
    user_has_system_permission,
)
from accounts.models import UserProfile


class SystemSuperuserPermissionTests(TestCase):
    def setUp(self):
        self.User = get_user_model()

    def test_active_superuser_has_full_system_access_without_profile_permissions(self):
        user = self.User.objects.create_user(
            username="platform-owner",
            password="test-password",
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )

        UserProfile.objects.get_or_create(
            user=user,
            defaults={"display_name": "Platform Owner"},
        )

        self.assertTrue(user_can_access_system(user))
        self.assertTrue(
            user_has_system_permission(
                user,
                "system.companies.view",
            )
        )
        self.assertTrue(
            user_has_system_permission(
                user,
                "system.companies.create",
            )
        )
        self.assertTrue(
            user_has_system_permission(
                user,
                "system.companies.update",
            )
        )
        self.assertTrue(
            user_has_system_permission(
                user,
                "system.companies.status",
            )
        )

    def test_inactive_superuser_does_not_receive_system_bypass(self):
        user = self.User.objects.create_user(
            username="inactive-platform-owner",
            password="test-password",
            is_active=False,
            is_staff=True,
            is_superuser=True,
        )

        self.assertFalse(user_can_access_system(user))
        self.assertFalse(
            user_has_system_permission(
                user,
                "system.companies.view",
            )
        )

    def test_staff_user_does_not_receive_superuser_bypass(self):
        user = self.User.objects.create_user(
            username="staff-only",
            password="test-password",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        UserProfile.objects.get_or_create(
            user=user,
            defaults={"display_name": "Staff Only"},
        )

        self.assertFalse(
            user_has_system_permission(
                user,
                "system.companies.view",
            )
        )

    def test_superuser_does_not_bypass_company_membership_boundary(self):
        user = self.User.objects.create_user(
            username="system-owner-without-company",
            password="test-password",
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )

        request = RequestFactory().get("/api/company/")
        request.user = user

        self.assertFalse(request_has_company_access(request))
        self.assertFalse(
            request_has_company_permission(
                request,
                "company.sales.view",
            )
        )

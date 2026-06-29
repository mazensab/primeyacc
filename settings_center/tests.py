# ============================================================
# 📂 settings_center/tests.py
# Mhamcloud | System Settings Center Tests
# ------------------------------------------------------------
# ✅ Backend only
# ✅ Model/service/API tests
# ✅ Uses real mounted API paths under /api/system/settings/
# ✅ No frontend dependency
# ============================================================
from __future__ import annotations
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from .models import SystemSetting
from .services import (
    normalize_setting_value,
    seed_default_system_settings,
    set_system_setting_value,
)
SETTINGS_LIST_URL = "/api/system/settings/"
SETTINGS_SUMMARY_URL = "/api/system/settings/summary/"
SETTINGS_BULK_URL = "/api/system/settings/bulk/"
def setting_reset_url(setting_id: int) -> str:
    return f"/api/system/settings/{setting_id}/reset/"
def make_test_user(*, is_superuser: bool = False, role: str | None = None):
    User = get_user_model()
    username_field = getattr(User, "USERNAME_FIELD", "username")
    base_value = "system-admin@example.com"
    data = {username_field: base_value}
    if hasattr(User, "email"):
        data["email"] = base_value
    user = User(**data)
    if hasattr(user, "set_password"):
        user.set_password("StrongTestPass123!")
    if hasattr(user, "is_active"):
        user.is_active = True
    if hasattr(user, "is_staff"):
        user.is_staff = is_superuser
    if hasattr(user, "is_superuser"):
        user.is_superuser = is_superuser
    if role and hasattr(user, "role"):
        user.role = role
    user.save()
    return user
class SystemSettingServiceTests(TestCase):
    def test_seed_default_system_settings_creates_records(self):
        result = seed_default_system_settings()
        self.assertGreater(result["created"], 0)
        self.assertGreater(SystemSetting.objects.count(), 0)
        self.assertTrue(
            SystemSetting.objects.filter(group="billing", key="default_currency").exists()
        )
    def test_normalize_decimal_value(self):
        self.assertEqual(
            normalize_setting_value(SystemSetting.ValueType.DECIMAL, "15"),
            "15.00",
        )
    def test_invalid_boolean_value_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            normalize_setting_value(SystemSetting.ValueType.BOOLEAN, "not-bool")
    def test_set_system_setting_value_updates_json_value(self):
        seed_default_system_settings()
        setting = SystemSetting.objects.get(group="subscriptions", key="trial_days")
        set_system_setting_value(setting, 30)
        setting.refresh_from_db()
        self.assertEqual(setting.value, 30)
class SystemSettingAPITests(APITestCase):
    def setUp(self):
        self.user = make_test_user(is_superuser=True)
        self.client.force_authenticate(user=self.user)
        seed_default_system_settings(actor=self.user)
    def test_list_settings(self):
        response = self.client.get(SETTINGS_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    def test_summary_settings(self):
        response = self.client.get(SETTINGS_SUMMARY_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(response.data["total"], 0)
        self.assertIn("billing", response.data["groups"])
    def test_bulk_update_setting(self):
        payload = [
            {
                "group": "subscriptions",
                "key": "trial_days",
                "value": 21,
            }
        ]
        response = self.client.patch(SETTINGS_BULK_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        setting = SystemSetting.objects.get(group="subscriptions", key="trial_days")
        self.assertEqual(setting.value, 21)
    def test_reset_setting_to_default(self):
        setting = SystemSetting.objects.get(group="subscriptions", key="trial_days")
        set_system_setting_value(setting, 30, actor=self.user)
        response = self.client.post(setting_reset_url(setting.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        setting.refresh_from_db()
        self.assertEqual(setting.value, 14)
    def test_unauthenticated_user_is_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(SETTINGS_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
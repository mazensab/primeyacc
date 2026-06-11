# ============================================================
# 📂 reports/tests.py
# 🧠 PrimeyAcc | Reports Tests - Phase 16.1
# ------------------------------------------------------------
# ✅ Reports overview service test
# ✅ Reports overview API test
# ✅ Tenant access through active CompanyMembership
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import NOT_PROVIDED
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
)
from companies.models import Company
from reports.services import get_reports_overview


# ============================================================
# 🛠️ Test Helpers
# ============================================================

def _choice_value(model, field_name: str, preferred: str, fallback: str = "") -> str:
    try:
        field = model._meta.get_field(field_name)
    except Exception:
        return fallback

    choices = list(getattr(field, "choices", None) or [])
    values = {str(value) for value, _label in choices}

    if preferred in values:
        return preferred

    if fallback and fallback in values:
        return fallback

    if choices:
        return str(choices[0][0])

    return preferred or fallback


def _required_model_defaults(model, *, suffix: str, user=None) -> dict[str, Any]:
    data: dict[str, Any] = {}

    for field in model._meta.fields:
        if field.primary_key:
            continue

        if field.auto_created:
            continue

        if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
            continue

        field_name = field.name

        if field_name in {
            "id",
            "created_at",
            "updated_at",
            "suspended_at",
            "trial_ends_at",
        }:
            continue

        has_default = field.default is not NOT_PROVIDED
        is_required = not field.null and not field.blank and not has_default

        if field_name in {"name", "name_ar"}:
            data[field_name] = f"شركة تقارير اختبار {suffix}"
            continue

        if field_name == "name_en":
            data[field_name] = f"Reports Test Company {suffix}"
            continue

        if field_name == "company_code":
            data[field_name] = f"REP-TST-{suffix}"
            continue

        if field_name == "email":
            data[field_name] = f"reports-{suffix.lower()}@primeyacc.test"
            continue

        if field_name in {"phone", "mobile", "whatsapp_number"}:
            data[field_name] = "0500000000"
            continue

        if field_name == "country":
            data[field_name] = "Saudi Arabia"
            continue

        if field_name in {"city", "region"}:
            data[field_name] = "Jeddah"
            continue

        if field_name == "district":
            data[field_name] = "Central"
            continue

        if field_name == "street_name":
            data[field_name] = "Reports Street"
            continue

        if field_name == "building_number":
            data[field_name] = "1234"
            continue

        if field_name == "postal_code":
            data[field_name] = "23333"
            continue

        if field_name == "short_address":
            data[field_name] = f"REP{suffix}"
            continue

        if field_name == "commercial_registration":
            data[field_name] = f"CR-REP-{suffix}"
            continue

        if field_name == "tax_number":
            data[field_name] = f"3000000000{suffix}"
            continue

        if field_name == "currency_code":
            data[field_name] = "SAR"
            continue

        if field_name == "vat_percentage":
            data[field_name] = Decimal("15.00")
            continue

        if field_name == "status":
            data[field_name] = _choice_value(model, "status", "ACTIVE", "TRIAL")
            continue

        if field_name == "is_active":
            data[field_name] = True
            continue

        if field_name in {"extra_data", "notes", "address"}:
            if field.get_internal_type() == "JSONField":
                data[field_name] = {}
            else:
                data[field_name] = ""
            continue

        if field_name in {"owner", "created_by", "updated_by"} and user is not None:
            data[field_name] = user
            continue

        if is_required:
            internal_type = field.get_internal_type()

            if internal_type in {"CharField", "TextField", "SlugField"}:
                data[field_name] = f"test-{suffix}"
            elif internal_type == "EmailField":
                data[field_name] = f"fallback-{suffix.lower()}@primeyacc.test"
            elif internal_type == "BooleanField":
                data[field_name] = True
            elif internal_type in {
                "IntegerField",
                "PositiveIntegerField",
                "SmallIntegerField",
            }:
                data[field_name] = 1
            elif internal_type == "DecimalField":
                data[field_name] = Decimal("0.00")
            elif internal_type == "DateField":
                data[field_name] = timezone.localdate()
            elif internal_type == "DateTimeField":
                data[field_name] = timezone.now()
            elif internal_type == "JSONField":
                data[field_name] = {}
            elif (
                internal_type == "ForeignKey"
                and user is not None
                and field_name in {"owner", "created_by", "updated_by"}
            ):
                data[field_name] = user

    return data


def _create_test_company(*, suffix: str, user) -> Company:
    return Company.objects.create(
        **_required_model_defaults(
            Company,
            suffix=suffix,
            user=user,
        )
    )


def _create_active_membership(
    *,
    user,
    company: Company,
    role: str = CompanyRole.OWNER,
    is_primary: bool = True,
) -> CompanyMembership:
    return CompanyMembership.objects.create(
        user=user,
        company=company,
        role=role,
        status=MembershipStatus.ACTIVE,
        is_primary=is_primary,
        joined_at=timezone.now(),
    )


# ============================================================
# 🧪 Reports Tests
# ============================================================

class ReportsFoundationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.owner = User.objects.create_user(
            username="reports_owner",
            email="reports-owner@primeyacc.test",
            password="test-pass-12345",
        )

        cls.company = _create_test_company(
            suffix="001",
            user=cls.owner,
        )

        _create_active_membership(
            user=cls.owner,
            company=cls.company,
            role=CompanyRole.OWNER,
            is_primary=True,
        )

    def test_reports_overview_service_returns_foundation_payload(self):
        overview = get_reports_overview(self.company)

        self.assertEqual(overview["module"], "reports")
        self.assertEqual(overview["phase"], "16.1")
        self.assertEqual(overview["status"], "ready")
        self.assertEqual(overview["company_id"], self.company.pk)
        self.assertEqual(len(overview["available_reports"]), 5)

    def test_reports_overview_api_returns_current_company_context(self):
        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get("/api/company/reports/")

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()

        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company.pk)
        self.assertEqual(body["overview"]["module"], "reports")
        self.assertEqual(body["overview"]["phase"], "16.1")
        self.assertEqual(body["overview"]["status"], "ready")
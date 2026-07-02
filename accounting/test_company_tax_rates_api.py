# -*- coding: utf-8 -*-
"""
accounting/test_company_tax_rates_api.py
Company Tax Rates API tests
"""
from __future__ import annotations
import json
from decimal import Decimal
from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from accounting.models import TaxRate
from accounts.models import CompanyMembership
def _model_fields(model) -> set[str]:
    return {field.name for field in model._meta.get_fields()}
def _create_company(name: str):
    Company = apps.get_model("companies", "Company")
    fields = _model_fields(Company)
    company_index = Company.objects.count() + 1
    unique_code = f"TAXAPI{company_index:04d}"
    payload = {}
    if "company_code" in fields:
        payload["company_code"] = unique_code
    if "name" in fields:
        payload["name"] = name
    if "legal_name" in fields:
        payload["legal_name"] = name
    if "commercial_name" in fields:
        payload["commercial_name"] = name
    if "tax_number" in fields:
        payload["tax_number"] = f"300000{company_index:09d}"
    if "vat_number" in fields:
        payload["vat_number"] = f"300000{company_index:09d}"
    if "commercial_registration" in fields:
        payload["commercial_registration"] = f"101{company_index:07d}"
    if "email" in fields:
        payload["email"] = f"tax-api-{company_index}@example.com"
    if "phone" in fields:
        payload["phone"] = "+966500000000"
    if "status" in fields:
        payload["status"] = "ACTIVE"
    if "is_active" in fields:
        payload["is_active"] = True
    return Company.objects.create(**payload)
def _create_membership(user, company):
    fields = _model_fields(CompanyMembership)
    payload = {
        "user": user,
        "company": company,
    }
    if "role" in fields:
        payload["role"] = "OWNER"
    if "status" in fields:
        payload["status"] = "ACTIVE"
    if "is_active" in fields:
        payload["is_active"] = True
    if "is_primary" in fields:
        payload["is_primary"] = True
    return CompanyMembership.objects.create(**payload)
@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class CompanyTaxRatesApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="tax-api-owner",
            email="tax-api-owner@example.com",
            password="pass12345",
        )
        self.company = _create_company("Tax API Company")
        self.membership = _create_membership(self.user, self.company)
        self.client = Client()
        self.client.force_login(self.user)
        session = self.client.session
        session["company_id"] = self.company.id
        session["current_company_id"] = self.company.id
        session["active_company_id"] = self.company.id
        session.save()
    def test_seed_and_list_tax_rates(self):
        seed_response = self.client.post("/api/company/tax-rates/seed/")
        self.assertEqual(seed_response.status_code, 200)
        seed_data = seed_response.json()
        self.assertTrue(seed_data["success"])
        self.assertEqual(seed_data["count"], 8)
        list_response = self.client.get("/api/company/tax-rates/")
        self.assertEqual(list_response.status_code, 200)
        list_data = list_response.json()
        self.assertTrue(list_data["success"])
        self.assertEqual(list_data["count"], 8)
        self.assertEqual(list_data["summary"]["vat"], 4)
        self.assertEqual(list_data["summary"]["excise"], 4)
        codes = set(
            TaxRate.objects.filter(company=self.company).values_list("code", flat=True)
        )
        self.assertIn("VAT15", codes)
        self.assertIn("EXCISETOBACCO100", codes)
    def test_create_update_deactivate_activate_tax_rate(self):
        payload = {
            "code": "CUSTOM5TEST",
            "name": "ضريبة اختبار 5%",
            "name_en": "Custom Test 5%",
            "tax_type": "CUSTOM",
            "direction": "OUTPUT",
            "rate": "5.0000",
            "calculation_base": "NET",
            "description": "Test custom tax rate.",
            "is_active": True,
            "is_default": False,
            "is_system": False,
        }
        create_response = self.client.post(
            "/api/company/tax-rates/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()["tax_rate"]
        self.assertEqual(created["code"], "CUSTOM5TEST")
        self.assertEqual(created["rate"], "5.0000")
        tax_rate_id = created["id"]
        detail_response = self.client.get(f"/api/company/tax-rates/{tax_rate_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["tax_rate"]["code"], "CUSTOM5TEST")
        patch_response = self.client.patch(
            f"/api/company/tax-rates/{tax_rate_id}/",
            data=json.dumps({"name": "ضريبة اختبار محدثة", "rate": "5.5000"}),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()["tax_rate"]["rate"], "5.5000")
        tax_rate = TaxRate.objects.get(pk=tax_rate_id)
        self.assertEqual(tax_rate.rate, Decimal("5.5000"))
        deactivate_response = self.client.post(
            f"/api/company/tax-rates/{tax_rate_id}/deactivate/"
        )
        self.assertEqual(deactivate_response.status_code, 200)
        self.assertFalse(deactivate_response.json()["tax_rate"]["is_active"])
        activate_response = self.client.post(
            f"/api/company/tax-rates/{tax_rate_id}/activate/"
        )
        self.assertEqual(activate_response.status_code, 200)
        self.assertTrue(activate_response.json()["tax_rate"]["is_active"])
    def test_tax_rates_are_tenant_scoped(self):
        other_company = _create_company("Other Tax Company")
        TaxRate.objects.create(
            company=other_company,
            code="OTHERTAX",
            name="Other Company Tax",
            tax_type="CUSTOM",
            direction="OUTPUT",
            rate=Decimal("9.0000"),
            is_active=True,
        )
        response = self.client.get("/api/company/tax-rates/?search=OTHERTAX")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 0)

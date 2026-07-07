# -*- coding: utf-8 -*-
"""
accounting/test_company_cost_centers_api.py
Company Cost Centers API tests
"""
from __future__ import annotations
import json
from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from accounts.models import CompanyMembership
from accounting.models import CostCenter, CostCenterStatus
def _model_fields(model) -> set[str]:
    return {field.name for field in model._meta.get_fields()}
def _create_company(name: str):
    Company = apps.get_model("companies", "Company")
    fields = _model_fields(Company)
    company_index = Company.objects.count() + 1
    unique_code = f"CCAPI{company_index:04d}"
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
        payload["tax_number"] = f"300001{company_index:09d}"
    if "vat_number" in fields:
        payload["vat_number"] = f"300001{company_index:09d}"
    if "commercial_registration" in fields:
        payload["commercial_registration"] = f"102{company_index:07d}"
    if "email" in fields:
        payload["email"] = f"cost-center-api-{company_index}@example.com"
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
class CompanyCostCentersApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="cost-center-api-owner",
            email="cost-center-api-owner@example.com",
            password="pass12345",
        )
        self.company = _create_company("Cost Center API Company")
        self.other_company = _create_company("Other Cost Center API Company")
        self.membership = _create_membership(self.user, self.company)
        self.group = CostCenter.objects.create(
            company=self.company,
            code="GEN",
            name="عام",
            name_en="General",
            is_group=True,
            status=CostCenterStatus.ACTIVE,
            description="",
        )
        self.admin_center = CostCenter.objects.create(
            company=self.company,
            code="ADM",
            name="الإدارة",
            name_en="Administration",
            parent=self.group,
            is_group=False,
            status=CostCenterStatus.ACTIVE,
            description="",
        )
        self.inactive_center = CostCenter.objects.create(
            company=self.company,
            code="OLD",
            name="قديم",
            name_en="Old",
            parent=self.group,
            is_group=False,
            status=CostCenterStatus.INACTIVE,
            description="",
        )
        self.other_center = CostCenter.objects.create(
            company=self.other_company,
            code="OTH",
            name="شركة أخرى",
            name_en="Other",
            is_group=False,
            status=CostCenterStatus.ACTIVE,
            description="",
        )
        self.client = Client()
        self.client.force_login(self.user)
        session = self.client.session
        session["company_id"] = self.company.id
        session["current_company_id"] = self.company.id
        session["active_company_id"] = self.company.id
        session.save()
    def test_list_cost_centers_is_tenant_scoped(self):
        response = self.client.get("/api/company/accounting/cost-centers/?status=all")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["summary"]["total_cost_centers"], 3)
        self.assertEqual(body["summary"]["active_cost_centers"], 2)
        self.assertEqual(body["summary"]["inactive_cost_centers"], 1)
        self.assertEqual(body["summary"]["postable_cost_centers"], 1)
        codes = {row["code"] for row in body["results"]}
        self.assertIn("GEN", codes)
        self.assertIn("ADM", codes)
        self.assertIn("OLD", codes)
        self.assertNotIn("OTH", codes)
    def test_postable_filter_returns_active_leaf_centers_only(self):
        response = self.client.get("/api/company/accounting/cost-centers/?postable=true")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        codes = {row["code"] for row in body["results"]}
        self.assertEqual(codes, {"ADM"})
    def test_create_cost_center_without_code_generates_code(self):
        response = self.client.post(
            "/api/company/accounting/cost-centers/",
            data=json.dumps(
                {
                    "name": "المشاريع",
                    "name_en": "Projects",
                    "parent_id": self.group.id,
                    "is_group": False,
                    "status": "ACTIVE",
                    "description": "Generated code cost center.",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()["cost_center"]
        self.assertTrue(created["code"].startswith("CC-"))
        self.assertEqual(created["name"], "المشاريع")
        self.assertEqual(created["parent_code"], "GEN")
        self.assertTrue(
            CostCenter.objects.filter(
                company=self.company,
                code=created["code"],
            ).exists()
        )
    def test_create_update_deactivate_activate_cost_center(self):
        create_response = self.client.post(
            "/api/company/accounting/cost-centers/",
            data=json.dumps(
                {
                    "code": "MKT",
                    "name": "التسويق",
                    "name_en": "Marketing",
                    "parent_id": self.group.id,
                    "is_group": False,
                    "status": "ACTIVE",
                    "description": "Marketing cost center.",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 201, create_response.content)
        created = create_response.json()["cost_center"]
        self.assertEqual(created["code"], "MKT")
        self.assertEqual(created["parent_code"], "GEN")
        self.assertTrue(created["can_post"])
        cost_center_id = created["id"]
        detail_response = self.client.get(
            f"/api/company/accounting/cost-centers/{cost_center_id}/"
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["cost_center"]["code"], "MKT")
        patch_response = self.client.patch(
            f"/api/company/accounting/cost-centers/{cost_center_id}/",
            data=json.dumps(
                {
                    "name": "التسويق والمبيعات",
                    "name_en": "Marketing and Sales",
                    "description": "Updated cost center.",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.content)
        self.assertEqual(
            patch_response.json()["cost_center"]["name"],
            "التسويق والمبيعات",
        )
        deactivate_response = self.client.post(
            f"/api/company/accounting/cost-centers/{cost_center_id}/deactivate/"
        )
        self.assertEqual(deactivate_response.status_code, 200)
        self.assertFalse(deactivate_response.json()["cost_center"]["is_active"])
        activate_response = self.client.post(
            f"/api/company/accounting/cost-centers/{cost_center_id}/activate/"
        )
        self.assertEqual(activate_response.status_code, 200)
        self.assertTrue(activate_response.json()["cost_center"]["is_active"])
    def test_create_duplicate_code_is_blocked_inside_company(self):
        response = self.client.post(
            "/api/company/accounting/cost-centers/",
            data=json.dumps(
                {
                    "code": "ADM",
                    "name": "مكرر",
                    "name_en": "Duplicate",
                    "is_group": False,
                    "status": "ACTIVE",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])
    def test_other_company_cost_center_is_not_visible(self):
        response = self.client.get("/api/company/accounting/cost-centers/?status=all&search=OTH")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["count"], 0)

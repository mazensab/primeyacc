# ============================================================
# 📂 catalog/tests.py
# 🧠 PrimeyAcc | Company Catalog Tests V1.4
# ------------------------------------------------------------
# ✅ Catalog models validation tests
# ✅ Catalog service tenant isolation tests
# ✅ Catalog API tenant isolation tests
# ✅ Category/unit/item create helpers tests
# ✅ Prevent cross-company category/unit linking
# ✅ Prevent frontend company_id trust through services and APIs
# ✅ Product/service behavior checks
# ✅ Company catalog permission tests
# ✅ Compatible with current Company model fields
# ✅ Handles unique Company.company_code safely
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل اختبارات الكتالوج يجب أن تثبت العزل بين الشركات
# - لا نعتمد على company_id القادم من البيانات
# - التصنيف والوحدة لا يمكن استخدامهما خارج شركتهما
# - CatalogItem هو الأساس الموحد للمنتجات والخدمات
# - APIs يجب أن تعمل عبر CompanyMembership و HasAnyCompanyPermission
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from companies.models import Company
from catalog.models import (
    CatalogCategoryStatus,
    CatalogItemStatus,
    CatalogItemType,
    CatalogUnitStatus,
)
from catalog.services import (
    CatalogServiceError,
    create_catalog_category,
    create_catalog_item,
    create_catalog_unit,
    filter_items_queryset,
    get_company_categories_queryset,
    get_company_items_queryset,
    get_company_units_queryset,
    serialize_catalog_choices,
    serialize_catalog_item,
    update_catalog_item,
)


User = get_user_model()


def create_test_company(
    *,
    name: str,
    email: str,
    company_code: str,
) -> Company:
    """
    Create a Company using only fields that exist in the current Company model.

    This keeps catalog tests focused on catalog isolation instead of assuming
    optional Company fields such as code or writable display_name.
    """
    company_field_names = {
        field.name
        for field in Company._meta.get_fields()
        if getattr(field, "concrete", False)
    }

    candidate_payload: dict[str, Any] = {
        "company_code": company_code,
        "name": name,
        "legal_name": name,
        "company_name": name,
        "commercial_name": name,
        "email": email,
        "contact_email": email,
        "phone": "0500000000",
        "mobile": "0500000000",
        "country": "Saudi Arabia",
        "city": "Jeddah",
        "currency_code": "SAR",
        "is_active": True,
    }

    payload = {
        key: value
        for key, value in candidate_payload.items()
        if key in company_field_names
    }

    return Company.objects.create(**payload)


def create_test_membership(
    *,
    user,
    company: Company,
    role: str,
    is_primary: bool = True,
) -> CompanyMembership:
    """
    Create an active company membership for API permission tests.
    """
    return CompanyMembership.objects.create(
        user=user,
        company=company,
        role=role,
        status=MembershipStatus.ACTIVE,
        is_primary=is_primary,
    )


class CatalogServiceTests(TestCase):
    """
    Tests for company-scoped catalog services.
    """

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="catalog_user",
            email="catalog@example.com",
            password="StrongPass123!",
        )

        self.company_a = create_test_company(
            name="Catalog Company A",
            email="catalog-a@example.com",
            company_code="CAT-TEST-A",
        )

        self.company_b = create_test_company(
            name="Catalog Company B",
            email="catalog-b@example.com",
            company_code="CAT-TEST-B",
        )

    def test_create_category_is_company_scoped(self) -> None:
        category = create_catalog_category(
            company=self.company_a,
            data={
                "name": "Medical Services",
                "code": "MED",
                "company_id": self.company_b.id,
            },
            user=self.user,
        )

        self.assertEqual(category.company_id, self.company_a.id)
        self.assertEqual(category.code, "MED")
        self.assertEqual(category.status, CatalogCategoryStatus.ACTIVE)
        self.assertEqual(category.created_by_id, self.user.id)

    def test_create_unit_is_company_scoped(self) -> None:
        unit = create_catalog_unit(
            company=self.company_a,
            data={
                "name": "Piece",
                "symbol": "pcs",
                "code": "PCS",
                "company_id": self.company_b.id,
            },
            user=self.user,
        )

        self.assertEqual(unit.company_id, self.company_a.id)
        self.assertEqual(unit.code, "PCS")
        self.assertEqual(unit.status, CatalogUnitStatus.ACTIVE)
        self.assertEqual(unit.created_by_id, self.user.id)

    def test_create_item_is_company_scoped_and_ignores_frontend_company_id(self) -> None:
        category = create_catalog_category(
            company=self.company_a,
            data={"name": "Products"},
            user=self.user,
        )
        unit = create_catalog_unit(
            company=self.company_a,
            data={"name": "Piece", "symbol": "pcs"},
            user=self.user,
        )

        item = create_catalog_item(
            company=self.company_a,
            data={
                "name": "Premium Product",
                "item_type": "PRODUCT",
                "category_id": category.id,
                "unit_id": unit.id,
                "sale_price": "150.50",
                "purchase_price": "100.25",
                "company_id": self.company_b.id,
            },
            user=self.user,
        )

        self.assertEqual(item.company_id, self.company_a.id)
        self.assertEqual(item.category_id, category.id)
        self.assertEqual(item.unit_id, unit.id)
        self.assertEqual(item.item_type, CatalogItemType.PRODUCT)
        self.assertEqual(item.sale_price, Decimal("150.50"))
        self.assertEqual(item.purchase_price, Decimal("100.25"))

    def test_item_cannot_use_category_from_another_company(self) -> None:
        foreign_category = create_catalog_category(
            company=self.company_b,
            data={"name": "Foreign Category"},
            user=self.user,
        )

        with self.assertRaises(CatalogServiceError):
            create_catalog_item(
                company=self.company_a,
                data={
                    "name": "Invalid Product",
                    "category_id": foreign_category.id,
                },
                user=self.user,
            )

    def test_item_cannot_use_unit_from_another_company(self) -> None:
        foreign_unit = create_catalog_unit(
            company=self.company_b,
            data={"name": "Foreign Unit"},
            user=self.user,
        )

        with self.assertRaises(CatalogServiceError):
            create_catalog_item(
                company=self.company_a,
                data={
                    "name": "Invalid Product",
                    "unit_id": foreign_unit.id,
                },
                user=self.user,
            )

    def test_company_querysets_are_isolated(self) -> None:
        create_catalog_category(
            company=self.company_a,
            data={"name": "Company A Category"},
            user=self.user,
        )
        create_catalog_category(
            company=self.company_b,
            data={"name": "Company B Category"},
            user=self.user,
        )

        create_catalog_unit(
            company=self.company_a,
            data={"name": "Company A Unit"},
            user=self.user,
        )
        create_catalog_unit(
            company=self.company_b,
            data={"name": "Company B Unit"},
            user=self.user,
        )

        create_catalog_item(
            company=self.company_a,
            data={"name": "Company A Item"},
            user=self.user,
        )
        create_catalog_item(
            company=self.company_b,
            data={"name": "Company B Item"},
            user=self.user,
        )

        self.assertEqual(
            get_company_categories_queryset(company=self.company_a).count(),
            1,
        )
        self.assertEqual(
            get_company_units_queryset(company=self.company_a).count(),
            1,
        )
        self.assertEqual(
            get_company_items_queryset(company=self.company_a).count(),
            1,
        )

        self.assertEqual(
            get_company_items_queryset(company=self.company_a).first().name,
            "Company A Item",
        )

    def test_duplicate_item_name_is_blocked_inside_same_company(self) -> None:
        create_catalog_item(
            company=self.company_a,
            data={"name": "Duplicated Item"},
            user=self.user,
        )

        with self.assertRaises(CatalogServiceError):
            create_catalog_item(
                company=self.company_a,
                data={"name": "Duplicated Item"},
                user=self.user,
            )

    def test_same_item_name_allowed_across_different_companies(self) -> None:
        item_a = create_catalog_item(
            company=self.company_a,
            data={"name": "Shared Item Name"},
            user=self.user,
        )
        item_b = create_catalog_item(
            company=self.company_b,
            data={"name": "Shared Item Name"},
            user=self.user,
        )

        self.assertNotEqual(item_a.company_id, item_b.company_id)
        self.assertEqual(item_a.name, item_b.name)

    def test_service_item_disables_inventory_tracking(self) -> None:
        service = create_catalog_item(
            company=self.company_a,
            data={
                "name": "Consulting Service",
                "item_type": "SERVICE",
                "track_inventory": True,
            },
            user=self.user,
        )

        self.assertEqual(service.item_type, CatalogItemType.SERVICE)
        self.assertFalse(service.track_inventory)

    def test_update_item_keeps_company_ownership(self) -> None:
        item = create_catalog_item(
            company=self.company_a,
            data={"name": "Original Item"},
            user=self.user,
        )

        updated_item = update_catalog_item(
            item=item,
            data={
                "name": "Updated Item",
                "company_id": self.company_b.id,
                "status": CatalogItemStatus.INACTIVE,
            },
            user=self.user,
        )

        self.assertEqual(updated_item.company_id, self.company_a.id)
        self.assertEqual(updated_item.name, "Updated Item")
        self.assertEqual(updated_item.status, CatalogItemStatus.INACTIVE)

    def test_filter_items_queryset_by_type_and_search(self) -> None:
        create_catalog_item(
            company=self.company_a,
            data={
                "name": "Dental Cleaning",
                "item_type": "SERVICE",
            },
            user=self.user,
        )
        create_catalog_item(
            company=self.company_a,
            data={
                "name": "Toothbrush",
                "item_type": "PRODUCT",
                "sku": "TB-001",
            },
            user=self.user,
        )

        queryset = get_company_items_queryset(company=self.company_a)
        service_results = filter_items_queryset(
            queryset,
            item_type="SERVICE",
            search="Dental",
        )

        self.assertEqual(service_results.count(), 1)
        self.assertEqual(service_results.first().name, "Dental Cleaning")

    def test_serialize_catalog_item_returns_safe_payload(self) -> None:
        category = create_catalog_category(
            company=self.company_a,
            data={"name": "Services"},
            user=self.user,
        )
        unit = create_catalog_unit(
            company=self.company_a,
            data={"name": "Hour", "symbol": "h"},
            user=self.user,
        )
        item = create_catalog_item(
            company=self.company_a,
            data={
                "name": "Consultation",
                "item_type": "SERVICE",
                "category_id": category.id,
                "unit_id": unit.id,
                "sale_price": "250.00",
            },
            user=self.user,
        )

        payload = serialize_catalog_item(item)

        self.assertEqual(payload["id"], item.id)
        self.assertEqual(payload["company_id"], self.company_a.id)
        self.assertEqual(payload["category_name"], "Services")
        self.assertEqual(payload["unit_symbol"], "h")
        self.assertEqual(payload["sale_price"], "250.00")
        self.assertTrue(payload["is_service"])

    def test_serialize_catalog_choices_contains_expected_groups(self) -> None:
        choices = serialize_catalog_choices()

        self.assertIn("category_statuses", choices)
        self.assertIn("unit_statuses", choices)
        self.assertIn("item_types", choices)
        self.assertIn("item_statuses", choices)


class CatalogApiTests(TestCase):
    """
    Tests for company-scoped catalog APIs.
    """

    def setUp(self) -> None:
        self.client = APIClient()

        self.allowed_user = User.objects.create_user(
            username="catalog_api_allowed",
            email="catalog-api-allowed@example.com",
            password="StrongPass123!",
        )
        self.viewer_user = User.objects.create_user(
            username="catalog_api_viewer",
            email="catalog-api-viewer@example.com",
            password="StrongPass123!",
        )
        self.denied_user = User.objects.create_user(
            username="catalog_api_denied",
            email="catalog-api-denied@example.com",
            password="StrongPass123!",
        )
        self.no_membership_user = User.objects.create_user(
            username="catalog_api_no_membership",
            email="catalog-api-no-membership@example.com",
            password="StrongPass123!",
        )

        self.company_a = create_test_company(
            name="Catalog API Company A",
            email="catalog-api-a@example.com",
            company_code="CAT-API-A",
        )
        self.company_b = create_test_company(
            name="Catalog API Company B",
            email="catalog-api-b@example.com",
            company_code="CAT-API-B",
        )

        self.allowed_membership = create_test_membership(
            user=self.allowed_user,
            company=self.company_a,
            role=CompanyRole.INVENTORY,
            is_primary=True,
        )
        self.viewer_membership = create_test_membership(
            user=self.viewer_user,
            company=self.company_a,
            role=CompanyRole.VIEWER,
            is_primary=True,
        )
        self.denied_membership = create_test_membership(
            user=self.denied_user,
            company=self.company_a,
            role=CompanyRole.EMPLOYEE,
            is_primary=True,
        )

    def test_api_user_without_membership_cannot_access_categories(self) -> None:
        self.client.force_login(self.no_membership_user)

        response = self.client.get("/api/company/categories/")

        self.assertIn(response.status_code, [401, 403])

    def test_api_user_without_catalog_permission_cannot_access_categories(self) -> None:
        self.client.force_login(self.denied_user)

        response = self.client.get("/api/company/categories/")

        self.assertEqual(response.status_code, 403)

    def test_api_can_list_categories_with_view_permission(self) -> None:
        create_catalog_category(
            company=self.company_a,
            data={"name": "API Category A"},
            user=self.allowed_user,
        )
        create_catalog_category(
            company=self.company_b,
            data={"name": "API Category B"},
            user=self.allowed_user,
        )

        self.client.force_login(self.viewer_user)

        response = self.client.get("/api/company/categories/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        names = [item["name"] for item in payload["results"]]

        self.assertTrue(payload["success"])
        self.assertIn("API Category A", names)
        self.assertNotIn("API Category B", names)

    def test_api_can_create_category_and_ignore_frontend_company_id(self) -> None:
        self.client.force_login(self.allowed_user)

        response = self.client.post(
            "/api/company/categories/create/",
            {
                "name": "Created API Category",
                "code": "API-CAT",
                "company_id": self.company_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["item"]["company_id"], self.company_a.id)
        self.assertEqual(payload["item"]["name"], "Created API Category")

    def test_api_viewer_cannot_create_category(self) -> None:
        self.client.force_login(self.viewer_user)

        response = self.client.post(
            "/api/company/categories/create/",
            {
                "name": "Viewer Category",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_api_can_list_units_with_view_permission(self) -> None:
        create_catalog_unit(
            company=self.company_a,
            data={"name": "API Unit A", "symbol": "a"},
            user=self.allowed_user,
        )
        create_catalog_unit(
            company=self.company_b,
            data={"name": "API Unit B", "symbol": "b"},
            user=self.allowed_user,
        )

        self.client.force_login(self.viewer_user)

        response = self.client.get("/api/company/units/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        names = [item["name"] for item in payload["results"]]

        self.assertTrue(payload["success"])
        self.assertIn("API Unit A", names)
        self.assertNotIn("API Unit B", names)

    def test_api_can_create_unit_and_ignore_frontend_company_id(self) -> None:
        self.client.force_login(self.allowed_user)

        response = self.client.post(
            "/api/company/units/create/",
            {
                "name": "Created API Unit",
                "symbol": "cau",
                "code": "API-UNIT",
                "company_id": self.company_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["item"]["company_id"], self.company_a.id)
        self.assertEqual(payload["item"]["name"], "Created API Unit")

    def test_api_viewer_cannot_create_unit(self) -> None:
        self.client.force_login(self.viewer_user)

        response = self.client.post(
            "/api/company/units/create/",
            {
                "name": "Viewer Unit",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_api_can_list_products_with_view_permission(self) -> None:
        create_catalog_item(
            company=self.company_a,
            data={"name": "API Product A", "item_type": "PRODUCT"},
            user=self.allowed_user,
        )
        create_catalog_item(
            company=self.company_b,
            data={"name": "API Product B", "item_type": "PRODUCT"},
            user=self.allowed_user,
        )

        self.client.force_login(self.viewer_user)

        response = self.client.get("/api/company/products/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        names = [item["name"] for item in payload["results"]]

        self.assertTrue(payload["success"])
        self.assertIn("API Product A", names)
        self.assertNotIn("API Product B", names)

    def test_api_can_create_product_and_ignore_frontend_company_id(self) -> None:
        category = create_catalog_category(
            company=self.company_a,
            data={"name": "API Product Category"},
            user=self.allowed_user,
        )
        unit = create_catalog_unit(
            company=self.company_a,
            data={"name": "API Product Unit", "symbol": "apu"},
            user=self.allowed_user,
        )

        self.client.force_login(self.allowed_user)

        response = self.client.post(
            "/api/company/products/create/",
            {
                "name": "Created API Product",
                "item_type": "PRODUCT",
                "category_id": category.id,
                "unit_id": unit.id,
                "sale_price": "99.99",
                "company_id": self.company_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["item"]["company_id"], self.company_a.id)
        self.assertEqual(payload["item"]["name"], "Created API Product")
        self.assertEqual(payload["item"]["category_id"], category.id)
        self.assertEqual(payload["item"]["unit_id"], unit.id)

    def test_api_cannot_create_product_with_foreign_category(self) -> None:
        foreign_category = create_catalog_category(
            company=self.company_b,
            data={"name": "Foreign API Category"},
            user=self.allowed_user,
        )

        self.client.force_login(self.allowed_user)

        response = self.client.post(
            "/api/company/products/create/",
            {
                "name": "Invalid API Product",
                "category_id": foreign_category.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_api_cannot_create_product_with_foreign_unit(self) -> None:
        foreign_unit = create_catalog_unit(
            company=self.company_b,
            data={"name": "Foreign API Unit"},
            user=self.allowed_user,
        )

        self.client.force_login(self.allowed_user)

        response = self.client.post(
            "/api/company/products/create/",
            {
                "name": "Invalid API Product Unit",
                "unit_id": foreign_unit.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_api_viewer_cannot_create_product(self) -> None:
        self.client.force_login(self.viewer_user)

        response = self.client.post(
            "/api/company/products/create/",
            {
                "name": "Viewer Product",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
    
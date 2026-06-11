# ============================================================
# 📂 documents/tests.py
# 🧠 PrimeyAcc | Documents Templates Tests V1.1
# ------------------------------------------------------------
# ✅ Document template services tests
# ✅ Company document templates API tests
# ✅ Tenant isolation
# ✅ Default template behavior
# ✅ Activation / deactivation rules
# ✅ Viewer read-only permission behavior
# ============================================================

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from companies.models import Company
from documents.models import DocumentTemplate, DocumentType
from documents.services import (
    activate_document_template,
    create_document_template,
    deactivate_document_template,
    get_company_document_template_or_raise,
    get_company_document_templates,
    get_default_document_template,
    set_default_document_template,
    update_document_template,
)


User = get_user_model()


def create_test_company(*, name: str, code: str, email: str, phone: str) -> Company:
    return Company.objects.create(
        name=name,
        company_code=code,
        email=email,
        phone=phone,
    )


class DocumentTemplateServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="documents_owner",
            email="documents_owner@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="documents_other",
            email="documents_other@example.com",
            password="StrongPass123!",
        )

        self.company = create_test_company(
            name="Documents Company",
            code="DOCS-001",
            email="documents@example.com",
            phone="0500000000",
        )
        self.other_company = create_test_company(
            name="Other Documents Company",
            code="DOCS-002",
            email="other-documents@example.com",
            phone="0500000001",
        )

    def test_create_document_template(self):
        template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Standard Sales Invoice",
                "document_type": DocumentType.SALES_INVOICE,
                "layout_style": "STANDARD",
                "is_default": True,
            },
        )

        self.assertEqual(template.company, self.company)
        self.assertEqual(template.created_by, self.user)
        self.assertEqual(template.updated_by, self.user)
        self.assertTrue(template.is_default)
        self.assertTrue(template.is_active)

    def test_create_document_template_requires_name(self):
        with self.assertRaises(ValidationError):
            create_document_template(
                company=self.company,
                user=self.user,
                data={
                    "document_type": DocumentType.SALES_INVOICE,
                },
            )

    def test_create_document_template_requires_valid_document_type(self):
        with self.assertRaises(ValidationError):
            create_document_template(
                company=self.company,
                user=self.user,
                data={
                    "name": "Invalid Template",
                    "document_type": "INVALID_TYPE",
                },
            )

    def test_only_one_default_template_per_company_and_type(self):
        first_template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "First Sales Invoice",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )

        second_template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Second Sales Invoice",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )

        first_template.refresh_from_db()
        second_template.refresh_from_db()

        self.assertFalse(first_template.is_default)
        self.assertTrue(second_template.is_default)

    def test_default_template_is_scoped_by_company(self):
        company_template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Company Sales Invoice",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )
        other_company_template = create_document_template(
            company=self.other_company,
            user=self.other_user,
            data={
                "name": "Other Company Sales Invoice",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )

        self.assertEqual(
            get_default_document_template(
                company=self.company,
                document_type=DocumentType.SALES_INVOICE,
            ),
            company_template,
        )
        self.assertEqual(
            get_default_document_template(
                company=self.other_company,
                document_type=DocumentType.SALES_INVOICE,
            ),
            other_company_template,
        )

    def test_get_company_document_templates_is_tenant_scoped(self):
        create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Company Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )
        create_document_template(
            company=self.other_company,
            user=self.other_user,
            data={
                "name": "Other Company Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        templates = list(get_company_document_templates(company=self.company))

        self.assertEqual(len(templates), 1)
        self.assertEqual(templates[0].company, self.company)
        self.assertEqual(templates[0].name, "Company Template")

    def test_get_company_document_template_or_raise_blocks_cross_company_access(self):
        template = create_document_template(
            company=self.other_company,
            user=self.other_user,
            data={
                "name": "Other Company Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        with self.assertRaises(ValidationError):
            get_company_document_template_or_raise(
                company=self.company,
                template_id=template.id,
            )

    def test_update_document_template(self):
        template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Old Name",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        updated_template = update_document_template(
            company=self.company,
            template_id=template.id,
            user=self.user,
            data={
                "name": "New Name",
                "footer_text": "Thank you",
                "primary_color": "#000000",
            },
        )

        self.assertEqual(updated_template.name, "New Name")
        self.assertEqual(updated_template.footer_text, "Thank you")
        self.assertEqual(updated_template.primary_color, "#000000")

    def test_set_default_document_template(self):
        first_template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "First Template",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )
        second_template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Second Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        set_default_document_template(
            company=self.company,
            template_id=second_template.id,
            user=self.user,
        )

        first_template.refresh_from_db()
        second_template.refresh_from_db()

        self.assertFalse(first_template.is_default)
        self.assertTrue(second_template.is_default)

    def test_inactive_template_cannot_be_set_as_default(self):
        template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Inactive Template",
                "document_type": DocumentType.SALES_INVOICE,
                "is_active": False,
            },
        )

        with self.assertRaises(ValidationError):
            set_default_document_template(
                company=self.company,
                template_id=template.id,
                user=self.user,
            )

    def test_default_template_cannot_be_deactivated(self):
        template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Default Template",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )

        with self.assertRaises(ValidationError):
            deactivate_document_template(
                company=self.company,
                template_id=template.id,
                user=self.user,
            )

    def test_non_default_template_can_be_deactivated_and_activated(self):
        template = create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Optional Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        deactivated_template = deactivate_document_template(
            company=self.company,
            template_id=template.id,
            user=self.user,
        )

        self.assertFalse(deactivated_template.is_active)

        activated_template = activate_document_template(
            company=self.company,
            template_id=template.id,
            user=self.user,
        )

        self.assertTrue(activated_template.is_active)

    def test_document_type_filter(self):
        create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "Sales Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )
        create_document_template(
            company=self.company,
            user=self.user,
            data={
                "name": "POS Template",
                "document_type": DocumentType.POS_RECEIPT,
            },
        )

        templates = list(
            get_company_document_templates(
                company=self.company,
                document_type=DocumentType.POS_RECEIPT,
            )
        )

        self.assertEqual(len(templates), 1)
        self.assertEqual(templates[0].document_type, DocumentType.POS_RECEIPT)


class CompanyDocumentTemplatesAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            username="api_documents_owner",
            email="api_documents_owner@example.com",
            password="StrongPass123!",
        )
        self.viewer = User.objects.create_user(
            username="api_documents_viewer",
            email="api_documents_viewer@example.com",
            password="StrongPass123!",
        )
        self.other_owner = User.objects.create_user(
            username="api_documents_other_owner",
            email="api_documents_other_owner@example.com",
            password="StrongPass123!",
        )

        self.company = create_test_company(
            name="API Documents Company",
            code="API-DOCS-001",
            email="api-documents@example.com",
            phone="0510000000",
        )
        self.other_company = create_test_company(
            name="Other API Documents Company",
            code="API-DOCS-002",
            email="api-other-documents@example.com",
            phone="0510000001",
        )

        CompanyMembership.objects.create(
            user=self.owner,
            company=self.company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )
        CompanyMembership.objects.create(
            user=self.other_owner,
            company=self.other_company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

    def auth_owner(self):
        self.client.force_login(self.owner)

    def auth_viewer(self):
        self.client.force_login(self.viewer)

    def auth_other_owner(self):
        self.client.force_login(self.other_owner)

    def company_headers(self, company: Company | None = None) -> dict:
        selected_company = company or self.company
        return {"HTTP_X_COMPANY_ID": str(selected_company.id)}

    def test_owner_can_create_document_template(self):
        self.auth_owner()

        response = self.client.post(
            "/api/company/documents/templates/",
            data={
                "name": "API Sales Invoice",
                "document_type": DocumentType.SALES_INVOICE,
                "layout_style": "MODERN",
                "is_default": True,
            },
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "API Sales Invoice")
        self.assertEqual(response.data["company_id"], self.company.id)
        self.assertTrue(response.data["is_default"])

    def test_owner_can_list_company_document_templates(self):
        self.auth_owner()

        create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "API List Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        response = self.client.get(
            "/api/company/documents/templates/",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "API List Template")

    def test_owner_can_filter_templates_by_document_type(self):
        self.auth_owner()

        create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Sales API Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )
        create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "POS API Template",
                "document_type": DocumentType.POS_RECEIPT,
            },
        )

        response = self.client.get(
            "/api/company/documents/templates/?document_type=POS_RECEIPT",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "POS API Template")

    def test_owner_can_get_document_template_detail(self):
        self.auth_owner()

        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Detail API Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        response = self.client.get(
            f"/api/company/documents/templates/{template.id}/",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], template.id)
        self.assertEqual(response.data["name"], "Detail API Template")

    def test_owner_can_update_document_template(self):
        self.auth_owner()

        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Before Update API Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        response = self.client.patch(
            f"/api/company/documents/templates/{template.id}/",
            data={
                "name": "After Update API Template",
                "footer_text": "Updated by API",
            },
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "After Update API Template")
        self.assertEqual(response.data["footer_text"], "Updated by API")

    def test_owner_can_set_default_document_template(self):
        self.auth_owner()

        first_template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "First API Default",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )
        second_template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Second API Default",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        response = self.client.post(
            f"/api/company/documents/templates/{second_template.id}/set-default/",
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        first_template.refresh_from_db()
        second_template.refresh_from_db()

        self.assertFalse(first_template.is_default)
        self.assertTrue(second_template.is_default)

    def test_owner_can_get_default_template(self):
        self.auth_owner()

        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Default API Template",
                "document_type": DocumentType.SALES_INVOICE,
                "is_default": True,
            },
        )

        response = self.client.get(
            "/api/company/documents/templates/default/?document_type=SALES_INVOICE",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], template.id)
        self.assertEqual(response.data["is_default"], True)

    def test_api_blocks_cross_company_template_detail(self):
        self.auth_owner()

        other_template = create_document_template(
            company=self.other_company,
            user=self.other_owner,
            data={
                "name": "Other Company Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        response = self.client.get(
            f"/api/company/documents/templates/{other_template.id}/",
            **self.company_headers(self.company),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_viewer_can_list_templates(self):
        create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Viewer Read Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        self.auth_viewer()

        response = self.client.get(
            "/api/company/documents/templates/",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_viewer_cannot_create_template(self):
        self.auth_viewer()

        response = self.client.post(
            "/api/company/documents/templates/",
            data={
                "name": "Viewer Create Blocked",
                "document_type": DocumentType.SALES_INVOICE,
            },
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_update_template(self):
        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Viewer Update Blocked",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        self.auth_viewer()

        response = self.client.patch(
            f"/api/company/documents/templates/{template.id}/",
            data={
                "name": "Viewer Should Not Update",
            },
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_set_default_template(self):
        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Viewer Set Default Blocked",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        self.auth_viewer()

        response = self.client.post(
            f"/api/company/documents/templates/{template.id}/set-default/",
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    def test_owner_can_deactivate_document_template(self):
        self.auth_owner()

        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Deactivate API Template",
                "document_type": DocumentType.SALES_INVOICE,
            },
        )

        response = self.client.post(
            f"/api/company/documents/templates/{template.id}/deactivate/",
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        template.refresh_from_db()
        self.assertFalse(template.is_active)

    def test_owner_can_activate_document_template(self):
        self.auth_owner()

        template = create_document_template(
            company=self.company,
            user=self.owner,
            data={
                "name": "Activate API Template",
                "document_type": DocumentType.SALES_INVOICE,
                "is_active": False,
            },
        )

        response = self.client.post(
            f"/api/company/documents/templates/{template.id}/activate/",
            format="json",
            **self.company_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        template.refresh_from_db()
        self.assertTrue(template.is_active)


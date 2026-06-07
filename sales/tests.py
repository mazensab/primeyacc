# ============================================================
# 📂 sales/tests.py
# 🧠 PrimeyAcc | Sales Tests V1.2
# ------------------------------------------------------------
# ✅ Sales invoice model tests
# ✅ Sales invoice services tests
# ✅ Sales invoice API tests
# ✅ Sales invoices summary API tests
# ✅ Tenant isolation validation
# ✅ Customer validation
# ✅ Catalog item validation
# ✅ Totals calculation
# ✅ Issue / cancel lifecycle
# ✅ Company permissions through CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - نختبر الأساس قبل إغلاق APIs
# - لا نعتمد على company_id من الواجهة كمصدر ثقة
# - كل فاتورة وبند يجب أن يبقيا داخل نفس الشركة
# - APIs يجب أن تعتمد على CompanyMembership/request.company
# - هذه المرحلة لا تختبر محاسبة أو مخزون أو مدفوعات
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from catalog.models import CatalogItem, CatalogItemStatus, CatalogItemType, CatalogUnit
from companies.models import Branch, Company, CompanySettings
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from sales.models import (
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoicePaymentStatus,
    SalesInvoiceStatus,
)
from sales.services import (
    cancel_sales_invoice,
    create_sales_invoice,
    create_sales_invoice_item,
    generate_invoice_number,
    issue_sales_invoice,
    resolve_catalog_item,
    resolve_company_branch,
    resolve_customer,
    serialize_sales_invoice,
)


User = get_user_model()


class SalesTestCase(TestCase):
    """
    Shared setup for sales tests.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="sales_owner",
            email="sales_owner@example.com",
            password="StrongPass123!",
        )

        self.other_user = User.objects.create_user(
            username="other_sales_owner",
            email="other_sales_owner@example.com",
            password="StrongPass123!",
        )

        self.viewer_user = User.objects.create_user(
            username="sales_viewer",
            email="sales_viewer@example.com",
            password="StrongPass123!",
        )

        self.company = Company.objects.create(
            name="Primey Sales Company",
            company_code="SALES-001",
            status="ACTIVE",
            is_active=True,
            currency_code="SAR",
            vat_percentage=Decimal("15.00"),
            owner=self.user,
            created_by=self.user,
        )

        CompanySettings.objects.create(
            company=self.company,
            invoice_prefix="INV",
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_company = Company.objects.create(
            name="Other Company",
            company_code="SALES-002",
            status="ACTIVE",
            is_active=True,
            currency_code="SAR",
            vat_percentage=Decimal("15.00"),
            owner=self.other_user,
            created_by=self.other_user,
        )

        CompanySettings.objects.create(
            company=self.other_company,
            invoice_prefix="OTH",
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        self.membership = CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
        )

        self.other_membership = CompanyMembership.objects.create(
            user=self.other_user,
            company=self.other_company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.other_user,
        )

        self.viewer_membership = CompanyMembership.objects.create(
            user=self.viewer_user,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
        )

        self.branch = Branch.objects.create(
            company=self.company,
            name="Main Branch",
            branch_code="BR-001",
            is_default=True,
            is_active=True,
            status="ACTIVE",
            created_by=self.user,
        )

        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Branch",
            branch_code="BR-999",
            is_default=True,
            is_active=True,
            status="ACTIVE",
            created_by=self.other_user,
        )

        self.customer = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.CUSTOMER,
            status=BusinessPartyStatus.ACTIVE,
            code="CUS-001",
            display_name="Customer One",
            phone="0500000001",
            vat_number="300000000000003",
            created_by=self.user,
        )

        self.supplier = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.SUPPLIER,
            status=BusinessPartyStatus.ACTIVE,
            code="SUP-001",
            display_name="Supplier One",
            created_by=self.user,
        )

        self.other_customer = BusinessParty.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            party_type=BusinessPartyType.CUSTOMER,
            status=BusinessPartyStatus.ACTIVE,
            code="CUS-999",
            display_name="Other Customer",
            created_by=self.other_user,
        )

        self.unit = CatalogUnit.objects.create(
            company=self.company,
            code="PCS",
            name="Piece",
            symbol="pcs",
            created_by=self.user,
        )

        self.other_unit = CatalogUnit.objects.create(
            company=self.other_company,
            code="OPCS",
            name="Other Piece",
            symbol="opcs",
            created_by=self.other_user,
        )

        self.item = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            code="ITEM-001",
            name="Sales Item",
            sale_price=Decimal("100.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_sellable=True,
            created_by=self.user,
        )

        self.service = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.SERVICE,
            status=CatalogItemStatus.ACTIVE,
            code="SRV-001",
            name="Consulting Service",
            sale_price=Decimal("200.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_sellable=True,
            created_by=self.user,
        )

        self.other_item = CatalogItem.objects.create(
            company=self.other_company,
            unit=self.other_unit,
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            code="ITEM-999",
            name="Other Item",
            sale_price=Decimal("999.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_sellable=True,
            created_by=self.other_user,
        )


class SalesModelTests(SalesTestCase):
    """
    Tests for SalesInvoice and SalesInvoiceItem model behavior.
    """

    def test_invoice_model_validates_branch_company(self):
        invoice = SalesInvoice(
            company=self.company,
            branch=self.other_branch,
            customer=self.customer,
            invoice_number="INV-2026-000001",
            invoice_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            invoice.full_clean()

    def test_invoice_model_validates_customer_company(self):
        invoice = SalesInvoice(
            company=self.company,
            branch=self.branch,
            customer=self.other_customer,
            invoice_number="INV-2026-000001",
            invoice_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            invoice.full_clean()

    def test_invoice_model_rejects_supplier_as_customer(self):
        invoice = SalesInvoice(
            company=self.company,
            branch=self.branch,
            customer=self.supplier,
            invoice_number="INV-2026-000001",
            invoice_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            invoice.full_clean()

    def test_invoice_item_calculates_totals(self):
        invoice = SalesInvoice.objects.create(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice_number="INV-2026-000001",
            invoice_date=timezone.localdate(),
            created_by=self.user,
        )

        item = SalesInvoiceItem.objects.create(
            invoice=invoice,
            company=self.company,
            catalog_item=self.item,
            line_number=1,
            quantity=Decimal("2.0000"),
            unit_price=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
        )

        item.refresh_from_db()
        invoice.refresh_from_db()

        self.assertEqual(item.line_subtotal, Decimal("200.00"))
        self.assertEqual(item.discount_amount, Decimal("10.00"))
        self.assertEqual(item.taxable_amount, Decimal("190.00"))
        self.assertEqual(item.tax_amount, Decimal("28.50"))
        self.assertEqual(item.line_total, Decimal("218.50"))

        self.assertEqual(invoice.subtotal, Decimal("200.00"))
        self.assertEqual(invoice.discount_amount, Decimal("10.00"))
        self.assertEqual(invoice.taxable_amount, Decimal("190.00"))
        self.assertEqual(invoice.tax_amount, Decimal("28.50"))
        self.assertEqual(invoice.total_amount, Decimal("218.50"))
        self.assertEqual(invoice.balance_due, Decimal("218.50"))
        self.assertEqual(invoice.payment_status, SalesInvoicePaymentStatus.UNPAID)

    def test_invoice_item_rejects_other_company_catalog_item(self):
        invoice = SalesInvoice.objects.create(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice_number="INV-2026-000001",
            invoice_date=timezone.localdate(),
            created_by=self.user,
        )

        item = SalesInvoiceItem(
            invoice=invoice,
            company=self.company,
            catalog_item=self.other_item,
            line_number=1,
            quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()


class SalesServicesTests(SalesTestCase):
    """
    Tests for sales/services.py behavior.
    """

    def test_generate_invoice_number_uses_company_prefix_and_year(self):
        invoice_number = generate_invoice_number(
            self.company,
            invoice_date=timezone.localdate(),
        )

        self.assertTrue(invoice_number.startswith(f"INV-{timezone.localdate().year}-"))
        self.assertTrue(invoice_number.endswith("000001"))

    def test_resolve_company_branch_returns_default_branch(self):
        branch = resolve_company_branch(self.company)

        self.assertEqual(branch, self.branch)

    def test_resolve_company_branch_rejects_other_company_branch(self):
        with self.assertRaises(ValidationError):
            resolve_company_branch(self.company, self.other_branch.id)

    def test_resolve_customer_accepts_active_customer(self):
        customer = resolve_customer(self.company, self.customer.id)

        self.assertEqual(customer, self.customer)

    def test_resolve_customer_rejects_supplier(self):
        with self.assertRaises(ValidationError):
            resolve_customer(self.company, self.supplier.id)

    def test_resolve_customer_rejects_other_company_customer(self):
        with self.assertRaises(ValidationError):
            resolve_customer(self.company, self.other_customer.id)

    def test_resolve_catalog_item_accepts_active_sellable_item(self):
        catalog_item = resolve_catalog_item(self.company, self.item.id)

        self.assertEqual(catalog_item, self.item)

    def test_resolve_catalog_item_rejects_other_company_item(self):
        with self.assertRaises(ValidationError):
            resolve_catalog_item(self.company, self.other_item.id)

    def test_create_sales_invoice_with_items(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "2",
                    "discount_amount": "10.00",
                },
                {
                    "catalog_item_id": self.service.id,
                    "quantity": "1",
                    "unit_price": "250.00",
                    "tax_rate": "15.00",
                },
            ],
            public_notes="Customer note",
        )

        invoice.refresh_from_db()

        self.assertEqual(invoice.company, self.company)
        self.assertEqual(invoice.branch, self.branch)
        self.assertEqual(invoice.customer, self.customer)
        self.assertEqual(invoice.status, SalesInvoiceStatus.DRAFT)
        self.assertEqual(invoice.items.count(), 2)
        self.assertEqual(invoice.subtotal, Decimal("450.00"))
        self.assertEqual(invoice.discount_amount, Decimal("10.00"))
        self.assertEqual(invoice.taxable_amount, Decimal("440.00"))
        self.assertEqual(invoice.tax_amount, Decimal("66.00"))
        self.assertEqual(invoice.total_amount, Decimal("506.00"))
        self.assertEqual(invoice.balance_due, Decimal("506.00"))
        self.assertEqual(invoice.customer_snapshot["display_name"], "Customer One")
        self.assertEqual(invoice.public_notes, "Customer note")

    def test_create_sales_invoice_item_rejects_issued_invoice(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            create_sales_invoice_item(
                invoice=invoice,
                company=self.company,
                payload={
                    "catalog_item_id": self.service.id,
                    "quantity": "1",
                },
            )

    def test_issue_sales_invoice(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        invoice.refresh_from_db()

        self.assertEqual(invoice.status, SalesInvoiceStatus.ISSUED)
        self.assertIsNotNone(invoice.issued_at)
        self.assertEqual(invoice.issued_by, self.user)

    def test_issue_sales_invoice_rejects_empty_invoice(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[],
        )

        with self.assertRaises(ValidationError):
            issue_sales_invoice(
                company=self.company,
                invoice=invoice,
                user=self.user,
            )

    def test_cancel_sales_invoice(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        invoice = cancel_sales_invoice(
            company=self.company,
            invoice=invoice,
            reason="Customer requested cancellation",
            user=self.user,
        )

        invoice.refresh_from_db()

        self.assertEqual(invoice.status, SalesInvoiceStatus.CANCELLED)
        self.assertIsNotNone(invoice.cancelled_at)
        self.assertEqual(invoice.cancelled_by, self.user)
        self.assertEqual(invoice.cancelled_reason, "Customer requested cancellation")

    def test_cancel_sales_invoice_rejects_draft_invoice(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        with self.assertRaises(ValidationError):
            cancel_sales_invoice(
                company=self.company,
                invoice=invoice,
                reason="Invalid cancellation",
                user=self.user,
            )

    def test_serialize_sales_invoice_with_items(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        data = serialize_sales_invoice(invoice, include_items=True)

        self.assertEqual(data["id"], invoice.id)
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["customer"]["display_name"], "Customer One")
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["item_name"], "Sales Item")
        self.assertEqual(data["total_amount"], "115.00")


class SalesInvoicesAPITests(SalesTestCase):
    """
    Tests for /api/company/sales/invoices/ endpoints.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_invoice_for_api(self) -> SalesInvoice:
        return create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
            public_notes="API test invoice",
        )

    def test_sales_invoices_list_returns_current_company_only(self):
        invoice = self._create_invoice_for_api()

        create_sales_invoice(
            company=self.other_company,
            user=self.other_user,
            customer_id=self.other_customer.id,
            items=[
                {
                    "catalog_item_id": self.other_item.id,
                    "quantity": "1",
                }
            ],
        )

        response = self.client.get("/api/company/sales/invoices/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], invoice.id)
        self.assertEqual(payload["results"][0]["company_id"], self.company.id)

    def test_sales_invoices_list_supports_search(self):
        invoice = self._create_invoice_for_api()

        response = self.client.get(
            "/api/company/sales/invoices/",
            {
                "search": invoice.invoice_number,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["invoice_number"], invoice.invoice_number)

    def test_sales_invoice_create_endpoint_creates_draft_invoice(self):
        response = self.client.post(
            "/api/company/sales/invoices/create/",
            data={
                "customer_id": self.customer.id,
                "items": [
                    {
                        "catalog_item_id": self.item.id,
                        "quantity": "2",
                        "discount_amount": "10.00",
                    }
                ],
                "public_notes": "Created from API",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["status"], SalesInvoiceStatus.DRAFT)
        self.assertEqual(payload["invoice"]["customer"]["id"], self.customer.id)
        self.assertEqual(payload["invoice"]["total_amount"], "218.50")
        self.assertEqual(len(payload["invoice"]["items"]), 1)

        invoice = SalesInvoice.objects.get(id=payload["invoice"]["id"])
        self.assertEqual(invoice.company, self.company)
        self.assertEqual(invoice.created_by, self.user)

    def test_sales_invoice_create_endpoint_can_issue_now(self):
        response = self.client.post(
            "/api/company/sales/invoices/create/",
            data={
                "customer_id": self.customer.id,
                "issue_now": True,
                "items": [
                    {
                        "catalog_item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["status"], SalesInvoiceStatus.ISSUED)
        self.assertIsNotNone(payload["invoice"]["issued_at"])

    def test_sales_invoice_create_rejects_other_company_catalog_item(self):
        response = self.client.post(
            "/api/company/sales/invoices/create/",
            data={
                "customer_id": self.customer.id,
                "items": [
                    {
                        "catalog_item_id": self.other_item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_sales_invoice_detail_endpoint_returns_items(self):
        invoice = self._create_invoice_for_api()

        response = self.client.get(f"/api/company/sales/invoices/{invoice.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["id"], invoice.id)
        self.assertEqual(len(payload["invoice"]["items"]), 1)
        self.assertEqual(payload["invoice"]["items"][0]["item_name"], "Sales Item")

    def test_sales_invoice_detail_blocks_cross_company_access(self):
        other_invoice = create_sales_invoice(
            company=self.other_company,
            user=self.other_user,
            customer_id=self.other_customer.id,
            items=[
                {
                    "catalog_item_id": self.other_item.id,
                    "quantity": "1",
                }
            ],
        )

        response = self.client.get(f"/api/company/sales/invoices/{other_invoice.id}/")

        self.assertEqual(response.status_code, 404)

    def test_sales_invoice_update_endpoint_updates_draft_invoice(self):
        invoice = self._create_invoice_for_api()

        response = self.client.patch(
            f"/api/company/sales/invoices/{invoice.id}/update/",
            data={
                "public_notes": "Updated notes",
                "items": [
                    {
                        "catalog_item_id": self.service.id,
                        "quantity": "1",
                        "unit_price": "250.00",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["public_notes"], "Updated notes")
        self.assertEqual(len(payload["invoice"]["items"]), 1)
        self.assertEqual(payload["invoice"]["items"][0]["item_name"], "Consulting Service")
        self.assertEqual(payload["invoice"]["total_amount"], "287.50")

        invoice.refresh_from_db()
        self.assertEqual(invoice.public_notes, "Updated notes")
        self.assertEqual(invoice.items.count(), 1)

    def test_sales_invoice_update_rejects_issued_invoice(self):
        invoice = self._create_invoice_for_api()
        issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        response = self.client.patch(
            f"/api/company/sales/invoices/{invoice.id}/update/",
            data={
                "public_notes": "Should fail",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_sales_invoice_issue_endpoint_issues_invoice(self):
        invoice = self._create_invoice_for_api()

        response = self.client.post(f"/api/company/sales/invoices/{invoice.id}/issue/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["status"], SalesInvoiceStatus.ISSUED)
        self.assertIsNotNone(payload["invoice"]["issued_at"])

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, SalesInvoiceStatus.ISSUED)
        self.assertEqual(invoice.issued_by, self.user)

    def test_sales_invoice_issue_rejects_empty_invoice(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[],
        )

        response = self.client.post(f"/api/company/sales/invoices/{invoice.id}/issue/")

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_sales_invoice_cancel_endpoint_cancels_issued_invoice(self):
        invoice = self._create_invoice_for_api()
        issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        response = self.client.post(
            f"/api/company/sales/invoices/{invoice.id}/cancel/",
            data={
                "reason": "API cancellation",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["status"], SalesInvoiceStatus.CANCELLED)
        self.assertEqual(payload["invoice"]["cancelled_reason"], "API cancellation")

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, SalesInvoiceStatus.CANCELLED)
        self.assertEqual(invoice.cancelled_by, self.user)

    def test_sales_invoice_cancel_rejects_draft_invoice(self):
        invoice = self._create_invoice_for_api()

        response = self.client.post(
            f"/api/company/sales/invoices/{invoice.id}/cancel/",
            data={
                "reason": "Should fail",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_viewer_can_list_but_cannot_create_invoice(self):
        self.client.force_login(self.viewer_user)

        list_response = self.client.get("/api/company/sales/invoices/")
        self.assertEqual(list_response.status_code, 200)

        create_response = self.client.post(
            "/api/company/sales/invoices/create/",
            data={
                "customer_id": self.customer.id,
                "items": [
                    {
                        "catalog_item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 403)

    def test_sales_invoices_summary_endpoint_returns_company_metrics(self):
        draft_invoice = self._create_invoice_for_api()

        issued_invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.service.id,
                    "quantity": "1",
                    "unit_price": "250.00",
                }
            ],
        )
        issue_sales_invoice(
            company=self.company,
            invoice=issued_invoice,
            user=self.user,
        )

        create_sales_invoice(
            company=self.other_company,
            user=self.other_user,
            customer_id=self.other_customer.id,
            items=[
                {
                    "catalog_item_id": self.other_item.id,
                    "quantity": "1",
                }
            ],
        )

        response = self.client.get("/api/company/sales/invoices/summary/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["company"]["id"], self.company.id)
        self.assertEqual(payload["summary"]["total_invoices"], 2)
        self.assertEqual(payload["summary"]["draft_invoices"], 1)
        self.assertEqual(payload["summary"]["issued_invoices"], 1)
        self.assertEqual(payload["summary"]["cancelled_invoices"], 0)

        self.assertEqual(payload["summary"]["all_totals"]["total_amount"], "402.50")
        self.assertEqual(payload["summary"]["issued_totals"]["total_amount"], "287.50")
        self.assertEqual(payload["summary"]["outstanding_totals"]["balance_due"], "402.50")

        invoice_ids = {draft_invoice.id, issued_invoice.id}
        self.assertEqual(
            SalesInvoice.objects.filter(company=self.company, id__in=invoice_ids).count(),
            2,
        )

    def test_sales_invoices_summary_endpoint_supports_date_filter(self):
        today_invoice = self._create_invoice_for_api()

        old_invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            invoice_date="2026-01-01",
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        response = self.client.get(
            "/api/company/sales/invoices/summary/",
            {
                "date_from": str(timezone.localdate()),
                "date_to": str(timezone.localdate()),
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["summary"]["total_invoices"], 1)
        self.assertEqual(payload["summary"]["all_totals"]["total_amount"], "115.00")

        self.assertNotEqual(today_invoice.id, old_invoice.id)
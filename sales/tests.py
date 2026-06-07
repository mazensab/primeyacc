# ============================================================
# 📂 sales/tests.py
# 🧠 PrimeyAcc | Sales Tests V1.0
# ------------------------------------------------------------
# ✅ Sales invoice model tests
# ✅ Sales invoice services tests
# ✅ Tenant isolation validation
# ✅ Customer validation
# ✅ Catalog item validation
# ✅ Totals calculation
# ✅ Issue / cancel lifecycle
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - نختبر الأساس قبل بناء APIs
# - لا نعتمد على company_id من الواجهة
# - كل فاتورة وبند يجب أن يبقيا داخل نفس الشركة
# - هذه المرحلة لا تختبر محاسبة أو مخزون أو مدفوعات
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

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
            owner=self.user,
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
            created_by=self.user,
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
            created_by=self.user,
        )

        self.unit = CatalogUnit.objects.create(
            company=self.company,
            code="PCS",
            name="Piece",
            symbol="pcs",
            created_by=self.user,
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
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            code="ITEM-999",
            name="Other Item",
            sale_price=Decimal("999.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_sellable=True,
            created_by=self.user,
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
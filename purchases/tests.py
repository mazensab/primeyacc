# ============================================================
# 📂 purchases/tests.py
# 🧠 PrimeyAcc | Purchases Tests V1.2
# ------------------------------------------------------------
# ✅ Purchase bill model tests
# ✅ Purchase bill services tests
# ✅ Purchase bill API tests
# ✅ Tenant isolation validation
# ✅ Supplier validation
# ✅ Catalog item validation
# ✅ Totals calculation
# ✅ Post / cancel lifecycle
# ✅ Phase 10.2 automatic accounting posting on post
# ✅ Company permissions through CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - نختبر الأساس قبل إغلاق APIs
# - لا نعتمد على company_id من الواجهة كمصدر ثقة
# - كل فاتورة مشتريات وبند يجب أن يبقيا داخل نفس الشركة
# - المورد يجب أن يكون SUPPLIER أو BOTH ومن نفس الشركة
# - الصنف يجب أن يكون من نفس الشركة وقابلًا للشراء
# - Phase 10.2 يختبر أن ترحيل فاتورة المورد ينشئ قيدًا محاسبيًا تلقائيًا بدون تكرار
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from accounting.models import JournalEntry, JournalEntryStatus
from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from catalog.models import CatalogItem, CatalogItemStatus, CatalogItemType, CatalogUnit
from companies.models import Branch, Company, CompanySettings
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from purchases.models import PurchaseBill, PurchaseBillItem, PurchaseBillStatus
from purchases.services import (
    cancel_purchase_bill,
    create_purchase_bill,
    generate_purchase_bill_number,
    get_branch_for_company,
    get_purchase_item_for_company,
    get_supplier_for_company,
    post_purchase_bill,
    post_purchase_bill_to_accounting,
    update_purchase_bill,
)


User = get_user_model()


class PurchasesTestCase(TestCase):
    """
    Shared setup for purchases tests.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="purchases_owner",
            email="purchases_owner@example.com",
            password="StrongPass123!",
        )

        self.other_user = User.objects.create_user(
            username="other_purchases_owner",
            email="other_purchases_owner@example.com",
            password="StrongPass123!",
        )

        self.viewer_user = User.objects.create_user(
            username="purchases_viewer",
            email="purchases_viewer@example.com",
            password="StrongPass123!",
        )

        self.company = Company.objects.create(
            name="Primey Purchases Company",
            company_code="PUR-001",
            status="ACTIVE",
            is_active=True,
            currency_code="SAR",
            vat_percentage=Decimal("15.00"),
            owner=self.user,
            created_by=self.user,
        )

        CompanySettings.objects.create(
            company=self.company,
            purchase_prefix="PUR",
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_company = Company.objects.create(
            name="Other Purchases Company",
            company_code="PUR-002",
            status="ACTIVE",
            is_active=True,
            currency_code="SAR",
            vat_percentage=Decimal("15.00"),
            owner=self.other_user,
            created_by=self.other_user,
        )

        CompanySettings.objects.create(
            company=self.other_company,
            purchase_prefix="OTH",
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
            branch_code="BR-PUR-001",
            is_default=True,
            is_active=True,
            status="ACTIVE",
            created_by=self.user,
        )

        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Branch",
            branch_code="BR-PUR-999",
            is_default=True,
            is_active=True,
            status="ACTIVE",
            created_by=self.other_user,
        )

        self.supplier = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.SUPPLIER,
            status=BusinessPartyStatus.ACTIVE,
            code="SUP-001",
            display_name="Supplier One",
            phone="0500000001",
            vat_number="300000000000003",
            created_by=self.user,
        )

        self.both_party = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.BOTH,
            status=BusinessPartyStatus.ACTIVE,
            code="BOTH-001",
            display_name="Customer Supplier One",
            created_by=self.user,
        )

        self.customer = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.CUSTOMER,
            status=BusinessPartyStatus.ACTIVE,
            code="CUS-001",
            display_name="Customer One",
            created_by=self.user,
        )

        self.inactive_supplier = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.SUPPLIER,
            status=BusinessPartyStatus.INACTIVE,
            code="SUP-INACTIVE",
            display_name="Inactive Supplier",
            created_by=self.user,
        )

        self.other_supplier = BusinessParty.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            party_type=BusinessPartyType.SUPPLIER,
            status=BusinessPartyStatus.ACTIVE,
            code="SUP-999",
            display_name="Other Supplier",
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
            code="PITEM-001",
            name="Purchase Item",
            purchase_price=Decimal("100.00"),
            cost_price=Decimal("90.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_purchasable=True,
            created_by=self.user,
        )

        self.service = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.SERVICE,
            status=CatalogItemStatus.ACTIVE,
            code="PSRV-001",
            name="Purchase Service",
            purchase_price=Decimal("200.00"),
            cost_price=Decimal("180.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_purchasable=True,
            created_by=self.user,
        )

        self.not_purchasable_item = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            code="NO-PUR-001",
            name="Not Purchasable Item",
            purchase_price=Decimal("50.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_purchasable=False,
            created_by=self.user,
        )

        self.other_item = CatalogItem.objects.create(
            company=self.other_company,
            unit=self.other_unit,
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            code="PITEM-999",
            name="Other Purchase Item",
            purchase_price=Decimal("999.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            is_purchasable=True,
            created_by=self.other_user,
        )


class PurchaseModelTests(PurchasesTestCase):
    """
    Tests for PurchaseBill and PurchaseBillItem model behavior.
    """

    def test_purchase_bill_model_validates_branch_company(self):
        bill = PurchaseBill(
            company=self.company,
            branch=self.other_branch,
            supplier=self.supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            bill.full_clean()

    def test_purchase_bill_model_validates_supplier_company(self):
        bill = PurchaseBill(
            company=self.company,
            branch=self.branch,
            supplier=self.other_supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            bill.full_clean()

    def test_purchase_bill_model_rejects_customer_as_supplier(self):
        bill = PurchaseBill(
            company=self.company,
            branch=self.branch,
            supplier=self.customer,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            bill.full_clean()

    def test_purchase_bill_model_accepts_both_party_as_supplier(self):
        bill = PurchaseBill(
            company=self.company,
            branch=self.branch,
            supplier=self.both_party,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        bill.full_clean()
        bill.save()

        self.assertEqual(bill.supplier, self.both_party)

    def test_purchase_bill_item_calculates_totals(self):
        bill = PurchaseBill.objects.create(
            company=self.company,
            branch=self.branch,
            supplier=self.supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        item = PurchaseBillItem.objects.create(
            bill=bill,
            company=self.company,
            item=self.item,
            line_number=1,
            quantity=Decimal("2.0000"),
            unit_price=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
        )

        item.refresh_from_db()
        bill.refresh_from_db()

        self.assertEqual(item.subtotal_amount, Decimal("200.00"))
        self.assertEqual(item.discount_amount, Decimal("10.00"))
        self.assertEqual(item.taxable_amount, Decimal("190.00"))
        self.assertEqual(item.tax_amount, Decimal("28.50"))
        self.assertEqual(item.total_amount, Decimal("218.50"))

        self.assertEqual(bill.subtotal_amount, Decimal("200.00"))
        self.assertEqual(bill.discount_amount, Decimal("10.00"))
        self.assertEqual(bill.taxable_amount, Decimal("190.00"))
        self.assertEqual(bill.tax_amount, Decimal("28.50"))
        self.assertEqual(bill.total_amount, Decimal("218.50"))

    def test_purchase_bill_item_rejects_other_company_catalog_item(self):
        bill = PurchaseBill.objects.create(
            company=self.company,
            branch=self.branch,
            supplier=self.supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        item = PurchaseBillItem(
            bill=bill,
            company=self.company,
            item=self.other_item,
            line_number=1,
            quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_purchase_bill_item_rejects_not_purchasable_item(self):
        bill = PurchaseBill.objects.create(
            company=self.company,
            branch=self.branch,
            supplier=self.supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        item = PurchaseBillItem(
            bill=bill,
            company=self.company,
            item=self.not_purchasable_item,
            line_number=1,
            quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_purchase_bill_item_rejects_posted_bill_edit(self):
        bill = PurchaseBill.objects.create(
            company=self.company,
            branch=self.branch,
            supplier=self.supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        PurchaseBillItem.objects.create(
            bill=bill,
            company=self.company,
            item=self.item,
            line_number=1,
            quantity=Decimal("1.0000"),
        )

        bill.post(user=self.user)

        item = PurchaseBillItem(
            bill=bill,
            company=self.company,
            item=self.service,
            line_number=2,
            quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()


class PurchaseServicesTests(PurchasesTestCase):
    """
    Tests for purchases/services.py behavior.
    """

    def test_generate_purchase_bill_number_uses_company_prefix_and_date(self):
        bill_number = generate_purchase_bill_number(self.company)

        self.assertTrue(bill_number.startswith(f"PUR-{timezone.localdate().strftime('%Y%m%d')}-"))
        self.assertTrue(bill_number.endswith("000001"))

    def test_get_branch_for_company_returns_branch(self):
        branch = get_branch_for_company(self.company, self.branch.id)

        self.assertEqual(branch, self.branch)

    def test_get_branch_for_company_rejects_other_company_branch(self):
        with self.assertRaises(ValidationError):
            get_branch_for_company(self.company, self.other_branch.id)

    def test_get_supplier_for_company_accepts_active_supplier(self):
        supplier = get_supplier_for_company(self.company, self.supplier.id)

        self.assertEqual(supplier, self.supplier)

    def test_get_supplier_for_company_accepts_both_party(self):
        supplier = get_supplier_for_company(self.company, self.both_party.id)

        self.assertEqual(supplier, self.both_party)

    def test_get_supplier_for_company_rejects_customer(self):
        with self.assertRaises(ValidationError):
            get_supplier_for_company(self.company, self.customer.id)

    def test_get_supplier_for_company_rejects_inactive_supplier(self):
        with self.assertRaises(ValidationError):
            get_supplier_for_company(self.company, self.inactive_supplier.id)

    def test_get_supplier_for_company_rejects_other_company_supplier(self):
        with self.assertRaises(ValidationError):
            get_supplier_for_company(self.company, self.other_supplier.id)

    def test_get_purchase_item_for_company_accepts_active_purchasable_item(self):
        item = get_purchase_item_for_company(self.company, self.item.id)

        self.assertEqual(item, self.item)

    def test_get_purchase_item_for_company_rejects_not_purchasable_item(self):
        with self.assertRaises(ValidationError):
            get_purchase_item_for_company(self.company, self.not_purchasable_item.id)

    def test_get_purchase_item_for_company_rejects_other_company_item(self):
        with self.assertRaises(ValidationError):
            get_purchase_item_for_company(self.company, self.other_item.id)

    def test_create_purchase_bill_with_items(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "2",
                        "discount_amount": "10.00",
                    },
                    {
                        "item_id": self.service.id,
                        "quantity": "1",
                        "unit_price": "250.00",
                        "tax_rate": "15.00",
                    },
                ],
                "notes": "Supplier bill note",
            },
        )

        bill.refresh_from_db()

        self.assertEqual(bill.company, self.company)
        self.assertEqual(bill.branch, None)
        self.assertEqual(bill.supplier, self.supplier)
        self.assertEqual(bill.status, PurchaseBillStatus.DRAFT)
        self.assertEqual(bill.items.count(), 2)
        self.assertEqual(bill.subtotal_amount, Decimal("450.00"))
        self.assertEqual(bill.discount_amount, Decimal("10.00"))
        self.assertEqual(bill.taxable_amount, Decimal("440.00"))
        self.assertEqual(bill.tax_amount, Decimal("66.00"))
        self.assertEqual(bill.total_amount, Decimal("506.00"))
        self.assertEqual(bill.notes, "Supplier bill note")

    def test_create_purchase_bill_with_branch(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        self.assertEqual(bill.branch, self.branch)

    def test_create_purchase_bill_rejects_empty_items(self):
        with self.assertRaises(ValidationError):
            create_purchase_bill(
                company=self.company,
                user=self.user,
                payload={
                    "supplier_id": self.supplier.id,
                    "items": [],
                },
            )

    def test_create_purchase_bill_rejects_other_company_catalog_item(self):
        with self.assertRaises(ValidationError):
            create_purchase_bill(
                company=self.company,
                user=self.user,
                payload={
                    "supplier_id": self.supplier.id,
                    "items": [
                        {
                            "item_id": self.other_item.id,
                            "quantity": "1",
                        }
                    ],
                },
            )

    def test_update_purchase_bill_replaces_items(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        bill = update_purchase_bill(
            bill=bill,
            user=self.user,
            payload={
                "notes": "Updated purchase bill",
                "items": [
                    {
                        "item_id": self.service.id,
                        "quantity": "1",
                        "unit_price": "250.00",
                    }
                ],
            },
        )

        bill.refresh_from_db()

        self.assertEqual(bill.notes, "Updated purchase bill")
        self.assertEqual(bill.items.count(), 1)
        self.assertEqual(bill.items.first().item_name_snapshot, "Purchase Service")
        self.assertEqual(bill.total_amount, Decimal("287.50"))

    def test_update_purchase_bill_rejects_posted_bill(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_purchase_bill(
                bill=bill,
                user=self.user,
                payload={
                    "notes": "Should fail",
                },
            )

    def test_post_purchase_bill(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        bill.refresh_from_db()

        self.assertEqual(bill.status, PurchaseBillStatus.POSTED)
        self.assertIsNotNone(bill.posted_at)
        self.assertEqual(bill.posted_by, self.user)

    def test_post_purchase_bill_creates_automatic_accounting_entry_once(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        bill.refresh_from_db()

        entries = JournalEntry.objects.filter(
            company=self.company,
            source_type="purchase_bill",
            source_id=str(bill.id),
            source_number=bill.bill_number,
            is_auto_posted=True,
        )

        self.assertEqual(entries.count(), 1)

        entry = entries.get()
        self.assertEqual(entry.status, JournalEntryStatus.POSTED)
        self.assertEqual(entry.total_debit, bill.total_amount)
        self.assertEqual(entry.total_credit, bill.total_amount)
        self.assertEqual(entry.reference, bill.bill_number)
        self.assertEqual(entry.source_number, bill.bill_number)

        same_entry = post_purchase_bill_to_accounting(
            bill,
            actor=self.user,
            auto_post=True,
        )

        self.assertEqual(same_entry.id, entry.id)
        self.assertEqual(entries.count(), 1)

    def test_post_purchase_bill_rejects_empty_bill(self):
        bill = PurchaseBill.objects.create(
            company=self.company,
            branch=self.branch,
            supplier=self.supplier,
            bill_number="PUR-20260607-000001",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            post_purchase_bill(
                bill=bill,
                user=self.user,
            )

    def test_cancel_purchase_bill(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        bill = cancel_purchase_bill(
            bill=bill,
            reason="Supplier bill cancelled",
            user=self.user,
        )

        bill.refresh_from_db()

        self.assertEqual(bill.status, PurchaseBillStatus.CANCELLED)
        self.assertIsNotNone(bill.cancelled_at)
        self.assertEqual(bill.cancelled_by, self.user)
        self.assertEqual(bill.cancellation_reason, "Supplier bill cancelled")

    def test_admin_permissions_include_purchase_bill_permissions(self):
        admin_user = User.objects.create_user(
            username="purchases_admin",
            email="purchases_admin@example.com",
            password="StrongPass123!",
        )

        admin_membership = CompanyMembership.objects.create(
            user=admin_user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
        )

        permissions = admin_membership.company_permissions

        self.assertIn("company.purchases.bills.view", permissions)
        self.assertIn("company.purchases.bills.create", permissions)
        self.assertIn("company.purchases.bills.update", permissions)
        self.assertIn("company.purchases.bills.post", permissions)
        self.assertIn("company.purchases.bills.cancel", permissions)

    def test_viewer_has_purchase_bill_view_only(self):
        permissions = self.viewer_membership.company_permissions

        self.assertIn("company.purchases.bills.view", permissions)
        self.assertNotIn("company.purchases.bills.create", permissions)
        self.assertNotIn("company.purchases.bills.update", permissions)
        self.assertNotIn("company.purchases.bills.post", permissions)
        self.assertNotIn("company.purchases.bills.cancel", permissions)


class PurchaseBillsAPITests(PurchasesTestCase):
    """
    Tests for /api/company/purchases/bills/ endpoints.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_bill_for_api(self) -> PurchaseBill:
        return create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
                "notes": "API test purchase bill",
            },
        )

    def test_purchase_bills_list_returns_current_company_only(self):
        bill = self._create_bill_for_api()

        create_purchase_bill(
            company=self.other_company,
            user=self.other_user,
            payload={
                "supplier_id": self.other_supplier.id,
                "branch_id": self.other_branch.id,
                "items": [
                    {
                        "item_id": self.other_item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        response = self.client.get("/api/company/purchases/bills/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], bill.id)
        self.assertEqual(payload["results"][0]["company_id"], self.company.id)

    def test_purchase_bills_list_supports_search(self):
        bill = self._create_bill_for_api()

        response = self.client.get(
            "/api/company/purchases/bills/",
            {
                "search": bill.bill_number,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["bill_number"], bill.bill_number)

    def test_purchase_bill_create_endpoint_creates_draft_bill(self):
        response = self.client.post(
            "/api/company/purchases/bills/create/",
            data={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "2",
                        "discount_amount": "10.00",
                    }
                ],
                "notes": "Created from API",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["bill"]["status"], PurchaseBillStatus.DRAFT)
        self.assertEqual(payload["bill"]["supplier"]["id"], self.supplier.id)
        self.assertEqual(payload["bill"]["branch"]["id"], self.branch.id)
        self.assertEqual(payload["bill"]["total_amount"], "218.50")
        self.assertEqual(len(payload["bill"]["items"]), 1)

        bill = PurchaseBill.objects.get(id=payload["bill"]["id"])
        self.assertEqual(bill.company, self.company)
        self.assertEqual(bill.created_by, self.user)

    def test_purchase_bill_create_endpoint_can_post_now(self):
        response = self.client.post(
            "/api/company/purchases/bills/create/",
            data={
                "supplier_id": self.supplier.id,
                "post_now": True,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["bill"]["status"], PurchaseBillStatus.POSTED)
        self.assertIsNotNone(payload["bill"]["posted_at"])

    def test_purchase_bill_create_rejects_other_company_catalog_item(self):
        response = self.client.post(
            "/api/company/purchases/bills/create/",
            data={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.other_item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_purchase_bill_detail_endpoint_returns_items(self):
        bill = self._create_bill_for_api()

        response = self.client.get(f"/api/company/purchases/bills/{bill.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["bill"]["id"], bill.id)
        self.assertEqual(len(payload["bill"]["items"]), 1)
        self.assertEqual(payload["bill"]["items"][0]["item_name"], "Purchase Item")

    def test_purchase_bill_detail_blocks_cross_company_access(self):
        other_bill = create_purchase_bill(
            company=self.other_company,
            user=self.other_user,
            payload={
                "supplier_id": self.other_supplier.id,
                "items": [
                    {
                        "item_id": self.other_item.id,
                        "quantity": "1",
                    }
                ],
            },
        )

        response = self.client.get(f"/api/company/purchases/bills/{other_bill.id}/")

        self.assertEqual(response.status_code, 404)

    def test_purchase_bill_update_endpoint_updates_draft_bill(self):
        bill = self._create_bill_for_api()

        response = self.client.patch(
            f"/api/company/purchases/bills/{bill.id}/update/",
            data={
                "notes": "Updated from API",
                "items": [
                    {
                        "item_id": self.service.id,
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
        self.assertEqual(payload["bill"]["notes"], "Updated from API")
        self.assertEqual(len(payload["bill"]["items"]), 1)
        self.assertEqual(payload["bill"]["items"][0]["item_name"], "Purchase Service")
        self.assertEqual(payload["bill"]["total_amount"], "287.50")

        bill.refresh_from_db()
        self.assertEqual(bill.notes, "Updated from API")
        self.assertEqual(bill.items.count(), 1)

    def test_purchase_bill_update_rejects_posted_bill(self):
        bill = self._create_bill_for_api()
        post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        response = self.client.patch(
            f"/api/company/purchases/bills/{bill.id}/update/",
            data={
                "notes": "Should fail",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_purchase_bill_post_endpoint_posts_bill(self):
        bill = self._create_bill_for_api()

        response = self.client.post(f"/api/company/purchases/bills/{bill.id}/post/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["bill"]["status"], PurchaseBillStatus.POSTED)
        self.assertIsNotNone(payload["bill"]["posted_at"])

        bill.refresh_from_db()
        self.assertEqual(bill.status, PurchaseBillStatus.POSTED)
        self.assertEqual(bill.posted_by, self.user)

    def test_purchase_bill_post_rejects_empty_bill(self):
        bill = PurchaseBill.objects.create(
            company=self.company,
            branch=self.branch,
            supplier=self.supplier,
            bill_number="PUR-API-EMPTY",
            bill_date=timezone.localdate(),
            created_by=self.user,
        )

        response = self.client.post(f"/api/company/purchases/bills/{bill.id}/post/")

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_purchase_bill_cancel_endpoint_cancels_bill(self):
        bill = self._create_bill_for_api()
        post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        response = self.client.post(
            f"/api/company/purchases/bills/{bill.id}/cancel/",
            data={
                "reason": "API cancellation",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["bill"]["status"], PurchaseBillStatus.CANCELLED)
        self.assertEqual(payload["bill"]["cancellation_reason"], "API cancellation")

        bill.refresh_from_db()
        self.assertEqual(bill.status, PurchaseBillStatus.CANCELLED)
        self.assertEqual(bill.cancelled_by, self.user)

    def test_viewer_can_list_but_cannot_create_purchase_bill(self):
        self.client.force_login(self.viewer_user)

        list_response = self.client.get("/api/company/purchases/bills/")
        self.assertEqual(list_response.status_code, 200)

        create_response = self.client.post(
            "/api/company/purchases/bills/create/",
            data={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 403)
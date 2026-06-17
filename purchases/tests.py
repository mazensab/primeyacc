# ============================================================
# 📂 purchases/tests.py
# 🧠 PrimeyAcc | Purchases Tests V1.4
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
# ✅ Purchase return inventory location selection tests
# ✅ Required location balance integration fixtures
# ✅ Purchase return insufficient location balance protection
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

from accounting.models import (
    JournalEntry,
    JournalEntryStatus,
)
from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from catalog.models import CatalogItem, CatalogItemStatus, CatalogItemType, CatalogUnit
from companies.models import Branch, Company, CompanySettings
from inventory.models import (
    InventoryLocation,
    InventoryLocationType,
    StockItem,
    StockMovement,
    StockMovementStatus,
)
from inventory.services import (
    create_inventory_location,
    create_warehouse,
)
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from purchases.models import (
    PurchaseBill,
    PurchaseBillItem,
    PurchaseBillStatus,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    PurchaseRequest,
    PurchaseRequestItem,
    PurchaseRequestStatus,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseReceiptStatus,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchaseReturnReason,
    PurchaseReturnStatus,
    SupplierDebitNote,
    SupplierDebitNoteItem,
    SupplierDebitNoteStatus,
    SupplierCredit,
)
from purchases.services import (
    approve_purchase_order,
    approve_purchase_request,
    cancel_purchase_bill,
    cancel_purchase_request,
    cancel_purchase_order,
    create_purchase_bill,
    create_purchase_bill_from_order,
    create_purchase_order,
    create_purchase_request,
    convert_purchase_request_to_order,
    generate_purchase_bill_number,
    generate_purchase_request_number,
    get_branch_for_company,
    get_purchase_item_for_company,
    get_supplier_for_company,
    post_purchase_bill,
    post_purchase_bill_to_accounting,
    reject_purchase_request,
    serialize_purchase_request,
    submit_purchase_request,
    update_purchase_bill,
    update_purchase_order,
    update_purchase_request,
    serialize_purchase_order,
    cancel_purchase_receipt,
    create_purchase_receipt,
    generate_purchase_receipt_number,
    post_purchase_receipt,
    serialize_purchase_receipt,
    update_purchase_receipt,
    cancel_purchase_return,
    confirm_purchase_return,
    create_purchase_return,
    generate_purchase_return_number,
    serialize_purchase_return,
    update_purchase_return,
    cancel_supplier_debit_note,
    create_supplier_debit_note,
    generate_supplier_debit_note_number,
    issue_supplier_debit_note,
    post_supplier_debit_note,
    serialize_supplier_debit_note,
    update_supplier_debit_note,
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


class PurchaseReturnsTests(PurchasesTestCase):
    """
    Tests for purchase return models and services.
    """

    def _create_posted_bill(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        quantity="5.0000",
    ) -> PurchaseBill:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        bill = create_purchase_bill(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=user,
        )

        bill.refresh_from_db()

        return bill

    def _create_purchase_return(
        self,
        *,
        bill=None,
        quantity="2.0000",
        user=None,
    ) -> PurchaseReturn:
        bill = bill or self._create_posted_bill()
        user = user or self.user

        return create_purchase_return(
            company=bill.company,
            user=user,
            payload={
                "bill_id": bill.id,
                "reason": (
                    PurchaseReturnReason.DAMAGED
                ),
                "reason_details": (
                    "Damaged during receiving"
                ),
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": quantity,
                        "condition_notes": (
                            "Damaged units"
                        ),
                    }
                ],
            },
        )

    def test_generate_purchase_return_number(self):
        number = generate_purchase_return_number(
            self.company
        )

        expected_prefix = (
            "PRET-"
            f"{timezone.localdate().strftime('%Y%m%d')}-"
        )

        self.assertTrue(
            number.startswith(expected_prefix)
        )
        self.assertTrue(
            number.endswith("000001")
        )

    def test_create_purchase_return_calculates_totals(self):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )

        purchase_return = self._create_purchase_return(
            bill=bill,
            quantity="2.0000",
        )

        purchase_return.refresh_from_db()
        return_item = purchase_return.items.get()

        self.assertEqual(
            purchase_return.status,
            PurchaseReturnStatus.DRAFT,
        )
        self.assertEqual(
            purchase_return.company,
            self.company,
        )
        self.assertEqual(
            purchase_return.supplier,
            self.supplier,
        )
        self.assertEqual(
            purchase_return.bill,
            bill,
        )
        self.assertEqual(
            return_item.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            return_item.subtotal_amount,
            Decimal("200.00"),
        )
        self.assertEqual(
            return_item.tax_amount,
            Decimal("30.00"),
        )
        self.assertEqual(
            return_item.total_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            purchase_return.total_amount,
            Decimal("230.00"),
        )

    def test_create_purchase_return_rejects_draft_bill(self):
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

        with self.assertRaises(ValidationError):
            create_purchase_return(
                company=self.company,
                user=self.user,
                payload={
                    "bill_id": bill.id,
                    "items": [
                        {
                            "bill_item_id": (
                                bill.items.first().id
                            ),
                            "quantity": "1",
                        }
                    ],
                },
            )

    def test_create_purchase_return_rejects_other_company_bill(self):
        other_bill = self._create_posted_bill(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
            quantity="2",
        )

        with self.assertRaises(ValidationError):
            create_purchase_return(
                company=self.company,
                user=self.user,
                payload={
                    "bill_id": other_bill.id,
                    "items": [
                        {
                            "bill_item_id": (
                                other_bill.items.first().id
                            ),
                            "quantity": "1",
                        }
                    ],
                },
            )

    def test_create_purchase_return_rejects_over_return(self):
        bill = self._create_posted_bill(
            quantity="3.0000"
        )

        with self.assertRaises(ValidationError):
            self._create_purchase_return(
                bill=bill,
                quantity="4.0000",
            )

    def test_confirm_purchase_return_consumes_quantity(self):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )
        bill_item = bill.items.get()

        purchase_return = self._create_purchase_return(
            bill=bill,
            quantity="2.0000",
        )

        purchase_return = confirm_purchase_return(
            purchase_return=purchase_return,
            user=self.user,
        )

        bill_item.refresh_from_db()

        self.assertEqual(
            purchase_return.status,
            PurchaseReturnStatus.CONFIRMED,
        )
        self.assertEqual(
            bill_item.returned_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            bill_item.returnable_quantity,
            Decimal("3.0000"),
        )

    def test_multiple_partial_purchase_returns(self):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )
        bill_item = bill.items.get()

        first_return = self._create_purchase_return(
            bill=bill,
            quantity="2.0000",
        )
        confirm_purchase_return(
            purchase_return=first_return,
            user=self.user,
        )

        second_return = self._create_purchase_return(
            bill=bill,
            quantity="3.0000",
        )
        confirm_purchase_return(
            purchase_return=second_return,
            user=self.user,
        )

        bill_item.refresh_from_db()

        self.assertEqual(
            bill_item.returned_quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            bill_item.returnable_quantity,
            Decimal("0.0000"),
        )

        with self.assertRaises(ValidationError):
            self._create_purchase_return(
                bill=bill,
                quantity="1.0000",
            )

    def test_cancel_confirmed_purchase_return_restores_quantity(self):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )
        bill_item = bill.items.get()

        purchase_return = self._create_purchase_return(
            bill=bill,
            quantity="2.0000",
        )
        purchase_return = confirm_purchase_return(
            purchase_return=purchase_return,
            user=self.user,
        )

        purchase_return = cancel_purchase_return(
            purchase_return=purchase_return,
            reason="Supplier accepted cancellation",
            user=self.user,
        )

        bill_item.refresh_from_db()

        self.assertEqual(
            purchase_return.status,
            PurchaseReturnStatus.CANCELLED,
        )
        self.assertEqual(
            purchase_return.cancellation_reason,
            "Supplier accepted cancellation",
        )
        self.assertEqual(
            bill_item.returned_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            bill_item.returnable_quantity,
            Decimal("5.0000"),
        )

    def test_update_purchase_return_replaces_items(self):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )

        purchase_return = self._create_purchase_return(
            bill=bill,
            quantity="1.0000",
        )

        purchase_return = update_purchase_return(
            purchase_return=purchase_return,
            user=self.user,
            payload={
                "reason": (
                    PurchaseReturnReason.QUALITY_ISSUE
                ),
                "notes": "Updated purchase return",
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": "3.0000",
                    }
                ],
            },
        )

        return_item = purchase_return.items.get()

        self.assertEqual(
            purchase_return.reason,
            PurchaseReturnReason.QUALITY_ISSUE,
        )
        self.assertEqual(
            purchase_return.notes,
            "Updated purchase return",
        )
        self.assertEqual(
            return_item.quantity,
            Decimal("3.0000"),
        )
        self.assertEqual(
            purchase_return.total_amount,
            Decimal("345.00"),
        )

    def test_update_purchase_return_rejects_confirmed_return(self):
        purchase_return = self._create_purchase_return()
        purchase_return = confirm_purchase_return(
            purchase_return=purchase_return,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_purchase_return(
                purchase_return=purchase_return,
                user=self.user,
                payload={
                    "notes": "Should fail",
                },
            )

    def test_serialize_purchase_return(self):
        purchase_return = self._create_purchase_return()

        data = serialize_purchase_return(
            purchase_return,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            purchase_return.id,
        )
        self.assertEqual(
            data["status"],
            PurchaseReturnStatus.DRAFT,
        )
        self.assertEqual(
            data["supplier"]["id"],
            self.supplier.id,
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )
        self.assertTrue(
            data["allowed_actions"]["confirm"]
        )

    def test_purchase_return_permissions(self):
        admin_user = User.objects.create_user(
            username="purchase_returns_admin",
            email="purchase_returns_admin@example.com",
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

        permissions = (
            admin_membership.company_permissions
        )

        self.assertIn(
            "company.purchases.returns.view",
            permissions,
        )
        self.assertIn(
            "company.purchases.returns.create",
            permissions,
        )
        self.assertIn(
            "company.purchases.returns.update",
            permissions,
        )
        self.assertIn(
            "company.purchases.returns.confirm",
            permissions,
        )
        self.assertIn(
            "company.purchases.returns.post",
            permissions,
        )
        self.assertIn(
            "company.purchases.returns.cancel",
            permissions,
        )

        viewer_permissions = (
            self.viewer_membership.company_permissions
        )

        self.assertIn(
            "company.purchases.returns.view",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.returns.create",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.returns.confirm",
            viewer_permissions,
        )


class PurchaseReturnsAPITests(PurchasesTestCase):
    """
    Tests for /api/company/purchases/returns/ endpoints.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_posted_bill(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        quantity="5.0000",
    ) -> PurchaseBill:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        bill = create_purchase_bill(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        return post_purchase_bill(
            bill=bill,
            user=user,
        )

    def _create_return_for_api(
        self,
        *,
        bill=None,
        quantity="2.0000",
    ) -> PurchaseReturn:
        bill = bill or self._create_posted_bill()

        return create_purchase_return(
            company=bill.company,
            user=self.user,
            payload={
                "bill_id": bill.id,
                "reason": PurchaseReturnReason.DAMAGED,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": quantity,
                    }
                ],
            },
        )

    def test_purchase_return_create_endpoint(self):
        bill = self._create_posted_bill()

        response = self.client.post(
            "/api/company/purchases/returns/create/",
            data={
                "bill_id": bill.id,
                "reason": (
                    PurchaseReturnReason.DAMAGED
                ),
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["purchase_return"]["status"],
            PurchaseReturnStatus.DRAFT,
        )
        self.assertEqual(
            payload["purchase_return"]["total_amount"],
            "230.00",
        )
        self.assertEqual(
            len(
                payload["purchase_return"]["items"]
            ),
            1,
        )

    def test_purchase_returns_list_is_company_scoped(self):
        purchase_return = (
            self._create_return_for_api()
        )

        other_bill = self._create_posted_bill(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
            quantity="2.0000",
        )

        create_purchase_return(
            company=self.other_company,
            user=self.other_user,
            payload={
                "bill_id": other_bill.id,
                "items": [
                    {
                        "bill_item_id": (
                            other_bill.items.first().id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        response = self.client.get(
            "/api/company/purchases/returns/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            purchase_return.id,
        )

    def test_purchase_return_detail_endpoint(self):
        purchase_return = (
            self._create_return_for_api()
        )

        response = self.client.get(
            (
                "/api/company/purchases/returns/"
                f"{purchase_return.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["purchase_return"]["id"],
            purchase_return.id,
        )
        self.assertEqual(
            len(
                payload["purchase_return"]["items"]
            ),
            1,
        )

    def test_purchase_return_detail_blocks_cross_company(self):
        other_bill = self._create_posted_bill(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
            quantity="2.0000",
        )

        other_return = create_purchase_return(
            company=self.other_company,
            user=self.other_user,
            payload={
                "bill_id": other_bill.id,
                "items": [
                    {
                        "bill_item_id": (
                            other_bill.items.first().id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        response = self.client.get(
            (
                "/api/company/purchases/returns/"
                f"{other_return.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_purchase_return_update_endpoint(self):
        purchase_return = (
            self._create_return_for_api()
        )

        response = self.client.patch(
            (
                "/api/company/purchases/returns/"
                f"{purchase_return.id}/update/"
            ),
            data={
                "notes": "Updated through API",
                "items": [
                    {
                        "bill_item_id": (
                            purchase_return
                            .bill
                            .items
                            .first()
                            .id
                        ),
                        "quantity": "3.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["purchase_return"]["notes"],
            "Updated through API",
        )
        self.assertEqual(
            payload["purchase_return"]["items"][0][
                "quantity"
            ],
            "3.0000",
        )

    def test_purchase_return_confirm_endpoint(self):
        purchase_return = (
            self._create_return_for_api()
        )

        response = self.client.post(
            (
                "/api/company/purchases/returns/"
                f"{purchase_return.id}/confirm/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        purchase_return.refresh_from_db()

        self.assertEqual(
            purchase_return.status,
            PurchaseReturnStatus.CONFIRMED,
        )

    def test_purchase_return_cancel_endpoint(self):
        purchase_return = (
            self._create_return_for_api()
        )

        response = self.client.post(
            (
                "/api/company/purchases/returns/"
                f"{purchase_return.id}/cancel/"
            ),
            data={
                "reason": "Cancelled through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        purchase_return.refresh_from_db()

        self.assertEqual(
            purchase_return.status,
            PurchaseReturnStatus.CANCELLED,
        )
        self.assertEqual(
            purchase_return.cancellation_reason,
            "Cancelled through API",
        )

    def test_purchase_return_create_rejects_over_return(self):
        bill = self._create_posted_bill(
            quantity="2.0000"
        )

        response = self.client.post(
            "/api/company/purchases/returns/create/",
            data={
                "bill_id": bill.id,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": "3.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )
        self.assertFalse(
            response.json()["success"]
        )

    def test_viewer_can_view_but_cannot_create_return(self):
        purchase_return = (
            self._create_return_for_api()
        )

        self.client.force_login(
            self.viewer_user
        )

        list_response = self.client.get(
            "/api/company/purchases/returns/"
        )

        self.assertEqual(
            list_response.status_code,
            200,
        )

        detail_response = self.client.get(
            (
                "/api/company/purchases/returns/"
                f"{purchase_return.id}/"
            )
        )

        self.assertEqual(
            detail_response.status_code,
            200,
        )

        create_response = self.client.post(
            "/api/company/purchases/returns/create/",
            data={
                "bill_id": purchase_return.bill_id,
                "items": [
                    {
                        "bill_item_id": (
                            purchase_return
                            .bill
                            .items
                            .first()
                            .id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            create_response.status_code,
            403,
        )


class SupplierDebitNotesTests(PurchasesTestCase):
    """
    Tests for supplier debit note models and services.
    """

    def _create_confirmed_purchase_return(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        bill_quantity="5.0000",
        return_quantity="2.0000",
    ) -> PurchaseReturn:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        bill = create_purchase_bill(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": bill_quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=user,
        )

        purchase_return = create_purchase_return(
            company=company,
            user=user,
            payload={
                "bill_id": bill.id,
                "reason": PurchaseReturnReason.DAMAGED,
                "reason_details": "Returned to supplier",
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": return_quantity,
                        "condition_notes": (
                            "Damaged returned units"
                        ),
                    }
                ],
            },
        )

        return confirm_purchase_return(
            purchase_return=purchase_return,
            user=user,
        )

    def test_generate_supplier_debit_note_number(self):
        number = (
            generate_supplier_debit_note_number(
                self.company
            )
        )

        expected_prefix = (
            "SDN-"
            f"{timezone.localdate().strftime('%Y%m%d')}-"
        )

        self.assertTrue(
            number.startswith(expected_prefix)
        )
        self.assertTrue(
            number.endswith("000001")
        )

    def test_create_supplier_debit_note_from_confirmed_return(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
                "supplier_reference": "SUP-DN-001",
                "notes": "Supplier debit note",
            },
        )

        debit_note.refresh_from_db()
        debit_note_item = debit_note.items.get()
        return_item = purchase_return.items.get()

        self.assertEqual(
            debit_note.status,
            SupplierDebitNoteStatus.DRAFT,
        )
        self.assertEqual(
            debit_note.company,
            self.company,
        )
        self.assertEqual(
            debit_note.supplier,
            self.supplier,
        )
        self.assertEqual(
            debit_note.bill,
            purchase_return.bill,
        )
        self.assertEqual(
            debit_note.purchase_return,
            purchase_return,
        )
        self.assertEqual(
            debit_note.supplier_reference,
            "SUP-DN-001",
        )
        self.assertEqual(
            debit_note.items.count(),
            1,
        )
        self.assertEqual(
            debit_note_item.purchase_return_item,
            return_item,
        )
        self.assertEqual(
            debit_note_item.bill_item,
            return_item.bill_item,
        )
        self.assertEqual(
            debit_note_item.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            debit_note_item.subtotal_amount,
            Decimal("200.00"),
        )
        self.assertEqual(
            debit_note_item.tax_amount,
            Decimal("30.00"),
        )
        self.assertEqual(
            debit_note_item.total_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            debit_note.total_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            debit_note.applied_to_bill_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            debit_note.supplier_credit_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            debit_note.unapplied_amount,
            Decimal("230.00"),
        )

    def test_create_supplier_debit_note_rejects_draft_return(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "3.0000",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        purchase_return = create_purchase_return(
            company=self.company,
            user=self.user,
            payload={
                "bill_id": bill.id,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        with self.assertRaises(ValidationError):
            create_supplier_debit_note(
                company=self.company,
                user=self.user,
                payload={
                    "purchase_return_id": (
                        purchase_return.id
                    ),
                },
            )

    def test_create_supplier_debit_note_rejects_duplicate_return(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        with self.assertRaises(ValidationError):
            create_supplier_debit_note(
                company=self.company,
                user=self.user,
                payload={
                    "purchase_return_id": (
                        purchase_return.id
                    ),
                },
            )

    def test_create_supplier_debit_note_rejects_other_company_return(self):
        other_return = (
            self._create_confirmed_purchase_return(
                company=self.other_company,
                user=self.other_user,
                supplier=self.other_supplier,
                branch=self.other_branch,
                item=self.other_item,
            )
        )

        with self.assertRaises(ValidationError):
            create_supplier_debit_note(
                company=self.company,
                user=self.user,
                payload={
                    "purchase_return_id": (
                        other_return.id
                    ),
                },
            )

    def test_update_supplier_debit_note_updates_draft_header(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        debit_note = update_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
            payload={
                "supplier_reference": "UPDATED-REF",
                "notes": "Updated supplier debit note",
                "extra_data": {
                    "source": "test",
                },
            },
        )

        self.assertEqual(
            debit_note.supplier_reference,
            "UPDATED-REF",
        )
        self.assertEqual(
            debit_note.notes,
            "Updated supplier debit note",
        )
        self.assertEqual(
            debit_note.extra_data["source"],
            "test",
        )

    def test_issue_supplier_debit_note(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        debit_note = issue_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        self.assertEqual(
            debit_note.status,
            SupplierDebitNoteStatus.ISSUED,
        )
        self.assertIsNotNone(
            debit_note.issued_at
        )
        self.assertEqual(
            debit_note.issued_by,
            self.user,
        )
        self.assertFalse(
            debit_note.can_be_edited
        )
        self.assertTrue(
            debit_note.can_be_posted
        )

    def test_update_supplier_debit_note_rejects_issued_note(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        debit_note = issue_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_supplier_debit_note(
                debit_note=debit_note,
                user=self.user,
                payload={
                    "notes": "Should fail",
                },
            )

    def test_cancel_supplier_debit_note(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        debit_note = issue_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        debit_note = cancel_supplier_debit_note(
            debit_note=debit_note,
            reason="Supplier rejected note",
            user=self.user,
        )

        self.assertEqual(
            debit_note.status,
            SupplierDebitNoteStatus.CANCELLED,
        )
        self.assertIsNotNone(
            debit_note.cancelled_at
        )
        self.assertEqual(
            debit_note.cancelled_by,
            self.user,
        )
        self.assertEqual(
            debit_note.cancellation_reason,
            "Supplier rejected note",
        )

    def test_supplier_debit_note_item_rejects_wrong_return_item(self):
        first_return = (
            self._create_confirmed_purchase_return()
        )
        second_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    first_return.id
                ),
            },
        )

        wrong_return_item = (
            second_return.items.get()
        )

        invalid_item = SupplierDebitNoteItem(
            debit_note=debit_note,
            company=self.company,
            purchase_return_item=(
                wrong_return_item
            ),
            bill_item=wrong_return_item.bill_item,
            item=wrong_return_item.item,
            line_number=2,
            quantity=wrong_return_item.quantity,
        )

        with self.assertRaises(ValidationError):
            invalid_item.full_clean()

    def test_serialize_supplier_debit_note(self):
        purchase_return = (
            self._create_confirmed_purchase_return()
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        data = serialize_supplier_debit_note(
            debit_note,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            debit_note.id,
        )
        self.assertEqual(
            data["status"],
            SupplierDebitNoteStatus.DRAFT,
        )
        self.assertEqual(
            data["supplier"]["id"],
            self.supplier.id,
        )
        self.assertEqual(
            data["purchase_return"]["id"],
            purchase_return.id,
        )
        self.assertEqual(
            data["total_amount"],
            "230.00",
        )
        self.assertEqual(
            data["unapplied_amount"],
            "230.00",
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )
        self.assertTrue(
            data["allowed_actions"]["issue"]
        )
        self.assertFalse(
            data["allowed_actions"]["post"]
        )


class SupplierDebitNotesAPITests(PurchasesTestCase):
    """
    Tests for company supplier debit note APIs.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_confirmed_return(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        return_quantity="2.0000",
    ) -> PurchaseReturn:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        bill = create_purchase_bill(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": "5.0000",
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=user,
        )

        purchase_return = create_purchase_return(
            company=company,
            user=user,
            payload={
                "bill_id": bill.id,
                "reason": PurchaseReturnReason.DAMAGED,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": return_quantity,
                    }
                ],
            },
        )

        return confirm_purchase_return(
            purchase_return=purchase_return,
            user=user,
        )

    def _create_debit_note(
        self,
        *,
        purchase_return=None,
    ) -> SupplierDebitNote:
        purchase_return = (
            purchase_return
            or self._create_confirmed_return()
        )

        return create_supplier_debit_note(
            company=purchase_return.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
                "supplier_reference": "API-DN-001",
            },
        )

    def test_supplier_debit_note_create_endpoint(self):
        purchase_return = (
            self._create_confirmed_return()
        )

        response = self.client.post(
            (
                "/api/company/purchases/"
                "debit-notes/create/"
            ),
            data={
                "purchase_return_id": (
                    purchase_return.id
                ),
                "supplier_reference": "SUP-API-001",
                "notes": "Created through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["debit_note"]["status"],
            SupplierDebitNoteStatus.DRAFT,
        )
        self.assertEqual(
            payload["debit_note"][
                "purchase_return"
            ]["id"],
            purchase_return.id,
        )
        self.assertEqual(
            payload["debit_note"]["total_amount"],
            "230.00",
        )
        self.assertEqual(
            len(payload["debit_note"]["items"]),
            1,
        )

    def test_supplier_debit_notes_list_is_company_scoped(self):
        debit_note = self._create_debit_note()

        other_return = self._create_confirmed_return(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
            return_quantity="1.0000",
        )

        create_supplier_debit_note(
            company=self.other_company,
            user=self.other_user,
            payload={
                "purchase_return_id": (
                    other_return.id
                ),
            },
        )

        response = self.client.get(
            (
                "/api/company/purchases/"
                "debit-notes/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            debit_note.id,
        )

    def test_supplier_debit_note_detail_endpoint(self):
        debit_note = self._create_debit_note()

        response = self.client.get(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["debit_note"]["id"],
            debit_note.id,
        )
        self.assertEqual(
            len(payload["debit_note"]["items"]),
            1,
        )

    def test_supplier_debit_note_detail_blocks_cross_company(self):
        other_return = self._create_confirmed_return(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
            return_quantity="1.0000",
        )

        other_note = create_supplier_debit_note(
            company=self.other_company,
            user=self.other_user,
            payload={
                "purchase_return_id": (
                    other_return.id
                ),
            },
        )

        response = self.client.get(
            (
                "/api/company/purchases/"
                f"debit-notes/{other_note.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_supplier_debit_note_update_endpoint(self):
        debit_note = self._create_debit_note()

        response = self.client.patch(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/update/"
            ),
            data={
                "supplier_reference": "UPDATED-API-REF",
                "notes": "Updated through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["debit_note"][
                "supplier_reference"
            ],
            "UPDATED-API-REF",
        )
        self.assertEqual(
            payload["debit_note"]["notes"],
            "Updated through API",
        )

    def test_supplier_debit_note_issue_endpoint(self):
        debit_note = self._create_debit_note()

        response = self.client.post(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/issue/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        debit_note.refresh_from_db()

        self.assertEqual(
            debit_note.status,
            SupplierDebitNoteStatus.ISSUED,
        )
        self.assertEqual(
            debit_note.issued_by,
            self.user,
        )

    def test_supplier_debit_note_cancel_endpoint(self):
        debit_note = self._create_debit_note()

        debit_note = issue_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        response = self.client.post(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/cancel/"
            ),
            data={
                "reason": "Cancelled through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        debit_note.refresh_from_db()

        self.assertEqual(
            debit_note.status,
            SupplierDebitNoteStatus.CANCELLED,
        )
        self.assertEqual(
            debit_note.cancellation_reason,
            "Cancelled through API",
        )

    def test_supplier_debit_note_create_rejects_draft_return(self):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        purchase_return = create_purchase_return(
            company=self.company,
            user=self.user,
            payload={
                "bill_id": bill.id,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        response = self.client.post(
            (
                "/api/company/purchases/"
                "debit-notes/create/"
            ),
            data={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )
        self.assertFalse(
            response.json()["success"]
        )

    def test_viewer_can_view_but_cannot_create_debit_note(self):
        debit_note = self._create_debit_note()

        self.client.force_login(
            self.viewer_user
        )

        list_response = self.client.get(
            (
                "/api/company/purchases/"
                "debit-notes/"
            )
        )

        self.assertEqual(
            list_response.status_code,
            200,
        )

        detail_response = self.client.get(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/"
            )
        )

        self.assertEqual(
            detail_response.status_code,
            200,
        )

        create_response = self.client.post(
            (
                "/api/company/purchases/"
                "debit-notes/create/"
            ),
            data={
                "purchase_return_id": (
                    debit_note.purchase_return_id
                ),
            },
            content_type="application/json",
        )

        self.assertEqual(
            create_response.status_code,
            403,
        )

    def test_supplier_debit_note_permissions(self):
        admin_user = User.objects.create_user(
            username="debit_notes_admin",
            email="debit_notes_admin@example.com",
            password="StrongPass123!",
        )

        admin_membership = (
            CompanyMembership.objects.create(
                user=admin_user,
                company=self.company,
                role=CompanyRole.ADMIN,
                status=MembershipStatus.ACTIVE,
                is_primary=True,
                created_by=self.user,
            )
        )

        permissions = (
            admin_membership.company_permissions
        )

        expected_permissions = [
            "company.purchases.debit_notes.view",
            "company.purchases.debit_notes.create",
            "company.purchases.debit_notes.update",
            "company.purchases.debit_notes.issue",
            "company.purchases.debit_notes.post",
            "company.purchases.debit_notes.cancel",
        ]

        for permission in expected_permissions:
            self.assertIn(
                permission,
                permissions,
            )

        viewer_permissions = (
            self.viewer_membership.company_permissions
        )

        self.assertIn(
            "company.purchases.debit_notes.view",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.debit_notes.create",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.debit_notes.post",
            viewer_permissions,
        )



class SupplierDebitNotePostingIntegrationTests(
    PurchasesTestCase
):
    """
    Phase 21.7C supplier debit note posting tests.
    """

    def _prepare_inventory_item(self):
        self.item.track_inventory = True
        self.item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        warehouse = create_warehouse(
            company=self.company,
            user=self.user,
            data={
                "code": "WH-PUR-001",
                "name": "Purchase Returns Warehouse",
                "branch_id": self.branch.id,
                "is_default": True,
            },
        )

        location = create_inventory_location(
            company=self.company,
            warehouse=warehouse,
            data={
                "code": "PUR-RETURNS-BIN",
                "name": "Purchase Returns Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        stock_item = StockItem.objects.create(
            company=self.company,
            warehouse=warehouse,
            location=location,
            item=self.item,
            quantity_on_hand=Decimal("10.0000"),
            reserved_quantity=Decimal("0.0000"),
            average_cost=Decimal("100.00"),
        )

        return warehouse, stock_item

    def _create_issued_debit_note(
        self,
        *,
        bill_quantity="5.0000",
        return_quantity="2.0000",
    ):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": bill_quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        purchase_return = create_purchase_return(
            company=self.company,
            user=self.user,
            payload={
                "bill_id": bill.id,
                "reason": PurchaseReturnReason.DAMAGED,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": return_quantity,
                    }
                ],
            },
        )

        purchase_return = confirm_purchase_return(
            purchase_return=purchase_return,
            user=self.user,
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        debit_note = issue_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        return bill, purchase_return, debit_note

    def test_post_supplier_debit_note_applies_bill_inventory_and_accounting(
        self,
    ):
        _warehouse, stock_item = (
            self._prepare_inventory_item()
        )

        bill, purchase_return, debit_note = (
            self._create_issued_debit_note()
        )

        posted_note = post_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        bill.refresh_from_db()
        purchase_return.refresh_from_db()
        posted_note.refresh_from_db()
        stock_item.refresh_from_db()

        return_item = purchase_return.items.get()
        return_item.refresh_from_db()

        self.assertEqual(
            posted_note.status,
            SupplierDebitNoteStatus.POSTED,
        )
        self.assertEqual(
            purchase_return.status,
            PurchaseReturnStatus.POSTED,
        )
        self.assertEqual(
            posted_note.applied_to_bill_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            posted_note.supplier_credit_amount,
            Decimal("0.00"),
        )

        self.assertEqual(
            bill.paid_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            bill.debit_note_applied_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            bill.balance_due,
            Decimal("345.00"),
        )

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("8.0000"),
        )
        self.assertIsNotNone(
            return_item.stock_movement_id
        )
        self.assertEqual(
            return_item.stock_movement.status,
            StockMovementStatus.POSTED,
        )
        self.assertEqual(
            return_item.stock_movement.quantity,
            Decimal("2.0000"),
        )

        debit_note_entries = JournalEntry.objects.filter(
            company=self.company,
            source_type="supplier_debit_note",
            source_id=str(posted_note.id),
            source_number=(
                posted_note.debit_note_number
            ),
            is_auto_posted=True,
        )

        self.assertEqual(
            debit_note_entries.count(),
            1,
        )

        entry = debit_note_entries.get()

        self.assertEqual(
            entry.status,
            JournalEntryStatus.POSTED,
        )
        self.assertEqual(
            entry.total_debit,
            Decimal("230.00"),
        )
        self.assertEqual(
            entry.total_credit,
            Decimal("230.00"),
        )

        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="stock_movement",
                source_id=str(
                    return_item.stock_movement_id
                ),
            ).exists()
        )

    def test_post_supplier_debit_note_creates_supplier_credit_for_excess(
        self,
    ):
        self._prepare_inventory_item()

        bill, _purchase_return, debit_note = (
            self._create_issued_debit_note()
        )

        bill.paid_amount = Decimal("500.00")
        bill.refresh_payment_status()
        bill.full_clean()
        bill.save(
            update_fields=[
                "paid_amount",
                "balance_due",
                "payment_status",
                "updated_at",
            ]
        )

        posted_note = post_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        bill.refresh_from_db()
        posted_note.refresh_from_db()

        supplier_credit = SupplierCredit.objects.get(
            debit_note=posted_note,
        )

        self.assertEqual(
            posted_note.applied_to_bill_amount,
            Decimal("75.00"),
        )
        self.assertEqual(
            posted_note.supplier_credit_amount,
            Decimal("155.00"),
        )
        self.assertEqual(
            bill.debit_note_applied_amount,
            Decimal("75.00"),
        )
        self.assertEqual(
            bill.balance_due,
            Decimal("0.00"),
        )
        self.assertEqual(
            supplier_credit.original_amount,
            Decimal("155.00"),
        )
        self.assertEqual(
            supplier_credit.remaining_amount,
            Decimal("155.00"),
        )

    def test_post_supplier_debit_note_is_idempotent(
        self,
    ):
        _warehouse, stock_item = (
            self._prepare_inventory_item()
        )

        bill, purchase_return, debit_note = (
            self._create_issued_debit_note()
        )

        first_result = post_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        second_result = post_supplier_debit_note(
            debit_note=first_result,
            user=self.user,
        )

        bill.refresh_from_db()
        stock_item.refresh_from_db()

        return_item = purchase_return.items.get()
        return_item.refresh_from_db()

        self.assertEqual(
            first_result.id,
            second_result.id,
        )
        self.assertEqual(
            bill.debit_note_applied_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("8.0000"),
        )
        self.assertEqual(
            StockMovement.objects.filter(
                company=self.company,
                reference_type=(
                    "purchase_return_item"
                ),
                reference_id=return_item.id,
            ).count(),
            1,
        )
        self.assertEqual(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="supplier_debit_note",
                source_id=str(debit_note.id),
                is_auto_posted=True,
            ).count(),
            1,
        )



    def test_purchase_return_uses_selected_stock_location(
        self,
    ):
        self.item.track_inventory = True
        self.item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        warehouse = create_warehouse(
            company=self.company,
            user=self.user,
            data={
                "code": "WH-PUR-LOC-001",
                "name": "Purchase Return Location Warehouse",
                "branch_id": self.branch.id,
                "is_default": True,
            },
        )

        location = create_inventory_location(
            company=self.company,
            warehouse=warehouse,
            data={
                "code": "PUR-RETURN-BIN",
                "name": "Purchase Return Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        stock_item = StockItem.objects.create(
            company=self.company,
            warehouse=warehouse,
            location=location,
            item=self.item,
            quantity_on_hand=Decimal("10.0000"),
            reserved_quantity=Decimal("0.0000"),
            average_cost=Decimal("100.00"),
        )

        _bill, purchase_return, debit_note = (
            self._create_issued_debit_note(
                return_quantity="2.0000",
            )
        )

        posted_note = post_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

        self.assertEqual(
            posted_note.status,
            SupplierDebitNoteStatus.POSTED,
        )

        stock_item.refresh_from_db()

        return_item = purchase_return.items.get()
        return_item.refresh_from_db()

        movement = return_item.stock_movement

        self.assertIsNotNone(movement)
        self.assertEqual(
            movement.location_id,
            location.id,
        )
        self.assertEqual(
            movement.stock_item_id,
            stock_item.id,
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("8.0000"),
        )

    def test_purchase_return_rejects_insufficient_location_balance(
        self,
    ):
        self.item.track_inventory = True
        self.item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        warehouse = create_warehouse(
            company=self.company,
            user=self.user,
            data={
                "code": "WH-PUR-LOC-002",
                "name": "Insufficient Return Warehouse",
                "branch_id": self.branch.id,
                "is_default": True,
            },
        )

        location = create_inventory_location(
            company=self.company,
            warehouse=warehouse,
            data={
                "code": "LOW-STOCK-BIN",
                "name": "Low Stock Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        stock_item = StockItem.objects.create(
            company=self.company,
            warehouse=warehouse,
            location=location,
            item=self.item,
            quantity_on_hand=Decimal("1.0000"),
            reserved_quantity=Decimal("0.0000"),
            average_cost=Decimal("100.00"),
        )

        _bill, purchase_return, debit_note = (
            self._create_issued_debit_note(
                return_quantity="2.0000",
            )
        )

        with self.assertRaises(ValidationError):
            post_supplier_debit_note(
                debit_note=debit_note,
                user=self.user,
            )

        stock_item.refresh_from_db()

        return_item = purchase_return.items.get()
        return_item.refresh_from_db()

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("1.0000"),
        )
        self.assertIsNone(
            return_item.stock_movement_id
        )
        self.assertFalse(
            StockMovement.objects.filter(
                company=self.company,
                reference_type="purchase_return_item",
                reference_id=return_item.id,
            ).exists()
        )


class SupplierDebitNotePostingAPITests(
    PurchasesTestCase
):
    """
    Phase 21.7C supplier debit note post API tests.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_issued_note(self):
        self.item.track_inventory = False
        self.item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "3.0000",
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        bill = post_purchase_bill(
            bill=bill,
            user=self.user,
        )

        purchase_return = create_purchase_return(
            company=self.company,
            user=self.user,
            payload={
                "bill_id": bill.id,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.first().id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        purchase_return = confirm_purchase_return(
            purchase_return=purchase_return,
            user=self.user,
        )

        debit_note = create_supplier_debit_note(
            company=self.company,
            user=self.user,
            payload={
                "purchase_return_id": (
                    purchase_return.id
                ),
            },
        )

        return issue_supplier_debit_note(
            debit_note=debit_note,
            user=self.user,
        )

    def test_supplier_debit_note_post_endpoint(
        self,
    ):
        debit_note = self._create_issued_note()

        response = self.client.post(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/post/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertTrue(
            payload["success"]
        )
        self.assertEqual(
            payload["debit_note"]["status"],
            SupplierDebitNoteStatus.POSTED,
        )
        self.assertEqual(
            payload["debit_note"][
                "applied_to_bill_amount"
            ],
            "115.00",
        )

        debit_note.refresh_from_db()

        self.assertEqual(
            debit_note.status,
            SupplierDebitNoteStatus.POSTED,
        )

    def test_viewer_cannot_post_supplier_debit_note(
        self,
    ):
        debit_note = self._create_issued_note()

        self.client.force_login(
            self.viewer_user
        )

        response = self.client.post(
            (
                "/api/company/purchases/"
                f"debit-notes/{debit_note.id}/post/"
            )
        )

        self.assertEqual(
            response.status_code,
            403,
        )

class PurchaseReceiptsTests(PurchasesTestCase):
    """
    Phase 21.8 purchase receiving and inventory integration tests.
    """

    def setUp(self):
        super().setUp()

        self.item.track_inventory = True
        self.item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        self.warehouse = create_warehouse(
            company=self.company,
            user=self.user,
            data={
                "code": "WH-REC-001",
                "name": "Purchase Receiving Warehouse",
                "branch_id": self.branch.id,
                "is_default": True,
            },
        )

        self.other_warehouse = create_warehouse(
            company=self.other_company,
            user=self.other_user,
            data={
                "code": "WH-REC-999",
                "name": "Other Receiving Warehouse",
                "branch_id": self.other_branch.id,
                "is_default": True,
            },
        )

    def _create_posted_bill(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        quantity="5.0000",
    ) -> PurchaseBill:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        bill = create_purchase_bill(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        return post_purchase_bill(
            bill=bill,
            user=user,
        )

    def _create_receipt(
        self,
        *,
        bill=None,
        quantity="2.0000",
        receive_all=False,
    ) -> PurchaseReceipt:
        bill = bill or self._create_posted_bill()
        bill_item = bill.items.get()

        payload = {
            "bill_id": bill.id,
            "warehouse_id": self.warehouse.id,
            "notes": "Purchase receiving test",
        }

        if receive_all:
            payload["receive_all"] = True
        else:
            payload["items"] = [
                {
                    "bill_item_id": bill_item.id,
                    "quantity": quantity,
                }
            ]

        return create_purchase_receipt(
            company=self.company,
            payload=payload,
            user=self.user,
        )

    def test_generate_purchase_receipt_number(self):
        number = generate_purchase_receipt_number(
            self.company
        )

        expected_prefix = (
            "PREC-"
            f"{timezone.localdate().strftime('%Y%m%d')}-"
        )

        self.assertTrue(
            number.startswith(expected_prefix)
        )
        self.assertTrue(
            number.endswith("000001")
        )

    def test_create_partial_purchase_receipt(self):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )

        receipt = self._create_receipt(
            bill=bill,
            quantity="2.0000",
        )

        receipt.refresh_from_db()
        receipt_item = receipt.items.get()
        bill_item = bill.items.get()

        self.assertEqual(
            receipt.status,
            PurchaseReceiptStatus.DRAFT,
        )
        self.assertEqual(
            receipt.company,
            self.company,
        )
        self.assertEqual(
            receipt.bill,
            bill,
        )
        self.assertEqual(
            receipt.warehouse,
            self.warehouse,
        )
        self.assertEqual(
            receipt_item.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            bill_item.received_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            bill_item.receivable_quantity,
            Decimal("5.0000"),
        )

    def test_create_receive_all_receipt_uses_remaining_quantity(
        self,
    ):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )

        first_receipt = self._create_receipt(
            bill=bill,
            quantity="2.0000",
        )

        post_purchase_receipt(
            receipt=first_receipt,
            user=self.user,
        )

        second_receipt = self._create_receipt(
            bill=bill,
            receive_all=True,
        )

        self.assertEqual(
            second_receipt.items.get().quantity,
            Decimal("3.0000"),
        )

    def test_create_purchase_receipt_rejects_draft_bill(
        self,
    ):
        bill = create_purchase_bill(
            company=self.company,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        with self.assertRaises(ValidationError):
            create_purchase_receipt(
                company=self.company,
                user=self.user,
                payload={
                    "bill_id": bill.id,
                    "warehouse_id": self.warehouse.id,
                    "receive_all": True,
                },
            )

    def test_create_purchase_receipt_rejects_other_company_warehouse(
        self,
    ):
        bill = self._create_posted_bill()

        with self.assertRaises(ValidationError):
            create_purchase_receipt(
                company=self.company,
                user=self.user,
                payload={
                    "bill_id": bill.id,
                    "warehouse_id": (
                        self.other_warehouse.id
                    ),
                    "receive_all": True,
                },
            )

    def test_post_purchase_receipt_updates_inventory(
        self,
    ):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )
        bill_item = bill.items.get()

        receipt = self._create_receipt(
            bill=bill,
            quantity="2.0000",
        )

        receipt = post_purchase_receipt(
            receipt=receipt,
            user=self.user,
        )

        receipt.refresh_from_db()
        receipt_item = receipt.items.get()
        receipt_item.refresh_from_db()
        bill_item.refresh_from_db()

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.item,
        )

        self.assertEqual(
            receipt.status,
            PurchaseReceiptStatus.POSTED,
        )
        self.assertEqual(
            receipt.posted_by,
            self.user,
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            bill_item.received_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            bill_item.receivable_quantity,
            Decimal("3.0000"),
        )
        self.assertIsNotNone(
            receipt_item.stock_movement_id
        )
        self.assertEqual(
            receipt_item.stock_movement.status,
            StockMovementStatus.POSTED,
        )
        self.assertEqual(
            receipt_item.stock_movement.quantity,
            Decimal("2.0000"),
        )

    def test_post_purchase_receipt_is_idempotent(
        self,
    ):
        receipt = self._create_receipt(
            quantity="2.0000",
        )

        first_result = post_purchase_receipt(
            receipt=receipt,
            user=self.user,
        )

        second_result = post_purchase_receipt(
            receipt=first_result,
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.item,
        )

        receipt_item = first_result.items.get()

        self.assertEqual(
            first_result.id,
            second_result.id,
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            StockMovement.objects.filter(
                company=self.company,
                reference_type="purchase_receipt_item",
                reference_id=receipt_item.id,
            ).count(),
            1,
        )

    def test_multiple_partial_receipts_reject_over_receiving(
        self,
    ):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )

        first_receipt = self._create_receipt(
            bill=bill,
            quantity="3.0000",
        )

        post_purchase_receipt(
            receipt=first_receipt,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            self._create_receipt(
                bill=bill,
                quantity="3.0000",
            )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.item,
        )

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("3.0000"),
        )

    def test_update_purchase_receipt_replaces_draft_items(
        self,
    ):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )

        receipt = self._create_receipt(
            bill=bill,
            quantity="1.0000",
        )

        receipt = update_purchase_receipt(
            receipt=receipt,
            user=self.user,
            payload={
                "notes": "Updated receipt",
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.get().id
                        ),
                        "quantity": "4.0000",
                    }
                ],
            },
        )

        self.assertEqual(
            receipt.notes,
            "Updated receipt",
        )
        self.assertEqual(
            receipt.items.get().quantity,
            Decimal("4.0000"),
        )

    def test_cancel_draft_purchase_receipt(
        self,
    ):
        receipt = self._create_receipt()

        receipt = cancel_purchase_receipt(
            receipt=receipt,
            reason="Receiving cancelled",
            user=self.user,
        )

        self.assertEqual(
            receipt.status,
            PurchaseReceiptStatus.CANCELLED,
        )
        self.assertEqual(
            receipt.cancellation_reason,
            "Receiving cancelled",
        )
        self.assertEqual(
            receipt.cancelled_by,
            self.user,
        )

    def test_cancel_posted_purchase_receipt_rejected(
        self,
    ):
        receipt = self._create_receipt()

        receipt = post_purchase_receipt(
            receipt=receipt,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            cancel_purchase_receipt(
                receipt=receipt,
                reason="Should fail",
                user=self.user,
            )

    def test_received_quantity_limits_purchase_return(
        self,
    ):
        bill = self._create_posted_bill(
            quantity="5.0000"
        )
        bill_item = bill.items.get()

        receipt = self._create_receipt(
            bill=bill,
            quantity="2.0000",
        )

        post_purchase_receipt(
            receipt=receipt,
            user=self.user,
        )

        bill_item.refresh_from_db()

        self.assertEqual(
            bill_item.returnable_quantity,
            Decimal("2.0000"),
        )

        with self.assertRaises(ValidationError):
            create_purchase_return(
                company=self.company,
                user=self.user,
                payload={
                    "bill_id": bill.id,
                    "items": [
                        {
                            "bill_item_id": bill_item.id,
                            "quantity": "3.0000",
                        }
                    ],
                },
            )

    def test_serialize_purchase_receipt(
        self,
    ):
        receipt = self._create_receipt()

        data = serialize_purchase_receipt(
            receipt,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            receipt.id,
        )
        self.assertEqual(
            data["status"],
            PurchaseReceiptStatus.DRAFT,
        )
        self.assertEqual(
            data["bill"]["id"],
            receipt.bill_id,
        )
        self.assertEqual(
            data["warehouse"]["id"],
            self.warehouse.id,
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )
        self.assertTrue(
            data["allowed_actions"]["post"]
        )

    def test_purchase_receipt_permissions(
        self,
    ):
        admin_user = User.objects.create_user(
            username="receipt_admin",
            email="receipt_admin@example.com",
            password="StrongPass123!",
        )

        admin_membership = (
            CompanyMembership.objects.create(
                user=admin_user,
                company=self.company,
                role=CompanyRole.ADMIN,
                status=MembershipStatus.ACTIVE,
                is_primary=True,
                created_by=self.user,
            )
        )

        permissions = (
            admin_membership.company_permissions
        )

        expected_permissions = [
            "company.purchases.receipts.view",
            "company.purchases.receipts.create",
            "company.purchases.receipts.update",
            "company.purchases.receipts.post",
            "company.purchases.receipts.cancel",
        ]

        for permission in expected_permissions:
            self.assertIn(
                permission,
                permissions,
            )

        viewer_permissions = (
            self.viewer_membership.company_permissions
        )

        self.assertIn(
            "company.purchases.receipts.view",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.receipts.create",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.receipts.post",
            viewer_permissions,
        )


class PurchaseReceiptsAPITests(PurchasesTestCase):
    """
    Phase 21.8 company purchase receipt API tests.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

        self.item.track_inventory = True
        self.item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        self.warehouse = create_warehouse(
            company=self.company,
            user=self.user,
            data={
                "code": "WH-API-REC-001",
                "name": "API Receiving Warehouse",
                "branch_id": self.branch.id,
                "is_default": True,
            },
        )

    def _create_posted_bill(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        quantity="5.0000",
    ) -> PurchaseBill:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        bill = create_purchase_bill(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

        return post_purchase_bill(
            bill=bill,
            user=user,
        )

    def _create_receipt(
        self,
        *,
        bill=None,
        quantity="2.0000",
    ) -> PurchaseReceipt:
        bill = bill or self._create_posted_bill()

        return create_purchase_receipt(
            company=self.company,
            user=self.user,
            payload={
                "bill_id": bill.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.get().id
                        ),
                        "quantity": quantity,
                    }
                ],
            },
        )

    def test_purchase_receipt_create_endpoint(
        self,
    ):
        bill = self._create_posted_bill()

        response = self.client.post(
            "/api/company/purchases/receipts/create/",
            data={
                "bill_id": bill.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "bill_item_id": (
                            bill.items.get().id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["purchase_receipt"]["status"],
            PurchaseReceiptStatus.DRAFT,
        )
        self.assertEqual(
            len(payload["purchase_receipt"]["items"]),
            1,
        )

    def test_purchase_receipts_list_is_company_scoped(
        self,
    ):
        receipt = self._create_receipt()

        response = self.client.get(
            "/api/company/purchases/receipts/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            receipt.id,
        )

    def test_purchase_receipt_detail_endpoint(
        self,
    ):
        receipt = self._create_receipt()

        response = self.client.get(
            (
                "/api/company/purchases/receipts/"
                f"{receipt.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )
        self.assertEqual(
            response.json()["purchase_receipt"]["id"],
            receipt.id,
        )

    def test_purchase_receipt_detail_blocks_cross_company(
        self,
    ):
        self.other_item.track_inventory = True
        self.other_item.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        other_warehouse = create_warehouse(
            company=self.other_company,
            user=self.other_user,
            data={
                "code": "WH-OTHER-REC",
                "name": "Other Receipt Warehouse",
                "branch_id": self.other_branch.id,
                "is_default": True,
            },
        )

        other_bill = self._create_posted_bill(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
        )

        other_receipt = create_purchase_receipt(
            company=self.other_company,
            user=self.other_user,
            payload={
                "bill_id": other_bill.id,
                "warehouse_id": other_warehouse.id,
                "receive_all": True,
            },
        )

        response = self.client.get(
            (
                "/api/company/purchases/receipts/"
                f"{other_receipt.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_purchase_receipt_update_endpoint(
        self,
    ):
        receipt = self._create_receipt(
            quantity="1.0000",
        )

        response = self.client.patch(
            (
                "/api/company/purchases/receipts/"
                f"{receipt.id}/update/"
            ),
            data={
                "notes": "Updated through API",
                "items": [
                    {
                        "bill_item_id": (
                            receipt.bill.items.get().id
                        ),
                        "quantity": "3.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["purchase_receipt"]["notes"],
            "Updated through API",
        )
        self.assertEqual(
            payload["purchase_receipt"]["items"][0][
                "quantity"
            ],
            "3.0000",
        )

    def test_purchase_receipt_post_endpoint(
        self,
    ):
        receipt = self._create_receipt()

        response = self.client.post(
            (
                "/api/company/purchases/receipts/"
                f"{receipt.id}/post/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        receipt.refresh_from_db()

        self.assertEqual(
            receipt.status,
            PurchaseReceiptStatus.POSTED,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.item,
        )

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("2.0000"),
        )

    def test_purchase_receipt_cancel_endpoint(
        self,
    ):
        receipt = self._create_receipt()

        response = self.client.post(
            (
                "/api/company/purchases/receipts/"
                f"{receipt.id}/cancel/"
            ),
            data={
                "reason": "Cancelled through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        receipt.refresh_from_db()

        self.assertEqual(
            receipt.status,
            PurchaseReceiptStatus.CANCELLED,
        )
        self.assertEqual(
            receipt.cancellation_reason,
            "Cancelled through API",
        )

    def test_viewer_can_view_but_cannot_create_receipt(
        self,
    ):
        receipt = self._create_receipt()

        self.client.force_login(
            self.viewer_user
        )

        list_response = self.client.get(
            "/api/company/purchases/receipts/"
        )

        self.assertEqual(
            list_response.status_code,
            200,
        )

        detail_response = self.client.get(
            (
                "/api/company/purchases/receipts/"
                f"{receipt.id}/"
            )
        )

        self.assertEqual(
            detail_response.status_code,
            200,
        )

        create_response = self.client.post(
            "/api/company/purchases/receipts/create/",
            data={
                "bill_id": receipt.bill_id,
                "warehouse_id": self.warehouse.id,
                "receive_all": True,
            },
            content_type="application/json",
        )

        self.assertEqual(
            create_response.status_code,
            403,
        )

class PurchaseOrdersTests(PurchasesTestCase):
    """
    Phase 21.9 purchase order model and service tests.
    """

    def _create_order(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        quantity="5.0000",
        unit_price="100.00",
    ) -> PurchaseOrder:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        return create_purchase_order(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "order_date": (
                    timezone.localdate().isoformat()
                ),
                "expected_date": (
                    timezone.localdate().isoformat()
                ),
                "supplier_reference": "PO-SUP-001",
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "unit_price": unit_price,
                    }
                ],
                "notes": "Purchase order test",
            },
        )

    def test_create_purchase_order_calculates_totals(
        self,
    ):
        order = self._create_order(
            quantity="2.0000",
            unit_price="100.00",
        )

        order.refresh_from_db()
        order_item = order.items.get()

        self.assertEqual(
            order.status,
            PurchaseOrderStatus.DRAFT,
        )
        self.assertEqual(
            order.company,
            self.company,
        )
        self.assertEqual(
            order.supplier,
            self.supplier,
        )
        self.assertEqual(
            order.items.count(),
            1,
        )
        self.assertEqual(
            order_item.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            order_item.subtotal_amount,
            Decimal("200.00"),
        )
        self.assertEqual(
            order_item.tax_amount,
            Decimal("30.00"),
        )
        self.assertEqual(
            order_item.total_amount,
            Decimal("230.00"),
        )
        self.assertEqual(
            order.total_amount,
            Decimal("230.00"),
        )

    def test_create_purchase_order_rejects_other_company_item(
        self,
    ):
        with self.assertRaises(ValidationError):
            self._create_order(
                item=self.other_item,
            )

    def test_create_purchase_order_rejects_other_company_supplier(
        self,
    ):
        with self.assertRaises(ValidationError):
            self._create_order(
                supplier=self.other_supplier,
            )

    def test_approve_purchase_order(
        self,
    ):
        order = self._create_order()

        order = approve_purchase_order(
            order=order,
            user=self.user,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            PurchaseOrderStatus.APPROVED,
        )
        self.assertIsNotNone(
            order.approved_at,
        )
        self.assertEqual(
            order.approved_by,
            self.user,
        )

    def test_update_purchase_order_replaces_items(
        self,
    ):
        order = self._create_order()

        order = update_purchase_order(
            order=order,
            user=self.user,
            payload={
                "notes": "Updated purchase order",
                "items": [
                    {
                        "item_id": self.service.id,
                        "quantity": "1.0000",
                        "unit_price": "250.00",
                    }
                ],
            },
        )

        order.refresh_from_db()

        self.assertEqual(
            order.notes,
            "Updated purchase order",
        )
        self.assertEqual(
            order.items.count(),
            1,
        )
        self.assertEqual(
            order.items.get().item,
            self.service,
        )
        self.assertEqual(
            order.total_amount,
            Decimal("287.50"),
        )

    def test_update_purchase_order_rejects_approved_order(
        self,
    ):
        order = self._create_order()

        order = approve_purchase_order(
            order=order,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_purchase_order(
                order=order,
                user=self.user,
                payload={
                    "notes": "Should fail",
                },
            )

    def test_cancel_purchase_order(
        self,
    ):
        order = self._create_order()

        order = cancel_purchase_order(
            order=order,
            reason="Supplier unavailable",
            user=self.user,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            PurchaseOrderStatus.CANCELLED,
        )
        self.assertEqual(
            order.cancellation_reason,
            "Supplier unavailable",
        )
        self.assertEqual(
            order.cancelled_by,
            self.user,
        )

    def test_create_full_purchase_bill_from_order(
        self,
    ):
        order = self._create_order(
            quantity="5.0000",
        )

        order = approve_purchase_order(
            order=order,
            user=self.user,
        )

        bill = create_purchase_bill_from_order(
            company=self.company,
            order=order,
            user=self.user,
            payload={
                "bill_date": (
                    timezone.localdate().isoformat()
                ),
                "supplier_bill_number": "SUP-BILL-001",
            },
        )

        bill.refresh_from_db()
        bill_item = bill.items.get()
        order_item = order.items.get()

        self.assertEqual(
            bill.purchase_order,
            order,
        )
        self.assertEqual(
            bill_item.purchase_order_item,
            order_item,
        )
        self.assertEqual(
            bill_item.quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            bill.total_amount,
            order.total_amount,
        )

    def test_create_partial_purchase_bill_from_order(
        self,
    ):
        order = self._create_order(
            quantity="5.0000",
        )

        order = approve_purchase_order(
            order=order,
            user=self.user,
        )

        order_item = order.items.get()

        bill = create_purchase_bill_from_order(
            company=self.company,
            order=order,
            user=self.user,
            payload={
                "items": [
                    {
                        "purchase_order_item_id": (
                            order_item.id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        self.assertEqual(
            bill.items.get().quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            bill.items.get().purchase_order_item,
            order_item,
        )

    def test_create_bill_from_order_rejects_unapproved_order(
        self,
    ):
        order = self._create_order()

        with self.assertRaises(ValidationError):
            create_purchase_bill_from_order(
                company=self.company,
                order=order,
                user=self.user,
                payload={},
            )

    def test_create_bill_from_order_rejects_other_company(
        self,
    ):
        order = self._create_order(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
        )

        order = approve_purchase_order(
            order=order,
            user=self.other_user,
        )

        with self.assertRaises(ValidationError):
            create_purchase_bill_from_order(
                company=self.company,
                order=order,
                user=self.user,
                payload={},
            )

    def test_serialize_purchase_order(
        self,
    ):
        order = self._create_order()

        data = serialize_purchase_order(
            order,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            order.id,
        )
        self.assertEqual(
            data["status"],
            PurchaseOrderStatus.DRAFT,
        )
        self.assertEqual(
            data["supplier"]["id"],
            self.supplier.id,
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )

    def test_purchase_order_permissions(
        self,
    ):
        admin_user = User.objects.create_user(
            username="purchase_order_admin",
            email="purchase_order_admin@example.com",
            password="StrongPass123!",
        )

        admin_membership = (
            CompanyMembership.objects.create(
                user=admin_user,
                company=self.company,
                role=CompanyRole.ADMIN,
                status=MembershipStatus.ACTIVE,
                is_primary=True,
                created_by=self.user,
            )
        )

        admin_permissions = (
            admin_membership.company_permissions
        )

        expected_permissions = [
            "company.purchases.orders.view",
            "company.purchases.orders.create",
            "company.purchases.orders.update",
            "company.purchases.orders.approve",
            "company.purchases.orders.cancel",
            "company.purchases.orders.create_bill",
        ]

        for permission in expected_permissions:
            self.assertIn(
                permission,
                admin_permissions,
            )

        viewer_permissions = (
            self.viewer_membership.company_permissions
        )

        self.assertIn(
            "company.purchases.orders.view",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.orders.create",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.orders.approve",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.orders.create_bill",
            viewer_permissions,
        )


class PurchaseOrdersAPITests(PurchasesTestCase):
    """
    Phase 21.9 company purchase order API tests.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_order(
        self,
        *,
        company=None,
        user=None,
        supplier=None,
        branch=None,
        item=None,
        quantity="5.0000",
    ) -> PurchaseOrder:
        company = company or self.company
        user = user or self.user
        supplier = supplier or self.supplier
        branch = branch or self.branch
        item = item or self.item

        return create_purchase_order(
            company=company,
            user=user,
            payload={
                "supplier_id": supplier.id,
                "branch_id": branch.id,
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "unit_price": "100.00",
                    }
                ],
            },
        )

    def test_purchase_order_create_endpoint(
        self,
    ):
        response = self.client.post(
            "/api/company/purchases/orders/create/",
            data={
                "supplier_id": self.supplier.id,
                "branch_id": self.branch.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "2.0000",
                        "unit_price": "100.00",
                    }
                ],
                "notes": "Created through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(
            payload["success"],
        )
        self.assertEqual(
            payload["purchase_order"]["status"],
            PurchaseOrderStatus.DRAFT,
        )
        self.assertEqual(
            payload["purchase_order"]["total_amount"],
            "230.00",
        )
        self.assertEqual(
            len(payload["purchase_order"]["items"]),
            1,
        )

    def test_purchase_orders_list_is_company_scoped(
        self,
    ):
        order = self._create_order()

        self._create_order(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
        )

        response = self.client.get(
            "/api/company/purchases/orders/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["count"],
            1,
        )
        self.assertEqual(
            payload["results"][0]["id"],
            order.id,
        )

    def test_purchase_order_detail_endpoint(
        self,
    ):
        order = self._create_order()

        response = self.client.get(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )
        self.assertEqual(
            response.json()["purchase_order"]["id"],
            order.id,
        )

    def test_purchase_order_detail_blocks_cross_company(
        self,
    ):
        order = self._create_order(
            company=self.other_company,
            user=self.other_user,
            supplier=self.other_supplier,
            branch=self.other_branch,
            item=self.other_item,
        )

        response = self.client.get(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_purchase_order_update_endpoint(
        self,
    ):
        order = self._create_order()

        response = self.client.patch(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/update/"
            ),
            data={
                "notes": "Updated through API",
                "items": [
                    {
                        "item_id": self.service.id,
                        "quantity": "1.0000",
                        "unit_price": "250.00",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["purchase_order"]["notes"],
            "Updated through API",
        )
        self.assertEqual(
            payload["purchase_order"]["total_amount"],
            "287.50",
        )

    def test_purchase_order_approve_endpoint(
        self,
    ):
        order = self._create_order()

        response = self.client.post(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/approve/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            PurchaseOrderStatus.APPROVED,
        )
        self.assertEqual(
            order.approved_by,
            self.user,
        )

    def test_purchase_order_cancel_endpoint(
        self,
    ):
        order = self._create_order()

        response = self.client.post(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/cancel/"
            ),
            data={
                "reason": "Cancelled through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            PurchaseOrderStatus.CANCELLED,
        )
        self.assertEqual(
            order.cancellation_reason,
            "Cancelled through API",
        )

    def test_purchase_order_create_bill_endpoint(
        self,
    ):
        order = self._create_order(
            quantity="3.0000",
        )

        order = approve_purchase_order(
            order=order,
            user=self.user,
        )

        response = self.client.post(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/create-bill/"
            ),
            data={
                "supplier_bill_number": "API-SUP-001",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(
            payload["success"],
        )
        self.assertEqual(
            payload["bill"]["purchase_order_id"],
            order.id,
        )
        self.assertEqual(
            len(payload["bill"]["items"]),
            1,
        )

        bill = PurchaseBill.objects.get(
            id=payload["bill"]["id"],
        )

        self.assertEqual(
            bill.purchase_order,
            order,
        )

    def test_viewer_can_view_but_cannot_create_order(
        self,
    ):
        order = self._create_order()

        self.client.force_login(
            self.viewer_user,
        )

        list_response = self.client.get(
            "/api/company/purchases/orders/"
        )

        self.assertEqual(
            list_response.status_code,
            200,
        )

        detail_response = self.client.get(
            (
                "/api/company/purchases/orders/"
                f"{order.id}/"
            )
        )

        self.assertEqual(
            detail_response.status_code,
            200,
        )

        create_response = self.client.post(
            "/api/company/purchases/orders/create/",
            data={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            create_response.status_code,
            403,
        )

# ============================================================
# Phase 21.10.5 Purchase Requests Tests
# ============================================================


class PurchaseRequestsTests(PurchasesTestCase):
    """
    Phase 21.10 purchase request model and service tests.
    """

    def _create_request(
        self,
        *,
        company=None,
        user=None,
        branch=None,
        item=None,
        quantity="5.0000",
        suggested_unit_price="100.00",
    ) -> PurchaseRequest:
        company = company or self.company
        user = user or self.user
        branch = branch or self.branch
        item = item or self.item

        return create_purchase_request(
            company=company,
            user=user,
            payload={
                "branch_id": branch.id,
                "request_date": (
                    timezone.localdate().isoformat()
                ),
                "required_date": (
                    timezone.localdate().isoformat()
                ),
                "priority": "HIGH",
                "purpose": "Restock requested items",
                "notes": "Purchase request test",
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "suggested_unit_price": (
                            suggested_unit_price
                        ),
                    }
                ],
            },
        )

    def _create_approved_request(
        self,
        **kwargs,
    ) -> PurchaseRequest:
        purchase_request = self._create_request(
            **kwargs
        )

        purchase_request = submit_purchase_request(
            purchase_request=purchase_request,
            user=kwargs.get("user") or self.user,
        )

        return approve_purchase_request(
            purchase_request=purchase_request,
            user=kwargs.get("user") or self.user,
        )

    def test_generate_purchase_request_number(
        self,
    ):
        number = generate_purchase_request_number(
            self.company
        )

        expected_prefix = (
            "PR-"
            f"{timezone.localdate().strftime('%Y%m%d')}-"
        )

        self.assertTrue(
            number.startswith(expected_prefix)
        )
        self.assertTrue(
            number.endswith("000001")
        )

    def test_create_purchase_request_with_items(
        self,
    ):
        purchase_request = self._create_request(
            quantity="2.0000",
            suggested_unit_price="90.00",
        )

        purchase_request.refresh_from_db()
        request_item = purchase_request.items.get()

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.DRAFT,
        )
        self.assertEqual(
            purchase_request.company,
            self.company,
        )
        self.assertEqual(
            purchase_request.branch,
            self.branch,
        )
        self.assertEqual(
            purchase_request.priority,
            "HIGH",
        )
        self.assertEqual(
            purchase_request.requested_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            purchase_request.converted_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            purchase_request.remaining_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            request_item.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            request_item.suggested_unit_price,
            Decimal("90.00"),
        )
        self.assertEqual(
            request_item.item_name_snapshot,
            self.item.name,
        )

    def test_create_purchase_request_rejects_empty_items(
        self,
    ):
        with self.assertRaises(ValidationError):
            create_purchase_request(
                company=self.company,
                user=self.user,
                payload={
                    "branch_id": self.branch.id,
                    "items": [],
                },
            )

    def test_create_purchase_request_rejects_other_company_item(
        self,
    ):
        with self.assertRaises(ValidationError):
            self._create_request(
                item=self.other_item,
            )

    def test_create_purchase_request_rejects_other_company_branch(
        self,
    ):
        with self.assertRaises(ValidationError):
            self._create_request(
                branch=self.other_branch,
            )

    def test_update_purchase_request_replaces_items(
        self,
    ):
        purchase_request = self._create_request()

        purchase_request = update_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
            payload={
                "priority": "URGENT",
                "purpose": "Urgent services",
                "notes": "Updated request",
                "items": [
                    {
                        "item_id": self.service.id,
                        "quantity": "3.0000",
                        "suggested_unit_price": "250.00",
                    }
                ],
            },
        )

        purchase_request.refresh_from_db()
        request_item = purchase_request.items.get()

        self.assertEqual(
            purchase_request.priority,
            "URGENT",
        )
        self.assertEqual(
            purchase_request.purpose,
            "Urgent services",
        )
        self.assertEqual(
            purchase_request.notes,
            "Updated request",
        )
        self.assertEqual(
            purchase_request.items.count(),
            1,
        )
        self.assertEqual(
            request_item.item,
            self.service,
        )
        self.assertEqual(
            request_item.quantity,
            Decimal("3.0000"),
        )

    def test_purchase_request_submit_and_approve(
        self,
    ):
        purchase_request = self._create_request()

        purchase_request = submit_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.SUBMITTED,
        )
        self.assertEqual(
            purchase_request.submitted_by,
            self.user,
        )
        self.assertIsNotNone(
            purchase_request.submitted_at,
        )

        purchase_request = approve_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.APPROVED,
        )
        self.assertEqual(
            purchase_request.approved_by,
            self.user,
        )
        self.assertIsNotNone(
            purchase_request.approved_at,
        )

    def test_purchase_request_reject(
        self,
    ):
        purchase_request = self._create_request()

        purchase_request = submit_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        purchase_request = reject_purchase_request(
            purchase_request=purchase_request,
            reason="Budget was not approved",
            user=self.user,
        )

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.REJECTED,
        )
        self.assertEqual(
            purchase_request.rejected_by,
            self.user,
        )
        self.assertEqual(
            purchase_request.rejection_reason,
            "Budget was not approved",
        )

    def test_purchase_request_cancel(
        self,
    ):
        purchase_request = self._create_request()

        purchase_request = cancel_purchase_request(
            purchase_request=purchase_request,
            reason="Request no longer required",
            user=self.user,
        )

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.CANCELLED,
        )
        self.assertEqual(
            purchase_request.cancelled_by,
            self.user,
        )
        self.assertEqual(
            purchase_request.cancellation_reason,
            "Request no longer required",
        )

    def test_update_purchase_request_rejects_submitted_request(
        self,
    ):
        purchase_request = self._create_request()

        purchase_request = submit_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_purchase_request(
                purchase_request=purchase_request,
                user=self.user,
                payload={
                    "notes": "Should fail",
                },
            )

    def test_convert_full_request_to_purchase_order(
        self,
    ):
        purchase_request = self._create_approved_request(
            quantity="5.0000",
        )

        request_item = purchase_request.items.get()

        order = convert_purchase_request_to_order(
            company=self.company,
            purchase_request=purchase_request,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
            },
        )

        order.refresh_from_db()
        purchase_request.refresh_from_db()
        order_item = order.items.get()
        request_item.refresh_from_db()

        self.assertEqual(
            order.purchase_request,
            purchase_request,
        )
        self.assertEqual(
            order.status,
            PurchaseOrderStatus.DRAFT,
        )
        self.assertEqual(
            order.supplier,
            self.supplier,
        )
        self.assertEqual(
            order_item.purchase_request_item,
            request_item,
        )
        self.assertEqual(
            order_item.quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            purchase_request.converted_quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            purchase_request.remaining_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.CONVERTED,
        )

    def test_convert_request_partially_then_fully(
        self,
    ):
        purchase_request = self._create_approved_request(
            quantity="5.0000",
        )

        request_item = purchase_request.items.get()

        first_order = convert_purchase_request_to_order(
            company=self.company,
            purchase_request=purchase_request,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "purchase_request_item_id": (
                            request_item.id
                        ),
                        "quantity": "2.0000",
                        "unit_price": "95.00",
                    }
                ],
            },
        )

        purchase_request.refresh_from_db()
        request_item.refresh_from_db()

        self.assertEqual(
            first_order.items.get().quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.PARTIALLY_CONVERTED,
        )
        self.assertEqual(
            purchase_request.converted_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            purchase_request.remaining_quantity,
            Decimal("3.0000"),
        )

        second_order = convert_purchase_request_to_order(
            company=self.company,
            purchase_request=purchase_request,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
            },
        )

        purchase_request.refresh_from_db()

        self.assertEqual(
            second_order.items.get().quantity,
            Decimal("3.0000"),
        )
        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.CONVERTED,
        )
        self.assertEqual(
            purchase_request.converted_quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            purchase_request.remaining_quantity,
            Decimal("0.0000"),
        )

    def test_convert_request_rejects_over_conversion(
        self,
    ):
        purchase_request = self._create_approved_request(
            quantity="3.0000",
        )
        request_item = purchase_request.items.get()

        with self.assertRaises(ValidationError):
            convert_purchase_request_to_order(
                company=self.company,
                purchase_request=purchase_request,
                user=self.user,
                payload={
                    "supplier_id": self.supplier.id,
                    "items": [
                        {
                            "purchase_request_item_id": (
                                request_item.id
                            ),
                            "quantity": "4.0000",
                        }
                    ],
                },
            )

    def test_convert_request_rejects_duplicate_request_item(
        self,
    ):
        purchase_request = self._create_approved_request(
            quantity="5.0000",
        )
        request_item = purchase_request.items.get()

        with self.assertRaises(ValidationError):
            convert_purchase_request_to_order(
                company=self.company,
                purchase_request=purchase_request,
                user=self.user,
                payload={
                    "supplier_id": self.supplier.id,
                    "items": [
                        {
                            "purchase_request_item_id": (
                                request_item.id
                            ),
                            "quantity": "2.0000",
                        },
                        {
                            "purchase_request_item_id": (
                                request_item.id
                            ),
                            "quantity": "1.0000",
                        },
                    ],
                },
            )

    def test_convert_request_rejects_unapproved_request(
        self,
    ):
        purchase_request = self._create_request()

        with self.assertRaises(ValidationError):
            convert_purchase_request_to_order(
                company=self.company,
                purchase_request=purchase_request,
                user=self.user,
                payload={
                    "supplier_id": self.supplier.id,
                },
            )

    def test_convert_request_rejects_other_company_supplier(
        self,
    ):
        purchase_request = self._create_approved_request()

        with self.assertRaises(ValidationError):
            convert_purchase_request_to_order(
                company=self.company,
                purchase_request=purchase_request,
                user=self.user,
                payload={
                    "supplier_id": self.other_supplier.id,
                },
            )

    def test_cancel_converted_order_restores_request_quantity(
        self,
    ):
        purchase_request = self._create_approved_request(
            quantity="5.0000",
        )

        order = convert_purchase_request_to_order(
            company=self.company,
            purchase_request=purchase_request,
            user=self.user,
            payload={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "purchase_request_item_id": (
                            purchase_request.items.get().id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        purchase_request.refresh_from_db()

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.PARTIALLY_CONVERTED,
        )

        cancel_purchase_order(
            order=order,
            reason="Order conversion cancelled",
            user=self.user,
        )

        purchase_request.refresh_from_db()

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.APPROVED,
        )
        self.assertEqual(
            purchase_request.converted_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            purchase_request.remaining_quantity,
            Decimal("5.0000"),
        )

    def test_serialize_purchase_request(
        self,
    ):
        purchase_request = self._create_request()

        data = serialize_purchase_request(
            purchase_request,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            purchase_request.id,
        )
        self.assertEqual(
            data["status"],
            PurchaseRequestStatus.DRAFT,
        )
        self.assertEqual(
            data["priority"],
            "HIGH",
        )
        self.assertEqual(
            data["requested_quantity"],
            "5.0000",
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )
        self.assertTrue(
            data["allowed_actions"]["submit"],
        )
        self.assertFalse(
            data["allowed_actions"]["convert_to_order"],
        )

    def test_purchase_request_permissions(
        self,
    ):
        admin_user = User.objects.create_user(
            username="purchase_request_admin",
            email="purchase_request_admin@example.com",
            password="StrongPass123!",
        )

        admin_membership = (
            CompanyMembership.objects.create(
                user=admin_user,
                company=self.company,
                role=CompanyRole.ADMIN,
                status=MembershipStatus.ACTIVE,
                is_primary=True,
                created_by=self.user,
            )
        )

        admin_permissions = (
            admin_membership.company_permissions
        )

        expected_permissions = [
            "company.purchases.requests.view",
            "company.purchases.requests.create",
            "company.purchases.requests.update",
            "company.purchases.requests.submit",
            "company.purchases.requests.approve",
            "company.purchases.requests.reject",
            "company.purchases.requests.cancel",
            "company.purchases.requests.convert_order",
        ]

        for permission in expected_permissions:
            self.assertIn(
                permission,
                admin_permissions,
            )

        viewer_permissions = (
            self.viewer_membership.company_permissions
        )

        self.assertIn(
            "company.purchases.requests.view",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.requests.create",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.requests.approve",
            viewer_permissions,
        )
        self.assertNotIn(
            "company.purchases.requests.convert_order",
            viewer_permissions,
        )


class PurchaseRequestsAPITests(PurchasesTestCase):
    """
    Phase 21.10 company purchase request API tests.
    """

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def _create_request(
        self,
        *,
        company=None,
        user=None,
        branch=None,
        item=None,
        quantity="5.0000",
    ) -> PurchaseRequest:
        company = company or self.company
        user = user or self.user
        branch = branch or self.branch
        item = item or self.item

        return create_purchase_request(
            company=company,
            user=user,
            payload={
                "branch_id": branch.id,
                "priority": "NORMAL",
                "purpose": "API purchase request",
                "items": [
                    {
                        "item_id": item.id,
                        "quantity": quantity,
                        "suggested_unit_price": "100.00",
                    }
                ],
            },
        )

    def test_purchase_request_create_endpoint(
        self,
    ):
        response = self.client.post(
            "/api/company/purchases/requests/create/",
            data={
                "branch_id": self.branch.id,
                "priority": "URGENT",
                "purpose": "Created through API",
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "2.0000",
                        "suggested_unit_price": "100.00",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(
            payload["success"],
        )
        self.assertEqual(
            payload["purchase_request"]["status"],
            PurchaseRequestStatus.DRAFT,
        )
        self.assertEqual(
            payload["purchase_request"]["priority"],
            "URGENT",
        )
        self.assertEqual(
            payload["purchase_request"][
                "requested_quantity"
            ],
            "2.0000",
        )
        self.assertEqual(
            len(
                payload["purchase_request"]["items"]
            ),
            1,
        )

    def test_purchase_request_create_can_submit_now(
        self,
    ):
        response = self.client.post(
            "/api/company/purchases/requests/create/",
            data={
                "branch_id": self.branch.id,
                "submit_now": True,
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )
        self.assertEqual(
            response.json()["purchase_request"]["status"],
            PurchaseRequestStatus.SUBMITTED,
        )

    def test_purchase_requests_list_is_company_scoped(
        self,
    ):
        purchase_request = self._create_request()

        self._create_request(
            company=self.other_company,
            user=self.other_user,
            branch=self.other_branch,
            item=self.other_item,
        )

        response = self.client.get(
            "/api/company/purchases/requests/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["count"],
            1,
        )
        self.assertEqual(
            payload["results"][0]["id"],
            purchase_request.id,
        )

    def test_purchase_request_list_supports_search(
        self,
    ):
        purchase_request = self._create_request()

        response = self.client.get(
            "/api/company/purchases/requests/",
            {
                "search": (
                    purchase_request.request_number
                ),
            },
        )

        self.assertEqual(
            response.status_code,
            200,
        )
        self.assertEqual(
            response.json()["count"],
            1,
        )

    def test_purchase_request_detail_endpoint(
        self,
    ):
        purchase_request = self._create_request()

        response = self.client.get(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["purchase_request"]["id"],
            purchase_request.id,
        )
        self.assertEqual(
            len(
                payload["purchase_request"]["items"]
            ),
            1,
        )
        self.assertEqual(
            payload["purchase_request"][
                "purchase_orders"
            ],
            [],
        )

    def test_purchase_request_detail_blocks_cross_company(
        self,
    ):
        other_request = self._create_request(
            company=self.other_company,
            user=self.other_user,
            branch=self.other_branch,
            item=self.other_item,
        )

        response = self.client.get(
            (
                "/api/company/purchases/requests/"
                f"{other_request.id}/"
            )
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_purchase_request_update_endpoint(
        self,
    ):
        purchase_request = self._create_request()

        response = self.client.patch(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/update/"
            ),
            data={
                "priority": "HIGH",
                "notes": "Updated through API",
                "items": [
                    {
                        "item_id": self.service.id,
                        "quantity": "3.0000",
                        "suggested_unit_price": "250.00",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertEqual(
            payload["purchase_request"]["priority"],
            "HIGH",
        )
        self.assertEqual(
            payload["purchase_request"]["notes"],
            "Updated through API",
        )
        self.assertEqual(
            payload["purchase_request"][
                "requested_quantity"
            ],
            "3.0000",
        )

    def test_purchase_request_submit_and_approve_endpoints(
        self,
    ):
        purchase_request = self._create_request()

        submit_response = self.client.post(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/submit/"
            )
        )

        self.assertEqual(
            submit_response.status_code,
            200,
        )
        self.assertEqual(
            submit_response.json()[
                "purchase_request"
            ]["status"],
            PurchaseRequestStatus.SUBMITTED,
        )

        approve_response = self.client.post(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/approve/"
            )
        )

        self.assertEqual(
            approve_response.status_code,
            200,
        )

        purchase_request.refresh_from_db()

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.APPROVED,
        )
        self.assertEqual(
            purchase_request.approved_by,
            self.user,
        )

    def test_purchase_request_reject_endpoint(
        self,
    ):
        purchase_request = self._create_request()

        submit_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        response = self.client.post(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/reject/"
            ),
            data={
                "reason": "Rejected through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        purchase_request.refresh_from_db()

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.REJECTED,
        )
        self.assertEqual(
            purchase_request.rejection_reason,
            "Rejected through API",
        )

    def test_purchase_request_cancel_endpoint(
        self,
    ):
        purchase_request = self._create_request()

        response = self.client.post(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/cancel/"
            ),
            data={
                "reason": "Cancelled through API",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        purchase_request.refresh_from_db()

        self.assertEqual(
            purchase_request.status,
            PurchaseRequestStatus.CANCELLED,
        )
        self.assertEqual(
            purchase_request.cancellation_reason,
            "Cancelled through API",
        )

    def test_purchase_request_convert_order_endpoint(
        self,
    ):
        purchase_request = self._create_request(
            quantity="4.0000",
        )

        purchase_request = submit_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )
        purchase_request = approve_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        request_item = purchase_request.items.get()

        response = self.client.post(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/convert-order/"
            ),
            data={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "purchase_request_item_id": (
                            request_item.id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        payload = response.json()

        self.assertTrue(
            payload["success"],
        )
        self.assertEqual(
            payload["purchase_order"][
                "purchase_request"
            ]["id"],
            purchase_request.id,
        )
        self.assertEqual(
            payload["purchase_order"]["items"][0][
                "purchase_request_item_id"
            ],
            request_item.id,
        )
        self.assertEqual(
            payload["purchase_request"]["status"],
            PurchaseRequestStatus.PARTIALLY_CONVERTED,
        )
        self.assertEqual(
            payload["purchase_request"][
                "remaining_quantity"
            ],
            "2.0000",
        )

    def test_purchase_request_convert_order_rejects_over_conversion(
        self,
    ):
        purchase_request = self._create_request(
            quantity="2.0000",
        )

        purchase_request = submit_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )
        purchase_request = approve_purchase_request(
            purchase_request=purchase_request,
            user=self.user,
        )

        response = self.client.post(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/convert-order/"
            ),
            data={
                "supplier_id": self.supplier.id,
                "items": [
                    {
                        "purchase_request_item_id": (
                            purchase_request.items.get().id
                        ),
                        "quantity": "3.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )
        self.assertFalse(
            response.json()["success"],
        )

    def test_viewer_can_view_but_cannot_create_request(
        self,
    ):
        purchase_request = self._create_request()

        self.client.force_login(
            self.viewer_user,
        )

        list_response = self.client.get(
            "/api/company/purchases/requests/"
        )

        self.assertEqual(
            list_response.status_code,
            200,
        )

        detail_response = self.client.get(
            (
                "/api/company/purchases/requests/"
                f"{purchase_request.id}/"
            )
        )

        self.assertEqual(
            detail_response.status_code,
            200,
        )

        create_response = self.client.post(
            "/api/company/purchases/requests/create/",
            data={
                "items": [
                    {
                        "item_id": self.item.id,
                        "quantity": "1.0000",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            create_response.status_code,
            403,
        )


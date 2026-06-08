# ============================================================
# 📂 sales/tests.py
# 🧠 PrimeyAcc | Sales Tests V1.3
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
# ✅ Phase 10.1 automatic accounting posting on issue
# ✅ Company permissions through CompanyMembership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - نختبر الأساس قبل إغلاق APIs
# - لا نعتمد على company_id من الواجهة كمصدر ثقة
# - كل فاتورة وبند يجب أن يبقيا داخل نفس الشركة
# - APIs يجب أن تعتمد على CompanyMembership/request.company
# - Phase 10.1 يختبر أن إصدار فاتورة البيع ينشئ قيدًا محاسبيًا تلقائيًا بدون تكرار
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from accounting.models import JournalEntry, JournalEntryStatus
from accounting.services import post_sales_invoice_to_accounting
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


SALES_OWNER_PERMISSIONS = [
    "company.sales.invoices.view",
    "company.sales.invoices.create",
    "company.sales.invoices.update",
    "company.sales.invoices.issue",
    "company.sales.invoices.cancel",
]

SALES_VIEWER_PERMISSIONS = [
    "company.sales.invoices.view",
]


def _model_field_names(model_class) -> set[str]:
    """
    Return concrete field names for a Django model.
    """
    return {field.name for field in model_class._meta.fields}


def safe_create(model_class, **kwargs):
    """
    Create a model instance using only fields that exist on the current model.

    This keeps tests aligned with the actual backend models and prevents test
    setup errors when a field name changed between phases, such as:
    - CatalogUnit.is_active not existing
    - CatalogItem.selling_price being sale_price in the current catalog model
    """
    field_names = _model_field_names(model_class)
    payload = dict(kwargs)

    if "selling_price" in payload and "sale_price" in field_names and "sale_price" not in payload:
        payload["sale_price"] = payload.pop("selling_price")

    if "purchase_price" in payload and "cost_price" in field_names and "cost_price" not in payload:
        payload["cost_price"] = payload.pop("purchase_price")

    payload = {
        key: value
        for key, value in payload.items()
        if key in field_names
    }

    return model_class.objects.create(**payload)


def _is_django_model_class(value) -> bool:
    """
    Return True when the imported CompanyRole is a Django model class.
    """
    return bool(getattr(value, "_meta", None) is not None and hasattr(value, "objects"))


def _choice_value(enum_cls, preferred_names: list[str], fallback: str = "") -> str:
    """
    Resolve a safe value from a Django TextChoices-like class.
    """
    for name in preferred_names:
        if hasattr(enum_cls, name):
            member = getattr(enum_cls, name)
            return str(getattr(member, "value", member))

    choices = list(getattr(enum_cls, "choices", []) or [])
    for value, label in choices:
        combined = f"{value} {label}".upper()
        if any(name.upper() in combined for name in preferred_names):
            return str(value)

    if choices:
        return str(choices[0][0])

    return fallback or (preferred_names[0] if preferred_names else "")


def _create_or_resolve_company_role(
    *,
    company: Company,
    name: str,
    code: str,
    permissions: list[str],
    preferred_names: list[str],
):
    """
    Create a role when CompanyRole is a real model, otherwise resolve the
    correct TextChoices value for CompanyMembership.role.
    """
    if _is_django_model_class(CompanyRole):
        return safe_create(
            CompanyRole,
            company=company,
            name=name,
            code=code,
            is_active=True,
            is_system=True,
            permissions=permissions,
        )

    return _choice_value(
        CompanyRole,
        preferred_names=preferred_names,
        fallback=code,
    )


def _create_company_membership(
    *,
    company: Company,
    user,
    role,
    permissions: list[str],
    is_default: bool = True,
) -> CompanyMembership:
    """
    Create CompanyMembership using only fields that exist in the current model.
    """
    return safe_create(
        CompanyMembership,
        company=company,
        user=user,
        role=role,
        status=MembershipStatus.ACTIVE,
        is_default=is_default,
        is_primary=is_default,
        can_access_company=True,
        can_access_system=False,
        permissions=permissions,
        custom_permissions=permissions,
        extra_permissions=permissions,
        permission_overrides=permissions,
        company_permissions=permissions,
        created_by=user,
    )


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

        self.company = safe_create(
            Company,
            name="Primey Sales Company",
            company_code="SALES-001",
            status="ACTIVE",
            is_active=True,
            currency_code="SAR",
            vat_percentage=Decimal("15.00"),
            owner=self.user,
            created_by=self.user,
        )

        safe_create(
            CompanySettings,
            company=self.company,
            invoice_prefix="INV",
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_company = safe_create(
            Company,
            name="Other Sales Company",
            company_code="SALES-002",
            status="ACTIVE",
            is_active=True,
            currency_code="SAR",
            vat_percentage=Decimal("15.00"),
            owner=self.other_user,
            created_by=self.other_user,
        )

        safe_create(
            CompanySettings,
            company=self.other_company,
            invoice_prefix="OTH",
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        self.owner_role = _create_or_resolve_company_role(
            company=self.company,
            name="Sales Owner",
            code="sales_owner",
            permissions=SALES_OWNER_PERMISSIONS,
            preferred_names=[
                "OWNER",
                "COMPANY_OWNER",
                "ADMIN",
                "COMPANY_ADMIN",
                "MANAGER",
            ],
        )

        self.viewer_role = _create_or_resolve_company_role(
            company=self.company,
            name="Sales Viewer",
            code="sales_viewer",
            permissions=SALES_VIEWER_PERMISSIONS,
            preferred_names=[
                "VIEWER",
                "SALES_VIEWER",
                "EMPLOYEE",
                "USER",
            ],
        )

        self.other_role = _create_or_resolve_company_role(
            company=self.other_company,
            name="Other Sales Owner",
            code="other_sales_owner",
            permissions=SALES_OWNER_PERMISSIONS,
            preferred_names=[
                "OWNER",
                "COMPANY_OWNER",
                "ADMIN",
                "COMPANY_ADMIN",
                "MANAGER",
            ],
        )

        self.membership = _create_company_membership(
            company=self.company,
            user=self.user,
            role=self.owner_role,
            permissions=SALES_OWNER_PERMISSIONS,
            is_default=True,
        )

        self.viewer_membership = _create_company_membership(
            company=self.company,
            user=self.viewer_user,
            role=self.viewer_role,
            permissions=SALES_VIEWER_PERMISSIONS,
            is_default=True,
        )

        self.other_membership = _create_company_membership(
            company=self.other_company,
            user=self.other_user,
            role=self.other_role,
            permissions=SALES_OWNER_PERMISSIONS,
            is_default=True,
        )

        self.branch = safe_create(
            Branch,
            company=self.company,
            name="Main Branch",
            branch_code="BR-001",
            is_default=True,
            is_active=True,
            status="ACTIVE",
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_branch = safe_create(
            Branch,
            company=self.other_company,
            name="Other Branch",
            branch_code="BR-002",
            is_default=True,
            is_active=True,
            status="ACTIVE",
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        self.customer = safe_create(
            BusinessParty,
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.CUSTOMER,
            status=BusinessPartyStatus.ACTIVE,
            display_name="Customer One",
            code="CUST-001",
            phone="0500000001",
            mobile="0500000001",
            vat_number="300000000000001",
            created_by=self.user,
            updated_by=self.user,
        )

        self.supplier = safe_create(
            BusinessParty,
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.SUPPLIER,
            status=BusinessPartyStatus.ACTIVE,
            display_name="Supplier One",
            code="SUP-001",
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_customer = safe_create(
            BusinessParty,
            company=self.other_company,
            branch=self.other_branch,
            party_type=BusinessPartyType.CUSTOMER,
            status=BusinessPartyStatus.ACTIVE,
            display_name="Other Customer",
            code="CUST-002",
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        self.unit = safe_create(
            CatalogUnit,
            company=self.company,
            code="PCS",
            name="Piece",
            symbol="pc",
            is_active=True,
            created_by=self.user,
        )

        self.other_unit = safe_create(
            CatalogUnit,
            company=self.other_company,
            code="OPCS",
            name="Other Piece",
            symbol="opc",
            is_active=True,
            created_by=self.other_user,
        )

        self.item = safe_create(
            CatalogItem,
            company=self.company,
            unit=self.unit,
            name="Sales Item",
            code="ITEM-001",
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            is_sellable=True,
            is_purchasable=True,
            track_inventory=True,
            selling_price=Decimal("100.00"),
            purchase_price=Decimal("60.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
            updated_by=self.user,
        )

        self.service = safe_create(
            CatalogItem,
            company=self.company,
            unit=self.unit,
            name="Sales Service",
            code="SERV-001",
            item_type=CatalogItemType.SERVICE,
            status=CatalogItemStatus.ACTIVE,
            is_sellable=True,
            is_purchasable=False,
            track_inventory=False,
            selling_price=Decimal("250.00"),
            purchase_price=Decimal("0.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
            updated_by=self.user,
        )

        self.inactive_item = safe_create(
            CatalogItem,
            company=self.company,
            unit=self.unit,
            name="Inactive Item",
            code="ITEM-INACTIVE",
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.INACTIVE,
            is_sellable=True,
            is_purchasable=True,
            track_inventory=True,
            selling_price=Decimal("100.00"),
            purchase_price=Decimal("60.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
            updated_by=self.user,
        )

        self.not_sellable_item = safe_create(
            CatalogItem,
            company=self.company,
            unit=self.unit,
            name="Not Sellable Item",
            code="ITEM-NOT-SELL",
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            is_sellable=False,
            is_purchasable=True,
            track_inventory=True,
            selling_price=Decimal("100.00"),
            purchase_price=Decimal("60.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_item = safe_create(
            CatalogItem,
            company=self.other_company,
            unit=self.other_unit,
            name="Other Item",
            code="ITEM-002",
            item_type=CatalogItemType.PRODUCT,
            status=CatalogItemStatus.ACTIVE,
            is_sellable=True,
            is_purchasable=True,
            track_inventory=True,
            selling_price=Decimal("200.00"),
            purchase_price=Decimal("120.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.other_user,
            updated_by=self.other_user,
        )

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
        )


class SalesModelTests(SalesTestCase):
    """
    Tests for sales/models.py validation and totals.
    """

    def test_invoice_model_validates_branch_company(self):
        invoice = SalesInvoice(
            company=self.company,
            branch=self.other_branch,
            customer=self.customer,
            invoice_number="INV-INVALID-BRANCH",
            invoice_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            invoice.full_clean()

    def test_invoice_model_validates_customer_company(self):
        invoice = SalesInvoice(
            company=self.company,
            branch=self.branch,
            customer=self.other_customer,
            invoice_number="INV-INVALID-CUSTOMER",
            invoice_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            invoice.full_clean()

    def test_invoice_model_rejects_supplier_as_customer(self):
        invoice = SalesInvoice(
            company=self.company,
            branch=self.branch,
            customer=self.supplier,
            invoice_number="INV-INVALID-SUPPLIER",
            invoice_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            invoice.full_clean()

    def test_invoice_item_calculates_totals(self):
        invoice = SalesInvoice.objects.create(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice_number="INV-MODEL-001",
            invoice_date=timezone.localdate(),
            currency_code="SAR",
        )

        item = SalesInvoiceItem(
            company=self.company,
            invoice=invoice,
            catalog_item=self.item,
            item_code_snapshot="ITEM-001",
            item_name_snapshot="Sales Item",
            unit_name_snapshot="Piece",
            quantity=Decimal("2.0000"),
            unit_price=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
        )

        item.full_clean()
        item.save()

        self.assertEqual(item.line_subtotal, Decimal("200.00"))
        self.assertEqual(item.taxable_amount, Decimal("190.00"))
        self.assertEqual(item.tax_amount, Decimal("28.50"))
        self.assertEqual(item.line_total, Decimal("218.50"))

    def test_invoice_item_rejects_other_company_catalog_item(self):
        invoice = SalesInvoice.objects.create(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice_number="INV-MODEL-002",
            invoice_date=timezone.localdate(),
            currency_code="SAR",
        )

        item = SalesInvoiceItem(
            company=self.company,
            invoice=invoice,
            catalog_item=self.other_item,
            item_code_snapshot="ITEM-002",
            item_name_snapshot="Other Item",
            unit_name_snapshot="Other Piece",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("200.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
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

    def test_issue_sales_invoice_creates_automatic_accounting_entry_once(self):
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

        entries = JournalEntry.objects.filter(
            company=self.company,
            source_type="sales_invoice",
            source_id=str(invoice.id),
            source_number=invoice.invoice_number,
            is_auto_posted=True,
        )

        self.assertEqual(entries.count(), 1)

        entry = entries.get()
        self.assertEqual(entry.status, JournalEntryStatus.POSTED)
        self.assertEqual(entry.total_debit, invoice.total_amount)
        self.assertEqual(entry.total_credit, invoice.total_amount)
        self.assertEqual(entry.reference, invoice.invoice_number)
        self.assertEqual(entry.source_number, invoice.invoice_number)

        same_entry = post_sales_invoice_to_accounting(
            invoice,
            actor=self.user,
            auto_post=True,
        )

        self.assertEqual(same_entry.id, entry.id)
        self.assertEqual(entries.count(), 1)

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
    Tests for company sales invoice API endpoints.
    """

    def test_sales_invoices_list_returns_current_company_only(self):
        current_invoice = self._create_invoice_for_api()

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

        response = self.client.get("/api/company/sales/invoices/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], current_invoice.id)
        self.assertNotEqual(payload["results"][0]["id"], other_invoice.id)

    def test_sales_invoices_list_supports_search(self):
        invoice = self._create_invoice_for_api()

        response = self.client.get(
            "/api/company/sales/invoices/",
            {
                "q": invoice.invoice_number,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], invoice.id)

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
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["status"], SalesInvoiceStatus.DRAFT)
        self.assertEqual(payload["invoice"]["total_amount"], "218.50")
        self.assertEqual(SalesInvoice.objects.filter(company=self.company).count(), 1)
        self.assertEqual(SalesInvoiceItem.objects.filter(company=self.company).count(), 1)

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

        self.assertEqual(response.status_code, 201, response.content)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["invoice"]["status"], SalesInvoiceStatus.ISSUED)

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
                "public_notes": "Updated note",
                "items": [
                    {
                        "catalog_item_id": self.service.id,
                        "quantity": "1",
                        "unit_price": "300.00",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()

        invoice.refresh_from_db()

        self.assertTrue(payload["success"])
        self.assertEqual(invoice.public_notes, "Updated note")
        self.assertEqual(invoice.items.count(), 1)
        self.assertEqual(invoice.total_amount, Decimal("345.00"))

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
                "public_notes": "Should not update",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_sales_invoice_issue_endpoint_issues_invoice(self):
        invoice = self._create_invoice_for_api()

        response = self.client.post(f"/api/company/sales/invoices/{invoice.id}/issue/")

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()

        invoice.refresh_from_db()

        self.assertTrue(payload["success"])
        self.assertEqual(invoice.status, SalesInvoiceStatus.ISSUED)

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
                "reason": "Customer changed mind",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()

        invoice.refresh_from_db()

        self.assertTrue(payload["success"])
        self.assertEqual(invoice.status, SalesInvoiceStatus.CANCELLED)
        self.assertEqual(invoice.cancelled_reason, "Customer changed mind")

    def test_sales_invoice_cancel_rejects_draft_invoice(self):
        invoice = self._create_invoice_for_api()

        response = self.client.post(
            f"/api/company/sales/invoices/{invoice.id}/cancel/",
            data={
                "reason": "Invalid",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])

    def test_viewer_can_list_but_cannot_create_invoice(self):
        self.client.force_login(self.viewer_user)

        response = self.client.get("/api/company/sales/invoices/")
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
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

        self.assertEqual(response.status_code, 403)

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
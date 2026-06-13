# ============================================================
# 📂 sales/tests.py
# 🧠 PrimeyAcc | Sales Tests V1.6
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

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from accounting.models import (
    AccountingAccountPurpose,
    JournalEntry,
    JournalEntryStatus,
    PostingSource,
)
from accounting.services import (
    post_sales_credit_note_to_accounting,
    post_sales_invoice_to_accounting,
)
from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from catalog.models import CatalogItem, CatalogItemStatus, CatalogItemType, CatalogUnit
from companies.models import Branch, Company, CompanySettings
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from sales.models import (
    CustomerCreditAllocation,
    CustomerCreditAllocationStatus,
    CustomerCreditBalance,
    SalesCreditNote,
    SalesCreditNoteItem,
    SalesCreditNoteStatus,
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoicePaymentStatus,
    SalesInvoiceSource,
    SalesInvoiceStatus,
    SalesOrder,
    SalesOrderBillingStatus,
    SalesOrderItem,
    SalesOrderSource,
    SalesOrderStatus,
    SalesQuotation,
    SalesQuotationItem,
    SalesQuotationStatus,
    SalesReturn,
    SalesReturnItem,
    SalesReturnReason,
    SalesReturnStatus,
)
from sales.services import (
    accept_sales_quotation,
    allocate_customer_credit,
    cancel_sales_credit_note,
    cancel_sales_invoice,
    cancel_sales_order,
    complete_sales_order,
    confirm_sales_order,
    create_sales_credit_note_from_return,
    create_sales_invoice,
    create_sales_invoice_from_order,
    create_sales_invoice_item,
    create_sales_quotation,
    create_sales_order,
    create_sales_order_from_quotation,
    create_sales_order_item,
    create_sales_return,
    confirm_sales_return,
    cancel_sales_return,
    generate_invoice_number,
    generate_order_number,
    generate_sales_credit_note_number,
    generate_sales_return_number,
    issue_sales_credit_note,
    issue_sales_invoice,
    post_sales_credit_note,
    refresh_customer_credit_balance,
    reverse_customer_credit_allocation,
    resolve_catalog_item,
    resolve_company_branch,
    resolve_customer,
    send_sales_quotation,
    serialize_customer_credit_allocation,
    serialize_customer_credit_balance,
    serialize_invoice_return_summary,
    serialize_order_invoice_summary,
    serialize_sales_credit_note,
    serialize_sales_invoice,
    serialize_sales_return,
    serialize_sales_order,
    start_processing_sales_order,
)


User = get_user_model()


SALES_OWNER_PERMISSIONS = [
    "company.sales.invoices.view",
    "company.sales.invoices.create",
    "company.sales.invoices.update",
    "company.sales.invoices.issue",
    "company.sales.invoices.cancel",
    "company.sales.quotations.view",
    "company.sales.quotations.create",
    "company.sales.quotations.update",
    "company.sales.quotations.send",
    "company.sales.quotations.accept",
    "company.sales.quotations.reject",
    "company.sales.quotations.expire",
    "company.sales.quotations.cancel",
    "company.sales.orders.view",
    "company.sales.orders.create",
    "company.sales.orders.update",
    "company.sales.orders.confirm",
    "company.sales.orders.process",
    "company.sales.orders.complete",
    "company.sales.orders.cancel",
    "company.sales.orders.create_from_quotation",
    "company.sales.credit_notes.view",
    "company.sales.credit_notes.create",
    "company.sales.credit_notes.issue",
    "company.sales.credit_notes.post",
    "company.sales.credit_notes.cancel",
    "company.sales.customer_credits.view",
    "company.sales.customer_credits.allocations.view",
    "company.sales.customer_credits.allocate",
    "company.sales.customer_credits.reverse",
]

SALES_VIEWER_PERMISSIONS = [
    "company.sales.invoices.view",
    "company.sales.quotations.view",
    "company.sales.orders.view",
    "company.sales.credit_notes.view",
    "company.sales.customer_credits.view",
    "company.sales.customer_credits.allocations.view",
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



class SalesQuotationModelTests(SalesTestCase):
    """
    Tests for the Phase 21.1 sales quotation model foundation.
    """

    _DEFAULT = object()

    def _create_draft_quotation(
        self,
        *,
        company=None,
        branch=_DEFAULT,
        customer=_DEFAULT,
        quotation_number="QUO-MODEL-001",
        valid_until=None,
    ) -> SalesQuotation:
        quotation = SalesQuotation(
            company=company or self.company,
            branch=(
                self.branch
                if branch is self._DEFAULT
                else branch
            ),
            customer=(
                self.customer
                if customer is self._DEFAULT
                else customer
            ),
            quotation_number=quotation_number,
            quotation_date=timezone.localdate(),
            valid_until=valid_until,
            currency_code="SAR",
            created_by=self.user,
            updated_by=self.user,
        )
        quotation.full_clean()
        quotation.save()
        return quotation

    def _create_quotation_item(
        self,
        quotation: SalesQuotation,
        *,
        catalog_item=None,
        line_number=1,
        quantity=Decimal("2.0000"),
        unit_price=Decimal("100.00"),
        discount_amount=Decimal("10.00"),
        taxable=True,
        tax_rate=Decimal("15.00"),
    ) -> SalesQuotationItem:
        selected_item = catalog_item or self.item

        item = SalesQuotationItem(
            company=quotation.company,
            quotation=quotation,
            catalog_item=selected_item,
            line_number=line_number,
            item_code_snapshot=selected_item.code,
            item_name_snapshot=selected_item.name,
            unit_name_snapshot="Piece",
            quantity=quantity,
            unit_price=unit_price,
            discount_amount=discount_amount,
            taxable=taxable,
            tax_rate=tax_rate,
        )
        item.full_clean()
        item.save()
        return item

    def test_quotation_model_defaults_to_draft(self):
        quotation = self._create_draft_quotation()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.DRAFT,
        )
        self.assertTrue(quotation.is_draft)
        self.assertTrue(quotation.can_be_edited)
        self.assertTrue(quotation.can_be_sent)
        self.assertFalse(quotation.can_be_accepted)

    def test_quotation_model_validates_branch_company(self):
        quotation = SalesQuotation(
            company=self.company,
            branch=self.other_branch,
            customer=self.customer,
            quotation_number="QUO-INVALID-BRANCH",
            quotation_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            quotation.full_clean()

    def test_quotation_model_validates_customer_company(self):
        quotation = SalesQuotation(
            company=self.company,
            branch=self.branch,
            customer=self.other_customer,
            quotation_number="QUO-INVALID-CUSTOMER",
            quotation_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            quotation.full_clean()

    def test_quotation_model_rejects_supplier_as_customer(self):
        quotation = SalesQuotation(
            company=self.company,
            branch=self.branch,
            customer=self.supplier,
            quotation_number="QUO-INVALID-SUPPLIER",
            quotation_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            quotation.full_clean()

    def test_quotation_model_rejects_invalid_valid_until(self):
        quotation = SalesQuotation(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            quotation_number="QUO-INVALID-DATE",
            quotation_date=timezone.localdate(),
            valid_until=(
                timezone.localdate() - timedelta(days=1)
            ),
        )

        with self.assertRaises(ValidationError):
            quotation.full_clean()

    def test_quotation_number_is_unique_inside_company(self):
        self._create_draft_quotation(
            quotation_number="QUO-UNIQUE-001",
        )

        duplicate = SalesQuotation(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            quotation_number="QUO-UNIQUE-001",
            quotation_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_same_quotation_number_is_allowed_for_other_company(self):
        self._create_draft_quotation(
            quotation_number="QUO-SHARED-001",
        )

        other_quotation = SalesQuotation(
            company=self.other_company,
            branch=self.other_branch,
            customer=self.other_customer,
            quotation_number="QUO-SHARED-001",
            quotation_date=timezone.localdate(),
            currency_code="SAR",
            created_by=self.other_user,
            updated_by=self.other_user,
        )
        other_quotation.full_clean()
        other_quotation.save()

        self.assertEqual(
            SalesQuotation.objects.filter(
                quotation_number="QUO-SHARED-001"
            ).count(),
            2,
        )

    def test_quotation_item_calculates_totals_and_updates_header(
        self,
    ):
        quotation = self._create_draft_quotation()
        item = self._create_quotation_item(quotation)

        item.refresh_from_db()
        quotation.refresh_from_db()

        self.assertEqual(
            item.line_subtotal,
            Decimal("200.00"),
        )
        self.assertEqual(
            item.taxable_amount,
            Decimal("190.00"),
        )
        self.assertEqual(
            item.tax_amount,
            Decimal("28.50"),
        )
        self.assertEqual(
            item.line_total,
            Decimal("218.50"),
        )

        self.assertEqual(
            quotation.subtotal,
            Decimal("200.00"),
        )
        self.assertEqual(
            quotation.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            quotation.taxable_amount,
            Decimal("190.00"),
        )
        self.assertEqual(
            quotation.tax_amount,
            Decimal("28.50"),
        )
        self.assertEqual(
            quotation.total_amount,
            Decimal("218.50"),
        )

    def test_quotation_item_rejects_other_company_catalog_item(
        self,
    ):
        quotation = self._create_draft_quotation()

        item = SalesQuotationItem(
            company=self.company,
            quotation=quotation,
            catalog_item=self.other_item,
            line_number=1,
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

    def test_quotation_item_rejects_inactive_catalog_item(
        self,
    ):
        quotation = self._create_draft_quotation()

        item = SalesQuotationItem(
            company=self.company,
            quotation=quotation,
            catalog_item=self.inactive_item,
            line_number=1,
            item_name_snapshot="Inactive Item",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("100.00"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_quotation_item_rejects_not_sellable_catalog_item(
        self,
    ):
        quotation = self._create_draft_quotation()

        item = SalesQuotationItem(
            company=self.company,
            quotation=quotation,
            catalog_item=self.not_sellable_item,
            line_number=1,
            item_name_snapshot="Not Sellable Item",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("100.00"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_quotation_item_line_number_is_unique_per_quotation(
        self,
    ):
        quotation = self._create_draft_quotation()

        self._create_quotation_item(
            quotation,
            line_number=1,
        )

        duplicate = SalesQuotationItem(
            company=self.company,
            quotation=quotation,
            catalog_item=self.service,
            line_number=1,
            item_code_snapshot=self.service.code,
            item_name_snapshot=self.service.name,
            quantity=Decimal("1.0000"),
            unit_price=Decimal("250.00"),
            taxable=True,
            tax_rate=Decimal("15.00"),
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_send_quotation_requires_customer(self):
        quotation = self._create_draft_quotation(
            customer=None,
            quotation_number="QUO-NO-CUSTOMER",
        )
        self._create_quotation_item(quotation)

        with self.assertRaises(ValidationError):
            quotation.send(user=self.user)

    def test_send_quotation_requires_items(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-NO-ITEMS",
        )

        with self.assertRaises(ValidationError):
            quotation.send(user=self.user)

    def test_send_quotation_refreshes_snapshots(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-SEND-001",
        )
        self._create_quotation_item(quotation)

        quotation.send(user=self.user)
        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.SENT,
        )
        self.assertIsNotNone(quotation.sent_at)
        self.assertEqual(quotation.sent_by, self.user)
        self.assertEqual(
            quotation.customer_snapshot["display_name"],
            "Customer One",
        )
        self.assertEqual(
            quotation.tax_snapshot["currency_code"],
            "SAR",
        )

    def test_sent_quotation_items_cannot_be_modified(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-LOCKED-001",
        )
        item = self._create_quotation_item(quotation)

        quotation.send(user=self.user)
        quotation.refresh_from_db()

        item.quantity = Decimal("3.0000")

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_sent_quotation_items_cannot_be_deleted(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-LOCKED-DELETE",
        )
        item = self._create_quotation_item(quotation)

        quotation.send(user=self.user)
        quotation.refresh_from_db()

        with self.assertRaises(ValidationError):
            item.delete()

    def test_accept_sent_quotation(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-ACCEPT-001",
            valid_until=(
                timezone.localdate() + timedelta(days=7)
            ),
        )
        self._create_quotation_item(quotation)
        quotation.send(user=self.user)

        quotation.accept(user=self.user)
        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.ACCEPTED,
        )
        self.assertIsNotNone(quotation.accepted_at)
        self.assertEqual(quotation.accepted_by, self.user)

    def test_accept_rejects_expired_quotation(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-EXPIRED-ACCEPT",
            valid_until=timezone.localdate(),
        )
        self._create_quotation_item(quotation)
        quotation.send(user=self.user)

        SalesQuotation.objects.filter(
            pk=quotation.pk
        ).update(
            valid_until=(
                timezone.localdate() - timedelta(days=1)
            )
        )
        quotation.refresh_from_db()

        with self.assertRaises(ValidationError):
            quotation.accept(user=self.user)

    def test_reject_sent_quotation(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-REJECT-001",
        )
        self._create_quotation_item(quotation)
        quotation.send(user=self.user)

        quotation.reject(
            reason="Customer rejected the offer",
            user=self.user,
        )
        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.REJECTED,
        )
        self.assertEqual(
            quotation.rejection_reason,
            "Customer rejected the offer",
        )
        self.assertEqual(
            quotation.rejected_by,
            self.user,
        )

    def test_expire_sent_quotation_after_validity_date(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-EXPIRE-001",
            valid_until=timezone.localdate(),
        )
        self._create_quotation_item(quotation)
        quotation.send(user=self.user)

        SalesQuotation.objects.filter(
            pk=quotation.pk
        ).update(
            valid_until=(
                timezone.localdate() - timedelta(days=1)
            )
        )
        quotation.refresh_from_db()

        quotation.expire(user=self.user)
        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.EXPIRED,
        )
        self.assertIsNotNone(quotation.expired_at)
        self.assertEqual(
            quotation.expired_by,
            self.user,
        )

    def test_expire_rejects_quotation_before_validity_date(
        self,
    ):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-NOT-EXPIRED",
            valid_until=(
                timezone.localdate() + timedelta(days=1)
            ),
        )
        self._create_quotation_item(quotation)
        quotation.send(user=self.user)

        with self.assertRaises(ValidationError):
            quotation.expire(user=self.user)

    def test_cancel_draft_quotation(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-CANCEL-001",
        )

        quotation.cancel(
            reason="Quotation no longer required",
            user=self.user,
        )
        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.CANCELLED,
        )
        self.assertEqual(
            quotation.cancelled_reason,
            "Quotation no longer required",
        )
        self.assertEqual(
            quotation.cancelled_by,
            self.user,
        )

    def test_cancel_accepted_quotation_is_rejected(self):
        quotation = self._create_draft_quotation(
            quotation_number="QUO-CANNOT-CANCEL",
            valid_until=(
                timezone.localdate() + timedelta(days=7)
            ),
        )
        self._create_quotation_item(quotation)
        quotation.send(user=self.user)
        quotation.accept(user=self.user)

        with self.assertRaises(ValidationError):
            quotation.cancel(
                reason="Invalid cancellation",
                user=self.user,
            )


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


class SalesQuotationsAPITests(SalesTestCase):
    """
    Tests for company sales quotation API endpoints.
    """

    def _create_quotation_for_api(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        valid_until=None,
    ) -> SalesQuotation:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        return create_sales_quotation(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            valid_until=valid_until,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": "1",
                }
            ],
        )

    def test_sales_quotations_list_returns_current_company_only(
        self,
    ):
        current_quotation = self._create_quotation_for_api()

        other_quotation = self._create_quotation_for_api(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
        )

        response = self.client.get(
            "/api/company/sales/quotations/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            current_quotation.id,
        )
        self.assertNotEqual(
            payload["results"][0]["id"],
            other_quotation.id,
        )

    def test_sales_quotations_list_supports_search(self):
        quotation = self._create_quotation_for_api()

        response = self.client.get(
            "/api/company/sales/quotations/",
            {
                "q": quotation.quotation_number,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            quotation.id,
        )

    def test_sales_quotation_create_endpoint_creates_draft(
        self,
    ):
        response = self.client.post(
            "/api/company/sales/quotations/create/",
            data={
                "customer_id": self.customer.id,
                "valid_until": str(
                    timezone.localdate()
                    + timedelta(days=14)
                ),
                "terms_and_conditions": "Valid for 14 days",
                "public_notes": "Quotation note",
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

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["quotation"]["status"],
            SalesQuotationStatus.DRAFT,
        )
        self.assertEqual(
            payload["quotation"]["total_amount"],
            "218.50",
        )
        self.assertEqual(
            payload["quotation"]["terms_and_conditions"],
            "Valid for 14 days",
        )
        self.assertEqual(
            len(payload["quotation"]["items"]),
            1,
        )

        self.assertEqual(
            SalesQuotation.objects.filter(
                company=self.company
            ).count(),
            1,
        )
        self.assertEqual(
            SalesQuotationItem.objects.filter(
                company=self.company
            ).count(),
            1,
        )

    def test_sales_quotation_create_endpoint_can_send_now(
        self,
    ):
        response = self.client.post(
            "/api/company/sales/quotations/create/",
            data={
                "customer_id": self.customer.id,
                "send_now": True,
                "valid_until": str(
                    timezone.localdate()
                    + timedelta(days=7)
                ),
                "items": [
                    {
                        "catalog_item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["quotation"]["status"],
            SalesQuotationStatus.SENT,
        )
        self.assertIsNotNone(
            payload["quotation"]["sent_at"]
        )

    def test_sales_quotation_create_rejects_cross_company_item(
        self,
    ):
        response = self.client.post(
            "/api/company/sales/quotations/create/",
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
        self.assertFalse(response.json()["success"])

    def test_sales_quotation_detail_returns_items(self):
        quotation = self._create_quotation_for_api()

        response = self.client.get(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["quotation"]["id"],
            quotation.id,
        )
        self.assertEqual(
            len(payload["quotation"]["items"]),
            1,
        )

    def test_sales_quotation_detail_blocks_cross_company_access(
        self,
    ):
        other_quotation = self._create_quotation_for_api(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
        )

        response = self.client.get(
            f"/api/company/sales/quotations/"
            f"{other_quotation.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_sales_quotation_update_endpoint_updates_draft(
        self,
    ):
        quotation = self._create_quotation_for_api()

        response = self.client.patch(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/update/",
            data={
                "public_notes": "Updated quotation note",
                "terms_and_conditions": "Updated terms",
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

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()
        quotation.refresh_from_db()

        self.assertTrue(payload["success"])
        self.assertEqual(
            quotation.public_notes,
            "Updated quotation note",
        )
        self.assertEqual(
            quotation.terms_and_conditions,
            "Updated terms",
        )
        self.assertEqual(quotation.items.count(), 1)
        self.assertEqual(
            quotation.total_amount,
            Decimal("345.00"),
        )

    def test_sales_quotation_update_rejects_sent_quotation(
        self,
    ):
        quotation = self._create_quotation_for_api(
            valid_until=(
                timezone.localdate()
                + timedelta(days=7)
            ),
        )

        send_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        response = self.client.patch(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/update/",
            data={
                "public_notes": "Should not update",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_sales_quotation_send_endpoint(self):
        quotation = self._create_quotation_for_api(
            valid_until=(
                timezone.localdate()
                + timedelta(days=7)
            ),
        )

        response = self.client.post(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/send/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.SENT,
        )
        self.assertEqual(
            quotation.sent_by,
            self.user,
        )

    def test_sales_quotation_accept_endpoint(self):
        quotation = self._create_quotation_for_api(
            valid_until=(
                timezone.localdate()
                + timedelta(days=7)
            ),
        )

        send_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        response = self.client.post(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/accept/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.ACCEPTED,
        )
        self.assertEqual(
            quotation.accepted_by,
            self.user,
        )

    def test_sales_quotation_reject_endpoint(self):
        quotation = self._create_quotation_for_api(
            valid_until=(
                timezone.localdate()
                + timedelta(days=7)
            ),
        )

        send_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        response = self.client.post(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/reject/",
            data={
                "reason": "Customer rejected quotation",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.REJECTED,
        )
        self.assertEqual(
            quotation.rejection_reason,
            "Customer rejected quotation",
        )
        self.assertEqual(
            quotation.rejected_by,
            self.user,
        )

    def test_sales_quotation_cancel_endpoint(self):
        quotation = self._create_quotation_for_api()

        response = self.client.post(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/cancel/",
            data={
                "reason": "Quotation cancelled by user",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.CANCELLED,
        )
        self.assertEqual(
            quotation.cancelled_reason,
            "Quotation cancelled by user",
        )
        self.assertEqual(
            quotation.cancelled_by,
            self.user,
        )

    def test_sales_quotation_expire_endpoint(self):
        quotation = self._create_quotation_for_api(
            valid_until=timezone.localdate(),
        )

        send_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        SalesQuotation.objects.filter(
            pk=quotation.pk
        ).update(
            valid_until=(
                timezone.localdate()
                - timedelta(days=1)
            )
        )

        response = self.client.post(
            f"/api/company/sales/quotations/"
            f"{quotation.id}/expire/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        quotation.refresh_from_db()

        self.assertEqual(
            quotation.status,
            SalesQuotationStatus.EXPIRED,
        )
        self.assertEqual(
            quotation.expired_by,
            self.user,
        )

    def test_viewer_can_list_but_cannot_create_quotation(
        self,
    ):
        self.client.force_login(self.viewer_user)

        list_response = self.client.get(
            "/api/company/sales/quotations/"
        )

        self.assertEqual(
            list_response.status_code,
            200,
            list_response.content,
        )

        create_response = self.client.post(
            "/api/company/sales/quotations/create/",
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

        self.assertEqual(
            create_response.status_code,
            403,
            create_response.content,
        )

    def test_unauthenticated_user_cannot_list_quotations(
        self,
    ):
        self.client.logout()

        response = self.client.get(
            "/api/company/sales/quotations/"
        )

        self.assertEqual(response.status_code, 401)

# ============================================================
# Phase 21.2 - Sales Orders Tests
# ============================================================


class SalesOrderModelTests(SalesTestCase):
    """
    Tests for the Phase 21.2 sales order model foundation.
    """

    def _create_order(
        self,
        *,
        company=None,
        branch=None,
        customer=None,
        order_number="SO-MODEL-001",
    ) -> SalesOrder:
        selected_company = company or self.company

        order = SalesOrder(
            company=selected_company,
            branch=(
                branch
                if branch is not None
                else self.branch
            ),
            customer=(
                customer
                if customer is not None
                else self.customer
            ),
            order_number=order_number,
            order_date=timezone.localdate(),
            currency_code="SAR",
            created_by=self.user,
            updated_by=self.user,
        )

        order.full_clean()
        order.save()

        return order

    def _create_order_item(
        self,
        order: SalesOrder,
        *,
        catalog_item=None,
        line_number=1,
        quantity=Decimal("2.0000"),
        unit_price=Decimal("100.00"),
        discount_amount=Decimal("10.00"),
        taxable=True,
        tax_rate=Decimal("15.00"),
    ) -> SalesOrderItem:
        selected_item = catalog_item or self.item

        item = SalesOrderItem(
            company=order.company,
            order=order,
            catalog_item=selected_item,
            line_number=line_number,
            item_code_snapshot=selected_item.code,
            item_name_snapshot=selected_item.name,
            unit_name_snapshot="Piece",
            quantity=quantity,
            unit_price=unit_price,
            discount_amount=discount_amount,
            taxable=taxable,
            tax_rate=tax_rate,
        )

        item.full_clean()
        item.save()

        return item

    def test_sales_order_defaults_to_draft(self):
        order = self._create_order()

        self.assertEqual(
            order.status,
            SalesOrderStatus.DRAFT,
        )
        self.assertTrue(order.can_be_edited)
        self.assertTrue(order.can_be_confirmed)
        self.assertFalse(order.can_start_processing)
        self.assertFalse(order.can_be_completed)

    def test_sales_order_validates_branch_company(self):
        order = SalesOrder(
            company=self.company,
            branch=self.other_branch,
            customer=self.customer,
            order_number="SO-INVALID-BRANCH",
            order_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_sales_order_validates_customer_company(self):
        order = SalesOrder(
            company=self.company,
            branch=self.branch,
            customer=self.other_customer,
            order_number="SO-INVALID-CUSTOMER",
            order_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_sales_order_rejects_supplier_as_customer(self):
        order = SalesOrder(
            company=self.company,
            branch=self.branch,
            customer=self.supplier,
            order_number="SO-INVALID-SUPPLIER",
            order_date=timezone.localdate(),
        )

        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_sales_order_rejects_invalid_delivery_date(self):
        order = SalesOrder(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            order_number="SO-INVALID-DATE",
            order_date=timezone.localdate(),
            expected_delivery_date=(
                timezone.localdate()
                - timedelta(days=1)
            ),
        )

        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_sales_order_item_calculates_totals(self):
        order = self._create_order()
        item = self._create_order_item(order)

        item.refresh_from_db()
        order.refresh_from_db()

        self.assertEqual(
            item.line_subtotal,
            Decimal("200.00"),
        )
        self.assertEqual(
            item.taxable_amount,
            Decimal("190.00"),
        )
        self.assertEqual(
            item.tax_amount,
            Decimal("28.50"),
        )
        self.assertEqual(
            item.line_total,
            Decimal("218.50"),
        )

        self.assertEqual(
            order.subtotal,
            Decimal("200.00"),
        )
        self.assertEqual(
            order.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            order.taxable_amount,
            Decimal("190.00"),
        )
        self.assertEqual(
            order.tax_amount,
            Decimal("28.50"),
        )
        self.assertEqual(
            order.total_amount,
            Decimal("218.50"),
        )

    def test_sales_order_item_rejects_other_company_item(self):
        order = self._create_order()

        item = SalesOrderItem(
            company=self.company,
            order=order,
            catalog_item=self.other_item,
            line_number=1,
            item_code_snapshot=self.other_item.code,
            item_name_snapshot=self.other_item.name,
            quantity=Decimal("1.0000"),
            unit_price=Decimal("200.00"),
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_confirmed_order_items_cannot_be_modified(self):
        order = self._create_order(
            order_number="SO-LOCKED-001",
        )
        item = self._create_order_item(order)

        order.confirm(user=self.user)
        order.refresh_from_db()

        item.quantity = Decimal("3.0000")

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_confirmed_order_items_cannot_be_deleted(self):
        order = self._create_order(
            order_number="SO-LOCKED-DELETE",
        )
        item = self._create_order_item(order)

        order.confirm(user=self.user)
        order.refresh_from_db()

        with self.assertRaises(ValidationError):
            item.delete()

    def test_sales_order_lifecycle(self):
        order = self._create_order(
            order_number="SO-LIFECYCLE-001",
        )
        self._create_order_item(order)

        order.confirm(user=self.user)
        order.refresh_from_db()

        self.assertEqual(
            order.status,
            SalesOrderStatus.CONFIRMED,
        )
        self.assertEqual(
            order.confirmed_by,
            self.user,
        )
        self.assertIsNotNone(order.confirmed_at)

        order.start_processing(user=self.user)
        order.refresh_from_db()

        self.assertEqual(
            order.status,
            SalesOrderStatus.PROCESSING,
        )
        self.assertEqual(
            order.processing_by,
            self.user,
        )
        self.assertIsNotNone(order.processing_at)

        order.complete(user=self.user)
        order.refresh_from_db()

        self.assertEqual(
            order.status,
            SalesOrderStatus.COMPLETED,
        )
        self.assertEqual(
            order.completed_by,
            self.user,
        )
        self.assertIsNotNone(order.completed_at)

    def test_cancel_completed_order_is_rejected(self):
        order = self._create_order(
            order_number="SO-COMPLETE-CANCEL",
        )
        self._create_order_item(order)

        order.confirm(user=self.user)
        order.start_processing(user=self.user)
        order.complete(user=self.user)

        with self.assertRaises(ValidationError):
            order.cancel(
                reason="Invalid cancellation",
                user=self.user,
            )


class SalesOrderServicesTests(SalesTestCase):
    """
    Tests for Phase 21.2 sales order services.
    """

    def _create_accepted_quotation(
        self,
    ) -> SalesQuotation:
        quotation = create_sales_quotation(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            valid_until=(
                timezone.localdate()
                + timedelta(days=7)
            ),
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
                },
            ],
            public_notes="Quotation public note",
            internal_notes="Quotation internal note",
        )

        send_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        accept_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        quotation.refresh_from_db()

        return quotation

    def test_generate_order_number_uses_year(self):
        order_number = generate_order_number(
            self.company,
            order_date=timezone.localdate(),
        )

        self.assertTrue(
            order_number.startswith(
                f"SO-{timezone.localdate().year}-"
            )
        )
        self.assertTrue(
            order_number.endswith("000001")
        )

    def test_create_manual_sales_order_with_items(self):
        order = create_sales_order(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            expected_delivery_date=(
                timezone.localdate()
                + timedelta(days=3)
            ),
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
                },
            ],
            public_notes="Order note",
        )

        order.refresh_from_db()

        self.assertEqual(
            order.company,
            self.company,
        )
        self.assertEqual(
            order.branch,
            self.branch,
        )
        self.assertEqual(
            order.customer,
            self.customer,
        )
        self.assertEqual(
            order.status,
            SalesOrderStatus.DRAFT,
        )
        self.assertEqual(
            order.source,
            SalesOrderSource.MANUAL,
        )
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(
            order.subtotal,
            Decimal("450.00"),
        )
        self.assertEqual(
            order.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            order.tax_amount,
            Decimal("66.00"),
        )
        self.assertEqual(
            order.total_amount,
            Decimal("506.00"),
        )
        self.assertEqual(
            order.public_notes,
            "Order note",
        )

    def test_create_sales_order_rejects_invalid_date(self):
        with self.assertRaises(ValidationError):
            create_sales_order(
                company=self.company,
                user=self.user,
                customer_id=self.customer.id,
                order_date=timezone.localdate(),
                expected_delivery_date=(
                    timezone.localdate()
                    - timedelta(days=1)
                ),
                items=[
                    {
                        "catalog_item_id":
                            self.item.id,
                        "quantity": "1",
                    }
                ],
            )

    def test_create_sales_order_from_accepted_quotation(self):
        quotation = self._create_accepted_quotation()

        order = create_sales_order_from_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
            expected_delivery_date=(
                timezone.localdate()
                + timedelta(days=5)
            ),
        )

        order.refresh_from_db()

        self.assertEqual(
            order.source,
            SalesOrderSource.QUOTATION,
        )
        self.assertEqual(
            order.source_quotation,
            quotation,
        )
        self.assertEqual(
            order.customer,
            quotation.customer,
        )
        self.assertEqual(
            order.branch,
            quotation.branch,
        )
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(
            order.total_amount,
            quotation.total_amount,
        )
        self.assertEqual(
            order.public_notes,
            quotation.public_notes,
        )
        self.assertEqual(
            order.internal_notes,
            quotation.internal_notes,
        )
        self.assertEqual(
            order.quotation_snapshot[
                "quotation_number"
            ],
            quotation.quotation_number,
        )

        first_item = order.items.order_by(
            "line_number"
        ).first()

        self.assertIsNotNone(
            first_item.source_quotation_item_id
        )

    def test_create_order_from_nonaccepted_quotation_rejected(
        self,
    ):
        quotation = create_sales_quotation(
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
            create_sales_order_from_quotation(
                company=self.company,
                quotation=quotation,
                user=self.user,
            )

    def test_quotation_cannot_create_two_orders(self):
        quotation = self._create_accepted_quotation()

        create_sales_order_from_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            create_sales_order_from_quotation(
                company=self.company,
                quotation=quotation,
                user=self.user,
            )

    def test_order_services_lifecycle(self):
        order = create_sales_order(
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

        order = confirm_sales_order(
            company=self.company,
            order=order,
            user=self.user,
        )

        self.assertEqual(
            order.status,
            SalesOrderStatus.CONFIRMED,
        )

        order = start_processing_sales_order(
            company=self.company,
            order=order,
            user=self.user,
        )

        self.assertEqual(
            order.status,
            SalesOrderStatus.PROCESSING,
        )

        order = complete_sales_order(
            company=self.company,
            order=order,
            user=self.user,
        )

        self.assertEqual(
            order.status,
            SalesOrderStatus.COMPLETED,
        )

    def test_cancel_sales_order_service(self):
        order = create_sales_order(
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

        order = cancel_sales_order(
            company=self.company,
            order=order,
            reason="Customer cancelled order",
            user=self.user,
        )

        self.assertEqual(
            order.status,
            SalesOrderStatus.CANCELLED,
        )
        self.assertEqual(
            order.cancelled_reason,
            "Customer cancelled order",
        )
        self.assertEqual(
            order.cancelled_by,
            self.user,
        )

    def test_serialize_sales_order_with_items(self):
        order = create_sales_order(
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

        data = serialize_sales_order(
            order,
            include_items=True,
        )

        self.assertEqual(data["id"], order.id)
        self.assertEqual(
            data["company_id"],
            self.company.id,
        )
        self.assertEqual(
            data["customer"]["display_name"],
            "Customer One",
        )
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(
            data["items"][0]["item_name"],
            "Sales Item",
        )
        self.assertEqual(
            data["total_amount"],
            "115.00",
        )


class SalesOrdersAPITests(SalesTestCase):
    """
    Tests for company sales order API endpoints.
    """

    def _create_order_for_api(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
    ) -> SalesOrder:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        return create_sales_order(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id":
                        selected_item.id,
                    "quantity": "1",
                }
            ],
        )

    def _create_accepted_quotation_for_api(
        self,
    ) -> SalesQuotation:
        quotation = create_sales_quotation(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            valid_until=(
                timezone.localdate()
                + timedelta(days=7)
            ),
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "1",
                }
            ],
        )

        send_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        accept_sales_quotation(
            company=self.company,
            quotation=quotation,
            user=self.user,
        )

        return quotation

    def test_orders_list_returns_current_company_only(self):
        current_order = self._create_order_for_api()

        other_order = self._create_order_for_api(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
        )

        response = self.client.get(
            "/api/company/sales/orders/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            current_order.id,
        )
        self.assertNotEqual(
            payload["results"][0]["id"],
            other_order.id,
        )

    def test_orders_list_supports_search(self):
        order = self._create_order_for_api()

        response = self.client.get(
            "/api/company/sales/orders/",
            {
                "q": order.order_number,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            order.id,
        )

    def test_order_create_endpoint_creates_draft(self):
        response = self.client.post(
            "/api/company/sales/orders/create/",
            data={
                "customer_id": self.customer.id,
                "expected_delivery_date": str(
                    timezone.localdate()
                    + timedelta(days=5)
                ),
                "public_notes": "API order",
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

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["order"]["status"],
            SalesOrderStatus.DRAFT,
        )
        self.assertEqual(
            payload["order"]["total_amount"],
            "218.50",
        )
        self.assertEqual(
            len(payload["order"]["items"]),
            1,
        )

    def test_order_create_endpoint_can_confirm_now(self):
        response = self.client.post(
            "/api/company/sales/orders/create/",
            data={
                "customer_id": self.customer.id,
                "confirm_now": True,
                "items": [
                    {
                        "catalog_item_id": self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        self.assertEqual(
            response.json()["order"]["status"],
            SalesOrderStatus.CONFIRMED,
        )

    def test_order_create_rejects_cross_company_item(self):
        response = self.client.post(
            "/api/company/sales/orders/create/",
            data={
                "customer_id": self.customer.id,
                "items": [
                    {
                        "catalog_item_id":
                            self.other_item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            response.json()["success"]
        )

    def test_order_detail_returns_items(self):
        order = self._create_order_for_api()

        response = self.client.get(
            f"/api/company/sales/orders/{order.id}/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertEqual(
            payload["order"]["id"],
            order.id,
        )
        self.assertEqual(
            len(payload["order"]["items"]),
            1,
        )

    def test_order_detail_blocks_cross_company_access(self):
        other_order = self._create_order_for_api(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
        )

        response = self.client.get(
            f"/api/company/sales/orders/"
            f"{other_order.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_order_update_endpoint_updates_draft(self):
        order = self._create_order_for_api()

        response = self.client.patch(
            f"/api/company/sales/orders/"
            f"{order.id}/update/",
            data={
                "public_notes": "Updated order",
                "items": [
                    {
                        "catalog_item_id":
                            self.service.id,
                        "quantity": "1",
                        "unit_price": "300.00",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.public_notes,
            "Updated order",
        )
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(
            order.total_amount,
            Decimal("345.00"),
        )

    def test_order_update_rejects_confirmed_order(self):
        order = self._create_order_for_api()

        confirm_sales_order(
            company=self.company,
            order=order,
            user=self.user,
        )

        response = self.client.patch(
            f"/api/company/sales/orders/"
            f"{order.id}/update/",
            data={
                "public_notes": "Invalid update",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_create_order_from_quotation_endpoint(self):
        quotation = (
            self._create_accepted_quotation_for_api()
        )

        response = self.client.post(
            "/api/company/sales/orders/"
            f"from-quotation/{quotation.id}/",
            data={
                "confirm_now": True,
                "expected_delivery_date": str(
                    timezone.localdate()
                    + timedelta(days=4)
                ),
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertEqual(
            payload["order"]["status"],
            SalesOrderStatus.CONFIRMED,
        )
        self.assertEqual(
            payload["order"]["source"],
            SalesOrderSource.QUOTATION,
        )
        self.assertEqual(
            payload["order"]["source_quotation"][
                "id"
            ],
            quotation.id,
        )

    def test_create_order_from_quotation_rejects_duplicate(
        self,
    ):
        quotation = (
            self._create_accepted_quotation_for_api()
        )

        first_response = self.client.post(
            "/api/company/sales/orders/"
            f"from-quotation/{quotation.id}/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            first_response.status_code,
            201,
            first_response.content,
        )

        second_response = self.client.post(
            "/api/company/sales/orders/"
            f"from-quotation/{quotation.id}/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            second_response.status_code,
            400,
        )

    def test_order_lifecycle_endpoints(self):
        order = self._create_order_for_api()

        confirm_response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/confirm/"
        )

        self.assertEqual(
            confirm_response.status_code,
            200,
            confirm_response.content,
        )

        process_response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/process/"
        )

        self.assertEqual(
            process_response.status_code,
            200,
            process_response.content,
        )

        complete_response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/complete/"
        )

        self.assertEqual(
            complete_response.status_code,
            200,
            complete_response.content,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            SalesOrderStatus.COMPLETED,
        )

    def test_order_cancel_endpoint(self):
        order = self._create_order_for_api()

        response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/cancel/",
            data={
                "reason": "Customer cancelled",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            SalesOrderStatus.CANCELLED,
        )
        self.assertEqual(
            order.cancelled_reason,
            "Customer cancelled",
        )

    def test_viewer_can_list_but_cannot_create_order(self):
        self.client.force_login(self.viewer_user)

        list_response = self.client.get(
            "/api/company/sales/orders/"
        )

        self.assertEqual(
            list_response.status_code,
            200,
            list_response.content,
        )

        create_response = self.client.post(
            "/api/company/sales/orders/create/",
            data={
                "customer_id": self.customer.id,
                "items": [
                    {
                        "catalog_item_id":
                            self.item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            create_response.status_code,
            403,
            create_response.content,
        )

    def test_unauthenticated_user_cannot_list_orders(self):
        self.client.logout()

        response = self.client.get(
            "/api/company/sales/orders/"
        )

        self.assertEqual(response.status_code, 401)


# End Phase 21.2 - Sales Orders Tests
# ============================================================

# ============================================================
# Phase 21.3 - Sales Order Fulfillment & Invoice Conversion Tests
# ============================================================


class SalesOrderInvoiceConversionServicesTests(
    SalesTestCase
):
    """
    Service and model integration tests for order invoicing.
    """

    def _create_confirmed_order(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        quantity="4",
        discount_amount="40.00",
    ) -> SalesOrder:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        order = create_sales_order(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": quantity,
                    "discount_amount": discount_amount,
                }
            ],
        )

        return confirm_sales_order(
            company=selected_company,
            order=order,
            user=selected_user,
        )

    def test_create_full_invoice_from_confirmed_order(
        self,
    ):
        order = self._create_confirmed_order()

        invoice = create_sales_invoice_from_order(
            company=self.company,
            order=order,
            user=self.user,
        )

        order.refresh_from_db()
        order_item = order.items.get()
        invoice_item = invoice.items.get()

        order_item.refresh_from_db()

        self.assertEqual(
            invoice.source,
            SalesInvoiceSource.SALES_ORDER,
        )
        self.assertEqual(
            invoice.source_order,
            order,
        )
        self.assertEqual(
            invoice_item.source_order_item,
            order_item,
        )
        self.assertEqual(
            invoice_item.quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            invoice.total_amount,
            Decimal("414.00"),
        )
        self.assertEqual(
            order.billing_status,
            SalesOrderBillingStatus.FULL,
        )
        self.assertEqual(
            order.invoiced_amount,
            Decimal("414.00"),
        )
        self.assertEqual(
            order_item.invoiced_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            order_item.remaining_quantity,
            Decimal("0.0000"),
        )

    def test_create_partial_invoice_from_order(
        self,
    ):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        invoice = create_sales_invoice_from_order(
            company=self.company,
            order=order,
            user=self.user,
            items=[
                {
                    "order_item_id": order_item.id,
                    "quantity": "1",
                }
            ],
        )

        order.refresh_from_db()
        order_item.refresh_from_db()
        invoice_item = invoice.items.get()

        self.assertEqual(
            invoice_item.quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            invoice_item.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            invoice.total_amount,
            Decimal("103.50"),
        )
        self.assertEqual(
            order.billing_status,
            SalesOrderBillingStatus.PARTIAL,
        )
        self.assertEqual(
            order.invoiced_amount,
            Decimal("103.50"),
        )
        self.assertEqual(
            order_item.invoiced_quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            order_item.remaining_quantity,
            Decimal("3.0000"),
        )

    def test_second_invoice_completes_remaining_order(
        self,
    ):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        create_sales_invoice_from_order(
            company=self.company,
            order=order,
            user=self.user,
            items=[
                {
                    "order_item_id": order_item.id,
                    "quantity": "1",
                }
            ],
        )

        second_invoice = (
            create_sales_invoice_from_order(
                company=self.company,
                order=order,
                user=self.user,
            )
        )

        order.refresh_from_db()
        order_item.refresh_from_db()

        self.assertEqual(
            second_invoice.items.get().quantity,
            Decimal("3.0000"),
        )
        self.assertEqual(
            second_invoice.total_amount,
            Decimal("310.50"),
        )
        self.assertEqual(
            order.billing_status,
            SalesOrderBillingStatus.FULL,
        )
        self.assertEqual(
            order.invoiced_amount,
            Decimal("414.00"),
        )
        self.assertEqual(
            order_item.remaining_quantity,
            Decimal("0.0000"),
        )

    def test_order_invoice_rejects_quantity_over_remaining(
        self,
    ):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        with self.assertRaises(ValidationError):
            create_sales_invoice_from_order(
                company=self.company,
                order=order,
                user=self.user,
                items=[
                    {
                        "order_item_id": order_item.id,
                        "quantity": "5",
                    }
                ],
            )

        self.assertFalse(
            SalesInvoice.objects.filter(
                source_order=order,
            ).exists()
        )

    def test_draft_order_cannot_be_invoiced(self):
        order = create_sales_order(
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
            create_sales_invoice_from_order(
                company=self.company,
                order=order,
                user=self.user,
            )

    def test_cross_company_order_cannot_be_invoiced(
        self,
    ):
        other_order = self._create_confirmed_order(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
            discount_amount="0.00",
        )

        with self.assertRaises(ValidationError):
            create_sales_invoice_from_order(
                company=self.company,
                order=other_order,
                user=self.user,
            )

    def test_invoiced_order_cannot_be_cancelled(self):
        order = self._create_confirmed_order()

        create_sales_invoice_from_order(
            company=self.company,
            order=order,
            user=self.user,
            items=[
                {
                    "order_item_id": order.items.get().id,
                    "quantity": "1",
                }
            ],
        )

        with self.assertRaises(ValidationError):
            cancel_sales_order(
                company=self.company,
                order=order,
                reason="Cannot cancel invoiced order",
                user=self.user,
            )

    def test_cancelled_invoice_releases_order_quantity(
        self,
    ):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        invoice = create_sales_invoice_from_order(
            company=self.company,
            order=order,
            user=self.user,
            items=[
                {
                    "order_item_id": order_item.id,
                    "quantity": "2",
                }
            ],
            issue_now=True,
        )

        order.refresh_from_db()

        self.assertEqual(
            order.billing_status,
            SalesOrderBillingStatus.PARTIAL,
        )

        cancel_sales_invoice(
            company=self.company,
            invoice=invoice,
            reason="Invoice cancelled",
            user=self.user,
        )

        order.refresh_from_db()
        order_item.refresh_from_db()

        self.assertEqual(
            order.billing_status,
            SalesOrderBillingStatus.NOT_INVOICED,
        )
        self.assertEqual(
            order.invoiced_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            order_item.invoiced_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            order_item.remaining_quantity,
            Decimal("4.0000"),
        )

    def test_order_invoice_summary_excludes_cancelled_invoice(
        self,
    ):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        cancelled_invoice = (
            create_sales_invoice_from_order(
                company=self.company,
                order=order,
                user=self.user,
                items=[
                    {
                        "order_item_id": order_item.id,
                        "quantity": "1",
                    }
                ],
                issue_now=True,
            )
        )

        cancel_sales_invoice(
            company=self.company,
            invoice=cancelled_invoice,
            reason="Cancelled",
            user=self.user,
        )

        active_invoice = (
            create_sales_invoice_from_order(
                company=self.company,
                order=order,
                user=self.user,
                items=[
                    {
                        "order_item_id": order_item.id,
                        "quantity": "2",
                    }
                ],
            )
        )

        summary = serialize_order_invoice_summary(
            order
        )

        self.assertEqual(
            summary["billing_status"],
            SalesOrderBillingStatus.PARTIAL,
        )
        self.assertEqual(
            summary["invoiced_amount"],
            str(active_invoice.total_amount),
        )
        self.assertEqual(
            summary["invoices_count"],
            2,
        )


class SalesOrderInvoiceConversionAPITests(
    SalesTestCase
):
    """
    API, permission, and tenant-isolation tests.
    """

    def _create_confirmed_order(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        quantity="4",
    ) -> SalesOrder:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        order = create_sales_order(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": quantity,
                }
            ],
        )

        return confirm_sales_order(
            company=selected_company,
            order=order,
            user=selected_user,
        )

    def test_create_partial_invoice_from_order_endpoint(
        self,
    ):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/create-invoice/",
            data={
                "items": [
                    {
                        "order_item_id": order_item.id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()
        order.refresh_from_db()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["invoice"]["source"],
            SalesInvoiceSource.SALES_ORDER,
        )
        self.assertEqual(
            payload["invoice"]["source_order"]["id"],
            order.id,
        )
        self.assertEqual(
            payload["invoice"]["items"][0][
                "source_order_item_id"
            ],
            order_item.id,
        )
        self.assertEqual(
            payload["order"]["billing_status"],
            SalesOrderBillingStatus.PARTIAL,
        )

    def test_create_full_invoice_and_issue_endpoint(
        self,
    ):
        order = self._create_confirmed_order(
            quantity="1"
        )

        response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/create-invoice/",
            data={
                "issue_now": True,
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertEqual(
            payload["invoice"]["status"],
            SalesInvoiceStatus.ISSUED,
        )
        self.assertEqual(
            payload["order"]["billing_status"],
            SalesOrderBillingStatus.FULL,
        )

    def test_order_invoices_summary_endpoint(self):
        order = self._create_confirmed_order()
        order_item = order.items.get()

        create_sales_invoice_from_order(
            company=self.company,
            order=order,
            user=self.user,
            items=[
                {
                    "order_item_id": order_item.id,
                    "quantity": "2",
                }
            ],
        )

        response = self.client.get(
            f"/api/company/sales/orders/"
            f"{order.id}/invoices/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["company"]["id"],
            self.company.id,
        )
        self.assertEqual(
            payload["summary"]["order_id"],
            order.id,
        )
        self.assertEqual(
            payload["summary"]["billing_status"],
            SalesOrderBillingStatus.PARTIAL,
        )
        self.assertEqual(
            payload["summary"]["invoices_count"],
            1,
        )

    def test_order_invoice_endpoints_block_cross_company(
        self,
    ):
        other_order = self._create_confirmed_order(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
        )

        create_response = self.client.post(
            f"/api/company/sales/orders/"
            f"{other_order.id}/create-invoice/",
            data={},
            content_type="application/json",
        )

        summary_response = self.client.get(
            f"/api/company/sales/orders/"
            f"{other_order.id}/invoices/"
        )

        self.assertEqual(
            create_response.status_code,
            404,
        )
        self.assertEqual(
            summary_response.status_code,
            404,
        )

    def test_viewer_can_view_but_cannot_create_order_invoice(
        self,
    ):
        order = self._create_confirmed_order()

        self.client.force_login(
            self.viewer_user
        )

        summary_response = self.client.get(
            f"/api/company/sales/orders/"
            f"{order.id}/invoices/"
        )

        create_response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/create-invoice/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            summary_response.status_code,
            200,
            summary_response.content,
        )
        self.assertEqual(
            create_response.status_code,
            403,
            create_response.content,
        )

    def test_orders_list_filters_by_billing_status(
        self,
    ):
        partial_order = self._create_confirmed_order()
        untouched_order = self._create_confirmed_order(
            quantity="2"
        )

        partial_item = partial_order.items.get()

        create_sales_invoice_from_order(
            company=self.company,
            order=partial_order,
            user=self.user,
            items=[
                {
                    "order_item_id": partial_item.id,
                    "quantity": "1",
                }
            ],
        )

        response = self.client.get(
            "/api/company/sales/orders/",
            {
                "billing_status":
                    SalesOrderBillingStatus.PARTIAL,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()
        result_ids = {
            result["id"]
            for result in payload["results"]
        }

        self.assertIn(
            partial_order.id,
            result_ids,
        )
        self.assertNotIn(
            untouched_order.id,
            result_ids,
        )

    def test_draft_order_invoice_endpoint_rejected(
        self,
    ):
        order = create_sales_order(
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

        response = self.client.post(
            f"/api/company/sales/orders/"
            f"{order.id}/create-invoice/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )
        self.assertFalse(
            response.json()["success"]
        )


# End Phase 21.3 - Sales Order Fulfillment & Invoice Conversion Tests
# ============================================================

# ============================================================
# Phase 21.4.1 - Sales Returns Models Foundation Tests
# ============================================================


class SalesReturnModelTests(SalesTestCase):
    """
    Model tests for sales return headers, lines, quantities,
    lifecycle, totals, and tenant isolation.
    """

    def _create_issued_invoice(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        quantity="4",
        discount_amount="40.00",
    ) -> SalesInvoice:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": quantity,
                    "discount_amount": discount_amount,
                }
            ],
        )

        return issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

    def _create_draft_return(
        self,
        invoice: SalesInvoice,
        *,
        return_number="SR-MODEL-001",
        company=None,
        branch=None,
        customer=None,
    ) -> SalesReturn:
        selected_company = company or invoice.company

        sales_return = SalesReturn(
            company=selected_company,
            branch=(
                branch
                if branch is not None
                else invoice.branch
            ),
            customer=(
                customer
                if customer is not None
                else invoice.customer
            ),
            invoice=invoice,
            return_number=return_number,
            reason=SalesReturnReason.CUSTOMER_REQUEST,
            return_date=timezone.localdate(),
            currency_code=invoice.currency_code,
            created_by=self.user,
            updated_by=self.user,
        )

        sales_return.full_clean()
        sales_return.save()

        return sales_return

    def _create_return_item(
        self,
        sales_return: SalesReturn,
        *,
        invoice_item=None,
        quantity="1",
        line_number=1,
        restock=True,
    ) -> SalesReturnItem:
        selected_invoice_item = (
            invoice_item
            or sales_return.invoice.items.get()
        )

        return_item = SalesReturnItem(
            sales_return=sales_return,
            company=sales_return.company,
            invoice_item=selected_invoice_item,
            catalog_item=selected_invoice_item.catalog_item,
            line_number=line_number,
            quantity=Decimal(str(quantity)),
            restock=restock,
        )

        return_item.full_clean()
        return_item.save()

        return return_item

    def test_sales_return_defaults_to_draft(self):
        invoice = self._create_issued_invoice()
        sales_return = self._create_draft_return(
            invoice
        )

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.DRAFT,
        )
        self.assertTrue(
            sales_return.is_draft
        )
        self.assertTrue(
            sales_return.can_be_edited
        )
        self.assertTrue(
            sales_return.can_be_confirmed
        )
        self.assertFalse(
            sales_return.can_be_posted
        )

    def test_sales_return_requires_issued_invoice(self):
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

        sales_return = SalesReturn(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=invoice,
            return_number="SR-DRAFT-INVOICE",
            return_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            sales_return.full_clean()

    def test_sales_return_rejects_cross_company_invoice(self):
        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
            discount_amount="0.00",
        )

        sales_return = SalesReturn(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=other_invoice,
            return_number="SR-CROSS-COMPANY",
            return_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            sales_return.full_clean()

    def test_sales_return_rejects_return_date_before_invoice(
        self,
    ):
        invoice = self._create_issued_invoice()

        sales_return = SalesReturn(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=invoice,
            return_number="SR-INVALID-DATE",
            return_date=(
                invoice.invoice_date
                - timedelta(days=1)
            ),
            currency_code=invoice.currency_code,
        )

        with self.assertRaises(
            ValidationError
        ):
            sales_return.full_clean()

    def test_return_item_uses_invoice_snapshots_and_totals(
        self,
    ):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-AMOUNTS",
        )

        return_item = self._create_return_item(
            sales_return,
            invoice_item=invoice_item,
            quantity="1",
        )

        return_item.refresh_from_db()
        sales_return.refresh_from_db()

        self.assertEqual(
            return_item.item_code_snapshot,
            invoice_item.item_code_snapshot,
        )
        self.assertEqual(
            return_item.item_name_snapshot,
            invoice_item.item_name_snapshot,
        )
        self.assertEqual(
            return_item.quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            return_item.unit_price,
            Decimal("100.00"),
        )
        self.assertEqual(
            return_item.line_subtotal,
            Decimal("100.00"),
        )
        self.assertEqual(
            return_item.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            return_item.taxable_amount,
            Decimal("90.00"),
        )
        self.assertEqual(
            return_item.tax_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            return_item.line_total,
            Decimal("103.50"),
        )

        self.assertEqual(
            sales_return.subtotal,
            Decimal("100.00"),
        )
        self.assertEqual(
            sales_return.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            sales_return.taxable_amount,
            Decimal("90.00"),
        )
        self.assertEqual(
            sales_return.tax_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            sales_return.total_amount,
            Decimal("103.50"),
        )

    def test_draft_return_does_not_consume_quantity(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-DRAFT-QTY",
        )

        self._create_return_item(
            sales_return,
            quantity="1",
        )

        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            invoice_item.returnable_quantity,
            Decimal("4.0000"),
        )

    def test_confirmed_partial_return_consumes_quantity(
        self,
    ):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-PARTIAL",
        )

        self._create_return_item(
            sales_return,
            quantity="1.5",
        )

        sales_return.confirm(
            user=self.user
        )

        sales_return.refresh_from_db()
        invoice_item.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CONFIRMED,
        )
        self.assertEqual(
            sales_return.confirmed_by,
            self.user,
        )
        self.assertIsNotNone(
            sales_return.confirmed_at
        )
        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("1.5000"),
        )
        self.assertEqual(
            invoice_item.returnable_quantity,
            Decimal("2.5000"),
        )

    def test_multiple_returns_support_full_return(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        first_return = self._create_draft_return(
            invoice,
            return_number="SR-FULL-001",
        )
        self._create_return_item(
            first_return,
            quantity="1.5",
        )
        first_return.confirm(
            user=self.user
        )

        second_return = self._create_draft_return(
            invoice,
            return_number="SR-FULL-002",
        )
        self._create_return_item(
            second_return,
            quantity="2.5",
        )
        second_return.confirm(
            user=self.user
        )

        invoice_item.refresh_from_db()

        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            invoice_item.returnable_quantity,
            Decimal("0.0000"),
        )

    def test_return_item_rejects_quantity_over_invoice(
        self,
    ):
        invoice = self._create_issued_invoice()
        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-OVER-QTY",
        )

        return_item = SalesReturnItem(
            sales_return=sales_return,
            company=self.company,
            invoice_item=invoice.items.get(),
            catalog_item=self.item,
            line_number=1,
            quantity=Decimal("5.0000"),
        )

        with self.assertRaises(
            ValidationError
        ):
            return_item.full_clean()

    def test_second_return_rejects_quantity_over_remaining(
        self,
    ):
        invoice = self._create_issued_invoice()

        first_return = self._create_draft_return(
            invoice,
            return_number="SR-REMAINING-001",
        )
        self._create_return_item(
            first_return,
            quantity="3",
        )
        first_return.confirm(
            user=self.user
        )

        second_return = self._create_draft_return(
            invoice,
            return_number="SR-REMAINING-002",
        )

        return_item = SalesReturnItem(
            sales_return=second_return,
            company=self.company,
            invoice_item=invoice.items.get(),
            catalog_item=self.item,
            line_number=1,
            quantity=Decimal("2.0000"),
        )

        with self.assertRaises(
            ValidationError
        ):
            return_item.full_clean()

    def test_cancelled_return_releases_quantity(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-CANCEL-QTY",
        )
        self._create_return_item(
            sales_return,
            quantity="2",
        )

        sales_return.confirm(
            user=self.user
        )

        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("2.0000"),
        )

        sales_return.cancel(
            reason="Return cancelled",
            user=self.user,
        )

        sales_return.refresh_from_db()
        invoice_item.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CANCELLED,
        )
        self.assertEqual(
            sales_return.cancelled_reason,
            "Return cancelled",
        )
        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            invoice_item.returnable_quantity,
            Decimal("4.0000"),
        )

    def test_confirmed_return_item_cannot_be_modified(
        self,
    ):
        invoice = self._create_issued_invoice()
        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-LOCKED",
        )
        return_item = self._create_return_item(
            sales_return,
            quantity="1",
        )

        sales_return.confirm(
            user=self.user
        )
        sales_return.refresh_from_db()
        return_item.refresh_from_db()

        return_item.quantity = Decimal("2.0000")

        with self.assertRaises(
            ValidationError
        ):
            return_item.full_clean()

    def test_confirmed_return_item_cannot_be_deleted(
        self,
    ):
        invoice = self._create_issued_invoice()
        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-LOCKED-DELETE",
        )
        return_item = self._create_return_item(
            sales_return,
            quantity="1",
        )

        sales_return.confirm(
            user=self.user
        )
        sales_return.refresh_from_db()

        with self.assertRaises(
            ValidationError
        ):
            return_item.delete()

    def test_sales_return_lifecycle_to_posted(self):
        invoice = self._create_issued_invoice()
        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-LIFECYCLE",
        )
        self._create_return_item(
            sales_return,
            quantity="1",
        )

        sales_return.confirm(
            user=self.user
        )
        sales_return.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CONFIRMED,
        )
        self.assertTrue(
            sales_return.can_be_posted
        )

        sales_return.mark_posted(
            user=self.user
        )
        sales_return.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.POSTED,
        )
        self.assertEqual(
            sales_return.posted_by,
            self.user,
        )
        self.assertIsNotNone(
            sales_return.posted_at
        )
        self.assertFalse(
            sales_return.can_be_cancelled
        )

    def test_posted_return_cannot_be_cancelled(self):
        invoice = self._create_issued_invoice()
        sales_return = self._create_draft_return(
            invoice,
            return_number="SR-POSTED-CANCEL",
        )
        self._create_return_item(
            sales_return,
            quantity="1",
        )

        sales_return.confirm(
            user=self.user
        )
        sales_return.mark_posted(
            user=self.user
        )

        with self.assertRaises(
            ValidationError
        ):
            sales_return.cancel(
                reason="Invalid cancellation",
                user=self.user,
            )

    def test_return_item_rejects_other_invoice_item(
        self,
    ):
        first_invoice = self._create_issued_invoice()

        second_invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.service.id,
                    "quantity": "1",
                }
            ],
        )
        second_invoice = issue_sales_invoice(
            company=self.company,
            invoice=second_invoice,
            user=self.user,
        )

        sales_return = self._create_draft_return(
            first_invoice,
            return_number="SR-WRONG-INVOICE-ITEM",
        )

        return_item = SalesReturnItem(
            sales_return=sales_return,
            company=self.company,
            invoice_item=second_invoice.items.get(),
            catalog_item=self.service,
            line_number=1,
            quantity=Decimal("1.0000"),
        )

        with self.assertRaises(
            ValidationError
        ):
            return_item.full_clean()

    def test_return_number_unique_inside_company(self):
        invoice = self._create_issued_invoice()

        self._create_draft_return(
            invoice,
            return_number="SR-UNIQUE-001",
        )

        duplicate = SalesReturn(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=invoice,
            return_number="SR-UNIQUE-001",
            return_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            duplicate.full_clean()


# End Phase 21.4.1 - Sales Returns Models Foundation Tests
# ============================================================

# ============================================================
# Phase 21.4.2 - Sales Returns Services Foundation Tests
# ============================================================


class SalesReturnServicesTests(SalesTestCase):
    """
    Tests for company-scoped sales return services.
    """

    def _create_issued_invoice(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        quantity="4",
        discount_amount="40.00",
    ) -> SalesInvoice:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": quantity,
                    "discount_amount": discount_amount,
                }
            ],
        )

        return issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

    def test_generate_sales_return_number_uses_year(self):
        return_number = generate_sales_return_number(
            self.company,
            return_date=timezone.localdate(),
        )

        self.assertTrue(
            return_number.startswith(
                f"SR-{timezone.localdate().year}-"
            )
        )
        self.assertTrue(
            return_number.endswith("000001")
        )

    def test_create_partial_sales_return(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            reason=SalesReturnReason.CUSTOMER_REQUEST,
            reason_details="Customer returned one unit",
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "1",
                    "restock": True,
                    "condition_notes": "Good condition",
                }
            ],
        )

        sales_return.refresh_from_db()
        return_item = sales_return.items.get()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.DRAFT,
        )
        self.assertEqual(
            sales_return.invoice,
            invoice,
        )
        self.assertEqual(
            sales_return.company,
            self.company,
        )
        self.assertEqual(
            return_item.invoice_item,
            invoice_item,
        )
        self.assertEqual(
            return_item.quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            return_item.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            return_item.tax_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            return_item.line_total,
            Decimal("103.50"),
        )
        self.assertEqual(
            sales_return.total_amount,
            Decimal("103.50"),
        )
        self.assertEqual(
            sales_return.reason_details,
            "Customer returned one unit",
        )
        self.assertTrue(return_item.restock)

    def test_create_full_sales_return_when_items_omitted(self):
        invoice = self._create_issued_invoice(
            quantity="2",
            discount_amount="20.00",
        )

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=None,
        )

        return_item = sales_return.items.get()

        self.assertEqual(
            return_item.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            sales_return.total_amount,
            invoice.total_amount,
        )

    def test_create_return_rejects_draft_invoice(self):
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
            create_sales_return(
                company=self.company,
                invoice=invoice,
                user=self.user,
                items=None,
            )

    def test_create_return_rejects_cross_company_invoice(self):
        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
            discount_amount="0.00",
        )

        with self.assertRaises(ValidationError):
            create_sales_return(
                company=self.company,
                invoice=other_invoice,
                user=self.user,
                items=None,
            )

    def test_create_return_rejects_duplicate_invoice_item(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        with self.assertRaises(ValidationError):
            create_sales_return(
                company=self.company,
                invoice=invoice,
                user=self.user,
                items=[
                    {
                        "invoice_item_id": invoice_item.id,
                        "quantity": "1",
                    },
                    {
                        "invoice_item_id": invoice_item.id,
                        "quantity": "1",
                    },
                ],
            )

    def test_create_return_rejects_quantity_over_remaining(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        first_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "3",
                }
            ],
        )

        confirm_sales_return(
            company=self.company,
            sales_return=first_return,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            create_sales_return(
                company=self.company,
                invoice=invoice,
                user=self.user,
                items=[
                    {
                        "invoice_item_id": invoice_item.id,
                        "quantity": "2",
                    }
                ],
            )

    def test_confirm_sales_return_consumes_quantity(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "1.5",
                }
            ],
        )

        sales_return = confirm_sales_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        invoice_item.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CONFIRMED,
        )
        self.assertEqual(
            sales_return.confirmed_by,
            self.user,
        )
        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("1.5000"),
        )
        self.assertEqual(
            invoice_item.returnable_quantity,
            Decimal("2.5000"),
        )

    def test_cancel_confirmed_return_releases_quantity(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "2",
                }
            ],
        )

        sales_return = confirm_sales_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        sales_return = cancel_sales_return(
            company=self.company,
            sales_return=sales_return,
            reason="Return cancelled",
            user=self.user,
        )

        invoice_item.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CANCELLED,
        )
        self.assertEqual(
            sales_return.cancelled_reason,
            "Return cancelled",
        )
        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            invoice_item.returnable_quantity,
            Decimal("4.0000"),
        )

    def test_confirm_return_blocks_cross_company_access(self):
        invoice = self._create_issued_invoice()

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=None,
        )

        with self.assertRaises(ValidationError):
            confirm_sales_return(
                company=self.other_company,
                sales_return=sales_return,
                user=self.other_user,
            )

    def test_serialize_sales_return_with_items(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "1",
                    "restock": False,
                    "condition_notes": "Damaged",
                }
            ],
        )

        data = serialize_sales_return(
            sales_return,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            sales_return.id,
        )
        self.assertEqual(
            data["company_id"],
            self.company.id,
        )
        self.assertEqual(
            data["invoice"]["id"],
            invoice.id,
        )
        self.assertEqual(
            data["total_amount"],
            "103.50",
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )
        self.assertEqual(
            data["items"][0]["invoice_item_id"],
            invoice_item.id,
        )
        self.assertFalse(
            data["items"][0]["restock"]
        )
        self.assertEqual(
            data["items"][0]["condition_notes"],
            "Damaged",
        )

    def test_invoice_return_summary_excludes_cancelled_amount(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        cancelled_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "1",
                }
            ],
        )

        cancelled_return = confirm_sales_return(
            company=self.company,
            sales_return=cancelled_return,
            user=self.user,
        )

        cancel_sales_return(
            company=self.company,
            sales_return=cancelled_return,
            reason="Cancelled",
            user=self.user,
        )

        active_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id": invoice_item.id,
                    "quantity": "2",
                }
            ],
        )

        confirm_sales_return(
            company=self.company,
            sales_return=active_return,
            user=self.user,
        )

        summary = serialize_invoice_return_summary(
            invoice
        )

        self.assertEqual(
            summary["invoice_id"],
            invoice.id,
        )
        self.assertEqual(
            summary["returned_amount"],
            "207.00",
        )
        self.assertEqual(
            summary["net_amount"],
            "207.00",
        )
        self.assertEqual(
            summary["returns_count"],
            1,
        )
        self.assertEqual(
            summary["items"][0]["returned_quantity"],
            "2.0000",
        )
        self.assertEqual(
            summary["items"][0]["returnable_quantity"],
            "2.0000",
        )

    def test_full_return_rejected_after_invoice_fully_returned(self):
        invoice = self._create_issued_invoice(
            quantity="1",
            discount_amount="0.00",
        )

        first_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=None,
        )

        confirm_sales_return(
            company=self.company,
            sales_return=first_return,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            create_sales_return(
                company=self.company,
                invoice=invoice,
                user=self.user,
                items=None,
            )


# End Phase 21.4.2 - Sales Returns Services Foundation Tests
# ============================================================

# ============================================================
# Phase 21.4.3 - Sales Returns Company APIs Tests
# ============================================================


class SalesReturnsAPITests(SalesTestCase):
    """
    API, permission, lifecycle, and tenant-isolation tests
    for company sales returns.
    """

    def _create_issued_invoice(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        quantity="4",
        discount_amount="40.00",
    ) -> SalesInvoice:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": quantity,
                    "discount_amount": discount_amount,
                }
            ],
        )

        return issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

    def _create_return(
        self,
        *,
        invoice=None,
        company=None,
        user=None,
        quantity="1",
    ) -> SalesReturn:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_invoice = (
            invoice
            or self._create_issued_invoice(
                company=selected_company,
                user=selected_user,
                customer=(
                    self.customer
                    if selected_company == self.company
                    else self.other_customer
                ),
                catalog_item=(
                    self.item
                    if selected_company == self.company
                    else self.other_item
                ),
            )
        )

        return create_sales_return(
            company=selected_company,
            invoice=selected_invoice,
            user=selected_user,
            items=[
                {
                    "invoice_item_id":
                        selected_invoice.items.get().id,
                    "quantity": quantity,
                }
            ],
        )

    def test_returns_list_returns_current_company_only(self):
        current_return = self._create_return()

        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
            discount_amount="0.00",
        )

        other_return = self._create_return(
            invoice=other_invoice,
            company=self.other_company,
            user=self.other_user,
        )

        response = self.client.get(
            "/api/company/sales/returns/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            current_return.id,
        )
        self.assertNotEqual(
            payload["results"][0]["id"],
            other_return.id,
        )

    def test_returns_list_supports_search_and_status_filter(
        self,
    ):
        sales_return = self._create_return()

        confirm_sales_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        response = self.client.get(
            "/api/company/sales/returns/",
            {
                "q": sales_return.return_number,
                "status":
                    SalesReturnStatus.CONFIRMED,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            sales_return.id,
        )
        self.assertEqual(
            payload["results"][0]["status"],
            SalesReturnStatus.CONFIRMED,
        )

    def test_create_partial_return_endpoint(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        response = self.client.post(
            "/api/company/sales/returns/create/",
            data={
                "invoice_id": invoice.id,
                "reason":
                    SalesReturnReason.CUSTOMER_REQUEST,
                "reason_details":
                    "Partial customer return",
                "items": [
                    {
                        "invoice_item_id":
                            invoice_item.id,
                        "quantity": "1",
                        "restock": True,
                        "condition_notes":
                            "Good condition",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()
        sales_return = SalesReturn.objects.get(
            company=self.company
        )

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["sales_return"]["status"],
            SalesReturnStatus.DRAFT,
        )
        self.assertEqual(
            payload["sales_return"]["total_amount"],
            "103.50",
        )
        self.assertEqual(
            len(
                payload["sales_return"]["items"]
            ),
            1,
        )
        self.assertEqual(
            sales_return.invoice,
            invoice,
        )
        self.assertEqual(
            sales_return.reason_details,
            "Partial customer return",
        )

    def test_create_full_return_endpoint_when_items_omitted(
        self,
    ):
        invoice = self._create_issued_invoice(
            quantity="2",
            discount_amount="20.00",
        )

        response = self.client.post(
            "/api/company/sales/returns/create/",
            data={
                "invoice_id": invoice.id,
                "reason":
                    SalesReturnReason.OTHER,
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertEqual(
            payload["sales_return"]["items"][0][
                "quantity"
            ],
            "2.0000",
        )
        self.assertEqual(
            payload["sales_return"]["total_amount"],
            str(invoice.total_amount),
        )

    def test_create_return_rejects_draft_invoice(self):
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

        response = self.client.post(
            "/api/company/sales/returns/create/",
            data={
                "invoice_id": invoice.id,
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
            response.content,
        )
        self.assertFalse(
            response.json()["success"]
        )

    def test_return_detail_returns_items(self):
        sales_return = self._create_return()

        response = self.client.get(
            f"/api/company/sales/returns/"
            f"{sales_return.id}/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertEqual(
            payload["sales_return"]["id"],
            sales_return.id,
        )
        self.assertEqual(
            len(
                payload["sales_return"]["items"]
            ),
            1,
        )

    def test_return_detail_blocks_cross_company_access(self):
        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
            discount_amount="0.00",
        )

        other_return = self._create_return(
            invoice=other_invoice,
            company=self.other_company,
            user=self.other_user,
        )

        response = self.client.get(
            f"/api/company/sales/returns/"
            f"{other_return.id}/"
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_confirm_return_endpoint(self):
        sales_return = self._create_return()
        invoice_item = (
            sales_return.invoice.items.get()
        )

        response = self.client.post(
            f"/api/company/sales/returns/"
            f"{sales_return.id}/confirm/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        sales_return.refresh_from_db()
        invoice_item.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CONFIRMED,
        )
        self.assertEqual(
            sales_return.confirmed_by,
            self.user,
        )
        self.assertEqual(
            invoice_item.returned_quantity,
            Decimal("1.0000"),
        )

    def test_cancel_confirmed_return_endpoint(self):
        sales_return = self._create_return()

        confirm_sales_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        response = self.client.post(
            f"/api/company/sales/returns/"
            f"{sales_return.id}/cancel/",
            data={
                "reason": "API cancellation",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        sales_return.refresh_from_db()

        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.CANCELLED,
        )
        self.assertEqual(
            sales_return.cancelled_reason,
            "API cancellation",
        )
        self.assertEqual(
            sales_return.cancelled_by,
            self.user,
        )

    def test_invoice_returns_summary_endpoint(self):
        invoice = self._create_issued_invoice()
        invoice_item = invoice.items.get()

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id":
                        invoice_item.id,
                    "quantity": "2",
                }
            ],
        )

        confirm_sales_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        response = self.client.get(
            "/api/company/sales/returns/"
            f"invoice/{invoice.id}/summary/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["summary"]["invoice_id"],
            invoice.id,
        )
        self.assertEqual(
            payload["summary"]["returned_amount"],
            "207.00",
        )
        self.assertEqual(
            payload["summary"]["net_amount"],
            "207.00",
        )
        self.assertEqual(
            payload["summary"]["returns_count"],
            1,
        )

    def test_invoice_summary_blocks_cross_company_access(
        self,
    ):
        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
            discount_amount="0.00",
        )

        response = self.client.get(
            "/api/company/sales/returns/"
            f"invoice/{other_invoice.id}/summary/"
        )

        self.assertEqual(
            response.status_code,
            404,
        )

    def test_viewer_can_view_but_cannot_create_return(
        self,
    ):
        sales_return = self._create_return()
        invoice = sales_return.invoice

        self.client.force_login(
            self.viewer_user
        )

        list_response = self.client.get(
            "/api/company/sales/returns/"
        )

        detail_response = self.client.get(
            f"/api/company/sales/returns/"
            f"{sales_return.id}/"
        )

        create_response = self.client.post(
            "/api/company/sales/returns/create/",
            data={
                "invoice_id": invoice.id,
                "items": [
                    {
                        "invoice_item_id":
                            invoice.items.get().id,
                        "quantity": "1",
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(
            list_response.status_code,
            200,
            list_response.content,
        )
        self.assertEqual(
            detail_response.status_code,
            200,
            detail_response.content,
        )
        self.assertEqual(
            create_response.status_code,
            403,
            create_response.content,
        )

    def test_viewer_cannot_confirm_or_cancel_return(
        self,
    ):
        sales_return = self._create_return()

        self.client.force_login(
            self.viewer_user
        )

        confirm_response = self.client.post(
            f"/api/company/sales/returns/"
            f"{sales_return.id}/confirm/"
        )

        cancel_response = self.client.post(
            f"/api/company/sales/returns/"
            f"{sales_return.id}/cancel/",
            data={
                "reason": "Not allowed",
            },
            content_type="application/json",
        )

        self.assertEqual(
            confirm_response.status_code,
            403,
            confirm_response.content,
        )
        self.assertEqual(
            cancel_response.status_code,
            403,
            cancel_response.content,
        )

    def test_unauthenticated_user_cannot_list_returns(
        self,
    ):
        self.client.logout()

        response = self.client.get(
            "/api/company/sales/returns/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )


# End Phase 21.4.3 - Sales Returns Company APIs Tests
# ============================================================


# ============================================================
# Phase 21.5.1 - Sales Credit Notes Models Foundation Tests
# ============================================================


class SalesCreditNoteModelTests(SalesTestCase):
    """
    Model tests for credit note isolation, snapshots, totals,
    uniqueness, locking, and lifecycle.
    """

    def _create_confirmed_return(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        invoice_quantity="4",
        return_quantity="1",
        discount_amount="40.00",
    ) -> SalesReturn:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id":
                        selected_item.id,
                    "quantity":
                        invoice_quantity,
                    "discount_amount":
                        discount_amount,
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

        sales_return = create_sales_return(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
            items=[
                {
                    "invoice_item_id":
                        invoice.items.get().id,
                    "quantity":
                        return_quantity,
                }
            ],
        )

        return confirm_sales_return(
            company=selected_company,
            sales_return=sales_return,
            user=selected_user,
        )

    def _create_credit_note(
        self,
        sales_return: SalesReturn,
        *,
        credit_note_number="SCN-MODEL-001",
        company=None,
        user=None,
        create_item=True,
    ) -> SalesCreditNote:
        selected_company = (
            company or sales_return.company
        )
        selected_user = (
            user or self.user
        )

        credit_note = SalesCreditNote(
            company=selected_company,
            branch=sales_return.branch,
            customer=sales_return.customer,
            invoice=sales_return.invoice,
            sales_return=sales_return,
            credit_note_number=credit_note_number,
            credit_note_date=timezone.localdate(),
            currency_code=sales_return.currency_code,
            created_by=selected_user,
            updated_by=selected_user,
        )

        credit_note.full_clean()
        credit_note.save()

        if create_item:
            return_item = (
                sales_return.items.get()
            )

            credit_note_item = (
                SalesCreditNoteItem(
                    credit_note=credit_note,
                    company=selected_company,
                    sales_return_item=return_item,
                    invoice_item=(
                        return_item.invoice_item
                    ),
                    catalog_item=(
                        return_item.catalog_item
                    ),
                    line_number=1,
                    quantity=return_item.quantity,
                )
            )

            credit_note_item.save()

        credit_note.refresh_from_db()
        return credit_note

    def test_credit_note_defaults_to_draft(self):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.DRAFT,
        )
        self.assertTrue(
            credit_note.is_draft
        )
        self.assertTrue(
            credit_note.can_be_edited
        )
        self.assertTrue(
            credit_note.can_be_issued
        )
        self.assertFalse(
            credit_note.can_be_posted
        )

    def test_credit_note_rejects_cross_company_return(
        self,
    ):
        other_return = (
            self._create_confirmed_return(
                company=self.other_company,
                user=self.other_user,
                customer=self.other_customer,
                catalog_item=self.other_item,
                invoice_quantity="1",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        credit_note = SalesCreditNote(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=other_return.invoice,
            sales_return=other_return,
            credit_note_number="SCN-CROSS-COMPANY",
            credit_note_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_note.full_clean()

    def test_credit_note_rejects_draft_return(self):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id":
                        self.item.id,
                    "quantity": "1",
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=None,
        )

        credit_note = SalesCreditNote(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=invoice,
            sales_return=sales_return,
            credit_note_number="SCN-DRAFT-RETURN",
            credit_note_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_note.full_clean()

    def test_credit_note_rejects_wrong_invoice(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        other_invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id":
                        self.service.id,
                    "quantity": "1",
                }
            ],
        )

        other_invoice = issue_sales_invoice(
            company=self.company,
            invoice=other_invoice,
            user=self.user,
        )

        credit_note = SalesCreditNote(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=other_invoice,
            sales_return=sales_return,
            credit_note_number="SCN-WRONG-INVOICE",
            credit_note_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_note.full_clean()

    def test_credit_note_rejects_date_before_return(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = SalesCreditNote(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=sales_return.invoice,
            sales_return=sales_return,
            credit_note_number="SCN-INVALID-DATE",
            credit_note_date=(
                sales_return.return_date
                - timedelta(days=1)
            ),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_note.full_clean()

    def test_credit_note_item_copies_return_snapshot(
        self,
    ):
        sales_return = (
            self._create_confirmed_return(
                invoice_quantity="4",
                return_quantity="1",
                discount_amount="40.00",
            )
        )

        return_item = sales_return.items.get()

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_item = (
            credit_note.items.get()
        )

        self.assertEqual(
            credit_item.sales_return_item,
            return_item,
        )
        self.assertEqual(
            credit_item.invoice_item,
            return_item.invoice_item,
        )
        self.assertEqual(
            credit_item.catalog_item,
            return_item.catalog_item,
        )
        self.assertEqual(
            credit_item.item_code_snapshot,
            return_item.item_code_snapshot,
        )
        self.assertEqual(
            credit_item.item_name_snapshot,
            return_item.item_name_snapshot,
        )
        self.assertEqual(
            credit_item.quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            credit_item.unit_price,
            Decimal("100.00"),
        )
        self.assertEqual(
            credit_item.line_subtotal,
            Decimal("100.00"),
        )
        self.assertEqual(
            credit_item.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            credit_item.taxable_amount,
            Decimal("90.00"),
        )
        self.assertEqual(
            credit_item.tax_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            credit_item.line_total,
            Decimal("103.50"),
        )

    def test_credit_note_item_updates_header_totals(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.subtotal,
            Decimal("100.00"),
        )
        self.assertEqual(
            credit_note.discount_amount,
            Decimal("10.00"),
        )
        self.assertEqual(
            credit_note.taxable_amount,
            Decimal("90.00"),
        )
        self.assertEqual(
            credit_note.tax_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            credit_note.total_amount,
            Decimal("103.50"),
        )

    def test_return_can_have_only_one_credit_note(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        self._create_credit_note(
            sales_return,
            credit_note_number="SCN-ONE-001",
        )

        duplicate = SalesCreditNote(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=sales_return.invoice,
            sales_return=sales_return,
            credit_note_number="SCN-ONE-002",
            credit_note_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            duplicate.full_clean()

    def test_credit_note_number_unique_inside_company(
        self,
    ):
        first_return = (
            self._create_confirmed_return()
        )

        self._create_credit_note(
            first_return,
            credit_note_number="SCN-UNIQUE-001",
        )

        second_return = (
            self._create_confirmed_return(
                invoice_quantity="2",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        duplicate = SalesCreditNote(
            company=self.company,
            branch=self.branch,
            customer=self.customer,
            invoice=second_return.invoice,
            sales_return=second_return,
            credit_note_number="SCN-UNIQUE-001",
            credit_note_date=timezone.localdate(),
            currency_code="SAR",
        )

        with self.assertRaises(
            ValidationError
        ):
            duplicate.full_clean()

    def test_same_credit_note_number_allowed_other_company(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        self._create_credit_note(
            sales_return,
            credit_note_number="SCN-SHARED-001",
        )

        other_return = (
            self._create_confirmed_return(
                company=self.other_company,
                user=self.other_user,
                customer=self.other_customer,
                catalog_item=self.other_item,
                invoice_quantity="1",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        other_credit_note = (
            self._create_credit_note(
                other_return,
                credit_note_number=(
                    "SCN-SHARED-001"
                ),
                company=self.other_company,
                user=self.other_user,
            )
        )

        self.assertEqual(
            SalesCreditNote.objects.filter(
                credit_note_number=(
                    "SCN-SHARED-001"
                )
            ).count(),
            2,
        )
        self.assertEqual(
            other_credit_note.company,
            self.other_company,
        )

    def test_issue_credit_note_refreshes_snapshots(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.issue(
            user=self.user
        )
        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.ISSUED,
        )
        self.assertEqual(
            credit_note.issued_by,
            self.user,
        )
        self.assertIsNotNone(
            credit_note.issued_at
        )
        self.assertEqual(
            credit_note.customer_snapshot[
                "display_name"
            ],
            "Customer One",
        )
        self.assertEqual(
            credit_note.invoice_snapshot[
                "invoice_number"
            ],
            sales_return.invoice.invoice_number,
        )
        self.assertEqual(
            credit_note.return_snapshot[
                "return_number"
            ],
            sales_return.return_number,
        )
        self.assertEqual(
            credit_note.return_snapshot[
                "total_amount"
            ],
            str(sales_return.total_amount),
        )

    def test_issue_credit_note_requires_items(self):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return,
            create_item=False,
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_note.issue(
                user=self.user
            )

    def test_issued_credit_note_item_cannot_be_modified(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.issue(
            user=self.user
        )
        credit_note.refresh_from_db()

        credit_item = (
            credit_note.items.get()
        )
        credit_item.quantity = (
            Decimal("2.0000")
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_item.full_clean()

    def test_issued_credit_note_item_cannot_be_deleted(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.issue(
            user=self.user
        )
        credit_note.refresh_from_db()

        with self.assertRaises(
            ValidationError
        ):
            credit_note.items.get().delete()

    def test_credit_note_lifecycle_to_posted(self):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.issue(
            user=self.user
        )
        credit_note.refresh_from_db()

        self.assertTrue(
            credit_note.can_be_posted
        )

        credit_note.mark_posted(
            user=self.user
        )
        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.POSTED,
        )
        self.assertEqual(
            credit_note.posted_by,
            self.user,
        )
        self.assertIsNotNone(
            credit_note.posted_at
        )
        self.assertFalse(
            credit_note.can_be_cancelled
        )

    def test_cancel_issued_credit_note(self):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.issue(
            user=self.user
        )

        credit_note.cancel(
            reason="Credit note cancelled",
            user=self.user,
        )
        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.CANCELLED,
        )
        self.assertEqual(
            credit_note.cancelled_reason,
            "Credit note cancelled",
        )
        self.assertEqual(
            credit_note.cancelled_by,
            self.user,
        )
        self.assertIsNotNone(
            credit_note.cancelled_at
        )

    def test_posted_credit_note_cannot_be_cancelled(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        credit_note = self._create_credit_note(
            sales_return
        )

        credit_note.issue(
            user=self.user
        )
        credit_note.mark_posted(
            user=self.user
        )

        with self.assertRaises(
            ValidationError
        ):
            credit_note.cancel(
                reason="Invalid cancellation",
                user=self.user,
            )


# End Phase 21.5.1 - Sales Credit Notes Models Foundation Tests
# ============================================================


# ============================================================
# Phase 21.5.2 - Sales Credit Notes Services Foundation Tests
# ============================================================


class SalesCreditNoteServicesTests(SalesTestCase):
    """
    Service tests for company-scoped sales credit notes.
    """

    def _create_confirmed_return(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        invoice_quantity="4",
        return_quantity="1",
        discount_amount="40.00",
    ) -> SalesReturn:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": invoice_quantity,
                    "discount_amount": discount_amount,
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

        sales_return = create_sales_return(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
            items=[
                {
                    "invoice_item_id":
                        invoice.items.get().id,
                    "quantity": return_quantity,
                }
            ],
        )

        return confirm_sales_return(
            company=selected_company,
            sales_return=sales_return,
            user=selected_user,
        )

    def test_generate_credit_note_number_uses_year(self):
        number = generate_sales_credit_note_number(
            self.company,
            credit_note_date=timezone.localdate(),
        )

        self.assertTrue(
            number.startswith(
                f"SCN-{timezone.localdate().year}-"
            )
        )
        self.assertTrue(
            number.endswith("000001")
        )

    def test_create_credit_note_from_confirmed_return(self):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        credit_note.refresh_from_db()
        item = credit_note.items.get()
        return_item = sales_return.items.get()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.DRAFT,
        )
        self.assertEqual(
            credit_note.company,
            self.company,
        )
        self.assertEqual(
            credit_note.sales_return,
            sales_return,
        )
        self.assertEqual(
            credit_note.invoice,
            sales_return.invoice,
        )
        self.assertEqual(
            credit_note.customer,
            sales_return.customer,
        )
        self.assertEqual(
            credit_note.branch,
            sales_return.branch,
        )
        self.assertEqual(
            credit_note.items.count(),
            1,
        )
        self.assertEqual(
            item.sales_return_item,
            return_item,
        )
        self.assertEqual(
            item.invoice_item,
            return_item.invoice_item,
        )
        self.assertEqual(
            item.quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            item.line_total,
            Decimal("103.50"),
        )
        self.assertEqual(
            credit_note.total_amount,
            sales_return.total_amount,
        )

    def test_create_credit_note_copies_notes_and_extra_data(
        self,
    ):
        sales_return = self._create_confirmed_return()
        sales_return.public_notes = "Return public note"
        sales_return.internal_notes = "Return internal note"
        sales_return.save(
            update_fields=[
                "public_notes",
                "internal_notes",
                "updated_at",
            ]
        )

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
            extra_data={
                "requested_by": "customer",
            },
        )

        self.assertEqual(
            credit_note.public_notes,
            "Return public note",
        )
        self.assertEqual(
            credit_note.internal_notes,
            "Return internal note",
        )
        self.assertEqual(
            credit_note.extra_data["requested_by"],
            "customer",
        )
        self.assertEqual(
            credit_note.extra_data[
                "source_sales_return_id"
            ],
            sales_return.id,
        )
        self.assertEqual(
            credit_note.extra_data[
                "source_invoice_id"
            ],
            sales_return.invoice_id,
        )

    def test_create_credit_note_can_issue_now(self):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
            issue_now=True,
        )

        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.ISSUED,
        )
        self.assertEqual(
            credit_note.issued_by,
            self.user,
        )
        self.assertIsNotNone(
            credit_note.issued_at
        )
        self.assertEqual(
            credit_note.return_snapshot[
                "return_number"
            ],
            sales_return.return_number,
        )

    def test_create_credit_note_rejects_draft_return(self):
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

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=None,
        )

        with self.assertRaises(ValidationError):
            create_sales_credit_note_from_return(
                company=self.company,
                sales_return=sales_return,
                user=self.user,
            )

    def test_create_credit_note_rejects_duplicate_return(
        self,
    ):
        sales_return = self._create_confirmed_return()

        create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            create_sales_credit_note_from_return(
                company=self.company,
                sales_return=sales_return,
                user=self.user,
            )

        self.assertEqual(
            SalesCreditNote.objects.filter(
                sales_return=sales_return
            ).count(),
            1,
        )

    def test_create_credit_note_blocks_cross_company_return(
        self,
    ):
        sales_return = self._create_confirmed_return()

        with self.assertRaises(ValidationError):
            create_sales_credit_note_from_return(
                company=self.other_company,
                sales_return=sales_return,
                user=self.other_user,
            )

    def test_create_credit_note_rejects_invalid_date(self):
        sales_return = self._create_confirmed_return()

        with self.assertRaises(ValidationError):
            create_sales_credit_note_from_return(
                company=self.company,
                sales_return=sales_return,
                user=self.user,
                credit_note_date=(
                    sales_return.return_date
                    - timedelta(days=1)
                ),
            )

    def test_issue_credit_note_service(self):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        credit_note = issue_sales_credit_note(
            company=self.company,
            credit_note=credit_note,
            user=self.user,
        )

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.ISSUED,
        )
        self.assertEqual(
            credit_note.issued_by,
            self.user,
        )
        self.assertIsNotNone(
            credit_note.issued_at
        )

    def test_issue_credit_note_blocks_cross_company(
        self,
    ):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            issue_sales_credit_note(
                company=self.other_company,
                credit_note=credit_note,
                user=self.other_user,
            )

    def test_cancel_issued_credit_note_service(self):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
            issue_now=True,
        )

        credit_note = cancel_sales_credit_note(
            company=self.company,
            credit_note=credit_note,
            reason="Customer credit note cancelled",
            user=self.user,
        )

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.CANCELLED,
        )
        self.assertEqual(
            credit_note.cancelled_reason,
            "Customer credit note cancelled",
        )
        self.assertEqual(
            credit_note.cancelled_by,
            self.user,
        )

    def test_cancel_credit_note_blocks_cross_company(
        self,
    ):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            cancel_sales_credit_note(
                company=self.other_company,
                credit_note=credit_note,
                reason="Invalid cancellation",
                user=self.other_user,
            )

    def test_serialize_credit_note_with_items(self):
        sales_return = self._create_confirmed_return()

        credit_note = create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        data = serialize_sales_credit_note(
            credit_note,
            include_items=True,
        )

        self.assertEqual(
            data["id"],
            credit_note.id,
        )
        self.assertEqual(
            data["company_id"],
            self.company.id,
        )
        self.assertEqual(
            data["invoice"]["id"],
            sales_return.invoice_id,
        )
        self.assertEqual(
            data["sales_return"]["id"],
            sales_return.id,
        )
        self.assertEqual(
            data["status"],
            SalesCreditNoteStatus.DRAFT,
        )
        self.assertEqual(
            data["total_amount"],
            "103.50",
        )
        self.assertEqual(
            len(data["items"]),
            1,
        )
        self.assertEqual(
            data["items"][0][
                "sales_return_item_id"
            ],
            sales_return.items.get().id,
        )
        self.assertEqual(
            data["items"][0]["line_total"],
            "103.50",
        )


# End Phase 21.5.2 - Sales Credit Notes Services Foundation Tests
# ============================================================


# ============================================================
# Phase 21.5.3 - Sales Credit Notes Company APIs Tests
# ============================================================


class SalesCreditNotesAPITests(SalesTestCase):
    """
    API, permission, lifecycle, and tenant-isolation tests
    for company sales credit notes.
    """

    def _create_confirmed_return(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        invoice_quantity="4",
        return_quantity="1",
        discount_amount="40.00",
    ) -> SalesReturn:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id":
                        selected_item.id,
                    "quantity":
                        invoice_quantity,
                    "discount_amount":
                        discount_amount,
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

        sales_return = create_sales_return(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
            items=[
                {
                    "invoice_item_id":
                        invoice.items.get().id,
                    "quantity":
                        return_quantity,
                }
            ],
        )

        return confirm_sales_return(
            company=selected_company,
            sales_return=sales_return,
            user=selected_user,
        )

    def _create_credit_note(
        self,
        *,
        sales_return=None,
        company=None,
        user=None,
        issue_now=False,
    ) -> SalesCreditNote:
        selected_company = company or self.company
        selected_user = user or self.user

        selected_return = (
            sales_return
            or self._create_confirmed_return(
                company=selected_company,
                user=selected_user,
                customer=(
                    self.customer
                    if selected_company == self.company
                    else self.other_customer
                ),
                catalog_item=(
                    self.item
                    if selected_company == self.company
                    else self.other_item
                ),
                invoice_quantity="1",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        return create_sales_credit_note_from_return(
            company=selected_company,
            sales_return=selected_return,
            user=selected_user,
            issue_now=issue_now,
        )

    def test_credit_notes_list_returns_current_company_only(
        self,
    ):
        current_credit_note = self._create_credit_note()

        other_credit_note = self._create_credit_note(
            company=self.other_company,
            user=self.other_user,
        )

        response = self.client.get(
            "/api/company/sales/credit-notes/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            current_credit_note.id,
        )
        self.assertNotEqual(
            payload["results"][0]["id"],
            other_credit_note.id,
        )

    def test_credit_notes_list_supports_search_and_status(
        self,
    ):
        credit_note = self._create_credit_note(
            issue_now=True
        )

        response = self.client.get(
            "/api/company/sales/credit-notes/",
            {
                "q": credit_note.credit_note_number,
                "status":
                    SalesCreditNoteStatus.ISSUED,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            credit_note.id,
        )
        self.assertEqual(
            payload["results"][0]["status"],
            SalesCreditNoteStatus.ISSUED,
        )

    def test_credit_notes_list_rejects_invalid_status(
        self,
    ):
        response = self.client.get(
            "/api/company/sales/credit-notes/",
            {
                "status": "INVALID",
            },
        )

        self.assertEqual(
            response.status_code,
            400,
            response.content,
        )
        self.assertFalse(
            response.json()["success"]
        )

    def test_create_credit_note_endpoint(self):
        sales_return = (
            self._create_confirmed_return()
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    sales_return.id,
                "public_notes":
                    "API credit note",
                "extra_data": {
                    "channel": "company-api",
                },
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()
        credit_note = (
            SalesCreditNote.objects.get(
                company=self.company
            )
        )

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["credit_note"]["id"],
            credit_note.id,
        )
        self.assertEqual(
            payload["credit_note"]["status"],
            SalesCreditNoteStatus.DRAFT,
        )
        self.assertEqual(
            payload["credit_note"][
                "sales_return"
            ]["id"],
            sales_return.id,
        )
        self.assertEqual(
            payload["credit_note"][
                "total_amount"
            ],
            "103.50",
        )
        self.assertEqual(
            len(
                payload["credit_note"]["items"]
            ),
            1,
        )
        self.assertEqual(
            credit_note.public_notes,
            "API credit note",
        )
        self.assertEqual(
            credit_note.extra_data["channel"],
            "company-api",
        )

    def test_create_credit_note_endpoint_can_issue_now(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    sales_return.id,
                "issue_now": True,
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content,
        )

        payload = response.json()

        self.assertEqual(
            payload["credit_note"]["status"],
            SalesCreditNoteStatus.ISSUED,
        )
        self.assertIsNotNone(
            payload["credit_note"]["issued_at"]
        )

    def test_create_credit_note_rejects_draft_return(
        self,
    ):
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id":
                        self.item.id,
                    "quantity": "1",
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=None,
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    sales_return.id,
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
            response.content,
        )
        self.assertFalse(
            response.json()["success"]
        )

    def test_create_credit_note_rejects_duplicate_return(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )

        first_response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    sales_return.id,
            },
            content_type="application/json",
        )

        second_response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    sales_return.id,
            },
            content_type="application/json",
        )

        self.assertEqual(
            first_response.status_code,
            201,
            first_response.content,
        )
        self.assertEqual(
            second_response.status_code,
            400,
            second_response.content,
        )
        self.assertEqual(
            SalesCreditNote.objects.filter(
                sales_return=sales_return
            ).count(),
            1,
        )

    def test_create_credit_note_blocks_cross_company_return(
        self,
    ):
        other_return = (
            self._create_confirmed_return(
                company=self.other_company,
                user=self.other_user,
                customer=self.other_customer,
                catalog_item=self.other_item,
                invoice_quantity="1",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    other_return.id,
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            400,
            response.content,
        )
        self.assertFalse(
            response.json()["success"]
        )

    def test_credit_note_detail_returns_items(self):
        credit_note = self._create_credit_note()

        response = self.client.get(
            "/api/company/sales/credit-notes/"
            f"{credit_note.id}/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["credit_note"]["id"],
            credit_note.id,
        )
        self.assertEqual(
            len(
                payload["credit_note"]["items"]
            ),
            1,
        )

    def test_credit_note_detail_blocks_cross_company(
        self,
    ):
        other_credit_note = self._create_credit_note(
            company=self.other_company,
            user=self.other_user,
        )

        response = self.client.get(
            "/api/company/sales/credit-notes/"
            f"{other_credit_note.id}/"
        )

        self.assertEqual(
            response.status_code,
            404,
            response.content,
        )

    def test_issue_credit_note_endpoint(self):
        credit_note = self._create_credit_note()

        response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{credit_note.id}/issue/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.ISSUED,
        )
        self.assertEqual(
            credit_note.issued_by,
            self.user,
        )
        self.assertIsNotNone(
            credit_note.issued_at
        )

    def test_issue_credit_note_blocks_cross_company(
        self,
    ):
        other_credit_note = self._create_credit_note(
            company=self.other_company,
            user=self.other_user,
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{other_credit_note.id}/issue/"
        )

        self.assertEqual(
            response.status_code,
            404,
            response.content,
        )

    def test_cancel_issued_credit_note_endpoint(
        self,
    ):
        credit_note = self._create_credit_note(
            issue_now=True
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{credit_note.id}/cancel/",
            data={
                "reason": "API credit cancellation",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        credit_note.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.CANCELLED,
        )
        self.assertEqual(
            credit_note.cancelled_reason,
            "API credit cancellation",
        )
        self.assertEqual(
            credit_note.cancelled_by,
            self.user,
        )

    def test_cancel_credit_note_blocks_cross_company(
        self,
    ):
        other_credit_note = self._create_credit_note(
            company=self.other_company,
            user=self.other_user,
            issue_now=True,
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{other_credit_note.id}/cancel/",
            data={
                "reason": "Invalid cancellation",
            },
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            404,
            response.content,
        )

    def test_viewer_can_view_but_cannot_create_credit_note(
        self,
    ):
        sales_return = (
            self._create_confirmed_return()
        )
        credit_note = (
            create_sales_credit_note_from_return(
                company=self.company,
                sales_return=sales_return,
                user=self.user,
            )
        )

        self.client.force_login(
            self.viewer_user
        )

        list_response = self.client.get(
            "/api/company/sales/credit-notes/"
        )

        detail_response = self.client.get(
            "/api/company/sales/credit-notes/"
            f"{credit_note.id}/"
        )

        other_return = (
            self._create_confirmed_return(
                invoice_quantity="1",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        create_response = self.client.post(
            "/api/company/sales/credit-notes/create/",
            data={
                "sales_return_id":
                    other_return.id,
            },
            content_type="application/json",
        )

        self.assertEqual(
            list_response.status_code,
            200,
            list_response.content,
        )
        self.assertEqual(
            detail_response.status_code,
            200,
            detail_response.content,
        )
        self.assertEqual(
            create_response.status_code,
            403,
            create_response.content,
        )

    def test_viewer_cannot_issue_or_cancel_credit_note(
        self,
    ):
        draft_credit_note = self._create_credit_note()

        issued_return = (
            self._create_confirmed_return(
                invoice_quantity="1",
                return_quantity="1",
                discount_amount="0.00",
            )
        )

        issued_credit_note = (
            create_sales_credit_note_from_return(
                company=self.company,
                sales_return=issued_return,
                user=self.user,
                issue_now=True,
            )
        )

        self.client.force_login(
            self.viewer_user
        )

        issue_response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{draft_credit_note.id}/issue/"
        )

        cancel_response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{issued_credit_note.id}/cancel/",
            data={
                "reason": "Not allowed",
            },
            content_type="application/json",
        )

        self.assertEqual(
            issue_response.status_code,
            403,
            issue_response.content,
        )
        self.assertEqual(
            cancel_response.status_code,
            403,
            cancel_response.content,
        )

    def test_unauthenticated_user_cannot_list_credit_notes(
        self,
    ):
        self.client.logout()

        response = self.client.get(
            "/api/company/sales/credit-notes/"
        )

        self.assertIn(
            response.status_code,
            [401, 403],
        )


# End Phase 21.5.3 - Sales Credit Notes Company APIs Tests
# ============================================================
# ============================================================
# Phase 21.5.4 - Credit Note Accounting Posting Tests
# ============================================================


class SalesCreditNotePostingTests(SalesTestCase):
    """
    Accounting, lifecycle, duplicate-prevention, and API tests
    for posting sales credit notes.
    """

    def _create_issued_credit_note(
        self,
    ) -> SalesCreditNote:
        invoice = create_sales_invoice(
            company=self.company,
            user=self.user,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.item.id,
                    "quantity": "4",
                    "discount_amount": "40.00",
                }
            ],
        )

        invoice = issue_sales_invoice(
            company=self.company,
            invoice=invoice,
            user=self.user,
        )

        sales_return = create_sales_return(
            company=self.company,
            invoice=invoice,
            user=self.user,
            items=[
                {
                    "invoice_item_id":
                        invoice.items.get().id,
                    "quantity": "1",
                }
            ],
        )

        sales_return = confirm_sales_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
        )

        return create_sales_credit_note_from_return(
            company=self.company,
            sales_return=sales_return,
            user=self.user,
            issue_now=True,
        )

    def test_post_credit_note_creates_balanced_entry(
        self,
    ):
        credit_note = self._create_issued_credit_note()

        credit_note = post_sales_credit_note(
            company=self.company,
            credit_note=credit_note,
            user=self.user,
        )

        credit_note.refresh_from_db()
        sales_return = credit_note.sales_return
        sales_return.refresh_from_db()

        entry = JournalEntry.objects.get(
            company=self.company,
            source_type="sales_credit_note",
            source_id=str(credit_note.id),
        )

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.POSTED,
        )
        self.assertEqual(
            sales_return.status,
            SalesReturnStatus.POSTED,
        )
        self.assertEqual(
            credit_note.posted_by,
            self.user,
        )
        self.assertEqual(
            sales_return.posted_by,
            self.user,
        )

        self.assertEqual(
            entry.status,
            JournalEntryStatus.POSTED,
        )
        self.assertEqual(
            entry.posting_source,
            PostingSource.SALES_CREDIT_NOTE,
        )
        self.assertEqual(
            entry.total_debit,
            credit_note.total_amount,
        )
        self.assertEqual(
            entry.total_credit,
            credit_note.total_amount,
        )
        self.assertTrue(entry.is_balanced)

    def test_credit_note_entry_has_correct_directions(
        self,
    ):
        credit_note = self._create_issued_credit_note()

        post_sales_credit_note(
            company=self.company,
            credit_note=credit_note,
            user=self.user,
        )

        entry = JournalEntry.objects.get(
            company=self.company,
            source_type="sales_credit_note",
            source_id=str(credit_note.id),
        )

        revenue_line = entry.lines.get(
            account__purpose=(
                AccountingAccountPurpose.SALES_REVENUE
            )
        )
        vat_line = entry.lines.get(
            account__purpose=(
                AccountingAccountPurpose.OUTPUT_VAT
            )
        )
        receivable_line = entry.lines.get(
            account__purpose=(
                AccountingAccountPurpose.ACCOUNTS_RECEIVABLE
            )
        )

        self.assertEqual(
            revenue_line.debit_amount,
            Decimal("90.00"),
        )
        self.assertEqual(
            revenue_line.credit_amount,
            Decimal("0.00"),
        )

        self.assertEqual(
            vat_line.debit_amount,
            Decimal("13.50"),
        )
        self.assertEqual(
            vat_line.credit_amount,
            Decimal("0.00"),
        )

        self.assertEqual(
            receivable_line.debit_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            receivable_line.credit_amount,
            Decimal("103.50"),
        )

    def test_accounting_posting_prevents_duplicate_entry(
        self,
    ):
        credit_note = self._create_issued_credit_note()

        first_entry = post_sales_credit_note_to_accounting(
            credit_note,
            actor=self.user,
            auto_post=True,
        )

        second_entry = post_sales_credit_note_to_accounting(
            credit_note,
            actor=self.user,
            auto_post=True,
        )

        self.assertEqual(
            first_entry.id,
            second_entry.id,
        )
        self.assertEqual(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="sales_credit_note",
                source_id=str(credit_note.id),
            ).count(),
            1,
        )

    def test_post_credit_note_rejects_draft_document(
        self,
    ):
        issued_credit_note = (
            self._create_issued_credit_note()
        )

        draft_return = (
            issued_credit_note.sales_return
        )

        SalesCreditNote.objects.filter(
            pk=issued_credit_note.pk
        ).update(
            status=SalesCreditNoteStatus.DRAFT,
            issued_at=None,
            issued_by=None,
        )

        issued_credit_note.refresh_from_db()

        with self.assertRaises(ValidationError):
            post_sales_credit_note(
                company=self.company,
                credit_note=issued_credit_note,
                user=self.user,
            )

        draft_return.refresh_from_db()

        self.assertEqual(
            draft_return.status,
            SalesReturnStatus.CONFIRMED,
        )
        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="sales_credit_note",
                source_id=str(issued_credit_note.id),
            ).exists()
        )

    def test_post_credit_note_api_posts_document(
        self,
    ):
        credit_note = self._create_issued_credit_note()

        response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{credit_note.id}/post/"
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content,
        )

        payload = response.json()
        credit_note.refresh_from_db()
        credit_note.sales_return.refresh_from_db()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["credit_note"]["status"],
            SalesCreditNoteStatus.POSTED,
        )
        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.POSTED,
        )
        self.assertEqual(
            credit_note.sales_return.status,
            SalesReturnStatus.POSTED,
        )
        self.assertEqual(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="sales_credit_note",
                source_id=str(credit_note.id),
            ).count(),
            1,
        )

    def test_viewer_cannot_post_credit_note(
        self,
    ):
        credit_note = self._create_issued_credit_note()

        self.client.force_login(
            self.viewer_user
        )

        response = self.client.post(
            "/api/company/sales/credit-notes/"
            f"{credit_note.id}/post/"
        )

        self.assertEqual(
            response.status_code,
            403,
            response.content,
        )

        credit_note.refresh_from_db()
        credit_note.sales_return.refresh_from_db()

        self.assertEqual(
            credit_note.status,
            SalesCreditNoteStatus.ISSUED,
        )
        self.assertEqual(
            credit_note.sales_return.status,
            SalesReturnStatus.CONFIRMED,
        )
        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="sales_credit_note",
                source_id=str(credit_note.id),
            ).exists()
        )


# End Phase 21.5.4 - Credit Note Accounting Posting Tests
# ============================================================


# ============================================================
# Phase 21.6.6 - Customer Credit Services and APIs Tests
# ============================================================


class CustomerCreditAllocationTests(SalesTestCase):
    """
    Service, balance, allocation, reversal, API, permission,
    and tenant-isolation tests for customer credit.
    """

    def _create_issued_invoice(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        quantity="2",
        discount_amount="0.00",
    ) -> SalesInvoice:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        invoice = create_sales_invoice(
            company=selected_company,
            user=selected_user,
            customer_id=selected_customer.id,
            items=[
                {
                    "catalog_item_id": selected_item.id,
                    "quantity": quantity,
                    "discount_amount": discount_amount,
                }
            ],
        )

        return issue_sales_invoice(
            company=selected_company,
            invoice=invoice,
            user=selected_user,
        )

    def _create_posted_credit_note(
        self,
        *,
        company=None,
        user=None,
        customer=None,
        catalog_item=None,
        invoice_quantity="2",
        return_quantity="1",
    ) -> SalesCreditNote:
        selected_company = company or self.company
        selected_user = user or self.user
        selected_customer = customer or self.customer
        selected_item = catalog_item or self.item

        source_invoice = self._create_issued_invoice(
            company=selected_company,
            user=selected_user,
            customer=selected_customer,
            catalog_item=selected_item,
            quantity=invoice_quantity,
        )

        sales_return = create_sales_return(
            company=selected_company,
            invoice=source_invoice,
            user=selected_user,
            items=[
                {
                    "invoice_item_id":
                        source_invoice.items.get().id,
                    "quantity": return_quantity,
                }
            ],
        )

        sales_return = confirm_sales_return(
            company=selected_company,
            sales_return=sales_return,
            user=selected_user,
        )

        credit_note = create_sales_credit_note_from_return(
            company=selected_company,
            sales_return=sales_return,
            user=selected_user,
            issue_now=True,
        )

        return post_sales_credit_note(
            company=selected_company,
            credit_note=credit_note,
            user=selected_user,
        )

    def test_posted_credit_note_creates_customer_balance(
        self,
    ):
        credit_note = self._create_posted_credit_note()

        balance = CustomerCreditBalance.objects.get(
            company=self.company,
            customer=self.customer,
            currency_code="SAR",
        )

        self.assertEqual(
            balance.total_credit,
            credit_note.total_amount,
        )
        self.assertEqual(
            balance.allocated_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            balance.available_amount,
            credit_note.total_amount,
        )

    def test_partial_credit_allocation_updates_documents(
        self,
    ):
        credit_note = self._create_posted_credit_note()

        target_invoice = self._create_issued_invoice(
            quantity="2",
        )

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount="50.00",
            user=self.user,
        )

        credit_note.refresh_from_db()
        target_invoice.refresh_from_db()

        balance = CustomerCreditBalance.objects.get(
            company=self.company,
            customer=self.customer,
            currency_code="SAR",
        )

        self.assertEqual(
            allocation.status,
            CustomerCreditAllocationStatus.ACTIVE,
        )
        self.assertEqual(
            allocation.amount,
            Decimal("50.00"),
        )
        self.assertEqual(
            credit_note.allocated_amount,
            Decimal("50.00"),
        )
        self.assertEqual(
            credit_note.available_amount,
            Decimal("65.00"),
        )
        self.assertEqual(
            target_invoice.paid_amount,
            Decimal("50.00"),
        )
        self.assertEqual(
            target_invoice.balance_due,
            Decimal("180.00"),
        )
        self.assertEqual(
            target_invoice.payment_status,
            SalesInvoicePaymentStatus.PARTIAL,
        )
        self.assertEqual(
            balance.allocated_amount,
            Decimal("50.00"),
        )
        self.assertEqual(
            balance.available_amount,
            Decimal("65.00"),
        )

    def test_full_invoice_allocation_marks_invoice_paid(
        self,
    ):
        credit_note = self._create_posted_credit_note(
            invoice_quantity="2",
            return_quantity="1",
        )

        target_invoice = self._create_issued_invoice(
            quantity="1",
        )

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount=target_invoice.balance_due,
            user=self.user,
        )

        allocation.refresh_from_db()
        target_invoice.refresh_from_db()
        credit_note.refresh_from_db()

        self.assertEqual(
            allocation.amount,
            Decimal("115.00"),
        )
        self.assertEqual(
            target_invoice.paid_amount,
            Decimal("115.00"),
        )
        self.assertEqual(
            target_invoice.balance_due,
            Decimal("0.00"),
        )
        self.assertEqual(
            target_invoice.payment_status,
            SalesInvoicePaymentStatus.PAID,
        )
        self.assertEqual(
            credit_note.available_amount,
            Decimal("0.00"),
        )
        self.assertTrue(
            credit_note.is_fully_allocated
        )

    def test_allocation_rejects_amount_over_credit(
        self,
    ):
        credit_note = self._create_posted_credit_note()

        target_invoice = self._create_issued_invoice(
            quantity="2",
        )

        with self.assertRaises(ValidationError):
            allocate_customer_credit(
                company=self.company,
                credit_note=credit_note,
                invoice=target_invoice,
                amount="116.00",
                user=self.user,
            )

        self.assertFalse(
            CustomerCreditAllocation.objects.exists()
        )

    def test_allocation_rejects_amount_over_invoice_balance(
        self,
    ):
        credit_note = self._create_posted_credit_note(
            invoice_quantity="4",
            return_quantity="2",
        )

        target_invoice = self._create_issued_invoice(
            quantity="1",
        )

        with self.assertRaises(ValidationError):
            allocate_customer_credit(
                company=self.company,
                credit_note=credit_note,
                invoice=target_invoice,
                amount="116.00",
                user=self.user,
            )

    def test_allocation_rejects_cross_company_invoice(
        self,
    ):
        credit_note = self._create_posted_credit_note()

        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
        )

        with self.assertRaises(ValidationError):
            allocate_customer_credit(
                company=self.company,
                credit_note=credit_note,
                invoice=other_invoice,
                amount="50.00",
                user=self.user,
            )

    def test_reverse_allocation_restores_credit_and_invoice(
        self,
    ):
        credit_note = self._create_posted_credit_note()

        target_invoice = self._create_issued_invoice(
            quantity="2",
        )

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount="50.00",
            user=self.user,
        )

        allocation = reverse_customer_credit_allocation(
            company=self.company,
            allocation=allocation,
            reason="Allocation entered by mistake",
            user=self.user,
        )

        credit_note.refresh_from_db()
        target_invoice.refresh_from_db()

        balance = CustomerCreditBalance.objects.get(
            company=self.company,
            customer=self.customer,
            currency_code="SAR",
        )

        self.assertEqual(
            allocation.status,
            CustomerCreditAllocationStatus.REVERSED,
        )
        self.assertEqual(
            allocation.reversal_reason,
            "Allocation entered by mistake",
        )
        self.assertEqual(
            allocation.reversed_by,
            self.user,
        )
        self.assertIsNotNone(
            allocation.reversed_at
        )
        self.assertEqual(
            credit_note.allocated_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            credit_note.available_amount,
            Decimal("115.00"),
        )
        self.assertEqual(
            target_invoice.paid_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            target_invoice.balance_due,
            Decimal("230.00"),
        )
        self.assertEqual(
            target_invoice.payment_status,
            SalesInvoicePaymentStatus.UNPAID,
        )
        self.assertEqual(
            balance.allocated_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            balance.available_amount,
            Decimal("115.00"),
        )

    def test_reversed_allocation_cannot_be_reversed_twice(
        self,
    ):
        credit_note = self._create_posted_credit_note()
        target_invoice = self._create_issued_invoice()

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount="50.00",
            user=self.user,
        )

        reverse_customer_credit_allocation(
            company=self.company,
            allocation=allocation,
            reason="First reversal",
            user=self.user,
        )

        allocation.refresh_from_db()

        with self.assertRaises(ValidationError):
            reverse_customer_credit_allocation(
                company=self.company,
                allocation=allocation,
                reason="Second reversal",
                user=self.user,
            )

    def test_credit_balance_and_allocation_serializers(
        self,
    ):
        credit_note = self._create_posted_credit_note()
        target_invoice = self._create_issued_invoice()

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount="50.00",
            user=self.user,
        )

        balance = refresh_customer_credit_balance(
            company=self.company,
            customer=self.customer,
            currency_code="SAR",
        )

        balance_data = serialize_customer_credit_balance(
            balance
        )
        allocation_data = (
            serialize_customer_credit_allocation(
                allocation
            )
        )

        self.assertEqual(
            balance_data["available_amount"],
            "65.00",
        )
        self.assertEqual(
            allocation_data["amount"],
            "50.00",
        )
        self.assertEqual(
            allocation_data["status"],
            CustomerCreditAllocationStatus.ACTIVE,
        )
        self.assertEqual(
            allocation_data["invoice"]["paid_amount"],
            "50.00",
        )

    def test_allocate_api_and_reverse_api(
        self,
    ):
        credit_note = self._create_posted_credit_note()
        target_invoice = self._create_issued_invoice()

        allocate_response = self.client.post(
            "/api/company/sales/customer-credits/allocate/",
            data={
                "credit_note_id": credit_note.id,
                "invoice_id": target_invoice.id,
                "amount": "50.00",
            },
            content_type="application/json",
        )

        self.assertEqual(
            allocate_response.status_code,
            201,
            allocate_response.content,
        )

        allocation_id = (
            allocate_response.json()["allocation"]["id"]
        )

        reverse_response = self.client.post(
            "/api/company/sales/customer-credits/"
            f"allocations/{allocation_id}/reverse/",
            data={
                "reason": "API reversal",
            },
            content_type="application/json",
        )

        self.assertEqual(
            reverse_response.status_code,
            200,
            reverse_response.content,
        )
        self.assertEqual(
            reverse_response.json()["allocation"]["status"],
            CustomerCreditAllocationStatus.REVERSED,
        )

    def test_balances_and_allocations_apis_are_company_scoped(
        self,
    ):
        credit_note = self._create_posted_credit_note()
        target_invoice = self._create_issued_invoice()

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount="50.00",
            user=self.user,
        )

        other_credit_note = self._create_posted_credit_note(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            invoice_quantity="1",
            return_quantity="1",
        )

        other_target_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
        )

        other_allocation = allocate_customer_credit(
            company=self.other_company,
            credit_note=other_credit_note,
            invoice=other_target_invoice,
            amount="50.00",
            user=self.other_user,
        )

        balances_response = self.client.get(
            "/api/company/sales/customer-credits/balances/"
        )
        allocations_response = self.client.get(
            "/api/company/sales/customer-credits/allocations/"
        )

        self.assertEqual(
            balances_response.status_code,
            200,
            balances_response.content,
        )
        self.assertEqual(
            allocations_response.status_code,
            200,
            allocations_response.content,
        )

        balance_customer_ids = {
            item["customer"]["id"]
            for item in balances_response.json()["results"]
        }

        allocation_ids = {
            item["id"]
            for item in allocations_response.json()["results"]
        }

        self.assertIn(
            self.customer.id,
            balance_customer_ids,
        )
        self.assertNotIn(
            self.other_customer.id,
            balance_customer_ids,
        )
        self.assertIn(
            allocation.id,
            allocation_ids,
        )
        self.assertNotIn(
            other_allocation.id,
            allocation_ids,
        )

    def test_allocation_detail_blocks_cross_company_access(
        self,
    ):
        other_credit_note = self._create_posted_credit_note(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            invoice_quantity="1",
            return_quantity="1",
        )

        other_invoice = self._create_issued_invoice(
            company=self.other_company,
            user=self.other_user,
            customer=self.other_customer,
            catalog_item=self.other_item,
            quantity="1",
        )

        other_allocation = allocate_customer_credit(
            company=self.other_company,
            credit_note=other_credit_note,
            invoice=other_invoice,
            amount="50.00",
            user=self.other_user,
        )

        response = self.client.get(
            "/api/company/sales/customer-credits/"
            f"allocations/{other_allocation.id}/"
        )

        self.assertEqual(
            response.status_code,
            404,
            response.content,
        )

    def test_viewer_can_view_but_cannot_allocate_or_reverse(
        self,
    ):
        credit_note = self._create_posted_credit_note()
        target_invoice = self._create_issued_invoice()

        allocation = allocate_customer_credit(
            company=self.company,
            credit_note=credit_note,
            invoice=target_invoice,
            amount="25.00",
            user=self.user,
        )

        second_invoice = self._create_issued_invoice()

        self.client.force_login(
            self.viewer_user
        )

        balances_response = self.client.get(
            "/api/company/sales/customer-credits/balances/"
        )

        allocations_response = self.client.get(
            "/api/company/sales/customer-credits/allocations/"
        )

        allocate_response = self.client.post(
            "/api/company/sales/customer-credits/allocate/",
            data={
                "credit_note_id": credit_note.id,
                "invoice_id": second_invoice.id,
                "amount": "25.00",
            },
            content_type="application/json",
        )

        reverse_response = self.client.post(
            "/api/company/sales/customer-credits/"
            f"allocations/{allocation.id}/reverse/",
            data={
                "reason": "Not permitted",
            },
            content_type="application/json",
        )

        self.assertEqual(
            balances_response.status_code,
            200,
            balances_response.content,
        )
        self.assertEqual(
            allocations_response.status_code,
            200,
            allocations_response.content,
        )
        self.assertEqual(
            allocate_response.status_code,
            403,
            allocate_response.content,
        )
        self.assertEqual(
            reverse_response.status_code,
            403,
            reverse_response.content,
        )


# End Phase 21.6.6 - Customer Credit Services and APIs Tests
# ============================================================


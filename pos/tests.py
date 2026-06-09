# ============================================================
# 📂 pos/tests.py
# 🧠 PrimeyAcc | POS Tests V1.2
# ------------------------------------------------------------
# ✅ Phase 13.1 POS Foundation Service Tests
# ✅ Phase 13.2 POS Registers API Tests
# ✅ Phase 13.3 POS Sessions API Tests
# ✅ POS Register Creation Tests
# ✅ POS Tenant Isolation Tests
# ✅ POS Session Open / Close Tests
# ✅ Duplicate Open Session Protection
# ✅ POS Order Draft Tests
# ✅ POS Order Item Snapshot Tests
# ✅ POS Totals Calculation Tests
# ✅ POS Payment Line Tests
# ✅ POS Checkout Preview Tests
# ✅ POS Registers List / Create / Detail / Update / Status API Tests
# ✅ POS Sessions List / Open / Detail / Close / Cancel API Tests
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الاختبارات تثبت أن POS يعمل داخل شركة واحدة فقط
# - لا يتم الاعتماد على company_id من الواجهة
# - لا يسمح بخلط فروع أو مستودعات أو خزائن أو منتجات بين الشركات
# - اختبارات Phase 13.1 تغطي Models / Services foundation
# - اختبارات Phase 13.2 تغطي POS Registers APIs
# - اختبارات Phase 13.3 تغطي POS Sessions APIs فقط
# - لا يتم اختبار الترحيل المحاسبي أو خصم المخزون في هذه المرحلة
# ============================================================

from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from api.company.pos.registers.create import pos_register_create
from api.company.pos.registers.detail import pos_register_detail
from api.company.pos.registers.list import pos_registers_list
from api.company.pos.registers.status import pos_register_status
from api.company.pos.registers.update import pos_register_update
from api.company.pos.sessions.cancel import pos_session_cancel
from api.company.pos.sessions.close import pos_session_close
from api.company.pos.sessions.detail import pos_session_detail
from api.company.pos.sessions.list import pos_sessions_list
from api.company.pos.sessions.open import pos_session_open
from catalog.models import CatalogItem, CatalogItemType
from companies.models import Branch, Company
from pos.models import (
    POSOrderStatus,
    POSPaymentLineStatus,
    POSPaymentLineType,
    POSPaymentStatus,
    POSRegister,
    POSRegisterStatus,
    POSSessionStatus,
)
from pos.services import (
    add_pos_order_item,
    add_pos_payment_line,
    close_pos_session,
    create_pos_order,
    create_pos_register,
    open_pos_session,
    preview_pos_checkout,
)
from treasury.models import TreasuryAccount


class POSBaseTestMixin:
    """
    Shared setup/helpers for POS tests.
    """

    def _create_base_data(self):
        self.User = get_user_model()

        self.user = self.User.objects.create_user(
            username="pos_owner",
            email="pos_owner@example.com",
            password="test-pass-12345",
        )

        self.company = Company.objects.create(
            name="Primey POS Company",
            company_code="POS-COMP-001",
            created_by=self.user,
            owner=self.user,
        )
        self.other_company = Company.objects.create(
            name="Other POS Company",
            company_code="POS-COMP-002",
            created_by=self.user,
            owner=self.user,
        )

        self.branch = Branch.objects.create(
            company=self.company,
            name="Main Branch",
            branch_code="BR-001",
            created_by=self.user,
        )
        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Branch",
            branch_code="BR-002",
            created_by=self.user,
        )

        self.treasury_account = TreasuryAccount.objects.create(
            company=self.company,
            name="Main Cashbox",
            code="CASH-001",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance=Decimal("0.00"),
            current_balance=Decimal("0.00"),
            created_by=self.user,
        )
        self.other_treasury_account = TreasuryAccount.objects.create(
            company=self.other_company,
            name="Other Cashbox",
            code="CASH-002",
            account_type=TreasuryAccount.AccountType.CASH,
            opening_balance=Decimal("0.00"),
            current_balance=Decimal("0.00"),
            created_by=self.user,
        )

        self.payment_method = self._create_company_payment_method(
            company=self.company,
            code="CASH",
            name="Cash",
        )
        self.other_payment_method = self._create_company_payment_method(
            company=self.other_company,
            code="OTHER-CASH",
            name="Other Cash",
        )

        self.catalog_item = CatalogItem.objects.create(
            company=self.company,
            item_type=CatalogItemType.PRODUCT,
            code="ITEM-001",
            sku="SKU-001",
            barcode="628000000001",
            name="POS Test Item",
            sale_price=Decimal("100.00"),
            purchase_price=Decimal("50.00"),
            cost_price=Decimal("50.00"),
            is_sellable=True,
            is_purchasable=True,
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
        )

    def _create_company_payment_method(self, *, company, code: str, name: str):
        """
        Create CompanyPaymentMethod safely even if Phase 12 model has extra optional fields.

        This helper keeps POS tests focused on POS behavior and avoids hard-coding
        unnecessary payment model details.
        """

        CompanyPaymentMethod = apps.get_model("payments", "CompanyPaymentMethod")

        data = {}

        for field in CompanyPaymentMethod._meta.fields:
            if field.name == "id":
                continue

            if field.name == "company":
                data[field.name] = company
                continue

            if field.name == "code":
                data[field.name] = code
                continue

            if field.name == "name":
                data[field.name] = name
                continue

            if field.name == "name_ar":
                data[field.name] = name
                continue

            if field.name == "name_en":
                data[field.name] = name
                continue

            if field.name == "description":
                data[field.name] = ""
                continue

            if field.name == "notes":
                data[field.name] = ""
                continue

            if field.name == "created_by":
                data[field.name] = self.user
                continue

            if field.name == "updated_by":
                data[field.name] = self.user
                continue

            if field.name == "is_active":
                data[field.name] = True
                continue

            if field.name == "is_default":
                data[field.name] = True
                continue

            if field.name == "sort_order":
                data[field.name] = 0
                continue

            if field.name == "extra_data":
                data[field.name] = {}
                continue

            if field.name == "settings_data":
                data[field.name] = {}
                continue

            if field.has_default():
                continue

            if field.blank or field.null:
                continue

            if field.choices:
                data[field.name] = field.choices[0][0]
                continue

            internal_type = field.get_internal_type()

            if internal_type in ["CharField", "TextField", "SlugField"]:
                data[field.name] = f"{field.name}-{code}"
            elif internal_type in ["DecimalField", "FloatField"]:
                data[field.name] = Decimal("0.00")
            elif internal_type in [
                "IntegerField",
                "PositiveIntegerField",
                "PositiveSmallIntegerField",
            ]:
                data[field.name] = 0
            elif internal_type == "BooleanField":
                data[field.name] = False

        payment_method = CompanyPaymentMethod(**data)
        payment_method.full_clean()
        payment_method.save()

        return payment_method


class POSFoundationTests(POSBaseTestMixin, TestCase):
    """
    Phase 13.1 POS foundation service tests.
    """

    def setUp(self):
        self._create_base_data()

    def test_create_pos_register_success(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            default_payment_method=self.payment_method,
            user=self.user,
        )

        self.assertEqual(register.company, self.company)
        self.assertEqual(register.branch, self.branch)
        self.assertEqual(register.treasury_account, self.treasury_account)
        self.assertEqual(register.status, POSRegisterStatus.ACTIVE)
        self.assertTrue(register.is_active)
        self.assertTrue(register.code.startswith("POS-R-"))

    def test_create_pos_register_rejects_other_company_branch(self):
        with self.assertRaises(ValidationError):
            create_pos_register(
                company=self.company,
                branch=self.other_branch,
                name="Invalid POS Register",
                user=self.user,
            )

    def test_open_pos_session_success(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )

        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("250.00"),
            user=self.user,
        )

        self.assertEqual(session.company, self.company)
        self.assertEqual(session.register, register)
        self.assertEqual(session.status, POSSessionStatus.OPEN)
        self.assertEqual(session.opening_cash_amount, Decimal("250.00"))
        self.assertEqual(session.expected_cash_amount, Decimal("250.00"))
        self.assertTrue(session.session_number.startswith("POS-S-"))

    def test_open_pos_session_prevents_duplicate_open_session(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )

        open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            open_pos_session(
                company=self.company,
                register=register,
                opening_cash_amount=Decimal("200.00"),
                user=self.user,
            )

    def test_close_pos_session_success(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        closed_session = close_pos_session(
            company=self.company,
            session=session,
            closing_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        self.assertEqual(closed_session.status, POSSessionStatus.CLOSED)
        self.assertEqual(closed_session.expected_cash_amount, Decimal("100.00"))
        self.assertEqual(closed_session.difference_amount, Decimal("0.00"))
        self.assertIsNotNone(closed_session.closed_at)

    def test_create_pos_order_requires_open_session(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("0.00"),
            user=self.user,
        )
        close_pos_session(
            company=self.company,
            session=session,
            closing_cash_amount=Decimal("0.00"),
            user=self.user,
        )
        session.refresh_from_db()

        with self.assertRaises(ValidationError):
            create_pos_order(
                company=self.company,
                session=session,
                user=self.user,
            )

    def test_create_pos_order_success(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("0.00"),
            user=self.user,
        )

        order = create_pos_order(
            company=self.company,
            session=session,
            user=self.user,
        )

        self.assertEqual(order.company, self.company)
        self.assertEqual(order.session, session)
        self.assertEqual(order.register, register)
        self.assertEqual(order.status, POSOrderStatus.DRAFT)
        self.assertEqual(order.payment_status, POSPaymentStatus.UNPAID)
        self.assertTrue(order.order_number.startswith("POS-O-"))

    def test_add_pos_order_item_success_and_recalculate_totals(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("0.00"),
            user=self.user,
        )
        order = create_pos_order(
            company=self.company,
            session=session,
            user=self.user,
        )

        item = add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("2"),
            unit_price=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
        )

        order.refresh_from_db()

        self.assertEqual(item.item_code, self.catalog_item.code)
        self.assertEqual(item.item_sku, self.catalog_item.sku)
        self.assertEqual(item.item_barcode, self.catalog_item.barcode)
        self.assertEqual(item.item_name, self.catalog_item.name)
        self.assertEqual(item.quantity, Decimal("2.0000"))
        self.assertEqual(item.taxable_amount, Decimal("190.00"))
        self.assertEqual(item.tax_amount, Decimal("28.50"))
        self.assertEqual(item.line_total, Decimal("218.50"))

        self.assertEqual(order.taxable_amount, Decimal("190.00"))
        self.assertEqual(order.tax_amount, Decimal("28.50"))
        self.assertEqual(order.total_amount, Decimal("218.50"))

    def test_add_pos_order_item_rejects_other_company_item(self):
        other_item = CatalogItem.objects.create(
            company=self.other_company,
            item_type=CatalogItemType.PRODUCT,
            code="OTHER-ITEM",
            name="Other Item",
            sale_price=Decimal("100.00"),
            is_sellable=True,
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
        )

        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("0.00"),
            user=self.user,
        )
        order = create_pos_order(
            company=self.company,
            session=session,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            add_pos_order_item(
                company=self.company,
                order=order,
                catalog_item=other_item,
                quantity=Decimal("1"),
            )

    def test_add_pos_payment_line_confirmed_updates_payment_status(self):
        register = create_pos_register(
            company=self.company,
            branch=self.branch,
            name="Main POS Register",
            treasury_account=self.treasury_account,
            user=self.user,
        )
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("0.00"),
            user=self.user,
        )
        order = create_pos_order(
            company=self.company,
            session=session,
            user=self.user,
        )

        add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        payment = add_pos_payment_line(
            company=self.company,
            order=order,
            payment_method=self.payment_method,
            amount=Decimal("115.00"),
            payment_type=POSPaymentLineType.CASH,
            treasury_account=self.treasury_account,
            confirm_now=True,
            user=self.user,
        )

        order.refresh_from_db()

        self.assertEqual(payment.status, POSPaymentLineStatus.CONFIRMED)
        self.assertEqual(order.paid_amount, Decimal("115.00"))
        self.assertEqual(order.payment_status, POSPaymentStatus.PAID)
        self.assertEqual(order.change_amount, Decimal("0.00"))

    def test_preview_pos_checkout_success(self):
        preview = preview_pos_checkout(
            company=self.company,
            lines=[
                {
                    "catalog_item": self.catalog_item,
                    "quantity": Decimal("2"),
                    "unit_price": Decimal("100.00"),
                    "discount_amount": Decimal("10.00"),
                }
            ],
        )

        self.assertEqual(len(preview["lines"]), 1)
        self.assertEqual(preview["taxable_amount"], Decimal("190.00"))
        self.assertEqual(preview["tax_amount"], Decimal("28.50"))
        self.assertEqual(preview["total_amount"], Decimal("218.50"))

    def test_preview_pos_checkout_rejects_empty_lines(self):
        with self.assertRaises(ValidationError):
            preview_pos_checkout(
                company=self.company,
                lines=[],
            )


class POSRegistersAPITests(POSBaseTestMixin, TestCase):
    """
    Phase 13.2 POS registers API tests.
    """

    def setUp(self):
        self._create_base_data()
        self.factory = APIRequestFactory()

    def _authenticated_request(self, method: str, path: str, data=None):
        """
        Build authenticated request with company context.
        """
        method = method.lower()

        if method == "get":
            request = self.factory.get(path, data=data or {})
        elif method == "post":
            request = self.factory.post(path, data=data or {}, format="json")
        elif method == "patch":
            request = self.factory.patch(path, data=data or {}, format="json")
        else:
            raise AssertionError(f"Unsupported method: {method}")

        request.company = self.company
        force_authenticate(request, user=self.user)

        return request

    def _call_with_permissions(self, view, request, *args, **kwargs):
        """
        Call API view while keeping this test focused on POS endpoint behavior.

        Company permission behavior is already covered by permissions/company tests.
        """
        with patch(
            "api.permissions.HasAnyCompanyPermission.has_permission",
            return_value=True,
        ):
            return view(request, *args, **kwargs)

    def _create_register_for_api(self, *, name="Main API Register", code="API-POS-001"):
        return create_pos_register(
            company=self.company,
            branch=self.branch,
            name=name,
            code=code,
            treasury_account=self.treasury_account,
            default_payment_method=self.payment_method,
            user=self.user,
        )

    def test_pos_registers_list_api_returns_company_registers_only(self):
        register = self._create_register_for_api()

        POSRegister.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            treasury_account=self.other_treasury_account,
            default_payment_method=self.other_payment_method,
            name="Other Company Register",
            code="OTHER-POS-001",
            status=POSRegisterStatus.ACTIVE,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        request = self._authenticated_request(
            "get",
            "/api/company/pos/registers/",
        )
        response = self._call_with_permissions(pos_registers_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["id"], register.id)
        self.assertEqual(response.data["items"][0]["code"], register.code)

    def test_pos_registers_list_api_supports_search_filter(self):
        self._create_register_for_api(
            name="Front Cashier",
            code="FRONT-001",
        )
        self._create_register_for_api(
            name="Back Cashier",
            code="BACK-001",
        )

        request = self._authenticated_request(
            "get",
            "/api/company/pos/registers/",
            data={"search": "FRONT"},
        )
        response = self._call_with_permissions(pos_registers_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["code"], "FRONT-001")

    def test_pos_register_create_api_success(self):
        request = self._authenticated_request(
            "post",
            "/api/company/pos/registers/create/",
            data={
                "branch_id": self.branch.id,
                "treasury_account_id": self.treasury_account.id,
                "default_payment_method_id": self.payment_method.id,
                "name": "Created From API",
                "code": "API-CREATE-001",
                "receipt_header": "Welcome",
                "receipt_footer": "Thank you",
                "notes": "Created by test",
            },
        )
        response = self._call_with_permissions(pos_register_create, request)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["code"], "API-CREATE-001")
        self.assertEqual(response.data["item"]["branch"]["id"], self.branch.id)
        self.assertEqual(
            response.data["item"]["treasury_account"]["id"],
            self.treasury_account.id,
        )

    def test_pos_register_create_api_rejects_other_company_branch(self):
        request = self._authenticated_request(
            "post",
            "/api/company/pos/registers/create/",
            data={
                "branch_id": self.other_branch.id,
                "name": "Invalid API Register",
                "code": "INVALID-001",
            },
        )
        response = self._call_with_permissions(pos_register_create, request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_register_detail_api_success(self):
        register = self._create_register_for_api()

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/registers/{register.id}/",
        )
        response = self._call_with_permissions(
            pos_register_detail,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["id"], register.id)
        self.assertEqual(response.data["item"]["code"], register.code)

    def test_pos_register_detail_api_hides_other_company_register(self):
        other_register = POSRegister.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            treasury_account=self.other_treasury_account,
            default_payment_method=self.other_payment_method,
            name="Hidden Register",
            code="HIDDEN-001",
            status=POSRegisterStatus.ACTIVE,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/registers/{other_register.id}/",
        )
        response = self._call_with_permissions(
            pos_register_detail,
            request,
            register_id=other_register.id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_register_update_api_success(self):
        register = self._create_register_for_api()

        request = self._authenticated_request(
            "patch",
            f"/api/company/pos/registers/{register.id}/update/",
            data={
                "name": "Updated Register",
                "receipt_header": "Updated Header",
                "notes": "Updated notes",
            },
        )
        response = self._call_with_permissions(
            pos_register_update,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["name"], "Updated Register")
        self.assertEqual(response.data["item"]["receipt_header"], "Updated Header")

    def test_pos_register_update_api_rejects_other_company_treasury_account(self):
        register = self._create_register_for_api()

        request = self._authenticated_request(
            "patch",
            f"/api/company/pos/registers/{register.id}/update/",
            data={
                "treasury_account_id": self.other_treasury_account.id,
            },
        )
        response = self._call_with_permissions(
            pos_register_update,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_register_status_api_deactivate_success(self):
        register = self._create_register_for_api()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/registers/{register.id}/status/",
            data={"action": "deactivate"},
        )
        response = self._call_with_permissions(
            pos_register_status,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSRegisterStatus.INACTIVE)
        self.assertFalse(response.data["item"]["is_active"])

    def test_pos_register_status_api_prevents_deactivate_with_open_session(self):
        register = self._create_register_for_api()
        open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("0.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/registers/{register.id}/status/",
            data={"action": "deactivate"},
        )
        response = self._call_with_permissions(
            pos_register_status,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_register_status_api_maintenance_success(self):
        register = self._create_register_for_api()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/registers/{register.id}/status/",
            data={"action": "maintenance"},
        )
        response = self._call_with_permissions(
            pos_register_status,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSRegisterStatus.MAINTENANCE)
        self.assertFalse(response.data["item"]["is_active"])

    def test_pos_register_status_api_activate_success(self):
        register = self._create_register_for_api()
        register.deactivate(user=self.user)
        register.refresh_from_db()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/registers/{register.id}/status/",
            data={"action": "activate"},
        )
        response = self._call_with_permissions(
            pos_register_status,
            request,
            register_id=register.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSRegisterStatus.ACTIVE)
        self.assertTrue(response.data["item"]["is_active"])


class POSSessionsAPITests(POSBaseTestMixin, TestCase):
    """
    Phase 13.3 POS sessions API tests.
    """

    def setUp(self):
        self._create_base_data()
        self.factory = APIRequestFactory()

    def _authenticated_request(self, method: str, path: str, data=None):
        """
        Build authenticated request with company context.
        """
        method = method.lower()

        if method == "get":
            request = self.factory.get(path, data=data or {})
        elif method == "post":
            request = self.factory.post(path, data=data or {}, format="json")
        elif method == "patch":
            request = self.factory.patch(path, data=data or {}, format="json")
        else:
            raise AssertionError(f"Unsupported method: {method}")

        request.company = self.company
        force_authenticate(request, user=self.user)

        return request

    def _call_with_permissions(self, view, request, *args, **kwargs):
        """
        Call API view while keeping this test focused on POS endpoint behavior.

        Company permission behavior is already covered by permissions/company tests.
        """
        with patch(
            "api.permissions.HasAnyCompanyPermission.has_permission",
            return_value=True,
        ):
            return view(request, *args, **kwargs)

    def _create_register_for_api(self, *, name="Main Session Register", code="API-SESSION-POS-001"):
        return create_pos_register(
            company=self.company,
            branch=self.branch,
            name=name,
            code=code,
            treasury_account=self.treasury_account,
            default_payment_method=self.payment_method,
            user=self.user,
        )

    def _create_other_company_register_for_api(self):
        register = POSRegister.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            treasury_account=self.other_treasury_account,
            default_payment_method=self.other_payment_method,
            name="Other Session Register",
            code="OTHER-SESSION-POS-001",
            status=POSRegisterStatus.ACTIVE,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )
        register.full_clean()
        return register

    def _open_session_for_api(
        self,
        *,
        register=None,
        opening_cash_amount=Decimal("100.00"),
    ):
        if register is None:
            register = self._create_register_for_api()

        return open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=opening_cash_amount,
            user=self.user,
        )

    def test_pos_sessions_list_api_returns_company_sessions_only(self):
        register = self._create_register_for_api()
        session = open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        other_register = self._create_other_company_register_for_api()
        open_pos_session(
            company=self.other_company,
            register=other_register,
            opening_cash_amount=Decimal("200.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "get",
            "/api/company/pos/sessions/",
        )
        response = self._call_with_permissions(pos_sessions_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["id"], session.id)
        self.assertEqual(
            response.data["items"][0]["session_number"],
            session.session_number,
        )

    def test_pos_sessions_list_api_supports_search_filter(self):
        front_register = self._create_register_for_api(
            name="Front Session Register",
            code="FRONT-SESSION-POS",
        )
        back_register = self._create_register_for_api(
            name="Back Session Register",
            code="BACK-SESSION-POS",
        )

        open_pos_session(
            company=self.company,
            register=front_register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )
        open_pos_session(
            company=self.company,
            register=back_register,
            opening_cash_amount=Decimal("200.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "get",
            "/api/company/pos/sessions/",
            data={"search": "FRONT"},
        )
        response = self._call_with_permissions(pos_sessions_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["items"][0]["register"]["code"],
            "FRONT-SESSION-POS",
        )

    def test_pos_sessions_list_api_supports_status_filter(self):
        register = self._create_register_for_api()
        open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        closed_register = self._create_register_for_api(
            name="Closed Session Register",
            code="CLOSED-SESSION-POS",
        )
        closed_session = open_pos_session(
            company=self.company,
            register=closed_register,
            opening_cash_amount=Decimal("50.00"),
            user=self.user,
        )
        close_pos_session(
            company=self.company,
            session=closed_session,
            closing_cash_amount=Decimal("50.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "get",
            "/api/company/pos/sessions/",
            data={"status": POSSessionStatus.OPEN},
        )
        response = self._call_with_permissions(pos_sessions_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["status"], POSSessionStatus.OPEN)

    def test_pos_session_open_api_success(self):
        register = self._create_register_for_api()

        request = self._authenticated_request(
            "post",
            "/api/company/pos/sessions/open/",
            data={
                "register_id": register.id,
                "opening_cash_amount": "125.00",
                "opening_notes": "Opened by API test",
            },
        )
        response = self._call_with_permissions(pos_session_open, request)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSSessionStatus.OPEN)
        self.assertEqual(response.data["item"]["register"]["id"], register.id)
        self.assertEqual(response.data["item"]["opening_cash_amount"], "125.00")

    def test_pos_session_open_api_prevents_duplicate_open_session(self):
        register = self._create_register_for_api()

        open_pos_session(
            company=self.company,
            register=register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "post",
            "/api/company/pos/sessions/open/",
            data={
                "register_id": register.id,
                "opening_cash_amount": "200.00",
            },
        )
        response = self._call_with_permissions(pos_session_open, request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_session_detail_api_success(self):
        session = self._open_session_for_api()

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/sessions/{session.id}/",
        )
        response = self._call_with_permissions(
            pos_session_detail,
            request,
            session_id=session.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["id"], session.id)
        self.assertEqual(
            response.data["item"]["session_number"],
            session.session_number,
        )

    def test_pos_session_detail_api_hides_other_company_session(self):
        other_register = self._create_other_company_register_for_api()
        other_session = open_pos_session(
            company=self.other_company,
            register=other_register,
            opening_cash_amount=Decimal("200.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/sessions/{other_session.id}/",
        )
        response = self._call_with_permissions(
            pos_session_detail,
            request,
            session_id=other_session.id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_session_close_api_success(self):
        session = self._open_session_for_api(opening_cash_amount=Decimal("100.00"))

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/sessions/{session.id}/close/",
            data={
                "closing_cash_amount": "100.00",
                "closing_notes": "Closed by API test",
            },
        )
        response = self._call_with_permissions(
            pos_session_close,
            request,
            session_id=session.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSSessionStatus.CLOSED)
        self.assertEqual(response.data["item"]["closing_cash_amount"], "100.00")
        self.assertEqual(response.data["item"]["difference_amount"], "0.00")

    def test_pos_session_close_api_rejects_already_closed_session(self):
        session = self._open_session_for_api(opening_cash_amount=Decimal("100.00"))
        close_pos_session(
            company=self.company,
            session=session,
            closing_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/sessions/{session.id}/close/",
            data={
                "closing_cash_amount": "100.00",
            },
        )
        response = self._call_with_permissions(
            pos_session_close,
            request,
            session_id=session.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_session_cancel_api_success(self):
        session = self._open_session_for_api(opening_cash_amount=Decimal("0.00"))

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/sessions/{session.id}/cancel/",
            data={
                "cancellation_reason": "Cancelled by API test",
            },
        )
        response = self._call_with_permissions(
            pos_session_cancel,
            request,
            session_id=session.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSSessionStatus.CANCELLED)

    def test_pos_session_cancel_api_rejects_closed_session(self):
        session = self._open_session_for_api(opening_cash_amount=Decimal("100.00"))
        close_pos_session(
            company=self.company,
            session=session,
            closing_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/sessions/{session.id}/cancel/",
            data={
                "cancellation_reason": "Should fail",
            },
        )
        response = self._call_with_permissions(
            pos_session_cancel,
            request,
            session_id=session.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])
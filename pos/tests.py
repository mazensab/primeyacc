# ============================================================
# ًں“‚ pos/tests.py
# ًں§  PrimeyAcc | POS Tests V1.3
# ------------------------------------------------------------
# âœ… Phase 13.1 POS Foundation Service Tests
# âœ… Phase 13.2 POS Registers API Tests
# âœ… Phase 13.3 POS Sessions API Tests
# âœ… Phase 13.4 POS Orders / Checkout API Tests
# âœ… POS Register Creation Tests
# âœ… POS Tenant Isolation Tests
# âœ… POS Session Open / Close Tests
# âœ… Duplicate Open Session Protection
# âœ… POS Order Draft Tests
# âœ… POS Order Item Snapshot Tests
# âœ… POS Totals Calculation Tests
# âœ… POS Payment Line Tests
# âœ… POS Checkout Preview Tests
# âœ… POS Registers List / Create / Detail / Update / Status API Tests
# âœ… POS Sessions List / Open / Detail / Close / Cancel API Tests
# âœ… POS Orders List / Create / Detail / Items / Payments / Preview / Cancel API Tests
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ طھط«ط¨طھ ط£ظ† POS ظٹط¹ظ…ظ„ ط¯ط§ط®ظ„ ط´ط±ظƒط© ظˆط§ط­ط¯ط© ظپظ‚ط·
# - ظ„ط§ ظٹطھظ… ط§ظ„ط§ط¹طھظ…ط§ط¯ ط¹ظ„ظ‰ company_id ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط©
# - ظ„ط§ ظٹط³ظ…ط­ ط¨ط®ظ„ط· ظپط±ظˆط¹ ط£ظˆ ظ…ط³طھظˆط¯ط¹ط§طھ ط£ظˆ ط®ط²ط§ط¦ظ† ط£ظˆ ظ…ظ†طھط¬ط§طھ ط¨ظٹظ† ط§ظ„ط´ط±ظƒط§طھ
# - ط§ط®طھط¨ط§ط±ط§طھ Phase 13.1 طھط؛ط·ظٹ Models / Services foundation
# - ط§ط®طھط¨ط§ط±ط§طھ Phase 13.2 طھط؛ط·ظٹ POS Registers APIs
# - ط§ط®طھط¨ط§ط±ط§طھ Phase 13.3 طھط؛ط·ظٹ POS Sessions APIs ظپظ‚ط·
# - ط§ط®طھط¨ط§ط±ط§طھ Phase 13.4 طھط؛ط·ظٹ POS Orders / Checkout APIs ظپظ‚ط·
# - ظ„ط§ ظٹطھظ… ط§ط®طھط¨ط§ط± ط§ظ„طھط±ط­ظٹظ„ ط§ظ„ظ…ط­ط§ط³ط¨ظٹ ط£ظˆ ط®طµظ… ط§ظ„ظ…ط®ط²ظˆظ† ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظ…ط±ط­ظ„ط©
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
from api.company.pos.orders.cancel import pos_order_cancel
from api.company.pos.orders.create import pos_order_create
from api.company.pos.orders.detail import pos_order_detail
from api.company.pos.orders.finalize import pos_order_finalize
from api.company.pos.orders.items import pos_order_item_add, pos_order_items_list
from api.company.pos.orders.list import pos_orders_list
from api.company.pos.orders.payments import (
    pos_order_payment_add,
    pos_order_payments_list,
)
from api.company.pos.orders.preview import pos_order_preview
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


class POSOrdersAPITests(POSBaseTestMixin, TestCase):
    """
    Phase 13.4 POS orders / checkout API tests.
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

    def _create_register_for_api(
        self,
        *,
        name="Main Orders Register",
        code="API-ORDERS-POS-001",
    ):
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
            name="Other Orders Register",
            code="OTHER-ORDERS-POS-001",
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

    def _create_order_for_api(self, *, session=None):
        if session is None:
            session = self._open_session_for_api()

        return create_pos_order(
            company=self.company,
            session=session,
            user=self.user,
        )

    def _create_other_company_order_for_api(self):
        other_register = self._create_other_company_register_for_api()
        other_session = open_pos_session(
            company=self.other_company,
            register=other_register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        return create_pos_order(
            company=self.other_company,
            session=other_session,
            user=self.user,
        )

    def test_pos_orders_list_api_returns_company_orders_only(self):
        order = self._create_order_for_api()
        self._create_other_company_order_for_api()

        request = self._authenticated_request(
            "get",
            "/api/company/pos/orders/",
        )
        response = self._call_with_permissions(pos_orders_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["id"], order.id)
        self.assertEqual(response.data["items"][0]["order_number"], order.order_number)

    def test_pos_orders_list_api_supports_status_filter(self):
        draft_order = self._create_order_for_api()

        cancelled_session = self._open_session_for_api(
            register=self._create_register_for_api(
                name="Cancelled Orders Register",
                code="API-CANCELLED-ORDERS-POS",
            )
        )
        cancelled_order = create_pos_order(
            company=self.company,
            session=cancelled_session,
            user=self.user,
        )
        cancelled_order.status = POSOrderStatus.CANCELLED
        cancelled_order.save(update_fields=["status"])

        request = self._authenticated_request(
            "get",
            "/api/company/pos/orders/",
            data={"status": POSOrderStatus.DRAFT},
        )
        response = self._call_with_permissions(pos_orders_list, request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["id"], draft_order.id)
        self.assertEqual(response.data["items"][0]["status"], POSOrderStatus.DRAFT)

    def test_pos_order_create_api_success(self):
        session = self._open_session_for_api()

        request = self._authenticated_request(
            "post",
            "/api/company/pos/orders/create/",
            data={
                "session_id": session.id,
                "notes": "Created by API test",
            },
        )
        response = self._call_with_permissions(pos_order_create, request)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["session"]["id"], session.id)
        self.assertEqual(response.data["item"]["status"], POSOrderStatus.DRAFT)
        self.assertEqual(response.data["item"]["payment_status"], POSPaymentStatus.UNPAID)

    def test_pos_order_create_api_rejects_other_company_session(self):
        other_register = self._create_other_company_register_for_api()
        other_session = open_pos_session(
            company=self.other_company,
            register=other_register,
            opening_cash_amount=Decimal("100.00"),
            user=self.user,
        )

        request = self._authenticated_request(
            "post",
            "/api/company/pos/orders/create/",
            data={
                "session_id": other_session.id,
            },
        )
        response = self._call_with_permissions(pos_order_create, request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_order_detail_api_success(self):
        order = self._create_order_for_api()

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/orders/{order.id}/",
        )
        response = self._call_with_permissions(
            pos_order_detail,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["id"], order.id)
        self.assertEqual(response.data["item"]["order_number"], order.order_number)

    def test_pos_order_detail_api_hides_other_company_order(self):
        other_order = self._create_other_company_order_for_api()

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/orders/{other_order.id}/",
        )
        response = self._call_with_permissions(
            pos_order_detail,
            request,
            order_id=other_order.id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_order_preview_api_success(self):
        request = self._authenticated_request(
            "post",
            "/api/company/pos/orders/preview/",
            data={
                "items": [
                    {
                        "catalog_item_id": self.catalog_item.id,
                        "quantity": "2",
                        "unit_price": "100.00",
                        "discount_amount": "10.00",
                    }
                ],
            },
        )
        response = self._call_with_permissions(pos_order_preview, request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["preview"]["summary"]["items_count"], 1)
        self.assertEqual(response.data["preview"]["summary"]["taxable_amount"], "190.00")
        self.assertEqual(response.data["preview"]["summary"]["tax_amount"], "28.50")
        self.assertEqual(response.data["preview"]["summary"]["total_amount"], "218.50")

    def test_pos_order_preview_api_rejects_other_company_item(self):
        other_item = CatalogItem.objects.create(
            company=self.other_company,
            item_type=CatalogItemType.PRODUCT,
            code="OTHER-PREVIEW-ITEM",
            name="Other Preview Item",
            sale_price=Decimal("100.00"),
            is_sellable=True,
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
        )

        request = self._authenticated_request(
            "post",
            "/api/company/pos/orders/preview/",
            data={
                "items": [
                    {
                        "catalog_item_id": other_item.id,
                        "quantity": "1",
                    }
                ],
            },
        )
        response = self._call_with_permissions(pos_order_preview, request)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_order_items_list_api_success(self):
        order = self._create_order_for_api()
        item = add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/orders/{order.id}/items/",
        )
        response = self._call_with_permissions(
            pos_order_items_list,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["id"], item.id)
        self.assertEqual(response.data["items"][0]["item_code"], self.catalog_item.code)

    def test_pos_order_item_add_api_success(self):
        order = self._create_order_for_api()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/items/add/",
            data={
                "catalog_item_id": self.catalog_item.id,
                "quantity": "2",
                "unit_price": "100.00",
                "discount_amount": "10.00",
            },
        )
        response = self._call_with_permissions(
            pos_order_item_add,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["item_code"], self.catalog_item.code)
        self.assertEqual(response.data["item"]["line_total"], "218.50")
        self.assertEqual(response.data["order"]["total_amount"], "218.50")

    def test_pos_order_item_add_api_rejects_other_company_item(self):
        order = self._create_order_for_api()
        other_item = CatalogItem.objects.create(
            company=self.other_company,
            item_type=CatalogItemType.PRODUCT,
            code="OTHER-ADD-ITEM",
            name="Other Add Item",
            sale_price=Decimal("100.00"),
            is_sellable=True,
            taxable=True,
            tax_rate=Decimal("15.00"),
            created_by=self.user,
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/items/add/",
            data={
                "catalog_item_id": other_item.id,
                "quantity": "1",
            },
        )
        response = self._call_with_permissions(
            pos_order_item_add,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_order_payments_list_api_success(self):
        order = self._create_order_for_api()
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

        request = self._authenticated_request(
            "get",
            f"/api/company/pos/orders/{order.id}/payments/",
        )
        response = self._call_with_permissions(
            pos_order_payments_list,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["items"][0]["id"], payment.id)
        self.assertEqual(response.data["items"][0]["amount"], "115.00")

    def test_pos_order_payment_add_api_success(self):
        order = self._create_order_for_api()
        add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/payments/add/",
            data={
                "payment_method_id": self.payment_method.id,
                "treasury_account_id": self.treasury_account.id,
                "amount": "115.00",
                "payment_type": POSPaymentLineType.CASH,
                "confirm_now": True,
                "reference": "API-PAY-001",
            },
        )
        response = self._call_with_permissions(
            pos_order_payment_add,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["amount"], "115.00")
        self.assertEqual(response.data["order"]["paid_amount"], "115.00")
        self.assertEqual(response.data["order"]["payment_status"], POSPaymentStatus.PAID)

    def test_pos_order_payment_add_api_rejects_other_company_payment_method(self):
        order = self._create_order_for_api()
        add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/payments/add/",
            data={
                "payment_method_id": self.other_payment_method.id,
                "treasury_account_id": self.treasury_account.id,
                "amount": "115.00",
                "payment_type": POSPaymentLineType.CASH,
            },
        )
        response = self._call_with_permissions(
            pos_order_payment_add,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_order_payment_add_api_rejects_other_company_treasury_account(self):
        order = self._create_order_for_api()
        add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/payments/add/",
            data={
                "payment_method_id": self.payment_method.id,
                "treasury_account_id": self.other_treasury_account.id,
                "amount": "115.00",
                "payment_type": POSPaymentLineType.CASH,
            },
        )
        response = self._call_with_permissions(
            pos_order_payment_add,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_pos_order_cancel_api_success(self):
        order = self._create_order_for_api()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/cancel/",
            data={
                "cancellation_reason": "Cancelled by API test",
            },
        )
        response = self._call_with_permissions(
            pos_order_cancel,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSOrderStatus.CANCELLED)

    def test_pos_order_cancel_api_rejects_already_cancelled_order(self):
        order = self._create_order_for_api()
        order.status = POSOrderStatus.CANCELLED
        order.save(update_fields=["status"])

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/cancel/",
            data={
                "cancellation_reason": "Should fail",
            },
        )
        response = self._call_with_permissions(
            pos_order_cancel,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])
    def test_pos_order_finalize_api_success(self):
        order = self._create_order_for_api()

        add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        add_pos_payment_line(
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

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/finalize/",
            data={
                "notes": "Finalized by API test",
            },
        )
        response = self._call_with_permissions(
            pos_order_finalize,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["item"]["status"], POSOrderStatus.COMPLETED)

    def test_pos_order_finalize_api_rejects_order_without_items(self):
        order = self._create_order_for_api()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/finalize/",
            data={
                "notes": "Should fail without items",
            },
        )
        response = self._call_with_permissions(
            pos_order_finalize,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_order_finalize_api_rejects_unpaid_order(self):
        order = self._create_order_for_api()

        add_pos_order_item(
            company=self.company,
            order=order,
            catalog_item=self.catalog_item,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
        )

        order.refresh_from_db()

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/finalize/",
            data={
                "notes": "Should fail unpaid",
            },
        )
        response = self._call_with_permissions(
            pos_order_finalize,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_pos_order_finalize_api_rejects_cancelled_order(self):
        order = self._create_order_for_api()
        order.status = POSOrderStatus.CANCELLED
        order.save(update_fields=["status"])

        request = self._authenticated_request(
            "post",
            f"/api/company/pos/orders/{order.id}/finalize/",
            data={
                "notes": "Should fail cancelled",
            },
        )
        response = self._call_with_permissions(
            pos_order_finalize,
            request,
            order_id=order.id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])


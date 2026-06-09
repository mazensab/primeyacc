# ============================================================
# 📂 payments/tests.py
# 🧠 PrimeyAcc | Company Payments Foundation & API Tests V1.1
# ------------------------------------------------------------
# ✅ Payment gateways model/service foundation tests
# ✅ Payment methods model/service foundation tests
# ✅ Payment terminals model/service foundation tests
# ✅ Company payment gateways API tests
# ✅ Company payment methods API tests
# ✅ Company payment terminals API tests
# ✅ Tenant isolation validation
# ✅ Cross-company relation blocking
# ✅ Duplicate code validation
# ✅ Secret settings masking validation
# ✅ Status endpoints validation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - طرق الدفع هنا تخص عمليات الشركة داخل /company
# - دفع اشتراكات PrimeyAcc للمنصة منفصل عن طرق دفع الشركات
# - لا يتم الاعتماد على company_id القادم من الواجهة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - أي branch/gateway/payment_method يجب أن يكون داخل نفس الشركة
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus, UserProfile
from companies.models import Branch, BranchType, Company, CompanyStatus
from .models import (
    CompanyPaymentGateway,
    CompanyPaymentMethod,
    CompanyPaymentTerminal,
)
from .services import (
    _clean_code,
    _mask_gateway_settings,
    create_payment_gateway,
    create_payment_method,
    create_payment_terminal,
)


User = get_user_model()


# ============================================================
# Foundation tests
# ============================================================


class CompanyPaymentsModelFoundationTests(SimpleTestCase):
    def test_payment_gateway_has_required_foundation_fields(self):
        fields = {field.name for field in CompanyPaymentGateway._meta.fields}

        self.assertIn("company", fields)
        self.assertIn("name", fields)
        self.assertIn("code", fields)
        self.assertIn("gateway_type", fields)
        self.assertIn("environment", fields)
        self.assertIn("settings", fields)
        self.assertIn("settlement_account_code", fields)
        self.assertIn("fee_account_code", fields)
        self.assertIn("is_active", fields)
        self.assertIn("is_default", fields)

    def test_payment_method_has_required_foundation_fields(self):
        fields = {field.name for field in CompanyPaymentMethod._meta.fields}

        self.assertIn("company", fields)
        self.assertIn("gateway", fields)
        self.assertIn("name", fields)
        self.assertIn("code", fields)
        self.assertIn("method_type", fields)
        self.assertIn("settlement_behavior", fields)
        self.assertIn("cashbox_account_code", fields)
        self.assertIn("bank_account_code", fields)
        self.assertIn("settlement_account_code", fields)
        self.assertIn("fee_account_code", fields)
        self.assertIn("allow_pos", fields)
        self.assertIn("allow_customer_checkout", fields)
        self.assertIn("is_active", fields)
        self.assertIn("is_default", fields)

    def test_payment_terminal_has_required_foundation_fields(self):
        fields = {field.name for field in CompanyPaymentTerminal._meta.fields}

        self.assertIn("company", fields)
        self.assertIn("branch", fields)
        self.assertIn("gateway", fields)
        self.assertIn("payment_method", fields)
        self.assertIn("name", fields)
        self.assertIn("terminal_code", fields)
        self.assertIn("terminal_id", fields)
        self.assertIn("serial_number", fields)
        self.assertIn("status", fields)
        self.assertIn("is_active", fields)
        self.assertIn("is_default_for_branch", fields)

    def test_payment_method_type_choices_include_expected_types(self):
        choices = {choice[0] for choice in CompanyPaymentMethod.MethodType.choices}

        self.assertIn("CASH", choices)
        self.assertIn("BANK_TRANSFER", choices)
        self.assertIn("CARD", choices)
        self.assertIn("POS_TERMINAL", choices)
        self.assertIn("ONLINE_GATEWAY", choices)
        self.assertIn("TAMARA", choices)
        self.assertIn("TABBY", choices)

    def test_gateway_choices_include_expected_providers(self):
        choices = {choice[0] for choice in CompanyPaymentGateway.GatewayType.choices}

        self.assertIn("MOYASAR", choices)
        self.assertIn("HYPERPAY", choices)
        self.assertIn("PAYTABS", choices)
        self.assertIn("TAP", choices)
        self.assertIn("GEIDEA", choices)
        self.assertIn("STRIPE", choices)
        self.assertIn("CUSTOM", choices)

    def test_terminal_status_choices_include_expected_statuses(self):
        choices = {choice[0] for choice in CompanyPaymentTerminal.TerminalStatus.choices}

        self.assertIn("ACTIVE", choices)
        self.assertIn("INACTIVE", choices)
        self.assertIn("MAINTENANCE", choices)
        self.assertIn("RETIRED", choices)


class CompanyPaymentsServiceFoundationTests(SimpleTestCase):
    def test_clean_code_normalizes_text(self):
        self.assertEqual(_clean_code("Main Cashbox", "Fallback"), "main-cashbox")
        self.assertEqual(_clean_code("  POS Terminal #1  ", "Fallback"), "pos-terminal-1")
        self.assertEqual(_clean_code("", "Bank Transfer"), "bank-transfer")

    def test_mask_gateway_settings_hides_sensitive_keys(self):
        masked = _mask_gateway_settings(
            {
                "public_key": "pk_test",
                "secret_key": "sk_test",
                "webhook_secret": "whsec_test",
                "merchant_id": "merchant-1",
            }
        )

        self.assertEqual(masked["public_key"], "pk_test")
        self.assertEqual(masked["merchant_id"], "merchant-1")
        self.assertEqual(masked["secret_key"], "********")
        self.assertEqual(masked["webhook_secret"], "********")

    def test_payment_method_normalize_cash_flags(self):
        method = CompanyPaymentMethod(
            name="Cash",
            code="cash",
            method_type=CompanyPaymentMethod.MethodType.CASH,
        )

        method.normalize_flags()

        self.assertTrue(method.is_cash)
        self.assertFalse(method.is_bank_transfer)
        self.assertFalse(method.is_card)
        self.assertFalse(method.is_online)
        self.assertFalse(method.is_pos_terminal)

    def test_payment_method_normalize_bank_transfer_flags(self):
        method = CompanyPaymentMethod(
            name="Bank Transfer",
            code="bank-transfer",
            method_type=CompanyPaymentMethod.MethodType.BANK_TRANSFER,
        )

        method.normalize_flags()

        self.assertFalse(method.is_cash)
        self.assertTrue(method.is_bank_transfer)
        self.assertFalse(method.is_card)
        self.assertFalse(method.is_online)
        self.assertFalse(method.is_pos_terminal)

    def test_payment_method_normalize_pos_terminal_flags(self):
        method = CompanyPaymentMethod(
            name="POS Terminal",
            code="pos-terminal",
            method_type=CompanyPaymentMethod.MethodType.POS_TERMINAL,
        )

        method.normalize_flags()

        self.assertFalse(method.is_cash)
        self.assertFalse(method.is_bank_transfer)
        self.assertTrue(method.is_card)
        self.assertFalse(method.is_online)
        self.assertTrue(method.is_pos_terminal)

    def test_payment_method_normalize_online_gateway_flags(self):
        method = CompanyPaymentMethod(
            name="Online Gateway",
            code="online-gateway",
            method_type=CompanyPaymentMethod.MethodType.ONLINE_GATEWAY,
        )

        method.normalize_flags()

        self.assertFalse(method.is_cash)
        self.assertFalse(method.is_bank_transfer)
        self.assertTrue(method.is_card)
        self.assertTrue(method.is_online)
        self.assertFalse(method.is_pos_terminal)


# ============================================================
# Shared API test factory
# ============================================================


class CompanyPaymentsAPITestFactoryMixin:
    """
    Shared lightweight factory helpers for company payments API tests.
    """

    @classmethod
    def create_company(cls, *, name: str, code: str, city: str = "Jeddah") -> Company:
        return Company.objects.create(
            name=name,
            name_ar=name,
            name_en=name,
            company_code=code,
            status=CompanyStatus.ACTIVE,
            is_active=True,
            city=city,
            currency_code="SAR",
        )

    @classmethod
    def create_user_with_company_membership(
        cls,
        *,
        username: str,
        email: str,
        company: Company,
        role: str = CompanyRole.OWNER,
    ):
        user = User.objects.create_user(
            username=username,
            email=email,
            password="StrongPass123!",
        )

        UserProfile.objects.create(
            user=user,
            display_name=username,
            default_company=company,
            is_system_user=False,
        )

        CompanyMembership.objects.create(
            user=user,
            company=company,
            role=role,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        return user

    @classmethod
    def create_branch(
        cls,
        *,
        company: Company,
        code: str,
        name: str = "Main Branch",
    ) -> Branch:
        return Branch.objects.create(
            company=company,
            name=name,
            name_ar=name,
            name_en=name,
            branch_code=code,
            branch_type=BranchType.BRANCH,
            is_default=True,
            city="Jeddah",
        )

    @classmethod
    def create_gateway(
        cls,
        *,
        company: Company,
        name: str = "Moyasar Gateway",
        code: str = "moyasar",
    ) -> CompanyPaymentGateway:
        return create_payment_gateway(
            company=company,
            payload={
                "name": name,
                "code": code,
                "gateway_type": CompanyPaymentGateway.GatewayType.MOYASAR,
                "environment": CompanyPaymentGateway.Environment.SANDBOX,
                "settings": {
                    "public_key": "pk_test",
                    "secret_key": "sk_test",
                },
                "public_key": "pk_test",
                "merchant_id": f"merchant-{code}",
                "is_active": True,
            },
        )

    @classmethod
    def create_method(
        cls,
        *,
        company: Company,
        gateway: CompanyPaymentGateway | None = None,
        name: str = "POS Card",
        code: str = "pos-card",
    ) -> CompanyPaymentMethod:
        return create_payment_method(
            company=company,
            payload={
                "gateway": gateway,
                "name": name,
                "code": code,
                "method_type": CompanyPaymentMethod.MethodType.POS_TERMINAL,
                "settlement_behavior": CompanyPaymentMethod.SettlementBehavior.NEEDS_SETTLEMENT,
                "allow_pos": True,
                "allow_customer_checkout": False,
                "is_active": True,
            },
        )

    @classmethod
    def create_terminal(
        cls,
        *,
        company: Company,
        branch: Branch | None = None,
        gateway: CompanyPaymentGateway | None = None,
        payment_method: CompanyPaymentMethod | None = None,
        name: str = "Main POS Terminal",
        code: str = "main-pos",
    ) -> CompanyPaymentTerminal:
        return create_payment_terminal(
            company=company,
            payload={
                "branch": branch,
                "gateway": gateway,
                "payment_method": payment_method,
                "name": name,
                "terminal_code": code,
                "terminal_id": f"TID-{code}",
                "serial_number": f"SN-{code}",
                "provider_name": "Geidea",
                "status": CompanyPaymentTerminal.TerminalStatus.ACTIVE,
                "is_active": True,
                "is_default_for_branch": True,
            },
        )


# ============================================================
# API tests
# ============================================================


class CompanyPaymentsAPITests(CompanyPaymentsAPITestFactoryMixin, TestCase):
    """
    API tests for Phase 12 company payment methods, gateways, and terminals.
    """

    @classmethod
    def setUpTestData(cls) -> None:
        cls.company = cls.create_company(
            name="PrimeyAcc Payments Company",
            code="PAYMENTS-A",
            city="Jeddah",
        )
        cls.other_company = cls.create_company(
            name="PrimeyAcc Other Payments Company",
            code="PAYMENTS-B",
            city="Riyadh",
        )

        cls.user = cls.create_user_with_company_membership(
            username="payments_owner",
            email="payments-owner@example.com",
            company=cls.company,
            role=CompanyRole.OWNER,
        )

        cls.other_user = cls.create_user_with_company_membership(
            username="other_payments_owner",
            email="other-payments-owner@example.com",
            company=cls.other_company,
            role=CompanyRole.OWNER,
        )

        cls.branch = cls.create_branch(
            company=cls.company,
            code="PAY-MAIN",
            name="Payments Main Branch",
        )
        cls.other_branch = cls.create_branch(
            company=cls.other_company,
            code="OTHER-MAIN",
            name="Other Main Branch",
        )

    def setUp(self) -> None:
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_unauthenticated_payment_apis_are_rejected(self) -> None:
        anonymous_client = APIClient()

        endpoints = [
            "/api/company/payments/gateways/",
            "/api/company/payments/methods/",
            "/api/company/payments/terminals/",
        ]

        for endpoint in endpoints:
            response = anonymous_client.get(endpoint)
            self.assertIn(response.status_code, [401, 403], endpoint)

    def test_gateways_list_returns_current_company_gateways_only(self) -> None:
        gateway = self.create_gateway(
            company=self.company,
            name="Current Company Gateway",
            code="current-gateway",
        )
        foreign_gateway = self.create_gateway(
            company=self.other_company,
            name="Foreign Gateway",
            code="foreign-gateway",
        )

        response = self.client.get("/api/company/payments/gateways/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])

        result_ids = {item["id"] for item in response.data["results"]}

        self.assertIn(gateway.id, result_ids)
        self.assertNotIn(foreign_gateway.id, result_ids)
        self.assertEqual(response.data["company"]["id"], self.company.id)

    def test_gateways_create_masks_sensitive_settings(self) -> None:
        response = self.client.post(
            "/api/company/payments/gateways/",
            data={
                "name": "API Moyasar",
                "code": "api-moyasar",
                "gateway_type": CompanyPaymentGateway.GatewayType.MOYASAR,
                "environment": CompanyPaymentGateway.Environment.SANDBOX,
                "settings": {
                    "public_key": "pk_test",
                    "secret_key": "sk_test",
                    "webhook_secret": "whsec_test",
                },
                "public_key": "pk_test",
                "merchant_id": "merchant-api",
                "is_default": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["company_id"], self.company.id)
        self.assertEqual(response.data["item"]["settings"]["public_key"], "pk_test")
        self.assertEqual(response.data["item"]["settings"]["secret_key"], "********")
        self.assertEqual(response.data["item"]["settings"]["webhook_secret"], "********")

        gateway = CompanyPaymentGateway.objects.get(id=response.data["item"]["id"])
        self.assertEqual(gateway.company_id, self.company.id)
        self.assertEqual(gateway.settings["secret_key"], "sk_test")

    def test_gateways_list_does_not_expose_settings(self) -> None:
        self.create_gateway(
            company=self.company,
            name="Sensitive Gateway",
            code="sensitive-gateway",
        )

        response = self.client.get("/api/company/payments/gateways/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertNotIn("settings", response.data["results"][0])

    def test_duplicate_gateway_code_inside_same_company_is_rejected(self) -> None:
        self.create_gateway(
            company=self.company,
            name="Existing Gateway",
            code="duplicate-gateway",
        )

        response = self.client.post(
            "/api/company/payments/gateways/",
            data={
                "name": "Duplicate Gateway",
                "code": "duplicate-gateway",
                "gateway_type": CompanyPaymentGateway.GatewayType.CUSTOM,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_gateway_detail_blocks_cross_company_access(self) -> None:
        foreign_gateway = self.create_gateway(
            company=self.other_company,
            name="Foreign Detail Gateway",
            code="foreign-detail-gateway",
        )

        response = self.client.get(
            f"/api/company/payments/gateways/{foreign_gateway.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])

    def test_gateway_update_and_status_api(self) -> None:
        gateway = self.create_gateway(
            company=self.company,
            name="Update Gateway",
            code="update-gateway",
        )

        update_response = self.client.patch(
            f"/api/company/payments/gateways/{gateway.id}/",
            data={
                "name": "Updated Gateway",
                "environment": CompanyPaymentGateway.Environment.LIVE,
                "notes": "Updated through API",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertTrue(update_response.data["success"])
        self.assertEqual(update_response.data["item"]["name"], "Updated Gateway")
        self.assertEqual(update_response.data["item"]["environment"], "LIVE")

        status_response = self.client.post(
            f"/api/company/payments/gateways/{gateway.id}/status/",
            data={"is_active": False},
            format="json",
        )

        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(status_response.data["success"])

        gateway.refresh_from_db()
        self.assertEqual(gateway.name, "Updated Gateway")
        self.assertFalse(gateway.is_active)

    def test_methods_list_returns_current_company_methods_only(self) -> None:
        gateway = self.create_gateway(company=self.company, code="method-list-gateway")
        method = self.create_method(
            company=self.company,
            gateway=gateway,
            name="Current Company Method",
            code="current-method",
        )

        foreign_gateway = self.create_gateway(
            company=self.other_company,
            code="foreign-method-gateway",
        )
        foreign_method = self.create_method(
            company=self.other_company,
            gateway=foreign_gateway,
            name="Foreign Method",
            code="foreign-method",
        )

        response = self.client.get("/api/company/payments/methods/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])

        result_ids = {item["id"] for item in response.data["results"]}

        self.assertIn(method.id, result_ids)
        self.assertNotIn(foreign_method.id, result_ids)
        self.assertEqual(response.data["company"]["id"], self.company.id)

    def test_methods_create_links_current_company_gateway_only(self) -> None:
        gateway = self.create_gateway(
            company=self.company,
            name="Method Gateway",
            code="method-gateway",
        )

        response = self.client.post(
            "/api/company/payments/methods/",
            data={
                "gateway_id": gateway.id,
                "name": "API POS Method",
                "code": "api-pos-method",
                "method_type": CompanyPaymentMethod.MethodType.POS_TERMINAL,
                "settlement_behavior": CompanyPaymentMethod.SettlementBehavior.NEEDS_SETTLEMENT,
                "allow_pos": True,
                "allow_customer_checkout": False,
                "is_default": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["company_id"], self.company.id)
        self.assertEqual(response.data["item"]["gateway_id"], gateway.id)
        self.assertTrue(response.data["item"]["is_pos_terminal"])

        method = CompanyPaymentMethod.objects.get(id=response.data["item"]["id"])
        self.assertEqual(method.company_id, self.company.id)
        self.assertEqual(method.gateway_id, gateway.id)

    def test_methods_create_rejects_foreign_gateway(self) -> None:
        foreign_gateway = self.create_gateway(
            company=self.other_company,
            name="Foreign Method Gateway",
            code="foreign-method-create-gateway",
        )

        response = self.client.post(
            "/api/company/payments/methods/",
            data={
                "gateway_id": foreign_gateway.id,
                "name": "Invalid Method",
                "code": "invalid-method",
                "method_type": CompanyPaymentMethod.MethodType.POS_TERMINAL,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_duplicate_method_code_inside_same_company_is_rejected(self) -> None:
        self.create_method(
            company=self.company,
            gateway=None,
            name="Existing Method",
            code="duplicate-method",
        )

        response = self.client.post(
            "/api/company/payments/methods/",
            data={
                "name": "Duplicate Method",
                "code": "duplicate-method",
                "method_type": CompanyPaymentMethod.MethodType.CASH,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_method_detail_blocks_cross_company_access(self) -> None:
        foreign_method = self.create_method(
            company=self.other_company,
            gateway=None,
            name="Foreign Detail Method",
            code="foreign-detail-method",
        )

        response = self.client.get(
            f"/api/company/payments/methods/{foreign_method.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])

    def test_method_update_and_status_api(self) -> None:
        method = self.create_method(
            company=self.company,
            gateway=None,
            name="Update Method",
            code="update-method",
        )

        update_response = self.client.patch(
            f"/api/company/payments/methods/{method.id}/",
            data={
                "name": "Updated Method",
                "method_type": CompanyPaymentMethod.MethodType.BANK_TRANSFER,
                "allow_pos": False,
                "notes": "Updated through API",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertTrue(update_response.data["success"])
        self.assertEqual(update_response.data["item"]["name"], "Updated Method")
        self.assertEqual(update_response.data["item"]["method_type"], "BANK_TRANSFER")

        status_response = self.client.post(
            f"/api/company/payments/methods/{method.id}/status/",
            data={"status": "inactive"},
            format="json",
        )

        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(status_response.data["success"])

        method.refresh_from_db()
        self.assertEqual(method.name, "Updated Method")
        self.assertFalse(method.is_active)
        self.assertTrue(method.is_bank_transfer)

    def test_terminals_list_returns_current_company_terminals_only(self) -> None:
        gateway = self.create_gateway(company=self.company, code="terminal-list-gateway")
        method = self.create_method(company=self.company, gateway=gateway, code="terminal-list-method")
        terminal = self.create_terminal(
            company=self.company,
            branch=self.branch,
            gateway=gateway,
            payment_method=method,
            name="Current Terminal",
            code="current-terminal",
        )

        foreign_gateway = self.create_gateway(
            company=self.other_company,
            code="foreign-terminal-gateway",
        )
        foreign_method = self.create_method(
            company=self.other_company,
            gateway=foreign_gateway,
            code="foreign-terminal-method",
        )
        foreign_terminal = self.create_terminal(
            company=self.other_company,
            branch=self.other_branch,
            gateway=foreign_gateway,
            payment_method=foreign_method,
            name="Foreign Terminal",
            code="foreign-terminal",
        )

        response = self.client.get("/api/company/payments/terminals/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])

        result_ids = {item["id"] for item in response.data["results"]}

        self.assertIn(terminal.id, result_ids)
        self.assertNotIn(foreign_terminal.id, result_ids)
        self.assertEqual(response.data["company"]["id"], self.company.id)

    def test_terminals_create_links_current_company_relations_only(self) -> None:
        gateway = self.create_gateway(
            company=self.company,
            name="Terminal Gateway",
            code="terminal-gateway",
        )
        method = self.create_method(
            company=self.company,
            gateway=gateway,
            name="Terminal Method",
            code="terminal-method",
        )

        response = self.client.post(
            "/api/company/payments/terminals/",
            data={
                "branch_id": self.branch.id,
                "gateway_id": gateway.id,
                "payment_method_id": method.id,
                "name": "API POS Terminal",
                "terminal_code": "api-pos-terminal",
                "terminal_id": "TID-001",
                "serial_number": "SN-001",
                "provider_name": "Geidea",
                "is_default_for_branch": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["item"]["company_id"], self.company.id)
        self.assertEqual(response.data["item"]["branch_id"], self.branch.id)
        self.assertEqual(response.data["item"]["gateway_id"], gateway.id)
        self.assertEqual(response.data["item"]["payment_method_id"], method.id)

        terminal = CompanyPaymentTerminal.objects.get(id=response.data["item"]["id"])
        self.assertEqual(terminal.company_id, self.company.id)
        self.assertEqual(terminal.branch_id, self.branch.id)
        self.assertEqual(terminal.gateway_id, gateway.id)
        self.assertEqual(terminal.payment_method_id, method.id)

    def test_terminals_create_rejects_foreign_branch_gateway_and_method(self) -> None:
        foreign_gateway = self.create_gateway(
            company=self.other_company,
            name="Foreign Terminal Gateway",
            code="foreign-terminal-create-gateway",
        )
        foreign_method = self.create_method(
            company=self.other_company,
            gateway=foreign_gateway,
            name="Foreign Terminal Method",
            code="foreign-terminal-create-method",
        )

        invalid_payloads: list[dict[str, Any]] = [
            {
                "branch_id": self.other_branch.id,
                "name": "Invalid Branch Terminal",
                "terminal_code": "invalid-branch-terminal",
            },
            {
                "gateway_id": foreign_gateway.id,
                "name": "Invalid Gateway Terminal",
                "terminal_code": "invalid-gateway-terminal",
            },
            {
                "payment_method_id": foreign_method.id,
                "name": "Invalid Method Terminal",
                "terminal_code": "invalid-method-terminal",
            },
        ]

        for payload in invalid_payloads:
            response = self.client.post(
                "/api/company/payments/terminals/",
                data=payload,
                format="json",
            )

            self.assertEqual(response.status_code, 400, payload)
            self.assertFalse(response.data["success"], payload)

    def test_duplicate_terminal_code_inside_same_company_is_rejected(self) -> None:
        self.create_terminal(
            company=self.company,
            branch=self.branch,
            name="Existing Terminal",
            code="duplicate-terminal",
        )

        response = self.client.post(
            "/api/company/payments/terminals/",
            data={
                "branch_id": self.branch.id,
                "name": "Duplicate Terminal",
                "terminal_code": "duplicate-terminal",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_terminal_detail_blocks_cross_company_access(self) -> None:
        foreign_terminal = self.create_terminal(
            company=self.other_company,
            branch=self.other_branch,
            name="Foreign Detail Terminal",
            code="foreign-detail-terminal",
        )

        response = self.client.get(
            f"/api/company/payments/terminals/{foreign_terminal.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])

    def test_terminal_update_and_status_api(self) -> None:
        terminal = self.create_terminal(
            company=self.company,
            branch=self.branch,
            name="Update Terminal",
            code="update-terminal",
        )

        update_response = self.client.patch(
            f"/api/company/payments/terminals/{terminal.id}/",
            data={
                "name": "Updated Terminal",
                "provider_name": "Mada",
                "location_note": "Cashier 1",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertTrue(update_response.data["success"])
        self.assertEqual(update_response.data["item"]["name"], "Updated Terminal")
        self.assertEqual(update_response.data["item"]["provider_name"], "Mada")

        status_response = self.client.post(
            f"/api/company/payments/terminals/{terminal.id}/status/",
            data={"status": "MAINTENANCE"},
            format="json",
        )

        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(status_response.data["success"])
        self.assertEqual(
            status_response.data["item"]["status"],
            CompanyPaymentTerminal.TerminalStatus.MAINTENANCE,
        )

        terminal.refresh_from_db()
        self.assertEqual(terminal.name, "Updated Terminal")
        self.assertEqual(terminal.provider_name, "Mada")
        self.assertEqual(terminal.status, CompanyPaymentTerminal.TerminalStatus.MAINTENANCE)
        self.assertFalse(terminal.is_active)
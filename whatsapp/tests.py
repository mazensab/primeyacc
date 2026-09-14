# ============================================================
# 📂 whatsapp/tests.py
# 🧠 Mhamcloud | Company WhatsApp Tests V1.0
# ------------------------------------------------------------
# ✅ CompanyWhatsAppSetting tests
# ✅ WhatsAppTemplate tests
# ✅ WhatsAppMessageLog tests
# ✅ Template rendering tests
# ✅ Mock send tests
# ✅ Tenant isolation tests
# ============================================================

from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from companies.models import Company
from whatsapp.models import (
    CompanyWhatsAppSetting,
    SystemWhatsAppConnection,
    WhatsAppMessageLog,
    WhatsAppMessageStatus,
    WhatsAppProvider,
    WhatsAppTemplateStatus,
)
from whatsapp.services import (
    create_message_log,
    create_whatsapp_template,
    extract_template_variables,
    get_company_message_logs_queryset,
    get_company_templates_queryset,
    get_message_log_for_company,
    get_or_create_company_whatsapp_setting,
    get_whatsapp_template_for_company,
    normalize_phone_number,
    render_template_body,
    send_mock_whatsapp_message,
    serialize_whatsapp_message_log,
    serialize_whatsapp_setting,
    serialize_whatsapp_template,
    set_whatsapp_template_status,
    update_company_whatsapp_setting,
    update_whatsapp_template,
)

User = get_user_model()


class CompanyWhatsAppFoundationTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="WhatsApp Test Company",
            company_code="WA-001",
            is_active=True,
        )

        self.other_company = Company.objects.create(
            name="Other WhatsApp Company",
            company_code="WA-002",
            is_active=True,
        )

        self.user = User.objects.create_user(
            username="whatsapp_user",
            email="whatsapp_user@example.com",
            password="StrongPass123!",
        )

        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

    def test_get_or_create_company_whatsapp_setting_creates_mock_default(self):
        setting = get_or_create_company_whatsapp_setting(
            company=self.company,
            user=self.user,
        )

        self.assertEqual(setting.company, self.company)
        self.assertEqual(setting.provider, WhatsAppProvider.MOCK)
        self.assertFalse(setting.is_enabled)
        self.assertEqual(setting.created_by, self.user)

    def test_update_company_whatsapp_setting(self):
        setting = update_company_whatsapp_setting(
            company=self.company,
            data={
                "is_enabled": True,
                "provider": WhatsAppProvider.MOCK,
                "phone_number": "+966500000000",
                "default_country_code": "+966",
            },
            user=self.user,
        )

        self.assertTrue(setting.is_enabled)
        self.assertEqual(setting.phone_number, "+966500000000")
        self.assertEqual(setting.updated_by, self.user)

    def test_serialize_whatsapp_setting_hides_token_values(self):
        setting = update_company_whatsapp_setting(
            company=self.company,
            data={
                "access_token": "secret-token",
                "webhook_verify_token": "secret-webhook-token",
            },
            user=self.user,
        )

        payload = serialize_whatsapp_setting(setting)

        self.assertTrue(payload["has_access_token"])
        self.assertTrue(payload["has_webhook_verify_token"])
        self.assertNotIn("access_token", payload)
        self.assertNotIn("webhook_verify_token", payload)

    def test_normalize_phone_number_for_saudi_local_number(self):
        normalized = normalize_phone_number(
            phone_number="050 000 0000",
            default_country_code="+966",
        )

        self.assertEqual(normalized, "+966500000000")

    def test_extract_template_variables(self):
        variables = extract_template_variables(
            "Hello {{customer_name}}, invoice {{invoice_number}} is ready."
        )

        self.assertEqual(variables, ["customer_name", "invoice_number"])

    def test_create_whatsapp_template(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Invoice Ready",
            code="invoice_ready",
            body="Hello {{customer_name}}, invoice {{invoice_number}} is ready.",
            status=WhatsAppTemplateStatus.ACTIVE,
            created_by=self.user,
        )

        self.assertEqual(template.company, self.company)
        self.assertEqual(template.code, "INVOICE_READY")
        self.assertEqual(template.status, WhatsAppTemplateStatus.ACTIVE)
        self.assertEqual(
            template.variables,
            ["customer_name", "invoice_number"],
        )

    def test_create_whatsapp_template_requires_name_code_body(self):
        with self.assertRaises(ValueError):
            create_whatsapp_template(
                company=self.company,
                name="",
                code="missing_name",
                body="Body",
            )

        with self.assertRaises(ValueError):
            create_whatsapp_template(
                company=self.company,
                name="Missing Code",
                code="",
                body="Body",
            )

        with self.assertRaises(ValueError):
            create_whatsapp_template(
                company=self.company,
                name="Missing Body",
                code="missing_body",
                body="",
            )

    def test_get_company_templates_queryset_is_tenant_isolated(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Company Template",
            code="company_template",
            body="Company body.",
        )

        create_whatsapp_template(
            company=self.other_company,
            name="Other Template",
            code="other_template",
            body="Other body.",
        )

        queryset = get_company_templates_queryset(company=self.company)

        self.assertEqual(queryset.count(), 1)
        self.assertEqual(queryset.first(), template)

    def test_get_whatsapp_template_for_company_by_id_and_code(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Lookup Template",
            code="lookup_template",
            body="Lookup body.",
        )

        by_id = get_whatsapp_template_for_company(
            company=self.company,
            template_id=template.id,
        )

        by_code = get_whatsapp_template_for_company(
            company=self.company,
            code="lookup_template",
        )

        self.assertEqual(by_id, template)
        self.assertEqual(by_code, template)

    def test_update_whatsapp_template(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Old Name",
            code="old_code",
            body="Old body.",
        )

        updated = update_whatsapp_template(
            company=self.company,
            template_id=template.id,
            data={
                "name": "New Name",
                "code": "new_code",
                "body": "Hello {{name}}",
            },
            user=self.user,
        )

        self.assertEqual(updated.name, "New Name")
        self.assertEqual(updated.code, "NEW_CODE")
        self.assertEqual(updated.variables, ["name"])
        self.assertEqual(updated.updated_by, self.user)

    def test_set_whatsapp_template_status(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Status Template",
            code="status_template",
            body="Status body.",
        )

        updated = set_whatsapp_template_status(
            company=self.company,
            template_id=template.id,
            status=WhatsAppTemplateStatus.ACTIVE,
            user=self.user,
        )

        self.assertEqual(updated.status, WhatsAppTemplateStatus.ACTIVE)
        self.assertTrue(updated.is_active)

    def test_render_template_body(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Render Template",
            code="render_template",
            body="Hello {{customer_name}}, your total is {{total}} SAR.",
        )

        rendered = render_template_body(
            template=template,
            variables={
                "customer_name": "Ahmed",
                "total": "100",
            },
        )

        self.assertEqual(rendered, "Hello Ahmed, your total is 100 SAR.")

    def test_create_message_log(self):
        log = create_message_log(
            company=self.company,
            recipient_name="Ahmed",
            recipient_phone="0500000000",
            message_body="Hello from Mhamcloud.",
            created_by=self.user,
        )

        self.assertEqual(log.company, self.company)
        self.assertEqual(log.recipient_phone, "+966500000000")
        self.assertEqual(log.message_body, "Hello from Mhamcloud.")
        self.assertEqual(log.status, WhatsAppMessageStatus.DRAFT)

    def test_create_message_log_requires_message_body(self):
        with self.assertRaises(ValueError):
            create_message_log(
                company=self.company,
                recipient_phone="0500000000",
                message_body="",
            )

    def test_send_mock_whatsapp_message_without_template(self):
        log = send_mock_whatsapp_message(
            company=self.company,
            recipient_name="Ahmed",
            recipient_phone="0500000000",
            message_body="Mock message.",
            created_by=self.user,
        )

        self.assertEqual(log.status, WhatsAppMessageStatus.SENT)
        self.assertTrue(log.provider_message_id.startswith("mock-"))
        self.assertIsNotNone(log.sent_at)
        self.assertEqual(log.provider_response["mock"], True)

    def test_send_mock_whatsapp_message_with_active_template(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Active Template",
            code="active_template",
            body="Hello {{name}}",
            status=WhatsAppTemplateStatus.ACTIVE,
        )

        log = send_mock_whatsapp_message(
            company=self.company,
            recipient_phone="0500000000",
            template=template,
            template_variables={"name": "Ahmed"},
            created_by=self.user,
        )

        self.assertEqual(log.status, WhatsAppMessageStatus.SENT)
        self.assertEqual(log.message_body, "Hello Ahmed")
        self.assertEqual(log.template, template)

    def test_send_mock_whatsapp_message_rejects_inactive_template(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Inactive Template",
            code="inactive_template",
            body="Hello {{name}}",
            status=WhatsAppTemplateStatus.DRAFT,
        )

        with self.assertRaises(ValueError):
            send_mock_whatsapp_message(
                company=self.company,
                recipient_phone="0500000000",
                template=template,
                template_variables={"name": "Ahmed"},
            )

    def test_message_logs_queryset_is_tenant_isolated(self):
        log = create_message_log(
            company=self.company,
            recipient_phone="0500000000",
            message_body="Company message.",
        )

        create_message_log(
            company=self.other_company,
            recipient_phone="0500000001",
            message_body="Other company message.",
        )

        queryset = get_company_message_logs_queryset(company=self.company)

        self.assertEqual(queryset.count(), 1)
        self.assertEqual(queryset.first(), log)

    def test_get_message_log_for_company(self):
        log = create_message_log(
            company=self.company,
            recipient_phone="0500000000",
            message_body="Scoped message.",
        )

        result = get_message_log_for_company(
            company=self.company,
            message_id=log.id,
        )

        leaked = get_message_log_for_company(
            company=self.other_company,
            message_id=log.id,
        )

        self.assertEqual(result, log)
        self.assertIsNone(leaked)

    def test_serialize_whatsapp_template(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Serialize Template",
            code="serialize_template",
            body="Serialize body.",
        )

        payload = serialize_whatsapp_template(template)

        self.assertEqual(payload["id"], template.id)
        self.assertEqual(payload["code"], "SERIALIZE_TEMPLATE")
        self.assertEqual(payload["company_id"], self.company.id)

    def test_serialize_whatsapp_message_log(self):
        log = create_message_log(
            company=self.company,
            recipient_phone="0500000000",
            message_body="Serialize log.",
        )

        payload = serialize_whatsapp_message_log(log)

        self.assertEqual(payload["id"], log.id)
        self.assertEqual(payload["company_id"], self.company.id)
        self.assertEqual(payload["recipient_phone"], "+966500000000")



def _phase27_create_active_subscription(
    *,
    company,
    user,
    suffix: str,
):
    """
    Test-only helper.

    Company operational APIs now require subscription access.
    This fixture keeps legacy WhatsApp API tests aligned with
    the current SaaS access contract without weakening production
    permissions.
    """

    from datetime import timedelta
    from decimal import Decimal

    from django.utils import timezone

    from subscriptions.models import (
        CompanySubscription,
        SubscriptionPlan,
    )

    normalized = (
        str(suffix or company.id)
        .strip()
        .lower()
        .replace("_", "-")
    )

    plan = SubscriptionPlan.objects.create(
        name=f"WhatsApp Test Plan {normalized}",
        code=SubscriptionPlan.PlanCode.BASIC,
        slug=(
            f"whatsapp-test-{company.id}-{normalized}"
        ),
        monthly_price=Decimal("100.00"),
        yearly_price=Decimal("1000.00"),
        max_users=10,
        max_branches=5,
        max_warehouses=5,
        max_pos=5,
        features=["whatsapp"],
        is_active=True,
        is_public=False,
    )

    today = timezone.localdate()

    return CompanySubscription.objects.create(
        company=company,
        plan=plan,
        status=CompanySubscription.Status.ACTIVE,
        action=(
            CompanySubscription
            .SubscriptionAction
            .NEW
        ),
        billing_cycle=(
            CompanySubscription
            .BillingCycle
            .MONTHLY
        ),
        start_date=today,
        end_date=today + timedelta(days=30),
        price=Decimal("100.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("15.00"),
        total_amount=Decimal("115.00"),
        paid_at=timezone.now(),
        activated_at=timezone.now(),
        created_by=user,
    )


class CompanyWhatsAppAPITests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="WhatsApp API Company",
            company_code="WA-API-001",
            is_active=True,
        )

        self.other_company = Company.objects.create(
            name="Other WhatsApp API Company",
            company_code="WA-API-002",
            is_active=True,
        )

        self.user = User.objects.create_user(
            username="whatsapp_api_user",
            email="whatsapp_api_user@example.com",
            password="StrongPass123!",
        )

        self.other_user = User.objects.create_user(
            username="whatsapp_api_other_user",
            email="whatsapp_api_other_user@example.com",
            password="StrongPass123!",
        )

        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        CompanyMembership.objects.create(
            user=self.other_user,
            company=self.other_company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.phase27_subscription = (
            _phase27_create_active_subscription(
                company=self.company,
                user=self.user,
                suffix="MAIN",
            )
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_whatsapp_settings_get_endpoint(self):
        response = self.client.get("/api/company/whatsapp/settings/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["setting"]["company_id"], self.company.id)
        self.assertEqual(response.data["setting"]["provider"], WhatsAppProvider.MOCK)

    def test_whatsapp_settings_post_endpoint(self):
        response = self.client.post(
            "/api/company/whatsapp/settings/",
            {
                "is_enabled": True,
                "provider": WhatsAppProvider.MOCK,
                "phone_number": "+966500000000",
                "default_country_code": "+966",
                "access_token": "hidden-token",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["setting"]["is_enabled"])
        self.assertEqual(response.data["setting"]["phone_number"], "+966500000000")
        self.assertTrue(response.data["setting"]["has_access_token"])
        self.assertNotIn("access_token", response.data["setting"])

    def test_templates_create_endpoint(self):
        response = self.client.post(
            "/api/company/whatsapp/templates/create/",
            {
                "name": "Invoice Template",
                "code": "invoice_template",
                "body": "Hello {{customer_name}}, invoice {{invoice_number}} is ready.",
                "status": WhatsAppTemplateStatus.ACTIVE,
                "language": "ar",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["template"]["company_id"], self.company.id)
        self.assertEqual(response.data["template"]["code"], "INVOICE_TEMPLATE")

    def test_templates_list_endpoint_is_tenant_isolated(self):
        create_whatsapp_template(
            company=self.company,
            name="Visible Template",
            code="visible_template",
            body="Visible body.",
        )

        create_whatsapp_template(
            company=self.other_company,
            name="Hidden Template",
            code="hidden_template",
            body="Hidden body.",
        )

        response = self.client.get("/api/company/whatsapp/templates/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Visible Template")

    def test_templates_detail_endpoint(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Detail Template",
            code="detail_template",
            body="Detail body.",
        )

        response = self.client.get(
            f"/api/company/whatsapp/templates/{template.id}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["template"]["id"], template.id)

    def test_templates_detail_blocks_other_company_template(self):
        template = create_whatsapp_template(
            company=self.other_company,
            name="Other Template",
            code="other_template",
            body="Other body.",
        )

        response = self.client.get(
            f"/api/company/whatsapp/templates/{template.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])

    def test_templates_update_endpoint(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Old Template",
            code="old_template",
            body="Old body.",
        )

        response = self.client.post(
            f"/api/company/whatsapp/templates/{template.id}/update/",
            {
                "name": "Updated Template",
                "code": "updated_template",
                "body": "Hello {{name}}",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["template"]["name"], "Updated Template")
        self.assertEqual(response.data["template"]["code"], "UPDATED_TEMPLATE")
        self.assertEqual(response.data["template"]["variables"], ["name"])

    def test_templates_status_endpoint(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Status API Template",
            code="status_api_template",
            body="Status body.",
        )

        response = self.client.post(
            f"/api/company/whatsapp/templates/{template.id}/status/",
            {
                "status": WhatsAppTemplateStatus.ACTIVE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["template"]["status"], WhatsAppTemplateStatus.ACTIVE)

    def test_messages_send_direct_body_endpoint(self):
        response = self.client.post(
            "/api/company/whatsapp/messages/send/",
            {
                "recipient_name": "Ahmed",
                "recipient_phone": "0500000000",
                "message_body": "Hello from Mhamcloud.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message_log"]["company_id"], self.company.id)
        self.assertEqual(response.data["message_log"]["status"], WhatsAppMessageStatus.SENT)
        self.assertEqual(response.data["message_log"]["recipient_phone"], "+966500000000")

    def test_messages_send_with_active_template_endpoint(self):
        template = create_whatsapp_template(
            company=self.company,
            name="Send Template",
            code="send_template",
            body="Hello {{name}}",
            status=WhatsAppTemplateStatus.ACTIVE,
        )

        response = self.client.post(
            "/api/company/whatsapp/messages/send/",
            {
                "recipient_phone": "0500000000",
                "template_id": template.id,
                "template_variables": {
                    "name": "Ahmed",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message_log"]["message_body"], "Hello Ahmed")
        self.assertEqual(response.data["message_log"]["template_id"], template.id)

    def test_messages_list_endpoint_is_tenant_isolated(self):
        create_message_log(
            company=self.company,
            recipient_phone="0500000000",
            message_body="Visible message.",
        )

        create_message_log(
            company=self.other_company,
            recipient_phone="0500000001",
            message_body="Hidden message.",
        )

        response = self.client.get("/api/company/whatsapp/messages/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["message_body"], "Visible message.")

    def test_messages_detail_endpoint(self):
        log = create_message_log(
            company=self.company,
            recipient_phone="0500000000",
            message_body="Detail message.",
        )

        response = self.client.get(
            f"/api/company/whatsapp/messages/{log.id}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message_log"]["id"], log.id)

    def test_messages_detail_blocks_other_company_message(self):
        log = create_message_log(
            company=self.other_company,
            recipient_phone="0500000001",
            message_body="Other company message.",
        )

        response = self.client.get(
            f"/api/company/whatsapp/messages/{log.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])
class SystemWhatsAppConnectionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="system_whatsapp_admin",
            email="system_whatsapp_admin@example.com",
            password="StrongPass123!",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    def test_system_whatsapp_connection_get_creates_singleton(self):
        response = self.client.get("/api/system/whatsapp/connection/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["connection"]["id"], 1)
        self.assertEqual(SystemWhatsAppConnection.objects.count(), 1)
    def test_system_whatsapp_connection_post_updates_settings_and_hides_secrets(self):
        response = self.client.post(
            "/api/system/whatsapp/connection/",
            {
                "is_enabled": True,
                "is_active": True,
                "provider": "WEB_SESSION",
                "business_name": "Mhamcloud Support",
                "phone_number": "+966500000000",
                "access_token": "secret-token",
                "webhook_verify_token": "secret-webhook-token",
                "session_name": "Mhamcloud-system-session",
                "default_country_code": "+966",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["connection"]["provider"], "WEB_SESSION")
        self.assertEqual(response.data["connection"]["phone_number"], "+966500000000")
        self.assertTrue(response.data["connection"]["has_access_token"])
        self.assertTrue(response.data["connection"]["has_webhook_verify_token"])
        self.assertNotIn("access_token", response.data["connection"])
        self.assertNotIn("webhook_verify_token", response.data["connection"])
    @patch("whatsapp.services._system_gateway_request")
    def test_system_whatsapp_connection_status_without_gateway_is_safe(self, mocked_gateway):
        mocked_gateway.return_value = {
            "success": False,
            "message": "System WhatsApp gateway is not configured.",
            "gateway_configured": False,
            "provider_status": "gateway_not_configured",
        }
        response = self.client.post(
            "/api/system/whatsapp/connection/status/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["success"])
        self.assertIn("connection", response.data)
        self.assertEqual(response.data["result"]["provider_status"], "gateway_not_configured")
        mocked_gateway.assert_called_once()

    @patch("whatsapp.services._system_gateway_request")
    def test_system_whatsapp_pairing_without_gateway_is_safe(self, mocked_gateway):
        mocked_gateway.return_value = {
            "success": False,
            "message": "System WhatsApp gateway is not configured.",
            "gateway_configured": False,
            "provider_status": "gateway_not_configured",
        }
        response = self.client.post(
            "/api/system/whatsapp/connection/pairing/",
            {"phone_number": "0500000000"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["success"])
        self.assertIn("connection", response.data)
        self.assertEqual(response.data["result"]["provider_status"], "gateway_not_configured")
        mocked_gateway.assert_called_once()

class SystemWhatsAppMessageLogTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="System WhatsApp Log Company",
            company_code="WA-SYS-LOG-001",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="system_whatsapp_log_user",
            email="system_whatsapp_log_user@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
    @patch("whatsapp.services._system_gateway_request")
    def test_system_whatsapp_send_test_message_creates_message_log(self, mocked_gateway):
        from whatsapp.services import system_whatsapp_send_test_message
        mocked_gateway.return_value = {
            "success": True,
            "message": "Message accepted by WhatsApp server.",
            "provider_status": "sent_to_whatsapp_server",
            "session_status": "connected",
            "connected": True,
            "connected_phone": "966505263775",
            "device_label": "Mazen",
            "message_id": "wamid.system.test.001",
            "external_message_id": "wamid.system.test.001",
            "recipient_jid": "966551559556@s.whatsapp.net",
            "remote_jid": "966551559556@s.whatsapp.net",
        }
        payload = system_whatsapp_send_test_message(
            recipient_phone="0551559556",
            message_body="System WhatsApp logged message.",
            user=self.user,
        )
        self.assertTrue(payload["success"])
        self.assertIn("message_log", payload)
        log = WhatsAppMessageLog.objects.get(message_body="System WhatsApp logged message.")
        self.assertEqual(log.company, self.company)
        self.assertEqual(log.status, WhatsAppMessageStatus.SENT)
        self.assertEqual(log.source_type, "SYSTEM")
        self.assertEqual(log.recipient_phone, "+966551559556")
        self.assertEqual(log.provider_message_id, "wamid.system.test.001")
        self.assertEqual(log.provider_response["provider_status"], "sent_to_whatsapp_server")
        self.assertEqual(payload["message_log"]["id"], log.id)
    @patch("whatsapp.services._system_gateway_request")
    def test_system_whatsapp_send_test_message_logs_gateway_failure(self, mocked_gateway):
        from whatsapp.services import system_whatsapp_send_test_message
        mocked_gateway.return_value = {
            "success": False,
            "message": "Gateway failed.",
            "error_message": "Gateway failed.",
            "provider_status": "gateway_failed",
            "session_status": "connected",
            "connected": True,
        }
        payload = system_whatsapp_send_test_message(
            recipient_phone="0551559556",
            message_body="System WhatsApp failed message.",
            user=self.user,
        )
        self.assertFalse(payload["success"])
        log = WhatsAppMessageLog.objects.get(message_body="System WhatsApp failed message.")
        self.assertEqual(log.status, WhatsAppMessageStatus.FAILED)
        self.assertEqual(log.error_message, "Gateway failed.")
        self.assertEqual(log.provider_response["provider_status"], "gateway_failed")
class SystemWhatsAppPhoneNormalizationTests(TestCase):
    def setUp(self):
        from companies.models import Company
        from django.contrib.auth import get_user_model
        self.company = Company.objects.create(
            name="System WhatsApp Phone Normalize Company",
            company_code="WA-PHONE-NORM-001",
            is_active=True,
        )
        self.user = get_user_model().objects.create_user(
            username="system_whatsapp_phone_normalize_user",
            email="system_whatsapp_phone_normalize_user@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
    def test_system_test_phone_normalization_accepts_saudi_local_and_international(self):
        from whatsapp.services import _normalize_system_whatsapp_test_phone
        cases = [
            ("0505263775", "+966505263775"),
            ("505263775", "+966505263775"),
            ("966505263775", "+966505263775"),
            ("+966505263775", "+966505263775"),
            ("00966505263775", "+966505263775"),
            ("+971501234567", "+971501234567"),
            ("00971501234567", "+971501234567"),
            ("971501234567", "+971501234567"),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(
                    _normalize_system_whatsapp_test_phone(
                        phone_number=raw,
                        default_country_code="966+",
                    ),
                    expected,
                )
    @patch("whatsapp.services._system_gateway_request")
    def test_system_test_message_does_not_duplicate_saudi_country_code(self, mocked_gateway):
        from django.apps import apps
        from whatsapp.services import system_whatsapp_send_test_message
        mocked_gateway.return_value = {
            "success": True,
            "message": "Message accepted by WhatsApp server.",
            "provider_status": "sent_to_whatsapp_server",
            "session_status": "connected",
            "status": "connected",
            "connected": True,
            "connected_phone": "966505263775",
            "phone_number": "966505263775",
            "device_label": "Mazen",
            "message_id": "wamid.phone.normalize.001",
            "external_message_id": "wamid.phone.normalize.001",
            "recipient_jid": "966503185950@s.whatsapp.net",
            "remote_jid": "966503185950@s.whatsapp.net",
        }
        payload = system_whatsapp_send_test_message(
            recipient_phone="966503185950",
            message_body="System WhatsApp normalized phone message.",
            user=self.user,
        )
        self.assertTrue(payload["success"])
        gateway_payload = mocked_gateway.call_args.kwargs["payload"]
        self.assertEqual(gateway_payload["to_phone"], "+966503185950")
        Log = apps.get_model("whatsapp", "WhatsAppMessageLog")
        log = Log.objects.get(message_body="System WhatsApp normalized phone message.")
        self.assertEqual(log.recipient_phone, "+966503185950")
        self.assertNotEqual(log.recipient_phone, "+966966503185950")

class SystemWhatsAppReadyTemplateSeedTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="system_whatsapp_template_seed_user",
            email="system_whatsapp_template_seed_user@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
    def test_seed_system_whatsapp_ready_templates_is_idempotent_and_bilingual(self):
        from whatsapp.models import WhatsAppTemplate
        from whatsapp.services import (
            SYSTEM_WHATSAPP_READY_TEMPLATES,
            seed_system_whatsapp_ready_templates,
        )
        first = seed_system_whatsapp_ready_templates(user=self.user)
        second = seed_system_whatsapp_ready_templates(user=self.user)
        self.assertTrue(first["success"])
        self.assertEqual(first["created_count"], len(SYSTEM_WHATSAPP_READY_TEMPLATES))
        self.assertEqual(second["created_count"], 0)
        self.assertEqual(second["updated_count"], len(SYSTEM_WHATSAPP_READY_TEMPLATES))
        queryset = WhatsAppTemplate.objects.filter(
            metadata__scope="SYSTEM",
            status=WhatsAppTemplateStatus.ACTIVE,
        )
        self.assertEqual(queryset.count(), len(SYSTEM_WHATSAPP_READY_TEMPLATES))
        company_activated = WhatsAppTemplate.objects.get(code="SYSTEM_COMPANY_ACTIVATED")
        self.assertEqual(company_activated.name, "تفعيل شركة")
        self.assertIn("تم تفعيل شركة", company_activated.body)
        self.assertNotIn("????", company_activated.name)
        self.assertNotIn("????", company_activated.body)
        self.assertEqual(company_activated.metadata["i18n"]["en"]["name"], "Company activated")
        invoice_pdf = WhatsAppTemplate.objects.get(code="SYSTEM_INVOICE_PDF_READY")
        self.assertEqual(invoice_pdf.language, "ar")
        self.assertEqual(invoice_pdf.status, WhatsAppTemplateStatus.ACTIVE)
        self.assertIn("pdf_url", invoice_pdf.variables)
        self.assertEqual(invoice_pdf.metadata["module"], "billing")
        self.assertEqual(invoice_pdf.metadata["i18n"]["ar"]["name"], "إرسال PDF الفاتورة")
        self.assertEqual(invoice_pdf.metadata["i18n"]["en"]["name"], "Invoice PDF ready")

from django.test import TestCase as WhatsAppInboxDjangoTestCase
class WhatsAppInboxFoundationTests(WhatsAppInboxDjangoTestCase):
    def test_record_system_incoming_message_creates_contact_conversation_message_and_event(self):
        from whatsapp.models import (
            WhatsAppContact,
            WhatsAppConversation,
            WhatsAppConversationMessage,
            WhatsAppWebhookEvent,
        )
        from whatsapp.services import record_system_whatsapp_incoming_message
        payload = {
            "session_name": "Mhamcloud-system-session",
            "from_jid": "966501234567@s.whatsapp.net",
            "from_phone": "0501234567",
            "push_name": "زائر تجربة",
            "message_id": "MSG-INBOX-TEST-001",
            "body": "السلام عليكم، أحتاج تجربة محادثة واتساب من العائمة.",
            "timestamp": "2026-06-27T18:30:00+03:00",
            "metadata": {"source": "landing_widget"},
        }
        result = record_system_whatsapp_incoming_message(payload)
        self.assertTrue(result["success"])
        self.assertFalse(result["duplicate"])
        self.assertEqual(WhatsAppContact.objects.count(), 1)
        self.assertEqual(WhatsAppConversation.objects.count(), 1)
        self.assertEqual(WhatsAppConversationMessage.objects.count(), 1)
        self.assertEqual(WhatsAppWebhookEvent.objects.count(), 1)
        contact = WhatsAppContact.objects.get()
        conversation = WhatsAppConversation.objects.get()
        message = WhatsAppConversationMessage.objects.get()
        event = WhatsAppWebhookEvent.objects.get()
        self.assertEqual(contact.scope, "SYSTEM")
        self.assertIsNone(contact.company_id)
        self.assertEqual(contact.normalized_phone, "966501234567")
        self.assertEqual(contact.push_name, "زائر تجربة")
        self.assertEqual(conversation.scope, "SYSTEM")
        self.assertEqual(conversation.status, "OPEN")
        self.assertEqual(conversation.unread_count, 1)
        self.assertIn("السلام عليكم", conversation.last_message_preview)
        self.assertEqual(message.direction, "INBOUND")
        self.assertEqual(message.status, "RECEIVED")
        self.assertEqual(message.external_message_id, "MSG-INBOX-TEST-001")
        self.assertIn("تجربة محادثة", message.body)
        self.assertEqual(event.status, "PROCESSED")
        self.assertEqual(event.external_message_id, "MSG-INBOX-TEST-001")
    def test_record_system_incoming_message_is_idempotent_by_message_id(self):
        from whatsapp.models import (
            WhatsAppContact,
            WhatsAppConversation,
            WhatsAppConversationMessage,
            WhatsAppWebhookEvent,
        )
        from whatsapp.services import record_system_whatsapp_incoming_message
        payload = {
            "session_name": "Mhamcloud-system-session",
            "from_jid": "966501234567@s.whatsapp.net",
            "message_id": "MSG-INBOX-TEST-002",
            "body": "رسالة مكررة للاختبار.",
        }
        first = record_system_whatsapp_incoming_message(payload)
        second = record_system_whatsapp_incoming_message(payload)
        self.assertTrue(first["success"])
        self.assertTrue(second["success"])
        self.assertFalse(first["duplicate"])
        self.assertTrue(second["duplicate"])
        self.assertEqual(WhatsAppContact.objects.count(), 1)
        self.assertEqual(WhatsAppConversation.objects.count(), 1)
        self.assertEqual(WhatsAppConversationMessage.objects.count(), 1)
        self.assertEqual(WhatsAppWebhookEvent.objects.count(), 1)

from django.test import Client as SystemWhatsAppInboxWebhookClient
from django.test import TestCase as SystemWhatsAppInboxWebhookDjangoTestCase
from django.test import override_settings as system_whatsapp_inbox_override_settings
class SystemWhatsAppInboxWebhookAPITests(SystemWhatsAppInboxWebhookDjangoTestCase):
    @system_whatsapp_inbox_override_settings(DEBUG=True)
    def test_system_whatsapp_inbox_webhook_records_incoming_message(self):
        import json
        from whatsapp.models import (
            WhatsAppContact,
            WhatsAppConversation,
            WhatsAppConversationMessage,
            WhatsAppWebhookEvent,
        )
        client = SystemWhatsAppInboxWebhookClient()
        response = client.post(
            "/api/system/whatsapp/inbox/webhook/",
            data=json.dumps(
                {
                    "session_name": "Mhamcloud-system-session",
                    "from_jid": "966502222333@s.whatsapp.net",
                    "from_phone": "0502222333",
                    "push_name": "زائر من الواتساب",
                    "message_id": "WEBHOOK-INBOX-TEST-001",
                    "body": "رسالة واردة من Gateway إلى Django.",
                    "timestamp": "2026-06-27T19:00:00+03:00",
                },
                ensure_ascii=False,
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertFalse(payload["duplicate"])
        self.assertEqual(WhatsAppContact.objects.count(), 1)
        self.assertEqual(WhatsAppConversation.objects.count(), 1)
        self.assertEqual(WhatsAppConversationMessage.objects.count(), 1)
        self.assertEqual(WhatsAppWebhookEvent.objects.count(), 1)
        message = WhatsAppConversationMessage.objects.get()
        self.assertEqual(message.direction, "INBOUND")
        self.assertEqual(message.external_message_id, "WEBHOOK-INBOX-TEST-001")
        self.assertIn("Gateway", message.body)
    @system_whatsapp_inbox_override_settings(DEBUG=True)
    def test_system_whatsapp_inbox_webhook_is_idempotent(self):
        import json
        from whatsapp.models import WhatsAppConversationMessage
        client = SystemWhatsAppInboxWebhookClient()
        body = json.dumps(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": "966502222333@s.whatsapp.net",
                "message_id": "WEBHOOK-INBOX-TEST-002",
                "body": "رسالة واردة مكررة.",
            },
            ensure_ascii=False,
        )
        first = client.post(
            "/api/system/whatsapp/inbox/webhook/",
            data=body,
            content_type="application/json",
        )
        second = client.post(
            "/api/system/whatsapp/inbox/webhook/",
            data=body,
            content_type="application/json",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertFalse(first.json()["duplicate"])
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(WhatsAppConversationMessage.objects.count(), 1)

from django.test import TestCase as WhatsAppInboxReplyDjangoTestCase
class WhatsAppInboxReplyServiceTests(WhatsAppInboxReplyDjangoTestCase):
    def test_send_system_whatsapp_inbox_reply_uses_contact_jid_and_records_outbound_message(self):
        from unittest.mock import patch
        from django.contrib.auth import get_user_model
        from whatsapp.models import WhatsAppConversationMessage
        from whatsapp.services import (
            record_system_whatsapp_incoming_message,
            send_system_whatsapp_inbox_reply,
        )
        User = get_user_model()
        user = User.objects.create_user(
            username="system-reply-user",
            email="system-reply@example.com",
            password="pass",
            is_staff=True,
            is_superuser=True,
        )
        incoming = record_system_whatsapp_incoming_message(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": "267829899169938@lid",
                "from_phone": "267829899169938",
                "push_name": "M.s💙",
                "message_id": "REPLY-SERVICE-INBOUND-001",
                "body": "اختبار وارد قبل الرد.",
            }
        )
        conversation_id = incoming["conversation"]["id"]
        from whatsapp.models import WhatsAppConversation
        conversation = WhatsAppConversation.objects.select_related("contact").get(id=conversation_id)
        with patch(
            "whatsapp.services._post_system_whatsapp_gateway_text",
            return_value={
                "success": True,
                "provider_status": "sent_to_whatsapp_server_unverified_recipient",
                "message_id": "GATEWAY-REPLY-001",
                "recipient_jid": "267829899169938@lid",
            },
        ) as gateway_call:
            result = send_system_whatsapp_inbox_reply(
                conversation=conversation,
                body="تم استلام رسالتك من داخل النظام.",
                user=user,
            )
        self.assertTrue(result["success"])
        gateway_call.assert_called_once()
        call_kwargs = gateway_call.call_args.kwargs
        self.assertEqual(call_kwargs["to_jid"], "267829899169938@lid")
        self.assertEqual(call_kwargs["body"], "تم استلام رسالتك من داخل النظام.")
        messages = WhatsAppConversationMessage.objects.order_by("id")
        self.assertEqual(messages.count(), 2)
        outbound = messages.last()
        self.assertEqual(outbound.direction, "OUTBOUND")
        self.assertEqual(outbound.status, "SENT")
        self.assertEqual(outbound.external_message_id, "GATEWAY-REPLY-001")
        self.assertEqual(outbound.provider_response["reply_target"]["to_jid"], "267829899169938@lid")
        conversation.refresh_from_db()
        self.assertEqual(conversation.unread_count, 0)
        self.assertEqual(conversation.last_message_preview, "تم استلام رسالتك من داخل النظام.")

class CompanyWhatsAppConnectionGatewayAPITests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="Company WhatsApp Gateway",
            company_code="WA-GW-001",
            is_active=True,
        )
        self.other_company = Company.objects.create(
            name="Other Company WhatsApp Gateway",
            company_code="WA-GW-002",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="company_whatsapp_gateway_user",
            email="company_whatsapp_gateway_user@example.com",
            password="StrongPass123!",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )
        self.phase27_subscription = (
            _phase27_create_active_subscription(
                company=self.company,
                user=self.user,
                suffix="GATEWAY",
            )
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    def test_company_connection_get_uses_current_company(self):
        response = self.client.get("/api/company/whatsapp/connection/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["connection"]["company_id"], self.company.id)
        self.assertEqual(
            response.data["connection"]["session_name"],
            f"company-{self.company.id}-whatsapp",
        )
    @patch("whatsapp.services._company_gateway_request")
    def test_company_connection_status_uses_backend_owned_session_name(self, mocked_gateway):
        mocked_gateway.return_value = {
            "success": True,
            "message": "Session status loaded.",
            "gateway_configured": True,
            "session_status": "connected",
            "connected": True,
            "connected_phone": "966500000000",
            "device_label": "Test Gateway",
        }
        response = self.client.post("/api/company/whatsapp/connection/status/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["connection"]["company_id"], self.company.id)
        self.assertEqual(
            response.data["connection"]["session_name"],
            f"company-{self.company.id}-whatsapp",
        )
        self.assertTrue(response.data["connection"]["connected"])
        call_payload = mocked_gateway.call_args.kwargs["payload"]
        self.assertEqual(
            call_payload["session_name"],
            f"company-{self.company.id}-whatsapp",
        )
    @patch("whatsapp.services._company_gateway_request")
    def test_company_connection_qr_ignores_frontend_session_name(self, mocked_gateway):
        mocked_gateway.return_value = {
            "success": True,
            "message": "QR requested.",
            "gateway_configured": True,
            "session_status": "qr_pending",
            "connected": False,
            "qr_code": "data:image/png;base64,test",
        }
        response = self.client.post(
            "/api/company/whatsapp/connection/qr/",
            {
                "session_name": "system-platform-session",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["connection"]["session_name"],
            f"company-{self.company.id}-whatsapp",
        )
        call_payload = mocked_gateway.call_args.kwargs["payload"]
        self.assertEqual(
            call_payload["session_name"],
            f"company-{self.company.id}-whatsapp",
        )

    @patch("whatsapp.services._company_gateway_request")
    def test_company_connection_test_message_normalizes_966_without_double_prefix(self, mocked_gateway):
        mocked_gateway.return_value = {
            "success": True,
            "message": "Message accepted by WhatsApp server.",
            "gateway_configured": True,
            "session_status": "connected",
            "connected": True,
            "external_message_id": "gw-normalized-phone-message-id",
        }
        response = self.client.post(
            "/api/company/whatsapp/connection/test/",
            {
                "recipient_phone": "966503185950",
                "message_body": "Gateway normalized phone test.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        call_payload = mocked_gateway.call_args.kwargs["payload"]
        self.assertEqual(call_payload["to_phone"], "+966503185950")
        self.assertNotEqual(call_payload["to_phone"], "+966966503185950")
        self.assertEqual(response.data["message_log"]["recipient_phone"], "+966503185950")

    @patch("whatsapp.services._company_gateway_request")
    def test_company_connection_test_message_logs_result_for_current_company(self, mocked_gateway):
        mocked_gateway.return_value = {
            "success": True,
            "message": "Message accepted by WhatsApp server.",
            "gateway_configured": True,
            "session_status": "connected",
            "connected": True,
            "external_message_id": "gw-test-message-id",
        }
        response = self.client.post(
            "/api/company/whatsapp/connection/test/",
            {
                "recipient_phone": "0500000000",
                "message_body": "Gateway test.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message_log"]["company_id"], self.company.id)
        self.assertEqual(response.data["message_log"]["provider_message_id"], "gw-test-message-id")

class CompanyWhatsAppInboxAPITests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        from companies.models import Company
        from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
        User = get_user_model()
        self.company = Company.objects.create(
            name="Company WhatsApp Inbox",
            company_code="WA-INBOX-001",
            is_active=True,
        )
        self.other_company = Company.objects.create(
            name="Other Company WhatsApp Inbox",
            company_code="WA-INBOX-002",
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="company_whatsapp_inbox_user",
            email="company_whatsapp_inbox_user@example.com",
            password="StrongPass123!",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )
        self.phase27_subscription = (
            _phase27_create_active_subscription(
                company=self.company,
                user=self.user,
                suffix="INBOX",
            )
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    def _create_conversation(self, *, company=None, body="Inbound hello"):
        from django.utils import timezone
        from whatsapp.models import (
            WhatsAppContact,
            WhatsAppConversation,
            WhatsAppConversationMessage,
            WhatsAppInboxScope,
        )
        company = company or self.company
        session_name = f"company-{company.id}-whatsapp"
        contact = WhatsAppContact.objects.create(
            scope=WhatsAppInboxScope.COMPANY,
            company=company,
            session_name=session_name,
            phone_number="966500000000",
            normalized_phone="966500000000",
            whatsapp_jid="966500000000@s.whatsapp.net",
            display_name="Inbox Contact",
            push_name="Inbox Contact",
        )
        conversation = WhatsAppConversation.objects.create(
            scope=WhatsAppInboxScope.COMPANY,
            company=company,
            contact=contact,
            session_name=session_name,
            status="OPEN",
            last_message_preview=body,
            last_message_at=timezone.now(),
            unread_count=1,
        )
        message = WhatsAppConversationMessage.objects.create(
            conversation=conversation,
            contact=contact,
            company=company,
            scope=WhatsAppInboxScope.COMPANY,
            session_name=session_name,
            direction="INBOUND",
            status="RECEIVED",
            message_type="TEXT",
            body=body,
            external_message_id=f"INBOX-{company.id}-{conversation.id}",
            provider="WHATSAPP_GATEWAY",
            provider_response={"from_jid": contact.whatsapp_jid},
            received_at=timezone.now(),
        )
        return conversation, message
    def test_company_inbox_conversations_list_is_tenant_scoped(self):
        visible, _ = self._create_conversation(body="Visible company inbox.")
        self._create_conversation(company=self.other_company, body="Hidden company inbox.")
        response = self.client.get("/api/company/whatsapp/conversations/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["conversations"][0]["id"], visible.id)
        self.assertEqual(response.data["conversations"][0]["company_id"], self.company.id)
    def test_company_inbox_messages_endpoint_returns_messages_and_marks_read(self):
        conversation, message = self._create_conversation(body="Read me.")
        response = self.client.get(
            f"/api/company/whatsapp/conversations/{conversation.id}/messages/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["conversation"]["id"], conversation.id)
        self.assertEqual(response.data["messages"][0]["id"], message.id)
        conversation.refresh_from_db()
        self.assertEqual(conversation.unread_count, 0)
    def test_company_inbox_messages_blocks_other_company_conversation(self):
        conversation, _ = self._create_conversation(
            company=self.other_company,
            body="Hidden message.",
        )
        response = self.client.get(
            f"/api/company/whatsapp/conversations/{conversation.id}/messages/"
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])
    @patch("whatsapp.services._post_system_whatsapp_gateway_text")
    def test_company_inbox_reply_uses_company_conversation_session(self, mocked_gateway):
        conversation, _ = self._create_conversation(body="Need reply.")
        mocked_gateway.return_value = {
            "success": True,
            "message": "Reply accepted.",
            "message_id": "COMPANY-INBOX-REPLY-001",
            "provider_status": "sent_to_whatsapp_server",
        }
        response = self.client.post(
            f"/api/company/whatsapp/conversations/{conversation.id}/reply/",
            {"body": "Company reply."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["reply"]["body"], "Company reply.")
        self.assertEqual(response.data["reply"]["scope"], "COMPANY")
        self.assertEqual(response.data["reply"]["company_id"], self.company.id)
        call_kwargs = mocked_gateway.call_args.kwargs
        self.assertEqual(call_kwargs["session_name"], f"company-{self.company.id}-whatsapp")

class CompanyWhatsAppIncomingWebhookRoutingTests(TestCase):
    def test_company_session_incoming_webhook_routes_to_company_inbox(self):
        from companies.models import Company
        from whatsapp.models import (
            WhatsAppContact,
            WhatsAppConversation,
            WhatsAppConversationMessage,
            WhatsAppInboxScope,
            WhatsAppWebhookEvent,
        )
        from whatsapp.services import (
            get_or_create_company_whatsapp_connection,
            record_whatsapp_incoming_message,
        )
        company = Company.objects.create(
            name="Incoming WhatsApp Company",
            company_code="WA-INCOMING-001",
            is_active=True,
        )
        get_or_create_company_whatsapp_connection(company=company)
        payload = {
            "session_name": f"company-{company.id}-whatsapp",
            "from_jid": "160885213536366@lid",
            "from_phone": "966500111222",
            "push_name": "Incoming Customer",
            "message_id": "COMPANY-INCOMING-WEBHOOK-001",
            "body": "????? ????? ??? ????? ??????.",
            "timestamp": "2026-07-01T20:00:00+03:00",
        }
        result = record_whatsapp_incoming_message(payload)
        self.assertTrue(result["success"])
        self.assertFalse(result["duplicate"])
        self.assertEqual(result["scope"], "COMPANY")
        self.assertEqual(result["company_id"], company.id)
        contact = WhatsAppContact.objects.get()
        conversation = WhatsAppConversation.objects.get()
        message = WhatsAppConversationMessage.objects.get()
        event = WhatsAppWebhookEvent.objects.get()
        self.assertEqual(contact.scope, WhatsAppInboxScope.COMPANY)
        self.assertEqual(contact.company_id, company.id)
        self.assertEqual(conversation.scope, WhatsAppInboxScope.COMPANY)
        self.assertEqual(conversation.company_id, company.id)
        self.assertEqual(conversation.session_name, f"company-{company.id}-whatsapp")
        self.assertEqual(conversation.unread_count, 1)
        self.assertEqual(message.direction, "INBOUND")
        self.assertEqual(message.status, "RECEIVED")
        self.assertEqual(message.company_id, company.id)
        self.assertEqual(message.external_message_id, "COMPANY-INCOMING-WEBHOOK-001")
        self.assertEqual(event.status, "PROCESSED")
    def test_system_session_incoming_webhook_stays_system_inbox(self):
        from whatsapp.models import WhatsAppConversationMessage
        from whatsapp.services import record_whatsapp_incoming_message
        result = record_whatsapp_incoming_message(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": "966501234567@s.whatsapp.net",
                "message_id": "SYSTEM-INCOMING-WEBHOOK-001",
                "body": "????? ????? ??????.",
            }
        )
        self.assertTrue(result["success"])
        message = WhatsAppConversationMessage.objects.get()
        self.assertEqual(message.scope, "SYSTEM")
        self.assertIsNone(message.company_id)

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
import tempfile


class WhatsAppMediaFoundationSerializationTests(TestCase):
    def test_gateway_payload_sanitizer_drops_uploaded_file_objects(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from whatsapp.services import _sanitize_whatsapp_gateway_payload

        media = SimpleUploadedFile(
            "photo.jpg",
            b"fake-jpeg-bytes",
            content_type="image/jpeg",
        )
        payload = {
            "message_type": "IMAGE",
            "media": media,
            "metadata": {"source": "gateway"},
        }

        clean = _sanitize_whatsapp_gateway_payload(payload)

        self.assertEqual(clean["message_type"], "IMAGE")
        self.assertEqual(clean["metadata"], {"source": "gateway"})
        self.assertNotIn("media", clean)


class WhatsAppMediaFoundationTests(TestCase):
    def test_system_image_creates_attachment_and_serializer_contract(self):
        from whatsapp.models import WhatsAppMessageAttachment
        from whatsapp.services import record_system_whatsapp_incoming_message

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                media = SimpleUploadedFile(
                    "photo.jpg",
                    b"fake-jpeg-bytes",
                    content_type="image/jpeg",
                )
                result = record_system_whatsapp_incoming_message(
                    {
                        "session_name": "Mhamcloud-system-session",
                        "from_jid": "966501111111@s.whatsapp.net",
                        "message_id": "MEDIA-SYSTEM-IMAGE-001",
                        "body": "صورة اختبار",
                        "message_type": "IMAGE",
                        "media_mime_type": "image/jpeg",
                        "media_filename": "photo.jpg",
                        "media_size": len(b"fake-jpeg-bytes"),
                    },
                    media_file=media,
                )
                self.assertTrue(result["success"])
                attachment = WhatsAppMessageAttachment.objects.get()
                self.assertEqual(attachment.attachment_type, "IMAGE")
                self.assertEqual(attachment.mime_type, "image/jpeg")
                self.assertEqual(attachment.file_size, len(b"fake-jpeg-bytes"))
                self.assertEqual(len(result["message"]["attachments"]), 1)

    def test_company_incoming_preserves_media_message_type(self):
        from whatsapp.models import WhatsAppConversationMessage
        from whatsapp.services import get_or_create_company_whatsapp_connection, record_whatsapp_incoming_message

        company = Company.objects.create(
            name="Media Company",
            company_code="WA-MEDIA-001",
            is_active=True,
        )
        get_or_create_company_whatsapp_connection(company=company)

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                media = SimpleUploadedFile(
                    "sticker.webp",
                    b"fake-webp-bytes",
                    content_type="image/webp",
                )
                result = record_whatsapp_incoming_message(
                    {
                        "session_name": f"company-{company.id}-whatsapp",
                        "from_jid": "966502222222@s.whatsapp.net",
                        "message_id": "MEDIA-COMPANY-STICKER-001",
                        "body": "[STICKER]",
                        "message_type": "STICKER",
                        "media_mime_type": "image/webp",
                        "media_filename": "sticker.webp",
                        "media_size": len(b"fake-webp-bytes"),
                    },
                    media_file=media,
                )
                self.assertTrue(result["success"])
                message = WhatsAppConversationMessage.objects.get()
                self.assertEqual(message.message_type, "STICKER")
                self.assertEqual(message.attachments.count(), 1)

    def test_media_rejects_mismatched_mime_type(self):
        from whatsapp.services import record_system_whatsapp_incoming_message

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                media = SimpleUploadedFile(
                    "payload.exe",
                    b"unsafe",
                    content_type="application/octet-stream",
                )
                with self.assertRaises(ValueError):
                    record_system_whatsapp_incoming_message(
                        {
                            "session_name": "Mhamcloud-system-session",
                            "from_jid": "966503333333@s.whatsapp.net",
                            "message_id": "MEDIA-BAD-MIME-001",
                            "body": "[IMAGE]",
                            "message_type": "IMAGE",
                            "media_mime_type": "application/octet-stream",
                        },
                        media_file=media,
                    )


# V2-12D9 regression: Inbox reads and mutations must use the canonical
# System WhatsApp view/manage permission contracts.
class SystemWhatsAppInboxPermissionContractTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        User = get_user_model()
        self.user = User.objects.create_user(
            username="system_whatsapp_inbox_permission_user",
            email="system_whatsapp_inbox_permission_user@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_inbox_permission_helpers_delegate_to_canonical_contract(self):
        from unittest.mock import patch
        from api.system.whatsapp.views import (
            _system_whatsapp_inbox_can_manage,
            _system_whatsapp_inbox_can_view,
        )

        with patch("api.system.whatsapp.views._can_view", return_value=True) as can_view:
            self.assertTrue(_system_whatsapp_inbox_can_view(self.user))
            can_view.assert_called_once_with(self.user)

        with patch("api.system.whatsapp.views._can_manage", return_value=False) as can_manage:
            self.assertFalse(_system_whatsapp_inbox_can_manage(self.user))
            can_manage.assert_called_once_with(self.user)

    def test_view_only_contract_can_read_inbox_but_cannot_reply(self):
        from unittest.mock import patch

        with patch(
            "api.system.whatsapp.views._can_view",
            return_value=True,
        ), patch(
            "api.system.whatsapp.views._can_manage",
            return_value=False,
        ):
            list_response = self.client.get("/api/system/whatsapp/inbox/")
            self.assertEqual(list_response.status_code, 200)
            self.assertTrue(list_response.data["success"])

            reply_response = self.client.post(
                "/api/system/whatsapp/inbox/999999/reply/",
                {"body": "This must remain management-protected."},
                format="json",
            )
            self.assertEqual(reply_response.status_code, 403)
            self.assertFalse(reply_response.data["success"])
            self.assertIn("permission", reply_response.data["errors"])

    def test_primey_super_admin_profile_can_manage_without_django_superuser(self):
        from accounts.models import SystemRole, UserProfile, UserProfileStatus, WorkspaceType
        from api.system.whatsapp.views import _can_manage

        self.user.is_staff = False
        self.user.is_superuser = False
        self.user.save(update_fields=["is_staff", "is_superuser"])
        UserProfile.objects.create(
            user=self.user,
            display_name="Primey Super Admin",
            status=UserProfileStatus.ACTIVE,
            default_workspace=WorkspaceType.SYSTEM,
            system_role=SystemRole.SUPER_ADMIN,
            is_system_user=True,
        )
        self.assertFalse(self.user.is_superuser)
        self.assertFalse(self.user.is_staff)
        self.assertTrue(_can_manage(self.user))

    def test_user_without_view_contract_cannot_read_inbox(self):
        from unittest.mock import patch

        with patch("api.system.whatsapp.views._can_view", return_value=False):
            response = self.client.get("/api/system/whatsapp/inbox/")
            self.assertEqual(response.status_code, 403)
            self.assertFalse(response.data["success"])
            self.assertIn("permission", response.data["errors"])



class SystemWhatsAppUnifiedHistoryTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.user = User.objects.create_superuser(
            username="system_whatsapp_history_admin",
            email="system_whatsapp_history_admin@example.com",
            password="StrongPass123!",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_messages_list_includes_real_system_inbox_chat_messages(self):
        from whatsapp.services import record_system_whatsapp_incoming_message

        created = record_system_whatsapp_incoming_message(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": "966501111222@s.whatsapp.net",
                "from_phone": "0501111222",
                "push_name": "History Contact",
                "message_id": "HISTORY-INBOUND-001",
                "body": "رسالة محادثة حقيقية يجب أن تظهر في سجل الرسائل.",
            }
        )
        self.assertTrue(created["success"])

        response = self.client.get("/api/system/whatsapp/messages/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["history_source"], "UNIFIED")

        target = next(
            item
            for item in response.data["results"]
            if item.get("provider_message_id") == "HISTORY-INBOUND-001"
        )
        self.assertEqual(target["source_record_type"], "INBOX_MESSAGE")
        self.assertEqual(target["direction"], "INBOUND")
        self.assertEqual(target["status"], "RECEIVED")
        self.assertEqual(target["message_type"], "TEXT")
        self.assertIn("رسالة محادثة حقيقية", target["message_body"])
        self.assertEqual(target["recipient_name"], "History Contact")

    def test_messages_list_keeps_legacy_logs_and_avoids_duplicate_external_id(self):
        from whatsapp.services import create_message_log, record_system_whatsapp_incoming_message

        company = Company.objects.create(
            name="Unified History Legacy Company",
            company_code="WA-HISTORY-LEGACY",
            is_active=True,
        )

        record_system_whatsapp_incoming_message(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": "966503333444@s.whatsapp.net",
                "from_phone": "0503333444",
                "push_name": "Duplicate Contact",
                "message_id": "HISTORY-DUP-001",
                "body": "Unified duplicate candidate.",
            }
        )

        duplicate_log = create_message_log(
            company=company,
            recipient_phone="0503333444",
            recipient_name="Duplicate Contact",
            message_body="Legacy copy of unified duplicate.",
            created_by=self.user,
        )
        duplicate_log.provider_message_id = "HISTORY-DUP-001"
        duplicate_log.status = "SENT"
        duplicate_log.save(update_fields=["provider_message_id", "status", "updated_at"])

        legacy_only = create_message_log(
            company=company,
            recipient_phone="0505555666",
            recipient_name="Legacy Only",
            message_body="Legacy-only audit row.",
            created_by=self.user,
        )

        response = self.client.get("/api/system/whatsapp/messages/")
        self.assertEqual(response.status_code, 200)
        rows = response.data["results"]

        matching_external = [
            item for item in rows
            if item.get("provider_message_id") == "HISTORY-DUP-001"
        ]
        self.assertEqual(len(matching_external), 1)
        self.assertEqual(matching_external[0]["source_record_type"], "INBOX_MESSAGE")

        legacy_ids = {
            item.get("source_record_id")
            for item in rows
            if item.get("source_record_type") == "MESSAGE_LOG"
        }
        self.assertIn(legacy_only.id, legacy_ids)
        self.assertNotIn(duplicate_log.id, legacy_ids)

    def test_messages_list_filters_real_inbox_by_direction_and_status(self):
        from whatsapp.services import record_system_whatsapp_incoming_message

        record_system_whatsapp_incoming_message(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": "966507777888@s.whatsapp.net",
                "message_id": "HISTORY-FILTER-001",
                "body": "Inbound history filter row.",
            }
        )

        response = self.client.get(
            "/api/system/whatsapp/messages/?direction=INBOUND&status=RECEIVED"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(
            all(item["direction"] == "INBOUND" for item in response.data["results"])
        )
        self.assertTrue(
            all(item["status"] == "RECEIVED" for item in response.data["results"])
        )


class SystemWhatsAppReplyQuoteContractTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_whatsapp_reply_quote_admin",
            email="system_whatsapp_reply_quote_admin@example.com",
            password="StrongPass123!",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _conversation_with_inbound(self, suffix="001"):
        from whatsapp.models import WhatsAppConversation
        from whatsapp.services import record_system_whatsapp_incoming_message

        payload = record_system_whatsapp_incoming_message(
            {
                "session_name": "Mhamcloud-system-session",
                "from_jid": f"96650123{suffix}@s.whatsapp.net",
                "from_phone": f"96650123{suffix}",
                "push_name": f"Quote Contact {suffix}",
                "message_id": f"QUOTE-INBOUND-{suffix}",
                "body": f"رسالة أصلية للاقتباس {suffix}",
            }
        )
        conversation = WhatsAppConversation.objects.get(
            id=payload["conversation"]["id"]
        )
        original = conversation.messages.get(
            external_message_id=f"QUOTE-INBOUND-{suffix}"
        )
        return conversation, original

    @patch("whatsapp.services._post_system_whatsapp_gateway_text")
    def test_service_persists_reply_to_and_forwards_quote_contract(self, gateway):
        from whatsapp.services import send_system_whatsapp_inbox_reply

        conversation, original = self._conversation_with_inbound("001")
        gateway.return_value = {
            "success": True,
            "message": "Message accepted by WhatsApp server.",
            "message_id": "QUOTE-OUTBOUND-001",
            "provider_status": "sent_to_whatsapp_server",
        }

        result = send_system_whatsapp_inbox_reply(
            conversation=conversation,
            body="هذا رد مقتبس.",
            user=self.user,
            reply_to_message=original,
        )

        self.assertTrue(result["success"])
        reply = conversation.messages.get(
            external_message_id="QUOTE-OUTBOUND-001"
        )
        self.assertEqual(reply.reply_to_id, original.id)
        self.assertEqual(result["reply"]["reply_to_message_id"], original.id)
        self.assertEqual(
            result["reply"]["reply_to"]["external_message_id"],
            "QUOTE-INBOUND-001",
        )

        kwargs = gateway.call_args.kwargs
        self.assertEqual(
            kwargs["quoted_external_message_id"],
            "QUOTE-INBOUND-001",
        )
        self.assertFalse(kwargs["quoted_from_me"])
        self.assertEqual(kwargs["quoted_body"], original.body)
        self.assertEqual(kwargs["quoted_message_type"], "TEXT")

    @patch("whatsapp.services._post_system_whatsapp_gateway_text")
    def test_api_rejects_quote_from_another_conversation(self, gateway):
        conversation_a, _original_a = self._conversation_with_inbound("002")
        _conversation_b, original_b = self._conversation_with_inbound("003")

        response = self.client.post(
            f"/api/system/whatsapp/inbox/{conversation_a.id}/reply/",
            {
                "body": "يجب رفض هذا الاقتباس.",
                "reply_to_message_id": original_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])
        self.assertIn("reply_to_message_id", response.data["errors"])
        gateway.assert_not_called()

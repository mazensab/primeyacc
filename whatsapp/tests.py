# ============================================================
# 📂 whatsapp/tests.py
# 🧠 PrimeyAcc | Company WhatsApp Tests V1.0
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
            message_body="Hello from PrimeyAcc.",
            created_by=self.user,
        )

        self.assertEqual(log.company, self.company)
        self.assertEqual(log.recipient_phone, "+966500000000")
        self.assertEqual(log.message_body, "Hello from PrimeyAcc.")
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
                "message_body": "Hello from PrimeyAcc.",
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
                "business_name": "PrimeyAcc Support",
                "phone_number": "+966500000000",
                "access_token": "secret-token",
                "webhook_verify_token": "secret-webhook-token",
                "session_name": "primeyacc-system-session",
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
            "session_name": "primeyacc-system-session",
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
            "session_name": "primeyacc-system-session",
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
                    "session_name": "primeyacc-system-session",
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
                "session_name": "primeyacc-system-session",
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
                "session_name": "primeyacc-system-session",
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

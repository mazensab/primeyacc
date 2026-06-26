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
    def test_system_whatsapp_connection_status_without_gateway_is_safe(self):
        response = self.client.post("/api/system/whatsapp/connection/status/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["success"])
        self.assertIn("connection", response.data)
        self.assertFalse(response.data["connection"]["gateway_configured"])
    def test_system_whatsapp_pairing_without_gateway_is_safe(self):
        response = self.client.post(
            "/api/system/whatsapp/connection/pairing/",
            {"phone_number": "0500000000"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["success"])
        self.assertIn("connection", response.data)
        self.assertFalse(response.data["connection"]["gateway_configured"])


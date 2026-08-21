from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from django.test import SimpleTestCase
from django.urls import resolve
from integrations.payments.exceptions import PaymentGatewayConfigurationError, PaymentGatewayVerificationError
from integrations.payments.platform_webhooks import PlatformWebhookPaymentNotFound, PlatformWebhookResult, process_platform_payment_webhook
from integrations.payments.types import PaymentGatewayName, PaymentStatus, WebhookEvent

class PlatformWebhookOrchestrationTests(SimpleTestCase):
    def setUp(self):
        self.payment = SimpleNamespace(pk=91, gateway="MOYASAR", gateway_payment_id="pay_phase22c_91")
        self.event = WebhookEvent(
            gateway=PaymentGatewayName.MOYASAR,
            event_type="payment_paid",
            provider_payment_id="pay_phase22c_91",
            status=PaymentStatus.PAID,
            payload={"type": "payment_paid"},
        )

    @patch("integrations.payments.platform_webhooks.verify_and_apply_gateway_payment")
    @patch("integrations.payments.platform_webhooks._find_platform_payment")
    def test_webhook_reverifies_provider_before_applying_state(self, find_payment, verify_payment):
        adapter = MagicMock()
        adapter.verify_webhook.return_value = self.event
        find_payment.return_value = self.payment
        verify_payment.return_value = (SimpleNamespace(pk=91, status="PAID"), SimpleNamespace(), SimpleNamespace())
        result = process_platform_payment_webhook(
            gateway=PaymentGatewayName.MOYASAR, headers={}, body=b"{}", payload={}, adapter=adapter
        )
        verify_payment.assert_called_once_with(payment=self.payment, actor=None, adapter=adapter)
        self.assertEqual(result.status, "PAID")

    @patch("integrations.payments.platform_webhooks.verify_and_apply_gateway_payment")
    @patch("integrations.payments.platform_webhooks._find_platform_payment")
    def test_webhook_payload_status_is_not_applied_directly(self, find_payment, verify_payment):
        adapter = MagicMock()
        adapter.verify_webhook.return_value = self.event
        find_payment.return_value = self.payment
        verify_payment.return_value = SimpleNamespace(pk=91, status="PROCESSING")
        result = process_platform_payment_webhook(
            gateway="moyasar", headers={}, body=b"{}", payload={}, adapter=adapter
        )
        self.assertEqual(result.status, "PROCESSING")

    @patch("integrations.payments.platform_webhooks._find_platform_payment")
    def test_gateway_mismatch_is_rejected_before_lookup(self, find_payment):
        adapter = MagicMock()
        adapter.verify_webhook.return_value = WebhookEvent(
            gateway=PaymentGatewayName.TABBY,
            event_type="closed",
            provider_payment_id="pay_phase22c_91",
            status=PaymentStatus.PAID,
            payload={},
        )
        with self.assertRaises(PaymentGatewayVerificationError):
            process_platform_payment_webhook(
                gateway=PaymentGatewayName.MOYASAR, headers={}, body=b"{}", payload={}, adapter=adapter
            )
        find_payment.assert_not_called()

    @patch("integrations.payments.platform_webhooks.verify_and_apply_gateway_payment")
    @patch("integrations.payments.platform_webhooks._find_platform_payment")
    def test_unknown_payment_never_reaches_bridge(self, find_payment, verify_payment):
        adapter = MagicMock()
        adapter.verify_webhook.return_value = self.event
        find_payment.side_effect = PlatformWebhookPaymentNotFound()
        with self.assertRaises(PlatformWebhookPaymentNotFound):
            process_platform_payment_webhook(
                gateway=PaymentGatewayName.MOYASAR, headers={}, body=b"{}", payload={}, adapter=adapter
            )
        verify_payment.assert_not_called()

class PlatformWebhookAPITests(SimpleTestCase):
    ROUTES = {
        "moyasar": "/api/system/subscription-payments/webhooks/moyasar/",
        "tamara": "/api/system/subscription-payments/webhooks/tamara/",
        "tabby": "/api/system/subscription-payments/webhooks/tabby/",
    }

    def test_route_contract(self):
        expected = {
            "moyasar": "system:system_subscription_payments:webhook_moyasar",
            "tamara": "system:system_subscription_payments:webhook_tamara",
            "tabby": "system:system_subscription_payments:webhook_tabby",
        }
        for gateway, path in self.ROUTES.items():
            with self.subTest(gateway=gateway):
                self.assertEqual(resolve(path).view_name, expected[gateway])

    def test_rejects_get(self):
        self.assertEqual(self.client.get(self.ROUTES["moyasar"]).status_code, 405)

    def test_rejects_invalid_json(self):
        response = self.client.post(self.ROUTES["moyasar"], data="{", content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "WEBHOOK_INVALID_JSON")

    @patch("api.system.subscription_payments.webhooks.process_platform_payment_webhook")
    def test_callback_is_public(self, process):
        process.return_value = PlatformWebhookResult(payment_id=91, gateway="moyasar", event_type="payment_paid", status="PAID")
        response = self.client.post(self.ROUTES["moyasar"], data="{}", content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["received"])

    @patch("api.system.subscription_payments.webhooks.process_platform_payment_webhook")
    def test_verification_error_does_not_leak_secret(self, process):
        process.side_effect = PaymentGatewayVerificationError("secret-token-value-must-not-leak")
        response = self.client.post(self.ROUTES["tamara"], data="{}", content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "WEBHOOK_VERIFICATION_FAILED")
        self.assertNotIn("secret-token-value-must-not-leak", response.content.decode("utf-8"))

    @patch("api.system.subscription_payments.webhooks.process_platform_payment_webhook")
    def test_unknown_payment_returns_safe_404(self, process):
        process.side_effect = PlatformWebhookPaymentNotFound()
        response = self.client.post(self.ROUTES["tabby"], data="{}", content_type="application/json")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "WEBHOOK_PAYMENT_NOT_FOUND")

    @patch("api.system.subscription_payments.webhooks.process_platform_payment_webhook")
    def test_configuration_error_is_safe_503(self, process):
        process.side_effect = PaymentGatewayConfigurationError("provider-secret")
        response = self.client.post(self.ROUTES["moyasar"], data="{}", content_type="application/json")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("provider-secret", response.content.decode("utf-8"))

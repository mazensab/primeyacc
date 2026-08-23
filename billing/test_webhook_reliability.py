from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from billing.models import (
    PlatformSubscriptionWebhookEvent,
)
from billing.webhook_services import (
    begin_platform_webhook_processing,
    mark_platform_webhook_failed,
    mark_platform_webhook_unmatched,
    record_platform_webhook_event,
    safe_webhook_headers,
    safe_webhook_payload,
)
from integrations.payments.platform_webhooks import (
    PlatformWebhookPaymentNotFound,
    process_durable_platform_payment_webhook,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentStatus,
    WebhookEvent,
)


class PlatformWebhookReliabilityLedgerTests(
    TestCase
):
    def test_duplicate_event_is_recorded_once(self):
        payload = {
            "id": "evt-29b-001",
            "type": "payment_paid",
            "data": {
                "id": "pay-29b-001",
            },
        }

        first, first_created = (
            record_platform_webhook_event(
                gateway="moyasar",
                event_type="payment_paid",
                provider_payment_id="pay-29b-001",
                payload=payload,
                headers={
                    "Content-Type": "application/json",
                },
                body=b'{"event":"same"}',
            )
        )

        second, second_created = (
            record_platform_webhook_event(
                gateway="moyasar",
                event_type="payment_paid",
                provider_payment_id="pay-29b-001",
                payload=payload,
                headers={
                    "Content-Type": "application/json",
                },
                body=b'{"event":"same"}',
            )
        )

        self.assertTrue(
            first_created
        )

        self.assertFalse(
            second_created
        )

        self.assertEqual(
            first.pk,
            second.pk,
        )

        second.refresh_from_db()

        self.assertEqual(
            second.duplicate_count,
            1,
        )

        self.assertEqual(
            PlatformSubscriptionWebhookEvent
            .objects
            .count(),
            1,
        )

    def test_payload_and_headers_redact_secrets(self):
        payload = safe_webhook_payload(
            {
                "secret_token": "provider-secret",
                "nested": {
                    "token": "nested-secret",
                    "status": "paid",
                },
            }
        )

        headers = safe_webhook_headers(
            {
                "Authorization": (
                    "Bearer provider-secret"
                ),
                "X-Signature": "signature-secret",
                "User-Agent": "provider-agent",
            }
        )

        self.assertEqual(
            payload["secret_token"],
            "[REDACTED]",
        )

        self.assertEqual(
            payload["nested"]["token"],
            "[REDACTED]",
        )

        self.assertEqual(
            payload["nested"]["status"],
            "paid",
        )

        self.assertEqual(
            headers["Authorization"],
            "[REDACTED]",
        )

        self.assertEqual(
            headers["X-Signature"],
            "[REDACTED]",
        )

        self.assertEqual(
            headers["User-Agent"],
            "provider-agent",
        )

    def test_processing_attempt_is_counted(self):
        event, _ = (
            record_platform_webhook_event(
                gateway="tabby",
                event_type="authorized",
                provider_payment_id="tabby-29b-001",
                payload={
                    "payment_id": "tabby-29b-001",
                    "status": "authorized",
                },
            )
        )

        processed = (
            begin_platform_webhook_processing(
                event
            )
        )

        self.assertEqual(
            processed.status,
            PlatformSubscriptionWebhookEvent
            .Status
            .PROCESSING,
        )

        self.assertEqual(
            processed.attempt_count,
            1,
        )

        self.assertIsNotNone(
            processed.last_attempt_at
        )

    def test_unmatched_event_gets_retry_metadata(self):
        event, _ = (
            record_platform_webhook_event(
                gateway="tamara",
                event_type="order_approved",
                provider_payment_id="order-29b-001",
                payload={
                    "order_id": "order-29b-001",
                    "event_type": "order_approved",
                },
            )
        )

        event = (
            begin_platform_webhook_processing(
                event
            )
        )

        event = mark_platform_webhook_unmatched(
            event,
            error_message="Payment not found.",
        )

        self.assertEqual(
            event.status,
            PlatformSubscriptionWebhookEvent
            .Status
            .UNMATCHED,
        )

        self.assertEqual(
            event.error_code,
            "PAYMENT_NOT_FOUND",
        )

        self.assertIsNotNone(
            event.next_retry_at
        )

        self.assertGreater(
            event.next_retry_at,
            timezone.now(),
        )

    def test_retryable_failure_gets_next_retry(self):
        event, _ = (
            record_platform_webhook_event(
                gateway="moyasar",
                event_type="payment_paid",
                provider_payment_id="pay-29b-retry",
                payload={
                    "id": "evt-29b-retry",
                    "type": "payment_paid",
                },
            )
        )

        event = (
            begin_platform_webhook_processing(
                event
            )
        )

        event = mark_platform_webhook_failed(
            event,
            error_code="PROVIDER_UNAVAILABLE",
            error_message="Provider timeout.",
            retryable=True,
        )

        self.assertEqual(
            event.status,
            PlatformSubscriptionWebhookEvent
            .Status
            .FAILED,
        )

        self.assertIsNotNone(
            event.next_retry_at
        )


class PlatformDurableWebhookFlowTests(
    TestCase
):
    def setUp(self):
        self.event = WebhookEvent(
            gateway=PaymentGatewayName.MOYASAR,
            event_type="payment_paid",
            provider_payment_id="pay-29b-flow",
            status=PaymentStatus.PAID,
            payload={
                "id": "evt-29b-flow",
                "type": "payment_paid",
                "secret_token": "must-redact",
                "data": {
                    "id": "pay-29b-flow",
                },
            },
        )

    @patch(
        "integrations.payments.platform_webhooks."
        "verify_and_apply_gateway_payment"
    )
    @patch(
        "integrations.payments.platform_webhooks."
        "_find_platform_payment"
    )
    def test_unmatched_authenticated_event_is_retained(
        self,
        find_payment,
        verify_payment,
    ):
        adapter = MagicMock()

        adapter.verify_webhook.return_value = (
            self.event
        )

        find_payment.side_effect = (
            PlatformWebhookPaymentNotFound(
                "missing"
            )
        )

        with self.assertRaises(
            PlatformWebhookPaymentNotFound
        ):
            process_durable_platform_payment_webhook(
                gateway="moyasar",
                headers={},
                body=b"{}",
                payload=self.event.payload,
                adapter=adapter,
            )

        verify_payment.assert_not_called()

        ledger = (
            PlatformSubscriptionWebhookEvent
            .objects
            .get()
        )

        self.assertEqual(
            ledger.status,
            PlatformSubscriptionWebhookEvent
            .Status
            .UNMATCHED,
        )

        self.assertEqual(
            ledger.attempt_count,
            1,
        )

        self.assertEqual(
            ledger.payload["secret_token"],
            "[REDACTED]",
        )

    def test_model_contract_contains_reliability_fields(
        self,
    ):
        fields = {
            field.name
            for field
            in PlatformSubscriptionWebhookEvent
            ._meta
            .fields
        }

        required = {
            "gateway",
            "provider_event_id",
            "event_type",
            "provider_payment_id",
            "event_fingerprint",
            "body_sha256",
            "payment",
            "status",
            "payload",
            "headers",
            "attempt_count",
            "max_attempts",
            "duplicate_count",
            "error_code",
            "error_message",
            "received_at",
            "last_received_at",
            "last_attempt_at",
            "next_retry_at",
            "processed_at",
            "failed_at",
        }

        self.assertTrue(
            required.issubset(fields)
        )

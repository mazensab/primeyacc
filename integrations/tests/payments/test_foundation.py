from __future__ import annotations

from django.test import SimpleTestCase

from integrations.payments import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentStatus,
    RefundRequest,
)


class PaymentFoundationTests(SimpleTestCase):
    def test_payment_request_normalizes_currency(self):
        request = PaymentRequest(
            amount=12500,
            currency="sar",
            description="Platform subscription",
        )

        self.assertEqual(request.amount, 12500)
        self.assertEqual(request.currency, "SAR")

    def test_payment_request_rejects_zero_amount(self):
        with self.assertRaises(ValueError):
            PaymentRequest(
                amount=0,
                currency="SAR",
                description="Platform subscription",
            )

    def test_payment_request_rejects_boolean_amount(self):
        with self.assertRaises(ValueError):
            PaymentRequest(
                amount=True,
                currency="SAR",
                description="Platform subscription",
            )

    def test_payment_request_requires_description(self):
        with self.assertRaises(ValueError):
            PaymentRequest(
                amount=1000,
                currency="SAR",
                description="",
            )

    def test_refund_request_rejects_invalid_amount(self):
        with self.assertRaises(ValueError):
            RefundRequest(
                provider_payment_id="payment-1",
                amount=-1,
            )

    def test_gateway_names_are_stable(self):
        self.assertEqual(
            PaymentGatewayName.MOYASAR.value,
            "moyasar",
        )
        self.assertEqual(
            PaymentGatewayName.TAMARA.value,
            "tamara",
        )
        self.assertEqual(
            PaymentGatewayName.TABBY.value,
            "tabby",
        )

    def test_paid_status_is_stable(self):
        self.assertEqual(PaymentStatus.PAID.value, "paid")

from __future__ import annotations

import json

from django.urls import resolve

from billing.models import PlatformSubscriptionPayment
from subscriptions.models import CompanySubscription

from api.tests.test_public_registration import (
    PublicRegistrationContractTests,
)


class PublicCheckoutContractTests(
    PublicRegistrationContractTests
):
    def post_json(
        self,
        path: str,
        payload: dict,
    ):
        return self.client.post(
            path,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def _create_public_payment(
        self,
        *,
        gateway="MOYASAR",
    ):
        options_response = self.client.get(
            "/api/public/registration/options/"
        )

        self.assertEqual(
            options_response.status_code,
            200,
        )

        options_data = (
            options_response.json()
            .get("data", {})
        )

        plans = options_data.get("plans") or []

        self.assertTrue(
            plans,
            "Public registration options must expose at least one plan.",
        )

        plan_id = int(plans[0]["id"])

        payload = {
            "owner_name": "Phase 25 Checkout Owner",
            "phone": "0552502601",
            "email": "phase25-checkout-2601@example.com",
            "password": "StrongPass123!",
            "company_name": "Phase 25 Checkout Company",
            "commercial_registration": "1025002601",
            "tax_number": "",
            "city": "Riyadh",
            "plan_id": plan_id,
            "billing_cycle": "MONTHLY",
            "gateway": gateway,
            "auto_renew": False,
        }

        response = self.post_json(
            "/api/public/registration/",
            payload,
        )

        self.assertEqual(
            response.status_code,
            201,
            response.content.decode(
                "utf-8",
                errors="replace",
            ),
        )

        reference = (
            response.json()
            ["data"]
            ["payment"]
            ["payment_reference"]
        )

        return (
            PlatformSubscriptionPayment.objects
            .select_related(
                "subscription",
            )
            .get(
                payment_reference=reference
            )
        )

    def test_checkout_route_resolves(self):
        self.assertEqual(
            resolve(
                "/api/public/registration/checkout/"
            ).url_name,
            "registration_checkout",
        )

    def test_moyasar_attach_route_resolves(self):
        self.assertEqual(
            resolve(
                "/api/public/registration/moyasar/attach/"
            ).url_name,
            "registration_moyasar_attach",
        )

    def test_payment_verify_route_resolves(self):
        self.assertEqual(
            resolve(
                "/api/public/registration/payment/verify/"
            ).url_name,
            "registration_payment_verify",
        )

    def test_moyasar_checkout_returns_client_mode(self):
        payment = self._create_public_payment(
            gateway="MOYASAR",
        )

        response = self.post_json(
            "/api/public/registration/checkout/",
            {
                "payment_reference":
                    payment.payment_reference,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        checkout = (
            response.json()
            ["data"]
            ["checkout"]
        )

        self.assertEqual(
            checkout["mode"],
            "client",
        )

        self.assertEqual(
            checkout["gateway"],
            "moyasar",
        )

        payment.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment
            .Status
            .PENDING,
        )

        self.assertEqual(
            payment.gateway_payment_id,
            "",
        )

        self.assertIsNone(
            payment.paid_at
        )

        self.assertIsNone(
            payment.receipt_id
        )

    def test_browser_cannot_override_financial_contract(self):
        payment = self._create_public_payment(
            gateway="MOYASAR",
        )

        original_amount = payment.amount
        original_currency = payment.currency_code

        response = self.post_json(
            "/api/public/registration/checkout/",
            {
                "payment_reference":
                    payment.payment_reference,
                "amount": "0.01",
                "currency": "USD",
                "gateway": "TABBY",
                "status": "PAID",
            },
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payment.refresh_from_db()

        self.assertEqual(
            payment.amount,
            original_amount,
        )

        self.assertEqual(
            payment.currency_code,
            original_currency,
        )

        self.assertEqual(
            payment.gateway,
            "MOYASAR",
        )

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment
            .Status
            .PENDING,
        )

        self.assertIsNone(
            payment.paid_at
        )

    def test_moyasar_attach_requires_provider_id(self):
        payment = self._create_public_payment()

        response = self.post_json(
            "/api/public/registration/moyasar/attach/",
            {
                "payment_reference":
                    payment.payment_reference,
            },
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertEqual(
            response.json()["code"],
            "MOYASAR_PAYMENT_ID_REQUIRED",
        )

    def test_moyasar_attach_only_moves_to_processing(self):
        payment = self._create_public_payment()

        response = self.post_json(
            "/api/public/registration/moyasar/attach/",
            {
                "payment_reference":
                    payment.payment_reference,
                "provider_payment_id":
                    "moyasar-provider-test-1",

                # Must be ignored by backend.
                "status": "PAID",
                "amount": "0.01",
                "currency": "USD",
            },
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payment.refresh_from_db()
        payment.subscription.refresh_from_db()

        self.assertEqual(
            payment.gateway_payment_id,
            "moyasar-provider-test-1",
        )

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment
            .Status
            .PROCESSING,
        )

        self.assertIsNone(
            payment.paid_at
        )

        self.assertIsNone(
            payment.receipt_id
        )

        self.assertEqual(
            payment.subscription.status,
            CompanySubscription
            .Status
            .PENDING_PAYMENT,
        )

    def test_provider_id_cannot_be_replaced(self):
        payment = self._create_public_payment()

        first = self.post_json(
            "/api/public/registration/moyasar/attach/",
            {
                "payment_reference":
                    payment.payment_reference,
                "provider_payment_id":
                    "moyasar-provider-one",
            },
        )

        self.assertEqual(
            first.status_code,
            200,
        )

        second = self.post_json(
            "/api/public/registration/moyasar/attach/",
            {
                "payment_reference":
                    payment.payment_reference,
                "provider_payment_id":
                    "moyasar-provider-two",
            },
        )

        self.assertEqual(
            second.status_code,
            409,
        )

        payment.refresh_from_db()

        self.assertEqual(
            payment.gateway_payment_id,
            "moyasar-provider-one",
        )

    def test_verify_requires_provider_payment_id(self):
        payment = self._create_public_payment()

        response = self.post_json(
            "/api/public/registration/payment/verify/",
            {
                "payment_reference":
                    payment.payment_reference,

                # Browser cannot claim success.
                "status": "PAID",
            },
        )

        self.assertEqual(
            response.status_code,
            409,
        )

        self.assertEqual(
            response.json()["code"],
            "PROVIDER_PAYMENT_NOT_ATTACHED",
        )

        payment.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment
            .Status
            .PENDING,
        )

        self.assertIsNone(
            payment.paid_at
        )

        self.assertIsNone(
            payment.receipt_id
        )

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayVerificationError,
)
from integrations.payments.platform_bridge import (
    _major_to_minor,
    validate_gateway_result,
)
from integrations.payments.registry import (
    get_payment_gateway_adapter,
    normalize_gateway_name,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentResult,
    PaymentStatus,
)


class GatewayRegistryTests(SimpleTestCase):
    def test_normalizes_gateway_name(self):
        self.assertEqual(
            normalize_gateway_name("MOYASAR"),
            PaymentGatewayName.MOYASAR,
        )

    def test_rejects_unknown_gateway(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            normalize_gateway_name("unknown")

    @patch(
        "integrations.payments.registry.MoyasarClient"
    )
    def test_builds_moyasar_adapter(
        self,
        client_class,
    ):
        with self.settings(
            MOYASAR_SECRET_KEY="sk_test_example",
            MOYASAR_WEBHOOK_SECRET="webhook-secret",
        ):
            adapter = get_payment_gateway_adapter(
                "moyasar"
            )

        self.assertEqual(
            adapter.gateway,
            PaymentGatewayName.MOYASAR,
        )
        client_class.assert_called_once()

    @patch(
        "integrations.payments.registry.TamaraClient"
    )
    def test_builds_tamara_adapter(
        self,
        client_class,
    ):
        with self.settings(
            TAMARA_API_TOKEN="tamara-token",
            TAMARA_NOTIFICATION_TOKEN="notify-token",
        ):
            adapter = get_payment_gateway_adapter(
                "tamara"
            )

        self.assertEqual(
            adapter.gateway,
            PaymentGatewayName.TAMARA,
        )
        client_class.assert_called_once()

    @patch(
        "integrations.payments.registry.TabbyClient"
    )
    def test_builds_tabby_adapter(
        self,
        client_class,
    ):
        with self.settings(
            TABBY_SECRET_KEY="tabby-secret",
            TABBY_MERCHANT_CODE="merchant",
        ):
            adapter = get_payment_gateway_adapter(
                "tabby"
            )

        self.assertEqual(
            adapter.gateway,
            PaymentGatewayName.TABBY,
        )
        client_class.assert_called_once()


class PlatformGatewayContractTests(SimpleTestCase):
    def test_major_to_minor(self):
        self.assertEqual(
            _major_to_minor(Decimal("125.50")),
            12550,
        )

    def test_major_to_minor_rejects_negative(self):
        with self.assertRaises(ValidationError):
            _major_to_minor(Decimal("-1.00"))

    def payment(self):
        invoice = SimpleNamespace(
            subscription_id=10,
            company_id=20,
            document_type="SUBSCRIPTION_INVOICE",
            status="ISSUED",
            total_amount=Decimal("125.00"),
            currency_code="SAR",
        )

        subscription = SimpleNamespace(
            id=10,
            company_id=20,
            total_amount=Decimal("125.00"),
        )

        return SimpleNamespace(
            subscription=subscription,
            subscription_id=10,
            company_id=20,
            invoice=invoice,
            gateway="MOYASAR",
            payment_reference="PPAY-2026-ABC",
            billing_reference="PINV-2026-000001",
            amount=Decimal("125.00"),
            currency_code="SAR",
        )

    @patch(
        "integrations.payments.platform_bridge."
        "validate_payment_financial_contract"
    )
    def test_accepts_matching_gateway_result(
        self,
        financial_contract,
    ):
        payment = self.payment()

        result = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_123",
            status=PaymentStatus.PAID,
            amount=12500,
            currency="SAR",
            reference="PPAY-2026-ABC",
            raw={"id": "pay_123"},
        )

        validate_gateway_result(
            payment=payment,
            result=result,
        )

        financial_contract.assert_called_once()

    @patch(
        "integrations.payments.platform_bridge."
        "validate_payment_financial_contract"
    )
    def test_rejects_amount_mismatch(
        self,
        financial_contract,
    ):
        payment = self.payment()

        result = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_123",
            status=PaymentStatus.PAID,
            amount=999,
            currency="SAR",
            reference="PPAY-2026-ABC",
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            validate_gateway_result(
                payment=payment,
                result=result,
            )

    @patch(
        "integrations.payments.platform_bridge."
        "validate_payment_financial_contract"
    )
    def test_rejects_currency_mismatch(
        self,
        financial_contract,
    ):
        payment = self.payment()

        result = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_123",
            status=PaymentStatus.PAID,
            amount=12500,
            currency="USD",
            reference="PPAY-2026-ABC",
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            validate_gateway_result(
                payment=payment,
                result=result,
            )

    @patch(
        "integrations.payments.platform_bridge."
        "validate_payment_financial_contract"
    )
    def test_rejects_reference_mismatch(
        self,
        financial_contract,
    ):
        payment = self.payment()

        result = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id="pay_123",
            status=PaymentStatus.PAID,
            amount=12500,
            currency="SAR",
            reference="wrong-reference",
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            validate_gateway_result(
                payment=payment,
                result=result,
            )

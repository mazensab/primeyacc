from __future__ import annotations

from django.db import models
from billing.models import PlatformSubscriptionPayment
from billing.payment_services import create_or_get_subscription_payment
from companies.models import Company
from subscriptions.models import CompanySubscription, SubscriptionPlan


from datetime import timedelta
from django.utils import timezone
from django.test import TestCase

from django.contrib.auth import get_user_model


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
    apply_gateway_result,
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


User = get_user_model()

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

class PlatformBridgePaidReturnContractTests(TestCase):
    def _create_company(self, **overrides) -> Company:
        """
        Create a Company without assuming a fixed Company schema.

        Mirrors the subscription service test factory locally so
        importing another TestCase class does not expand discovery.
        """

        data = {}

        for field in Company._meta.fields:
            if (
                field.auto_created
                or not getattr(
                    field,
                    "editable",
                    True,
                )
            ):
                continue

            if field.name == "id":
                continue

            if field.name in overrides:
                data[field.name] = (
                    overrides[field.name]
                )
                continue

            if (
                field.has_default()
                or field.null
                or field.blank
            ):
                continue

            if isinstance(
                field,
                models.ForeignKey,
            ):
                if (
                    field.remote_field
                    and field.remote_field.model
                    == User
                ):
                    data[field.name] = self.user

                continue

            field_name = (
                field.name.lower()
            )

            if isinstance(
                field,
                (
                    models.CharField,
                    models.SlugField,
                    models.TextField,
                ),
            ):
                if "email" in field_name:
                    data[field.name] = (
                        f"{field.name}@mhamcloud.test"
                    )

                elif (
                    "phone" in field_name
                    or "mobile" in field_name
                ):
                    data[field.name] = (
                        "0500000000"
                    )

                elif "country" in field_name:
                    data[field.name] = "SA"

                elif "currency" in field_name:
                    data[field.name] = "SAR"

                elif (
                    "slug" in field_name
                    or "code" in field_name
                ):
                    data[field.name] = (
                        "phase25-bridge-paid-company"
                    )

                elif (
                    "name" in field_name
                    or "title" in field_name
                ):
                    data[field.name] = (
                        overrides.get(
                            "name",
                            "Phase 25 Bridge Paid Company",
                        )
                    )

                else:
                    data[field.name] = (
                        f"test-{field.name}"
                    )

            elif isinstance(
                field,
                models.BooleanField,
            ):
                data[field.name] = True

            elif isinstance(
                field,
                models.IntegerField,
            ):
                data[field.name] = 1

            elif isinstance(
                field,
                models.DecimalField,
            ):
                data[field.name] = (
                    Decimal("0.00")
                )

            elif isinstance(
                field,
                models.DateField,
            ):
                data[field.name] = (
                    timezone.localdate()
                )

            elif isinstance(
                field,
                models.DateTimeField,
            ):
                data[field.name] = (
                    timezone.now()
                )

        data.update(overrides)

        return Company.objects.create(
            **data
        )

    def setUp(self):
        self.user = User.objects.create_user(
            username="phase25-bridge-paid-owner",
            email="phase25-bridge-paid@example.com",
            password="StrongPass123!",
        )

        self.company = self._create_company(
            name="Phase 25 Bridge Paid Company",
            company_code="phase25-bridge-paid-company",
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Phase 25 Bridge Paid Plan",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="phase25-bridge-paid-plan",
            monthly_price=Decimal("50.00"),
            yearly_price=Decimal("500.00"),
            max_users=3,
            max_branches=1,
            max_warehouses=1,
            max_pos=1,
            features=["accounting"],
            is_active=True,
            is_public=True,
            sort_order=1,
        )

        self.subscription = (
            CompanySubscription.objects.create(
                company=self.company,
                plan=self.plan,
                status=(
                    CompanySubscription
                    .Status
                    .PENDING_PAYMENT
                ),
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
                start_date=timezone.localdate(),
                end_date=(
                    timezone.localdate()
                    + timedelta(days=30)
                ),
                price=Decimal("50.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("7.50"),
                total_amount=Decimal("57.50"),
                created_by=self.user,
            )
        )

        self.payment, _ = (
            create_or_get_subscription_payment(
                subscription=self.subscription,
                idempotency_key=(
                    "phase25-bridge-paid-return"
                ),
                gateway="MOYASAR",
                payment_method="MOYASAR",
                metadata={
                    "source": "test",
                },
                created_by=self.user,
            )
        )

        self.payment.gateway_payment_id = (
            "moyasar-phase25-paid-return"
        )

        self.payment.status = (
            PlatformSubscriptionPayment
            .Status
            .PROCESSING
        )

        self.payment.save(
            update_fields=[
                "gateway_payment_id",
                "status",
                "updated_at",
            ]
        )

    def _paid_result(self):
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=(
                self.payment.gateway_payment_id
            ),
            status=PaymentStatus.PAID,
            amount=5750,
            currency="SAR",
            reference=(
                self.payment.payment_reference
            ),
            raw={
                "id": (
                    self.payment
                    .gateway_payment_id
                ),
                "status": "paid",
                "amount": 5750,
                "currency": "SAR",
            },
        )

    def test_paid_apply_returns_payment_not_tuple(self):
        result = apply_gateway_result(
            payment=self.payment,
            result=self._paid_result(),
            actor=None,
        )

        self.assertIsInstance(
            result,
            PlatformSubscriptionPayment,
        )

        result.refresh_from_db()
        result.subscription.refresh_from_db()

        self.assertEqual(
            result.status,
            PlatformSubscriptionPayment
            .Status
            .PAID,
        )

        self.assertIsNotNone(
            result.receipt_id
        )

        self.assertEqual(
            result.subscription.status,
            CompanySubscription
            .Status
            .ACTIVE,
        )

    def test_paid_apply_is_idempotent_and_returns_payment(self):
        first = apply_gateway_result(
            payment=self.payment,
            result=self._paid_result(),
            actor=None,
        )

        first.refresh_from_db()

        receipt_id = first.receipt_id

        second = apply_gateway_result(
            payment=first,
            result=self._paid_result(),
            actor=None,
        )

        self.assertIsInstance(
            second,
            PlatformSubscriptionPayment,
        )

        second.refresh_from_db()
        second.subscription.refresh_from_db()

        self.assertEqual(
            second.status,
            PlatformSubscriptionPayment
            .Status
            .PAID,
        )

        self.assertEqual(
            second.receipt_id,
            receipt_id,
        )

        self.assertEqual(
            second.subscription.status,
            CompanySubscription
            .Status
            .ACTIVE,
        )

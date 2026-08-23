from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import resolve

from billing.adjustment_services import (
    create_or_get_platform_adjustment,
    reverse_platform_adjustment,
)
from billing.models import (
    PlatformSubscriptionAdjustment,
    PlatformSubscriptionPayment,
)
from billing.refund_services import (
    create_or_get_platform_refund,
    execute_platform_refund,
    get_payment_refund_financial_summary,
)
from billing.void_services import (
    void_platform_payment_attempt,
)
from integrations.payments.platform_bridge import (
    apply_gateway_result,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentResult,
    PaymentStatus,
)
from subscriptions.test_phase28_commercial_rules import (
    Phase28RefundBehaviorTests,
)


class _RefundAdapter:
    def refund_payment(
        self,
        request,
    ):
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=(
                request.provider_payment_id
            ),
            status=(
                PaymentStatus
                .PARTIALLY_REFUNDED
            ),
            amount=request.amount or 0,
            currency="SAR",
            raw={
                "id": "phase30-refund",
            },
        )


class _VoidAdapter:
    def cancel_payment(
        self,
        provider_payment_id,
    ):
        return PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=provider_payment_id,
            status=PaymentStatus.VOIDED,
            amount=11500,
            currency="SAR",
            raw={
                "id": provider_payment_id,
                "status": "voided",
            },
        )


class Phase30FinancialOperationsTests(
    Phase28RefundBehaviorTests
):
    def test_partial_refund_keeps_paid_and_exposes_derived_state(
        self,
    ):
        payment = self._paid_payment()

        refund, _ = (
            create_or_get_platform_refund(
                payment=payment,
                amount=Decimal("25.00"),
                idempotency_key=(
                    "phase30-partial-summary"
                ),
                created_by=self.user,
            )
        )

        execute_platform_refund(
            refund=refund,
            actor=self.user,
            adapter=_RefundAdapter(),
        )

        payment.refresh_from_db()

        self.assertEqual(
            payment.status,
            PlatformSubscriptionPayment
            .Status
            .PAID,
        )

        summary = (
            get_payment_refund_financial_summary(
                payment
            )
        )

        self.assertEqual(
            summary["financial_status"],
            "PARTIALLY_REFUNDED",
        )

        self.assertEqual(
            summary[
                "successful_refunded_amount"
            ],
            "25.00",
        )

    def test_provider_refund_state_requires_local_refund_ledger(
        self,
    ):
        payment = self._paid_payment()

        result = PaymentResult(
            gateway=PaymentGatewayName.MOYASAR,
            provider_payment_id=(
                payment.gateway_payment_id
            ),
            status=(
                PaymentStatus
                .PARTIALLY_REFUNDED
            ),
            amount=11500,
            currency="SAR",
            reference=(
                payment.payment_reference
            ),
            raw={},
        )

        with self.assertRaises(
            Exception
        ):
            apply_gateway_result(
                payment=payment,
                result=result,
                actor=self.user,
            )

    def test_adjustment_is_idempotent_and_reversible(
        self,
    ):
        payment = self._paid_payment()

        first, created1 = (
            create_or_get_platform_adjustment(
                payment=payment,
                adjustment_type="CREDIT",
                amount=Decimal("10.00"),
                idempotency_key=(
                    "phase30-adjustment-idem"
                ),
                reason="Commercial correction",
                accounting_reference="ACC-30-001",
                created_by=self.user,
            )
        )

        second, created2 = (
            create_or_get_platform_adjustment(
                payment=payment,
                adjustment_type="CREDIT",
                amount=Decimal("10.00"),
                idempotency_key=(
                    "phase30-adjustment-idem"
                ),
                reason="Commercial correction",
                accounting_reference="ACC-30-001",
                created_by=self.user,
            )
        )

        self.assertTrue(
            created1
        )
        self.assertFalse(
            created2
        )
        self.assertEqual(
            first.id,
            second.id,
        )

        reverse_platform_adjustment(
            adjustment=first,
            actor=self.user,
            reason="Correction reversed",
        )

        first.refresh_from_db()

        self.assertEqual(
            first.status,
            PlatformSubscriptionAdjustment
            .Status
            .REVERSED,
        )

        self.assertIsNotNone(
            first.reversed_at
        )

    def test_tabby_provider_void_is_rejected_by_platform_policy(
        self,
    ):
        payment = self._paid_payment()

        PlatformSubscriptionPayment.objects.filter(
            pk=payment.pk
        ).update(
            status=(
                PlatformSubscriptionPayment
                .Status
                .PROCESSING
            ),
            gateway="TABBY",
            paid_at=None,
        )

        payment.refresh_from_db()

        with self.assertRaises(
            ValidationError
        ):
            void_platform_payment_attempt(
                payment=payment,
                actor=self.user,
                adapter=MagicMock(),
            )

    def test_phase30_routes_resolve(
        self,
    ):
        cases = [
            (
                "/api/system/subscription-payments/1/void/",
                (
                    "system:"
                    "system_subscription_payments:"
                    "void"
                ),
            ),
            (
                "/api/system/subscription-payments/1/adjustments/",
                (
                    "system:"
                    "system_subscription_payments:"
                    "adjustment_create"
                ),
            ),
            (
                "/api/system/subscription-payments/1/adjustments/2/reverse/",
                (
                    "system:"
                    "system_subscription_payments:"
                    "adjustment_reverse"
                ),
            ),
        ]

        for path, name in cases:
            with self.subTest(
                path=path
            ):
                self.assertEqual(
                    resolve(path).view_name,
                    name,
                )

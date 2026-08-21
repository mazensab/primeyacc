from __future__ import annotations

from typing import Any

from django.conf import settings

from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
)
from integrations.payments.moyasar.adapter import MoyasarAdapter
from integrations.payments.moyasar.client import MoyasarClient
from integrations.payments.tabby.adapter import TabbyAdapter
from integrations.payments.tabby.client import TabbyClient
from integrations.payments.tamara.adapter import TamaraAdapter
from integrations.payments.tamara.client import TamaraClient
from integrations.payments.types import PaymentGatewayName


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _setting(name: str, default: Any = "") -> Any:
    return getattr(settings, name, default)


def normalize_gateway_name(
    gateway: str | PaymentGatewayName,
) -> PaymentGatewayName:
    value = _clean(gateway).lower()

    try:
        return PaymentGatewayName(value)
    except ValueError as exc:
        raise PaymentGatewayConfigurationError(
            f"Unsupported payment gateway: {value or '<empty>'}."
        ) from exc


def get_payment_gateway_adapter(
    gateway: str | PaymentGatewayName,
) -> PaymentGatewayAdapter:
    """
    Build a configured platform payment adapter.

    Credentials are read from Django settings, which should be populated
    from server environment variables. Raw credentials must never be
    stored in PlatformSubscriptionPayment or provider snapshots.
    """

    gateway_name = normalize_gateway_name(gateway)

    if gateway_name is PaymentGatewayName.MOYASAR:
        client = MoyasarClient(
            secret_key=_setting("MOYASAR_SECRET_KEY"),
            base_url=_setting(
                "MOYASAR_BASE_URL",
                MoyasarClient.DEFAULT_BASE_URL,
            ),
            timeout=float(
                _setting("MOYASAR_TIMEOUT", 15.0)
            ),
        )

        return MoyasarAdapter(
            client=client,
            webhook_secret=_setting(
                "MOYASAR_WEBHOOK_SECRET"
            ),
        )

    if gateway_name is PaymentGatewayName.TAMARA:
        client = TamaraClient(
            api_token=_setting("TAMARA_API_TOKEN"),
            base_url=_setting(
                "TAMARA_BASE_URL",
                TamaraClient.DEFAULT_BASE_URL,
            ),
            timeout=float(
                _setting("TAMARA_TIMEOUT", 15.0)
            ),
        )

        return TamaraAdapter(
            client=client,
            notification_token=_setting(
                "TAMARA_NOTIFICATION_TOKEN"
            ),
        )

    if gateway_name is PaymentGatewayName.TABBY:
        client = TabbyClient(
            secret_key=_setting("TABBY_SECRET_KEY"),
            merchant_code=_setting(
                "TABBY_MERCHANT_CODE"
            ),
            base_url=_setting(
                "TABBY_BASE_URL",
                TabbyClient.DEFAULT_BASE_URL,
            ),
            timeout=float(
                _setting("TABBY_TIMEOUT", 15.0)
            ),
        )

        return TabbyAdapter(
            client=client,
            webhook_header_name=_setting(
                "TABBY_WEBHOOK_HEADER_NAME"
            ),
            webhook_header_value=_setting(
                "TABBY_WEBHOOK_HEADER_VALUE"
            ),
        )

    raise PaymentGatewayConfigurationError(
        f"Unsupported payment gateway: {gateway_name.value}."
    )

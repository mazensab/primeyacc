from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.conf import settings

from integrations.payments.moyasar.client import (
    MoyasarClient,
)
from integrations.payments.tabby.client import (
    TabbyClient,
)
from integrations.payments.tamara.client import (
    TamaraClient,
)


@dataclass(frozen=True, slots=True)
class GatewayReadiness:
    gateway: str
    ready: bool
    checks: tuple[dict[str, Any], ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "gateway": self.gateway,
            "ready": self.ready,
            "checks": list(
                self.checks
            ),
        }


def _clean(value: Any) -> str:
    return str(
        value or ""
    ).strip()


def _setting(
    name: str,
    default: Any = "",
) -> Any:
    return getattr(
        settings,
        name,
        default,
    )


def _secret_check(
    name: str,
) -> dict[str, Any]:
    configured = bool(
        _clean(
            _setting(
                name,
                "",
            )
        )
    )

    return {
        "key": name,
        "type": "credential",
        "configured": configured,
    }


def _text_check(
    name: str,
) -> dict[str, Any]:
    configured = bool(
        _clean(
            _setting(
                name,
                "",
            )
        )
    )

    return {
        "key": name,
        "type": "configuration",
        "configured": configured,
    }


def _url_check(
    name: str,
    default: str,
) -> dict[str, Any]:
    value = _clean(
        _setting(
            name,
            default,
        )
    )

    valid = (
        value.startswith(
            "https://"
        )
        and len(value) > len(
            "https://"
        )
    )

    return {
        "key": name,
        "type": "https_url",
        "configured": bool(value),
        "valid": valid,
    }


def _timeout_check(
    name: str,
    default: float = 15.0,
) -> dict[str, Any]:
    try:
        value = float(
            _setting(
                name,
                default,
            )
        )

        valid = value > 0

    except (
        TypeError,
        ValueError,
    ):
        valid = False

    return {
        "key": name,
        "type": "timeout",
        "configured": True,
        "valid": valid,
    }


def _build(
    gateway: str,
    checks: list[dict[str, Any]],
) -> GatewayReadiness:
    ready = all(
        item.get(
            "configured",
            False,
        )
        and item.get(
            "valid",
            True,
        )
        for item in checks
    )

    return GatewayReadiness(
        gateway=gateway,
        ready=ready,
        checks=tuple(checks),
    )


def payment_gateway_readiness(
) -> tuple[GatewayReadiness, ...]:
    moyasar = _build(
        "moyasar",
        [
            _secret_check(
                "MOYASAR_SECRET_KEY"
            ),
            _secret_check(
                "MOYASAR_WEBHOOK_SECRET"
            ),
            _url_check(
                "MOYASAR_BASE_URL",
                MoyasarClient.DEFAULT_BASE_URL,
            ),
            _timeout_check(
                "MOYASAR_TIMEOUT"
            ),
        ],
    )

    tamara = _build(
        "tamara",
        [
            _secret_check(
                "TAMARA_API_TOKEN"
            ),
            _secret_check(
                "TAMARA_NOTIFICATION_TOKEN"
            ),
            _url_check(
                "TAMARA_BASE_URL",
                TamaraClient.DEFAULT_BASE_URL,
            ),
            _timeout_check(
                "TAMARA_TIMEOUT"
            ),
        ],
    )

    tabby = _build(
        "tabby",
        [
            _secret_check(
                "TABBY_SECRET_KEY"
            ),
            _text_check(
                "TABBY_MERCHANT_CODE"
            ),
            _text_check(
                "TABBY_WEBHOOK_HEADER_NAME"
            ),
            _secret_check(
                "TABBY_WEBHOOK_HEADER_VALUE"
            ),
            _url_check(
                "TABBY_BASE_URL",
                TabbyClient.DEFAULT_BASE_URL,
            ),
            _timeout_check(
                "TABBY_TIMEOUT"
            ),
        ],
    )

    return (
        moyasar,
        tamara,
        tabby,
    )


def build_payment_gateway_readiness_payload(
) -> dict[str, Any]:
    rows = payment_gateway_readiness()

    ready_count = sum(
        1
        for row in rows
        if row.ready
    )

    return {
        "ready": (
            ready_count
            == len(rows)
        ),
        "summary": {
            "gateway_count": len(rows),
            "ready_count": ready_count,
            "not_ready_count": (
                len(rows)
                - ready_count
            ),
        },
        "gateways": [
            row.as_dict()
            for row in rows
        ],
    }

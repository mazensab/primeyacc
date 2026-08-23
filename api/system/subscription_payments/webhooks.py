from __future__ import annotations

import json
from typing import Any

from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayError,
    PaymentGatewayRequestError,
    PaymentGatewayResponseError,
    PaymentGatewayVerificationError,
)
from integrations.payments.platform_webhooks import (
    PlatformWebhookPaymentAmbiguous,
    PlatformWebhookPaymentNotFound,
    process_durable_platform_payment_webhook as process_platform_payment_webhook,
)
from integrations.payments.types import PaymentGatewayName

def _strict_json_object(request: HttpRequest) -> dict[str, Any]:
    body = bytes(request.body or b"")
    if not body:
        raise ValueError("Webhook body is required.")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Webhook body must be valid UTF-8 JSON.") from exc
    if not isinstance(payload, dict):
        raise ValueError("Webhook JSON payload must be an object.")
    return payload

def _safe_error(*, status: int, code: str, message: str) -> JsonResponse:
    return JsonResponse({"ok": False, "code": code, "message": message}, status=status)

def _handle_platform_webhook(request: HttpRequest, *, gateway: PaymentGatewayName) -> JsonResponse:
    try:
        payload = _strict_json_object(request)
    except ValueError:
        return _safe_error(status=400, code="WEBHOOK_INVALID_JSON", message="Invalid webhook payload.")
    try:
        result = process_platform_payment_webhook(
            gateway=gateway,
            headers={str(k): str(v) for k, v in request.headers.items()},
            body=request.body,
            payload=payload,
        )
    except PaymentGatewayConfigurationError:
        return _safe_error(status=503, code="WEBHOOK_GATEWAY_NOT_CONFIGURED", message="Payment webhook is temporarily unavailable.")
    except PlatformWebhookPaymentNotFound:
        return _safe_error(status=404, code="WEBHOOK_PAYMENT_NOT_FOUND", message="Webhook payment was not found.")
    except PlatformWebhookPaymentAmbiguous:
        return _safe_error(status=409, code="WEBHOOK_PAYMENT_AMBIGUOUS", message="Webhook payment could not be resolved safely.")
    except PaymentGatewayVerificationError:
        return _safe_error(status=400, code="WEBHOOK_VERIFICATION_FAILED", message="Webhook verification failed.")
    except (PaymentGatewayRequestError, PaymentGatewayResponseError):
        return _safe_error(status=502, code="WEBHOOK_PROVIDER_UNAVAILABLE", message="Payment provider verification is unavailable.")
    except ValidationError:
        return _safe_error(status=409, code="WEBHOOK_PAYMENT_STATE_CONFLICT", message="Webhook payment state could not be applied.")
    except PaymentGatewayError:
        return _safe_error(status=400, code="WEBHOOK_GATEWAY_ERROR", message="Payment webhook could not be processed.")
    return JsonResponse({"ok": True, "received": True, "data": result.as_dict()}, status=200)

@csrf_exempt
@require_POST
def system_subscription_payment_moyasar_webhook(request: HttpRequest) -> JsonResponse:
    return _handle_platform_webhook(request, gateway=PaymentGatewayName.MOYASAR)

@csrf_exempt
@require_POST
def system_subscription_payment_tamara_webhook(request: HttpRequest) -> JsonResponse:
    return _handle_platform_webhook(request, gateway=PaymentGatewayName.TAMARA)

@csrf_exempt
@require_POST
def system_subscription_payment_tabby_webhook(request: HttpRequest) -> JsonResponse:
    return _handle_platform_webhook(request, gateway=PaymentGatewayName.TABBY)

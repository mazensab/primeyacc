from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from billing.models import PlatformSubscriptionPayment
from billing.refund_services import (
    create_or_get_platform_refund,
    execute_platform_refund,
)
from subscriptions.models import CompanySubscription


def _body(request):
    try:
        value = json.loads(request.body.decode('utf-8')) if request.body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _errors(exc):
    if hasattr(exc, 'message_dict'):
        return exc.message_dict
    if hasattr(exc, 'messages'):
        return {'detail': exc.messages}
    return {'detail': str(exc)}


@login_required
@csrf_protect
@require_POST
def system_subscription_refund(request: HttpRequest, subscription_id: int):
    if not user_has_system_permission(
        request.user,
        'system.subscriptions.update',
    ):
        return JsonResponse(
            {'ok': False, 'code': 'SYSTEM_SUBSCRIPTIONS_UPDATE_PERMISSION_REQUIRED'},
            status=403,
        )

    subscription = get_object_or_404(
        CompanySubscription,
        id=subscription_id,
    )

    payload = _body(request)

    try:
        payment_id = int(payload.get('payment_id'))
        amount = Decimal(str(payload.get('amount')))
    except (TypeError, ValueError, InvalidOperation):
        return JsonResponse(
            {'ok': False, 'errors': {'payment_id': 'Invalid payment or amount.'}},
            status=400,
        )

    payment = get_object_or_404(
        PlatformSubscriptionPayment.objects.select_related('subscription'),
        id=payment_id,
        subscription=subscription,
    )

    try:
        refund, created = create_or_get_platform_refund(
            payment=payment,
            amount=amount,
            idempotency_key=str(payload.get('idempotency_key') or '').strip(),
            reason=str(payload.get('reason') or '').strip(),
            metadata={'source': 'system-subscription-refund'},
            created_by=request.user,
        )

        refund = execute_platform_refund(
            refund=refund,
            actor=request.user,
        )
    except ValidationError as exc:
        return JsonResponse(
            {'ok': False, 'errors': _errors(exc)},
            status=400,
        )

    return JsonResponse({
        'ok': True,
        'created': created,
        'data': {
            'refund': {
                'id': refund.id,
                'refund_reference': refund.refund_reference,
                'payment_id': refund.payment_id,
                'subscription_id': refund.subscription_id,
                'status': refund.status,
                'gateway': refund.gateway,
                'provider_refund_id': refund.provider_refund_id,
                'amount': f'{refund.amount:.2f}',
                'currency_code': refund.currency_code,
            }
        },
    })

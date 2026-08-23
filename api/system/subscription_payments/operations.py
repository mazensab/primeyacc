from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import (
    login_required,
)
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import (
    HttpRequest,
    JsonResponse,
)
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import (
    require_GET,
    require_POST,
)

from api.permissions import (
    user_has_system_permission,
)
from billing.models import (
    PlatformPaymentReconciliation,
    PlatformSubscriptionPayment,
    PlatformSubscriptionWebhookEvent,
)
from billing.reconciliation_services import (
    reconcile_platform_payment,
)
from integrations.payments.platform_webhooks import (
    reprocess_platform_webhook_event,
)
from integrations.payments.readiness import (
    build_payment_gateway_readiness_payload,
)


READ_PERMISSION = (
    "system.subscriptions.view"
)

WRITE_PERMISSION = (
    "system.subscriptions.update"
)


def _clean(value: Any) -> str:
    return str(
        value or ""
    ).strip()


def _forbidden(
    message: str,
) -> JsonResponse:
    return JsonResponse(
        {
            "ok": False,
            "message": message,
            "code": (
                "SYSTEM_SUBSCRIPTIONS_PERMISSION_REQUIRED"
            ),
        },
        status=403,
    )


def _pagination(
    request: HttpRequest,
) -> tuple[int, int] | JsonResponse:
    try:
        page_size = min(
            max(
                int(
                    request.GET.get(
                        "page_size",
                        25,
                    )
                ),
                1,
            ),
            100,
        )

        page_number = max(
            int(
                request.GET.get(
                    "page",
                    1,
                )
            ),
            1,
        )

    except (
        TypeError,
        ValueError,
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "Invalid pagination values."
                ),
            },
            status=400,
        )

    return (
        page_size,
        page_number,
    )


def _user_payload(
    user,
) -> dict[str, Any] | None:
    if not user:
        return None

    return {
        "id": user.id,
        "username": (
            user.get_username()
        ),
        "email": user.email,
    }


def _reconciliation_payload(
    row: PlatformPaymentReconciliation,
) -> dict[str, Any]:
    return {
        "id": row.id,
        "payment_id": row.payment_id,
        "payment_reference": (
            row.payment.payment_reference
        ),
        "gateway": row.gateway,
        "provider_payment_id": (
            row.provider_payment_id
        ),
        "status": row.status,
        "local_status": (
            row.local_status
        ),
        "provider_status": (
            row.provider_status
        ),
        "local_amount_minor": (
            row.local_amount_minor
        ),
        "provider_amount_minor": (
            row.provider_amount_minor
        ),
        "local_currency": (
            row.local_currency
        ),
        "provider_currency": (
            row.provider_currency
        ),
        "local_reference": (
            row.local_reference
        ),
        "provider_reference": (
            row.provider_reference
        ),
        "checks": dict(
            row.checks or {}
        ),
        "discrepancies": list(
            row.discrepancies or []
        ),
        "warnings": list(
            row.warnings or []
        ),
        "provider_snapshot": dict(
            row.provider_snapshot or {}
        ),
        "error_code": row.error_code,
        "error_message": (
            row.error_message
        ),
        "reconciled_by": (
            _user_payload(
                row.reconciled_by
            )
        ),
        "reconciled_at": (
            row.reconciled_at.isoformat()
            if row.reconciled_at
            else None
        ),
        "created_at": (
            row.created_at.isoformat()
            if row.created_at
            else None
        ),
    }


def _webhook_payload(
    row: PlatformSubscriptionWebhookEvent,
) -> dict[str, Any]:
    return {
        "id": row.id,
        "payment_id": row.payment_id,
        "gateway": row.gateway,
        "provider_event_id": (
            row.provider_event_id
        ),
        "event_type": row.event_type,
        "provider_payment_id": (
            row.provider_payment_id
        ),
        "status": row.status,
        "attempt_count": (
            row.attempt_count
        ),
        "max_attempts": (
            row.max_attempts
        ),
        "duplicate_count": (
            row.duplicate_count
        ),
        "error_code": (
            row.error_code
        ),
        "error_message": (
            row.error_message
        ),
        "payload": dict(
            row.payload or {}
        ),
        "headers": dict(
            row.headers or {}
        ),
        "received_at": (
            row.received_at.isoformat()
            if row.received_at
            else None
        ),
        "last_received_at": (
            row.last_received_at.isoformat()
            if row.last_received_at
            else None
        ),
        "last_attempt_at": (
            row.last_attempt_at.isoformat()
            if row.last_attempt_at
            else None
        ),
        "next_retry_at": (
            row.next_retry_at.isoformat()
            if row.next_retry_at
            else None
        ),
        "processed_at": (
            row.processed_at.isoformat()
            if row.processed_at
            else None
        ),
        "failed_at": (
            row.failed_at.isoformat()
            if row.failed_at
            else None
        ),
    }


def _reconciliation_queryset():
    return (
        PlatformPaymentReconciliation
        .objects
        .select_related(
            "payment",
            "payment__company",
            "payment__subscription",
            "reconciled_by",
        )
    )


def _webhook_queryset():
    return (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_related(
            "payment",
        )
    )


@login_required
@require_GET
def system_payment_reconciliations_list(
    request: HttpRequest,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        READ_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to view payment reconciliations."
        )

    queryset = (
        _reconciliation_queryset()
    )

    status_value = _clean(
        request.GET.get(
            "status"
        )
    ).upper()

    if status_value:
        valid = {
            value
            for value, _
            in PlatformPaymentReconciliation
            .Status
            .choices
        }

        if status_value not in valid:
            return JsonResponse(
                {
                    "ok": False,
                    "message": (
                        "Invalid reconciliation status."
                    ),
                },
                status=400,
            )

        queryset = queryset.filter(
            status=status_value
        )

    gateway = _clean(
        request.GET.get(
            "gateway"
        )
    ).upper()

    if gateway:
        queryset = queryset.filter(
            gateway=gateway
        )

    payment_id = _clean(
        request.GET.get(
            "payment_id"
        )
    )

    if payment_id:
        if not payment_id.isdigit():
            return JsonResponse(
                {
                    "ok": False,
                    "message": (
                        "Invalid payment_id."
                    ),
                },
                status=400,
            )

        queryset = queryset.filter(
            payment_id=int(
                payment_id
            )
        )

    query = _clean(
        request.GET.get("q")
    )

    if query:
        queryset = queryset.filter(
            Q(
                payment__payment_reference__icontains=query
            )
            | Q(
                provider_payment_id__icontains=query
            )
            | Q(
                error_code__icontains=query
            )
        )

    pagination = _pagination(
        request
    )

    if isinstance(
        pagination,
        JsonResponse,
    ):
        return pagination

    page_size, page_number = (
        pagination
    )

    paginator = Paginator(
        queryset,
        page_size,
    )

    page = paginator.get_page(
        page_number
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "count": paginator.count,
                "page": page.number,
                "page_size": page_size,
                "pages": paginator.num_pages,
                "results": [
                    _reconciliation_payload(
                        row
                    )
                    for row
                    in page.object_list
                ],
            },
        }
    )


@login_required
@require_GET
def system_payment_reconciliation_detail(
    request: HttpRequest,
    reconciliation_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        READ_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to view payment reconciliation details."
        )

    row = get_object_or_404(
        _reconciliation_queryset(),
        pk=reconciliation_id,
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "reconciliation": (
                    _reconciliation_payload(
                        row
                    )
                )
            },
        }
    )


@login_required
@require_GET
def system_subscription_payment_reconciliations(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        READ_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to view payment reconciliation history."
        )

    payment = get_object_or_404(
        PlatformSubscriptionPayment,
        pk=payment_id,
    )

    rows = (
        _reconciliation_queryset()
        .filter(
            payment=payment
        )
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "payment_id": payment.pk,
                "payment_reference": (
                    payment.payment_reference
                ),
                "results": [
                    _reconciliation_payload(
                        row
                    )
                    for row in rows
                ],
            },
        }
    )


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_reconcile(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        WRITE_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to reconcile subscription payments."
        )

    payment = get_object_or_404(
        PlatformSubscriptionPayment,
        pk=payment_id,
    )

    try:
        row = reconcile_platform_payment(
            payment=payment,
            actor=request.user,
        )

    except ValidationError as exc:
        errors = (
            exc.message_dict
            if hasattr(
                exc,
                "message_dict",
            )
            else {
                "non_field_errors": (
                    exc.messages
                )
            }
        )

        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "Unable to reconcile subscription payment."
                ),
                "errors": errors,
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "reconciliation": (
                    _reconciliation_payload(
                        row
                    )
                )
            },
        }
    )


@login_required
@require_GET
def system_platform_webhook_events_list(
    request: HttpRequest,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        READ_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to view platform webhook events."
        )

    queryset = (
        _webhook_queryset()
    )

    status_value = _clean(
        request.GET.get(
            "status"
        )
    ).upper()

    if status_value:
        valid = {
            value
            for value, _
            in PlatformSubscriptionWebhookEvent
            .Status
            .choices
        }

        if status_value not in valid:
            return JsonResponse(
                {
                    "ok": False,
                    "message": (
                        "Invalid webhook status."
                    ),
                },
                status=400,
            )

        queryset = queryset.filter(
            status=status_value
        )

    gateway = _clean(
        request.GET.get(
            "gateway"
        )
    ).upper()

    if gateway:
        queryset = queryset.filter(
            gateway=gateway
        )

    payment_id = _clean(
        request.GET.get(
            "payment_id"
        )
    )

    if payment_id:
        if not payment_id.isdigit():
            return JsonResponse(
                {
                    "ok": False,
                    "message": (
                        "Invalid payment_id."
                    ),
                },
                status=400,
            )

        queryset = queryset.filter(
            payment_id=int(
                payment_id
            )
        )

    query = _clean(
        request.GET.get(
            "q"
        )
    )

    if query:
        queryset = queryset.filter(
            Q(
                provider_event_id__icontains=query
            )
            | Q(
                provider_payment_id__icontains=query
            )
            | Q(
                event_type__icontains=query
            )
            | Q(
                error_code__icontains=query
            )
        )

    pagination = _pagination(
        request
    )

    if isinstance(
        pagination,
        JsonResponse,
    ):
        return pagination

    page_size, page_number = (
        pagination
    )

    paginator = Paginator(
        queryset,
        page_size,
    )

    page = paginator.get_page(
        page_number
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "count": paginator.count,
                "page": page.number,
                "page_size": page_size,
                "pages": paginator.num_pages,
                "results": [
                    _webhook_payload(
                        row
                    )
                    for row
                    in page.object_list
                ],
            },
        }
    )


@login_required
@require_GET
def system_platform_webhook_event_detail(
    request: HttpRequest,
    event_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        READ_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to view platform webhook events."
        )

    row = get_object_or_404(
        _webhook_queryset(),
        pk=event_id,
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "event": (
                    _webhook_payload(
                        row
                    )
                )
            },
        }
    )


@login_required
@csrf_protect
@require_POST
def system_platform_webhook_event_reprocess(
    request: HttpRequest,
    event_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        WRITE_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to reprocess platform webhook events."
        )

    row = get_object_or_404(
        PlatformSubscriptionWebhookEvent,
        pk=event_id,
    )

    force_value = _clean(
        request.POST.get(
            "force"
        )
    ).lower()

    force = force_value in {
        "1",
        "true",
        "yes",
        "on",
    }

    try:
        result = (
            reprocess_platform_webhook_event(
                event_id=row.pk,
                force=force,
            )
        )

    except Exception as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "Platform webhook event could not be reprocessed."
                ),
                "error_code": (
                    exc.__class__.__name__
                ),
            },
            status=400,
        )

    row.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "event": (
                    _webhook_payload(
                        row
                    )
                ),
                "result": (
                    result.as_dict()
                ),
            },
        }
    )


@login_required
@require_GET
def system_payment_gateway_readiness(
    request: HttpRequest,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        READ_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to view payment gateway readiness."
        )

    return JsonResponse(
        {
            "ok": True,
            "data": (
                build_payment_gateway_readiness_payload()
            ),
        }
    )

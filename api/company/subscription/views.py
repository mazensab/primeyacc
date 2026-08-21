from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST

from api.permissions import (
    attach_company_context,
    attach_subscription_access,
    request_has_subscription_management_access,
)
from billing.models import (
    PlatformBillingDocument,
    PlatformSubscriptionPayment,
)
from billing.payment_services import create_or_get_subscription_payment
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.services import (
    create_plan_change_pending_subscription,
    create_renewal_pending_subscription,
    money,
)

ALLOWED_GATEWAYS = {"MOYASAR", "TAMARA", "TABBY"}


def _json_body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        value = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _errors(exc: ValidationError) -> dict[str, Any]:
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "messages"):
        return {"non_field_errors": exc.messages}
    return {"non_field_errors": [str(exc)]}


def _money(value: Any) -> str:
    return f"{money(value):.2f}"


def _date(value: Any) -> str | None:
    return value.isoformat() if value else None


def _datetime(value: Any) -> str | None:
    return value.isoformat() if value else None


def _company_context(request: HttpRequest):
    membership = attach_company_context(request)
    if not membership or not membership.is_active_membership:
        return None, JsonResponse(
            {
                "ok": False,
                "code": "ACTIVE_COMPANY_MEMBERSHIP_REQUIRED",
                "message": "Active company membership is required.",
            },
            status=403,
        )

    policy = attach_subscription_access(request)
    return (membership.company, policy), None


def _management_context(request: HttpRequest):
    context, error = _company_context(request)
    if error:
        return None, error

    company, policy = context
    if not request_has_subscription_management_access(request):
        return None, JsonResponse(
            {
                "ok": False,
                "code": "SUBSCRIPTION_MANAGEMENT_ACCESS_REQUIRED",
                "message": "Subscription management access is required.",
                "data": {"subscription_access": policy.as_dict()},
            },
            status=403,
        )

    return (company, policy), None


def _subscription_queryset(company):
    return (
        CompanySubscription.objects.filter(company=company)
        .select_related("plan", "previous_subscription", "previous_subscription__plan")
        .order_by("-created_at", "-id")
    )


def _effective_subscription(company, policy):
    if getattr(policy, "subscription_id", None):
        item = _subscription_queryset(company).filter(pk=policy.subscription_id).first()
        if item:
            return item

    today = __import__("django.utils.timezone", fromlist=["localdate"]).localdate()
    current = (
        _subscription_queryset(company)
        .filter(
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ],
            start_date__lte=today,
        )
        .order_by("-end_date", "-id")
        .first()
    )
    return current or _subscription_queryset(company).first()


def _pending_subscription(company):
    return (
        _subscription_queryset(company)
        .filter(status=CompanySubscription.Status.PENDING_PAYMENT)
        .first()
    )


def _plan_payload(plan: SubscriptionPlan) -> dict[str, Any]:
    return {
        "id": plan.id,
        "name": plan.name,
        "code": plan.code,
        "slug": plan.slug,
        "description": plan.description,
        "monthly_price": _money(plan.monthly_price),
        "yearly_price": _money(plan.yearly_price),
        "max_users": plan.max_users,
        "max_branches": plan.max_branches,
        "max_warehouses": plan.max_warehouses,
        "max_pos": plan.max_pos,
        "features": list(plan.features) if isinstance(plan.features, list) else [],
        "is_active": plan.is_active,
        "is_public": plan.is_public,
        "sort_order": plan.sort_order,
    }


def _subscription_payload(subscription: CompanySubscription | None) -> dict[str, Any] | None:
    if subscription is None:
        return None

    return {
        "id": subscription.id,
        "plan": _plan_payload(subscription.plan),
        "previous_subscription_id": subscription.previous_subscription_id,
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date(subscription.start_date),
        "end_date": _date(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "is_in_grace": subscription.is_in_active_grace,
        "grace_days_remaining": subscription.grace_days_remaining,
        "grace_expires_at": _date(subscription.active_grace_expires_at),
        "price": _money(subscription.price),
        "discount_amount": _money(subscription.discount_amount),
        "amount_before_tax": _money(subscription.amount_before_tax),
        "tax_amount": _money(subscription.tax_amount),
        "total_amount": _money(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "billing_reference": subscription.billing_reference,
        "paid_at": _datetime(subscription.paid_at),
        "activated_at": _datetime(subscription.activated_at),
        "cancelled_at": _datetime(subscription.cancelled_at),
        "suspended_at": _datetime(subscription.suspended_at),
        "created_at": _datetime(subscription.created_at),
        "updated_at": _datetime(subscription.updated_at),
    }


def _document_payload(document: PlatformBillingDocument) -> dict[str, Any]:
    return {
        "id": document.id,
        "subscription_id": document.subscription_id,
        "document_type": document.document_type,
        "document_number": document.document_number,
        "status": document.status,
        "currency_code": document.currency_code,
        "subtotal": _money(document.subtotal),
        "discount_amount": _money(document.discount_amount),
        "taxable_amount": _money(document.taxable_amount),
        "tax_amount": _money(document.tax_amount),
        "total_amount": _money(document.total_amount),
        "paid_amount": _money(document.paid_amount),
        "balance_amount": _money(document.balance_amount),
        "billing_reference": document.billing_reference,
        "transaction_reference": document.transaction_reference,
        "payment_method": document.payment_method,
        "issue_date": _date(document.issue_date),
        "issued_at": _datetime(document.issued_at),
        "paid_at": _datetime(document.paid_at),
        "cancelled_at": _datetime(document.cancelled_at),
    }


def _payment_payload(payment: PlatformSubscriptionPayment) -> dict[str, Any]:
    return {
        "id": payment.id,
        "subscription_id": payment.subscription_id,
        "invoice_id": payment.invoice_id,
        "receipt_id": payment.receipt_id,
        "payment_reference": payment.payment_reference,
        "attempt_number": payment.attempt_number,
        "status": payment.status,
        "gateway": payment.gateway,
        "payment_method": payment.payment_method,
        "gateway_payment_id": payment.gateway_payment_id,
        "transaction_reference": payment.transaction_reference,
        "billing_reference": payment.billing_reference,
        "amount": _money(payment.amount),
        "currency_code": payment.currency_code,
        "failure_code": payment.failure_code,
        "failure_message": payment.failure_message,
        "cancellation_reason": payment.cancellation_reason,
        "initiated_at": _datetime(payment.initiated_at),
        "processing_at": _datetime(payment.processing_at),
        "paid_at": _datetime(payment.paid_at),
        "failed_at": _datetime(payment.failed_at),
        "cancelled_at": _datetime(payment.cancelled_at),
        "created_at": _datetime(payment.created_at),
        "updated_at": _datetime(payment.updated_at),
    }


def _pending_conflict(company):
    pending = _pending_subscription(company)
    if pending is None:
        return None

    return JsonResponse(
        {
            "ok": False,
            "code": "PENDING_SUBSCRIPTION_CHANGE_EXISTS",
            "message": "A subscription change is already awaiting payment.",
            "data": {"subscription": _subscription_payload(pending)},
        },
        status=409,
    )


def _billing_cycle(value: Any, fallback: str) -> str:
    cycle = str(value or fallback).strip().upper()
    valid = {choice[0] for choice in CompanySubscription.BillingCycle.choices}
    if cycle not in valid:
        raise ValidationError({"billing_cycle": ["Invalid billing cycle."]})
    return cycle


def _bool(value: Any, default: bool) -> bool:
    if value in {None, ""}:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _gateway(value: Any) -> str:
    gateway = str(value or "").strip().upper()
    if gateway not in ALLOWED_GATEWAYS:
        raise ValidationError(
            {"gateway": ["Gateway must be MOYASAR, TAMARA, or TABBY."]}
        )
    return gateway


def _idempotency_key(request: HttpRequest, *, company_id: int, subscription_id: int, action: str) -> str:
    supplied = str(request.headers.get("Idempotency-Key") or "").strip()
    if supplied:
        return supplied
    return f"company:{company_id}:subscription:{subscription_id}:{action.lower()}"


@login_required
@require_GET
def company_subscription_detail(request: HttpRequest) -> JsonResponse:
    context, error = _management_context(request)
    if error:
        return error
    company, policy = context
    effective = _effective_subscription(company, policy)
    latest = _subscription_queryset(company).first()
    pending = _pending_subscription(company)

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                    "company_code": getattr(company, "company_code", ""),
                    "currency_code": getattr(company, "currency_code", "SAR"),
                },
                "subscription_access": policy.as_dict(),
                "effective_subscription": _subscription_payload(effective),
                "latest_subscription": _subscription_payload(latest),
                "pending_subscription": _subscription_payload(pending),
                "history": [
                    _subscription_payload(item)
                    for item in _subscription_queryset(company)[:20]
                ],
            },
        }
    )


@login_required
@require_GET
def company_subscription_plans(request: HttpRequest) -> JsonResponse:
    context, error = _management_context(request)
    if error:
        return error
    company, policy = context
    plans = SubscriptionPlan.objects.filter(is_active=True, is_public=True).order_by(
        "sort_order", "monthly_price", "id"
    )
    return JsonResponse(
        {
            "ok": True,
            "data": {
                "subscription_access": policy.as_dict(),
                "items": [_plan_payload(plan) for plan in plans],
            },
        }
    )


@login_required
@require_GET
def company_subscription_billing(request: HttpRequest) -> JsonResponse:
    context, error = _management_context(request)
    if error:
        return error
    company, policy = context

    documents = (
        PlatformBillingDocument.objects.filter(company=company)
        .select_related("subscription", "related_invoice")
        .order_by("-issued_at", "-id")
    )
    payments = (
        PlatformSubscriptionPayment.objects.filter(company=company)
        .select_related("subscription", "invoice", "receipt")
        .order_by("-created_at", "-id")
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "subscription_access": policy.as_dict(),
                "documents": [_document_payload(item) for item in documents],
                "payments": [_payment_payload(item) for item in payments],
            },
        }
    )


@login_required
@csrf_protect
@require_POST
def company_subscription_renew(request: HttpRequest) -> JsonResponse:
    context, error = _management_context(request)
    if error:
        return error
    company, policy = context

    conflict = _pending_conflict(company)
    if conflict:
        return conflict

    current = _effective_subscription(company, policy)
    if current is None or current.status not in {
        CompanySubscription.Status.TRIAL,
        CompanySubscription.Status.ACTIVE,
        CompanySubscription.Status.EXPIRED,
    }:
        return JsonResponse(
            {
                "ok": False,
                "code": "SUBSCRIPTION_NOT_RENEWABLE",
                "message": "The current subscription cannot be renewed.",
            },
            status=400,
        )

    payload = _json_body(request)
    try:
        cycle = _billing_cycle(payload.get("billing_cycle"), current.billing_cycle)
        gateway = _gateway(payload.get("gateway"))
        auto_renew = _bool(payload.get("auto_renew"), current.auto_renew)

        pending = create_renewal_pending_subscription(
            current_subscription=current,
            plan=current.plan,
            billing_cycle=cycle,
            discount_amount=0,
            auto_renew=auto_renew,
            created_by=request.user,
            notes="Company self-service renewal.",
        )
        payment, _ = create_or_get_subscription_payment(
            subscription=pending,
            idempotency_key=_idempotency_key(
                request,
                company_id=company.id,
                subscription_id=pending.id,
                action="renewal",
            ),
            gateway=gateway,
            payment_method=gateway,
            metadata={"source": "company-self-service", "action": "renewal"},
            created_by=request.user,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "code": "SUBSCRIPTION_RENEWAL_INVALID",
                "message": "Unable to create subscription renewal.",
                "errors": _errors(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "current_subscription": _subscription_payload(current),
                "subscription": _subscription_payload(pending),
                "payment": _payment_payload(payment),
            },
        },
        status=201,
    )


@login_required
@csrf_protect
@require_POST
def company_subscription_change_plan(request: HttpRequest) -> JsonResponse:
    context, error = _management_context(request)
    if error:
        return error
    company, policy = context

    conflict = _pending_conflict(company)
    if conflict:
        return conflict

    current = _effective_subscription(company, policy)
    if current is None or current.status not in {
        CompanySubscription.Status.TRIAL,
        CompanySubscription.Status.ACTIVE,
    }:
        return JsonResponse(
            {
                "ok": False,
                "code": "SUBSCRIPTION_PLAN_CHANGE_NOT_ALLOWED",
                "message": "The current subscription cannot change plan.",
            },
            status=400,
        )

    payload = _json_body(request)
    try:
        plan_id = int(payload.get("plan_id"))
    except (TypeError, ValueError):
        return JsonResponse(
            {
                "ok": False,
                "code": "PLAN_REQUIRED",
                "errors": {"plan_id": ["A valid plan_id is required."]},
            },
            status=400,
        )

    new_plan = SubscriptionPlan.objects.filter(
        pk=plan_id,
        is_active=True,
        is_public=True,
    ).first()

    if new_plan is None:
        return JsonResponse(
            {
                "ok": False,
                "code": "PLAN_NOT_AVAILABLE",
                "errors": {"plan_id": ["The selected plan is not available."]},
            },
            status=400,
        )

    if new_plan.id == current.plan_id:
        return JsonResponse(
            {
                "ok": False,
                "code": "PLAN_ALREADY_ACTIVE",
                "errors": {"plan_id": ["Select a different plan."]},
            },
            status=400,
        )

    try:
        cycle = _billing_cycle(payload.get("billing_cycle"), current.billing_cycle)
        gateway = _gateway(payload.get("gateway"))
        auto_renew = _bool(payload.get("auto_renew"), current.auto_renew)

        current_price = current.plan.get_price_for_cycle(cycle)
        new_price = new_plan.get_price_for_cycle(cycle)

        if new_price > current_price:
            action = CompanySubscription.SubscriptionAction.UPGRADE
        elif new_price < current_price:
            action = CompanySubscription.SubscriptionAction.DOWNGRADE
        elif new_plan.sort_order > current.plan.sort_order:
            action = CompanySubscription.SubscriptionAction.UPGRADE
        else:
            action = CompanySubscription.SubscriptionAction.DOWNGRADE

        pending = create_plan_change_pending_subscription(
            current_subscription=current,
            new_plan=new_plan,
            billing_cycle=cycle,
            action=action,
            discount_amount=0,
            auto_renew=auto_renew,
            created_by=request.user,
            notes=f"Company self-service {action.lower()}.",
        )

        payment, _ = create_or_get_subscription_payment(
            subscription=pending,
            idempotency_key=_idempotency_key(
                request,
                company_id=company.id,
                subscription_id=pending.id,
                action=action,
            ),
            gateway=gateway,
            payment_method=gateway,
            metadata={"source": "company-self-service", "action": action},
            created_by=request.user,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "code": "SUBSCRIPTION_PLAN_CHANGE_INVALID",
                "message": "Unable to create plan change.",
                "errors": _errors(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "current_subscription": _subscription_payload(current),
                "subscription": _subscription_payload(pending),
                "payment": _payment_payload(payment),
                "action": action,
            },
        },
        status=201,
    )

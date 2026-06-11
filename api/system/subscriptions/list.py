# ============================================================
# 📂 api/system/subscriptions/list.py
# 🧠 PrimeyAcc | System Company Subscriptions List API V1.2
# ------------------------------------------------------------
# ✅ List company subscriptions for system workspace
# ✅ Supports search, status, action, billing cycle, plan, company filters
# ✅ Includes Phase 19 billing/payment lifecycle fields
# ✅ Returns clean stats for SaaS subscriptions dashboard pages
# ✅ Protected by system permission: system.subscriptions.view
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة في Phase 19:
# - عرض كل اشتراكات الشركات لا يسمح لمستخدم company فقط
# - الاشتراك الحالي للشركة يجب أن يكون واحدًا فقط TRIAL أو ACTIVE
# - PENDING_PAYMENT يظهر في القائمة ولا يعتبر اشتراكًا حاليًا
# - البيانات حقيقية من قاعدة البيانات فقط بدون mock data
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, QuerySet, Sum
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription
from subscriptions.services import money


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{money(value):.2f}"


def _date_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _company_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع بيانات الشركة المرتبطة بالاشتراك بشكل آمن.
    """

    company = subscription.company

    return {
        "id": company.id,
        "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "company_code": getattr(company, "company_code", ""),
        "code": getattr(company, "company_code", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "mobile": getattr(company, "mobile", ""),
        "city": getattr(company, "city", ""),
        "status": getattr(company, "status", ""),
        "is_active": getattr(company, "is_active", True),
    }


def _plan_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع بيانات الباقة المرتبطة بالاشتراك بشكل مختصر.
    """

    plan = subscription.plan

    return {
        "id": plan.id,
        "name": plan.name,
        "code": plan.code,
        "slug": plan.slug,
        "monthly_price": _money_to_string(plan.monthly_price),
        "yearly_price": _money_to_string(plan.yearly_price),
        "is_active": plan.is_active,
        "is_public": plan.is_public,
    }


def _previous_subscription_payload(
    subscription: CompanySubscription,
) -> dict[str, Any] | None:
    """
    يرجع ملخص الاشتراك السابق إن وجد.
    """

    previous = subscription.previous_subscription

    if not previous:
        return None

    return {
        "id": previous.id,
        "plan_id": previous.plan_id,
        "status": previous.status,
        "action": previous.action,
        "billing_cycle": previous.billing_cycle,
        "start_date": _date_to_string(previous.start_date),
        "end_date": _date_to_string(previous.end_date),
        "is_current": previous.is_current,
        "is_pending_payment": previous.is_pending_payment,
        "billing_reference": previous.billing_reference,
        "paid_at": _datetime_to_string(previous.paid_at),
        "activated_at": _datetime_to_string(previous.activated_at),
        "cancelled_at": _datetime_to_string(previous.cancelled_at),
    }


def _lifecycle_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع ملخص دورة حياة الاشتراك للقائمة.
    """

    return {
        "status": subscription.status,
        "action": subscription.action,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "days_remaining": subscription.days_remaining,
        "auto_renew": subscription.auto_renew,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "can_confirm_payment": subscription.status == CompanySubscription.Status.PENDING_PAYMENT,
        "can_renew": subscription.status
        in {
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
            CompanySubscription.Status.EXPIRED,
        },
        "can_change_plan": subscription.status
        in {
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        },
        "can_cancel": subscription.status
        in {
            CompanySubscription.Status.PENDING_PAYMENT,
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        },
    }


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    return {
        "id": subscription.id,
        "company": _company_payload(subscription),
        "plan": _plan_payload(subscription),
        "previous_subscription_id": subscription.previous_subscription_id,
        "previous_subscription": _previous_subscription_payload(subscription),
        "lifecycle": _lifecycle_payload(subscription),
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "billing_reference": subscription.billing_reference,
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "notes": subscription.notes,
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


def _apply_filters(
    request: HttpRequest,
    queryset: QuerySet[CompanySubscription],
) -> QuerySet[CompanySubscription]:
    """
    يطبق البحث والفلاتر القادمة من Query Params.
    """

    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().upper()
    action = (request.GET.get("action") or "").strip().upper()
    billing_cycle = (request.GET.get("billing_cycle") or "").strip().upper()
    plan_id = (request.GET.get("plan_id") or "").strip()
    company_id = (request.GET.get("company_id") or "").strip()
    current = (request.GET.get("current") or "").strip().lower()
    pending_payment = (request.GET.get("pending_payment") or "").strip().lower()
    auto_renew = (request.GET.get("auto_renew") or "").strip().lower()

    if search:
        queryset = queryset.filter(
            Q(company__name__icontains=search)
            | Q(company__name_ar__icontains=search)
            | Q(company__name_en__icontains=search)
            | Q(company__company_code__icontains=search)
            | Q(company__email__icontains=search)
            | Q(company__phone__icontains=search)
            | Q(company__mobile__icontains=search)
            | Q(company__city__icontains=search)
            | Q(plan__name__icontains=search)
            | Q(plan__slug__icontains=search)
            | Q(plan__code__icontains=search)
            | Q(action__icontains=search)
            | Q(billing_reference__icontains=search)
            | Q(notes__icontains=search)
        )

    valid_statuses = {choice[0] for choice in CompanySubscription.Status.choices}
    if status in valid_statuses:
        queryset = queryset.filter(status=status)

    valid_actions = {choice[0] for choice in CompanySubscription.SubscriptionAction.choices}
    if action in valid_actions:
        queryset = queryset.filter(action=action)

    valid_cycles = {choice[0] for choice in CompanySubscription.BillingCycle.choices}
    if billing_cycle in valid_cycles:
        queryset = queryset.filter(billing_cycle=billing_cycle)

    if plan_id.isdigit():
        queryset = queryset.filter(plan_id=int(plan_id))

    if company_id.isdigit():
        queryset = queryset.filter(company_id=int(company_id))

    if current in {"1", "true", "yes", "active"}:
        today = timezone.localdate()
        queryset = queryset.filter(
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ],
            start_date__lte=today,
            end_date__gte=today,
        )

    if current in {"0", "false", "no", "inactive"}:
        today = timezone.localdate()
        queryset = queryset.exclude(
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ],
            start_date__lte=today,
            end_date__gte=today,
        )

    if pending_payment in {"1", "true", "yes", "on"}:
        queryset = queryset.filter(status=CompanySubscription.Status.PENDING_PAYMENT)

    if pending_payment in {"0", "false", "no", "off"}:
        queryset = queryset.exclude(status=CompanySubscription.Status.PENDING_PAYMENT)

    if auto_renew in {"1", "true", "yes", "on"}:
        queryset = queryset.filter(auto_renew=True)

    if auto_renew in {"0", "false", "no", "off"}:
        queryset = queryset.filter(auto_renew=False)

    return queryset


def _build_stats(queryset: QuerySet[CompanySubscription]) -> dict[str, Any]:
    """
    يبني إحصائيات مختصرة للقائمة والداشبورد.
    """

    today = timezone.localdate()

    aggregate = queryset.aggregate(
        total_amount_sum=Sum("total_amount"),
        pending_payment_count=Count(
            "id",
            filter=Q(status=CompanySubscription.Status.PENDING_PAYMENT),
        ),
        active_count=Count(
            "id",
            filter=Q(status=CompanySubscription.Status.ACTIVE),
        ),
        trial_count=Count(
            "id",
            filter=Q(status=CompanySubscription.Status.TRIAL),
        ),
        expired_count=Count(
            "id",
            filter=Q(status=CompanySubscription.Status.EXPIRED),
        ),
        cancelled_count=Count(
            "id",
            filter=Q(status=CompanySubscription.Status.CANCELLED),
        ),
        suspended_count=Count(
            "id",
            filter=Q(status=CompanySubscription.Status.SUSPENDED),
        ),
        new_count=Count(
            "id",
            filter=Q(action=CompanySubscription.SubscriptionAction.NEW),
        ),
        renewal_count=Count(
            "id",
            filter=Q(action=CompanySubscription.SubscriptionAction.RENEWAL),
        ),
        upgrade_count=Count(
            "id",
            filter=Q(action=CompanySubscription.SubscriptionAction.UPGRADE),
        ),
        downgrade_count=Count(
            "id",
            filter=Q(action=CompanySubscription.SubscriptionAction.DOWNGRADE),
        ),
        manual_count=Count(
            "id",
            filter=Q(action=CompanySubscription.SubscriptionAction.MANUAL),
        ),
        monthly_count=Count(
            "id",
            filter=Q(billing_cycle=CompanySubscription.BillingCycle.MONTHLY),
        ),
        yearly_count=Count(
            "id",
            filter=Q(billing_cycle=CompanySubscription.BillingCycle.YEARLY),
        ),
        auto_renew_count=Count(
            "id",
            filter=Q(auto_renew=True),
        ),
        current_count=Count(
            "id",
            filter=Q(
                status__in=[
                    CompanySubscription.Status.TRIAL,
                    CompanySubscription.Status.ACTIVE,
                ],
                start_date__lte=today,
                end_date__gte=today,
            ),
        ),
        paid_count=Count(
            "id",
            filter=Q(paid_at__isnull=False),
        ),
        activated_count=Count(
            "id",
            filter=Q(activated_at__isnull=False),
        ),
    )

    total_count = queryset.count()

    return {
        "total": total_count,
        "current": aggregate.get("current_count") or 0,
        "pending_payment": aggregate.get("pending_payment_count") or 0,
        "active": aggregate.get("active_count") or 0,
        "trial": aggregate.get("trial_count") or 0,
        "expired": aggregate.get("expired_count") or 0,
        "cancelled": aggregate.get("cancelled_count") or 0,
        "suspended": aggregate.get("suspended_count") or 0,
        "new": aggregate.get("new_count") or 0,
        "renewal": aggregate.get("renewal_count") or 0,
        "upgrade": aggregate.get("upgrade_count") or 0,
        "downgrade": aggregate.get("downgrade_count") or 0,
        "manual": aggregate.get("manual_count") or 0,
        "monthly": aggregate.get("monthly_count") or 0,
        "yearly": aggregate.get("yearly_count") or 0,
        "auto_renew": aggregate.get("auto_renew_count") or 0,
        "paid": aggregate.get("paid_count") or 0,
        "activated": aggregate.get("activated_count") or 0,
        "total_amount": _money_to_string(aggregate.get("total_amount_sum") or 0),
    }


@login_required
@require_GET
def system_subscriptions_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/system/subscriptions/

    يعرض اشتراكات الشركات لمساحة النظام فقط.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.view"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_VIEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    queryset = (
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "created_by",
            "previous_subscription",
            "previous_subscription__plan",
        )
        .order_by("-created_at", "-id")
    )

    queryset = _apply_filters(request, queryset)

    stats = _build_stats(queryset)
    items = [_subscription_payload(subscription) for subscription in queryset]

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب اشتراكات الشركات بنجاح.",
            "data": {
                "items": items,
                "results": items,
                "count": stats["total"],
                "stats": stats,
                "filters": {
                    "supported_statuses": [
                        choice[0] for choice in CompanySubscription.Status.choices
                    ],
                    "supported_actions": [
                        choice[0] for choice in CompanySubscription.SubscriptionAction.choices
                    ],
                    "supported_billing_cycles": [
                        choice[0] for choice in CompanySubscription.BillingCycle.choices
                    ],
                },
            },
        },
        status=200,
    )
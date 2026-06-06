# ============================================================
# 📂 api/system/subscriptions/list.py
# 🧠 PrimeyAcc | System Company Subscriptions List API V1.0
# ------------------------------------------------------------
# ✅ List company subscriptions for system workspace
# ✅ Supports search, status, billing cycle, plan, and company filters
# ✅ Returns clean stats for future SaaS dashboard pages
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - الاشتراك الحالي للشركة يجب أن يكون واحدًا فقط TRIAL أو ACTIVE
# - البيانات حقيقية من قاعدة البيانات فقط بدون mock data
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, QuerySet, Sum
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from subscriptions.models import CompanySubscription


def _user_can_access_system(request: HttpRequest) -> bool:
    """
    يتحقق من صلاحية دخول مساحة النظام.
    """

    user = request.user

    if not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    profile = getattr(user, "profile", None)
    return bool(profile and profile.can_access_system)


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{value:.2f}"


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
        "name": getattr(company, "name", ""),
        "code": getattr(company, "code", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "city": getattr(company, "city", ""),
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


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    return {
        "id": subscription.id,
        "company": _company_payload(subscription),
        "plan": _plan_payload(subscription),
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "notes": subscription.notes,
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
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
    billing_cycle = (request.GET.get("billing_cycle") or "").strip().upper()
    plan_id = (request.GET.get("plan_id") or "").strip()
    company_id = (request.GET.get("company_id") or "").strip()
    current = (request.GET.get("current") or "").strip().lower()
    auto_renew = (request.GET.get("auto_renew") or "").strip().lower()

    if search:
        queryset = queryset.filter(
            Q(company__name__icontains=search)
            | Q(company__code__icontains=search)
            | Q(company__email__icontains=search)
            | Q(company__phone__icontains=search)
            | Q(plan__name__icontains=search)
            | Q(plan__slug__icontains=search)
            | Q(plan__code__icontains=search)
            | Q(notes__icontains=search)
        )

    valid_statuses = {choice[0] for choice in CompanySubscription.Status.choices}
    if status in valid_statuses:
        queryset = queryset.filter(status=status)

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
    )

    total_count = queryset.count()

    return {
        "total": total_count,
        "current": aggregate.get("current_count") or 0,
        "active": aggregate.get("active_count") or 0,
        "trial": aggregate.get("trial_count") or 0,
        "expired": aggregate.get("expired_count") or 0,
        "cancelled": aggregate.get("cancelled_count") or 0,
        "suspended": aggregate.get("suspended_count") or 0,
        "monthly": aggregate.get("monthly_count") or 0,
        "yearly": aggregate.get("yearly_count") or 0,
        "auto_renew": aggregate.get("auto_renew_count") or 0,
        "total_amount": _money_to_string(aggregate.get("total_amount_sum") or 0),
    }


@login_required
@require_GET
def system_subscriptions_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/system/subscriptions/

    يعرض اشتراكات الشركات لمساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى اشتراكات الشركات.",
            },
            status=403,
        )

    queryset = (
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "created_by",
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
            },
        },
        status=200,
    )
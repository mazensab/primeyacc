# ============================================================
# 📂 api/system/companies/list.py
# 🧠 PrimeyAcc | System Companies List API V1.0
# ------------------------------------------------------------
# ✅ List tenant companies for system workspace
# ✅ Supports search, status, activity, city, region, and active filters
# ✅ Returns subscription summary for each company
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - Company هي حدود العزل الأساسية للنظام
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - البيانات حقيقية من قاعدة البيانات فقط بدون mock data
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.db import models
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from companies.models import Company, CompanyActivityProfile, CompanyStatus
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


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _owner_payload(company: Company) -> dict[str, Any] | None:
    """
    يرجع بيانات مالك الشركة إن وجد.
    """

    owner = company.owner

    if not owner:
        return None

    full_name = owner.get_full_name().strip()

    return {
        "id": owner.id,
        "username": owner.username,
        "email": owner.email,
        "name": full_name or owner.username,
        "is_active": owner.is_active,
    }


def _subscription_payload(subscription: CompanySubscription | None) -> dict[str, Any] | None:
    """
    يرجع ملخص الاشتراك الحالي للشركة إن وجد.
    """

    if not subscription:
        return None

    plan = subscription.plan

    return {
        "id": subscription.id,
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
        "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "plan": {
            "id": plan.id,
            "name": plan.name,
            "code": plan.code,
            "slug": plan.slug,
        },
    }


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يحول كائن الشركة إلى JSON نظيف للواجهة.
    """

    current_subscription = getattr(company, "current_subscription", None)

    if isinstance(current_subscription, list):
        current_subscription = current_subscription[0] if current_subscription else None

    logo_url = None
    if company.logo:
        try:
            logo_url = company.logo.url
        except ValueError:
            logo_url = None

    return {
        "id": company.id,
        "name": company.name,
        "display_name": company.display_name,
        "name_ar": company.name_ar,
        "name_en": company.name_en,
        "company_code": company.company_code,
        "activity_profile": company.activity_profile,
        "status": company.status,
        "is_active": company.is_active,
        "commercial_registration": company.commercial_registration,
        "tax_number": company.tax_number,
        "email": company.email,
        "phone": company.phone,
        "mobile": company.mobile,
        "whatsapp_number": company.whatsapp_number,
        "country": company.country,
        "building_number": company.building_number,
        "street_name": company.street_name,
        "district": company.district,
        "city": company.city,
        "region": company.region,
        "postal_code": company.postal_code,
        "short_address": company.short_address,
        "address": company.address,
        "national_address_line": company.national_address_line,
        "logo_url": logo_url,
        "currency_code": company.currency_code,
        "vat_percentage": _money_to_string(company.vat_percentage),
        "trial_ends_at": _datetime_to_string(company.trial_ends_at),
        "suspended_at": _datetime_to_string(company.suspended_at),
        "suspended_reason": company.suspended_reason,
        "owner": _owner_payload(company),
        "subscriptions_count": getattr(company, "subscriptions_count", 0),
        "current_subscription": _subscription_payload(current_subscription),
        "notes": company.notes,
        "created_at": _datetime_to_string(company.created_at),
        "updated_at": _datetime_to_string(company.updated_at),
    }


def _apply_filters(request: HttpRequest, queryset: QuerySet[Company]) -> QuerySet[Company]:
    """
    يطبق البحث والفلاتر القادمة من Query Params.
    """

    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().upper()
    activity_profile = (request.GET.get("activity_profile") or "").strip().upper()
    city = (request.GET.get("city") or "").strip()
    region = (request.GET.get("region") or "").strip()
    active = (request.GET.get("active") or "").strip().lower()
    has_subscription = (request.GET.get("has_subscription") or "").strip().lower()

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(company_code__icontains=search)
            | Q(commercial_registration__icontains=search)
            | Q(tax_number__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
            | Q(mobile__icontains=search)
            | Q(whatsapp_number__icontains=search)
            | Q(city__icontains=search)
            | Q(region__icontains=search)
            | Q(district__icontains=search)
            | Q(short_address__icontains=search)
            | Q(notes__icontains=search)
        )

    valid_statuses = {choice[0] for choice in CompanyStatus.choices}
    if status in valid_statuses:
        queryset = queryset.filter(status=status)

    valid_activities = {choice[0] for choice in CompanyActivityProfile.choices}
    if activity_profile in valid_activities:
        queryset = queryset.filter(activity_profile=activity_profile)

    if city:
        queryset = queryset.filter(city__icontains=city)

    if region:
        queryset = queryset.filter(region__icontains=region)

    if active in {"1", "true", "yes", "active"}:
        queryset = queryset.filter(is_active=True)

    if active in {"0", "false", "no", "inactive"}:
        queryset = queryset.filter(is_active=False)

    if has_subscription in {"1", "true", "yes"}:
        queryset = queryset.filter(subscriptions__isnull=False).distinct()

    if has_subscription in {"0", "false", "no"}:
        queryset = queryset.filter(subscriptions__isnull=True)

    return queryset


def _build_stats(queryset: QuerySet[Company]) -> dict[str, Any]:
    """
    يبني إحصائيات مختصرة للقائمة والداشبورد.
    """

    aggregate = queryset.aggregate(
        active_count=Count("id", filter=Q(is_active=True)),
        inactive_count=Count("id", filter=Q(is_active=False)),
        trial_count=Count("id", filter=Q(status=CompanyStatus.TRIAL)),
        status_active_count=Count("id", filter=Q(status=CompanyStatus.ACTIVE)),
        suspended_count=Count("id", filter=Q(status=CompanyStatus.SUSPENDED)),
        expired_count=Count("id", filter=Q(status=CompanyStatus.EXPIRED)),
        cancelled_count=Count("id", filter=Q(status=CompanyStatus.CANCELLED)),
        general_count=Count("id", filter=Q(activity_profile=CompanyActivityProfile.GENERAL)),
        retail_count=Count("id", filter=Q(activity_profile=CompanyActivityProfile.RETAIL)),
        wholesale_count=Count("id", filter=Q(activity_profile=CompanyActivityProfile.WHOLESALE)),
        jewelry_count=Count("id", filter=Q(activity_profile=CompanyActivityProfile.JEWELRY)),
        petrol_station_count=Count(
            "id",
            filter=Q(activity_profile=CompanyActivityProfile.PETROL_STATION),
        ),
    )

    total_count = queryset.count()

    return {
        "total": total_count,
        "active": aggregate.get("active_count") or 0,
        "inactive": aggregate.get("inactive_count") or 0,
        "status_active": aggregate.get("status_active_count") or 0,
        "trial": aggregate.get("trial_count") or 0,
        "suspended": aggregate.get("suspended_count") or 0,
        "expired": aggregate.get("expired_count") or 0,
        "cancelled": aggregate.get("cancelled_count") or 0,
        "activity_profiles": {
            "general": aggregate.get("general_count") or 0,
            "retail": aggregate.get("retail_count") or 0,
            "wholesale": aggregate.get("wholesale_count") or 0,
            "jewelry": aggregate.get("jewelry_count") or 0,
            "petrol_station": aggregate.get("petrol_station_count") or 0,
        },
    }


@login_required
@require_GET
def system_companies_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/system/companies/

    يعرض شركات النظام لمساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى شركات النظام.",
            },
            status=403,
        )

    current_subscription_prefetch = models.Prefetch(
        "subscriptions",
        queryset=CompanySubscription.objects.select_related("plan")
        .filter(
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ]
        )
        .order_by("-created_at", "-id"),
        to_attr="current_subscription",
    )

    queryset = (
        Company.objects.select_related(
            "owner",
            "created_by",
            "updated_by",
        )
        .prefetch_related(current_subscription_prefetch)
        .annotate(subscriptions_count=Count("subscriptions", distinct=True))
        .order_by("-created_at", "-id")
    )

    queryset = _apply_filters(request, queryset)

    stats = _build_stats(queryset)
    items = [_company_payload(company) for company in queryset]

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب شركات النظام بنجاح.",
            "data": {
                "items": items,
                "results": items,
                "count": stats["total"],
                "stats": stats,
            },
        },
        status=200,
    )
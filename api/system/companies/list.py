# ============================================================
# 📂 api/system/companies/list.py
# 🧠 Mhamcloud | System Companies List API V1.2
# ------------------------------------------------------------
# ✅ List tenant companies for system workspace
# ✅ Supports search, status, legacy activity, ActivityProfile ref, city, region, and active filters
# ✅ Returns legal/tax and Saudi National Address fields
# ✅ Returns ActivityProfile reference snapshot
# ✅ Returns subscription summary for each company
# ✅ Protected by system permission: system.companies.view
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company هي حدود العزل الأساسية للنظام
# - قائمة الشركات تعرض بيانات حقيقية فقط بدون mock data
# - activity_profile legacy يبقى للتوافق
# - activity_profile_ref هو مرجع النشاط القابل للتوسع
# - جميع APIs داخل /api/system/ تتطلب صلاحيات النظام
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.db import models
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from companies.models import (
    ActivityProfile,
    Company,
    CompanyActivityProfile,
    CompanyStatus,
)
from subscriptions.models import CompanySubscription


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

    owner = getattr(company, "owner", None)

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


def _activity_profile_payload(profile: ActivityProfile | None) -> dict[str, Any] | None:
    """
    يرجع بيانات بروفايل النشاط المرتبط بالشركة.
    """

    if not profile:
        return None

    return {
        "id": profile.id,
        "code": profile.code,
        "name": profile.name,
        "name_ar": profile.name_ar,
        "name_en": profile.name_en,
        "display_name": profile.display_name,
        "description": profile.description,
        "is_system": profile.is_system,
        "is_active": profile.is_active,
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


def _logo_url(company: Company) -> str | None:
    """
    يرجع رابط شعار الشركة بشكل آمن.
    """

    logo = getattr(company, "logo", None)

    if not logo:
        return None

    try:
        return logo.url
    except ValueError:
        return None


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يحول كائن الشركة إلى JSON نظيف للواجهة.
    """

    current_subscription = getattr(company, "current_subscription", None)

    if isinstance(current_subscription, list):
        current_subscription = current_subscription[0] if current_subscription else None

    activity_profile_ref = getattr(company, "activity_profile_ref", None)

    return {
        "id": company.id,
        "name": getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", getattr(company, "name", "")),
        "name_ar": getattr(company, "name_ar", ""),
        "name_en": getattr(company, "name_en", ""),
        "company_code": getattr(company, "company_code", ""),
        "activity_profile": getattr(company, "activity_profile", ""),
        "activity_profile_ref_id": getattr(company, "activity_profile_ref_id", None),
        "activity_profile_ref": _activity_profile_payload(activity_profile_ref),
        "activity_profile_display": (
            activity_profile_ref.display_name
            if activity_profile_ref
            else getattr(company, "activity_profile", "")
        ),
        "status": getattr(company, "status", ""),
        "is_active": getattr(company, "is_active", True),
        "commercial_registration": getattr(company, "commercial_registration", ""),
        "tax_number": getattr(company, "tax_number", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "mobile": getattr(company, "mobile", ""),
        "whatsapp_number": getattr(company, "whatsapp_number", ""),
        "website": getattr(company, "website", ""),
        "country": getattr(company, "country", ""),
        "building_number": getattr(company, "building_number", ""),
        "street_name": getattr(company, "street_name", ""),
        "district": getattr(company, "district", ""),
        "city": getattr(company, "city", ""),
        "region": getattr(company, "region", ""),
        "postal_code": getattr(company, "postal_code", ""),
        "short_address": getattr(company, "short_address", ""),
        "address": getattr(company, "address", ""),
        "national_address_line": getattr(company, "national_address_line", ""),
        "logo_url": _logo_url(company),
        "currency_code": getattr(company, "currency_code", "SAR"),
        "vat_percentage": _money_to_string(getattr(company, "vat_percentage", None)),
        "trial_ends_at": _datetime_to_string(getattr(company, "trial_ends_at", None)),
        "suspended_at": _datetime_to_string(getattr(company, "suspended_at", None)),
        "suspended_reason": getattr(company, "suspended_reason", ""),
        "owner": _owner_payload(company),
        "subscriptions_count": getattr(company, "subscriptions_count", 0),
        "current_subscription": _subscription_payload(current_subscription),
        "notes": getattr(company, "notes", ""),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


def _safe_int(value: Any) -> int | None:
    """
    يحول القيمة إلى int عند الإمكان.
    """

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _apply_filters(request: HttpRequest, queryset: QuerySet[Company]) -> QuerySet[Company]:
    """
    يطبق البحث والفلاتر القادمة من Query Params.
    """

    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().upper()
    activity_profile = (request.GET.get("activity_profile") or "").strip().upper()
    activity_profile_id = (
        request.GET.get("activity_profile_id")
        or request.GET.get("activity_profile_ref_id")
        or ""
    )
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
            | Q(activity_profile_ref__code__icontains=search)
            | Q(activity_profile_ref__name__icontains=search)
            | Q(activity_profile_ref__name_ar__icontains=search)
            | Q(activity_profile_ref__name_en__icontains=search)
        )

    valid_statuses = {choice[0] for choice in CompanyStatus.choices}
    if status in valid_statuses:
        queryset = queryset.filter(status=status)

    profile_id = _safe_int(activity_profile_id)
    if profile_id:
        queryset = queryset.filter(activity_profile_ref_id=profile_id)

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
        with_activity_profile_ref_count=Count(
            "id",
            filter=Q(activity_profile_ref__isnull=False),
        ),
        without_activity_profile_ref_count=Count(
            "id",
            filter=Q(activity_profile_ref__isnull=True),
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
            "with_ref": aggregate.get("with_activity_profile_ref_count") or 0,
            "without_ref": aggregate.get("without_activity_profile_ref_count") or 0,
        },
    }


@login_required
@require_GET
def system_companies_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/system/companies/

    يعرض شركات النظام لمساحة النظام فقط.
    """

    if not user_has_system_permission(request.user, "system.companies.view"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى شركات النظام.",
                "code": "SYSTEM_COMPANIES_VIEW_PERMISSION_REQUIRED",
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
            "activity_profile_ref",
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
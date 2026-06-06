# ============================================================
# 📂 api/system/companies/detail.py
# 🧠 PrimeyAcc | System Company Detail API V1.2
# ------------------------------------------------------------
# ✅ Retrieve one tenant company for system workspace
# ✅ Returns company profile, owner, subscriptions and memberships
# ✅ Includes current subscription and subscription history
# ✅ Safe field access based on the current Company model
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
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from accounts.models import CompanyMembership
from companies.models import Company
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


def _date_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _user_payload(user: Any) -> dict[str, Any] | None:
    """
    يرجع بيانات مستخدم مختصرة.
    """

    if not user:
        return None

    full_name = user.get_full_name().strip()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": full_name or user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": _datetime_to_string(user.date_joined),
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


def _membership_is_active(membership: CompanyMembership) -> bool:
    """
    يحسب هل عضوية المستخدم فعالة اعتمادًا على status الموجود في الموديل.
    """

    status = str(getattr(membership, "status", "") or "").strip().upper()
    return status in {"ACTIVE, ENABLED", "APPROVED", "ACTIVE"}


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع بيانات اشتراك شركة.
    """

    plan = subscription.plan

    return {
        "id": subscription.id,
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
        "created_by": _user_payload(subscription.created_by),
        "plan": {
            "id": plan.id,
            "name": plan.name,
            "code": plan.code,
            "slug": plan.slug,
            "description": plan.description,
            "monthly_price": _money_to_string(plan.monthly_price),
            "yearly_price": _money_to_string(plan.yearly_price),
            "max_users": plan.max_users,
            "max_branches": plan.max_branches,
            "max_warehouses": plan.max_warehouses,
            "max_pos": plan.max_pos,
            "features": plan.features if isinstance(plan.features, list) else [],
            "is_active": plan.is_active,
            "is_public": plan.is_public,
        },
    }


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    """
    يرجع عضوية مستخدم داخل شركة.

    CompanyMembership يستخدم status وليس is_active.
    """

    return {
        "id": membership.id,
        "user": _user_payload(membership.user),
        "role": getattr(membership, "role", ""),
        "status": getattr(membership, "status", ""),
        "is_active": _membership_is_active(membership),
        "job_title": getattr(membership, "job_title", ""),
        "department": getattr(membership, "department", ""),
        "is_primary": getattr(membership, "is_primary", False),
        "joined_at": _datetime_to_string(getattr(membership, "joined_at", None)),
        "invited_at": _datetime_to_string(getattr(membership, "invited_at", None)),
        "suspended_at": _datetime_to_string(getattr(membership, "suspended_at", None)),
        "suspended_reason": getattr(membership, "suspended_reason", ""),
        "notes": getattr(membership, "notes", ""),
        "created_at": _datetime_to_string(getattr(membership, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(membership, "updated_at", None)),
    }


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يحول كائن الشركة إلى JSON كامل للواجهة.

    تم استخدام getattr للحقول الاختيارية حتى لا يتعطل API إذا لم يكن الحقل موجودًا
    في نسخة الموديل الحالية.
    """

    return {
        "id": company.id,
        "name": company.name,
        "display_name": getattr(company, "display_name", company.name),
        "name_ar": getattr(company, "name_ar", ""),
        "name_en": getattr(company, "name_en", ""),
        "company_code": getattr(company, "company_code", ""),
        "activity_profile": getattr(company, "activity_profile", ""),
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
        "notes": getattr(company, "notes", ""),
        "owner": _user_payload(getattr(company, "owner", None)),
        "created_by": _user_payload(getattr(company, "created_by", None)),
        "updated_by": _user_payload(getattr(company, "updated_by", None)),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


@login_required
@require_GET
def system_company_detail(request: HttpRequest, company_id: int) -> JsonResponse:
    """
    GET /api/system/companies/<company_id>/

    يعرض تفاصيل شركة واحدة لمساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى تفاصيل الشركة.",
            },
            status=403,
        )

    company = get_object_or_404(
        Company.objects.select_related(
            "owner",
            "created_by",
            "updated_by",
        ),
        id=company_id,
    )

    subscriptions = (
        CompanySubscription.objects.filter(company=company)
        .select_related("plan", "created_by")
        .order_by("-created_at", "-id")
    )

    current_subscription = (
        subscriptions.filter(
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ]
        )
        .order_by("-created_at", "-id")
        .first()
    )

    memberships = (
        CompanyMembership.objects.filter(company=company)
        .select_related("user")
        .order_by("-is_primary", "status", "role", "id")
    )

    memberships_list = list(memberships)
    active_memberships_count = sum(
        1 for membership in memberships_list if _membership_is_active(membership)
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب تفاصيل الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
                "current_subscription": (
                    _subscription_payload(current_subscription)
                    if current_subscription
                    else None
                ),
                "subscriptions": [
                    _subscription_payload(subscription)
                    for subscription in subscriptions
                ],
                "memberships": [
                    _membership_payload(membership)
                    for membership in memberships_list
                ],
                "stats": {
                    "subscriptions_count": subscriptions.count(),
                    "memberships_count": len(memberships_list),
                    "active_memberships_count": active_memberships_count,
                },
            },
        },
        status=200,
    )
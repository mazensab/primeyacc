# ============================================================
# 📂 api/system/plans/list.py
# 🧠 PrimeyAcc | System Subscription Plans List API V1.0
# ------------------------------------------------------------
# ✅ List SaaS subscription plans for system workspace
# ✅ Supports search, status filters, public/internal filters
# ✅ Returns clean API payload for future frontend pages
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - لا يتم عرض نصوص تقنية في الواجهة لاحقًا
# - البيانات حقيقية من قاعدة البيانات فقط بدون mock data
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from subscriptions.models import SubscriptionPlan


def _user_can_access_system(request: HttpRequest) -> bool:
    """
    يتحقق من صلاحية دخول مساحة النظام.

    Phase 0 أنشأ UserProfile وفيه can_access_system.
    superuser يعتبر مسموحًا له دائمًا.
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


def _plan_payload(plan: SubscriptionPlan) -> dict[str, Any]:
    """
    يحول كائن الباقة إلى JSON نظيف للواجهة.
    """

    companies_count = getattr(plan, "companies_count", 0)

    return {
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
        "sort_order": plan.sort_order,
        "companies_count": companies_count,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }


def _apply_filters(request: HttpRequest, queryset: QuerySet[SubscriptionPlan]) -> QuerySet[SubscriptionPlan]:
    """
    يطبق البحث والفلاتر القادمة من Query Params.
    """

    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().lower()
    visibility = (request.GET.get("visibility") or "").strip().lower()
    code = (request.GET.get("code") or "").strip().upper()

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(slug__icontains=search)
            | Q(code__icontains=search)
            | Q(description__icontains=search)
        )

    if status in {"active", "inactive"}:
        queryset = queryset.filter(is_active=(status == "active"))

    if visibility in {"public", "internal"}:
        queryset = queryset.filter(is_public=(visibility == "public"))

    if code:
        queryset = queryset.filter(code=code)

    return queryset


@login_required
@require_GET
def system_plans_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/system/plans/

    يعرض باقات الاشتراك لمساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى باقات النظام.",
            },
            status=403,
        )

    queryset = (
        SubscriptionPlan.objects.all()
        .annotate(companies_count=Count("company_subscriptions", distinct=True))
        .order_by("sort_order", "monthly_price", "id")
    )

    queryset = _apply_filters(request, queryset)

    total_count = queryset.count()
    active_count = queryset.filter(is_active=True).count()
    inactive_count = queryset.filter(is_active=False).count()
    public_count = queryset.filter(is_public=True).count()
    internal_count = queryset.filter(is_public=False).count()

    items = [_plan_payload(plan) for plan in queryset]

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب الباقات بنجاح.",
            "data": {
                "items": items,
                "results": items,
                "count": total_count,
                "stats": {
                    "total": total_count,
                    "active": active_count,
                    "inactive": inactive_count,
                    "public": public_count,
                    "internal": internal_count,
                },
            },
        },
        status=200,
    )
# ============================================================
# 📂 api/company/branches/list.py
# 🧠 Mhamcloud | Company Branches List API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated branches list
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Supports search and safe filters
# ✅ Returns summary for company workspace UI
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - فروع الشركة لا تُعرض إلا للشركة الحالية فقط
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

from typing import Any

from django.db.models import Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from api.permissions import attach_company_context, request_has_company_permission
from companies.models import Branch


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _time_to_string(value: Any) -> str | None:
    """
    توحيد إخراج الوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _clean_text(value: Any) -> str:
    """
    تنظيف النصوص القادمة من query params.
    """

    return str(value or "").strip()


def _branch_payload(branch: Branch) -> dict[str, Any]:
    """
    يرجع بيانات فرع واحد داخل الشركة الحالية فقط.
    """

    return {
        "id": branch.id,
        "company_id": branch.company_id,
        "name": branch.display_name,
        "display_name": branch.display_name,
        "name_ar": branch.name_ar,
        "name_en": branch.name_en,
        "branch_code": branch.branch_code,
        "branch_type": branch.branch_type,
        "status": branch.status,
        "is_active": branch.is_active,
        "is_default": branch.is_default,
        "manager_name": branch.manager_name,
        "email": branch.email,
        "phone": branch.phone,
        "mobile": branch.mobile,
        "whatsapp_number": branch.whatsapp_number,
        "country": branch.country,
        "city": branch.city,
        "region": branch.region,
        "district": branch.district,
        "street_name": branch.street_name,
        "building_number": branch.building_number,
        "postal_code": branch.postal_code,
        "short_address": branch.short_address,
        "national_address_line": branch.national_address_line,
        "address": branch.address,
        "latitude": str(branch.latitude) if branch.latitude is not None else "",
        "longitude": str(branch.longitude) if branch.longitude is not None else "",
        "opening_time": _time_to_string(branch.opening_time),
        "closing_time": _time_to_string(branch.closing_time),
        "settings_data": branch.settings_data if isinstance(branch.settings_data, dict) else {},
        "extra_data": branch.extra_data if isinstance(branch.extra_data, dict) else {},
        "notes": branch.notes,
        "created_at": _datetime_to_string(branch.created_at),
        "updated_at": _datetime_to_string(branch.updated_at),
    }


def _can_view_branches(request: HttpRequest) -> bool:
    """
    صلاحية عرض فروع الشركة.

    المرحلة الحالية تسمح بالعرض لمن لديه:
    - OWNER / ADMIN
    - أو company.branches.view
    - أو company.settings.view
    - أو company.profile.view
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return (
        request_has_company_permission(request, "company.branches.view")
        or request_has_company_permission(request, "company.settings.view")
        or request_has_company_permission(request, "company.profile.view")
    )


def _apply_filters(queryset: QuerySet[Branch], request: HttpRequest) -> QuerySet[Branch]:
    """
    يطبق البحث والفلاتر الآمنة داخل نطاق الشركة الحالية فقط.
    """

    search = _clean_text(request.GET.get("search") or request.GET.get("q"))
    status = _clean_text(request.GET.get("status")).upper()
    branch_type = _clean_text(request.GET.get("branch_type") or request.GET.get("type")).upper()
    city = _clean_text(request.GET.get("city"))
    district = _clean_text(request.GET.get("district"))
    is_active = _clean_text(request.GET.get("is_active")).lower()
    is_default = _clean_text(request.GET.get("is_default")).lower()

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(branch_code__icontains=search)
            | Q(manager_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
            | Q(mobile__icontains=search)
            | Q(whatsapp_number__icontains=search)
            | Q(city__icontains=search)
            | Q(district__icontains=search)
            | Q(short_address__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if branch_type:
        queryset = queryset.filter(branch_type=branch_type)

    if city:
        queryset = queryset.filter(city__icontains=city)

    if district:
        queryset = queryset.filter(district__icontains=district)

    if is_active in {"1", "true", "yes", "active"}:
        queryset = queryset.filter(is_active=True)
    elif is_active in {"0", "false", "no", "inactive"}:
        queryset = queryset.filter(is_active=False)

    if is_default in {"1", "true", "yes"}:
        queryset = queryset.filter(is_default=True)
    elif is_default in {"0", "false", "no"}:
        queryset = queryset.filter(is_default=False)

    return queryset


def _apply_ordering(queryset: QuerySet[Branch], request: HttpRequest) -> QuerySet[Branch]:
    """
    ترتيب آمن ومحدود للفروع.
    """

    ordering = _clean_text(request.GET.get("ordering") or request.GET.get("sort"))

    allowed_ordering = {
        "name": "name",
        "-name": "-name",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "city": "city",
        "-city": "-city",
        "branch_code": "branch_code",
        "-branch_code": "-branch_code",
        "default": "-is_default",
        "is_default": "-is_default",
    }

    return queryset.order_by(
        allowed_ordering.get(ordering, "-is_default"),
        "name",
        "id",
    )


def _summary_payload(base_queryset: QuerySet[Branch]) -> dict[str, Any]:
    """
    ملخص سريع لفروع الشركة الحالية.
    """

    return {
        "total": base_queryset.count(),
        "active": base_queryset.filter(is_active=True).count(),
        "inactive": base_queryset.filter(is_active=False).count(),
        "default": base_queryset.filter(is_default=True).count(),
        "head_office": base_queryset.filter(branch_type="HEAD_OFFICE").count(),
        "branches": base_queryset.filter(branch_type="BRANCH").count(),
        "warehouses": base_queryset.filter(branch_type="WAREHOUSE").count(),
        "pos": base_queryset.filter(branch_type="POS").count(),
        "service_centers": base_queryset.filter(branch_type="SERVICE_CENTER").count(),
    }


@require_GET
def company_branches_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/branches/

    يرجع فروع الشركة الحالية فقط.
    """

    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "يجب تسجيل الدخول أولًا.",
                "code": "AUTHENTICATION_REQUIRED",
            },
            status=401,
        )

    membership = attach_company_context(request)

    if not membership or not membership.is_active_membership:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا توجد عضوية شركة فعالة لهذا المستخدم.",
                "code": "ACTIVE_COMPANY_MEMBERSHIP_REQUIRED",
            },
            status=403,
        )

    company = membership.company

    if not company or not getattr(company, "is_active", True):
        return JsonResponse(
            {
                "ok": False,
                "message": "الشركة الحالية غير فعالة.",
                "code": "CURRENT_COMPANY_INACTIVE",
            },
            status=403,
        )

    if not _can_view_branches(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بعرض فروع الشركة.",
                "code": "COMPANY_BRANCHES_VIEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    base_queryset = Branch.objects.filter(company=company)
    queryset = _apply_filters(base_queryset, request)
    queryset = _apply_ordering(queryset, request)

    results = [_branch_payload(branch) for branch in queryset]

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب فروع الشركة بنجاح.",
            "data": {
                "results": results,
                "count": len(results),
                "summary": _summary_payload(base_queryset),
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )
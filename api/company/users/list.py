# ============================================================
# 📂 api/company/users/list.py
# 🧠 PrimeyAcc | Company Users List API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company users list
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Supports search and safe filters
# ✅ Returns membership + user + profile summary
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - مستخدمو الشركة لا يُعرضون إلا من عضويات الشركة الحالية فقط
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - User = حساب دخول فقط
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

from typing import Any

from django.db.models import Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from accounts.models import CompanyMembership
from api.permissions import attach_company_context, request_has_company_permission


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _clean_text(value: Any) -> str:
    """
    تنظيف النصوص القادمة من query params.
    """

    return str(value or "").strip()


def _profile_payload(user: Any) -> dict[str, Any] | None:
    """
    يرجع ملف المستخدم العام إن وجد.
    """

    profile = getattr(user, "primeyacc_profile", None)

    if not profile:
        return None

    return {
        "id": profile.id,
        "display_name": profile.display_name,
        "phone": profile.phone,
        "mobile": profile.mobile,
        "whatsapp_number": profile.whatsapp_number,
        "status": profile.status,
        "default_workspace": profile.default_workspace,
        "system_role": profile.system_role,
        "is_system_user": profile.is_system_user,
        "language": profile.language,
        "timezone": profile.timezone,
        "last_seen_at": _datetime_to_string(profile.last_seen_at),
        "created_at": _datetime_to_string(profile.created_at),
        "updated_at": _datetime_to_string(profile.updated_at),
    }


def _user_payload(user: Any) -> dict[str, Any]:
    """
    يرجع بيانات حساب الدخول بدون بيانات حساسة.
    """

    full_name = user.get_full_name().strip()

    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": full_name or user.get_username(),
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": _datetime_to_string(user.date_joined),
        "last_login": _datetime_to_string(user.last_login),
    }


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    """
    يرجع بيانات عضوية المستخدم داخل الشركة الحالية.
    """

    user = membership.user

    return {
        "id": membership.id,
        "user": _user_payload(user),
        "profile": _profile_payload(user),
        "company_id": membership.company_id,
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
        "joined_at": _datetime_to_string(membership.joined_at),
        "invited_at": _datetime_to_string(membership.invited_at),
        "suspended_at": _datetime_to_string(membership.suspended_at),
        "suspended_reason": membership.suspended_reason,
        "notes": membership.notes,
        "created_at": _datetime_to_string(membership.created_at),
        "updated_at": _datetime_to_string(membership.updated_at),
    }


def _can_view_users(request: HttpRequest) -> bool:
    """
    صلاحية عرض مستخدمي الشركة.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.users.view")


def _apply_filters(
    queryset: QuerySet[CompanyMembership],
    request: HttpRequest,
) -> QuerySet[CompanyMembership]:
    """
    يطبق البحث والفلاتر داخل نطاق الشركة الحالية فقط.
    """

    search = _clean_text(request.GET.get("search") or request.GET.get("q"))
    role = _clean_text(request.GET.get("role")).upper()
    status = _clean_text(request.GET.get("status")).upper()
    department = _clean_text(request.GET.get("department"))
    is_primary = _clean_text(request.GET.get("is_primary")).lower()
    is_active_user = _clean_text(request.GET.get("is_active_user")).lower()

    if search:
        queryset = queryset.filter(
            Q(user__username__icontains=search)
            | Q(user__email__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(user__primeyacc_profile__display_name__icontains=search)
            | Q(user__primeyacc_profile__phone__icontains=search)
            | Q(user__primeyacc_profile__mobile__icontains=search)
            | Q(job_title__icontains=search)
            | Q(department__icontains=search)
        )

    if role:
        queryset = queryset.filter(role=role)

    if status:
        queryset = queryset.filter(status=status)

    if department:
        queryset = queryset.filter(department__icontains=department)

    if is_primary in {"1", "true", "yes"}:
        queryset = queryset.filter(is_primary=True)
    elif is_primary in {"0", "false", "no"}:
        queryset = queryset.filter(is_primary=False)

    if is_active_user in {"1", "true", "yes"}:
        queryset = queryset.filter(user__is_active=True)
    elif is_active_user in {"0", "false", "no"}:
        queryset = queryset.filter(user__is_active=False)

    return queryset


def _apply_ordering(
    queryset: QuerySet[CompanyMembership],
    request: HttpRequest,
) -> QuerySet[CompanyMembership]:
    """
    ترتيب آمن ومحدود لقائمة مستخدمي الشركة.
    """

    ordering = _clean_text(request.GET.get("ordering") or request.GET.get("sort"))

    allowed_ordering = {
        "name": "user__first_name",
        "-name": "-user__first_name",
        "email": "user__email",
        "-email": "-user__email",
        "role": "role",
        "-role": "-role",
        "status": "status",
        "-status": "-status",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "joined_at": "joined_at",
        "-joined_at": "-joined_at",
    }

    return queryset.order_by(
        "-is_primary",
        allowed_ordering.get(ordering, "-created_at"),
        "id",
    )


def _summary_payload(base_queryset: QuerySet[CompanyMembership]) -> dict[str, Any]:
    """
    ملخص سريع لعضويات الشركة الحالية.
    """

    return {
        "total": base_queryset.count(),
        "active_memberships": base_queryset.filter(status="ACTIVE").count(),
        "invited_memberships": base_queryset.filter(status="INVITED").count(),
        "suspended_memberships": base_queryset.filter(status="SUSPENDED").count(),
        "inactive_memberships": base_queryset.filter(status="INACTIVE").count(),
        "active_users": base_queryset.filter(user__is_active=True).count(),
        "inactive_users": base_queryset.filter(user__is_active=False).count(),
        "owners": base_queryset.filter(role="OWNER").count(),
        "admins": base_queryset.filter(role="ADMIN").count(),
        "managers": base_queryset.filter(role="MANAGER").count(),
        "employees": base_queryset.filter(role="EMPLOYEE").count(),
    }


@require_GET
def company_users_list(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/users/

    يرجع مستخدمي/عضويات الشركة الحالية فقط.
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

    current_membership = attach_company_context(request)

    if not current_membership or not current_membership.is_active_membership:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا توجد عضوية شركة فعالة لهذا المستخدم.",
                "code": "ACTIVE_COMPANY_MEMBERSHIP_REQUIRED",
            },
            status=403,
        )

    company = current_membership.company

    if not company or not getattr(company, "is_active", True):
        return JsonResponse(
            {
                "ok": False,
                "message": "الشركة الحالية غير فعالة.",
                "code": "CURRENT_COMPANY_INACTIVE",
            },
            status=403,
        )

    if not _can_view_users(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بعرض مستخدمي الشركة.",
                "code": "COMPANY_USERS_VIEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    base_queryset = (
        CompanyMembership.objects.select_related(
            "user",
            "user__primeyacc_profile",
            "company",
        )
        .filter(company=company)
    )

    queryset = _apply_filters(base_queryset, request)
    queryset = _apply_ordering(queryset, request)

    results = [_membership_payload(membership) for membership in queryset]

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب مستخدمي الشركة بنجاح.",
            "data": {
                "results": results,
                "count": len(results),
                "summary": _summary_payload(base_queryset),
                "company_id": company.id,
                "membership_id": current_membership.id,
            },
        },
        status=200,
    )
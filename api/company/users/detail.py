# ============================================================
# 📂 api/company/users/detail.py
# 🧠 PrimeyAcc | Company User Detail API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company user detail
# ✅ Tenant-isolated membership update
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Prevents cross-company membership access
# ✅ Supports safe role/status/profile updates
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - User = حساب دخول فقط
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - لا يتم تعديل عضوية إلا إذا كانت داخل الشركة الحالية
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus, UserProfile
from api.permissions import attach_company_context, request_has_company_permission


def _json_body(request: HttpRequest) -> dict[str, Any]:
    """
    يقرأ JSON body بأمان.
    """

    if not request.body:
        return {}

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}

    return payload if isinstance(payload, dict) else {}


def _has_value(request: HttpRequest, payload: dict[str, Any], key: str) -> bool:
    """
    يتحقق هل الحقل أُرسل في JSON أو form-data.
    """

    return key in payload or key in request.POST


def _get_value(
    request: HttpRequest,
    payload: dict[str, Any],
    key: str,
    default: Any = None,
) -> Any:
    """
    يدعم JSON و form-data بنفس الوقت.
    """

    if key in payload:
        return payload.get(key)

    return request.POST.get(key, default)


def _clean_text(value: Any) -> str:
    """
    ينظف النصوص القادمة من الطلب.
    """

    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    يحول النص إلى uppercase بعد التنظيف.
    """

    return _clean_text(value).upper()


def _clean_bool(value: Any, default: bool = False) -> bool:
    """
    يحول القيم الشائعة إلى Boolean آمن.
    """

    if value is None or value == "":
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, int):
        return value == 1

    value_text = str(value).strip().lower()
    return value_text in {"1", "true", "yes", "on", "y", "نعم"}


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


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


def _can_view_user(request: HttpRequest) -> bool:
    """
    صلاحية عرض عضوية مستخدم داخل الشركة.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.users.view")


def _can_update_user(request: HttpRequest) -> bool:
    """
    صلاحية تعديل عضوية مستخدم داخل الشركة.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.users.update")


def _get_current_company_and_membership(request: HttpRequest):
    """
    يرجع العضوية والشركة الحالية مع رسائل أخطاء موحدة.
    """

    if not request.user.is_authenticated:
        return None, None, JsonResponse(
            {
                "ok": False,
                "message": "يجب تسجيل الدخول أولًا.",
                "code": "AUTHENTICATION_REQUIRED",
            },
            status=401,
        )

    membership = attach_company_context(request)

    if not membership or not membership.is_active_membership:
        return None, None, JsonResponse(
            {
                "ok": False,
                "message": "لا توجد عضوية شركة فعالة لهذا المستخدم.",
                "code": "ACTIVE_COMPANY_MEMBERSHIP_REQUIRED",
            },
            status=403,
        )

    company = membership.company

    if not company or not getattr(company, "is_active", True):
        return None, None, JsonResponse(
            {
                "ok": False,
                "message": "الشركة الحالية غير فعالة.",
                "code": "CURRENT_COMPANY_INACTIVE",
            },
            status=403,
        )

    return membership, company, None


def _get_membership_or_404(company, membership_id: int) -> CompanyMembership | None:
    """
    يجلب العضوية من الشركة الحالية فقط.
    """

    return (
        CompanyMembership.objects.select_related(
            "user",
            "user__primeyacc_profile",
            "company",
        )
        .filter(
            id=membership_id,
            company=company,
        )
        .first()
    )


def _update_user_account(user: Any, request: HttpRequest, payload: dict[str, Any]) -> None:
    """
    يحدث بيانات حساب الدخول الأساسية بدون التعامل مع كلمة المرور هنا.
    """

    changed_fields = []

    text_fields = [
        "first_name",
        "last_name",
    ]

    for field_name in text_fields:
        if _has_value(request, payload, field_name):
            value = _clean_text(_get_value(request, payload, field_name))
            if getattr(user, field_name) != value:
                setattr(user, field_name, value)
                changed_fields.append(field_name)

    if _has_value(request, payload, "email"):
        email = _clean_text(_get_value(request, payload, "email")).lower()

        if email and user.email != email:
            user.email = email
            changed_fields.append("email")

    if _has_value(request, payload, "is_active"):
        is_active = _clean_bool(_get_value(request, payload, "is_active"), default=user.is_active)
        if user.is_active != is_active:
            user.is_active = is_active
            changed_fields.append("is_active")

    if changed_fields:
        user.full_clean()
        user.save(update_fields=changed_fields)


def _update_profile(user: Any, request: HttpRequest, payload: dict[str, Any]) -> None:
    """
    يحدث بيانات UserProfile الأساسية إن وجدت.
    """

    profile = getattr(user, "primeyacc_profile", None)

    if not profile:
        profile = UserProfile.objects.create(
            user=user,
            display_name=user.get_full_name() or user.get_username(),
        )

    changed_fields = []

    text_fields = [
        "display_name",
        "phone",
        "mobile",
        "whatsapp_number",
        "language",
        "timezone",
    ]

    for field_name in text_fields:
        if _has_value(request, payload, field_name):
            value = _clean_text(_get_value(request, payload, field_name))
            if getattr(profile, field_name) != value:
                setattr(profile, field_name, value)
                changed_fields.append(field_name)

    if changed_fields:
        changed_fields.append("updated_at")
        profile.full_clean()
        profile.save(update_fields=changed_fields)


def _update_membership(
    target_membership: CompanyMembership,
    current_membership: CompanyMembership,
    request: HttpRequest,
    payload: dict[str, Any],
) -> None:
    """
    يحدث العضوية داخل الشركة الحالية فقط.
    """

    if target_membership.id == current_membership.id:
        protected_self_fields = {"role", "status", "is_primary"}
        if any(_has_value(request, payload, field) for field in protected_self_fields):
            raise ValidationError(
                {
                    "membership": "لا يمكن للمستخدم تعديل دوره أو حالته أو عضويته الأساسية بنفسه."
                }
            )

    if _has_value(request, payload, "role"):
        role = _clean_upper(_get_value(request, payload, "role"))
        valid_roles = {choice[0] for choice in CompanyRole.choices}

        if role not in valid_roles:
            raise ValidationError({"role": "الدور غير صحيح."})

        if role == CompanyRole.OWNER and current_membership.role != CompanyRole.OWNER:
            raise ValidationError({"role": "لا يمكن تعيين مالك إلا بواسطة المالك الحالي."})

        target_membership.role = role

    if _has_value(request, payload, "status"):
        status = _clean_upper(_get_value(request, payload, "status"))
        valid_statuses = {choice[0] for choice in MembershipStatus.choices}

        if status not in valid_statuses:
            raise ValidationError({"status": "حالة العضوية غير صحيحة."})

        target_membership.status = status

    if _has_value(request, payload, "is_primary"):
        target_membership.is_primary = _clean_bool(
            _get_value(request, payload, "is_primary"),
            default=target_membership.is_primary,
        )

    text_fields = [
        "job_title",
        "department",
        "suspended_reason",
        "notes",
    ]

    for field_name in text_fields:
        if _has_value(request, payload, field_name):
            setattr(
                target_membership,
                field_name,
                _clean_text(_get_value(request, payload, field_name)),
            )

    target_membership.updated_by = request.user
    target_membership.full_clean()
    target_membership.save()


@csrf_protect
@require_http_methods(["GET", "POST", "PATCH"])
def company_user_detail(request: HttpRequest, membership_id: int) -> JsonResponse:
    """
    GET /api/company/users/<membership_id>/
    POST/PATCH /api/company/users/<membership_id>/

    يعرض أو يعدل عضوية مستخدم داخل الشركة الحالية فقط.
    """

    current_membership, company, error_response = _get_current_company_and_membership(request)

    if error_response:
        return error_response

    target_membership = _get_membership_or_404(company=company, membership_id=membership_id)

    if not target_membership:
        return JsonResponse(
            {
                "ok": False,
                "message": "عضوية المستخدم غير موجودة داخل الشركة الحالية.",
                "code": "COMPANY_MEMBERSHIP_NOT_FOUND",
            },
            status=404,
        )

    if request.method == "GET":
        if not _can_view_user(request):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "غير مصرح لك بعرض هذا المستخدم.",
                    "code": "COMPANY_USER_VIEW_PERMISSION_REQUIRED",
                },
                status=403,
            )

        return JsonResponse(
            {
                "ok": True,
                "message": "تم جلب بيانات مستخدم الشركة بنجاح.",
                "data": {
                    "membership": _membership_payload(target_membership),
                    "company_id": company.id,
                    "membership_id": current_membership.id,
                },
            },
            status=200,
        )

    if not _can_update_user(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل هذا المستخدم.",
                "code": "COMPANY_USER_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    try:
        with transaction.atomic():
            _update_user_account(target_membership.user, request, payload)
            _update_profile(target_membership.user, request, payload)
            _update_membership(target_membership, current_membership, request, payload)

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل مستخدم الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل مستخدم الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    target_membership.refresh_from_db()
    target_membership.user.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل مستخدم الشركة بنجاح.",
            "data": {
                "membership": _membership_payload(target_membership),
                "company_id": company.id,
                "membership_id": current_membership.id,
            },
        },
        status=200,
    )
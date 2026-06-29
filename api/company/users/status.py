# ============================================================
# 📂 api/company/users/status.py
# 🧠 Mhamcloud | Company User Status API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company user status actions
# ✅ Activate membership
# ✅ Suspend membership
# ✅ Deactivate membership
# ✅ Set primary membership
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Prevents cross-company membership access
# ✅ Prevents unsafe self-status changes
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
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
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


def _clean_text(value: Any) -> str:
    """
    ينظف النصوص القادمة من الطلب.
    """

    return str(value or "").strip()


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

    profile = getattr(user, "Mhamcloud_profile", None)

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
    يرجع بيانات العضوية بعد تعديل الحالة.
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


def _can_update_user_status(request: HttpRequest) -> bool:
    """
    صلاحية تعديل حالة عضوية مستخدم داخل الشركة.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {CompanyRole.OWNER, CompanyRole.ADMIN}:
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
            "user__Mhamcloud_profile",
            "company",
        )
        .filter(
            id=membership_id,
            company=company,
        )
        .first()
    )


def _assert_action_is_safe(
    current_membership: CompanyMembership,
    target_membership: CompanyMembership,
    action: str,
) -> None:
    """
    يمنع إجراءات خطرة داخل إدارة عضويات الشركة.
    """

    if current_membership.id == target_membership.id and action in {
        "suspend",
        "deactivate",
    }:
        raise ValidationError(
            {
                "membership": "لا يمكن للمستخدم تعليق أو تعطيل عضويته الحالية بنفسه."
            }
        )

    if (
        target_membership.role == CompanyRole.OWNER
        and current_membership.role != CompanyRole.OWNER
    ):
        raise ValidationError(
            {
                "role": "لا يمكن تعديل عضوية المالك إلا بواسطة مالك آخر."
            }
        )


def _apply_action(
    target_membership: CompanyMembership,
    current_membership: CompanyMembership,
    action: str,
    request: HttpRequest,
    payload: dict[str, Any],
) -> None:
    """
    يطبق إجراء الحالة على العضوية.
    """

    action = _clean_text(action).lower()
    _assert_action_is_safe(current_membership, target_membership, action)

    if action == "activate":
        target_membership.status = MembershipStatus.ACTIVE
        target_membership.suspended_at = None
        target_membership.suspended_reason = ""
        if not target_membership.joined_at:
            target_membership.joined_at = timezone.now()

    elif action == "suspend":
        target_membership.status = MembershipStatus.SUSPENDED
        target_membership.suspended_at = timezone.now()
        target_membership.suspended_reason = _clean_text(
            payload.get("reason") or payload.get("suspended_reason")
        )

    elif action == "deactivate":
        target_membership.status = MembershipStatus.INACTIVE
        target_membership.is_primary = False

    elif action == "set_primary":
        if target_membership.status != MembershipStatus.ACTIVE:
            raise ValidationError(
                {
                    "status": "لا يمكن جعل عضوية غير فعالة عضوية أساسية."
                }
            )

        CompanyMembership.objects.filter(
            user=target_membership.user,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        ).exclude(id=target_membership.id).update(is_primary=False)

        target_membership.is_primary = True

    else:
        raise ValidationError(
            {
                "action": "الإجراء غير صحيح. الإجراءات المتاحة: activate, suspend, deactivate, set_primary."
            }
        )

    target_membership.updated_by = request.user
    target_membership.full_clean()
    target_membership.save()


@csrf_protect
@require_POST
def company_user_status(
    request: HttpRequest,
    membership_id: int,
    action: str,
) -> JsonResponse:
    """
    POST /api/company/users/<membership_id>/<action>/

    يعدل حالة عضوية مستخدم داخل الشركة الحالية فقط.
    """

    current_membership, company, error_response = _get_current_company_and_membership(request)

    if error_response:
        return error_response

    if not _can_update_user_status(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل حالة مستخدم الشركة.",
                "code": "COMPANY_USER_STATUS_PERMISSION_REQUIRED",
            },
            status=403,
        )

    target_membership = _get_membership_or_404(
        company=company,
        membership_id=membership_id,
    )

    if not target_membership:
        return JsonResponse(
            {
                "ok": False,
                "message": "عضوية المستخدم غير موجودة داخل الشركة الحالية.",
                "code": "COMPANY_MEMBERSHIP_NOT_FOUND",
            },
            status=404,
        )

    payload = _json_body(request)

    try:
        with transaction.atomic():
            _apply_action(
                target_membership=target_membership,
                current_membership=current_membership,
                action=action,
                request=request,
                payload=payload,
            )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل حالة مستخدم الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل حالة مستخدم الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    target_membership.refresh_from_db()
    target_membership.user.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل حالة مستخدم الشركة بنجاح.",
            "data": {
                "membership": _membership_payload(target_membership),
                "company_id": company.id,
                "membership_id": current_membership.id,
                "action": action,
            },
        },
        status=200,
    )
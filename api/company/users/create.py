# ============================================================
# 📂 api/company/users/create.py
# 🧠 Mhamcloud | Company User Create API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company user creation
# ✅ Creates or links a user to current company only
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Prevents duplicate user-company membership
# ✅ Creates UserProfile if missing
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - User = حساب دخول فقط
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from api.permissions import attach_company_context, request_has_company_permission


User = get_user_model()


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
    يرجع بيانات العضوية بعد الإنشاء.
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


def _can_create_user(request: HttpRequest) -> bool:
    """
    صلاحية إنشاء/دعوة مستخدم داخل الشركة الحالية.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.users.create")


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


def _resolve_or_create_user(payload: dict[str, Any], request: HttpRequest):
    """
    يجلب User موجود أو ينشئ حساب دخول جديد.
    """

    email = _clean_text(_get_value(request, payload, "email")).lower()
    username = _clean_text(_get_value(request, payload, "username"))
    first_name = _clean_text(_get_value(request, payload, "first_name"))
    last_name = _clean_text(_get_value(request, payload, "last_name"))
    password = str(_get_value(request, payload, "password", "") or "")

    if not email and not username:
        raise ValidationError(
            {
                "email": "البريد الإلكتروني أو اسم المستخدم مطلوب.",
                "username": "البريد الإلكتروني أو اسم المستخدم مطلوب.",
            }
        )

    if not username:
        username = email

    user = None

    if email:
        user = User.objects.filter(email__iexact=email).first()

    if not user and username:
        user = User.objects.filter(username__iexact=username).first()

    created = False

    if user:
        changed_fields = []

        if email and not user.email:
            user.email = email
            changed_fields.append("email")

        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed_fields.append("first_name")

        if last_name and user.last_name != last_name:
            user.last_name = last_name
            changed_fields.append("last_name")

        if changed_fields:
            user.save(update_fields=changed_fields)

        return user, created

    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=_clean_bool(_get_value(request, payload, "is_active"), default=True),
    )

    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()

    user.full_clean()
    user.save()
    created = True

    return user, created


def _ensure_user_profile(user: Any, payload: dict[str, Any], request: HttpRequest) -> UserProfile:
    """
    ينشئ أو يحدث UserProfile الأساسي للمستخدم.
    """

    display_name = _clean_text(_get_value(request, payload, "display_name"))
    phone = _clean_text(_get_value(request, payload, "phone"))
    mobile = _clean_text(_get_value(request, payload, "mobile"))
    whatsapp_number = _clean_text(_get_value(request, payload, "whatsapp_number"))
    language = _clean_text(_get_value(request, payload, "language", "ar")) or "ar"
    timezone_name = _clean_text(_get_value(request, payload, "timezone", "Asia/Riyadh")) or "Asia/Riyadh"

    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": display_name or user.get_full_name() or user.get_username(),
            "phone": phone,
            "mobile": mobile,
            "whatsapp_number": whatsapp_number,
            "status": UserProfileStatus.ACTIVE,
            "default_workspace": WorkspaceType.COMPANY,
            "language": language,
            "timezone": timezone_name,
        },
    )

    changed_fields = []

    if not created:
        if display_name and profile.display_name != display_name:
            profile.display_name = display_name
            changed_fields.append("display_name")

        if phone and profile.phone != phone:
            profile.phone = phone
            changed_fields.append("phone")

        if mobile and profile.mobile != mobile:
            profile.mobile = mobile
            changed_fields.append("mobile")

        if whatsapp_number and profile.whatsapp_number != whatsapp_number:
            profile.whatsapp_number = whatsapp_number
            changed_fields.append("whatsapp_number")

        if language and profile.language != language:
            profile.language = language
            changed_fields.append("language")

        if timezone_name and profile.timezone != timezone_name:
            profile.timezone = timezone_name
            changed_fields.append("timezone")

        if changed_fields:
            changed_fields.append("updated_at")
            profile.save(update_fields=changed_fields)

    return profile


@csrf_protect
@require_POST
def company_user_create(request: HttpRequest) -> JsonResponse:
    """
    POST /api/company/users/create/

    ينشئ أو يربط مستخدمًا بالشركة الحالية فقط.
    """

    current_membership, company, error_response = _get_current_company_and_membership(request)

    if error_response:
        return error_response

    if not _can_create_user(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإنشاء مستخدمي الشركة.",
                "code": "COMPANY_USER_CREATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    role = _clean_upper(_get_value(request, payload, "role", CompanyRole.EMPLOYEE))
    status = _clean_upper(_get_value(request, payload, "status", MembershipStatus.ACTIVE))

    valid_roles = {choice[0] for choice in CompanyRole.choices}
    valid_statuses = {choice[0] for choice in MembershipStatus.choices}

    if role not in valid_roles:
        role = CompanyRole.EMPLOYEE

    if status not in valid_statuses:
        status = MembershipStatus.ACTIVE

    if role == CompanyRole.OWNER and current_membership.role != CompanyRole.OWNER:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن إنشاء مالك شركة إلا بواسطة المالك الحالي.",
                "code": "OWNER_ROLE_REQUIRES_OWNER",
            },
            status=403,
        )

    try:
        with transaction.atomic():
            user, user_created = _resolve_or_create_user(payload, request)
            _ensure_user_profile(user, payload, request)

            existing_membership = CompanyMembership.objects.filter(
                user=user,
                company=company,
            ).first()

            if existing_membership:
                return JsonResponse(
                    {
                        "ok": False,
                        "message": "هذا المستخدم لديه عضوية مسبقة داخل الشركة الحالية.",
                        "errors": {
                            "user": "هذا المستخدم لديه عضوية مسبقة داخل الشركة الحالية.",
                            "membership_id": existing_membership.id,
                        },
                    },
                    status=400,
                )

            membership = CompanyMembership(
                user=user,
                company=company,
                role=role,
                status=status,
                is_primary=_clean_bool(_get_value(request, payload, "is_primary"), default=False),
                job_title=_clean_text(_get_value(request, payload, "job_title")),
                department=_clean_text(_get_value(request, payload, "department")),
                notes=_clean_text(_get_value(request, payload, "notes")),
                created_by=request.user,
                updated_by=request.user,
            )

            if status == MembershipStatus.ACTIVE:
                from django.utils import timezone

                membership.joined_at = timezone.now()

            membership.full_clean()
            membership.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء مستخدم الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء مستخدم الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء مستخدم الشركة بنجاح.",
            "data": {
                "membership": _membership_payload(membership),
                "user_created": user_created,
                "company_id": company.id,
                "membership_id": current_membership.id,
            },
        },
        status=201,
    )
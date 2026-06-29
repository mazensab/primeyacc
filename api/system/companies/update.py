# ============================================================
# 📂 api/system/companies/update.py
# 🧠 Mhamcloud | System Company Update API V1.3
# ------------------------------------------------------------
# ✅ Update tenant company data from system workspace
# ✅ Supports partial updates using POST or PATCH
# ✅ Keeps company_code immutable after backend generation
# ✅ Supports ActivityProfile reference selection
# ✅ Keeps legacy activity_profile for backward compatibility
# ✅ Validates legal/tax data when billing fields are edited
# ✅ Validates Saudi National Address when address fields are edited
# ✅ Updates owner CompanyMembership when owner_id is provided
# ✅ Protected by system permission: system.companies.update
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company هي حدود العزل الأساسية للنظام
# - company_code يولد من الباكند ولا يعدل من الواجهة
# - بيانات الشركة القانونية والعنوان الوطني مهمة للفوترة والاشتراكات والإيصالات
# - تعديل الاشتراك لا يتم هنا الاشتراك له APIs مستقلة
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
    WorkspaceType,
)
from api.permissions import user_has_system_permission
from companies.models import (
    ActivityProfile,
    Company,
    CompanyActivityProfile,
    CompanyStatus,
)


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


def _has_value(request: HttpRequest, payload: dict[str, Any], key: str) -> bool:
    """
    يتحقق هل الحقل أرسل في JSON أو form-data.
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


def _to_bool(value: Any, default: bool = False) -> bool:
    """
    يحول القيم النصية إلى Boolean.
    """

    if value in {None, ""}:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _to_decimal(value: Any, default: str = "15.00") -> Decimal:
    """
    يحول القيمة إلى Decimal آمن.
    """

    if value in {None, ""}:
        value = default

    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError("القيمة المالية غير صحيحة.")


def _get_owner(owner_id: Any) -> User | None:
    """
    يرجع مالك الشركة إذا تم تمريره.
    """

    if owner_id in {None, ""}:
        return None

    try:
        return User.objects.get(id=int(owner_id))
    except (User.DoesNotExist, TypeError, ValueError):
        return None


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
        "is_system": profile.is_system,
        "is_active": profile.is_active,
    }


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يحول كائن الشركة إلى JSON نظيف للواجهة.
    """

    return {
        "id": company.id,
        "name": getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", getattr(company, "name", "")),
        "name_ar": getattr(company, "name_ar", ""),
        "name_en": getattr(company, "name_en", ""),
        "company_code": getattr(company, "company_code", ""),
        "activity_profile": getattr(company, "activity_profile", ""),
        "activity_profile_ref": _activity_profile_payload(
            getattr(company, "activity_profile_ref", None)
        ),
        "activity_profile_ref_id": getattr(company, "activity_profile_ref_id", None),
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
        "owner": _owner_payload(company),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


def _company_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل Company قبل التعديل.
    """

    return any(field.name == field_name for field in Company._meta.fields)


def _set_company_field(company: Company, field_name: str, value: Any) -> None:
    """
    يعدل الحقل فقط إذا كان موجودا في موديل Company.
    """

    if _company_has_field(field_name):
        setattr(company, field_name, value)


def _activity_profile_ref_was_sent(
    request: HttpRequest,
    payload: dict[str, Any],
) -> bool:
    """
    يتحقق هل أرسل مرجع النشاط الجديد.
    """

    return _has_value(request, payload, "activity_profile_id") or _has_value(
        request,
        payload,
        "activity_profile_ref_id",
    )


def _resolve_activity_profile_ref(
    *,
    company: Company,
    request: HttpRequest,
    payload: dict[str, Any],
) -> ActivityProfile | None:
    """
    يرجع ActivityProfile فعالا ومتاحا للشركة.

    المسموح:
    - system-level profiles
    - custom profiles الخاصة بنفس الشركة
    """

    raw_profile_id = _get_value(request, payload, "activity_profile_id")

    if raw_profile_id in {None, ""} and _has_value(request, payload, "activity_profile_ref_id"):
        raw_profile_id = _get_value(request, payload, "activity_profile_ref_id")

    if raw_profile_id in {None, ""}:
        return None

    try:
        profile_id = int(raw_profile_id)
    except (TypeError, ValueError):
        raise ValidationError({"activity_profile_id": "النشاط غير صحيح."})

    profile = (
        ActivityProfile.objects.filter(
            Q(company__isnull=True) | Q(company=company),
            id=profile_id,
            is_active=True,
        )
        .order_by("id")
        .first()
    )

    if not profile:
        raise ValidationError({"activity_profile_id": "النشاط غير موجود أو غير متاح لهذه الشركة."})

    return profile


def _legacy_activity_profile_from_ref(
    *,
    current_value: str,
    activity_profile_ref: ActivityProfile | None,
) -> str:
    """
    يحافظ على حقل activity_profile القديم للتوافق.
    """

    valid_activities = {choice[0] for choice in CompanyActivityProfile.choices}

    if activity_profile_ref and activity_profile_ref.code in valid_activities:
        return activity_profile_ref.code

    if current_value in valid_activities:
        return current_value

    return CompanyActivityProfile.GENERAL


def _validate_required_company_data(company: Company) -> dict[str, str]:
    """
    يتحقق من اكتمال بيانات الشركة المطلوبة للفوترة.
    """

    errors: dict[str, str] = {}

    required_fields = {
        "commercial_registration": (
            getattr(company, "commercial_registration", ""),
            "السجل التجاري مطلوب.",
        ),
        "tax_number": (
            getattr(company, "tax_number", ""),
            "الرقم الضريبي مطلوب.",
        ),
        "building_number": (
            getattr(company, "building_number", ""),
            "رقم المبنى مطلوب.",
        ),
        "street_name": (
            getattr(company, "street_name", ""),
            "اسم الشارع مطلوب.",
        ),
        "district": (
            getattr(company, "district", ""),
            "الحي مطلوب.",
        ),
        "city": (
            getattr(company, "city", ""),
            "المدينة مطلوبة.",
        ),
        "region": (
            getattr(company, "region", ""),
            "المنطقة مطلوبة.",
        ),
        "postal_code": (
            getattr(company, "postal_code", ""),
            "الرمز البريدي مطلوب.",
        ),
    }

    for field_name, field_data in required_fields.items():
        value, message = field_data
        if not _clean_text(value):
            errors[field_name] = message

    return errors


def _billing_identity_fields_were_sent(
    request: HttpRequest,
    payload: dict[str, Any],
) -> bool:
    """
    يتحقق هل أرسلت حقول تؤثر على جاهزية الشركة للفوترة.
    """

    fields = [
        "commercial_registration",
        "tax_number",
        "building_number",
        "street_name",
        "district",
        "city",
        "region",
        "postal_code",
        "short_address",
        "address",
    ]

    return any(_has_value(request, payload, field_name) for field_name in fields)


def _ensure_owner_membership(
    *,
    owner: User | None,
    company: Company,
    acting_user: User,
) -> None:
    """
    ينشئ أو يحدث عضوية OWNER للمالك إذا تم تحديد owner_id.
    """

    if not owner:
        return

    profile, _ = UserProfile.objects.get_or_create(
        user=owner,
        defaults={
            "display_name": owner.get_full_name() or owner.get_username(),
            "default_workspace": WorkspaceType.COMPANY,
        },
    )

    if not profile.default_company_id:
        profile.default_company = company
        profile.default_workspace = WorkspaceType.COMPANY
        profile.save(
            update_fields=[
                "default_company",
                "default_workspace",
                "updated_at",
            ]
        )

    membership, created = CompanyMembership.objects.get_or_create(
        user=owner,
        company=company,
        defaults={
            "role": CompanyRole.OWNER,
            "status": MembershipStatus.ACTIVE,
            "is_primary": True,
            "created_by": acting_user,
            "updated_by": acting_user,
        },
    )

    if not created:
        membership.role = CompanyRole.OWNER
        membership.status = MembershipStatus.ACTIVE
        membership.is_primary = True
        membership.updated_by = acting_user
        membership.save(
            update_fields=[
                "role",
                "status",
                "is_primary",
                "updated_by",
                "updated_at",
            ]
        )

    CompanyMembership.objects.filter(
        user=owner,
        is_primary=True,
    ).exclude(id=membership.id).update(is_primary=False)


@login_required
@csrf_protect
@require_http_methods(["POST", "PATCH"])
def system_company_update(request: HttpRequest, company_id: int) -> JsonResponse:
    """
    POST/PATCH /api/system/companies/<company_id>/update/

    يعدل بيانات شركة من مساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.companies.update"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل شركات النظام.",
                "code": "SYSTEM_COMPANIES_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    company = get_object_or_404(Company, id=company_id)
    payload = _json_body(request)

    try:
        with transaction.atomic():
            if _has_value(request, payload, "company_code") or _has_value(request, payload, "code"):
                requested_code = _clean_text(_get_value(request, payload, "company_code"))

                if not requested_code:
                    requested_code = _clean_text(_get_value(request, payload, "code"))

                current_code = _clean_text(getattr(company, "company_code", ""))

                if requested_code and requested_code.upper() == current_code.upper():
                    pass
                else:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "كود الشركة يولد من النظام ولا يمكن تعديله.",
                            "errors": {
                                "company_code": "كود الشركة يولد من النظام ولا يمكن تعديله."
                            },
                        },
                        status=400,
                    )

            if _has_value(request, payload, "name"):
                name = _clean_text(_get_value(request, payload, "name"))
                if not name:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "اسم الشركة مطلوب.",
                            "errors": {"name": "اسم الشركة مطلوب."},
                        },
                        status=400,
                    )
                company.name = name

            if _has_value(request, payload, "name_ar"):
                _set_company_field(
                    company,
                    "name_ar",
                    _clean_text(_get_value(request, payload, "name_ar")),
                )

            if _has_value(request, payload, "name_en"):
                _set_company_field(
                    company,
                    "name_en",
                    _clean_text(_get_value(request, payload, "name_en")),
                )

            if _activity_profile_ref_was_sent(request, payload):
                activity_profile_ref = _resolve_activity_profile_ref(
                    company=company,
                    request=request,
                    payload=payload,
                )

                _set_company_field(company, "activity_profile_ref", activity_profile_ref)
                _set_company_field(
                    company,
                    "activity_profile",
                    _legacy_activity_profile_from_ref(
                        current_value=getattr(company, "activity_profile", ""),
                        activity_profile_ref=activity_profile_ref,
                    ),
                )

            elif _has_value(request, payload, "activity_profile"):
                activity_profile = _clean_text(
                    _get_value(request, payload, "activity_profile")
                ).upper()

                valid_activities = {choice[0] for choice in CompanyActivityProfile.choices}
                if activity_profile not in valid_activities:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "نوع نشاط الشركة غير صحيح.",
                            "errors": {"activity_profile": "نوع نشاط الشركة غير صحيح."},
                        },
                        status=400,
                    )

                _set_company_field(company, "activity_profile", activity_profile)

            if _has_value(request, payload, "status"):
                status = _clean_text(_get_value(request, payload, "status")).upper()

                valid_statuses = {choice[0] for choice in CompanyStatus.choices}
                if status not in valid_statuses:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "حالة الشركة غير صحيحة.",
                            "errors": {"status": "حالة الشركة غير صحيحة."},
                        },
                        status=400,
                    )

                _set_company_field(company, "status", status)

            if _has_value(request, payload, "is_active"):
                _set_company_field(
                    company,
                    "is_active",
                    _to_bool(
                        _get_value(request, payload, "is_active"),
                        default=getattr(company, "is_active", True),
                    ),
                )

            if _has_value(request, payload, "owner_id"):
                owner_id = _get_value(request, payload, "owner_id")
                owner = _get_owner(owner_id)

                if owner_id not in {None, ""} and owner is None:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "مالك الشركة غير موجود.",
                            "errors": {"owner_id": "مالك الشركة غير موجود."},
                        },
                        status=400,
                    )

                _set_company_field(company, "owner", owner)

            text_fields = [
                "commercial_registration",
                "tax_number",
                "email",
                "phone",
                "mobile",
                "whatsapp_number",
                "website",
                "country",
                "building_number",
                "street_name",
                "district",
                "city",
                "region",
                "postal_code",
                "short_address",
                "address",
                "currency_code",
                "notes",
            ]

            for field_name in text_fields:
                if _has_value(request, payload, field_name):
                    value = _clean_text(_get_value(request, payload, field_name))
                    if field_name == "currency_code":
                        value = value or "SAR"
                    _set_company_field(company, field_name, value)

            if _has_value(request, payload, "vat_percentage"):
                _set_company_field(
                    company,
                    "vat_percentage",
                    _to_decimal(
                        _get_value(request, payload, "vat_percentage"),
                        default=str(getattr(company, "vat_percentage", "15.00")),
                    ),
                )

            if _billing_identity_fields_were_sent(request, payload):
                required_errors = _validate_required_company_data(company)
                if required_errors:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "بيانات الشركة القانونية والعنوان الوطني مطلوبة.",
                            "errors": required_errors,
                        },
                        status=400,
                    )

            _set_company_field(company, "updated_by", request.user)

            company.full_clean()
            company.save()

            if _has_value(request, payload, "owner_id"):
                _ensure_owner_membership(
                    owner=getattr(company, "owner", None),
                    company=company,
                    acting_user=request.user,
                )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
            },
        },
        status=200,
    )
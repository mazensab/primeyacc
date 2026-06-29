# ============================================================
# 📂 api/system/companies/create.py
# 🧠 Mhamcloud | System Company Create API V1.3
# ------------------------------------------------------------
# ✅ Create tenant companies from system workspace
# ✅ Backend-generated company_code
# ✅ Ignores frontend code/company_code on create
# ✅ Validates legal/tax data needed for platform billing
# ✅ Validates Saudi National Address required fields
# ✅ Supports ActivityProfile reference selection
# ✅ Keeps legacy activity_profile for backward compatibility
# ✅ Supports optional owner assignment
# ✅ Creates owner CompanyMembership when owner_id is provided
# ✅ Protected by system permission: system.companies.create
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company هي حدود العزل الأساسية للنظام
# - كود الشركة يولد من الباكند فقط ولا يكتب من الواجهة
# - بيانات الشركة القانونية والعنوان الوطني مطلوبة للفوترة والاشتراكات والإيصالات
# - إنشاء الاشتراك للشركة يتم عبر subscriptions APIs وليس هنا
# - عند تحديد owner_id يتم إنشاء عضوية OWNER للمالك داخل الشركة
# ============================================================

from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

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


def _filter_company_fields(data: dict[str, Any]) -> dict[str, Any]:
    """
    يمنع تمرير حقول غير موجودة إلى Company.
    """

    valid_fields = {field.name for field in Company._meta.fields}
    return {key: value for key, value in data.items() if key in valid_fields}


def _generate_company_code() -> str:
    """
    يولد كود شركة داخلي آمن من الباكند.

    النمط:
    CMP-2026-000001
    """

    current_year = timezone.now().year
    prefix = f"CMP-{current_year}-"
    pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")

    existing_codes = (
        Company.objects.select_for_update()
        .filter(company_code__startswith=prefix)
        .values_list("company_code", flat=True)
    )

    max_sequence = 0

    for code in existing_codes:
        match = pattern.match(str(code or ""))
        if match:
            max_sequence = max(max_sequence, int(match.group(1)))

    next_sequence = max_sequence + 1

    while True:
        candidate = f"{prefix}{next_sequence:06d}"
        if not Company.objects.filter(company_code__iexact=candidate).exists():
            return candidate

        next_sequence += 1


def _resolve_activity_profile_ref(
    request: HttpRequest,
    payload: dict[str, Any],
) -> ActivityProfile | None:
    """
    يقرأ activity_profile_id أو activity_profile_ref_id ويرجع ActivityProfile فعالا.

    في إنشاء شركة جديدة لا نقبل custom profiles لأنها تحتاج شركة موجودة مسبقا.
    لذلك نقبل system-level profiles فقط.
    """

    raw_profile_id = _get_value(request, payload, "activity_profile_id")

    if raw_profile_id in {None, ""}:
        raw_profile_id = _get_value(request, payload, "activity_profile_ref_id")

    if raw_profile_id in {None, ""}:
        return None

    try:
        profile_id = int(raw_profile_id)
    except (TypeError, ValueError):
        raise ValidationError({"activity_profile_id": "النشاط غير صحيح."})

    profile = (
        ActivityProfile.objects.filter(
            id=profile_id,
            is_active=True,
            company__isnull=True,
        )
        .order_by("id")
        .first()
    )

    if not profile:
        raise ValidationError({"activity_profile_id": "النشاط غير موجود أو غير فعال."})

    return profile


def _resolve_legacy_activity_profile(
    *,
    request: HttpRequest,
    payload: dict[str, Any],
    activity_profile_ref: ActivityProfile | None,
) -> str:
    """
    يحافظ على حقل activity_profile القديم للتوافق مع الصفحات والتقارير الحالية.
    """

    valid_activities = {choice[0] for choice in CompanyActivityProfile.choices}

    raw_activity = _clean_text(
        _get_value(request, payload, "activity_profile", "")
    ).upper()

    if raw_activity:
        if raw_activity not in valid_activities:
            raise ValidationError({"activity_profile": "نوع نشاط الشركة غير صحيح."})
        return raw_activity

    if activity_profile_ref and activity_profile_ref.code in valid_activities:
        return activity_profile_ref.code

    return CompanyActivityProfile.GENERAL


def _validate_required_company_data(
    *,
    commercial_registration: str,
    tax_number: str,
    building_number: str,
    street_name: str,
    district: str,
    city: str,
    region: str,
    postal_code: str,
) -> dict[str, str]:
    """
    يتحقق من البيانات المطلوبة لإنشاء شركة قابلة للفوترة.
    """

    errors: dict[str, str] = {}

    required_fields = {
        "commercial_registration": (
            commercial_registration,
            "السجل التجاري مطلوب.",
        ),
        "tax_number": (
            tax_number,
            "الرقم الضريبي مطلوب.",
        ),
        "building_number": (
            building_number,
            "رقم المبنى مطلوب.",
        ),
        "street_name": (
            street_name,
            "اسم الشارع مطلوب.",
        ),
        "district": (
            district,
            "الحي مطلوب.",
        ),
        "city": (
            city,
            "المدينة مطلوبة.",
        ),
        "region": (
            region,
            "المنطقة مطلوبة.",
        ),
        "postal_code": (
            postal_code,
            "الرمز البريدي مطلوب.",
        ),
    }

    for field_name, field_data in required_fields.items():
        value, message = field_data
        if not value:
            errors[field_name] = message

    return errors


def _ensure_owner_membership(
    *,
    owner: User | None,
    company: Company,
    acting_user: User,
) -> None:
    """
    ينشئ عضوية OWNER للمالك إذا تم تحديد owner_id.
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
@require_POST
def system_company_create(request: HttpRequest) -> JsonResponse:
    """
    POST /api/system/companies/create/

    ينشئ شركة جديدة من مساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.companies.create"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإنشاء شركات النظام.",
                "code": "SYSTEM_COMPANIES_CREATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    name = _clean_text(_get_value(request, payload, "name"))
    name_ar = _clean_text(_get_value(request, payload, "name_ar"))
    name_en = _clean_text(_get_value(request, payload, "name_en"))

    if not name:
        return JsonResponse(
            {
                "ok": False,
                "message": "اسم الشركة مطلوب.",
                "errors": {"name": "اسم الشركة مطلوب."},
            },
            status=400,
        )

    try:
        activity_profile_ref = _resolve_activity_profile_ref(request, payload)
        activity_profile = _resolve_legacy_activity_profile(
            request=request,
            payload=payload,
            activity_profile_ref=activity_profile_ref,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "بيانات النشاط غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    status = _clean_text(
        _get_value(
            request,
            payload,
            "status",
            CompanyStatus.TRIAL,
        )
    ).upper()

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

    owner_id = _get_value(request, payload, "owner_id", None)
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

    try:
        vat_percentage = _to_decimal(
            _get_value(request, payload, "vat_percentage", "15.00")
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": str(exc.messages[0] if hasattr(exc, "messages") else exc),
                "errors": {"vat_percentage": "نسبة الضريبة غير صحيحة."},
            },
            status=400,
        )

    commercial_registration = _clean_text(
        _get_value(request, payload, "commercial_registration")
    )
    tax_number = _clean_text(_get_value(request, payload, "tax_number"))
    building_number = _clean_text(_get_value(request, payload, "building_number"))
    street_name = _clean_text(_get_value(request, payload, "street_name"))
    district = _clean_text(_get_value(request, payload, "district"))
    city = _clean_text(_get_value(request, payload, "city"))
    region = _clean_text(_get_value(request, payload, "region"))
    postal_code = _clean_text(_get_value(request, payload, "postal_code"))

    required_errors = _validate_required_company_data(
        commercial_registration=commercial_registration,
        tax_number=tax_number,
        building_number=building_number,
        street_name=street_name,
        district=district,
        city=city,
        region=region,
        postal_code=postal_code,
    )

    if required_errors:
        return JsonResponse(
            {
                "ok": False,
                "message": "بيانات الشركة القانونية والعنوان الوطني مطلوبة.",
                "errors": required_errors,
            },
            status=400,
        )

    try:
        with transaction.atomic():
            company_code = _generate_company_code()

            company_data = {
                "name": name,
                "name_ar": name_ar,
                "name_en": name_en,
                "company_code": company_code,
                "activity_profile": activity_profile,
                "activity_profile_ref": activity_profile_ref,
                "status": status,
                "is_active": _to_bool(
                    _get_value(request, payload, "is_active", True),
                    default=True,
                ),
                "commercial_registration": commercial_registration,
                "tax_number": tax_number,
                "email": _clean_text(_get_value(request, payload, "email")),
                "phone": _clean_text(_get_value(request, payload, "phone")),
                "mobile": _clean_text(_get_value(request, payload, "mobile")),
                "whatsapp_number": _clean_text(
                    _get_value(request, payload, "whatsapp_number")
                ),
                "website": _clean_text(_get_value(request, payload, "website")),
                "country": _clean_text(
                    _get_value(request, payload, "country", "Saudi Arabia")
                )
                or "Saudi Arabia",
                "building_number": building_number,
                "street_name": street_name,
                "district": district,
                "city": city,
                "region": region,
                "postal_code": postal_code,
                "short_address": _clean_text(
                    _get_value(request, payload, "short_address")
                ),
                "address": _clean_text(_get_value(request, payload, "address")),
                "currency_code": _clean_text(
                    _get_value(request, payload, "currency_code", "SAR")
                )
                or "SAR",
                "vat_percentage": vat_percentage,
                "notes": _clean_text(_get_value(request, payload, "notes")),
                "owner": owner,
                "created_by": request.user,
                "updated_by": request.user,
            }

            company = Company(**_filter_company_fields(company_data))
            company.full_clean()
            company.save()

            _ensure_owner_membership(
                owner=owner,
                company=company,
                acting_user=request.user,
            )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
            },
        },
        status=201,
    )
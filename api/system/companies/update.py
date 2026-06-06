# ============================================================
# 📂 api/system/companies/update.py
# 🧠 PrimeyAcc | System Company Update API V1.1
# ------------------------------------------------------------
# ✅ Update tenant company data from system workspace
# ✅ Supports partial updates using POST or PATCH
# ✅ Validates company identity, contact, Saudi address, and status
# ✅ Safe payload fields based on the current Company model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - Company هي حدود العزل الأساسية للنظام
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - تعديل الاشتراك لا يتم هنا؛ الاشتراك له APIs مستقلة
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from companies.models import Company, CompanyActivityProfile, CompanyStatus


User = get_user_model()


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


def _get_value(request: HttpRequest, payload: dict[str, Any], key: str, default: Any = None) -> Any:
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


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يحول كائن الشركة إلى JSON نظيف للواجهة.

    تم استخدام getattr للحقول الاختيارية حتى لا يتعطل API إذا لم يكن الحقل موجودًا
    في نسخة الموديل الحالية.
    """

    return {
        "id": company.id,
        "name": getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", getattr(company, "name", "")),
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
        "owner": _owner_payload(company),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


@login_required
@csrf_protect
@require_http_methods(["POST", "PATCH"])
def system_company_update(request: HttpRequest, company_id: int) -> JsonResponse:
    """
    POST/PATCH /api/system/companies/<company_id>/update/

    يعدل بيانات شركة من مساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل شركات النظام.",
            },
            status=403,
        )

    company = get_object_or_404(Company, id=company_id)
    payload = _json_body(request)

    try:
        with transaction.atomic():
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
                company.name_ar = _clean_text(_get_value(request, payload, "name_ar"))

            if _has_value(request, payload, "name_en"):
                company.name_en = _clean_text(_get_value(request, payload, "name_en"))

            if _has_value(request, payload, "company_code"):
                company_code = _clean_text(_get_value(request, payload, "company_code"))

                if not company_code:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "كود الشركة مطلوب.",
                            "errors": {"company_code": "كود الشركة مطلوب."},
                        },
                        status=400,
                    )

                if Company.objects.exclude(id=company.id).filter(company_code=company_code).exists():
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "كود الشركة مستخدم من قبل.",
                            "errors": {"company_code": "كود الشركة مستخدم من قبل."},
                        },
                        status=400,
                    )

                company.company_code = company_code

            if _has_value(request, payload, "activity_profile"):
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

                company.activity_profile = activity_profile

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

                company.status = status

            if _has_value(request, payload, "is_active"):
                company.is_active = _to_bool(
                    _get_value(request, payload, "is_active"),
                    default=company.is_active,
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

                company.owner = owner

            text_fields = [
                "commercial_registration",
                "tax_number",
                "email",
                "phone",
                "mobile",
                "whatsapp_number",
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
                    setattr(company, field_name, value)

            if _has_value(request, payload, "vat_percentage"):
                company.vat_percentage = _to_decimal(
                    _get_value(request, payload, "vat_percentage"),
                    default=str(company.vat_percentage),
                )

            company.updated_by = request.user
            company.full_clean()
            company.save()

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
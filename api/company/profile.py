# ============================================================
# 📂 api/company/profile.py
# 🧠 PrimeyAcc | Company Profile API V1.0
# ------------------------------------------------------------
# ✅ Current company profile endpoint
# ✅ Reads company only from active CompanyMembership
# ✅ Supports safe company profile update
# ✅ Does not trust company_id from frontend
# ✅ Tenant isolation foundation for /api/company/
# ✅ Protected by active company membership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 2: المستخدمون والعضويات والصلاحيات
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - لا يسمح للمستخدم بتعديل شركة أخرى عبر company_id
# - CompanyMembership هو حد العزل الرسمي للشركات
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from api.permissions import attach_company_context, request_has_company_permission
from companies.models import Company


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


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ والنسب كنص عشري آمن للواجهة.
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


def _company_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل Company قبل التعديل.
    """

    return any(field.name == field_name for field in Company._meta.fields)


def _set_company_field(company: Company, field_name: str, value: Any) -> None:
    """
    يعدل الحقل فقط إذا كان موجودًا في موديل Company.
    """

    if _company_has_field(field_name):
        setattr(company, field_name, value)


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


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يرجع بيانات الشركة الحالية فقط.
    """

    return {
        "id": company.id,
        "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", None) or getattr(company, "name", ""),
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
        "city": getattr(company, "city", ""),
        "region": getattr(company, "region", ""),
        "district": getattr(company, "district", ""),
        "street_name": getattr(company, "street_name", ""),
        "building_number": getattr(company, "building_number", ""),
        "postal_code": getattr(company, "postal_code", ""),
        "short_address": getattr(company, "short_address", ""),
        "national_address_line": getattr(company, "national_address_line", ""),
        "address": getattr(company, "address", ""),
        "logo_url": _logo_url(company),
        "currency_code": getattr(company, "currency_code", "SAR"),
        "vat_percentage": _money_to_string(getattr(company, "vat_percentage", None)),
        "notes": getattr(company, "notes", ""),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


def _membership_payload(membership) -> dict[str, Any]:
    """
    يرجع ملخص عضوية المستخدم الحالية داخل الشركة.
    """

    return {
        "id": membership.id,
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
    }


def _can_update_profile(request: HttpRequest) -> bool:
    """
    يحدد هل المستخدم يستطيع تعديل ملف الشركة الحالية.

    المرحلة الحالية تسمح بالتعديل لمن لديه:
    - صلاحية عامة *
    - أو company.profile.update
    - أو company.settings.update
    - أو دور OWNER / ADMIN
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return (
        request_has_company_permission(request, "company.profile.update")
        or request_has_company_permission(request, "company.settings.update")
    )


@login_required
@csrf_protect
@require_http_methods(["GET", "POST", "PATCH"])
def company_profile(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/profile/
    POST/PATCH /api/company/profile/

    يعرض أو يعدل بيانات الشركة الحالية فقط من عضوية المستخدم الفعالة.
    """

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

    if request.method == "GET":
        return JsonResponse(
            {
                "ok": True,
                "message": "تم جلب ملف الشركة بنجاح.",
                "data": {
                    "company": _company_payload(company),
                    "membership": _membership_payload(membership),
                    "company_id": company.id,
                    "membership_id": membership.id,
                },
            },
            status=200,
        )

    if not _can_update_profile(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل ملف الشركة.",
                "code": "COMPANY_PROFILE_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    try:
        with transaction.atomic():
            text_fields = [
                "name_ar",
                "name_en",
                "commercial_registration",
                "tax_number",
                "email",
                "phone",
                "mobile",
                "whatsapp_number",
                "website",
                "country",
                "city",
                "region",
                "district",
                "street_name",
                "building_number",
                "postal_code",
                "short_address",
                "national_address_line",
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
                _set_company_field(company, "name", name)

            if _has_value(request, payload, "vat_percentage"):
                _set_company_field(
                    company,
                    "vat_percentage",
                    _to_decimal(
                        _get_value(request, payload, "vat_percentage"),
                        default=str(getattr(company, "vat_percentage", "15.00")),
                    ),
                )

            _set_company_field(company, "updated_by", request.user)

            company.full_clean()
            company.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل ملف الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل ملف الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل ملف الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
                "membership": _membership_payload(membership),
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )
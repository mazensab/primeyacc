# ============================================================
# 📂 api/system/companies/status.py
# 🧠 PrimeyAcc | System Company Status API V1.2
# ------------------------------------------------------------
# ✅ Activate / deactivate tenant companies from system workspace
# ✅ Suspend / restore companies safely without deleting records
# ✅ Updates company status and suspension metadata
# ✅ Safe payload fields based on the current Company model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - Company هي حدود العزل الأساسية للنظام
# - إيقاف الشركة لا يحذف بياناتها ولا يلغي اشتراكاتها تلقائيًا
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from companies.models import Company, CompanyStatus


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

    يستخدم getattr لأن بعض الحقول قد لا تكون موجودة في نسخة الموديل الحالية.
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
@require_POST
def system_company_status(request: HttpRequest, company_id: int) -> JsonResponse:
    """
    POST /api/system/companies/<company_id>/status/

    يغير حالة الشركة من مساحة النظام.

    actions:
    - activate
    - deactivate
    - suspend
    - restore
    - set_active
    - set_status
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتغيير حالة شركات النظام.",
            },
            status=403,
        )

    company = get_object_or_404(Company, id=company_id)
    payload = _json_body(request)

    action = _clean_text(_get_value(request, payload, "action")).lower()
    reason = _clean_text(_get_value(request, payload, "reason"))

    valid_statuses = {choice[0] for choice in CompanyStatus.choices}

    try:
        with transaction.atomic():
            if action == "activate":
                company.is_active = True
                company.status = CompanyStatus.ACTIVE
                company.suspended_at = None
                company.suspended_reason = ""
                message = "تم تفعيل الشركة بنجاح."

            elif action == "deactivate":
                company.is_active = False
                message = "تم إيقاف تفعيل الشركة بنجاح."

            elif action == "suspend":
                company.is_active = False
                company.status = CompanyStatus.SUSPENDED
                company.suspended_at = timezone.now()
                company.suspended_reason = reason or "تم تعليق الشركة من مساحة النظام."
                message = "تم تعليق الشركة بنجاح."

            elif action == "restore":
                company.is_active = True
                company.status = CompanyStatus.ACTIVE
                company.suspended_at = None
                company.suspended_reason = ""
                message = "تم استعادة الشركة بنجاح."

            elif action == "set_active":
                company.is_active = _to_bool(
                    _get_value(request, payload, "is_active", company.is_active),
                    default=company.is_active,
                )
                message = "تم تحديث حالة تفعيل الشركة بنجاح."

            elif action == "set_status":
                status = _clean_text(_get_value(request, payload, "status")).upper()

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

                if status == CompanyStatus.SUSPENDED:
                    company.is_active = False
                    company.suspended_at = company.suspended_at or timezone.now()
                    company.suspended_reason = (
                        reason
                        or company.suspended_reason
                        or "تم تعليق الشركة من مساحة النظام."
                    )

                if status == CompanyStatus.ACTIVE:
                    company.is_active = True
                    company.suspended_at = None
                    company.suspended_reason = ""

                message = "تم تحديث حالة الشركة بنجاح."

            else:
                return JsonResponse(
                    {
                        "ok": False,
                        "message": "الإجراء غير صحيح.",
                        "errors": {
                            "action": "استخدم activate أو deactivate أو suspend أو restore أو set_active أو set_status."
                        },
                    },
                    status=400,
                )

            company.updated_by = request.user
            company.full_clean()
            company.save(
                update_fields=[
                    "is_active",
                    "status",
                    "suspended_at",
                    "suspended_reason",
                    "updated_by",
                    "updated_at",
                ]
            )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تحديث حالة الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": message,
            "data": {
                "company": _company_payload(company),
            },
        },
        status=200,
    )
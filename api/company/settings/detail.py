# ============================================================
# 📂 api/company/settings/detail.py
# 🧠 PrimeyAcc | Company Operational Settings API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company settings detail
# ✅ Tenant-isolated company settings update
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Auto-creates CompanySettings if missing
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - CompanySettings تخص الشركة الحالية فقط
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from api.permissions import attach_company_context, request_has_company_permission
from companies.models import Company, CompanySettings, DefaultLanguage


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


def _to_positive_small_int(value: Any, default: int = 1) -> int:
    """
    يحول القيمة إلى رقم صحيح موجب صغير.
    """

    if value in {None, ""}:
        return default

    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValidationError("القيمة الرقمية غير صحيحة.")

    if number < 1:
        raise ValidationError("القيمة الرقمية يجب أن تكون أكبر من صفر.")

    return number


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ والنسب كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    try:
        return f"{Decimal(str(value)):.2f}"
    except (InvalidOperation, TypeError, ValueError):
        return "0.00"


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _settings_payload(settings_obj: CompanySettings) -> dict[str, Any]:
    """
    يرجع إعدادات الشركة التشغيلية.
    """

    return {
        "id": settings_obj.id,
        "company_id": settings_obj.company_id,
        "default_language": settings_obj.default_language,
        "timezone_name": settings_obj.timezone_name,
        "date_format": settings_obj.date_format,
        "time_format": settings_obj.time_format,
        "fiscal_year_start_month": settings_obj.fiscal_year_start_month,
        "fiscal_year_start_day": settings_obj.fiscal_year_start_day,
        "invoice_prefix": settings_obj.invoice_prefix,
        "quotation_prefix": settings_obj.quotation_prefix,
        "purchase_prefix": settings_obj.purchase_prefix,
        "receipt_prefix": settings_obj.receipt_prefix,
        "payment_prefix": settings_obj.payment_prefix,
        "allow_negative_stock": settings_obj.allow_negative_stock,
        "enable_inventory_tracking": settings_obj.enable_inventory_tracking,
        "enable_pos": settings_obj.enable_pos,
        "enable_purchases": settings_obj.enable_purchases,
        "enable_hr": settings_obj.enable_hr,
        "enable_vat": settings_obj.enable_vat,
        "default_vat_percentage": _money_to_string(settings_obj.default_vat_percentage),
        "require_customer_for_sales": settings_obj.require_customer_for_sales,
        "require_supplier_for_purchases": settings_obj.require_supplier_for_purchases,
        "settings_data": settings_obj.settings_data if isinstance(settings_obj.settings_data, dict) else {},
        "created_at": _datetime_to_string(settings_obj.created_at),
        "updated_at": _datetime_to_string(settings_obj.updated_at),
    }


def _company_snapshot(company: Company) -> dict[str, Any]:
    """
    يرجع ملخص الشركة الحالية مع الإعدادات.
    """

    return {
        "id": company.id,
        "name": company.display_name,
        "display_name": company.display_name,
        "company_code": company.company_code,
        "activity_profile": company.activity_profile,
        "status": company.status,
        "is_active": company.is_active,
        "currency_code": company.currency_code,
        "vat_percentage": _money_to_string(company.vat_percentage),
    }


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


def _get_or_create_company_settings(company: Company, request: HttpRequest) -> CompanySettings:
    """
    يجلب إعدادات الشركة أو ينشئها بقيم افتراضية آمنة.
    """

    settings_obj, _created = CompanySettings.objects.get_or_create(
        company=company,
        defaults={
            "default_vat_percentage": getattr(company, "vat_percentage", Decimal("15.00")),
            "created_by": request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
            "updated_by": request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
        },
    )

    return settings_obj


def _can_view_settings(request: HttpRequest) -> bool:
    """
    صلاحية عرض إعدادات الشركة.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return (
        request_has_company_permission(request, "company.settings.view")
        or request_has_company_permission(request, "company.profile.view")
    )


def _can_update_settings(request: HttpRequest) -> bool:
    """
    صلاحية تعديل إعدادات الشركة.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.settings.update")


def _update_settings(
    settings_obj: CompanySettings,
    request: HttpRequest,
    payload: dict[str, Any],
) -> None:
    """
    يحدث إعدادات الشركة التشغيلية فقط.
    """

    text_fields = [
        "timezone_name",
        "date_format",
        "time_format",
        "invoice_prefix",
        "quotation_prefix",
        "purchase_prefix",
        "receipt_prefix",
        "payment_prefix",
    ]

    bool_fields = [
        "allow_negative_stock",
        "enable_inventory_tracking",
        "enable_pos",
        "enable_purchases",
        "enable_hr",
        "enable_vat",
        "require_customer_for_sales",
        "require_supplier_for_purchases",
    ]

    if _has_value(request, payload, "default_language"):
        default_language = _clean_text(_get_value(request, payload, "default_language")).lower()
        valid_languages = {choice[0] for choice in DefaultLanguage.choices}
        if default_language not in valid_languages:
            raise ValidationError({"default_language": "اللغة الافتراضية غير صحيحة."})
        settings_obj.default_language = default_language

    for field_name in text_fields:
        if _has_value(request, payload, field_name):
            settings_obj.__setattr__(
                field_name,
                _clean_text(_get_value(request, payload, field_name)),
            )

    for field_name in bool_fields:
        if _has_value(request, payload, field_name):
            settings_obj.__setattr__(
                field_name,
                _clean_bool(
                    _get_value(request, payload, field_name),
                    default=getattr(settings_obj, field_name),
                ),
            )

    if _has_value(request, payload, "fiscal_year_start_month"):
        settings_obj.fiscal_year_start_month = _to_positive_small_int(
            _get_value(request, payload, "fiscal_year_start_month"),
            default=settings_obj.fiscal_year_start_month,
        )

    if _has_value(request, payload, "fiscal_year_start_day"):
        settings_obj.fiscal_year_start_day = _to_positive_small_int(
            _get_value(request, payload, "fiscal_year_start_day"),
            default=settings_obj.fiscal_year_start_day,
        )

    if _has_value(request, payload, "default_vat_percentage"):
        settings_obj.default_vat_percentage = _to_decimal(
            _get_value(request, payload, "default_vat_percentage"),
            default=str(settings_obj.default_vat_percentage),
        )

    if _has_value(request, payload, "settings_data"):
        settings_data = _get_value(request, payload, "settings_data", {})
        settings_obj.settings_data = settings_data if isinstance(settings_data, dict) else {}

    settings_obj.updated_by = request.user
    settings_obj.full_clean()
    settings_obj.save()


@csrf_protect
@require_http_methods(["GET", "POST", "PATCH"])
def company_settings_detail(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/settings/
    POST/PATCH /api/company/settings/

    يعرض أو يحدث الإعدادات التشغيلية للشركة الحالية فقط.
    """

    membership, company, error_response = _get_current_company_and_membership(request)

    if error_response:
        return error_response

    settings_obj = _get_or_create_company_settings(company, request)

    if request.method == "GET":
        if not _can_view_settings(request):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "غير مصرح لك بعرض إعدادات الشركة.",
                    "code": "COMPANY_SETTINGS_VIEW_PERMISSION_REQUIRED",
                },
                status=403,
            )

        return JsonResponse(
            {
                "ok": True,
                "message": "تم جلب إعدادات الشركة بنجاح.",
                "data": {
                    "company": _company_snapshot(company),
                    "settings": _settings_payload(settings_obj),
                    "operational_settings": _settings_payload(settings_obj),
                    "company_id": company.id,
                    "membership_id": membership.id,
                },
            },
            status=200,
        )

    if not _can_update_settings(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل إعدادات الشركة.",
                "code": "COMPANY_SETTINGS_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    try:
        with transaction.atomic():
            _update_settings(settings_obj, request, payload)

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل إعدادات الشركة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل إعدادات الشركة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    settings_obj.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل إعدادات الشركة بنجاح.",
            "data": {
                "company": _company_snapshot(company),
                "settings": _settings_payload(settings_obj),
                "operational_settings": _settings_payload(settings_obj),
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )
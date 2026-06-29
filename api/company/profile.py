# ============================================================
# 📂 api/company/profile.py
# 🧠 Mhamcloud | Company Profile API V1.2
# ------------------------------------------------------------
# ✅ Current company profile endpoint
# ✅ Reads company only from active CompanyMembership
# ✅ Supports safe company profile update
# ✅ Supports CompanySettings read/update
# ✅ Returns default branch summary
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ✅ Does not trust company_id from frontend
# ✅ Tenant isolation foundation for /api/company/
# ✅ Protected by active company membership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - لا يسمح للمستخدم بتعديل شركة أخرى عبر company_id
# - CompanyMembership هو حد العزل الرسمي للشركات
# - CompanySettings تخص الشركة الحالية فقط
# - Branch يرجع هنا كملخص فقط، وإدارته تكون من API مستقل
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
from companies.models import Branch, Company, CompanySettings


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


def _time_to_string(value: Any) -> str | None:
    """
    توحيد إخراج الوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _model_has_field(model_class: type[Company] | type[CompanySettings], field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل الموديل قبل التعديل.
    """

    return any(field.name == field_name for field in model_class._meta.fields)


def _set_model_field(obj: Any, field_name: str, value: Any) -> None:
    """
    يعدل الحقل فقط إذا كان موجودًا في الموديل.
    """

    if _model_has_field(obj.__class__, field_name):
        setattr(obj, field_name, value)


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


def _branch_payload(branch: Branch | None) -> dict[str, Any] | None:
    """
    يرجع ملخص الفرع الافتراضي الحالي.
    """

    if not branch:
        return None

    return {
        "id": branch.id,
        "company_id": branch.company_id,
        "name": branch.display_name,
        "display_name": branch.display_name,
        "name_ar": branch.name_ar,
        "name_en": branch.name_en,
        "branch_code": branch.branch_code,
        "branch_type": branch.branch_type,
        "status": branch.status,
        "is_active": branch.is_active,
        "is_default": branch.is_default,
        "manager_name": branch.manager_name,
        "email": branch.email,
        "phone": branch.phone,
        "mobile": branch.mobile,
        "whatsapp_number": branch.whatsapp_number,
        "country": branch.country,
        "city": branch.city,
        "region": branch.region,
        "district": branch.district,
        "street_name": branch.street_name,
        "building_number": branch.building_number,
        "postal_code": branch.postal_code,
        "short_address": branch.short_address,
        "national_address_line": branch.national_address_line,
        "address": branch.address,
        "latitude": str(branch.latitude) if branch.latitude is not None else "",
        "longitude": str(branch.longitude) if branch.longitude is not None else "",
        "opening_time": _time_to_string(branch.opening_time),
        "closing_time": _time_to_string(branch.closing_time),
        "created_at": _datetime_to_string(branch.created_at),
        "updated_at": _datetime_to_string(branch.updated_at),
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


def _get_default_branch(company: Company) -> Branch | None:
    """
    يجلب الفرع الافتراضي للشركة الحالية فقط.
    """

    branch = (
        Branch.objects.filter(
            company=company,
            is_default=True,
            is_active=True,
        )
        .order_by("id")
        .first()
    )

    if branch:
        return branch

    return (
        Branch.objects.filter(
            company=company,
            is_active=True,
        )
        .order_by("id")
        .first()
    )


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


def _update_company(company: Company, request: HttpRequest, payload: dict[str, Any]) -> None:
    """
    يحدث بيانات الشركة الأساسية فقط.
    """

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
        "address",
        "currency_code",
        "notes",
    ]

    for field_name in text_fields:
        if _has_value(request, payload, field_name):
            value = _clean_text(_get_value(request, payload, field_name))
            if field_name == "currency_code":
                value = value or "SAR"
            _set_model_field(company, field_name, value)

    if _has_value(request, payload, "name"):
        name = _clean_text(_get_value(request, payload, "name"))
        if not name:
            raise ValidationError({"name": "اسم الشركة مطلوب."})
        _set_model_field(company, "name", name)

    if _has_value(request, payload, "vat_percentage"):
        _set_model_field(
            company,
            "vat_percentage",
            _to_decimal(
                _get_value(request, payload, "vat_percentage"),
                default=str(getattr(company, "vat_percentage", "15.00")),
            ),
        )

    _set_model_field(company, "updated_by", request.user)
    company.full_clean()
    company.save()


def _extract_settings_payload(
    request: HttpRequest,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    يستخرج إعدادات الشركة من:
    - settings
    - operational_settings
    - أو مفاتيح مباشرة عند الحاجة.
    """

    nested_settings = payload.get("settings")
    nested_operational_settings = payload.get("operational_settings")

    if isinstance(nested_settings, dict):
        return nested_settings

    if isinstance(nested_operational_settings, dict):
        return nested_operational_settings

    direct_keys = {
        "default_language",
        "timezone_name",
        "date_format",
        "time_format",
        "fiscal_year_start_month",
        "fiscal_year_start_day",
        "invoice_prefix",
        "quotation_prefix",
        "purchase_prefix",
        "receipt_prefix",
        "payment_prefix",
        "allow_negative_stock",
        "enable_inventory_tracking",
        "enable_pos",
        "enable_purchases",
        "enable_hr",
        "enable_vat",
        "default_vat_percentage",
        "require_customer_for_sales",
        "require_supplier_for_purchases",
        "settings_data",
    }

    return {key: payload[key] for key in direct_keys if key in payload}


def _update_company_settings(
    settings_obj: CompanySettings,
    request: HttpRequest,
    payload: dict[str, Any],
) -> None:
    """
    يحدث إعدادات الشركة التشغيلية فقط.
    """

    settings_payload = _extract_settings_payload(request, payload)

    if not settings_payload:
        return

    text_fields = [
        "default_language",
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

    for field_name in text_fields:
        if field_name in settings_payload:
            value = _clean_text(settings_payload.get(field_name))
            _set_model_field(settings_obj, field_name, value)

    for field_name in bool_fields:
        if field_name in settings_payload:
            value = _clean_bool(settings_payload.get(field_name), default=getattr(settings_obj, field_name))
            _set_model_field(settings_obj, field_name, value)

    if "fiscal_year_start_month" in settings_payload:
        settings_obj.fiscal_year_start_month = _to_positive_small_int(
            settings_payload.get("fiscal_year_start_month"),
            default=settings_obj.fiscal_year_start_month,
        )

    if "fiscal_year_start_day" in settings_payload:
        settings_obj.fiscal_year_start_day = _to_positive_small_int(
            settings_payload.get("fiscal_year_start_day"),
            default=settings_obj.fiscal_year_start_day,
        )

    if "default_vat_percentage" in settings_payload:
        settings_obj.default_vat_percentage = _to_decimal(
            settings_payload.get("default_vat_percentage"),
            default=str(settings_obj.default_vat_percentage),
        )

    if "settings_data" in settings_payload:
        settings_data = settings_payload.get("settings_data")
        settings_obj.settings_data = settings_data if isinstance(settings_data, dict) else {}

    settings_obj.updated_by = request.user
    settings_obj.full_clean()
    settings_obj.save()


@csrf_protect
@require_http_methods(["GET", "POST", "PATCH"])
def company_profile(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/profile/
    POST/PATCH /api/company/profile/

    يعرض أو يعدل بيانات الشركة الحالية فقط من عضوية المستخدم الفعالة.
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

    settings_obj = _get_or_create_company_settings(company, request)
    default_branch = _get_default_branch(company)

    if request.method == "GET":
        return JsonResponse(
            {
                "ok": True,
                "message": "تم جلب ملف الشركة بنجاح.",
                "data": {
                    "company": _company_payload(company),
                    "settings": _settings_payload(settings_obj),
                    "operational_settings": _settings_payload(settings_obj),
                    "default_branch": _branch_payload(default_branch),
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
            _update_company(company, request, payload)
            _update_company_settings(settings_obj, request, payload)

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

    company.refresh_from_db()
    settings_obj.refresh_from_db()
    default_branch = _get_default_branch(company)

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل ملف الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
                "settings": _settings_payload(settings_obj),
                "operational_settings": _settings_payload(settings_obj),
                "default_branch": _branch_payload(default_branch),
                "membership": _membership_payload(membership),
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )
# ============================================================
# 📂 api/company/me.py
# 🧠 Mhamcloud | Company Current Tenant API V1.1
# ------------------------------------------------------------
# ✅ Current company workspace snapshot
# ✅ Uses active CompanyMembership only
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ✅ Returns membership, role, permissions and company profile
# ✅ Returns CompanySettings snapshot
# ✅ Returns default branch snapshot
# ✅ Tenant isolation foundation for /api/company/
# ✅ Does not trust company_id from frontend as source of truth
# ✅ Protected by authenticated active company membership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - CompanyMembership هو حد العزل الرسمي للشركات
# - CompanySettings تخص الشركة الحالية فقط
# - default_branch يرجع كملخص سريع للمساحة
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from accounts.models import CompanyMembership
from api.permissions import attach_company_context
from companies.models import Branch, Company, CompanySettings


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


def _user_payload(user: Any) -> dict[str, Any]:
    """
    يرجع بيانات مستخدم مختصرة وآمنة.
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
    }


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يرجع بيانات الشركة الحالية المعزولة حسب العضوية.
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
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


def _settings_payload(settings_obj: CompanySettings | None) -> dict[str, Any] | None:
    """
    يرجع إعدادات الشركة التشغيلية.
    """

    if not settings_obj:
        return None

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


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    """
    يرجع بيانات عضوية المستخدم داخل الشركة الحالية.
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
        "joined_at": _datetime_to_string(getattr(membership, "joined_at", None)),
        "invited_at": _datetime_to_string(getattr(membership, "invited_at", None)),
        "suspended_at": _datetime_to_string(getattr(membership, "suspended_at", None)),
        "suspended_reason": getattr(membership, "suspended_reason", ""),
        "notes": getattr(membership, "notes", ""),
        "created_at": _datetime_to_string(getattr(membership, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(membership, "updated_at", None)),
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


@require_GET
def company_me(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/me/

    يرجع الشركة الحالية للمستخدم من عضويته الفعالة فقط.
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

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب بيانات الشركة الحالية بنجاح.",
            "data": {
                "user": _user_payload(request.user),
                "company": _company_payload(company),
                "settings": _settings_payload(settings_obj),
                "operational_settings": _settings_payload(settings_obj),
                "default_branch": _branch_payload(default_branch),
                "membership": _membership_payload(membership),
                "company_id": company.id,
                "membership_id": membership.id,
                "role": membership.role,
                "permissions": membership.company_permissions,
            },
        },
        status=200,
    )
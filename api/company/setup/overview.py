# ============================================================
# 📂 api/company/setup/overview.py
# 🧠 Mhamcloud | Company Setup Overview API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company setup overview
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Returns company operational readiness snapshot
# ✅ Returns company profile/settings/default branch/users summary
# ✅ Returns setup checklist for future /company frontend
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - CompanyMembership هو حد العزل الرسمي للشركات
# - هذا endpoint للقراءة فقط ولا يعدل البيانات
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_http_methods

from accounts.models import CompanyMembership, MembershipStatus
from api.permissions import attach_company_context
from companies.models import (
    Branch,
    BranchType,
    Company,
    CompanyOnboardingStatus,
    CompanySettings,
)
from companies.onboarding import (
    complete_company_onboarding,
    get_company_onboarding_access,
)
from subscriptions.access_policy import (
    SubscriptionWorkspaceAccess,
    evaluate_subscription_access,
)


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


def _company_payload(company: Company) -> dict[str, Any]:
    """
    يرجع ملخص ملف الشركة الحالية.
    """

    return {
        "id": company.id,
        "name": company.display_name,
        "display_name": company.display_name,
        "name_ar": company.name_ar,
        "name_en": company.name_en,
        "company_code": company.company_code,
        "activity_profile": company.activity_profile,
        "status": company.status,
        "is_active": company.is_active,
        "commercial_registration": company.commercial_registration,
        "tax_number": company.tax_number,
        "email": company.email,
        "phone": company.phone,
        "mobile": company.mobile,
        "whatsapp_number": company.whatsapp_number,
        "country": company.country,
        "city": company.city,
        "region": company.region,
        "district": company.district,
        "street_name": company.street_name,
        "building_number": company.building_number,
        "postal_code": company.postal_code,
        "short_address": company.short_address,
        "national_address_line": company.national_address_line,
        "address": company.address,
        "logo_url": _logo_url(company),
        "currency_code": company.currency_code,
        "vat_percentage": _money_to_string(company.vat_percentage),
        "created_at": _datetime_to_string(company.created_at),
        "updated_at": _datetime_to_string(company.updated_at),
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
    يرجع ملخص الفرع الافتراضي.
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
        "opening_time": _time_to_string(branch.opening_time),
        "closing_time": _time_to_string(branch.closing_time),
        "created_at": _datetime_to_string(branch.created_at),
        "updated_at": _datetime_to_string(branch.updated_at),
    }


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    """
    يرجع ملخص عضوية المستخدم الحالية.
    """

    return {
        "id": membership.id,
        "company_id": membership.company_id,
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
        "permission_count": len(membership.company_permissions),
        "joined_at": _datetime_to_string(membership.joined_at),
        "created_at": _datetime_to_string(membership.created_at),
        "updated_at": _datetime_to_string(membership.updated_at),
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


def _branches_summary(company: Company) -> dict[str, Any]:
    """
    يرجع ملخص فروع الشركة الحالية.
    """

    queryset = Branch.objects.filter(company=company)

    status_counts = (
        queryset.values("status")
        .annotate(total=Count("id"))
        .order_by("status")
    )

    return {
        "total": queryset.count(),
        "active": queryset.filter(is_active=True).count(),
        "inactive": queryset.filter(is_active=False).count(),
        "default_exists": queryset.filter(is_default=True, is_active=True).exists(),
        "by_status": {
            item["status"]: item["total"]
            for item in status_counts
        },
    }


def _users_summary(company: Company) -> dict[str, Any]:
    """
    يرجع ملخص مستخدمي/عضويات الشركة الحالية.
    """

    queryset = CompanyMembership.objects.filter(company=company)

    role_counts = (
        queryset.values("role")
        .annotate(total=Count("id"))
        .order_by("role")
    )

    return {
        "total_memberships": queryset.count(),
        "active_memberships": queryset.filter(status=MembershipStatus.ACTIVE).count(),
        "invited_memberships": queryset.filter(status=MembershipStatus.INVITED).count(),
        "suspended_memberships": queryset.filter(status=MembershipStatus.SUSPENDED).count(),
        "inactive_memberships": queryset.filter(status=MembershipStatus.INACTIVE).count(),
        "active_users": queryset.filter(user__is_active=True).count(),
        "inactive_users": queryset.filter(user__is_active=False).count(),
        "owners": queryset.filter(role="OWNER").count(),
        "admins": queryset.filter(role="ADMIN").count(),
        "by_role": {
            item["role"]: item["total"]
            for item in role_counts
        },
    }


def _setup_checklist(
    company: Company,
    settings_obj: CompanySettings,
    default_branch: Branch | None,
) -> list[dict[str, Any]]:
    """
    يرجع قائمة تحقق تشغيلية للشركة.
    """

    checks = [
        {
            "code": "company_name",
            "label": "اسم الشركة",
            "is_complete": bool(company.name or company.name_ar or company.name_en),
            "severity": "required",
        },
        {
            "code": "company_code",
            "label": "كود الشركة",
            "is_complete": bool(company.company_code),
            "severity": "required",
        },
        {
            "code": "commercial_registration",
            "label": "السجل التجاري",
            "is_complete": bool(company.commercial_registration),
            "severity": "recommended",
        },
        {
            "code": "tax_number",
            "label": "الرقم الضريبي",
            "is_complete": bool(company.tax_number) if settings_obj.enable_vat else True,
            "severity": "required" if settings_obj.enable_vat else "optional",
        },
        {
            "code": "contact",
            "label": "بيانات التواصل",
            "is_complete": bool(company.email or company.phone or company.mobile or company.whatsapp_number),
            "severity": "recommended",
        },
        {
            "code": "national_address",
            "label": "العنوان الوطني",
            "is_complete": bool(company.city and (company.short_address or company.postal_code or company.street_name)),
            "severity": "recommended",
        },
        {
            "code": "currency",
            "label": "العملة",
            "is_complete": bool(company.currency_code),
            "severity": "required",
        },
        {
            "code": "settings",
            "label": "الإعدادات التشغيلية",
            "is_complete": bool(settings_obj.default_language and settings_obj.timezone_name),
            "severity": "required",
        },
        {
            "code": "fiscal_year",
            "label": "السنة المالية",
            "is_complete": bool(settings_obj.fiscal_year_start_month and settings_obj.fiscal_year_start_day),
            "severity": "required",
        },
        {
            "code": "document_prefixes",
            "label": "بادئات المستندات",
            "is_complete": bool(settings_obj.invoice_prefix and settings_obj.receipt_prefix and settings_obj.payment_prefix),
            "severity": "recommended",
        },
        {
            "code": "default_branch",
            "label": "الفرع الافتراضي",
            "is_complete": default_branch is not None,
            "severity": "required",
        },
    ]

    return checks


def _readiness_payload(checks: list[dict[str, Any]]) -> dict[str, Any]:
    """
    يحسب جاهزية الشركة من checklist.
    """

    total = len(checks)
    completed = sum(1 for item in checks if item["is_complete"])
    required_checks = [item for item in checks if item["severity"] == "required"]
    required_completed = sum(1 for item in required_checks if item["is_complete"])

    missing_required = [
        item["code"]
        for item in required_checks
        if not item["is_complete"]
    ]

    missing_recommended = [
        item["code"]
        for item in checks
        if item["severity"] == "recommended" and not item["is_complete"]
    ]

    score = round((completed / total) * 100, 2) if total else 0

    return {
        "is_ready": not missing_required,
        "score": score,
        "total_checks": total,
        "completed_checks": completed,
        "required_checks": len(required_checks),
        "required_completed": required_completed,
        "missing_required": missing_required,
        "missing_recommended": missing_recommended,
    }


@require_http_methods(["GET", "PATCH", "POST"])
def company_setup_overview(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/setup/

    يرجع Snapshot لحالة تهيئة الشركة الحالية.
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

    subscription_access = evaluate_subscription_access(company)

    if subscription_access.access != SubscriptionWorkspaceAccess.FULL:
        return JsonResponse(
            {
                "ok": False,
                "message": "A valid active subscription is required before company setup.",
                "code": "SUBSCRIPTION_ACCESS_REQUIRED",
                "subscription_access": subscription_access.as_dict(),
            },
            status=403,
        )

    settings_obj = _get_or_create_company_settings(company, request)

    if request.method == "PATCH":
        if membership.role not in {"OWNER", "ADMIN"}:
            return JsonResponse(
                {
                    "ok": False,
                    "message": "Only a company owner or admin can update initial setup.",
                    "code": "ONBOARDING_UPDATE_FORBIDDEN",
                },
                status=403,
            )

        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "Invalid JSON body.",
                    "code": "INVALID_JSON",
                },
                status=400,
            )

        if not isinstance(payload, dict):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "JSON body must be an object.",
                    "code": "INVALID_PAYLOAD",
                },
                status=400,
            )

        company_fields = {
            "name",
            "name_ar",
            "name_en",
            "commercial_registration",
            "tax_number",
            "email",
            "phone",
            "mobile",
            "whatsapp_number",
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
        }

        settings_fields = {
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
        }

        branch_payload = payload.get("default_branch")
        if branch_payload is not None and not isinstance(branch_payload, dict):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "default_branch must be an object.",
                    "code": "INVALID_DEFAULT_BRANCH",
                },
                status=400,
            )

        with transaction.atomic():
            changed_company = []

            for field in company_fields:
                if field not in payload:
                    continue

                value = payload[field]

                if isinstance(value, str):
                    value = value.strip()

                setattr(company, field, value)
                changed_company.append(field)

            if changed_company:
                company.updated_by = request.user
                company.full_clean(
                    exclude=[
                        "activity_profile_ref",
                        "owner",
                        "created_by",
                    ]
                )
                company.save(
                    update_fields=[
                        *changed_company,
                        "updated_by",
                        "updated_at",
                    ]
                )

            changed_settings = []

            for field in settings_fields:
                if field not in payload:
                    continue

                setattr(settings_obj, field, payload[field])
                changed_settings.append(field)

            if changed_settings:
                settings_obj.updated_by = request.user
                settings_obj.full_clean()
                settings_obj.save(
                    update_fields=[
                        *changed_settings,
                        "updated_by",
                        "updated_at",
                    ]
                )

            if branch_payload is not None:
                default_branch = _get_default_branch(company)

                if default_branch is None:
                    default_branch = Branch(
                        company=company,
                        name=(
                            str(branch_payload.get("name") or "").strip()
                            or "Main Branch"
                        ),
                        name_ar=str(
                            branch_payload.get("name_ar") or ""
                        ).strip(),
                        name_en=str(
                            branch_payload.get("name_en") or ""
                        ).strip(),
                        branch_code="MAIN",
                        branch_type=BranchType.HEAD_OFFICE,
                        is_default=True,
                        created_by=request.user,
                        updated_by=request.user,
                    )

                editable_branch_fields = {
                    "name",
                    "name_ar",
                    "name_en",
                    "manager_name",
                    "email",
                    "phone",
                    "mobile",
                    "whatsapp_number",
                    "country",
                    "city",
                    "region",
                    "district",
                    "street_name",
                    "building_number",
                    "postal_code",
                    "short_address",
                    "address",
                    "opening_time",
                    "closing_time",
                }

                for field in editable_branch_fields:
                    if field not in branch_payload:
                        continue

                    value = branch_payload[field]

                    if isinstance(value, str):
                        value = value.strip()

                    if field in {"opening_time", "closing_time"}:
                        if value in {"", None}:
                            value = None

                    setattr(default_branch, field, value)

                default_branch.is_default = True
                default_branch.updated_by = request.user
                default_branch.full_clean()
                default_branch.save()

            onboarding_access = get_company_onboarding_access(company)

            if onboarding_access.managed and onboarding_access.required:
                from companies.models import CompanyOnboarding

                onboarding = CompanyOnboarding.objects.get(company=company)
                onboarding.mark_in_progress(step="setup")

        settings_obj.refresh_from_db()
        default_branch = _get_default_branch(company)

    else:
        default_branch = _get_default_branch(company)

    if request.method == "POST":
        if membership.role not in {"OWNER", "ADMIN"}:
            return JsonResponse(
                {
                    "ok": False,
                    "message": "Only a company owner or admin can complete initial setup.",
                    "code": "ONBOARDING_COMPLETE_FORBIDDEN",
                },
                status=403,
            )

        onboarding_access = get_company_onboarding_access(company)

        if not onboarding_access.managed:
            return JsonResponse(
                {
                    "ok": False,
                    "message": "This company is not enrolled in the onboarding lifecycle.",
                    "code": "ONBOARDING_NOT_MANAGED",
                },
                status=409,
            )

        try:
            complete_company_onboarding(
                company=company,
                user=request.user,
                settings_obj=settings_obj,
                default_branch=default_branch,
            )
        except Exception as exc:
            from django.core.exceptions import ValidationError

            if isinstance(exc, ValidationError):
                message_dict = getattr(exc, "message_dict", None)

                return JsonResponse(
                    {
                        "ok": False,
                        "message": "Company setup is incomplete.",
                        "code": "ONBOARDING_INCOMPLETE",
                        "errors": message_dict or {"onboarding": exc.messages},
                    },
                    status=400,
                )

            raise

    checklist = _setup_checklist(company, settings_obj, default_branch)
    onboarding_access = get_company_onboarding_access(company)

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب حالة تهيئة الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
                "membership": _membership_payload(membership),
                "settings": _settings_payload(settings_obj),
                "operational_settings": _settings_payload(settings_obj),
                "default_branch": _branch_payload(default_branch),
                "branches_summary": _branches_summary(company),
                "users_summary": _users_summary(company),
                "checklist": checklist,
                "readiness": _readiness_payload(checklist),
                "onboarding": onboarding_access.as_dict(),
                "subscription_access": subscription_access.as_dict(),
                "workspace_path": (
                    "/company"
                    if onboarding_access.ready
                    else "/company/setup"
                ),
                "current_role": membership.role,
                "current_permissions": membership.company_permissions,
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )
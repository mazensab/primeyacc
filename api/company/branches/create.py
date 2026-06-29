# ============================================================
# 📂 api/company/branches/create.py
# 🧠 Mhamcloud | Company Branch Create API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated branch creation
# ✅ Creates branch only under current CompanyMembership company
# ✅ Does not trust company_id from frontend
# ✅ Supports default branch behavior
# ✅ Validates required fields
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - إنشاء الفرع يتم دائمًا داخل الشركة الحالية فقط
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
from django.views.decorators.http import require_POST

from api.permissions import attach_company_context, request_has_company_permission
from companies.models import Branch, BranchStatus, BranchType


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


def _to_decimal_or_none(value: Any) -> Decimal | None:
    """
    يحول الإحداثيات إلى Decimal أو None.
    """

    if value in {None, ""}:
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError("قيمة الإحداثيات غير صحيحة.")


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


def _branch_payload(branch: Branch) -> dict[str, Any]:
    """
    يرجع بيانات الفرع بعد الإنشاء.
    """

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
        "settings_data": branch.settings_data if isinstance(branch.settings_data, dict) else {},
        "extra_data": branch.extra_data if isinstance(branch.extra_data, dict) else {},
        "notes": branch.notes,
        "created_at": _datetime_to_string(branch.created_at),
        "updated_at": _datetime_to_string(branch.updated_at),
    }


def _can_create_branch(request: HttpRequest) -> bool:
    """
    صلاحية إنشاء فرع داخل الشركة الحالية.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.branches.create")


@csrf_protect
@require_POST
def company_branch_create(request: HttpRequest) -> JsonResponse:
    """
    POST /api/company/branches/create/

    ينشئ فرعًا جديدًا داخل الشركة الحالية فقط.
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

    if not _can_create_branch(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإنشاء فروع الشركة.",
                "code": "COMPANY_BRANCH_CREATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    name = _clean_text(_get_value(request, payload, "name"))
    name_ar = _clean_text(_get_value(request, payload, "name_ar"))
    name_en = _clean_text(_get_value(request, payload, "name_en"))
    branch_code = _clean_upper(_get_value(request, payload, "branch_code"))

    if not name:
        return JsonResponse(
            {
                "ok": False,
                "message": "اسم الفرع مطلوب.",
                "errors": {"name": "اسم الفرع مطلوب."},
            },
            status=400,
        )

    if not branch_code:
        return JsonResponse(
            {
                "ok": False,
                "message": "كود الفرع مطلوب.",
                "errors": {"branch_code": "كود الفرع مطلوب."},
            },
            status=400,
        )

    branch_type = _clean_upper(_get_value(request, payload, "branch_type", BranchType.BRANCH))
    status = _clean_upper(_get_value(request, payload, "status", BranchStatus.ACTIVE))

    valid_branch_types = {choice[0] for choice in BranchType.choices}
    valid_statuses = {choice[0] for choice in BranchStatus.choices}

    if branch_type not in valid_branch_types:
        branch_type = BranchType.BRANCH

    if status not in valid_statuses:
        status = BranchStatus.ACTIVE

    if Branch.objects.filter(company=company, branch_code=branch_code).exists():
        return JsonResponse(
            {
                "ok": False,
                "message": "كود الفرع مستخدم مسبقًا داخل نفس الشركة.",
                "errors": {"branch_code": "كود الفرع مستخدم مسبقًا داخل نفس الشركة."},
            },
            status=400,
        )

    try:
        with transaction.atomic():
            branch = Branch(
                company=company,
                name=name,
                name_ar=name_ar,
                name_en=name_en,
                branch_code=branch_code,
                branch_type=branch_type,
                status=status,
                is_default=_clean_bool(_get_value(request, payload, "is_default"), default=False),
                manager_name=_clean_text(_get_value(request, payload, "manager_name")),
                email=_clean_text(_get_value(request, payload, "email")),
                phone=_clean_text(_get_value(request, payload, "phone")),
                mobile=_clean_text(_get_value(request, payload, "mobile")),
                whatsapp_number=_clean_text(_get_value(request, payload, "whatsapp_number")),
                country=_clean_text(_get_value(request, payload, "country", "Saudi Arabia")) or "Saudi Arabia",
                city=_clean_text(_get_value(request, payload, "city")),
                region=_clean_text(_get_value(request, payload, "region")),
                district=_clean_text(_get_value(request, payload, "district")),
                street_name=_clean_text(_get_value(request, payload, "street_name")),
                building_number=_clean_text(_get_value(request, payload, "building_number")),
                postal_code=_clean_text(_get_value(request, payload, "postal_code")),
                short_address=_clean_text(_get_value(request, payload, "short_address")),
                address=_clean_text(_get_value(request, payload, "address")),
                latitude=_to_decimal_or_none(_get_value(request, payload, "latitude")),
                longitude=_to_decimal_or_none(_get_value(request, payload, "longitude")),
                notes=_clean_text(_get_value(request, payload, "notes")),
                created_by=request.user,
                updated_by=request.user,
            )

            settings_data = _get_value(request, payload, "settings_data", {})
            extra_data = _get_value(request, payload, "extra_data", {})

            branch.settings_data = settings_data if isinstance(settings_data, dict) else {}
            branch.extra_data = extra_data if isinstance(extra_data, dict) else {}

            branch.full_clean()
            branch.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الفرع بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الفرع بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء الفرع بنجاح.",
            "data": {
                "branch": _branch_payload(branch),
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=201,
    )
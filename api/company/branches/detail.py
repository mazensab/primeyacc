# ============================================================
# 📂 api/company/branches/detail.py
# 🧠 PrimeyAcc | Company Branch Detail API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated branch detail
# ✅ Tenant-isolated branch update
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Prevents cross-company branch access
# ✅ Supports safe branch_code uniqueness per company
# ✅ Supports default branch behavior
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - تفاصيل الفرع لا تُعرض إلا إذا كان الفرع تابعًا للشركة الحالية
# - تعديل الفرع يتم فقط داخل الشركة الحالية
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
    يرجع بيانات الفرع.
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


def _can_view_branch(request: HttpRequest) -> bool:
    """
    صلاحية عرض فرع داخل الشركة الحالية.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return (
        request_has_company_permission(request, "company.branches.view")
        or request_has_company_permission(request, "company.settings.view")
        or request_has_company_permission(request, "company.profile.view")
    )


def _can_update_branch(request: HttpRequest) -> bool:
    """
    صلاحية تعديل فرع داخل الشركة الحالية.
    """

    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if membership.role in {"OWNER", "ADMIN"}:
        return True

    return request_has_company_permission(request, "company.branches.update")


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


def _get_branch_or_404(company, branch_id: int) -> Branch | None:
    """
    يجلب الفرع من الشركة الحالية فقط.
    """

    return Branch.objects.filter(
        id=branch_id,
        company=company,
    ).first()


def _update_branch(branch: Branch, request: HttpRequest, payload: dict[str, Any]) -> None:
    """
    يحدث بيانات الفرع بأمان.
    """

    text_fields = [
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
        "notes",
    ]

    for field_name in text_fields:
        if _has_value(request, payload, field_name):
            value = _clean_text(_get_value(request, payload, field_name))
            if field_name == "country":
                value = value or "Saudi Arabia"
            setattr(branch, field_name, value)

    if _has_value(request, payload, "name"):
        name = _clean_text(_get_value(request, payload, "name"))
        if not name:
            raise ValidationError({"name": "اسم الفرع مطلوب."})
        branch.name = name

    if _has_value(request, payload, "branch_code"):
        branch_code = _clean_upper(_get_value(request, payload, "branch_code"))
        if not branch_code:
            raise ValidationError({"branch_code": "كود الفرع مطلوب."})

        duplicate_exists = (
            Branch.objects.filter(
                company=branch.company,
                branch_code=branch_code,
            )
            .exclude(id=branch.id)
            .exists()
        )

        if duplicate_exists:
            raise ValidationError({"branch_code": "كود الفرع مستخدم مسبقًا داخل نفس الشركة."})

        branch.branch_code = branch_code

    if _has_value(request, payload, "branch_type"):
        branch_type = _clean_upper(_get_value(request, payload, "branch_type"))
        valid_branch_types = {choice[0] for choice in BranchType.choices}
        if branch_type in valid_branch_types:
            branch.branch_type = branch_type

    if _has_value(request, payload, "status"):
        status = _clean_upper(_get_value(request, payload, "status"))
        valid_statuses = {choice[0] for choice in BranchStatus.choices}
        if status in valid_statuses:
            branch.status = status

    if _has_value(request, payload, "is_default"):
        branch.is_default = _clean_bool(
            _get_value(request, payload, "is_default"),
            default=branch.is_default,
        )

    if _has_value(request, payload, "latitude"):
        branch.latitude = _to_decimal_or_none(_get_value(request, payload, "latitude"))

    if _has_value(request, payload, "longitude"):
        branch.longitude = _to_decimal_or_none(_get_value(request, payload, "longitude"))

    if _has_value(request, payload, "settings_data"):
        settings_data = _get_value(request, payload, "settings_data", {})
        branch.settings_data = settings_data if isinstance(settings_data, dict) else {}

    if _has_value(request, payload, "extra_data"):
        extra_data = _get_value(request, payload, "extra_data", {})
        branch.extra_data = extra_data if isinstance(extra_data, dict) else {}

    branch.updated_by = request.user
    branch.full_clean()
    branch.save()


@csrf_protect
@require_http_methods(["GET", "POST", "PATCH"])
def company_branch_detail(request: HttpRequest, branch_id: int) -> JsonResponse:
    """
    GET /api/company/branches/<branch_id>/
    POST/PATCH /api/company/branches/<branch_id>/

    يعرض أو يعدل فرعًا واحدًا داخل الشركة الحالية فقط.
    """

    membership, company, error_response = _get_current_company_and_membership(request)

    if error_response:
        return error_response

    branch = _get_branch_or_404(company=company, branch_id=branch_id)

    if not branch:
        return JsonResponse(
            {
                "ok": False,
                "message": "الفرع غير موجود داخل الشركة الحالية.",
                "code": "BRANCH_NOT_FOUND",
            },
            status=404,
        )

    if request.method == "GET":
        if not _can_view_branch(request):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "غير مصرح لك بعرض هذا الفرع.",
                    "code": "COMPANY_BRANCH_VIEW_PERMISSION_REQUIRED",
                },
                status=403,
            )

        return JsonResponse(
            {
                "ok": True,
                "message": "تم جلب بيانات الفرع بنجاح.",
                "data": {
                    "branch": _branch_payload(branch),
                    "company_id": company.id,
                    "membership_id": membership.id,
                },
            },
            status=200,
        )

    if not _can_update_branch(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل هذا الفرع.",
                "code": "COMPANY_BRANCH_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    try:
        with transaction.atomic():
            _update_branch(branch, request, payload)

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل الفرع بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل الفرع بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    branch.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل الفرع بنجاح.",
            "data": {
                "branch": _branch_payload(branch),
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )
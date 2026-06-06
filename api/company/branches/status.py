# ============================================================
# 📂 api/company/branches/status.py
# 🧠 PrimeyAcc | Company Branch Status API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated branch status actions
# ✅ Activate branch
# ✅ Deactivate branch
# ✅ Close branch
# ✅ Set default branch
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Prevents cross-company branch access
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - حالة الفرع لا تُعدل إلا إذا كان الفرع تابعًا للشركة الحالية
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import attach_company_context, request_has_company_permission
from companies.models import Branch, BranchStatus


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


def _clean_text(value: Any) -> str:
    """
    ينظف النصوص القادمة من الطلب.
    """

    return str(value or "").strip()


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
    يرجع بيانات الفرع بعد تعديل الحالة.
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


def _can_update_branch_status(request: HttpRequest) -> bool:
    """
    صلاحية تعديل حالة الفرع داخل الشركة الحالية.
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


def _apply_action(branch: Branch, action: str, request: HttpRequest) -> None:
    """
    يطبق إجراء الحالة على الفرع.
    """

    action = _clean_text(action).lower()

    if action == "activate":
        branch.status = BranchStatus.ACTIVE
        branch.is_active = True

    elif action == "deactivate":
        branch.status = BranchStatus.INACTIVE
        branch.is_active = False
        if branch.is_default:
            branch.is_default = False

    elif action == "close":
        branch.status = BranchStatus.CLOSED
        branch.is_active = False
        if branch.is_default:
            branch.is_default = False

    elif action == "maintenance":
        branch.status = BranchStatus.MAINTENANCE
        branch.is_active = True

    elif action == "set_default":
        if branch.status == BranchStatus.CLOSED:
            raise ValidationError({"status": "لا يمكن جعل فرع مغلق فرعًا افتراضيًا."})
        branch.status = BranchStatus.ACTIVE
        branch.is_active = True
        branch.is_default = True

    else:
        raise ValidationError(
            {
                "action": "الإجراء غير صحيح. الإجراءات المتاحة: activate, deactivate, close, maintenance, set_default."
            }
        )

    branch.updated_by = request.user
    branch.full_clean()
    branch.save()


@csrf_protect
@require_POST
def company_branch_status(request: HttpRequest, branch_id: int, action: str) -> JsonResponse:
    """
    POST /api/company/branches/<branch_id>/<action>/

    يعدل حالة فرع داخل الشركة الحالية فقط.
    """

    membership, company, error_response = _get_current_company_and_membership(request)

    if error_response:
        return error_response

    if not _can_update_branch_status(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل حالة هذا الفرع.",
                "code": "COMPANY_BRANCH_STATUS_PERMISSION_REQUIRED",
            },
            status=403,
        )

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

    _json_body(request)

    try:
        with transaction.atomic():
            _apply_action(branch, action, request)

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل حالة الفرع بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل حالة الفرع بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    branch.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل حالة الفرع بنجاح.",
            "data": {
                "branch": _branch_payload(branch),
                "company_id": company.id,
                "membership_id": membership.id,
                "action": action,
            },
        },
        status=200,
    )
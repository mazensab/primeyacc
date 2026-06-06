# ============================================================
# 📂 api/system/plans/status.py
# 🧠 PrimeyAcc | System Subscription Plan Status API V1.1
# ------------------------------------------------------------
# ✅ Activate / deactivate SaaS subscription plans
# ✅ Publish / hide plans from public subscription
# ✅ Supports simple action-based status updates
# ✅ Protected by system permission: system.plans.update
# ✅ Uses central api/permissions.py guard
# ✅ Safe update fields based on the current SubscriptionPlan model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - تغيير حالة الباقات لا يسمح لمستخدم company فقط
# - إيقاف الباقة لا يلغي اشتراكات الشركات الحالية
# - إخفاء الباقة يمنع ظهورها مستقبلًا فقط ولا يمس البيانات السابقة
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from subscriptions.models import SubscriptionPlan


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


def _model_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل SubscriptionPlan.
    """

    return any(field.name == field_name for field in SubscriptionPlan._meta.fields)


def _set_plan_field(
    plan: SubscriptionPlan,
    field_name: str,
    value: Any,
    update_fields: set[str],
) -> None:
    """
    يعدل الحقل فقط إذا كان موجودًا في موديل SubscriptionPlan.
    """

    if _model_has_field(field_name):
        setattr(plan, field_name, value)
        update_fields.add(field_name)


def _plan_payload(plan: SubscriptionPlan) -> dict[str, Any]:
    """
    يحول كائن الباقة إلى JSON نظيف.
    """

    return {
        "id": plan.id,
        "name": plan.name,
        "code": plan.code,
        "slug": plan.slug,
        "description": plan.description,
        "monthly_price": _money_to_string(plan.monthly_price),
        "yearly_price": _money_to_string(plan.yearly_price),
        "max_users": plan.max_users,
        "max_branches": plan.max_branches,
        "max_warehouses": plan.max_warehouses,
        "max_pos": plan.max_pos,
        "features": plan.features if isinstance(plan.features, list) else [],
        "is_active": plan.is_active,
        "is_public": plan.is_public,
        "sort_order": plan.sort_order,
        "created_at": _datetime_to_string(plan.created_at),
        "updated_at": _datetime_to_string(plan.updated_at),
    }


@login_required
@csrf_protect
@require_POST
def system_plan_status(request: HttpRequest, plan_id: int) -> JsonResponse:
    """
    POST /api/system/plans/<plan_id>/status/

    يغير حالة الباقة أو ظهورها.

    القيم المدعومة في action:
    - activate
    - deactivate
    - publish
    - hide
    - set_active
    - set_public
    """

    if not user_has_system_permission(request.user, "system.plans.update"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتغيير حالة الباقات.",
                "code": "SYSTEM_PLANS_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    plan = get_object_or_404(SubscriptionPlan, id=plan_id)
    payload = _json_body(request)

    action = str(_get_value(request, payload, "action", "") or "").strip().lower()
    update_fields: set[str] = set()

    if action == "activate":
        _set_plan_field(plan, "is_active", True, update_fields)
        message = "تم تفعيل الباقة بنجاح."

    elif action == "deactivate":
        _set_plan_field(plan, "is_active", False, update_fields)
        message = "تم إيقاف الباقة بنجاح."

    elif action == "publish":
        _set_plan_field(plan, "is_public", True, update_fields)
        message = "تم إظهار الباقة للاشتراك بنجاح."

    elif action == "hide":
        _set_plan_field(plan, "is_public", False, update_fields)
        message = "تم إخفاء الباقة من الاشتراك بنجاح."

    elif action == "set_active":
        is_active = _to_bool(
            _get_value(request, payload, "is_active", getattr(plan, "is_active", True)),
            default=getattr(plan, "is_active", True),
        )
        _set_plan_field(plan, "is_active", is_active, update_fields)
        message = "تم تحديث حالة تفعيل الباقة بنجاح."

    elif action == "set_public":
        is_public = _to_bool(
            _get_value(request, payload, "is_public", getattr(plan, "is_public", True)),
            default=getattr(plan, "is_public", True),
        )
        _set_plan_field(plan, "is_public", is_public, update_fields)
        message = "تم تحديث ظهور الباقة بنجاح."

    else:
        return JsonResponse(
            {
                "ok": False,
                "message": "الإجراء غير صحيح.",
                "errors": {
                    "action": "استخدم activate أو deactivate أو publish أو hide أو set_active أو set_public."
                },
            },
            status=400,
        )

    if _model_has_field("updated_by"):
        _set_plan_field(plan, "updated_by", request.user, update_fields)

    try:
        plan.full_clean()

        if update_fields:
            update_fields.add("updated_at")
            plan.save(update_fields=list(update_fields))
        else:
            plan.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تحديث حالة الباقة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": message,
            "data": {
                "plan": _plan_payload(plan),
            },
        },
        status=200,
    )
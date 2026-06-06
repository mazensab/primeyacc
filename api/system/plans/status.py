# ============================================================
# 📂 api/system/plans/status.py
# 🧠 PrimeyAcc | System Subscription Plan Status API V1.0
# ------------------------------------------------------------
# ✅ Activate / deactivate SaaS subscription plans
# ✅ Publish / hide plans from public subscription
# ✅ Supports simple action-based status updates
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - إيقاف الباقة لا يلغي اشتراكات الشركات الحالية
# - إخفاء الباقة يمنع ظهورها مستقبلًا فقط ولا يمس البيانات السابقة
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from subscriptions.models import SubscriptionPlan


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


def _get_value(request: HttpRequest, payload: dict[str, Any], key: str, default: Any = None) -> Any:
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
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
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

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتغيير حالة الباقات.",
            },
            status=403,
        )

    plan = get_object_or_404(SubscriptionPlan, id=plan_id)
    payload = _json_body(request)

    action = str(_get_value(request, payload, "action", "") or "").strip().lower()

    if action == "activate":
        plan.is_active = True
        message = "تم تفعيل الباقة بنجاح."

    elif action == "deactivate":
        plan.is_active = False
        message = "تم إيقاف الباقة بنجاح."

    elif action == "publish":
        plan.is_public = True
        message = "تم إظهار الباقة للاشتراك بنجاح."

    elif action == "hide":
        plan.is_public = False
        message = "تم إخفاء الباقة من الاشتراك بنجاح."

    elif action == "set_active":
        plan.is_active = _to_bool(_get_value(request, payload, "is_active", plan.is_active), default=plan.is_active)
        message = "تم تحديث حالة تفعيل الباقة بنجاح."

    elif action == "set_public":
        plan.is_public = _to_bool(_get_value(request, payload, "is_public", plan.is_public), default=plan.is_public)
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

    plan.full_clean()
    plan.save(update_fields=["is_active", "is_public", "updated_at"])

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
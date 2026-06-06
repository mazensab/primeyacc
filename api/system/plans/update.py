# ============================================================
# 📂 api/system/plans/update.py
# 🧠 PrimeyAcc | System Subscription Plan Update API V1.0
# ------------------------------------------------------------
# ✅ Update SaaS subscription plans from system workspace
# ✅ Supports partial updates using PATCH or POST
# ✅ Validates prices, limits, features, and unique slug
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - تعديل الباقة لا يغير الاشتراكات السابقة ماليًا
# - لا يتم وضع منطق الدفع أو الفواتير داخل ملف الباقات
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

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


def _has_value(request: HttpRequest, payload: dict[str, Any], key: str) -> bool:
    """
    يتحقق هل الحقل أُرسل في JSON أو form-data.
    """

    return key in payload or key in request.POST


def _get_value(request: HttpRequest, payload: dict[str, Any], key: str, default: Any = None) -> Any:
    """
    يدعم JSON و form-data بنفس الوقت.
    """

    if key in payload:
        return payload.get(key)

    return request.POST.get(key, default)


def _to_decimal(value: Any, default: str = "0.00") -> Decimal:
    """
    يحول القيمة إلى Decimal آمن.
    """

    if value in {None, ""}:
        value = default

    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError("القيمة المالية غير صحيحة.")


def _to_positive_int(value: Any, default: int = 0) -> int:
    """
    يحول القيمة إلى رقم صحيح موجب.
    """

    if value in {None, ""}:
        return default

    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValidationError("القيمة الرقمية غير صحيحة.")

    if number < 0:
        raise ValidationError("القيمة الرقمية لا يمكن أن تكون أقل من صفر.")

    return number


def _to_bool(value: Any, default: bool = False) -> bool:
    """
    يحول القيم النصية إلى Boolean.
    """

    if value in {None, ""}:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _normalize_features(value: Any) -> list[Any]:
    """
    يقبل features كقائمة JSON أو نص JSON أو نص مفصول بأسطر.
    """

    if value in {None, ""}:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, str):
        stripped = value.strip()

        if not stripped:
            return []

        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

        return [line.strip() for line in stripped.splitlines() if line.strip()]

    raise ValidationError("مميزات الباقة يجب أن تكون قائمة JSON أو نصًا صحيحًا.")


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


def _normalize_slug(value: str) -> str:
    """
    ينظف slug ويقبل العربية والإنجليزية.
    """

    slug = slugify(value, allow_unicode=True).strip("-")
    return slug or "plan"


@login_required
@csrf_protect
@require_http_methods(["POST", "PATCH"])
def system_plan_update(request: HttpRequest, plan_id: int) -> JsonResponse:
    """
    POST/PATCH /api/system/plans/<plan_id>/update/

    يعدل بيانات باقة SaaS من مساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل الباقات.",
            },
            status=403,
        )

    plan = get_object_or_404(SubscriptionPlan, id=plan_id)
    payload = _json_body(request)

    try:
        with transaction.atomic():
            if _has_value(request, payload, "name"):
                name = str(_get_value(request, payload, "name", "") or "").strip()
                if not name:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "اسم الباقة مطلوب.",
                            "errors": {"name": "اسم الباقة مطلوب."},
                        },
                        status=400,
                    )
                plan.name = name

            if _has_value(request, payload, "code"):
                code = str(_get_value(request, payload, "code", "") or "").strip().upper()
                valid_codes = {choice[0] for choice in SubscriptionPlan.PlanCode.choices}

                if code not in valid_codes:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "كود الباقة غير صحيح.",
                            "errors": {"code": "كود الباقة غير صحيح."},
                        },
                        status=400,
                    )

                plan.code = code

            if _has_value(request, payload, "slug"):
                requested_slug = str(_get_value(request, payload, "slug", "") or "").strip()
                normalized_slug = _normalize_slug(requested_slug or plan.name)

                if SubscriptionPlan.objects.exclude(id=plan.id).filter(slug=normalized_slug).exists():
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "معرّف الباقة مستخدم من قبل.",
                            "errors": {"slug": "معرّف الباقة مستخدم من قبل."},
                        },
                        status=400,
                    )

                plan.slug = normalized_slug

            if _has_value(request, payload, "description"):
                plan.description = str(_get_value(request, payload, "description", "") or "").strip()

            if _has_value(request, payload, "monthly_price"):
                plan.monthly_price = _to_decimal(_get_value(request, payload, "monthly_price"))

            if _has_value(request, payload, "yearly_price"):
                plan.yearly_price = _to_decimal(_get_value(request, payload, "yearly_price"))

            if _has_value(request, payload, "max_users"):
                plan.max_users = _to_positive_int(_get_value(request, payload, "max_users"), default=1)

            if _has_value(request, payload, "max_branches"):
                plan.max_branches = _to_positive_int(_get_value(request, payload, "max_branches"), default=1)

            if _has_value(request, payload, "max_warehouses"):
                plan.max_warehouses = _to_positive_int(_get_value(request, payload, "max_warehouses"), default=0)

            if _has_value(request, payload, "max_pos"):
                plan.max_pos = _to_positive_int(_get_value(request, payload, "max_pos"), default=0)

            if _has_value(request, payload, "features"):
                plan.features = _normalize_features(_get_value(request, payload, "features", []))

            if _has_value(request, payload, "is_active"):
                plan.is_active = _to_bool(_get_value(request, payload, "is_active"), default=plan.is_active)

            if _has_value(request, payload, "is_public"):
                plan.is_public = _to_bool(_get_value(request, payload, "is_public"), default=plan.is_public)

            if _has_value(request, payload, "sort_order"):
                plan.sort_order = _to_positive_int(_get_value(request, payload, "sort_order"), default=0)

            plan.full_clean()
            plan.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل الباقة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تعديل الباقة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تعديل الباقة بنجاح.",
            "data": {
                "plan": _plan_payload(plan),
            },
        },
        status=200,
    )
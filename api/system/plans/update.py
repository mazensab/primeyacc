# ============================================================
# 📂 api/system/plans/update.py
# 🧠 PrimeyAcc | System Subscription Plan Update API V1.1
# ------------------------------------------------------------
# ✅ Update SaaS subscription plans from system workspace
# ✅ Supports partial updates using PATCH or POST
# ✅ Validates prices, limits, features, and unique slug
# ✅ Protected by system permission: system.plans.update
# ✅ Uses central api/permissions.py guard
# ✅ Safe payload fields based on the current SubscriptionPlan model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - تعديل الباقات لا يسمح لمستخدم company فقط
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


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


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


def _normalize_slug(value: str) -> str:
    """
    ينظف slug ويقبل العربية والإنجليزية.
    """

    slug = slugify(value, allow_unicode=True).strip("-")
    return slug or "plan"


def _model_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل SubscriptionPlan.
    """

    return any(field.name == field_name for field in SubscriptionPlan._meta.fields)


def _set_plan_field(plan: SubscriptionPlan, field_name: str, value: Any) -> None:
    """
    يعدل الحقل فقط إذا كان موجودًا في موديل SubscriptionPlan.
    """

    if _model_has_field(field_name):
        setattr(plan, field_name, value)


@login_required
@csrf_protect
@require_http_methods(["POST", "PATCH"])
def system_plan_update(request: HttpRequest, plan_id: int) -> JsonResponse:
    """
    POST/PATCH /api/system/plans/<plan_id>/update/

    يعدل بيانات باقة SaaS من مساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.plans.update"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتعديل الباقات.",
                "code": "SYSTEM_PLANS_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    plan = get_object_or_404(SubscriptionPlan, id=plan_id)
    payload = _json_body(request)

    try:
        with transaction.atomic():
            if _has_value(request, payload, "name"):
                name = _clean_text(_get_value(request, payload, "name", ""))
                if not name:
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "اسم الباقة مطلوب.",
                            "errors": {"name": "اسم الباقة مطلوب."},
                        },
                        status=400,
                    )
                _set_plan_field(plan, "name", name)

            if _has_value(request, payload, "code"):
                code = _clean_text(_get_value(request, payload, "code", "")).upper()
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

                _set_plan_field(plan, "code", code)

            if _has_value(request, payload, "slug"):
                requested_slug = _clean_text(_get_value(request, payload, "slug", ""))
                normalized_slug = _normalize_slug(requested_slug or plan.name)

                if (
                    SubscriptionPlan.objects.exclude(id=plan.id)
                    .filter(slug=normalized_slug)
                    .exists()
                ):
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "معرّف الباقة مستخدم من قبل.",
                            "errors": {"slug": "معرّف الباقة مستخدم من قبل."},
                        },
                        status=400,
                    )

                _set_plan_field(plan, "slug", normalized_slug)

            if _has_value(request, payload, "description"):
                _set_plan_field(
                    plan,
                    "description",
                    _clean_text(_get_value(request, payload, "description", "")),
                )

            if _has_value(request, payload, "monthly_price"):
                _set_plan_field(
                    plan,
                    "monthly_price",
                    _to_decimal(_get_value(request, payload, "monthly_price")),
                )

            if _has_value(request, payload, "yearly_price"):
                _set_plan_field(
                    plan,
                    "yearly_price",
                    _to_decimal(_get_value(request, payload, "yearly_price")),
                )

            if _has_value(request, payload, "max_users"):
                _set_plan_field(
                    plan,
                    "max_users",
                    _to_positive_int(
                        _get_value(request, payload, "max_users"),
                        default=1,
                    ),
                )

            if _has_value(request, payload, "max_branches"):
                _set_plan_field(
                    plan,
                    "max_branches",
                    _to_positive_int(
                        _get_value(request, payload, "max_branches"),
                        default=1,
                    ),
                )

            if _has_value(request, payload, "max_warehouses"):
                _set_plan_field(
                    plan,
                    "max_warehouses",
                    _to_positive_int(
                        _get_value(request, payload, "max_warehouses"),
                        default=0,
                    ),
                )

            if _has_value(request, payload, "max_pos"):
                _set_plan_field(
                    plan,
                    "max_pos",
                    _to_positive_int(
                        _get_value(request, payload, "max_pos"),
                        default=0,
                    ),
                )

            if _has_value(request, payload, "features"):
                _set_plan_field(
                    plan,
                    "features",
                    _normalize_features(_get_value(request, payload, "features", [])),
                )

            if _has_value(request, payload, "is_active"):
                _set_plan_field(
                    plan,
                    "is_active",
                    _to_bool(
                        _get_value(request, payload, "is_active"),
                        default=getattr(plan, "is_active", True),
                    ),
                )

            if _has_value(request, payload, "is_public"):
                _set_plan_field(
                    plan,
                    "is_public",
                    _to_bool(
                        _get_value(request, payload, "is_public"),
                        default=getattr(plan, "is_public", True),
                    ),
                )

            if _has_value(request, payload, "sort_order"):
                _set_plan_field(
                    plan,
                    "sort_order",
                    _to_positive_int(
                        _get_value(request, payload, "sort_order"),
                        default=0,
                    ),
                )

            if _model_has_field("updated_by"):
                _set_plan_field(plan, "updated_by", request.user)

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
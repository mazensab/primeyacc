# ============================================================
# 📂 api/system/plans/create.py
# 🧠 Mhamcloud | System Subscription Plan Create API V1.1
# ------------------------------------------------------------
# ✅ Create SaaS subscription plans from system workspace
# ✅ Validates required fields and financial values
# ✅ Supports features JSON list safely
# ✅ Protected by system permission: system.plans.create
# ✅ Uses central api/permissions.py guard
# ✅ Safe payload fields based on the current SubscriptionPlan model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - إنشاء الباقات لا يسمح لمستخدم company فقط
# - إنشاء الباقات يتم من بيانات حقيقية فقط بدون mock data
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
from django.utils.text import slugify
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

    if value is None:
        return []

    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    if isinstance(value, str):
        stripped = value.strip()

        if not stripped:
            return []

        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
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


def _build_unique_slug(name: str, requested_slug: str | None = None) -> str:
    """
    ينشئ slug فريد للباقة.
    """

    base_slug = slugify(requested_slug or name, allow_unicode=True).strip("-")
    if not base_slug:
        base_slug = "plan"

    slug = base_slug
    counter = 2

    while SubscriptionPlan.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def _model_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل SubscriptionPlan.
    """

    return any(field.name == field_name for field in SubscriptionPlan._meta.fields)


def _filter_plan_fields(data: dict[str, Any]) -> dict[str, Any]:
    """
    يمنع تمرير حقول غير موجودة إلى SubscriptionPlan.
    """

    valid_fields = {field.name for field in SubscriptionPlan._meta.fields}
    return {key: value for key, value in data.items() if key in valid_fields}


@login_required
@csrf_protect
@require_POST
def system_plan_create(request: HttpRequest) -> JsonResponse:
    """
    POST /api/system/plans/create/

    ينشئ باقة SaaS جديدة من مساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.plans.create"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإنشاء الباقات.",
                "code": "SYSTEM_PLANS_CREATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    name = _clean_text(_get_value(request, payload, "name", ""))
    code = _clean_text(
        _get_value(request, payload, "code", SubscriptionPlan.PlanCode.BASIC)
    ).upper()
    requested_slug = _clean_text(_get_value(request, payload, "slug", ""))
    description = _clean_text(_get_value(request, payload, "description", ""))

    if not name:
        return JsonResponse(
            {
                "ok": False,
                "message": "اسم الباقة مطلوب.",
                "errors": {"name": "اسم الباقة مطلوب."},
            },
            status=400,
        )

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

    try:
        monthly_price = _to_decimal(
            _get_value(request, payload, "monthly_price", "0.00")
        )
        yearly_price = _to_decimal(
            _get_value(request, payload, "yearly_price", "0.00")
        )
        max_users = _to_positive_int(
            _get_value(request, payload, "max_users", 1),
            default=1,
        )
        max_branches = _to_positive_int(
            _get_value(request, payload, "max_branches", 1),
            default=1,
        )
        max_warehouses = _to_positive_int(
            _get_value(request, payload, "max_warehouses", 0),
            default=0,
        )
        max_pos = _to_positive_int(
            _get_value(request, payload, "max_pos", 0),
            default=0,
        )
        sort_order = _to_positive_int(
            _get_value(request, payload, "sort_order", 0),
            default=0,
        )
        features = _normalize_features(_get_value(request, payload, "features", []))
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": str(exc.messages[0] if hasattr(exc, "messages") else exc),
            },
            status=400,
        )

    is_active = _to_bool(
        _get_value(request, payload, "is_active", True),
        default=True,
    )
    is_public = _to_bool(
        _get_value(request, payload, "is_public", True),
        default=True,
    )

    try:
        with transaction.atomic():
            plan_data = {
                "name": name,
                "code": code,
                "slug": _build_unique_slug(
                    name=name,
                    requested_slug=requested_slug,
                ),
                "description": description,
                "monthly_price": monthly_price,
                "yearly_price": yearly_price,
                "max_users": max_users,
                "max_branches": max_branches,
                "max_warehouses": max_warehouses,
                "max_pos": max_pos,
                "features": features,
                "is_active": is_active,
                "is_public": is_public,
                "sort_order": sort_order,
            }

            if _model_has_field("created_by"):
                plan_data["created_by"] = request.user

            if _model_has_field("updated_by"):
                plan_data["updated_by"] = request.user

            plan = SubscriptionPlan(**_filter_plan_fields(plan_data))
            plan.full_clean()
            plan.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الباقة بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الباقة بسبب تكرار بيانات فريدة.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء الباقة بنجاح.",
            "data": {
                "plan": _plan_payload(plan),
            },
        },
        status=201,
    )
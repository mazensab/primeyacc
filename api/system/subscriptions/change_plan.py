# ============================================================
# 📂 api/system/subscriptions/change_plan.py
# 🧠 PrimeyAcc | System Company Subscription Change Plan API V1.1
# ------------------------------------------------------------
# ✅ Change company subscription plan from system workspace
# ✅ Creates a new subscription record instead of mutating history
# ✅ Safely closes current TRIAL / ACTIVE subscription first
# ✅ Protected by system permission: system.subscriptions.update
# ✅ Uses central api/permissions.py guard
# ✅ Safe payload fields based on the current CompanySubscription model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - تغيير الباقة ينشئ اشتراكًا جديدًا ولا يعدل السجل القديم
# - تغيير باقات اشتراكات الشركات لا يسمح لمستخدم company فقط
# - لا يسمح بأكثر من اشتراك TRIAL أو ACTIVE لنفس الشركة
# - الدفع والفواتير لها وحدات مستقلة لاحقًا ولا توضع هنا
# ============================================================

from __future__ import annotations

import json
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription, SubscriptionPlan


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


def _to_bool(value: Any, default: bool = False) -> bool:
    """
    يحول القيم النصية إلى Boolean.
    """

    if value in {None, ""}:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_date(value: Any, field_name: str) -> date | None:
    """
    يحول نص YYYY-MM-DD إلى date.
    """

    if value in {None, ""}:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise ValidationError({field_name: "صيغة التاريخ يجب أن تكون YYYY-MM-DD."})


def _calculate_default_end_date(start_date: date, billing_cycle: str) -> date:
    """
    يحسب تاريخ النهاية الافتراضي حسب دورة الفوترة.

    مبدئيًا:
    - شهري = 30 يوم
    - سنوي = 365 يوم
    """

    if billing_cycle == CompanySubscription.BillingCycle.YEARLY:
        return start_date + timedelta(days=365)

    return start_date + timedelta(days=30)


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{value:.2f}"


def _date_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _model_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل CompanySubscription.
    """

    return any(field.name == field_name for field in CompanySubscription._meta.fields)


def _filter_subscription_fields(data: dict[str, Any]) -> dict[str, Any]:
    """
    يمنع تمرير حقول غير موجودة إلى CompanySubscription.
    """

    valid_fields = {field.name for field in CompanySubscription._meta.fields}
    return {key: value for key, value in data.items() if key in valid_fields}


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    company = subscription.company
    plan = subscription.plan

    return {
        "id": subscription.id,
        "company": {
            "id": company.id,
            "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
            "display_name": getattr(company, "display_name", None) or getattr(company, "name", ""),
            "company_code": getattr(company, "company_code", ""),
            "code": getattr(company, "company_code", ""),
            "email": getattr(company, "email", ""),
            "phone": getattr(company, "phone", ""),
            "mobile": getattr(company, "mobile", ""),
            "city": getattr(company, "city", ""),
            "status": getattr(company, "status", ""),
            "is_active": getattr(company, "is_active", True),
        },
        "plan": {
            "id": plan.id,
            "name": plan.name,
            "code": plan.code,
            "slug": plan.slug,
            "monthly_price": _money_to_string(plan.monthly_price),
            "yearly_price": _money_to_string(plan.yearly_price),
        },
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(getattr(subscription, "amount_before_tax", None)),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "notes": subscription.notes,
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


def _get_new_plan(plan_id: Any) -> SubscriptionPlan | None:
    """
    يرجع الباقة الجديدة المطلوبة.
    """

    if plan_id in {None, ""}:
        return None

    try:
        return SubscriptionPlan.objects.get(id=int(plan_id))
    except (SubscriptionPlan.DoesNotExist, TypeError, ValueError):
        return None


def _close_current_subscription(
    *,
    subscription: CompanySubscription,
    new_plan: SubscriptionPlan,
    acting_user,
) -> None:
    """
    يغلق اشتراكًا حاليًا بشكل آمن عند تغيير الباقة.
    """

    subscription.status = CompanySubscription.Status.EXPIRED
    subscription.auto_renew = False

    current_note = _clean_text(getattr(subscription, "notes", ""))
    close_note = f"تم إغلاق هذا الاشتراك بسبب تغيير الباقة إلى {new_plan.name}."
    subscription.notes = (
        f"{current_note}\n\n{close_note}".strip()
        if current_note
        else close_note
    )

    update_fields = ["status", "auto_renew", "notes", "updated_at"]

    if _model_has_field("updated_by"):
        subscription.updated_by = acting_user
        update_fields.append("updated_by")

    subscription.save(update_fields=update_fields)


@login_required
@csrf_protect
@require_POST
def system_subscription_change_plan(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    POST /api/system/subscriptions/<subscription_id>/change-plan/

    يغير باقة اشتراك شركة بإنشاء اشتراك جديد.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.update"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتغيير باقة اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    old_subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
        ),
        id=subscription_id,
    )

    payload = _json_body(request)

    new_plan = _get_new_plan(_get_value(request, payload, "plan_id"))
    if not new_plan:
        return JsonResponse(
            {
                "ok": False,
                "message": "الباقة الجديدة مطلوبة أو غير موجودة.",
                "errors": {"plan_id": "الباقة الجديدة مطلوبة أو غير موجودة."},
            },
            status=400,
        )

    if new_plan.id == old_subscription.plan_id:
        return JsonResponse(
            {
                "ok": False,
                "message": "الشركة مشتركة بالفعل في نفس الباقة.",
                "errors": {"plan_id": "اختر باقة مختلفة عن الباقة الحالية."},
            },
            status=400,
        )

    if not new_plan.is_active:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن التحويل إلى باقة غير نشطة.",
                "errors": {"plan_id": "الباقة الجديدة غير نشطة."},
            },
            status=400,
        )

    status = _clean_text(
        _get_value(request, payload, "status", CompanySubscription.Status.ACTIVE)
    ).upper()

    valid_statuses = {
        CompanySubscription.Status.ACTIVE,
        CompanySubscription.Status.TRIAL,
    }
    if status not in valid_statuses:
        return JsonResponse(
            {
                "ok": False,
                "message": "حالة الاشتراك الجديد يجب أن تكون ACTIVE أو TRIAL.",
                "errors": {"status": "حالة الاشتراك الجديد يجب أن تكون ACTIVE أو TRIAL."},
            },
            status=400,
        )

    billing_cycle = _clean_text(
        _get_value(
            request,
            payload,
            "billing_cycle",
            old_subscription.billing_cycle,
        )
    ).upper()

    valid_cycles = {choice[0] for choice in CompanySubscription.BillingCycle.choices}
    if billing_cycle not in valid_cycles:
        return JsonResponse(
            {
                "ok": False,
                "message": "دورة الفوترة غير صحيحة.",
                "errors": {"billing_cycle": "دورة الفوترة غير صحيحة."},
            },
            status=400,
        )

    try:
        start_date = _parse_date(
            _get_value(request, payload, "start_date", timezone.localdate().isoformat()),
            "start_date",
        )
        end_date = _parse_date(
            _get_value(request, payload, "end_date", None),
            "end_date",
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "صيغة التاريخ غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    if start_date is None:
        start_date = timezone.localdate()

    if end_date is None:
        end_date = _calculate_default_end_date(start_date, billing_cycle)

    if end_date <= start_date:
        return JsonResponse(
            {
                "ok": False,
                "message": "تاريخ نهاية الاشتراك يجب أن يكون بعد تاريخ البداية.",
                "errors": {"end_date": "تاريخ نهاية الاشتراك يجب أن يكون بعد تاريخ البداية."},
            },
            status=400,
        )

    default_price = (
        new_plan.yearly_price
        if billing_cycle == CompanySubscription.BillingCycle.YEARLY
        else new_plan.monthly_price
    )

    try:
        price = _to_decimal(_get_value(request, payload, "price", default_price))
        discount_amount = _to_decimal(
            _get_value(request, payload, "discount_amount", "0.00")
        )
        tax_amount = _to_decimal(_get_value(request, payload, "tax_amount", "0.00"))

        amount_before_tax = max(price - discount_amount, Decimal("0.00"))
        default_total = amount_before_tax + tax_amount
        total_amount = _to_decimal(
            _get_value(request, payload, "total_amount", default_total)
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": str(exc.messages[0] if hasattr(exc, "messages") else exc),
            },
            status=400,
        )

    auto_renew = _to_bool(
        _get_value(request, payload, "auto_renew", old_subscription.auto_renew),
        default=old_subscription.auto_renew,
    )

    note = _clean_text(_get_value(request, payload, "notes", ""))
    old_notes = _clean_text(getattr(old_subscription, "notes", ""))
    change_note = f"تغيير الباقة من {old_subscription.plan.name} إلى {new_plan.name}."

    new_notes_parts = [change_note]
    if note:
        new_notes_parts.append(note)

    new_notes = "\n".join(new_notes_parts)

    try:
        with transaction.atomic():
            current_subscriptions = CompanySubscription.objects.select_for_update().filter(
                company=old_subscription.company,
                status__in=[
                    CompanySubscription.Status.TRIAL,
                    CompanySubscription.Status.ACTIVE,
                ],
            )

            closed_ids: list[int] = []

            for current_subscription in current_subscriptions:
                _close_current_subscription(
                    subscription=current_subscription,
                    new_plan=new_plan,
                    acting_user=request.user,
                )
                closed_ids.append(current_subscription.id)

            subscription_data = {
                "company": old_subscription.company,
                "plan": new_plan,
                "status": status,
                "billing_cycle": billing_cycle,
                "start_date": start_date,
                "end_date": end_date,
                "price": price,
                "discount_amount": discount_amount,
                "tax_amount": tax_amount,
                "total_amount": total_amount,
                "auto_renew": auto_renew,
                "notes": f"{old_notes}\n\n{new_notes}".strip() if old_notes else new_notes,
            }

            if _model_has_field("amount_before_tax"):
                subscription_data["amount_before_tax"] = amount_before_tax

            if _model_has_field("created_by"):
                subscription_data["created_by"] = request.user

            if _model_has_field("updated_by"):
                subscription_data["updated_by"] = request.user

            new_subscription = CompanySubscription(
                **_filter_subscription_fields(subscription_data)
            )
            new_subscription.full_clean()
            new_subscription.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تغيير باقة الاشتراك بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تغيير الباقة بسبب وجود اشتراك نشط أو تجريبي آخر.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تغيير باقة اشتراك الشركة بنجاح.",
            "data": {
                "old_subscription_id": old_subscription.id,
                "closed_subscription_ids": closed_ids,
                "subscription": _subscription_payload(new_subscription),
            },
        },
        status=201,
    )
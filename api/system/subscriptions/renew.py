# ============================================================
# 📂 api/system/subscriptions/renew.py
# 🧠 PrimeyAcc | System Company Subscription Renew API V1.0
# ------------------------------------------------------------
# ✅ Renew company subscriptions from system workspace
# ✅ Creates a new subscription record instead of editing old one
# ✅ Safely closes current TRIAL / ACTIVE subscription first
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - التجديد ينشئ سجل اشتراك جديد ولا يمدد نفس السجل القديم
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

from subscriptions.models import CompanySubscription, SubscriptionPlan


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
            "name": getattr(company, "name", ""),
            "code": getattr(company, "code", ""),
            "email": getattr(company, "email", ""),
            "phone": getattr(company, "phone", ""),
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
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "notes": subscription.notes,
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


def _get_plan(plan_id: Any, fallback_plan: SubscriptionPlan) -> SubscriptionPlan | None:
    """
    يرجع الباقة الجديدة إن أرسلت، أو يرجع باقة الاشتراك الحالي.
    """

    if plan_id in {None, ""}:
        return fallback_plan

    try:
        return SubscriptionPlan.objects.get(id=int(plan_id))
    except (SubscriptionPlan.DoesNotExist, TypeError, ValueError):
        return None


@login_required
@csrf_protect
@require_POST
def system_subscription_renew(request: HttpRequest, subscription_id: int) -> JsonResponse:
    """
    POST /api/system/subscriptions/<subscription_id>/renew/

    يجدد اشتراك شركة بإنشاء سجل جديد.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتجديد اشتراكات الشركات.",
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

    new_plan = _get_plan(
        _get_value(request, payload, "plan_id", None),
        fallback_plan=old_subscription.plan,
    )

    if not new_plan:
        return JsonResponse(
            {
                "ok": False,
                "message": "الباقة الجديدة غير موجودة.",
                "errors": {"plan_id": "الباقة الجديدة غير موجودة."},
            },
            status=400,
        )

    if not new_plan.is_active:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن التجديد على باقة غير نشطة.",
                "errors": {"plan_id": "الباقة غير نشطة."},
            },
            status=400,
        )

    status = str(
        _get_value(request, payload, "status", CompanySubscription.Status.ACTIVE) or ""
    ).strip().upper()

    valid_statuses = {CompanySubscription.Status.ACTIVE, CompanySubscription.Status.TRIAL}
    if status not in valid_statuses:
        return JsonResponse(
            {
                "ok": False,
                "message": "حالة التجديد يجب أن تكون ACTIVE أو TRIAL.",
                "errors": {"status": "حالة التجديد يجب أن تكون ACTIVE أو TRIAL."},
            },
            status=400,
        )

    billing_cycle = str(
        _get_value(
            request,
            payload,
            "billing_cycle",
            old_subscription.billing_cycle,
        )
        or ""
    ).strip().upper()

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

    default_price = (
        new_plan.yearly_price
        if billing_cycle == CompanySubscription.BillingCycle.YEARLY
        else new_plan.monthly_price
    )

    try:
        price = _to_decimal(_get_value(request, payload, "price", default_price))
        discount_amount = _to_decimal(_get_value(request, payload, "discount_amount", "0.00"))
        tax_amount = _to_decimal(_get_value(request, payload, "tax_amount", "0.00"))

        amount_before_tax = max(price - discount_amount, Decimal("0.00"))
        default_total = amount_before_tax + tax_amount
        total_amount = _to_decimal(_get_value(request, payload, "total_amount", default_total))
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
    notes = str(_get_value(request, payload, "notes", "") or "").strip()

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
                current_subscription.status = CompanySubscription.Status.EXPIRED
                current_subscription.auto_renew = False
                current_subscription.save(update_fields=["status", "auto_renew", "updated_at"])
                closed_ids.append(current_subscription.id)

            new_subscription = CompanySubscription(
                company=old_subscription.company,
                plan=new_plan,
                status=status,
                billing_cycle=billing_cycle,
                start_date=start_date,
                end_date=end_date,
                price=price,
                discount_amount=discount_amount,
                tax_amount=tax_amount,
                total_amount=total_amount,
                auto_renew=auto_renew,
                notes=notes,
                created_by=request.user,
            )
            new_subscription.full_clean()
            new_subscription.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تجديد الاشتراك بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تجديد الاشتراك بسبب وجود اشتراك نشط أو تجريبي آخر.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تجديد اشتراك الشركة بنجاح.",
            "data": {
                "old_subscription_id": old_subscription.id,
                "closed_subscription_ids": closed_ids,
                "subscription": _subscription_payload(new_subscription),
            },
        },
        status=201,
    )
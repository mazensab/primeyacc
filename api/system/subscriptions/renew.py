# ============================================================
# 📂 api/system/subscriptions/renew.py
# 🧠 Mhamcloud | System Company Subscription Renew API V1.2
# ------------------------------------------------------------
# ✅ Renew company subscriptions from system workspace
# ✅ Creates a new PENDING_PAYMENT subscription record
# ✅ Does not close current subscription until payment confirmation
# ✅ Uses subscriptions.services.create_renewal_pending_subscription
# ✅ Protected by system permission: system.subscriptions.renew
# ✅ Keeps platform billing separated from company payment methods
# ------------------------------------------------------------
# القاعدة المعتمدة في Phase 19:
# - التجديد ينشئ سجل اشتراك جديد ولا يمدد نفس السجل القديم
# - التجديد لا يكون ACTIVE مباشرة
# - الاشتراك الجديد يكون PENDING_PAYMENT
# - الاشتراك الحالي يبقى كما هو حتى يتم تأكيد الدفع
# - عند تأكيد الدفع فقط يتم إغلاق القديم وتفعيل الجديد
# ============================================================

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.services import create_renewal_pending_subscription, money


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


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{money(value):.2f}"


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


def _validation_errors(exc: ValidationError) -> dict[str, Any] | list[Any] | str:
    """
    يحول ValidationError إلى صيغة JSON آمنة.
    """

    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    company = subscription.company
    plan = subscription.plan
    previous_subscription = getattr(subscription, "previous_subscription", None)
    created_by = getattr(subscription, "created_by", None)

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
        "previous_subscription": {
            "id": previous_subscription.id,
            "status": previous_subscription.status,
            "plan_id": previous_subscription.plan_id,
            "billing_cycle": previous_subscription.billing_cycle,
            "start_date": _date_to_string(previous_subscription.start_date),
            "end_date": _date_to_string(previous_subscription.end_date),
        }
        if previous_subscription
        else None,
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "billing_reference": subscription.billing_reference,
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "notes": subscription.notes,
        "created_by": {
            "id": created_by.id,
            "username": created_by.username,
            "email": created_by.email,
        }
        if created_by
        else None,
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


def _get_plan(
    plan_id: Any,
    fallback_plan: SubscriptionPlan,
) -> SubscriptionPlan | None:
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
def system_subscription_renew(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    POST /api/system/subscriptions/<subscription_id>/renew/

    يجدد اشتراك شركة بإنشاء سجل جديد بحالة PENDING_PAYMENT.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.renew"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتجديد اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_RENEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    current_subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
        ),
        id=subscription_id,
    )

    if current_subscription.status not in {
        CompanySubscription.Status.TRIAL,
        CompanySubscription.Status.ACTIVE,
        CompanySubscription.Status.EXPIRED,
    }:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن تجديد هذا الاشتراك من حالته الحالية.",
                "errors": {
                    "status": "التجديد مسموح فقط للاشتراكات التجريبية أو النشطة أو المنتهية."
                },
            },
            status=400,
        )

    payload = _json_body(request)

    new_plan = _get_plan(
        _get_value(request, payload, "plan_id", None),
        fallback_plan=current_subscription.plan,
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

    billing_cycle = _clean_text(
        _get_value(
            request,
            payload,
            "billing_cycle",
            current_subscription.billing_cycle,
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
        discount_amount = _to_decimal(
            _get_value(request, payload, "discount_amount", "0.00")
        )
        vat_rate = _to_decimal(
            _get_value(request, payload, "vat_rate", "0.15"),
            default="0.15",
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر قراءة بيانات التجديد.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    auto_renew = _to_bool(
        _get_value(request, payload, "auto_renew", current_subscription.auto_renew),
        default=current_subscription.auto_renew,
    )
    billing_reference = _clean_text(
        _get_value(request, payload, "billing_reference", "")
    )
    notes = _clean_text(_get_value(request, payload, "notes", ""))

    try:
        new_subscription = create_renewal_pending_subscription(
            current_subscription=current_subscription,
            plan=new_plan,
            billing_cycle=billing_cycle,
            discount_amount=discount_amount,
            vat_rate=vat_rate,
            auto_renew=auto_renew,
            billing_reference=billing_reference,
            created_by=request.user,
            notes=notes,
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء تجديد بانتظار الدفع بسبب بيانات غير صحيحة.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    current_subscription.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء تجديد بانتظار الدفع بنجاح.",
            "data": {
                "current_subscription": _subscription_payload(current_subscription),
                "subscription": _subscription_payload(new_subscription),
            },
        },
        status=201,
    )
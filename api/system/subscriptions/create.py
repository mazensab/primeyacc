# ============================================================
# 📂 api/system/subscriptions/create.py
# 🧠 PrimeyAcc | System Company Subscription Create API V1.2
# ------------------------------------------------------------
# ✅ Create pending company subscriptions from system workspace
# ✅ Uses subscriptions.services.create_pending_subscription
# ✅ Creates PENDING_PAYMENT first, not ACTIVE directly
# ✅ Validates company, plan, billing cycle, action, discount, VAT
# ✅ Protected by system permission: system.subscriptions.create
# ✅ Keeps platform billing separated from company payment methods
# ------------------------------------------------------------
# القاعدة المعتمدة في Phase 19:
# - إنشاء الاشتراك من النظام لا يفعّل الاشتراك مباشرة
# - يتم إنشاء CompanySubscription بحالة PENDING_PAYMENT
# - التفعيل يتم لاحقًا بعد نجاح الدفع عبر confirm payment endpoint
# - لا نستخدم payments/models.py هنا لأنها تخص مدفوعات /company
# ============================================================

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from companies.models import Company
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.services import create_pending_subscription, money


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
    created_by = getattr(subscription, "created_by", None)
    previous_subscription = getattr(subscription, "previous_subscription", None)

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


def _get_company(company_id: Any) -> Company | None:
    """
    يرجع الشركة من company_id إن كان صحيحًا.
    """

    if company_id in {None, ""}:
        return None

    try:
        return Company.objects.get(id=int(company_id))
    except (Company.DoesNotExist, TypeError, ValueError):
        return None


def _get_plan(plan_id: Any) -> SubscriptionPlan | None:
    """
    يرجع الباقة من plan_id إن كان صحيحًا.
    """

    if plan_id in {None, ""}:
        return None

    try:
        return SubscriptionPlan.objects.get(id=int(plan_id))
    except (SubscriptionPlan.DoesNotExist, TypeError, ValueError):
        return None


def _get_previous_subscription(subscription_id: Any) -> CompanySubscription | None:
    """
    يرجع الاشتراك السابق إن تم تمريره.
    """

    if subscription_id in {None, ""}:
        return None

    try:
        return CompanySubscription.objects.select_related("company", "plan").get(
            id=int(subscription_id)
        )
    except (CompanySubscription.DoesNotExist, TypeError, ValueError):
        return None


@login_required
@csrf_protect
@require_POST
def system_subscription_create(request: HttpRequest) -> JsonResponse:
    """
    POST /api/system/subscriptions/create/

    ينشئ اشتراك شركة جديد بحالة PENDING_PAYMENT من مساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.create"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإنشاء اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_CREATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    payload = _json_body(request)

    company = _get_company(_get_value(request, payload, "company_id"))
    if not company:
        return JsonResponse(
            {
                "ok": False,
                "message": "الشركة مطلوبة أو غير موجودة.",
                "errors": {"company_id": "الشركة مطلوبة أو غير موجودة."},
            },
            status=400,
        )

    plan = _get_plan(_get_value(request, payload, "plan_id"))
    if not plan:
        return JsonResponse(
            {
                "ok": False,
                "message": "الباقة مطلوبة أو غير موجودة.",
                "errors": {"plan_id": "الباقة مطلوبة أو غير موجودة."},
            },
            status=400,
        )

    billing_cycle = _clean_text(
        _get_value(
            request,
            payload,
            "billing_cycle",
            CompanySubscription.BillingCycle.MONTHLY,
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

    action = _clean_text(
        _get_value(
            request,
            payload,
            "action",
            CompanySubscription.SubscriptionAction.NEW,
        )
    ).upper()

    valid_actions = {choice[0] for choice in CompanySubscription.SubscriptionAction.choices}
    if action not in valid_actions:
        return JsonResponse(
            {
                "ok": False,
                "message": "نوع عملية الاشتراك غير صحيح.",
                "errors": {"action": "نوع عملية الاشتراك غير صحيح."},
            },
            status=400,
        )

    previous_subscription = _get_previous_subscription(
        _get_value(request, payload, "previous_subscription_id", None)
    )

    if _get_value(request, payload, "previous_subscription_id", None) and not previous_subscription:
        return JsonResponse(
            {
                "ok": False,
                "message": "الاشتراك السابق غير موجود.",
                "errors": {"previous_subscription_id": "الاشتراك السابق غير موجود."},
            },
            status=400,
        )

    if previous_subscription and previous_subscription.company_id != company.id:
        return JsonResponse(
            {
                "ok": False,
                "message": "الاشتراك السابق يجب أن يكون تابعًا لنفس الشركة.",
                "errors": {
                    "previous_subscription_id": "الاشتراك السابق يجب أن يكون تابعًا لنفس الشركة."
                },
            },
            status=400,
        )

    try:
        start_date = _parse_date(
            _get_value(request, payload, "start_date", timezone.localdate().isoformat()),
            "start_date",
        )
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
                "message": "تعذر قراءة بيانات الاشتراك.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    auto_renew = _to_bool(
        _get_value(request, payload, "auto_renew", False),
        default=False,
    )
    billing_reference = _clean_text(
        _get_value(request, payload, "billing_reference", "")
    )
    notes = _clean_text(_get_value(request, payload, "notes", ""))

    try:
        subscription = create_pending_subscription(
            company=company,
            plan=plan,
            billing_cycle=billing_cycle,
            action=action,
            previous_subscription=previous_subscription,
            start_date=start_date,
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
                "message": "تعذر إنشاء اشتراك انتظار الدفع بسبب بيانات غير صحيحة.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء اشتراك بانتظار الدفع بنجاح.",
            "data": {
                "subscription": _subscription_payload(subscription),
            },
        },
        status=201,
    )
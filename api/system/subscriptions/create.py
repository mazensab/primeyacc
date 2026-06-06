# ============================================================
# 📂 api/system/subscriptions/create.py
# 🧠 PrimeyAcc | System Company Subscription Create API V1.1
# ------------------------------------------------------------
# ✅ Create company subscriptions from system workspace
# ✅ Validates company, plan, dates, billing cycle, and amounts
# ✅ Prevents duplicate current TRIAL / ACTIVE subscription
# ✅ Protected by system permission: system.subscriptions.create
# ✅ Uses central api/permissions.py guard
# ✅ Safe payload fields based on the current CompanySubscription model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - إنشاء اشتراكات الشركات لا يسمح لمستخدم company فقط
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
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from companies.models import Company
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
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
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


def _has_current_subscription(company: Company) -> bool:
    """
    يتحقق هل لدى الشركة اشتراك TRIAL أو ACTIVE حاليًا.
    """

    return CompanySubscription.objects.filter(
        company=company,
        status__in=[
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        ],
    ).exists()


@login_required
@csrf_protect
@require_POST
def system_subscription_create(request: HttpRequest) -> JsonResponse:
    """
    POST /api/system/subscriptions/create/

    ينشئ اشتراك شركة جديد من مساحة النظام.
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

    if not plan.is_active:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن إنشاء اشتراك على باقة غير نشطة.",
                "errors": {"plan_id": "الباقة غير نشطة."},
            },
            status=400,
        )

    status = _clean_text(
        _get_value(request, payload, "status", CompanySubscription.Status.TRIAL)
    ).upper()

    valid_statuses = {choice[0] for choice in CompanySubscription.Status.choices}
    if status not in valid_statuses:
        return JsonResponse(
            {
                "ok": False,
                "message": "حالة الاشتراك غير صحيحة.",
                "errors": {"status": "حالة الاشتراك غير صحيحة."},
            },
            status=400,
        )

    if status in {CompanySubscription.Status.TRIAL, CompanySubscription.Status.ACTIVE}:
        if _has_current_subscription(company):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "هذه الشركة لديها اشتراك نشط أو تجريبي بالفعل.",
                    "errors": {
                        "company_id": "لا يمكن إنشاء أكثر من اشتراك نشط أو تجريبي لنفس الشركة."
                    },
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
        plan.yearly_price
        if billing_cycle == CompanySubscription.BillingCycle.YEARLY
        else plan.monthly_price
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
        _get_value(request, payload, "auto_renew", False),
        default=False,
    )
    notes = _clean_text(_get_value(request, payload, "notes", ""))

    try:
        with transaction.atomic():
            subscription_data = {
                "company": company,
                "plan": plan,
                "status": status,
                "billing_cycle": billing_cycle,
                "start_date": start_date,
                "end_date": end_date,
                "price": price,
                "discount_amount": discount_amount,
                "tax_amount": tax_amount,
                "total_amount": total_amount,
                "auto_renew": auto_renew,
                "notes": notes,
            }

            if _model_has_field("amount_before_tax"):
                subscription_data["amount_before_tax"] = amount_before_tax

            if _model_has_field("created_by"):
                subscription_data["created_by"] = request.user

            if _model_has_field("updated_by"):
                subscription_data["updated_by"] = request.user

            subscription = CompanySubscription(
                **_filter_subscription_fields(subscription_data)
            )
            subscription.full_clean()
            subscription.save()

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الاشتراك بسبب بيانات غير صحيحة.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إنشاء الاشتراك. قد يكون لدى الشركة اشتراك نشط أو تجريبي بالفعل.",
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إنشاء اشتراك الشركة بنجاح.",
            "data": {
                "subscription": _subscription_payload(subscription),
            },
        },
        status=201,
    )
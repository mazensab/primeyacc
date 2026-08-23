# ============================================================
# 📂 subscriptions/services.py
# 🧠 Mhamcloud | Platform Subscription Services V1.0
# ------------------------------------------------------------
# ✅ Creates pending subscription payments
# ✅ Renews subscriptions as new records
# ✅ Activates subscriptions after successful platform payment
# ✅ Prevents duplicate active/trial subscriptions per company
# ✅ Calculates monthly/yearly periods safely
# ✅ Keeps platform billing separated from company payment methods
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل تجديد ينشئ CompanySubscription جديد
# - لا يتم تمديد الاشتراك القديم مباشرة
# - لا نستخدم payments/models.py هنا لأنها تخص /company
# - الدفع الحقيقي أو الفاتورة يتم ربطهما لاحقًا عبر billing_reference
# ============================================================

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from subscriptions.models import (
    SUBSCRIPTION_ACTIVE_GRACE_DAYS,
    CompanySubscription,
    SubscriptionPlan,
)


ZERO_MONEY = Decimal("0.00")
DEFAULT_VAT_RATE = Decimal("0.15")


@dataclass(frozen=True)
class SubscriptionPricing:
    """
    Pricing snapshot for a platform subscription.

    هذا الكائن يمثل نتيجة الحساب فقط ولا ينشئ دفعًا أو فاتورة.
    """

    price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    @property
    def amount_before_tax(self) -> Decimal:
        return max(self.price - self.discount_amount, ZERO_MONEY)


@dataclass(frozen=True)
class SubscriptionPeriod:
    """
    Calculated subscription period.
    """

    start_date: date
    end_date: date


def money(value: Decimal | int | str | None) -> Decimal:
    """
    Normalize monetary values to two decimals.
    """

    if value is None:
        value = ZERO_MONEY

    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def add_months(value: date, months: int) -> date:
    """
    Add months to a date without external dependencies.

    مثال:
    2026-01-31 + شهر = 2026-02-28
    """

    if months <= 0:
        raise ValidationError("عدد الأشهر يجب أن يكون أكبر من صفر.")

    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])

    return date(year, month, day)


def calculate_subscription_period(
    *,
    billing_cycle: str,
    start_date: date | None = None,
) -> SubscriptionPeriod:
    """
    Calculate start/end dates for monthly or yearly subscription.

    end_date تكون آخر يوم داخل فترة الاشتراك.
    """

    start = start_date or timezone.localdate()

    if billing_cycle == CompanySubscription.BillingCycle.MONTHLY:
        end = add_months(start, 1)
    elif billing_cycle == CompanySubscription.BillingCycle.YEARLY:
        end = add_months(start, 12)
    else:
        raise ValidationError({"billing_cycle": "دورة الفوترة غير صحيحة."})

    return SubscriptionPeriod(
        start_date=start,
        end_date=end,
    )


def calculate_subscription_pricing(
    *,
    plan: SubscriptionPlan,
    billing_cycle: str,
    discount_amount: Decimal | int | str | None = None,
    vat_rate: Decimal | int | str | None = DEFAULT_VAT_RATE,
) -> SubscriptionPricing:
    """
    Calculate subscription pricing snapshot.

    لا يعتمد على كود خصم هنا.
    خصومات الكوبونات يتم حلها في خدمة billing/discounts ثم تمرير discount_amount.
    """

    if not plan:
        raise ValidationError({"plan": "الباقة مطلوبة."})

    if billing_cycle not in {
        CompanySubscription.BillingCycle.MONTHLY,
        CompanySubscription.BillingCycle.YEARLY,
    }:
        raise ValidationError({"billing_cycle": "دورة الفوترة غير صحيحة."})

    price = money(plan.get_price_for_cycle(billing_cycle))
    discount = money(discount_amount)
    rate = Decimal(vat_rate if vat_rate is not None else DEFAULT_VAT_RATE)

    if price < 0:
        raise ValidationError({"price": "قيمة الاشتراك لا يمكن أن تكون أقل من صفر."})

    if discount < 0:
        raise ValidationError({"discount_amount": "قيمة الخصم لا يمكن أن تكون أقل من صفر."})

    if discount > price:
        raise ValidationError({"discount_amount": "قيمة الخصم لا يمكن أن تتجاوز قيمة الاشتراك."})

    if rate < 0:
        raise ValidationError({"vat_rate": "نسبة الضريبة لا يمكن أن تكون أقل من صفر."})

    amount_before_tax = max(price - discount, ZERO_MONEY)
    tax = money(amount_before_tax * rate)
    total = money(amount_before_tax + tax)

    return SubscriptionPricing(
        price=price,
        discount_amount=discount,
        tax_amount=tax,
        total_amount=total,
    )


def get_current_subscription(company) -> CompanySubscription | None:
    """
    Return current active/trial subscription for a company.
    """

    if not company:
        raise ValidationError({"company": "الشركة مطلوبة."})

    today = timezone.localdate()

    return (
        CompanySubscription.objects.filter(
            company=company,
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ],
            start_date__lte=today,
            end_date__gte=today,
        )
        .order_by("-start_date", "-created_at", "-id")
        .first()
    )

def get_active_grace_subscription(
    company,
) -> CompanySubscription | None:
    """
    Return the ACTIVE subscription currently inside its grace window.
    Grace starts the day after end_date and remains valid through
    end_date + SUBSCRIPTION_ACTIVE_GRACE_DAYS.
    TRIAL subscriptions never receive this grace period.
    """
    if not company:
        raise ValidationError({"company": "الشركة مطلوبة."})
    today = timezone.localdate()
    grace_floor = today - timedelta(
        days=SUBSCRIPTION_ACTIVE_GRACE_DAYS
    )
    return (
        CompanySubscription.objects.filter(
            company=company,
            status=CompanySubscription.Status.ACTIVE,
            start_date__lte=today,
            end_date__lt=today,
            end_date__gte=grace_floor,
        )
        .order_by("-end_date", "-created_at", "-id")
        .first()
    )


def get_latest_subscription(company) -> CompanySubscription | None:
    """
    Return latest subscription for a company regardless of status.
    """

    if not company:
        raise ValidationError({"company": "الشركة مطلوبة."})

    return (
        CompanySubscription.objects.filter(company=company)
        .order_by("-created_at", "-id")
        .first()
    )


def ensure_no_duplicate_current_subscription(
    *,
    company,
    exclude_subscription_id: int | None = None,
) -> None:
    """
    Enforce no duplicate ACTIVE/TRIAL subscriptions per company.
    """

    if not company:
        raise ValidationError({"company": "الشركة مطلوبة."})

    queryset = CompanySubscription.objects.filter(
        company=company,
        status__in=[
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        ],
    )

    if exclude_subscription_id:
        queryset = queryset.exclude(id=exclude_subscription_id)

    if queryset.exists():
        raise ValidationError(
            {
                "company": (
                    "يوجد اشتراك نشط أو تجريبي حاليًا لهذه الشركة. "
                    "يجب إنشاء اشتراك انتظار دفع ثم تفعيله بعد معالجة الاشتراك الحالي."
                )
            }
        )


@transaction.atomic
def create_pending_subscription(
    *,
    company,
    plan: SubscriptionPlan,
    billing_cycle: str,
    action: str = CompanySubscription.SubscriptionAction.NEW,
    previous_subscription: CompanySubscription | None = None,
    start_date: date | None = None,
    discount_amount: Decimal | int | str | None = None,
    vat_rate: Decimal | int | str | None = DEFAULT_VAT_RATE,
    auto_renew: bool = False,
    billing_reference: str = "",
    created_by=None,
    notes: str = "",
    extra_fields: dict[str, Any] | None = None,
) -> CompanySubscription:
    """
    Create a PENDING_PAYMENT subscription record.

    هذا يستخدم عند:
    - اشتراك جديد
    - تجديد
    - ترقية
    - تخفيض الباقة

    لا يقوم بتفعيل الاشتراك ولا ينشئ دفعًا.
    """

    if not company:
        raise ValidationError({"company": "الشركة مطلوبة."})

    if not plan:
        raise ValidationError({"plan": "الباقة مطلوبة."})

    if not plan.is_active:
        raise ValidationError({"plan": "لا يمكن استخدام باقة غير نشطة."})

    if action not in CompanySubscription.SubscriptionAction.values:
        raise ValidationError({"action": "نوع عملية الاشتراك غير صحيح."})

    if previous_subscription and previous_subscription.company_id != company.id:
        raise ValidationError(
            {
                "previous_subscription": (
                    "الاشتراك السابق يجب أن يكون تابعًا لنفس الشركة."
                )
            }
        )

    period = calculate_subscription_period(
        billing_cycle=billing_cycle,
        start_date=start_date,
    )
    pricing = calculate_subscription_pricing(
        plan=plan,
        billing_cycle=billing_cycle,
        discount_amount=discount_amount,
        vat_rate=vat_rate,
    )

    payload: dict[str, Any] = {
        "company": company,
        "plan": plan,
        "previous_subscription": previous_subscription,
        "status": CompanySubscription.Status.PENDING_PAYMENT,
        "action": action,
        "billing_cycle": billing_cycle,
        "start_date": period.start_date,
        "end_date": period.end_date,
        "price": pricing.price,
        "discount_amount": pricing.discount_amount,
        "tax_amount": pricing.tax_amount,
        "total_amount": pricing.total_amount,
        "auto_renew": auto_renew,
        "billing_reference": billing_reference,
        "created_by": created_by,
        "notes": notes,
    }

    if extra_fields:
        allowed_extra_fields = {
            "paid_at",
            "activated_at",
            "cancelled_at",
            "suspended_at",
        }
        for key, value in extra_fields.items():
            if key in allowed_extra_fields:
                payload[key] = value

    subscription = CompanySubscription(**payload)
    subscription.full_clean()
    subscription.save()

    return subscription


@transaction.atomic
def create_renewal_pending_subscription(
    *,
    current_subscription: CompanySubscription,
    plan: SubscriptionPlan | None = None,
    billing_cycle: str | None = None,
    discount_amount: Decimal | int | str | None = None,
    vat_rate: Decimal | int | str | None = DEFAULT_VAT_RATE,
    auto_renew: bool | None = None,
    billing_reference: str = "",
    created_by=None,
    notes: str = "",
) -> CompanySubscription:
    """
    Create renewal subscription as a new PENDING_PAYMENT record.

    لا يمدد الاشتراك الحالي.
    """

    if not current_subscription:
        raise ValidationError({"current_subscription": "الاشتراك الحالي مطلوب."})

    company = current_subscription.company
    selected_plan = plan or current_subscription.plan
    selected_cycle = billing_cycle or current_subscription.billing_cycle

    today = timezone.localdate()
    if current_subscription.end_date >= today:
        next_start_date = current_subscription.end_date + timedelta(days=1)
    else:
        next_start_date = today

    return create_pending_subscription(
        company=company,
        plan=selected_plan,
        billing_cycle=selected_cycle,
        action=CompanySubscription.SubscriptionAction.RENEWAL,
        previous_subscription=current_subscription,
        start_date=next_start_date,
        discount_amount=discount_amount,
        vat_rate=vat_rate,
        auto_renew=current_subscription.auto_renew if auto_renew is None else auto_renew,
        billing_reference=billing_reference,
        created_by=created_by,
        notes=notes,
    )


@transaction.atomic
def create_plan_change_pending_subscription(
    *,
    current_subscription: CompanySubscription,
    new_plan: SubscriptionPlan,
    billing_cycle: str | None = None,
    action: str = CompanySubscription.SubscriptionAction.UPGRADE,
    start_date: date | None = None,
    discount_amount: Decimal | int | str | None = None,
    vat_rate: Decimal | int | str | None = DEFAULT_VAT_RATE,
    auto_renew: bool | None = None,
    billing_reference: str = "",
    created_by=None,
    notes: str = "",
) -> CompanySubscription:
    """
    Create pending subscription for upgrade/downgrade.

    التفعيل يتم لاحقًا بعد الدفع.
    """

    if not current_subscription:
        raise ValidationError({"current_subscription": "الاشتراك الحالي مطلوب."})

    if not new_plan:
        raise ValidationError({"new_plan": "الباقة الجديدة مطلوبة."})

    if action not in {
        CompanySubscription.SubscriptionAction.UPGRADE,
        CompanySubscription.SubscriptionAction.DOWNGRADE,
    }:
        raise ValidationError({"action": "تغيير الباقة يجب أن يكون ترقية أو تخفيض."})

    return create_pending_subscription(
        company=current_subscription.company,
        plan=new_plan,
        billing_cycle=billing_cycle or current_subscription.billing_cycle,
        action=action,
        previous_subscription=current_subscription,
        start_date=start_date or timezone.localdate(),
        discount_amount=discount_amount,
        vat_rate=vat_rate,
        auto_renew=current_subscription.auto_renew if auto_renew is None else auto_renew,
        billing_reference=billing_reference,
        created_by=created_by,
        notes=notes,
    )


@transaction.atomic
def activate_pending_subscription(
    *,
    subscription: CompanySubscription,
    paid_at=None,
    billing_reference: str = "",
    cancel_previous: bool = True,
) -> CompanySubscription:
    """
    Activate a pending subscription after platform payment succeeds.

    - لا ينفذ الدفع هنا.
    - فقط يفعّل الاشتراك بعد أن تؤكد خدمة الدفع/الفاتورة نجاح العملية.
    - إذا كان هناك اشتراك سابق، يتم إلغاؤه حتى لا يتعارض مع القيد الفريد.
    """

    if not subscription:
        raise ValidationError({"subscription": "الاشتراك مطلوب."})

    subscription = CompanySubscription.objects.select_for_update().get(pk=subscription.pk)

    if subscription.status != CompanySubscription.Status.PENDING_PAYMENT:
        raise ValidationError(
            {
                "status": (
                    "لا يمكن تفعيل الاشتراك إلا إذا كان في حالة انتظار الدفع."
                )
            }
        )

    previous_subscription = None

    if subscription.previous_subscription_id:
        previous_subscription = CompanySubscription.objects.select_for_update().get(
            pk=subscription.previous_subscription_id
        )

        if previous_subscription.company_id != subscription.company_id:
            raise ValidationError(
                {
                    "previous_subscription": (
                        "الاشتراك السابق يجب أن يكون تابعًا لنفس الشركة."
                    )
                }
            )

        if cancel_previous and previous_subscription.status in {
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        }:
            previous_subscription.cancel(save=True)

    ensure_no_duplicate_current_subscription(
        company=subscription.company,
        exclude_subscription_id=subscription.id,
    )

    if billing_reference:
        subscription.billing_reference = billing_reference

    subscription.activate(paid_at=paid_at or timezone.now(), save=True)

    if billing_reference:
        subscription.save(update_fields=["billing_reference", "updated_at"])

    try:
        from accounting.services import seed_company_chart_of_accounts
        seed_company_chart_of_accounts(
            subscription.company,
            overwrite=False,
        )
    except Exception as exc:
        raise ValidationError(
            {"accounting": f"تعذر تهيئة دليل الحسابات للشركة: {exc}"}
        ) from exc
    from notifications.lifecycle import (
        schedule_lifecycle_notification,
    )

    if (
        subscription.action
        == CompanySubscription.SubscriptionAction.RENEWAL
    ):
        lifecycle_event_type = (
            "subscription.renewed"
        )
        lifecycle_title = (
            "تم تجديد الاشتراك"
        )
        lifecycle_message = (
            "تم تجديد اشتراك Mhamcloud بنجاح."
        )

    else:
        lifecycle_event_type = (
            "subscription.activated"
        )
        lifecycle_title = (
            "تم تفعيل الاشتراك"
        )
        lifecycle_message = (
            "تم تفعيل اشتراك Mhamcloud بنجاح."
        )

    schedule_lifecycle_notification(
        company_id=subscription.company_id,
        event_type=lifecycle_event_type,
        event_key=(
            f"subscription:{subscription.id}:"
            f"{lifecycle_event_type}"
        ),
        title=lifecycle_title,
        message=lifecycle_message,
        metadata={
            "subscription_id": subscription.id,
            "plan_id": subscription.plan_id,
            "status": subscription.status,
            "action": subscription.action,
            "billing_cycle": subscription.billing_cycle,
            "start_date": (
                subscription.start_date.isoformat()
                if subscription.start_date
                else None
            ),
            "end_date": (
                subscription.end_date.isoformat()
                if subscription.end_date
                else None
            ),
        },
        created_by_id=(
            getattr(
                subscription.created_by,
                "id",
                None,
            )
        ),
    )

    return subscription


@transaction.atomic
def cancel_subscription(
    *,
    subscription: CompanySubscription,
    reason: str = "",
) -> CompanySubscription:
    """
    Cancel a subscription and disable auto-renew.
    """

    if not subscription:
        raise ValidationError({"subscription": "الاشتراك مطلوب."})

    subscription = CompanySubscription.objects.select_for_update().get(pk=subscription.pk)

    if reason:
        current_notes = subscription.notes or ""
        subscription.notes = f"{current_notes}\nCancellation reason: {reason}".strip()
        subscription.save(update_fields=["notes", "updated_at"])

    subscription.cancel(save=True)

    return subscription


@transaction.atomic
def suspend_subscription(
    *,
    subscription: CompanySubscription,
    reason: str = "",
) -> CompanySubscription:
    """
    Suspend a subscription.
    """

    if not subscription:
        raise ValidationError({"subscription": "الاشتراك مطلوب."})

    subscription = CompanySubscription.objects.select_for_update().get(pk=subscription.pk)

    if reason:
        current_notes = subscription.notes or ""
        subscription.notes = f"{current_notes}\nSuspension reason: {reason}".strip()
        subscription.save(update_fields=["notes", "updated_at"])

    subscription.suspend(save=True)

    return subscription


@transaction.atomic
def expire_due_subscriptions() -> int:
    """
    Mark due subscriptions as expired.

    TRIAL expires immediately after end_date.
    ACTIVE receives a 7-day grace period and expires after the grace window.

    Returns number of changed subscriptions.
    """

    today = timezone.localdate()

    trial_subscriptions = (
        CompanySubscription.objects.select_for_update()
        .filter(
            status=CompanySubscription.Status.TRIAL,
            end_date__lt=today,
        )
        .order_by("id")
    )

    active_subscriptions = (
        CompanySubscription.objects.select_for_update()
        .filter(
            status=CompanySubscription.Status.ACTIVE,
            end_date__lt=today - timedelta(
                days=SUBSCRIPTION_ACTIVE_GRACE_DAYS
            ),
        )
        .order_by("id")
    )

    changed = 0

    for subscription in trial_subscriptions:
        if subscription.mark_expired_if_needed(save=True):
            changed += 1

    for subscription in active_subscriptions:
        if subscription.mark_expired_if_needed(save=True):
            changed += 1

    return changed


@transaction.atomic
def set_auto_renew(
    *,
    subscription: CompanySubscription,
    enabled: bool,
) -> CompanySubscription:
    """
    Enable or disable auto renewal.
    """

    if not subscription:
        raise ValidationError({"subscription": "الاشتراك مطلوب."})

    subscription = CompanySubscription.objects.select_for_update().get(pk=subscription.pk)
    subscription.auto_renew = bool(enabled)
    subscription.save(update_fields=["auto_renew", "updated_at"])

    return subscription


def build_subscription_summary(company) -> dict[str, Any]:
    """
    Build a compact subscription snapshot for APIs.

    current keeps its strict contractual meaning.
    grace represents an expired-by-date ACTIVE subscription that
    remains operational during the grace window.
    effective is current or grace, whichever currently owns workspace
    access.
    """

    current = get_current_subscription(company)
    grace = get_active_grace_subscription(company)
    latest = get_latest_subscription(company)

    source = current or grace or latest

    if not source:
        return {
            "has_subscription": False,
            "current": None,
            "grace": None,
            "effective": None,
            "latest": None,
        }

    def serialize(
        subscription: CompanySubscription | None,
    ) -> dict[str, Any] | None:
        if not subscription:
            return None

        is_in_grace = subscription.is_in_active_grace
        grace_expires_at = (
            subscription.active_grace_expires_at
            if is_in_grace
            else None
        )

        return {
            "id": subscription.id,
            "plan_id": subscription.plan_id,
            "plan_name": (
                subscription.plan.name
                if subscription.plan_id
                else ""
            ),
            "status": subscription.status,
            "action": subscription.action,
            "billing_cycle": subscription.billing_cycle,
            "start_date": (
                subscription.start_date.isoformat()
                if subscription.start_date
                else None
            ),
            "end_date": (
                subscription.end_date.isoformat()
                if subscription.end_date
                else None
            ),
            "days_remaining": subscription.days_remaining,
            "is_in_grace": is_in_grace,
            "grace_days_remaining": (
                subscription.grace_days_remaining
            ),
            "grace_expires_at": (
                grace_expires_at.isoformat()
                if grace_expires_at
                else None
            ),
            "auto_renew": subscription.auto_renew,
            "price": str(money(subscription.price)),
            "discount_amount": str(
                money(subscription.discount_amount)
            ),
            "tax_amount": str(
                money(subscription.tax_amount)
            ),
            "total_amount": str(
                money(subscription.total_amount)
            ),
            "billing_reference": (
                subscription.billing_reference
            ),
            "paid_at": (
                subscription.paid_at.isoformat()
                if subscription.paid_at
                else None
            ),
            "activated_at": (
                subscription.activated_at.isoformat()
                if subscription.activated_at
                else None
            ),
        }

    effective = current or grace

    return {
        "has_subscription": True,
        "current": serialize(current),
        "grace": serialize(grace),
        "effective": serialize(effective),
        "latest": serialize(latest),
    }

# ===== Phase 28B Commercial Rules Services =====


@transaction.atomic
def create_commercial_pending_subscription(
    *,
    company,
    plan: SubscriptionPlan,
    billing_cycle: str,
    action: str = CompanySubscription.SubscriptionAction.NEW,
    current_subscription: CompanySubscription | None = None,
    previous_subscription: CompanySubscription | None = None,
    start_date: date | None = None,
    promotion_code: str = "",
    manual_discount_amount: Decimal | int | str | None = None,
    vat_rate: Decimal | int | str | None = DEFAULT_VAT_RATE,
    auto_renew: bool = False,
    billing_reference: str = "",
    created_by=None,
    notes: str = "",
) -> CompanySubscription:
    """
    Phase 28 commercial subscription creator.

    This service intentionally wraps the existing Phase 19
    create_pending_subscription() contract instead of replacing it.

    NEW / RENEWAL:
        normal plan price is used.

    UPGRADE / DOWNGRADE:
        only the remaining-period positive adjustment is charged.
        A downgrade credit is snapshotted but is not paid out here.

    Promotion and manual discounts are applied before VAT.
    """

    from subscriptions.commercial import (
        calculate_commercial_pricing,
        redeem_promotion,
    )

    if not company:
        raise ValidationError(
            {"company": "Company is required."}
        )

    if not plan:
        raise ValidationError(
            {"plan": "Subscription plan is required."}
        )

    effective_previous = (
        previous_subscription
        or current_subscription
    )

    if (
        effective_previous is not None
        and effective_previous.company_id != company.id
    ):
        raise ValidationError(
            {
                "previous_subscription": (
                    "Previous subscription must belong "
                    "to the same company."
                )
            }
        )

    commercial = calculate_commercial_pricing(
        plan=plan,
        billing_cycle=billing_cycle,
        company=company,
        current_subscription=current_subscription,
        action=action,
        promotion_code=promotion_code,
        manual_discount_amount=(
            manual_discount_amount
            if manual_discount_amount is not None
            else ZERO_MONEY
        ),
        vat_rate=vat_rate,
        effective_date=start_date,
    )

    subscription = create_pending_subscription(
        company=company,
        plan=plan,
        billing_cycle=billing_cycle,
        action=action,
        previous_subscription=effective_previous,
        start_date=start_date,
        discount_amount=ZERO_MONEY,
        vat_rate=vat_rate,
        auto_renew=auto_renew,
        billing_reference=billing_reference,
        created_by=created_by,
        notes=notes,
    )

    subscription.price = money(
        commercial.subtotal
    )
    subscription.promotion_code = (
        commercial.promotion.code
        if commercial.promotion
        else ""
    )
    subscription.promotion_discount_amount = money(
        commercial.promotion_discount
    )
    subscription.manual_discount_amount = money(
        commercial.manual_discount
    )
    subscription.discount_amount = money(
        commercial.total_discount
    )
    subscription.proration_charge_amount = money(
        commercial.proration_charge
    )
    subscription.proration_credit_amount = money(
        commercial.proration_credit
    )
    subscription.tax_amount = money(
        commercial.tax_amount
    )
    subscription.total_amount = money(
        commercial.total_amount
    )
    subscription.commercial_snapshot = (
        commercial.as_dict()
    )

    subscription.full_clean()

    subscription.save(
        update_fields=[
            "price",
            "promotion_code",
            "promotion_discount_amount",
            "manual_discount_amount",
            "discount_amount",
            "proration_charge_amount",
            "proration_credit_amount",
            "tax_amount",
            "total_amount",
            "commercial_snapshot",
            "updated_at",
        ]
    )

    if (
        commercial.promotion
        and commercial.promotion.promotion_id
        and commercial.promotion_discount
        > ZERO_MONEY
    ):
        redeem_promotion(
            promotion_id=(
                commercial.promotion.promotion_id
            ),
            company=company,
            subscription=subscription,
            discount_amount=(
                commercial.promotion_discount
            ),
            actor=created_by,
        )

    return subscription

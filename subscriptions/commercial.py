from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
ZERO_MONEY = Decimal("0.00")
MONEY_QUANTIZER = Decimal("0.01")
DEFAULT_VAT_RATE = Decimal("0.15")
def money(value: Any) -> Decimal:
    if value in {None, ""}:
        value = ZERO_MONEY
    try:
        normalized = Decimal(str(value))
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ValidationError(
            {"amount": "Invalid monetary value."}
        ) from exc
    if not normalized.is_finite():
        raise ValidationError(
            {"amount": "Invalid monetary value."}
        )
    return normalized.quantize(
        MONEY_QUANTIZER,
        rounding=ROUND_HALF_UP,
    )
@dataclass(frozen=True)
class CommercialDiscountResult:
    code: str
    discount_type: str
    discount_value: Decimal
    discount_amount: Decimal
    original_amount: Decimal
    amount_after_discount: Decimal
    promotion_id: int | None = None
    def as_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "discount_type": self.discount_type,
            "discount_value": f"{self.discount_value:.2f}",
            "discount_amount": f"{self.discount_amount:.2f}",
            "original_amount": f"{self.original_amount:.2f}",
            "amount_after_discount": (
                f"{self.amount_after_discount:.2f}"
            ),
            "promotion_id": self.promotion_id,
        }
@dataclass(frozen=True)
class SubscriptionProrationResult:
    effective_date: date
    period_start: date
    period_end: date
    total_days: int
    remaining_days: int
    remaining_ratio: Decimal
    current_plan_price: Decimal
    new_plan_price: Decimal
    current_unused_credit: Decimal
    new_remaining_charge: Decimal
    adjustment_amount: Decimal
    charge_amount: Decimal
    credit_amount: Decimal
    def as_dict(self) -> dict[str, Any]:
        return {
            "effective_date": self.effective_date.isoformat(),
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "total_days": self.total_days,
            "remaining_days": self.remaining_days,
            "remaining_ratio": str(self.remaining_ratio),
            "current_plan_price": (
                f"{self.current_plan_price:.2f}"
            ),
            "new_plan_price": (
                f"{self.new_plan_price:.2f}"
            ),
            "current_unused_credit": (
                f"{self.current_unused_credit:.2f}"
            ),
            "new_remaining_charge": (
                f"{self.new_remaining_charge:.2f}"
            ),
            "adjustment_amount": (
                f"{self.adjustment_amount:.2f}"
            ),
            "charge_amount": (
                f"{self.charge_amount:.2f}"
            ),
            "credit_amount": (
                f"{self.credit_amount:.2f}"
            ),
        }
@dataclass(frozen=True)
class CommercialPricingResult:
    base_price: Decimal
    proration_charge: Decimal
    proration_credit: Decimal
    subtotal: Decimal
    promotion_discount: Decimal
    manual_discount: Decimal
    total_discount: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    promotion: CommercialDiscountResult | None = None
    proration: SubscriptionProrationResult | None = None
    def as_dict(self) -> dict[str, Any]:
        return {
            "base_price": f"{self.base_price:.2f}",
            "proration_charge": f"{self.proration_charge:.2f}",
            "proration_credit": f"{self.proration_credit:.2f}",
            "subtotal": f"{self.subtotal:.2f}",
            "promotion_discount": (
                f"{self.promotion_discount:.2f}"
            ),
            "manual_discount": (
                f"{self.manual_discount:.2f}"
            ),
            "total_discount": f"{self.total_discount:.2f}",
            "taxable_amount": f"{self.taxable_amount:.2f}",
            "tax_amount": f"{self.tax_amount:.2f}",
            "total_amount": f"{self.total_amount:.2f}",
            "promotion": (
                self.promotion.as_dict()
                if self.promotion
                else None
            ),
            "proration": (
                self.proration.as_dict()
                if self.proration
                else None
            ),
        }
def calculate_subscription_proration(
    *,
    current_subscription: CompanySubscription,
    new_plan: SubscriptionPlan,
    billing_cycle: str | None = None,
    effective_date: date | None = None,
) -> SubscriptionProrationResult:
    if not current_subscription:
        raise ValidationError(
            {
                "current_subscription": (
                    "Current subscription is required."
                )
            }
        )
    if not new_plan:
        raise ValidationError(
            {"new_plan": "New subscription plan is required."}
        )
    if current_subscription.status not in {
        CompanySubscription.Status.ACTIVE,
        CompanySubscription.Status.TRIAL,
    }:
        raise ValidationError(
            {
                "current_subscription": (
                    "Proration requires an ACTIVE "
                    "or TRIAL subscription."
                )
            }
        )
    effective = (
        effective_date
        or timezone.localdate()
    )
    if effective < current_subscription.start_date:
        raise ValidationError(
            {
                "effective_date": (
                    "Effective date cannot be before "
                    "subscription start."
                )
            }
        )
    if effective > current_subscription.end_date:
        raise ValidationError(
            {
                "effective_date": (
                    "Effective date cannot be after "
                    "subscription end."
                )
            }
        )
    cycle = (
        billing_cycle
        or current_subscription.billing_cycle
    )
    if cycle not in CompanySubscription.BillingCycle.values:
        raise ValidationError(
            {"billing_cycle": "Invalid billing cycle."}
        )
    total_days = (
        current_subscription.end_date
        - current_subscription.start_date
    ).days + 1
    remaining_days = (
        current_subscription.end_date
        - effective
    ).days + 1
    if total_days <= 0:
        raise ValidationError(
            {
                "current_subscription": (
                    "Subscription period is invalid."
                )
            }
        )
    remaining_days = max(
        min(remaining_days, total_days),
        0,
    )
    ratio = (
        Decimal(remaining_days)
        / Decimal(total_days)
    )
    current_price = money(
        current_subscription.price
    )
    new_price = money(
        new_plan.get_price_for_cycle(cycle)
    )
    current_credit = money(
        current_price * ratio
    )
    new_charge = money(
        new_price * ratio
    )
    adjustment = money(
        new_charge - current_credit
    )
    charge = money(
        max(adjustment, ZERO_MONEY)
    )
    credit = money(
        max(-adjustment, ZERO_MONEY)
    )
    return SubscriptionProrationResult(
        effective_date=effective,
        period_start=current_subscription.start_date,
        period_end=current_subscription.end_date,
        total_days=total_days,
        remaining_days=remaining_days,
        remaining_ratio=ratio.quantize(
            Decimal("0.00000001"),
            rounding=ROUND_HALF_UP,
        ),
        current_plan_price=current_price,
        new_plan_price=new_price,
        current_unused_credit=current_credit,
        new_remaining_charge=new_charge,
        adjustment_amount=adjustment,
        charge_amount=charge,
        credit_amount=credit,
    )
def resolve_promotion(
    *,
    code: str,
    amount: Any,
    plan: SubscriptionPlan,
    billing_cycle: str,
    company=None,
    now=None,
) -> CommercialDiscountResult:
    from subscriptions.models import (
        SubscriptionPromotion,
        SubscriptionPromotionRedemption,
    )
    normalized_code = (
        str(code or "")
        .strip()
        .upper()
    )
    if not normalized_code:
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion code is required."
                )
            }
        )
    original_amount = money(amount)
    effective_now = now or timezone.now()
    try:
        promotion = (
            SubscriptionPromotion.objects
            .prefetch_related("plans")
            .get(code=normalized_code)
        )
    except SubscriptionPromotion.DoesNotExist as exc:
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion code is invalid."
                )
            }
        ) from exc
    if not promotion.is_active:
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion code is inactive."
                )
            }
        )
    if (
        promotion.starts_at
        and effective_now < promotion.starts_at
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion has not started yet."
                )
            }
        )
    if (
        promotion.ends_at
        and effective_now > promotion.ends_at
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion has expired."
                )
            }
        )
    if (
        promotion.billing_cycle
        and promotion.billing_cycle != billing_cycle
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion is not valid for "
                    "this billing cycle."
                )
            }
        )
    if (
        promotion.plans.exists()
        and not promotion.plans.filter(
            pk=plan.pk
        ).exists()
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion is not valid for this plan."
                )
            }
        )
    if (
        money(promotion.minimum_amount) > ZERO_MONEY
        and original_amount
        < money(promotion.minimum_amount)
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Subscription amount does not meet "
                    "the promotion minimum."
                )
            }
        )
    if (
        promotion.max_redemptions is not None
        and promotion.redemption_count
        >= promotion.max_redemptions
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion usage limit reached."
                )
            }
        )
    if (
        company is not None
        and promotion.max_redemptions_per_company
    ):
        company_uses = (
            SubscriptionPromotionRedemption.objects
            .filter(
                promotion=promotion,
                company=company,
            )
            .count()
        )
        if (
            company_uses
            >= promotion.max_redemptions_per_company
        ):
            raise ValidationError(
                {
                    "promotion_code": (
                        "Promotion usage limit reached "
                        "for this company."
                    )
                }
            )
    if (
        promotion.discount_type
        == SubscriptionPromotion
        .DiscountType
        .PERCENTAGE
    ):
        discount = money(
            original_amount
            * money(promotion.discount_value)
            / Decimal("100")
        )
    else:
        discount = money(
            promotion.discount_value
        )
    maximum_discount = money(
        promotion.maximum_discount_amount
    )
    if maximum_discount > ZERO_MONEY:
        discount = min(
            discount,
            maximum_discount,
        )
    discount = min(
        discount,
        original_amount,
    )
    return CommercialDiscountResult(
        code=promotion.code,
        discount_type=promotion.discount_type,
        discount_value=money(
            promotion.discount_value
        ),
        discount_amount=money(discount),
        original_amount=original_amount,
        amount_after_discount=money(
            original_amount - discount
        ),
        promotion_id=promotion.id,
    )
def calculate_commercial_pricing(
    *,
    plan: SubscriptionPlan,
    billing_cycle: str,
    company=None,
    current_subscription: CompanySubscription | None = None,
    action: str = CompanySubscription.SubscriptionAction.NEW,
    promotion_code: str = "",
    manual_discount_amount: Any = ZERO_MONEY,
    vat_rate: Any = DEFAULT_VAT_RATE,
    effective_date: date | None = None,
) -> CommercialPricingResult:
    if billing_cycle not in CompanySubscription.BillingCycle.values:
        raise ValidationError(
            {"billing_cycle": "Invalid billing cycle."}
        )
    base_price = money(
        plan.get_price_for_cycle(
            billing_cycle
        )
    )
    proration = None
    proration_charge = ZERO_MONEY
    proration_credit = ZERO_MONEY
    if (
        current_subscription is not None
        and action in {
            CompanySubscription
            .SubscriptionAction
            .UPGRADE,
            CompanySubscription
            .SubscriptionAction
            .DOWNGRADE,
        }
    ):
        proration = calculate_subscription_proration(
            current_subscription=current_subscription,
            new_plan=plan,
            billing_cycle=billing_cycle,
            effective_date=effective_date,
        )
        proration_charge = (
            proration.charge_amount
        )
        proration_credit = (
            proration.credit_amount
        )
        subtotal = proration_charge
    else:
        subtotal = base_price
    promotion = None
    promotion_discount = ZERO_MONEY
    if str(promotion_code or "").strip():
        promotion = resolve_promotion(
            code=promotion_code,
            amount=subtotal,
            plan=plan,
            billing_cycle=billing_cycle,
            company=company,
        )
        promotion_discount = (
            promotion.discount_amount
        )
    manual_discount = money(
        manual_discount_amount
    )
    if manual_discount < ZERO_MONEY:
        raise ValidationError(
            {
                "manual_discount_amount": (
                    "Manual discount cannot be negative."
                )
            }
        )
    remaining = money(
        max(
            subtotal - promotion_discount,
            ZERO_MONEY,
        )
    )
    manual_discount = min(
        manual_discount,
        remaining,
    )
    total_discount = money(
        promotion_discount
        + manual_discount
    )
    taxable = money(
        max(
            subtotal - total_discount,
            ZERO_MONEY,
        )
    )
    try:
        rate = Decimal(str(vat_rate))
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ValidationError(
            {"vat_rate": "Invalid VAT rate."}
        ) from exc
    if (
        not rate.is_finite()
        or rate < 0
    ):
        raise ValidationError(
            {
                "vat_rate": (
                    "VAT rate cannot be negative."
                )
            }
        )
    tax = money(
        taxable * rate
    )
    total = money(
        taxable + tax
    )
    return CommercialPricingResult(
        base_price=base_price,
        proration_charge=proration_charge,
        proration_credit=proration_credit,
        subtotal=money(subtotal),
        promotion_discount=promotion_discount,
        manual_discount=manual_discount,
        total_discount=total_discount,
        taxable_amount=taxable,
        tax_amount=tax,
        total_amount=total,
        promotion=promotion,
        proration=proration,
    )
@transaction.atomic
def redeem_promotion(
    *,
    promotion_id: int,
    company,
    subscription: CompanySubscription,
    discount_amount: Any,
    actor=None,
):
    from subscriptions.models import (
        SubscriptionPromotion,
        SubscriptionPromotionRedemption,
    )
    if not company:
        raise ValidationError(
            {"company": "Company is required."}
        )
    if (
        not subscription
        or not subscription.pk
    ):
        raise ValidationError(
            {
                "subscription": (
                    "Saved subscription is required."
                )
            }
        )
    if subscription.company_id != company.id:
        raise ValidationError(
            {
                "subscription": (
                    "Subscription does not belong "
                    "to company."
                )
            }
        )
    promotion = (
        SubscriptionPromotion.objects
        .select_for_update()
        .get(pk=promotion_id)
    )
    existing = (
        SubscriptionPromotionRedemption.objects
        .filter(
            promotion=promotion,
            subscription=subscription,
        )
        .first()
    )
    if existing:
        return existing, False
    if (
        promotion.max_redemptions is not None
        and promotion.redemption_count
        >= promotion.max_redemptions
    ):
        raise ValidationError(
            {
                "promotion_code": (
                    "Promotion usage limit reached."
                )
            }
        )
    if promotion.max_redemptions_per_company:
        company_uses = (
            SubscriptionPromotionRedemption.objects
            .filter(
                promotion=promotion,
                company=company,
            )
            .count()
        )
        if (
            company_uses
            >= promotion.max_redemptions_per_company
        ):
            raise ValidationError(
                {
                    "promotion_code": (
                        "Promotion usage limit reached "
                        "for this company."
                    )
                }
            )
    redemption = (
        SubscriptionPromotionRedemption.objects.create(
            promotion=promotion,
            company=company,
            subscription=subscription,
            discount_amount=money(
                discount_amount
            ),
            redeemed_by=actor,
        )
    )
    SubscriptionPromotion.objects.filter(
        pk=promotion.pk
    ).update(
        redemption_count=F(
            "redemption_count"
        ) + 1
    )
    return redemption, True

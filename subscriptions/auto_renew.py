from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any
from django.db import transaction
from django.utils import timezone
from billing.models import (
    PlatformSubscriptionPayment,
)
from billing.payment_services import (
    create_or_get_subscription_payment,
)
from subscriptions.models import (
    CompanySubscription,
)
from subscriptions.services import (
    create_renewal_pending_subscription,
)
AUTO_RENEW_PREPARE_DAYS = 7
SUPPORTED_GATEWAYS = frozenset(
    {
        "MOYASAR",
        "TAMARA",
        "TABBY",
    }
)
@dataclass(frozen=True)
class AutoRenewPreparation:
    source_subscription_id: int
    renewal_subscription_id: int
    payment_id: int | None
    gateway: str
    created_subscription: bool
    created_payment: bool
    def as_dict(self) -> dict[str, Any]:
        return {
            "source_subscription_id": (
                self.source_subscription_id
            ),
            "renewal_subscription_id": (
                self.renewal_subscription_id
            ),
            "payment_id": self.payment_id,
            "gateway": self.gateway,
            "created_subscription": (
                self.created_subscription
            ),
            "created_payment": (
                self.created_payment
            ),
        }
@dataclass
class AutoRenewPreparationResult:
    evaluated: int = 0
    prepared: int = 0
    existing: int = 0
    skipped: int = 0
    items: list[AutoRenewPreparation] = field(
        default_factory=list
    )
    def as_dict(self) -> dict[str, Any]:
        return {
            "evaluated": self.evaluated,
            "prepared": self.prepared,
            "existing": self.existing,
            "skipped": self.skipped,
            "items": [
                item.as_dict()
                for item in self.items
            ],
        }
def _latest_paid_gateway(
    subscription: CompanySubscription,
) -> tuple[str, str]:
    payment = (
        PlatformSubscriptionPayment.objects
        .filter(
            subscription=subscription,
            status=(
                PlatformSubscriptionPayment
                .Status
                .PAID
            ),
        )
        .order_by(
            "-paid_at",
            "-id",
        )
        .first()
    )
    if payment is None:
        return "", ""
    gateway = str(
        payment.gateway or ""
    ).strip().upper()
    payment_method = str(
        payment.payment_method or gateway
    ).strip().upper()
    if gateway not in SUPPORTED_GATEWAYS:
        return "", ""
    return gateway, payment_method
def _existing_renewal(
    subscription: CompanySubscription,
) -> CompanySubscription | None:
    return (
        CompanySubscription.objects
        .filter(
            previous_subscription=subscription,
            action=(
                CompanySubscription
                .SubscriptionAction
                .RENEWAL
            ),
            status=(
                CompanySubscription
                .Status
                .PENDING_PAYMENT
            ),
        )
        .order_by(
            "-created_at",
            "-id",
        )
        .first()
    )
@transaction.atomic
def prepare_auto_renewals(
    *,
    today: date | None = None,
    days_ahead: int = AUTO_RENEW_PREPARE_DAYS,
    company_id: int | None = None,
) -> AutoRenewPreparationResult:
    """
    Prepare renewals; never charge a saved card automatically.
    For ACTIVE + auto_renew subscriptions approaching end date:
    - create one idempotent PENDING_PAYMENT renewal;
    - create one PENDING payment attempt when a known previous
      provider gateway exists;
    - never call gateway checkout/charge here.
    This is intentional until a provider mandate/token contract
    is explicitly implemented.
    """
    effective_today = (
        today or timezone.localdate()
    )
    upper = (
        effective_today
        + timedelta(days=max(int(days_ahead), 0))
    )
    queryset = (
        CompanySubscription.objects
        .select_for_update()
        .select_related(
            "company",
            "plan",
        )
        .filter(
            status=(
                CompanySubscription
                .Status
                .ACTIVE
            ),
            auto_renew=True,
            end_date__gte=effective_today,
            end_date__lte=upper,
        )
        .order_by("id")
    )
    if company_id is not None:
        queryset = queryset.filter(
            company_id=company_id
        )
    result = AutoRenewPreparationResult()
    for current in queryset:
        result.evaluated += 1
        renewal = _existing_renewal(
            current
        )
        created_subscription = False
        if renewal is None:
            renewal = (
                create_renewal_pending_subscription(
                    current_subscription=current,
                    plan=current.plan,
                    billing_cycle=(
                        current.billing_cycle
                    ),
                    auto_renew=True,
                    created_by=(
                        current.created_by
                    ),
                    notes=(
                        "Automatic renewal preparation. "
                        "Payment remains customer-authorized."
                    ),
                )
            )
            created_subscription = True
        gateway, payment_method = (
            _latest_paid_gateway(
                current
            )
        )
        if not gateway:
            result.skipped += 1
            result.items.append(
                AutoRenewPreparation(
                    source_subscription_id=(
                        current.id
                    ),
                    renewal_subscription_id=(
                        renewal.id
                    ),
                    payment_id=None,
                    gateway="",
                    created_subscription=(
                        created_subscription
                    ),
                    created_payment=False,
                )
            )
            continue
        payment, created_payment = (
            create_or_get_subscription_payment(
                subscription=renewal,
                idempotency_key=(
                    "auto-renew:"
                    f"{current.id}:"
                    f"{renewal.id}"
                ),
                gateway=gateway,
                payment_method=payment_method,
                metadata={
                    "source": (
                        "phase28-auto-renew"
                    ),
                    "automatic_charge": False,
                    "source_subscription_id": (
                        current.id
                    ),
                },
                created_by=(
                    current.created_by
                ),
            )
        )
        if (
            created_subscription
            or created_payment
        ):
            result.prepared += 1
        else:
            result.existing += 1
        result.items.append(
            AutoRenewPreparation(
                source_subscription_id=(
                    current.id
                ),
                renewal_subscription_id=(
                    renewal.id
                ),
                payment_id=payment.id,
                gateway=gateway,
                created_subscription=(
                    created_subscription
                ),
                created_payment=(
                    created_payment
                ),
            )
        )
    return result

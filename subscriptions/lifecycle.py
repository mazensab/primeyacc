from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from subscriptions.models import (
    SUBSCRIPTION_ACTIVE_GRACE_DAYS,
    CompanySubscription,
)


@dataclass(frozen=True)
class SubscriptionLifecycleAction:
    subscription_id: int
    company_id: int
    from_status: str
    to_status: str
    reason: str
    end_date: date

    def as_dict(self) -> dict[str, Any]:
        return {
            "subscription_id": self.subscription_id,
            "company_id": self.company_id,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "reason": self.reason,
            "end_date": self.end_date.isoformat(),
        }


@dataclass
class SubscriptionLifecycleResult:
    evaluated: int = 0
    changed: int = 0
    would_change: int = 0
    unchanged: int = 0
    actions: list[SubscriptionLifecycleAction] = field(
        default_factory=list
    )

    def as_dict(self) -> dict[str, Any]:
        return {
            "evaluated": self.evaluated,
            "changed": self.changed,
            "would_change": self.would_change,
            "unchanged": self.unchanged,
            "actions": [
                action.as_dict()
                for action in self.actions
            ],
        }


def _expiry_reason(
    subscription: CompanySubscription,
) -> str:
    if subscription.status == CompanySubscription.Status.TRIAL:
        return "TRIAL_ENDED"

    return "ACTIVE_GRACE_ENDED"


def _should_expire(
    subscription: CompanySubscription,
    *,
    today: date,
) -> bool:
    if subscription.status == CompanySubscription.Status.TRIAL:
        return today > subscription.end_date

    if subscription.status == CompanySubscription.Status.ACTIVE:
        grace_end = subscription.end_date + timedelta(
            days=SUBSCRIPTION_ACTIVE_GRACE_DAYS
        )
        return today > grace_end

    return False


def _candidate_queryset(
    *,
    today: date,
    company_id: int | None = None,
):
    queryset = (
        CompanySubscription.objects
        .filter(
            status__in=[
                CompanySubscription.Status.TRIAL,
                CompanySubscription.Status.ACTIVE,
            ],
        )
        .filter(end_date__lt=today)
        .order_by("company_id", "id")
    )

    if company_id is not None:
        queryset = queryset.filter(company_id=company_id)

    return queryset


def preview_subscription_lifecycle(
    *,
    today: date | None = None,
    company_id: int | None = None,
) -> SubscriptionLifecycleResult:
    effective_today = today or timezone.localdate()
    result = SubscriptionLifecycleResult()

    for subscription in _candidate_queryset(
        today=effective_today,
        company_id=company_id,
    ):
        result.evaluated += 1

        if not _should_expire(
            subscription,
            today=effective_today,
        ):
            result.unchanged += 1
            continue

        result.would_change += 1
        result.actions.append(
            SubscriptionLifecycleAction(
                subscription_id=subscription.id,
                company_id=subscription.company_id,
                from_status=subscription.status,
                to_status=CompanySubscription.Status.EXPIRED,
                reason=_expiry_reason(subscription),
                end_date=subscription.end_date,
            )
        )

    return result


@transaction.atomic
def process_subscription_lifecycle(
    *,
    today: date | None = None,
    company_id: int | None = None,
    dry_run: bool = False,
) -> SubscriptionLifecycleResult:
    effective_today = today or timezone.localdate()

    if dry_run:
        return preview_subscription_lifecycle(
            today=effective_today,
            company_id=company_id,
        )

    result = SubscriptionLifecycleResult()

    queryset = (
        _candidate_queryset(
            today=effective_today,
            company_id=company_id,
        )
        .select_for_update()
    )

    for subscription in queryset:
        result.evaluated += 1

        if not _should_expire(
            subscription,
            today=effective_today,
        ):
            result.unchanged += 1
            continue

        from_status = subscription.status
        reason = _expiry_reason(subscription)

        subscription.status = CompanySubscription.Status.EXPIRED
        subscription.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        result.changed += 1
        result.actions.append(
            SubscriptionLifecycleAction(
                subscription_id=subscription.id,
                company_id=subscription.company_id,
                from_status=from_status,
                to_status=CompanySubscription.Status.EXPIRED,
                reason=reason,
                end_date=subscription.end_date,
            )
        )

    return result

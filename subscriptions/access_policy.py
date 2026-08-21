from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from django.utils import timezone

from subscriptions.models import CompanySubscription
from subscriptions.services import (
    get_active_grace_subscription,
    get_current_subscription,
    get_latest_subscription,
)


class SubscriptionWorkspaceAccess:
    FULL = "FULL"
    BILLING_ONLY = "BILLING_ONLY"
    DENIED = "DENIED"


class SubscriptionAccessReason:
    SUBSCRIPTION_ACTIVE = "SUBSCRIPTION_ACTIVE"
    SUBSCRIPTION_GRACE = "SUBSCRIPTION_GRACE"
    TRIAL_ACTIVE = "TRIAL_ACTIVE"
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED"
    SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED"
    SUBSCRIPTION_SUSPENDED = "SUBSCRIPTION_SUSPENDED"
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED"
    NO_SUBSCRIPTION = "NO_SUBSCRIPTION"
    COMPANY_REQUIRED = "COMPANY_REQUIRED"


@dataclass(frozen=True)
class SubscriptionAccessPolicy:
    access: str
    reason: str
    status: str | None
    subscription_id: int | None
    plan_id: int | None
    plan_name: str
    can_use_workspace: bool
    can_manage_subscription: bool
    can_pay: bool
    can_renew: bool
    can_change_plan: bool
    days_remaining: int
    expires_at: date | None
    is_in_grace: bool
    grace_days_remaining: int
    grace_expires_at: date | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "access": self.access,
            "reason": self.reason,
            "status": self.status,
            "subscription_id": self.subscription_id,
            "plan_id": self.plan_id,
            "plan_name": self.plan_name,
            "can_use_workspace": self.can_use_workspace,
            "can_manage_subscription": self.can_manage_subscription,
            "can_pay": self.can_pay,
            "can_renew": self.can_renew,
            "can_change_plan": self.can_change_plan,
            "days_remaining": self.days_remaining,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_in_grace": self.is_in_grace,
            "grace_days_remaining": self.grace_days_remaining,
            "grace_expires_at": (
                self.grace_expires_at.isoformat()
                if self.grace_expires_at
                else None
            ),
        }

def _build_policy(
    access,
    reason,
    subscription=None,
    *,
    workspace=False,
    manage=True,
    pay=True,
    renew=False,
    change_plan=True,
    is_in_grace=False,
    grace_expires_at=None,
):
    return SubscriptionAccessPolicy(
        access=access,
        reason=reason,
        status=getattr(subscription, "status", None),
        subscription_id=getattr(subscription, "id", None),
        plan_id=getattr(subscription, "plan_id", None),
        plan_name=(
            subscription.plan.name
            if subscription and getattr(subscription, "plan_id", None)
            else ""
        ),
        can_use_workspace=workspace,
        can_manage_subscription=manage,
        can_pay=pay,
        can_renew=renew,
        can_change_plan=change_plan,
        days_remaining=(
            subscription.days_remaining
            if subscription and workspace and not is_in_grace
            else 0
        ),
        expires_at=getattr(subscription, "end_date", None),
        is_in_grace=is_in_grace,
        grace_days_remaining=(
            subscription.grace_days_remaining
            if subscription and is_in_grace
            else 0
        ),
        grace_expires_at=grace_expires_at,
    )

def evaluate_subscription_access(
    company,
) -> SubscriptionAccessPolicy:
    if not company:
        return _build_policy(
            SubscriptionWorkspaceAccess.DENIED,
            SubscriptionAccessReason.COMPANY_REQUIRED,
            manage=False,
            pay=False,
            change_plan=False,
        )
    current = get_current_subscription(company)
    today = timezone.localdate()
    if current:
        reason = (
            SubscriptionAccessReason.SUBSCRIPTION_ACTIVE
            if current.status == CompanySubscription.Status.ACTIVE
            else SubscriptionAccessReason.TRIAL_ACTIVE
        )
        return _build_policy(
            SubscriptionWorkspaceAccess.FULL,
            reason,
            current,
            workspace=True,
            renew=True,
        )
    grace_subscription = get_active_grace_subscription(company)
    if grace_subscription:
        grace_expires_at = (
            grace_subscription.active_grace_expires_at
        )
        return _build_policy(
            SubscriptionWorkspaceAccess.FULL,
            SubscriptionAccessReason.SUBSCRIPTION_GRACE,
            grace_subscription,
            workspace=True,
            renew=True,
            is_in_grace=True,
            grace_expires_at=grace_expires_at,
        )
    latest = get_latest_subscription(company)
    if not latest:
        return _build_policy(
            SubscriptionWorkspaceAccess.BILLING_ONLY,
            SubscriptionAccessReason.NO_SUBSCRIPTION,
        )
    if latest.status in {
        CompanySubscription.Status.ACTIVE,
        CompanySubscription.Status.TRIAL,
    }:
        if latest.end_date < today:
            return _build_policy(
                SubscriptionWorkspaceAccess.BILLING_ONLY,
                SubscriptionAccessReason.SUBSCRIPTION_EXPIRED,
                latest,
                renew=True,
            )
        return _build_policy(
            SubscriptionWorkspaceAccess.BILLING_ONLY,
            SubscriptionAccessReason.PAYMENT_REQUIRED,
            latest,
            renew=False,
        )
    reasons = {
        CompanySubscription.Status.PENDING_PAYMENT: (
            SubscriptionAccessReason.PAYMENT_REQUIRED
        ),
        CompanySubscription.Status.EXPIRED: (
            SubscriptionAccessReason.SUBSCRIPTION_EXPIRED
        ),
        CompanySubscription.Status.SUSPENDED: (
            SubscriptionAccessReason.SUBSCRIPTION_SUSPENDED
        ),
        CompanySubscription.Status.CANCELLED: (
            SubscriptionAccessReason.SUBSCRIPTION_CANCELLED
        ),
    }

    return _build_policy(
        SubscriptionWorkspaceAccess.BILLING_ONLY,
        reasons.get(
            latest.status,
            SubscriptionAccessReason.PAYMENT_REQUIRED,
        ),
        latest,
        renew=latest.status in {
            CompanySubscription.Status.EXPIRED,
            CompanySubscription.Status.SUSPENDED,
        },
    )

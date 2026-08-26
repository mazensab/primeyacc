from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from companies.models import Company
from subscriptions.models import CompanySubscription, SubscriptionPlan


def ensure_test_workspace_access() -> None:
    """
    Give legacy operational /api/company tests a valid current
    subscription without changing production access policy.
    """
    today = timezone.localdate()

    plan, _ = SubscriptionPlan.objects.get_or_create(
        slug="phase41-operational-test-plan",
        defaults={
            "name": "Phase 41 Operational Test Plan",
            "code": SubscriptionPlan.PlanCode.CUSTOM,
            "description": "Phase 41 test-only workspace access.",
            "monthly_price": Decimal("0.00"),
            "yearly_price": Decimal("0.00"),
            "max_users": 10000,
            "max_branches": 10000,
            "max_warehouses": 10000,
            "max_pos": 10000,
            "features": ["all"],
            "is_active": True,
            "is_public": False,
            "sort_order": 9999,
        },
    )

    for company in Company.objects.all().order_by("id"):
        current = (
            CompanySubscription.objects
            .filter(
                company=company,
                status__in=[
                    CompanySubscription.Status.ACTIVE,
                    CompanySubscription.Status.TRIAL,
                ],
                start_date__lte=today,
                end_date__gte=today,
            )
            .order_by("-id")
            .first()
        )

        if current is not None:
            continue

        CompanySubscription.objects.create(
            company=company,
            plan=plan,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.MANUAL,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=30),
            price=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("0.00"),
            auto_renew=False,
            notes="Phase 41 test-only workspace subscription.",
        )

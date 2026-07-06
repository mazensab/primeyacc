# ============================================================
# 📂 subscriptions/tests.py
# 🧠 Mhamcloud | Platform Subscription Services Tests
# ------------------------------------------------------------
# ✅ Tests subscription pricing
# ✅ Tests pending subscription creation
# ✅ Tests renewal creates a new record
# ✅ Tests activation after payment
# ✅ Tests duplicate active/trial protection
# ✅ Uses dynamic company factory to avoid breaking existing Company fields
# ============================================================

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.test import TestCase
from django.utils import timezone

from accounting.models import Account
from companies.models import Company
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.services import (
    activate_pending_subscription,
    calculate_subscription_period,
    calculate_subscription_pricing,
    create_pending_subscription,
    create_renewal_pending_subscription,
    ensure_no_duplicate_current_subscription,
)


User = get_user_model()


class SubscriptionServiceTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="subscription-admin",
            email="subscription-admin@Mhamcloud.test",
            password="StrongPass123!",
        )

        self.company = self.create_company(name="Mhamcloud Test Company")

        self.basic_plan = SubscriptionPlan.objects.create(
            name="Basic Plan",
            code=SubscriptionPlan.PlanCode.BASIC,
            slug="basic-plan",
            description="Basic test subscription plan.",
            monthly_price=Decimal("100.00"),
            yearly_price=Decimal("1000.00"),
            max_users=10,
            max_branches=2,
            max_warehouses=1,
            max_pos=1,
            features=["accounting", "sales"],
            is_active=True,
            is_public=True,
            sort_order=1,
        )

        self.pro_plan = SubscriptionPlan.objects.create(
            name="Professional Plan",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="professional-plan",
            description="Professional test subscription plan.",
            monthly_price=Decimal("250.00"),
            yearly_price=Decimal("2500.00"),
            max_users=50,
            max_branches=5,
            max_warehouses=3,
            max_pos=3,
            features=["accounting", "sales", "inventory"],
            is_active=True,
            is_public=True,
            sort_order=2,
        )

    def create_company(self, **overrides) -> Company:
        """
        Create a company safely without assuming all fields in companies.Company.

        السبب:
        مراحل Mhamcloud السابقة قد تحتوي حقول إلزامية مختلفة داخل Company.
        هذا المصنع يملأ الحقول الأساسية المطلوبة حسب نوع الحقل.
        """

        data = {}

        for field in Company._meta.fields:
            if field.auto_created or not getattr(field, "editable", True):
                continue

            if field.name == "id":
                continue

            if field.name in overrides:
                data[field.name] = overrides[field.name]
                continue

            if field.has_default() or field.null or field.blank:
                continue

            if isinstance(field, models.ForeignKey):
                if field.remote_field and field.remote_field.model == User:
                    data[field.name] = self.user
                continue

            field_name = field.name.lower()

            if isinstance(field, (models.CharField, models.SlugField, models.TextField)):
                if "email" in field_name:
                    data[field.name] = f"{field.name}@Mhamcloud.test"
                elif "phone" in field_name or "mobile" in field_name:
                    data[field.name] = "0500000000"
                elif "country" in field_name:
                    data[field.name] = "SA"
                elif "currency" in field_name:
                    data[field.name] = "SAR"
                elif "slug" in field_name or "code" in field_name:
                    data[field.name] = "Mhamcloud-test-company"
                elif "name" in field_name or "title" in field_name:
                    data[field.name] = overrides.get("name", "Mhamcloud Test Company")
                else:
                    data[field.name] = f"test-{field.name}"

            elif isinstance(field, models.BooleanField):
                data[field.name] = True

            elif isinstance(field, models.IntegerField):
                data[field.name] = 1

            elif isinstance(field, models.DecimalField):
                data[field.name] = Decimal("0.00")

            elif isinstance(field, models.DateField):
                data[field.name] = timezone.localdate()

            elif isinstance(field, models.DateTimeField):
                data[field.name] = timezone.now()

        data.update(overrides)

        return Company.objects.create(**data)

    def test_calculate_monthly_subscription_pricing_with_vat(self):
        pricing = calculate_subscription_pricing(
            plan=self.basic_plan,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            discount_amount=Decimal("10.00"),
        )

        self.assertEqual(pricing.price, Decimal("100.00"))
        self.assertEqual(pricing.discount_amount, Decimal("10.00"))
        self.assertEqual(pricing.amount_before_tax, Decimal("90.00"))
        self.assertEqual(pricing.tax_amount, Decimal("13.50"))
        self.assertEqual(pricing.total_amount, Decimal("103.50"))

    def test_calculate_yearly_subscription_pricing_with_vat(self):
        pricing = calculate_subscription_pricing(
            plan=self.basic_plan,
            billing_cycle=CompanySubscription.BillingCycle.YEARLY,
            discount_amount=Decimal("100.00"),
        )

        self.assertEqual(pricing.price, Decimal("1000.00"))
        self.assertEqual(pricing.discount_amount, Decimal("100.00"))
        self.assertEqual(pricing.amount_before_tax, Decimal("900.00"))
        self.assertEqual(pricing.tax_amount, Decimal("135.00"))
        self.assertEqual(pricing.total_amount, Decimal("1035.00"))

    def test_pricing_rejects_discount_greater_than_price(self):
        with self.assertRaises(ValidationError):
            calculate_subscription_pricing(
                plan=self.basic_plan,
                billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
                discount_amount=Decimal("101.00"),
            )

    def test_calculate_subscription_period_monthly(self):
        period = calculate_subscription_period(
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=date(2026, 1, 31),
        )

        self.assertEqual(period.start_date, date(2026, 1, 31))
        self.assertEqual(period.end_date, date(2026, 2, 28))

    def test_calculate_subscription_period_yearly(self):
        period = calculate_subscription_period(
            billing_cycle=CompanySubscription.BillingCycle.YEARLY,
            start_date=date(2026, 2, 28),
        )

        self.assertEqual(period.start_date, date(2026, 2, 28))
        self.assertEqual(period.end_date, date(2027, 2, 28))

    def test_create_pending_subscription(self):
        subscription = create_pending_subscription(
            company=self.company,
            plan=self.basic_plan,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            action=CompanySubscription.SubscriptionAction.NEW,
            start_date=date(2026, 6, 1),
            discount_amount=Decimal("10.00"),
            billing_reference="BILL-TEST-001",
            created_by=self.user,
            notes="Initial pending subscription.",
        )

        self.assertEqual(subscription.company, self.company)
        self.assertEqual(subscription.plan, self.basic_plan)
        self.assertEqual(subscription.status, CompanySubscription.Status.PENDING_PAYMENT)
        self.assertEqual(subscription.action, CompanySubscription.SubscriptionAction.NEW)
        self.assertEqual(subscription.billing_cycle, CompanySubscription.BillingCycle.MONTHLY)
        self.assertEqual(subscription.start_date, date(2026, 6, 1))
        self.assertEqual(subscription.end_date, date(2026, 7, 1))
        self.assertEqual(subscription.price, Decimal("100.00"))
        self.assertEqual(subscription.discount_amount, Decimal("10.00"))
        self.assertEqual(subscription.tax_amount, Decimal("13.50"))
        self.assertEqual(subscription.total_amount, Decimal("103.50"))
        self.assertEqual(subscription.billing_reference, "BILL-TEST-001")
        self.assertEqual(subscription.created_by, self.user)

    def test_pending_subscription_can_exist_next_to_active_subscription(self):
        active_subscription = CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic_plan,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            created_by=self.user,
        )

        pending_subscription = create_pending_subscription(
            company=self.company,
            plan=self.pro_plan,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            action=CompanySubscription.SubscriptionAction.UPGRADE,
            previous_subscription=active_subscription,
            start_date=date(2026, 6, 15),
            billing_reference="BILL-UPGRADE-001",
            created_by=self.user,
        )

        self.assertEqual(pending_subscription.status, CompanySubscription.Status.PENDING_PAYMENT)
        self.assertEqual(pending_subscription.previous_subscription, active_subscription)

        self.assertEqual(
            CompanySubscription.objects.filter(company=self.company).count(),
            2,
        )

    def test_ensure_no_duplicate_current_subscription_raises_when_active_exists(self):
        CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic_plan,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            ensure_no_duplicate_current_subscription(company=self.company)

    def test_create_renewal_pending_subscription_creates_new_record(self):
        current_subscription = CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic_plan,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            auto_renew=True,
            created_by=self.user,
        )

        renewal = create_renewal_pending_subscription(
            current_subscription=current_subscription,
            billing_reference="BILL-RENEWAL-001",
            created_by=self.user,
            notes="Renewal pending payment.",
        )

        self.assertNotEqual(renewal.id, current_subscription.id)
        self.assertEqual(renewal.company, self.company)
        self.assertEqual(renewal.plan, self.basic_plan)
        self.assertEqual(renewal.previous_subscription, current_subscription)
        self.assertEqual(renewal.status, CompanySubscription.Status.PENDING_PAYMENT)
        self.assertEqual(renewal.action, CompanySubscription.SubscriptionAction.RENEWAL)
        self.assertEqual(renewal.auto_renew, True)
        self.assertEqual(renewal.billing_reference, "BILL-RENEWAL-001")

        current_subscription.refresh_from_db()
        self.assertEqual(current_subscription.status, CompanySubscription.Status.ACTIVE)

    def test_activate_pending_subscription_cancels_previous_and_activates_new(self):
        current_subscription = CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic_plan,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            created_by=self.user,
        )

        pending_subscription = create_pending_subscription(
            company=self.company,
            plan=self.pro_plan,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            action=CompanySubscription.SubscriptionAction.UPGRADE,
            previous_subscription=current_subscription,
            start_date=date(2026, 6, 15),
            billing_reference="BILL-ACTIVATE-001",
            created_by=self.user,
        )

        activated = activate_pending_subscription(
            subscription=pending_subscription,
            billing_reference="PAID-BILL-ACTIVATE-001",
        )

        current_subscription.refresh_from_db()
        activated.refresh_from_db()

        self.assertEqual(current_subscription.status, CompanySubscription.Status.CANCELLED)
        self.assertIsNotNone(current_subscription.cancelled_at)

        self.assertEqual(activated.status, CompanySubscription.Status.ACTIVE)
        self.assertEqual(activated.billing_reference, "PAID-BILL-ACTIVATE-001")
        self.assertIsNotNone(activated.paid_at)
        self.assertIsNotNone(activated.activated_at)

        active_count = CompanySubscription.objects.filter(
            company=self.company,
            status=CompanySubscription.Status.ACTIVE,
        ).count()

        self.assertEqual(active_count, 1)

        self.assertEqual(
            Account.objects.filter(company=self.company).count(),
            112,
        )

    def test_activate_non_pending_subscription_raises_validation_error(self):
        active_subscription = CompanySubscription.objects.create(
            company=self.company,
            plan=self.basic_plan,
            status=CompanySubscription.Status.ACTIVE,
            action=CompanySubscription.SubscriptionAction.NEW,
            billing_cycle=CompanySubscription.BillingCycle.MONTHLY,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            price=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            activate_pending_subscription(subscription=active_subscription)
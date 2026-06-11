# ============================================================
# 📂 subscriptions/models.py
# 🧠 PrimeyAcc | SaaS Subscription Core Models V1.1
# ------------------------------------------------------------
# ✅ Subscription plans for SaaS packages
# ✅ Company subscriptions linked to tenant companies
# ✅ Trial / active / expired / cancelled / suspended lifecycle
# ✅ Pending payment status for platform billing phase
# ✅ Monthly and yearly billing cycles
# ✅ Safe rule: only one current subscription per company
# ✅ Renewal / upgrade / downgrade source tracking
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من نواة SaaS
# - Phase 19 يضيف جاهزية فوترة الاشتراكات بدون وضع منطق الدفع هنا
# - كل تجديد ينشئ سجل اشتراك جديد ولا يتم تمديد السجل القديم مباشرة
# - لا يتم إنشاء اشتراك ACTIVE أو TRIAL مكرر لنفس الشركة
# - يمكن وجود اشتراك PENDING_PAYMENT بجانب اشتراك ACTIVE حالي أثناء انتظار الدفع
# - الشركة هي محور العزل التشغيلي داخل النظام
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


ZERO_MONEY = Decimal("0.00")


def money(value: Decimal | int | str | None) -> Decimal:
    """
    Normalize monetary values to two decimals.

    هذا المساعد لا ينفذ أي منطق فوترة، فقط يوحّد تنسيق القيم المالية.
    """

    if value is None:
        value = ZERO_MONEY

    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class SubscriptionPlan(models.Model):
    """
    SaaS subscription package managed by the system admin.

    أمثلة:
    - الباقة الأساسية
    - الباقة الاحترافية
    - باقة الشركات الكبيرة
    """

    class PlanCode(models.TextChoices):
        STARTER = "STARTER", "Starter"
        BASIC = "BASIC", "Basic"
        PROFESSIONAL = "PROFESSIONAL", "Professional"
        ENTERPRISE = "ENTERPRISE", "Enterprise"
        CUSTOM = "CUSTOM", "Custom"

    name = models.CharField(
        max_length=150,
        verbose_name="اسم الباقة",
    )
    code = models.CharField(
        max_length=50,
        choices=PlanCode.choices,
        default=PlanCode.BASIC,
        db_index=True,
        verbose_name="كود الباقة",
    )
    slug = models.SlugField(
        max_length=160,
        unique=True,
        verbose_name="معرّف الباقة",
        help_text="يستخدم داخليًا وفي روابط الواجهة مثل basic أو professional.",
    )
    description = models.TextField(
        blank=True,
        verbose_name="وصف الباقة",
    )

    monthly_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="السعر الشهري",
    )
    yearly_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="السعر السنوي",
    )

    max_users = models.PositiveIntegerField(
        default=1,
        verbose_name="الحد الأقصى للمستخدمين",
    )
    max_branches = models.PositiveIntegerField(
        default=1,
        verbose_name="الحد الأقصى للفروع",
    )
    max_warehouses = models.PositiveIntegerField(
        default=0,
        verbose_name="الحد الأقصى للمستودعات",
    )
    max_pos = models.PositiveIntegerField(
        default=0,
        verbose_name="الحد الأقصى لنقاط البيع",
    )

    features = models.JSONField(
        default=list,
        blank=True,
        verbose_name="مميزات الباقة",
        help_text="قائمة مميزات الباقة بصيغة JSON.",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="نشطة",
    )
    is_public = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="ظاهرة للاشتراك",
        help_text="إذا كانت غير ظاهرة، يمكن استخدامها داخليًا فقط من النظام.",
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="ترتيب الظهور",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="آخر تحديث",
    )

    class Meta:
        verbose_name = "باقة اشتراك"
        verbose_name_plural = "باقات الاشتراك"
        ordering = ["sort_order", "monthly_price", "id"]
        indexes = [
            models.Index(fields=["is_active", "is_public"]),
            models.Index(fields=["code"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def monthly_price_display(self) -> Decimal:
        return money(self.monthly_price)

    @property
    def yearly_price_display(self) -> Decimal:
        return money(self.yearly_price)

    def get_price_for_cycle(self, billing_cycle: str) -> Decimal:
        """
        Return plan price according to billing cycle.

        لا يحسب ضريبة أو خصم؛ فقط يرجع سعر الباقة الأساسي.
        """

        if billing_cycle == CompanySubscription.BillingCycle.YEARLY:
            return self.yearly_price_display

        return self.monthly_price_display

    def clean(self) -> None:
        super().clean()

        if self.monthly_price < 0:
            raise ValidationError({"monthly_price": "السعر الشهري لا يمكن أن يكون أقل من صفر."})

        if self.yearly_price < 0:
            raise ValidationError({"yearly_price": "السعر السنوي لا يمكن أن يكون أقل من صفر."})

        if not isinstance(self.features, list):
            raise ValidationError({"features": "مميزات الباقة يجب أن تكون قائمة JSON."})


class CompanySubscription(models.Model):
    """
    Company subscription record.

    القاعدة:
    كل تجديد ينشئ سجل اشتراك جديد.
    لا نعدل الاشتراك القديم ليصبح فترة جديدة.
    """

    class Status(models.TextChoices):
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pending Payment"
        TRIAL = "TRIAL", "Trial"
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        SUSPENDED = "SUSPENDED", "Suspended"

    class BillingCycle(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        YEARLY = "YEARLY", "Yearly"

    class SubscriptionAction(models.TextChoices):
        NEW = "NEW", "New"
        RENEWAL = "RENEWAL", "Renewal"
        UPGRADE = "UPGRADE", "Upgrade"
        DOWNGRADE = "DOWNGRADE", "Downgrade"
        MANUAL = "MANUAL", "Manual"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="subscriptions",
        verbose_name="الشركة",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="company_subscriptions",
        verbose_name="الباقة",
    )
    previous_subscription = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="next_subscriptions",
        verbose_name="الاشتراك السابق",
        help_text="يستخدم في التجديد أو تغيير الباقة بدون تعديل سجل الاشتراك القديم.",
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.TRIAL,
        db_index=True,
        verbose_name="حالة الاشتراك",
    )
    action = models.CharField(
        max_length=20,
        choices=SubscriptionAction.choices,
        default=SubscriptionAction.NEW,
        db_index=True,
        verbose_name="نوع العملية",
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
        db_index=True,
        verbose_name="دورة الفوترة",
    )

    start_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="تاريخ البداية",
    )
    end_date = models.DateField(
        db_index=True,
        verbose_name="تاريخ النهاية",
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="قيمة الاشتراك",
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="قيمة الخصم",
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="قيمة الضريبة",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="الإجمالي",
    )

    auto_renew = models.BooleanField(
        default=False,
        verbose_name="تجديد تلقائي",
    )

    billing_reference = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        verbose_name="مرجع الفوترة",
        help_text="مرجع داخلي يربط الاشتراك بعملية فوترة أو فاتورة بدون ربط مباشر بمنطق الدفع.",
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="تاريخ الدفع",
    )
    activated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="تاريخ التفعيل",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="ملاحظات",
    )

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_company_subscriptions",
        verbose_name="أنشئ بواسطة",
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="تاريخ الإلغاء",
    )
    suspended_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="تاريخ الإيقاف",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاريخ الإنشاء",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="آخر تحديث",
    )

    class Meta:
        verbose_name = "اشتراك شركة"
        verbose_name_plural = "اشتراكات الشركات"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "action"]),
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["billing_cycle"]),
            models.Index(fields=["billing_reference"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company"],
                condition=Q(status__in=["TRIAL", "ACTIVE"]),
                name="unique_current_subscription_per_company",
            )
        ]

    def __str__(self) -> str:
        return f"{self.company} - {self.plan} - {self.status}"

    @property
    def is_pending_payment(self) -> bool:
        return self.status == self.Status.PENDING_PAYMENT

    @property
    def is_current(self) -> bool:
        today = timezone.localdate()
        return self.status in {self.Status.TRIAL, self.Status.ACTIVE} and self.start_date <= today <= self.end_date

    @property
    def is_expired_by_date(self) -> bool:
        return timezone.localdate() > self.end_date

    @property
    def days_remaining(self) -> int:
        remaining = (self.end_date - timezone.localdate()).days
        return max(remaining, 0)

    @property
    def amount_before_tax(self) -> Decimal:
        return max(money(self.price) - money(self.discount_amount), ZERO_MONEY)

    @property
    def expected_total_amount(self) -> Decimal:
        return money(self.amount_before_tax + money(self.tax_amount))

    def clean(self) -> None:
        super().clean()

        if self.previous_subscription_id and self.company_id:
            if self.previous_subscription and self.previous_subscription.company_id != self.company_id:
                raise ValidationError(
                    {
                        "previous_subscription": (
                            "الاشتراك السابق يجب أن يكون تابعًا لنفس الشركة."
                        )
                    }
                )

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "تاريخ النهاية يجب أن يكون بعد تاريخ البداية."})

        money_fields = {
            "price": self.price,
            "discount_amount": self.discount_amount,
            "tax_amount": self.tax_amount,
            "total_amount": self.total_amount,
        }

        for field_name, value in money_fields.items():
            if value is not None and value < 0:
                raise ValidationError({field_name: "القيمة المالية لا يمكن أن تكون أقل من صفر."})

        if self.discount_amount and self.price and self.discount_amount > self.price:
            raise ValidationError({"discount_amount": "قيمة الخصم لا يمكن أن تتجاوز قيمة الاشتراك."})

        if self.total_amount and money(self.total_amount) != self.expected_total_amount:
            raise ValidationError(
                {
                    "total_amount": (
                        "الإجمالي يجب أن يساوي قيمة الاشتراك بعد الخصم مضافًا إليها الضريبة."
                    )
                }
            )

        if self.status in {self.Status.TRIAL, self.Status.ACTIVE} and self.company_id:
            duplicate_current = CompanySubscription.objects.filter(
                company_id=self.company_id,
                status__in=[self.Status.TRIAL, self.Status.ACTIVE],
            )

            if self.pk:
                duplicate_current = duplicate_current.exclude(pk=self.pk)

            if duplicate_current.exists():
                raise ValidationError(
                    {
                        "company": (
                            "لا يمكن وجود أكثر من اشتراك تجريبي أو نشط لنفس الشركة."
                        )
                    }
                )

    def mark_pending_payment(self, billing_reference: str = "", save: bool = True) -> None:
        """
        Mark subscription as waiting for payment.

        هذا لا ينشئ دفعًا ولا فاتورة؛ فقط يحفظ حالة انتظار الدفع.
        """

        self.status = self.Status.PENDING_PAYMENT

        if billing_reference:
            self.billing_reference = billing_reference

        if save:
            self.save(update_fields=["status", "billing_reference", "updated_at"])

    def mark_expired_if_needed(self, save: bool = True) -> bool:
        """
        يحول الاشتراك إلى منتهي إذا تجاوز تاريخ النهاية.

        يرجع True إذا تم تغيير الحالة.
        """

        if self.status in {self.Status.TRIAL, self.Status.ACTIVE} and self.is_expired_by_date:
            self.status = self.Status.EXPIRED

            if save:
                self.save(update_fields=["status", "updated_at"])

            return True

        return False

    def cancel(self, save: bool = True) -> None:
        self.status = self.Status.CANCELLED
        self.auto_renew = False
        self.cancelled_at = timezone.now()

        if save:
            self.save(update_fields=["status", "auto_renew", "cancelled_at", "updated_at"])

    def suspend(self, save: bool = True) -> None:
        self.status = self.Status.SUSPENDED
        self.suspended_at = timezone.now()

        if save:
            self.save(update_fields=["status", "suspended_at", "updated_at"])

    def activate(
        self,
        *,
        paid_at=None,
        start_date=None,
        end_date=None,
        save: bool = True,
    ) -> None:
        """
        Activate subscription after external billing/payment flow succeeds.

        لا يتم تنفيذ الدفع هنا.
        خدمة Phase 19 ستستدعي هذه الدالة بعد نجاح الدفع.
        """

        now = timezone.now()

        self.status = self.Status.ACTIVE
        self.cancelled_at = None
        self.suspended_at = None
        self.activated_at = now
        self.paid_at = paid_at or self.paid_at or now

        if start_date is not None:
            self.start_date = start_date

        if end_date is not None:
            self.end_date = end_date

        if save:
            self.save(
                update_fields=[
                    "status",
                    "cancelled_at",
                    "suspended_at",
                    "activated_at",
                    "paid_at",
                    "start_date",
                    "end_date",
                    "updated_at",
                ]
            )
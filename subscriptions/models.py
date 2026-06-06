# ============================================================
# 📂 subscriptions/models.py
# 🧠 PrimeyAcc | SaaS Subscription Core Models V1.0
# ------------------------------------------------------------
# ✅ Subscription plans for SaaS packages
# ✅ Company subscriptions linked to tenant companies
# ✅ Trial / active / expired / cancelled / suspended lifecycle
# ✅ Monthly and yearly billing cycles
# ✅ Safe rule: only one current subscription per company
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - لا يتم إنشاء اشتراك نشط أو تجريبي مكرر لنفس الشركة
# - الشركة هي محور العزل التشغيلي داخل النظام
# - لا يتم وضع منطق الدفع هنا؛ الدفع والفواتير لها وحدات مستقلة لاحقًا
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


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
        default=Decimal("0.00"),
        verbose_name="السعر الشهري",
    )
    yearly_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
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
        return self.monthly_price or Decimal("0.00")

    @property
    def yearly_price_display(self) -> Decimal:
        return self.yearly_price or Decimal("0.00")

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
        TRIAL = "TRIAL", "Trial"
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        SUSPENDED = "SUSPENDED", "Suspended"

    class BillingCycle(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        YEARLY = "YEARLY", "Yearly"

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

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIAL,
        db_index=True,
        verbose_name="حالة الاشتراك",
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
        default=Decimal("0.00"),
        verbose_name="قيمة الاشتراك",
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="قيمة الخصم",
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="قيمة الضريبة",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="الإجمالي",
    )

    auto_renew = models.BooleanField(
        default=False,
        verbose_name="تجديد تلقائي",
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
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["billing_cycle"]),
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
        return max((self.price or Decimal("0.00")) - (self.discount_amount or Decimal("0.00")), Decimal("0.00"))

    def clean(self) -> None:
        super().clean()

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
        self.cancelled_at = timezone.now()

        if save:
            self.save(update_fields=["status", "cancelled_at", "updated_at"])

    def suspend(self, save: bool = True) -> None:
        self.status = self.Status.SUSPENDED
        self.suspended_at = timezone.now()

        if save:
            self.save(update_fields=["status", "suspended_at", "updated_at"])

    def activate(self, save: bool = True) -> None:
        self.status = self.Status.ACTIVE
        self.cancelled_at = None
        self.suspended_at = None

        if save:
            self.save(update_fields=["status", "cancelled_at", "suspended_at", "updated_at"])
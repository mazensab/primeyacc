# ============================================================
# 📂 accounting/models.py
# 🧠 PrimeyAcc | Accounting & Automatic Journal Foundation
# ------------------------------------------------------------
# ✅ دليل حسابات مستقل لكل شركة
# ✅ سنوات وفترات مالية لكل شركة
# ✅ مراكز تكلفة
# ✅ ضرائب VAT
# ✅ إعدادات وتوجيهات محاسبية
# ✅ قيود يومية وأسطر قيود
# ✅ حركات ضريبية
# ✅ عزل كامل حسب الشركة
# ✅ لا يعتمد على company_id من الفرونت
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


# ============================================================
# 🧾 Helpers
# ============================================================

MONEY_ZERO = Decimal("0.00")
MONEY_QUANT = Decimal("0.01")


def money(value) -> Decimal:
    return Decimal(str(value or "0.00")).quantize(
        MONEY_QUANT,
        rounding=ROUND_HALF_UP,
    )


def clean_text(value) -> str:
    return str(value or "").strip()


def clean_code(value) -> str:
    return str(value or "").strip()


def clean_currency(value) -> str:
    return str(value or "SAR").strip().upper()


# ============================================================
# 🧾 Choices
# ============================================================

class AccountType(models.TextChoices):
    ASSET = "ASSET", "أصل"
    LIABILITY = "LIABILITY", "التزام"
    EQUITY = "EQUITY", "حقوق ملكية"
    REVENUE = "REVENUE", "إيراد"
    EXPENSE = "EXPENSE", "مصروف"


class AccountNature(models.TextChoices):
    DEBIT = "DEBIT", "مدين"
    CREDIT = "CREDIT", "دائن"


class AccountingAccountPurpose(models.TextChoices):
    ACCOUNTS_RECEIVABLE = "ACCOUNTS_RECEIVABLE", "ذمم العملاء"
    ACCOUNTS_PAYABLE = "ACCOUNTS_PAYABLE", "ذمم الموردين"
    CASH = "CASH", "الصندوق"
    BANK = "BANK", "البنك"
    INVENTORY = "INVENTORY", "المخزون"

    SALES_REVENUE = "SALES_REVENUE", "إيرادات المبيعات"
    SERVICE_REVENUE = "SERVICE_REVENUE", "إيرادات الخدمات"
    OTHER_REVENUE = "OTHER_REVENUE", "إيرادات أخرى"

    OUTPUT_VAT = "OUTPUT_VAT", "ضريبة مخرجات"
    INPUT_VAT = "INPUT_VAT", "ضريبة مدخلات"
    VAT_PAYABLE = "VAT_PAYABLE", "ضريبة مستحقة"

    DISCOUNT_ALLOWED = "DISCOUNT_ALLOWED", "خصم مسموح"
    DISCOUNT_EARNED = "DISCOUNT_EARNED", "خصم مكتسب"

    COST_OF_SALES = "COST_OF_SALES", "تكلفة المبيعات"
    INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT", "تسوية مخزون"
    EXPENSE = "EXPENSE", "مصروف"

    GATEWAY_FEES = "GATEWAY_FEES", "رسوم بوابة دفع"
    ROUNDING = "ROUNDING", "فروقات تقريب"
    OPENING_EQUITY = "OPENING_EQUITY", "حقوق أرصدة افتتاحية"
    SUSPENSE = "SUSPENSE", "حساب معلق"

    OTHER = "OTHER", "أخرى"


class FiscalYearStatus(models.TextChoices):
    OPEN = "OPEN", "مفتوحة"
    CLOSED = "CLOSED", "مغلقة"
    ARCHIVED = "ARCHIVED", "مؤرشفة"


class AccountingPeriodStatus(models.TextChoices):
    OPEN = "OPEN", "مفتوحة"
    CLOSED = "CLOSED", "مغلقة"
    LOCKED = "LOCKED", "مقفلة"


class CostCenterStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "نشط"
    INACTIVE = "INACTIVE", "غير نشط"


class TaxType(models.TextChoices):
    VAT = "VAT", "ضريبة القيمة المضافة"
    WITHHOLDING = "WITHHOLDING", "ضريبة استقطاع"
    ZAKAT = "ZAKAT", "زكاة"
    OTHER = "OTHER", "أخرى"


class TaxDirection(models.TextChoices):
    OUTPUT = "OUTPUT", "ضريبة مبيعات"
    INPUT = "INPUT", "ضريبة مشتريات"
    SETTLEMENT = "SETTLEMENT", "تسوية ضريبية"


class JournalEntryStatus(models.TextChoices):
    DRAFT = "DRAFT", "مسودة"
    POSTED = "POSTED", "مرحل"
    CANCELLED = "CANCELLED", "ملغي"
    REVERSED = "REVERSED", "معكوس"


class PostingSource(models.TextChoices):
    MANUAL = "MANUAL", "يدوي"
    OPENING_BALANCE = "OPENING_BALANCE", "رصيد افتتاحي"

    SALES_INVOICE = "SALES_INVOICE", "فاتورة مبيعات"
    SALES_PAYMENT = "SALES_PAYMENT", "تحصيل مبيعات"

    PURCHASE_BILL = "PURCHASE_BILL", "فاتورة مشتريات"
    SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "سداد مورد"

    INVENTORY_RECEIPT = "INVENTORY_RECEIPT", "استلام مخزون"
    INVENTORY_ISSUE = "INVENTORY_ISSUE", "صرف مخزون"
    INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT", "تسوية مخزون"
    INVENTORY_TRANSFER = "INVENTORY_TRANSFER", "تحويل مخزون"

    TREASURY = "TREASURY", "خزينة"
    TREASURY_RECEIPT = "TREASURY_RECEIPT", "سند قبض"
    TREASURY_PAYMENT = "TREASURY_PAYMENT", "سند صرف"
    TREASURY_TRANSFER = "TREASURY_TRANSFER", "تحويل خزينة"

    TAX = "TAX", "ضريبة"
    ADJUSTMENT = "ADJUSTMENT", "تسوية"
    SYSTEM = "SYSTEM", "نظام"
    OTHER = "OTHER", "أخرى"


class AccountingRoutingSource(models.TextChoices):
    SALES_INVOICE = "SALES_INVOICE", "فاتورة مبيعات"
    SALES_PAYMENT = "SALES_PAYMENT", "تحصيل مبيعات"

    PURCHASE_BILL = "PURCHASE_BILL", "فاتورة مشتريات"
    SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "سداد مورد"

    INVENTORY_RECEIPT = "INVENTORY_RECEIPT", "استلام مخزون"
    INVENTORY_ISSUE = "INVENTORY_ISSUE", "صرف مخزون"
    INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT", "تسوية مخزون"
    INVENTORY_TRANSFER = "INVENTORY_TRANSFER", "تحويل مخزون"

    TREASURY_INCOME = "TREASURY_INCOME", "قبض خزينة"
    TREASURY_EXPENSE = "TREASURY_EXPENSE", "صرف خزينة"
    TREASURY_TRANSFER = "TREASURY_TRANSFER", "تحويل خزينة"

    TAX_SETTLEMENT = "TAX_SETTLEMENT", "تسوية ضريبية"
    OPENING_BALANCE = "OPENING_BALANCE", "رصيد افتتاحي"
    OTHER = "OTHER", "أخرى"


# ============================================================
# 🌳 Account | دليل الحسابات
# ============================================================

class Account(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="accounting_accounts",
        verbose_name="الشركة",
    )

    name = models.CharField(max_length=255, verbose_name="اسم الحساب")
    name_en = models.CharField(max_length=255, blank=True, verbose_name="اسم الحساب بالإنجليزية")
    code = models.CharField(max_length=50, verbose_name="كود الحساب")

    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        verbose_name="نوع الحساب",
    )
    nature = models.CharField(
        max_length=10,
        choices=AccountNature.choices,
        verbose_name="طبيعة الحساب",
    )
    purpose = models.CharField(
        max_length=80,
        choices=AccountingAccountPurpose.choices,
        default=AccountingAccountPurpose.OTHER,
        db_index=True,
        verbose_name="الغرض المحاسبي",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="children",
        null=True,
        blank=True,
        verbose_name="الحساب الأب",
    )

    level = models.PositiveIntegerField(default=1, verbose_name="المستوى")
    is_group = models.BooleanField(default=False, verbose_name="حساب تجميعي")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    is_system = models.BooleanField(default=False, verbose_name="حساب نظامي")
    allow_manual_posting = models.BooleanField(default=True, verbose_name="السماح بالترحيل اليدوي")

    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        verbose_name="الرصيد الافتتاحي",
    )
    currency = models.CharField(max_length=10, default="SAR", verbose_name="العملة")
    description = models.TextField(blank=True, verbose_name="الوصف")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_accounts"
        verbose_name = "حساب"
        verbose_name_plural = "دليل الحسابات"
        ordering = ["company_id", "code"]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "account_type"]),
            models.Index(fields=["company", "nature"]),
            models.Index(fields=["company", "purpose"]),
            models.Index(fields=["company", "parent"]),
            models.Index(fields=["company", "level"]),
            models.Index(fields=["company", "is_group"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "is_system"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_account_code_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def can_post(self) -> bool:
        return self.is_active and not self.is_group

    def clean(self):
        super().clean()

        self.code = clean_code(self.code)
        self.name = clean_text(self.name)
        self.name_en = clean_text(self.name_en)
        self.currency = clean_currency(self.currency)
        self.opening_balance = money(self.opening_balance)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.code:
            raise ValidationError({"code": "كود الحساب مطلوب."})

        if not self.name:
            raise ValidationError({"name": "اسم الحساب مطلوب."})

        if self.parent_id:
            if self.parent_id == self.pk:
                raise ValidationError({"parent": "لا يمكن أن يكون الحساب أبًا لنفسه."})

            if self.parent.company_id != self.company_id:
                raise ValidationError({"parent": "الحساب الأب يجب أن يكون من نفس الشركة."})

            if not self.parent.is_group:
                raise ValidationError({"parent": "الحساب الأب يجب أن يكون حسابًا تجميعيًا."})

            if self.parent.account_type != self.account_type:
                raise ValidationError({"parent": "نوع الحساب يجب أن يطابق نوع الحساب الأب."})

            self.level = self.parent.level + 1
        else:
            self.level = 1

        if self.is_group:
            self.allow_manual_posting = False

        if not self.is_active:
            self.allow_manual_posting = False

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ============================================================
# 📅 FiscalYear | السنة المالية
# ============================================================

class FiscalYear(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="fiscal_years",
        verbose_name="الشركة",
    )

    name = models.CharField(max_length=100, verbose_name="اسم السنة المالية")
    start_date = models.DateField(verbose_name="تاريخ البداية")
    end_date = models.DateField(verbose_name="تاريخ النهاية")
    status = models.CharField(
        max_length=20,
        choices=FiscalYearStatus.choices,
        default=FiscalYearStatus.OPEN,
        verbose_name="الحالة",
    )
    is_current = models.BooleanField(default=False, verbose_name="السنة الحالية")
    is_default = models.BooleanField(default=False, verbose_name="افتراضية")
    description = models.TextField(blank=True, verbose_name="الوصف")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الإغلاق")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_fiscal_years"
        verbose_name = "سنة مالية"
        verbose_name_plural = "السنوات المالية"
        ordering = ["company_id", "-start_date"]
        indexes = [
            models.Index(fields=["company", "start_date"]),
            models.Index(fields=["company", "end_date"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "is_current"]),
            models.Index(fields=["company", "is_default"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_fiscal_year_name_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "start_date", "end_date"],
                name="unique_fiscal_year_range_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company_id} - {self.name}"

    def clean(self):
        super().clean()

        self.name = clean_text(self.name)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.name:
            raise ValidationError({"name": "اسم السنة المالية مطلوب."})

        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError({"end_date": "تاريخ نهاية السنة يجب أن يكون بعد تاريخ البداية."})

        if self.status == FiscalYearStatus.CLOSED and not self.closed_at:
            self.closed_at = timezone.now()

    def save(self, *args, **kwargs):
        self.full_clean()

        if self.is_current:
            FiscalYear.objects.filter(company=self.company).exclude(pk=self.pk).update(is_current=False)

        if self.is_default:
            FiscalYear.objects.filter(company=self.company).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


# ============================================================
# 📆 AccountingPeriod | الفترة المحاسبية
# ============================================================

class AccountingPeriod(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="accounting_periods",
        verbose_name="الشركة",
    )
    fiscal_year = models.ForeignKey(
        FiscalYear,
        on_delete=models.PROTECT,
        related_name="periods",
        verbose_name="السنة المالية",
    )

    name = models.CharField(max_length=100, verbose_name="اسم الفترة")
    start_date = models.DateField(verbose_name="تاريخ البداية")
    end_date = models.DateField(verbose_name="تاريخ النهاية")
    status = models.CharField(
        max_length=20,
        choices=AccountingPeriodStatus.choices,
        default=AccountingPeriodStatus.OPEN,
        verbose_name="الحالة",
    )
    is_adjustment_period = models.BooleanField(default=False, verbose_name="فترة تسويات")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الإغلاق")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_periods"
        verbose_name = "فترة محاسبية"
        verbose_name_plural = "الفترات المحاسبية"
        ordering = ["company_id", "start_date"]
        indexes = [
            models.Index(fields=["company", "fiscal_year"]),
            models.Index(fields=["company", "start_date"]),
            models.Index(fields=["company", "end_date"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "is_adjustment_period"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "fiscal_year", "name"],
                name="unique_accounting_period_name_per_year_company",
            ),
            models.UniqueConstraint(
                fields=["company", "fiscal_year", "start_date", "end_date"],
                name="unique_accounting_period_range_per_year_company",
            ),
        ]

    def __str__(self):
        return f"{self.fiscal_year.name} - {self.name}"

    @property
    def can_post(self) -> bool:
        return self.status == AccountingPeriodStatus.OPEN

    def clean(self):
        super().clean()

        self.name = clean_text(self.name)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if self.fiscal_year_id and self.fiscal_year.company_id != self.company_id:
            raise ValidationError({"fiscal_year": "السنة المالية يجب أن تكون من نفس الشركة."})

        if not self.name:
            raise ValidationError({"name": "اسم الفترة مطلوب."})

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "تاريخ نهاية الفترة لا يمكن أن يكون قبل تاريخ البداية."})

        if self.fiscal_year_id:
            if self.start_date and self.start_date < self.fiscal_year.start_date:
                raise ValidationError({"start_date": "تاريخ بداية الفترة خارج نطاق السنة المالية."})

            if self.end_date and self.end_date > self.fiscal_year.end_date:
                raise ValidationError({"end_date": "تاريخ نهاية الفترة خارج نطاق السنة المالية."})

            if self.status == AccountingPeriodStatus.OPEN and self.fiscal_year.status != FiscalYearStatus.OPEN:
                raise ValidationError({"status": "لا يمكن فتح فترة داخل سنة مالية غير مفتوحة."})

        if self.status in {AccountingPeriodStatus.CLOSED, AccountingPeriodStatus.LOCKED} and not self.closed_at:
            self.closed_at = timezone.now()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ============================================================
# 🏷️ CostCenter | مركز تكلفة
# ============================================================

class CostCenter(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="cost_centers",
        verbose_name="الشركة",
    )

    name = models.CharField(max_length=255, verbose_name="اسم مركز التكلفة")
    name_en = models.CharField(max_length=255, blank=True, verbose_name="اسم مركز التكلفة بالإنجليزية")
    code = models.CharField(max_length=50, verbose_name="كود مركز التكلفة")

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="children",
        null=True,
        blank=True,
        verbose_name="مركز التكلفة الأب",
    )

    level = models.PositiveIntegerField(default=1, verbose_name="المستوى")
    is_group = models.BooleanField(default=False, verbose_name="مركز تكلفة تجميعي")
    status = models.CharField(
        max_length=20,
        choices=CostCenterStatus.choices,
        default=CostCenterStatus.ACTIVE,
        verbose_name="الحالة",
    )
    description = models.TextField(blank=True, verbose_name="الوصف")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_cost_centers"
        verbose_name = "مركز تكلفة"
        verbose_name_plural = "مراكز التكلفة"
        ordering = ["company_id", "code"]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "parent"]),
            models.Index(fields=["company", "level"]),
            models.Index(fields=["company", "is_group"]),
            models.Index(fields=["company", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_cost_center_code_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def can_post(self) -> bool:
        return self.status == CostCenterStatus.ACTIVE and not self.is_group

    def clean(self):
        super().clean()

        self.code = clean_code(self.code)
        self.name = clean_text(self.name)
        self.name_en = clean_text(self.name_en)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.code:
            raise ValidationError({"code": "كود مركز التكلفة مطلوب."})

        if not self.name:
            raise ValidationError({"name": "اسم مركز التكلفة مطلوب."})

        if self.parent_id:
            if self.parent_id == self.pk:
                raise ValidationError({"parent": "لا يمكن أن يكون مركز التكلفة أبًا لنفسه."})

            if self.parent.company_id != self.company_id:
                raise ValidationError({"parent": "مركز التكلفة الأب يجب أن يكون من نفس الشركة."})

            if not self.parent.is_group:
                raise ValidationError({"parent": "مركز التكلفة الأب يجب أن يكون تجميعيًا."})

            self.level = self.parent.level + 1
        else:
            self.level = 1

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ============================================================
# 🧾 TaxRate | الضرائب
# ============================================================

class TaxRate(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="tax_rates",
        verbose_name="الشركة",
    )

    code = models.CharField(max_length=50, verbose_name="كود الضريبة")
    name = models.CharField(max_length=255, verbose_name="اسم الضريبة")
    tax_type = models.CharField(
        max_length=20,
        choices=TaxType.choices,
        default=TaxType.VAT,
        verbose_name="نوع الضريبة",
    )
    direction = models.CharField(
        max_length=20,
        choices=TaxDirection.choices,
        default=TaxDirection.OUTPUT,
        verbose_name="اتجاه الضريبة",
    )
    rate = models.DecimalField(max_digits=7, decimal_places=4, default=Decimal("15.0000"), verbose_name="النسبة")

    sales_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="tax_sales_rates",
        null=True,
        blank=True,
        verbose_name="حساب ضريبة المبيعات",
    )
    purchase_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="tax_purchase_rates",
        null=True,
        blank=True,
        verbose_name="حساب ضريبة المشتريات",
    )

    is_active = models.BooleanField(default=True, verbose_name="نشطة")
    is_default = models.BooleanField(default=False, verbose_name="افتراضية")
    description = models.TextField(blank=True, verbose_name="الوصف")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_tax_rates"
        verbose_name = "ضريبة"
        verbose_name_plural = "الضرائب"
        ordering = ["company_id", "code"]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "tax_type"]),
            models.Index(fields=["company", "direction"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "is_default"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_tax_rate_code_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    def clean(self):
        super().clean()

        self.code = clean_code(self.code)
        self.name = clean_text(self.name)
        self.rate = Decimal(str(self.rate or "0.0000")).quantize(Decimal("0.0001"))

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.code:
            raise ValidationError({"code": "كود الضريبة مطلوب."})

        if not self.name:
            raise ValidationError({"name": "اسم الضريبة مطلوب."})

        if self.rate < Decimal("0.0000"):
            raise ValidationError({"rate": "نسبة الضريبة لا يمكن أن تكون سالبة."})

        if self.sales_account_id:
            if self.sales_account.company_id != self.company_id:
                raise ValidationError({"sales_account": "حساب ضريبة المبيعات يجب أن يكون من نفس الشركة."})

            if not self.sales_account.can_post:
                raise ValidationError({"sales_account": "حساب ضريبة المبيعات يجب أن يكون قابلًا للترحيل."})

        if self.purchase_account_id:
            if self.purchase_account.company_id != self.company_id:
                raise ValidationError({"purchase_account": "حساب ضريبة المشتريات يجب أن يكون من نفس الشركة."})

            if not self.purchase_account.can_post:
                raise ValidationError({"purchase_account": "حساب ضريبة المشتريات يجب أن يكون قابلًا للترحيل."})

    def save(self, *args, **kwargs):
        self.full_clean()

        if self.is_default:
            TaxRate.objects.filter(
                company=self.company,
                tax_type=self.tax_type,
            ).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


# ============================================================
# ⚙️ AccountingSettings | إعدادات المحاسبة
# ============================================================

class AccountingSettings(models.Model):
    company = models.OneToOneField(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="accounting_settings",
        verbose_name="الشركة",
    )

    default_currency = models.CharField(max_length=10, default="SAR", verbose_name="العملة الافتراضية")
    default_tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_in_settings",
        verbose_name="الضريبة الافتراضية",
    )

    auto_post_sales = models.BooleanField(default=True, verbose_name="ترحيل المبيعات تلقائيًا")
    auto_post_purchases = models.BooleanField(default=True, verbose_name="ترحيل المشتريات تلقائيًا")
    auto_post_inventory = models.BooleanField(default=False, verbose_name="ترحيل المخزون تلقائيًا")
    auto_post_treasury = models.BooleanField(default=False, verbose_name="ترحيل الخزينة تلقائيًا")

    require_period_for_posting = models.BooleanField(default=False, verbose_name="إلزام الفترة عند الترحيل")
    allow_posting_without_cost_center = models.BooleanField(default=True, verbose_name="السماح بالترحيل بدون مركز تكلفة")

    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_settings"
        verbose_name = "إعدادات المحاسبة"
        verbose_name_plural = "إعدادات المحاسبة"

    def __str__(self):
        return f"إعدادات المحاسبة - {self.company_id}"

    def clean(self):
        super().clean()

        self.default_currency = clean_currency(self.default_currency)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if self.default_tax_rate_id and self.default_tax_rate.company_id != self.company_id:
            raise ValidationError({"default_tax_rate": "الضريبة الافتراضية يجب أن تكون من نفس الشركة."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_for_company(cls, company):
        if not company:
            raise ValidationError("الشركة مطلوبة لإعدادات المحاسبة.")

        obj, _ = cls.objects.get_or_create(company=company)
        return obj


# ============================================================
# 🧭 AccountingRoutingRule | قواعد التوجيه المحاسبي
# ============================================================

class AccountingRoutingRule(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="accounting_routing_rules",
        verbose_name="الشركة",
    )

    source = models.CharField(max_length=50, choices=AccountingRoutingSource.choices, verbose_name="مصدر العملية")
    purpose = models.CharField(max_length=80, choices=AccountingAccountPurpose.choices, verbose_name="الغرض المحاسبي")

    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="routing_rules",
        verbose_name="الحساب",
    )
    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_rules",
        verbose_name="الضريبة",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_rules",
        verbose_name="مركز التكلفة",
    )

    is_active = models.BooleanField(default=True, verbose_name="نشطة")
    priority = models.PositiveIntegerField(default=100, verbose_name="الأولوية")
    description = models.TextField(blank=True, verbose_name="الوصف")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_routing_rules"
        verbose_name = "قاعدة توجيه محاسبي"
        verbose_name_plural = "قواعد التوجيه المحاسبي"
        ordering = ["company_id", "source", "purpose", "priority"]
        indexes = [
            models.Index(fields=["company", "source"]),
            models.Index(fields=["company", "purpose"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "priority"]),
            models.Index(fields=["company", "source", "purpose", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "source", "purpose", "account", "tax_rate", "cost_center"],
                name="unique_accounting_routing_rule_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.get_source_display()} - {self.get_purpose_display()}"

    def clean(self):
        super().clean()

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if self.account_id:
            if self.account.company_id != self.company_id:
                raise ValidationError({"account": "حساب التوجيه يجب أن يكون من نفس الشركة."})

            if not self.account.can_post:
                raise ValidationError({"account": "حساب التوجيه يجب أن يكون نشطًا وغير تجميعي."})

        if self.tax_rate_id and self.tax_rate.company_id != self.company_id:
            raise ValidationError({"tax_rate": "الضريبة يجب أن تكون من نفس الشركة."})

        if self.cost_center_id:
            if self.cost_center.company_id != self.company_id:
                raise ValidationError({"cost_center": "مركز التكلفة يجب أن يكون من نفس الشركة."})

            if not self.cost_center.can_post:
                raise ValidationError({"cost_center": "مركز التكلفة يجب أن يكون نشطًا وغير تجميعي."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ============================================================
# 🧾 JournalEntry | القيد اليومي
# ============================================================

class JournalEntry(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="journal_entries",
        verbose_name="الشركة",
    )

    entry_number = models.CharField(max_length=100, verbose_name="رقم القيد")
    entry_date = models.DateField(verbose_name="تاريخ القيد")

    period = models.ForeignKey(
        AccountingPeriod,
        on_delete=models.PROTECT,
        related_name="journal_entries",
        null=True,
        blank=True,
        verbose_name="الفترة المحاسبية",
    )

    status = models.CharField(
        max_length=20,
        choices=JournalEntryStatus.choices,
        default=JournalEntryStatus.DRAFT,
        verbose_name="الحالة",
    )
    posting_source = models.CharField(
        max_length=40,
        choices=PostingSource.choices,
        default=PostingSource.MANUAL,
        verbose_name="مصدر القيد",
    )

    reference = models.CharField(max_length=255, blank=True, verbose_name="مرجع")
    external_reference = models.CharField(max_length=255, blank=True, verbose_name="مرجع خارجي")
    source_type = models.CharField(max_length=80, blank=True, verbose_name="نوع المصدر")
    source_id = models.CharField(max_length=80, blank=True, verbose_name="معرف المصدر")
    source_number = models.CharField(max_length=120, blank=True, verbose_name="رقم المصدر")

    description = models.TextField(blank=True, verbose_name="الوصف")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    currency = models.CharField(max_length=10, default="SAR", verbose_name="العملة")

    is_auto_posted = models.BooleanField(default=False, verbose_name="قيد آلي")

    posted_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الترحيل")
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_primeyacc_journal_entries",
        null=True,
        blank=True,
        verbose_name="رحل بواسطة",
    )

    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الإلغاء")
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_primeyacc_journal_entries",
        null=True,
        blank=True,
        verbose_name="ألغي بواسطة",
    )

    reversal_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="reversal_entries",
        null=True,
        blank=True,
        verbose_name="عكس القيد",
    )
    reversed_entry = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="original_reversed_entries",
        null=True,
        blank=True,
        verbose_name="القيد العكسي",
    )
    reversed_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ العكس")

    total_debit = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="إجمالي المدين")
    total_credit = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="إجمالي الدائن")

    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_primeyacc_journal_entries",
        null=True,
        blank=True,
        verbose_name="أنشئ بواسطة",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_primeyacc_journal_entries",
        null=True,
        blank=True,
        verbose_name="آخر تعديل بواسطة",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_journal_entries"
        verbose_name = "قيد يومية"
        verbose_name_plural = "قيود اليومية"
        ordering = ["company_id", "-entry_date", "-id"]
        indexes = [
            models.Index(fields=["company", "entry_number"]),
            models.Index(fields=["company", "entry_date"]),
            models.Index(fields=["company", "period"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "posting_source"]),
            models.Index(fields=["company", "reference"]),
            models.Index(fields=["company", "external_reference"]),
            models.Index(fields=["company", "source_type"]),
            models.Index(fields=["company", "source_id"]),
            models.Index(fields=["company", "source_number"]),
            models.Index(fields=["company", "currency"]),
            models.Index(fields=["company", "is_auto_posted"]),
            models.Index(fields=["company", "reversal_of"]),
            models.Index(fields=["company", "status", "entry_date"]),
            models.Index(fields=["company", "source_type", "source_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "entry_number"],
                name="unique_journal_entry_number_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.entry_number} - {self.entry_date}"

    @property
    def is_posted(self) -> bool:
        return self.status == JournalEntryStatus.POSTED

    @property
    def is_draft(self) -> bool:
        return self.status == JournalEntryStatus.DRAFT

    @property
    def is_balanced(self) -> bool:
        return money(self.total_debit) == money(self.total_credit)

    @property
    def can_edit(self) -> bool:
        return self.status == JournalEntryStatus.DRAFT

    def clean(self):
        super().clean()

        self.entry_number = clean_code(self.entry_number)
        self.currency = clean_currency(self.currency)
        self.reference = clean_text(self.reference)
        self.external_reference = clean_text(self.external_reference)
        self.source_type = clean_text(self.source_type)
        self.source_id = clean_text(self.source_id)
        self.source_number = clean_text(self.source_number)
        self.total_debit = money(self.total_debit)
        self.total_credit = money(self.total_credit)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.entry_number:
            raise ValidationError({"entry_number": "رقم القيد مطلوب."})

        if not self.entry_date:
            raise ValidationError({"entry_date": "تاريخ القيد مطلوب."})

        if self.period_id:
            if self.period.company_id != self.company_id:
                raise ValidationError({"period": "الفترة المحاسبية يجب أن تكون من نفس الشركة."})

            if not self.period.can_post:
                raise ValidationError({"period": "لا يمكن الترحيل في فترة غير مفتوحة."})

            if not (self.period.start_date <= self.entry_date <= self.period.end_date):
                raise ValidationError({"entry_date": "تاريخ القيد خارج نطاق الفترة المحاسبية."})

        if self.reversal_of_id and self.reversal_of.company_id != self.company_id:
            raise ValidationError({"reversal_of": "القيد المعكوس يجب أن يكون من نفس الشركة."})

        if self.reversed_entry_id and self.reversed_entry.company_id != self.company_id:
            raise ValidationError({"reversed_entry": "القيد العكسي يجب أن يكون من نفس الشركة."})

        if self.status == JournalEntryStatus.POSTED:
            if not self.posted_at:
                self.posted_at = timezone.now()

            if not self.is_balanced:
                raise ValidationError("لا يمكن ترحيل قيد غير متوازن.")

            if self.total_debit <= MONEY_ZERO:
                raise ValidationError("لا يمكن ترحيل قيد بدون مبالغ.")

        if self.status == JournalEntryStatus.CANCELLED and not self.cancelled_at:
            self.cancelled_at = timezone.now()

        if self.status == JournalEntryStatus.REVERSED and not self.reversed_at:
            self.reversed_at = timezone.now()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def update_totals(self):
        totals = self.lines.aggregate(
            debit=models.Sum("debit_amount"),
            credit=models.Sum("credit_amount"),
        )

        self.total_debit = money(totals.get("debit") or MONEY_ZERO)
        self.total_credit = money(totals.get("credit") or MONEY_ZERO)

        super().save(update_fields=["total_debit", "total_credit", "updated_at"])

    def post(self, *, actor=None):
        if self.status == JournalEntryStatus.CANCELLED:
            raise ValidationError("لا يمكن ترحيل قيد ملغي.")

        if self.status == JournalEntryStatus.REVERSED:
            raise ValidationError("لا يمكن ترحيل قيد معكوس.")

        self.update_totals()

        if not self.lines.exists():
            raise ValidationError("لا يمكن ترحيل قيد بدون أسطر.")

        if not self.is_balanced:
            raise ValidationError("لا يمكن ترحيل قيد غير متوازن.")

        if self.total_debit <= MONEY_ZERO:
            raise ValidationError("لا يمكن ترحيل قيد بدون مبالغ.")

        self.status = JournalEntryStatus.POSTED
        self.posted_at = timezone.now()

        if actor is not None and getattr(actor, "is_authenticated", False):
            self.posted_by = actor
            self.updated_by = actor

        self.save(
            update_fields=[
                "status",
                "posted_at",
                "posted_by",
                "updated_by",
                "total_debit",
                "total_credit",
                "updated_at",
            ]
        )

    def cancel(self, *, actor=None):
        if self.status != JournalEntryStatus.POSTED:
            raise ValidationError("لا يمكن إلغاء قيد غير مرحل.")

        self.status = JournalEntryStatus.CANCELLED
        self.cancelled_at = timezone.now()

        if actor is not None and getattr(actor, "is_authenticated", False):
            self.cancelled_by = actor
            self.updated_by = actor

        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "updated_by",
                "updated_at",
            ]
        )


# ============================================================
# 🧾 JournalEntryLine | أسطر القيود
# ============================================================

class JournalEntryLine(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="journal_entry_lines",
        verbose_name="الشركة",
    )

    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name="القيد",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="journal_lines",
        verbose_name="الحساب",
    )

    description = models.TextField(blank=True, verbose_name="الوصف")
    debit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="مدين")
    credit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="دائن")
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="مبلغ الضريبة")
    currency = models.CharField(max_length=10, default="SAR", verbose_name="العملة")

    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.SET_NULL,
        related_name="journal_lines",
        null=True,
        blank=True,
        verbose_name="مركز التكلفة",
    )
    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        related_name="journal_lines",
        null=True,
        blank=True,
        verbose_name="الضريبة",
    )

    party_type = models.CharField(max_length=80, blank=True, verbose_name="نوع الطرف")
    party_id = models.CharField(max_length=80, blank=True, verbose_name="معرف الطرف")
    source_line_id = models.CharField(max_length=120, blank=True, verbose_name="معرف السطر من المصدر")

    sort_order = models.PositiveIntegerField(default=0, verbose_name="ترتيب السطر")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_journal_entry_lines"
        verbose_name = "سطر قيد"
        verbose_name_plural = "أسطر القيود"
        ordering = ["company_id", "journal_entry", "sort_order", "id"]
        indexes = [
            models.Index(fields=["company", "journal_entry"]),
            models.Index(fields=["company", "account"]),
            models.Index(fields=["company", "cost_center"]),
            models.Index(fields=["company", "tax_rate"]),
            models.Index(fields=["company", "party_type"]),
            models.Index(fields=["company", "party_id"]),
            models.Index(fields=["company", "source_line_id"]),
            models.Index(fields=["company", "sort_order"]),
        ]

    def __str__(self):
        return f"{self.journal_entry.entry_number} - {self.account.code}"

    def clean(self):
        super().clean()

        self.currency = clean_currency(self.currency)
        self.debit_amount = money(self.debit_amount)
        self.credit_amount = money(self.credit_amount)
        self.tax_amount = money(self.tax_amount)
        self.party_type = clean_text(self.party_type)
        self.party_id = clean_text(self.party_id)
        self.source_line_id = clean_text(self.source_line_id)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.journal_entry_id:
            raise ValidationError({"journal_entry": "القيد مطلوب."})

        if self.journal_entry_id and self.journal_entry.company_id != self.company_id:
            raise ValidationError({"journal_entry": "القيد يجب أن يكون من نفس الشركة."})

        if self.journal_entry_id and self.journal_entry.status != JournalEntryStatus.DRAFT:
            raise ValidationError("لا يمكن تعديل أسطر قيد غير مسودة.")

        if not self.account_id:
            raise ValidationError({"account": "الحساب مطلوب."})

        if self.account_id:
            if self.account.company_id != self.company_id:
                raise ValidationError({"account": "الحساب يجب أن يكون من نفس الشركة."})

            if not self.account.can_post:
                raise ValidationError({"account": "لا يمكن الترحيل على حساب تجميعي أو غير نشط."})

        if self.debit_amount > MONEY_ZERO and self.credit_amount > MONEY_ZERO:
            raise ValidationError("لا يمكن أن يحتوي سطر القيد على مدين ودائن في نفس الوقت.")

        if self.debit_amount <= MONEY_ZERO and self.credit_amount <= MONEY_ZERO:
            raise ValidationError("يجب أن يحتوي سطر القيد على مبلغ مدين أو دائن.")

        if self.tax_amount < MONEY_ZERO:
            raise ValidationError({"tax_amount": "مبلغ الضريبة لا يمكن أن يكون سالبًا."})

        if self.cost_center_id:
            if self.cost_center.company_id != self.company_id:
                raise ValidationError({"cost_center": "مركز التكلفة يجب أن يكون من نفس الشركة."})

            if not self.cost_center.can_post:
                raise ValidationError({"cost_center": "مركز التكلفة غير نشط أو تجميعي."})

        if self.tax_rate_id and self.tax_rate.company_id != self.company_id:
            raise ValidationError({"tax_rate": "الضريبة يجب أن تكون من نفس الشركة."})

    def save(self, *args, **kwargs):
        if not self.company_id and self.journal_entry_id:
            self.company_id = self.journal_entry.company_id

        self.full_clean()
        super().save(*args, **kwargs)
        self.journal_entry.update_totals()

    def delete(self, *args, **kwargs):
        journal_entry = self.journal_entry
        super().delete(*args, **kwargs)
        journal_entry.update_totals()


# ============================================================
# 🧾 TaxTransaction | حركة ضريبية
# ============================================================

class TaxTransaction(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="tax_transactions",
        verbose_name="الشركة",
    )

    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.PROTECT,
        related_name="tax_transactions",
        verbose_name="الضريبة",
    )
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.PROTECT,
        related_name="tax_transactions",
        null=True,
        blank=True,
        verbose_name="القيد المحاسبي",
    )
    journal_line = models.ForeignKey(
        JournalEntryLine,
        on_delete=models.PROTECT,
        related_name="tax_transactions",
        null=True,
        blank=True,
        verbose_name="سطر القيد",
    )

    direction = models.CharField(max_length=20, choices=TaxDirection.choices, verbose_name="اتجاه الضريبة")
    transaction_date = models.DateField(verbose_name="تاريخ الحركة")
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="المبلغ الخاضع للضريبة")
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO, verbose_name="مبلغ الضريبة")
    currency = models.CharField(max_length=10, default="SAR", verbose_name="العملة")

    source_type = models.CharField(max_length=80, blank=True, verbose_name="نوع المصدر")
    source_id = models.CharField(max_length=80, blank=True, verbose_name="معرف المصدر")
    source_number = models.CharField(max_length=120, blank=True, verbose_name="رقم المصدر")

    description = models.TextField(blank=True, verbose_name="الوصف")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="بيانات إضافية")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخر تحديث")

    class Meta:
        db_table = "accounting_tax_transactions"
        verbose_name = "حركة ضريبية"
        verbose_name_plural = "الحركات الضريبية"
        ordering = ["company_id", "-transaction_date", "-id"]
        indexes = [
            models.Index(fields=["company", "tax_rate"]),
            models.Index(fields=["company", "direction"]),
            models.Index(fields=["company", "transaction_date"]),
            models.Index(fields=["company", "currency"]),
            models.Index(fields=["company", "source_type"]),
            models.Index(fields=["company", "source_id"]),
            models.Index(fields=["company", "source_number"]),
            models.Index(fields=["company", "journal_entry"]),
            models.Index(fields=["company", "journal_line"]),
        ]

    def __str__(self):
        return f"{self.tax_rate.code} - {self.tax_amount}"

    def clean(self):
        super().clean()

        self.currency = clean_currency(self.currency)
        self.taxable_amount = money(self.taxable_amount)
        self.tax_amount = money(self.tax_amount)
        self.source_type = clean_text(self.source_type)
        self.source_id = clean_text(self.source_id)
        self.source_number = clean_text(self.source_number)

        if not self.company_id:
            raise ValidationError({"company": "الشركة مطلوبة."})

        if not self.tax_rate_id:
            raise ValidationError({"tax_rate": "الضريبة مطلوبة."})

        if self.tax_rate_id and self.tax_rate.company_id != self.company_id:
            raise ValidationError({"tax_rate": "الضريبة يجب أن تكون من نفس الشركة."})

        if self.journal_entry_id and self.journal_entry.company_id != self.company_id:
            raise ValidationError({"journal_entry": "القيد يجب أن يكون من نفس الشركة."})

        if self.journal_line_id and self.journal_line.company_id != self.company_id:
            raise ValidationError({"journal_line": "سطر القيد يجب أن يكون من نفس الشركة."})

        if not self.transaction_date:
            raise ValidationError({"transaction_date": "تاريخ الحركة مطلوب."})

        if self.taxable_amount < MONEY_ZERO:
            raise ValidationError({"taxable_amount": "المبلغ الخاضع للضريبة لا يمكن أن يكون سالبًا."})

        if self.tax_amount < MONEY_ZERO:
            raise ValidationError({"tax_amount": "مبلغ الضريبة لا يمكن أن يكون سالبًا."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
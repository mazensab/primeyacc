# ============================================================
# 📂 companies/models.py
# 🧠 PrimeyAcc | Companies Models V1.2
# ------------------------------------------------------------
# ✅ Company Tenant Model
# ✅ Multi-company Isolation Foundation
# ✅ Activity Profiles
# ✅ Company Status Lifecycle
# ✅ Saudi National Address Fields
# ✅ Legal / Tax / Contact / Branding Fields
# ✅ Company Operational Settings
# ✅ Company Branches Foundation
# ✅ Branch-level Isolation under Company
# ✅ Audit Fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company = حدود العزل الأساسية للنظام
# - Branch = فرع تشغيلي داخل شركة واحدة فقط
# - CompanySettings = إعدادات تشغيلية لشركة واحدة فقط
# - /system يدير الشركات والاشتراكات
# - /company يدير بيانات شركة واحدة فقط
# - لا تقبل واجهات /company أي company_id من الواجهة
# - أي API داخل /company يجب أن يستخرج الشركة من المستخدم الحالي
# - أي بيانات تشغيلية مستقبلًا يجب أن ترتبط بـ company
# - البيانات الفرعية التي تحتاج فرعًا ترتبط بـ branch مع company
# - لا يجوز لشركة الوصول إلى بيانات شركة أخرى
# - العنوان الأساسي للشركات والفروع في السعودية = العنوان الوطني
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class CompanyStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    TRIAL = "TRIAL", "Trial"
    SUSPENDED = "SUSPENDED", "Suspended"
    EXPIRED = "EXPIRED", "Expired"
    CANCELLED = "CANCELLED", "Cancelled"


class CompanyActivityProfile(models.TextChoices):
    GENERAL = "GENERAL", "General"
    RETAIL = "RETAIL", "Retail"
    WHOLESALE = "WHOLESALE", "Wholesale"
    JEWELRY = "JEWELRY", "Jewelry / Gold"
    PETROL_STATION = "PETROL_STATION", "Petrol Station"


class BranchStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    MAINTENANCE = "MAINTENANCE", "Maintenance"
    CLOSED = "CLOSED", "Closed"


class BranchType(models.TextChoices):
    HEAD_OFFICE = "HEAD_OFFICE", "Head office"
    BRANCH = "BRANCH", "Branch"
    WAREHOUSE = "WAREHOUSE", "Warehouse"
    POS = "POS", "POS"
    SERVICE_CENTER = "SERVICE_CENTER", "Service center"


class DefaultLanguage(models.TextChoices):
    AR = "ar", "Arabic"
    EN = "en", "English"


class Company(models.Model):
    """
    PrimeyAcc company tenant.

    This model is the main tenant boundary for the whole system.
    Every operational module such as products, customers, suppliers,
    invoices, inventory, accounting, treasury, POS, HR, payments,
    settings, and reports must be scoped by company.

    Important rule:
    - /system manages companies and subscriptions.
    - /company manages one company's operational data.
    - No company should ever access another company's data.
    """

    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Company name",
    )
    name_ar = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Arabic name",
    )
    name_en = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="English name",
    )

    company_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Company code",
        help_text="Unique internal code used by PrimeyAcc.",
    )

    activity_profile = models.CharField(
        max_length=40,
        choices=CompanyActivityProfile.choices,
        default=CompanyActivityProfile.GENERAL,
        db_index=True,
        verbose_name="Activity profile",
    )

    status = models.CharField(
        max_length=30,
        choices=CompanyStatus.choices,
        default=CompanyStatus.TRIAL,
        db_index=True,
        verbose_name="Status",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    commercial_registration = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Commercial registration",
    )
    tax_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Tax number",
    )

    email = models.EmailField(
        blank=True,
        db_index=True,
        verbose_name="Email",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Phone",
    )
    mobile = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Mobile",
    )
    whatsapp_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp number",
    )

    # Saudi National Address
    country = models.CharField(
        max_length=100,
        default="Saudi Arabia",
        verbose_name="Country",
    )
    building_number = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        verbose_name="Building number",
    )
    street_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Street name",
    )
    district = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="District",
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="City",
    )
    region = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Region",
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        verbose_name="Postal code",
    )
    short_address = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Short address",
        help_text="Saudi short national address if available.",
    )
    address = models.TextField(
        blank=True,
        verbose_name="Additional address",
        help_text="Optional extra address notes. National address fields are the main address source.",
    )

    logo = models.ImageField(
        upload_to="companies/logos/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="Logo",
    )

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        verbose_name="Currency code",
    )
    vat_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        verbose_name="VAT percentage",
    )

    trial_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Trial ends at",
    )
    suspended_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Suspended at",
    )
    suspended_reason = models.TextField(
        blank=True,
        verbose_name="Suspended reason",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="owned_primeyacc_companies",
        verbose_name="Owner",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_primeyacc_companies",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_primeyacc_companies",
        verbose_name="Updated by",
    )

    # Compatibility field from Phase 0/1.
    # New operational settings should be stored in CompanySettings.
    settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Company settings",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["activity_profile", "status"]),
            models.Index(fields=["city", "status"]),
            models.Index(fields=["district", "city"]),
            models.Index(fields=["postal_code"]),
            models.Index(fields=["short_address"]),
            models.Index(fields=["commercial_registration"]),
            models.Index(fields=["tax_number"]),
        ]

    def __str__(self) -> str:
        return self.display_name

    @property
    def display_name(self) -> str:
        return self.name_ar or self.name_en or self.name

    @property
    def national_address_line(self) -> str:
        parts = [
            self.building_number,
            self.street_name,
            self.district,
            self.city,
            self.postal_code,
            self.short_address,
        ]
        return " - ".join([part for part in parts if part])

    @property
    def is_suspended(self) -> bool:
        return self.status == CompanyStatus.SUSPENDED

    @property
    def is_trial_expired(self) -> bool:
        if not self.trial_ends_at:
            return False
        return timezone.now() > self.trial_ends_at

    def activate(self, user=None) -> None:
        self.status = CompanyStatus.ACTIVE
        self.is_active = True
        self.suspended_at = None
        self.suspended_reason = ""
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "suspended_at",
                "suspended_reason",
                "updated_by",
                "updated_at",
            ]
        )

    def suspend(self, reason: str = "", user=None) -> None:
        self.status = CompanyStatus.SUSPENDED
        self.is_active = False
        self.suspended_at = timezone.now()
        self.suspended_reason = reason or ""
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "suspended_at",
                "suspended_reason",
                "updated_by",
                "updated_at",
            ]
        )

    def mark_expired(self, user=None) -> None:
        self.status = CompanyStatus.EXPIRED
        self.is_active = False
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )


class CompanySettings(models.Model):
    """
    Operational settings for one company.

    This model is separated from Company to keep tenant identity stable
    while allowing future operational settings to grow safely.
    """

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="operational_settings",
        db_index=True,
        verbose_name="Company",
    )

    default_language = models.CharField(
        max_length=10,
        choices=DefaultLanguage.choices,
        default=DefaultLanguage.AR,
        verbose_name="Default language",
    )
    timezone_name = models.CharField(
        max_length=100,
        default="Asia/Riyadh",
        verbose_name="Timezone",
    )
    date_format = models.CharField(
        max_length=50,
        default="yyyy-MM-dd",
        verbose_name="Date format",
    )
    time_format = models.CharField(
        max_length=20,
        default="24h",
        verbose_name="Time format",
    )

    fiscal_year_start_month = models.PositiveSmallIntegerField(
        default=1,
        verbose_name="Fiscal year start month",
        help_text="1 = January, 12 = December.",
    )
    fiscal_year_start_day = models.PositiveSmallIntegerField(
        default=1,
        verbose_name="Fiscal year start day",
    )

    invoice_prefix = models.CharField(
        max_length=20,
        default="INV",
        verbose_name="Invoice prefix",
    )
    quotation_prefix = models.CharField(
        max_length=20,
        default="QUO",
        verbose_name="Quotation prefix",
    )
    purchase_prefix = models.CharField(
        max_length=20,
        default="PUR",
        verbose_name="Purchase prefix",
    )
    receipt_prefix = models.CharField(
        max_length=20,
        default="REC",
        verbose_name="Receipt prefix",
    )
    payment_prefix = models.CharField(
        max_length=20,
        default="PAY",
        verbose_name="Payment prefix",
    )

    allow_negative_stock = models.BooleanField(
        default=False,
        verbose_name="Allow negative stock",
    )
    enable_inventory_tracking = models.BooleanField(
        default=True,
        verbose_name="Enable inventory tracking",
    )
    enable_pos = models.BooleanField(
        default=True,
        verbose_name="Enable POS",
    )
    enable_purchases = models.BooleanField(
        default=True,
        verbose_name="Enable purchases",
    )
    enable_hr = models.BooleanField(
        default=False,
        verbose_name="Enable HR",
    )

    enable_vat = models.BooleanField(
        default=True,
        verbose_name="Enable VAT",
    )
    default_vat_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        verbose_name="Default VAT percentage",
    )

    require_customer_for_sales = models.BooleanField(
        default=False,
        verbose_name="Require customer for sales",
    )
    require_supplier_for_purchases = models.BooleanField(
        default=True,
        verbose_name="Require supplier for purchases",
    )

    settings_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Additional settings data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_company_operational_settings",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_company_operational_settings",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Company settings"
        verbose_name_plural = "Company settings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["default_language"]),
            models.Index(fields=["enable_pos", "enable_inventory_tracking"]),
            models.Index(fields=["enable_vat"]),
        ]

    def __str__(self) -> str:
        return f"Settings - {self.company.display_name}"

    def clean(self) -> None:
        if self.fiscal_year_start_month < 1 or self.fiscal_year_start_month > 12:
            raise ValidationError(
                {"fiscal_year_start_month": "Fiscal year start month must be between 1 and 12."}
            )

        if self.fiscal_year_start_day < 1 or self.fiscal_year_start_day > 31:
            raise ValidationError(
                {"fiscal_year_start_day": "Fiscal year start day must be between 1 and 31."}
            )

        if self.default_vat_percentage < 0:
            raise ValidationError(
                {"default_vat_percentage": "VAT percentage cannot be negative."}
            )

    def get_setting(self, key: str, default=None):
        if not isinstance(self.settings_data, dict):
            return default
        return self.settings_data.get(key, default)


class Branch(models.Model):
    """
    Company branch.

    Branches are always scoped under one company.
    Future operational records such as warehouses, POS devices, users,
    invoices, stock movements, shifts, and attendance can be linked to branch.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="branches",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Branch name",
    )
    name_ar = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Arabic name",
    )
    name_en = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="English name",
    )

    branch_code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Branch code",
        help_text="Unique inside the same company.",
    )

    branch_type = models.CharField(
        max_length=40,
        choices=BranchType.choices,
        default=BranchType.BRANCH,
        db_index=True,
        verbose_name="Branch type",
    )
    status = models.CharField(
        max_length=30,
        choices=BranchStatus.choices,
        default=BranchStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )
    is_default = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Default branch",
        help_text="Only one default branch should exist per company.",
    )

    manager_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Manager name",
    )
    email = models.EmailField(
        blank=True,
        db_index=True,
        verbose_name="Email",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Phone",
    )
    mobile = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Mobile",
    )
    whatsapp_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp number",
    )

    # Saudi National Address for branch
    country = models.CharField(
        max_length=100,
        default="Saudi Arabia",
        verbose_name="Country",
    )
    building_number = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        verbose_name="Building number",
    )
    street_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Street name",
    )
    district = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="District",
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="City",
    )
    region = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Region",
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        verbose_name="Postal code",
    )
    short_address = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Short address",
    )
    address = models.TextField(
        blank=True,
        verbose_name="Additional address",
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True,
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True,
        verbose_name="Longitude",
    )

    opening_time = models.TimeField(
        blank=True,
        null=True,
        verbose_name="Opening time",
    )
    closing_time = models.TimeField(
        blank=True,
        null=True,
        verbose_name="Closing time",
    )

    settings_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Branch settings data",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_company_branches",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_company_branches",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Branch"
        verbose_name_plural = "Branches"
        ordering = ["company_id", "-is_default", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "branch_code"],
                name="unique_branch_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status", "is_active"]),
            models.Index(fields=["company", "branch_type"]),
            models.Index(fields=["company", "is_default"]),
            models.Index(fields=["company", "city"]),
            models.Index(fields=["company", "district", "city"]),
            models.Index(fields=["branch_code"]),
            models.Index(fields=["short_address"]),
        ]

    def __str__(self) -> str:
        return f"{self.display_name} - {self.company.display_name}"

    @property
    def display_name(self) -> str:
        return self.name_ar or self.name_en or self.name

    @property
    def national_address_line(self) -> str:
        parts = [
            self.building_number,
            self.street_name,
            self.district,
            self.city,
            self.postal_code,
            self.short_address,
        ]
        return " - ".join([part for part in parts if part])

    @property
    def is_closed(self) -> bool:
        return self.status == BranchStatus.CLOSED

    def clean(self) -> None:
        if self.latitude is not None and (self.latitude < Decimal("-90") or self.latitude > Decimal("90")):
            raise ValidationError({"latitude": "Latitude must be between -90 and 90."})

        if self.longitude is not None and (self.longitude < Decimal("-180") or self.longitude > Decimal("180")):
            raise ValidationError({"longitude": "Longitude must be between -180 and 180."})

    def save(self, *args, **kwargs):
        if self.status in [BranchStatus.INACTIVE, BranchStatus.CLOSED]:
            self.is_active = False

        if self.status == BranchStatus.ACTIVE:
            self.is_active = True

        super().save(*args, **kwargs)

        if self.is_default:
            Branch.objects.filter(
                company=self.company,
                is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)

    def activate(self, user=None) -> None:
        self.status = BranchStatus.ACTIVE
        self.is_active = True
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )

    def deactivate(self, user=None) -> None:
        self.status = BranchStatus.INACTIVE
        self.is_active = False
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )
# ============================================================
# 📂 companies/models.py
# 🧠 PrimeyAcc | Companies Models V1.1
# ------------------------------------------------------------
# ✅ Company Tenant Model
# ✅ Multi-company Isolation Foundation
# ✅ Activity Profiles
# ✅ Company Status Lifecycle
# ✅ Saudi National Address Fields
# ✅ Legal / Tax / Contact / Branding Fields
# ✅ Audit Fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company = حدود العزل الأساسية للنظام
# - /system يدير الشركات والاشتراكات
# - /company يدير بيانات شركة واحدة فقط
# - أي بيانات تشغيلية مستقبلًا يجب أن ترتبط بـ company
# - لا يجوز لشركة الوصول إلى بيانات شركة أخرى
# - العنوان الأساسي للشركات في السعودية = العنوان الوطني
# ============================================================

from __future__ import annotations

from django.conf import settings
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
        default=15,
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
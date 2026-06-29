# ============================================================
# 📂 parties/models.py
# 🧠 Mhamcloud | Business Parties Models V1.0
# ------------------------------------------------------------
# ✅ BusinessParty foundation for customers and suppliers
# ✅ Company-scoped tenant isolation
# ✅ Optional branch relation with company validation
# ✅ Saudi commercial and VAT fields
# ✅ Contact, address, credit and opening balance fields
# ✅ Audit fields for created_by / updated_by
# ✅ Search and status indexes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - BusinessParty هو الأساس الموحد للعملاء والموردين
# - كل طرف تجاري يجب أن يكون مربوطًا بشركة واحدة فقط
# - لا يتم الاعتماد على company_id القادم من الفرونت كمصدر ثقة
# - APIs لاحقًا تأخذ الشركة من CompanyMembership عبر request.company
# - إذا تم ربط فرع، يجب أن يكون الفرع تابعًا لنفس الشركة
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from companies.models import Branch, Company


class BusinessPartyType(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    SUPPLIER = "SUPPLIER", "Supplier"
    BOTH = "BOTH", "Customer and Supplier"
    OTHER = "OTHER", "Other"


class BusinessPartyStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    BLOCKED = "BLOCKED", "Blocked"
    ARCHIVED = "ARCHIVED", "Archived"


class BusinessPartyKind(models.TextChoices):
    INDIVIDUAL = "INDIVIDUAL", "Individual"
    ORGANIZATION = "ORGANIZATION", "Organization"


class BusinessParty(models.Model):
    """
    Unified commercial party model.

    This model represents:
    - customers
    - suppliers
    - parties that are both customer and supplier
    - other business contacts

    Tenant isolation:
    Every record belongs to exactly one company.
    The company must be assigned by backend services/views from request.company,
    not from frontend-provided company_id.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="business_parties",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="business_parties",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
        help_text="Optional branch. Must belong to the same company.",
    )

    party_type = models.CharField(
        max_length=30,
        choices=BusinessPartyType.choices,
        default=BusinessPartyType.CUSTOMER,
        db_index=True,
        verbose_name="Party type",
    )
    party_kind = models.CharField(
        max_length=30,
        choices=BusinessPartyKind.choices,
        default=BusinessPartyKind.INDIVIDUAL,
        db_index=True,
        verbose_name="Party kind",
    )
    status = models.CharField(
        max_length=30,
        choices=BusinessPartyStatus.choices,
        default=BusinessPartyStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    code = models.CharField(
        max_length=60,
        blank=True,
        db_index=True,
        verbose_name="Code",
        help_text="Unique party code inside the same company when provided.",
    )
    display_name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Display name",
    )
    legal_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Legal name",
    )

    contact_person = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Contact person",
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
    email = models.EmailField(
        blank=True,
        db_index=True,
        verbose_name="Email",
    )
    website = models.URLField(
        blank=True,
        verbose_name="Website",
    )

    commercial_registration = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Commercial registration",
    )
    vat_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="VAT number",
    )
    national_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="National ID / Iqama",
    )

    country = models.CharField(
        max_length=100,
        default="Saudi Arabia",
        verbose_name="Country",
    )
    city = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        verbose_name="City",
    )
    district = models.CharField(
        max_length=120,
        blank=True,
        verbose_name="District",
    )
    street = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Street",
    )
    building_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Building number",
    )
    additional_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Additional number",
    )
    postal_code = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Postal code",
    )
    short_address = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Saudi short address",
    )
    address_line = models.TextField(
        blank=True,
        verbose_name="Address line",
    )

    credit_limit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Credit limit",
    )
    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Opening balance",
        help_text="Positive means party owes the company. Negative means company owes the party.",
    )
    opening_balance_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Opening balance date",
    )

    payment_terms_days = models.PositiveIntegerField(
        default=0,
        verbose_name="Payment terms days",
    )
    tax_exempt = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Tax exempt",
    )

    blocked_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Blocked at",
    )
    blocked_reason = models.TextField(
        blank=True,
        verbose_name="Blocked reason",
    )
    archived_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Archived at",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_business_parties",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_business_parties",
        verbose_name="Updated by",
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
        verbose_name = "Business party"
        verbose_name_plural = "Business parties"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_business_party_code_per_company",
                condition=~models.Q(code=""),
            ),
        ]
        indexes = [
            models.Index(fields=["company", "party_type", "status"]),
            models.Index(fields=["company", "party_kind", "status"]),
            models.Index(fields=["company", "display_name"]),
            models.Index(fields=["company", "legal_name"]),
            models.Index(fields=["company", "phone"]),
            models.Index(fields=["company", "mobile"]),
            models.Index(fields=["company", "email"]),
            models.Index(fields=["company", "vat_number"]),
            models.Index(fields=["company", "commercial_registration"]),
            models.Index(fields=["company", "city"]),
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.display_name} - {self.party_type}"

    @property
    def is_customer(self) -> bool:
        return self.party_type in [
            BusinessPartyType.CUSTOMER,
            BusinessPartyType.BOTH,
        ]

    @property
    def is_supplier(self) -> bool:
        return self.party_type in [
            BusinessPartyType.SUPPLIER,
            BusinessPartyType.BOTH,
        ]

    @property
    def is_active_party(self) -> bool:
        return self.status == BusinessPartyStatus.ACTIVE

    def clean(self) -> None:
        """
        Validate model-level tenant consistency.

        Branch is optional, but when provided it must belong to the same company.
        """
        super().clean()

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch": "Selected branch does not belong to this company.",
                    }
                )

    def activate(self, user=None) -> None:
        self.status = BusinessPartyStatus.ACTIVE
        self.blocked_at = None
        self.blocked_reason = ""
        self.archived_at = None

        if user:
            self.updated_by = user

        self.save(
            update_fields=[
                "status",
                "blocked_at",
                "blocked_reason",
                "archived_at",
                "updated_by",
                "updated_at",
            ]
        )

    def mark_inactive(self, user=None) -> None:
        self.status = BusinessPartyStatus.INACTIVE

        if user:
            self.updated_by = user

        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

    def block(self, reason: str = "", user=None) -> None:
        self.status = BusinessPartyStatus.BLOCKED
        self.blocked_at = timezone.now()
        self.blocked_reason = reason or ""

        if user:
            self.updated_by = user

        self.save(
            update_fields=[
                "status",
                "blocked_at",
                "blocked_reason",
                "updated_by",
                "updated_at",
            ]
        )

    def archive(self, user=None) -> None:
        self.status = BusinessPartyStatus.ARCHIVED
        self.archived_at = timezone.now()

        if user:
            self.updated_by = user

        self.save(
            update_fields=[
                "status",
                "archived_at",
                "updated_by",
                "updated_at",
            ]
        )
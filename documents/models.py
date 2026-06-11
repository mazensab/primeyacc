# ============================================================
# 📂 documents/models.py
# 🧠 PrimeyAcc | Documents Templates Models V1.0
# ------------------------------------------------------------
# ✅ Company document templates foundation
# ✅ Tenant-isolated templates by company
# ✅ Sales invoices / purchase bills / receipts / payments / POS receipts
# ✅ Default template per company and document type
# ✅ Audit fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل قالب مستند تابع لشركة واحدة فقط
# - لا يتم أخذ company_id من الفرونت كمصدر ثقة
# - القالب الافتراضي يكون واحد فقط لكل شركة ونوع مستند
# - هذه المرحلة تؤسس القوالب ولا تنشئ PDF بعد
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from companies.models import Company


class DocumentType(models.TextChoices):
    SALES_INVOICE = "SALES_INVOICE", "Sales invoice"
    PURCHASE_BILL = "PURCHASE_BILL", "Purchase bill"
    CUSTOMER_RECEIPT = "CUSTOMER_RECEIPT", "Customer receipt"
    SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "Supplier payment"
    JOURNAL_ENTRY = "JOURNAL_ENTRY", "Journal entry"
    POS_RECEIPT = "POS_RECEIPT", "POS receipt"


class DocumentTemplateLayout(models.TextChoices):
    STANDARD = "STANDARD", "Standard"
    COMPACT = "COMPACT", "Compact"
    MODERN = "MODERN", "Modern"
    THERMAL = "THERMAL", "Thermal"


class DocumentTemplate(models.Model):
    """
    Tenant-scoped document template.

    Each company can define multiple templates for each document type,
    but only one active default template is allowed per company and document type.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="document_templates",
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Template name",
    )

    document_type = models.CharField(
        max_length=40,
        choices=DocumentType.choices,
        db_index=True,
        verbose_name="Document type",
    )

    layout_style = models.CharField(
        max_length=30,
        choices=DocumentTemplateLayout.choices,
        default=DocumentTemplateLayout.STANDARD,
        db_index=True,
        verbose_name="Layout style",
    )

    primary_color = models.CharField(
        max_length=20,
        default="#111827",
        verbose_name="Primary color",
    )
    secondary_color = models.CharField(
        max_length=20,
        default="#6B7280",
        verbose_name="Secondary color",
    )

    show_logo = models.BooleanField(
        default=True,
        verbose_name="Show company logo",
    )
    show_qr = models.BooleanField(
        default=True,
        verbose_name="Show QR code",
    )
    show_vat_number = models.BooleanField(
        default=True,
        verbose_name="Show VAT number",
    )
    show_commercial_registration = models.BooleanField(
        default=True,
        verbose_name="Show commercial registration",
    )

    header_text = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Header text",
    )
    footer_text = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Footer text",
    )
    terms_and_conditions = models.TextField(
        blank=True,
        verbose_name="Terms and conditions",
    )

    is_default = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Default template",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
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
        related_name="created_document_templates",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_document_templates",
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
        verbose_name = "Document template"
        verbose_name_plural = "Document templates"
        ordering = ["document_type", "-is_default", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "document_type", "name"],
                name="unique_company_document_template_name",
            ),
            models.UniqueConstraint(
                fields=["company", "document_type"],
                condition=Q(is_default=True),
                name="unique_default_document_template_per_type",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "document_type"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "document_type", "is_default"]),
            models.Index(fields=["layout_style"]),
        ]

    def __str__(self) -> str:
        return f"{self.company.display_name} - {self.document_type} - {self.name}"

    def clean(self) -> None:
        super().clean()

        if self.is_default and not self.is_active:
            raise ValidationError(
                {
                    "is_default": "Inactive template cannot be the default template.",
                }
            )
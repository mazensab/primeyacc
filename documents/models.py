# ============================================================
# 📂 documents/models.py
# 🧠 Mhamcloud | Documents Templates Models V1.0
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
# V2-25F operational document foundation.
class DocumentSequenceScope(models.TextChoices):
    COMPANY = "COMPANY", "Company"
    BRANCH = "BRANCH", "Branch"
    REGISTER = "REGISTER", "POS register"

class DocumentSequence(models.Model):
    company=models.ForeignKey(Company,on_delete=models.CASCADE,related_name="document_sequences")
    branch=models.ForeignKey("companies.Branch",on_delete=models.PROTECT,related_name="document_sequences",blank=True,null=True)
    register=models.ForeignKey("pos.POSRegister",on_delete=models.PROTECT,related_name="document_sequences",blank=True,null=True)
    key=models.CharField(max_length=80,db_index=True)
    scope=models.CharField(max_length=20,choices=DocumentSequenceScope.choices,default=DocumentSequenceScope.COMPANY,db_index=True)
    scope_key=models.CharField(max_length=80,db_index=True)
    prefix=models.CharField(max_length=60,blank=True,default="")
    suffix=models.CharField(max_length=60,blank=True,default="")
    padding=models.PositiveSmallIntegerField(default=6)
    next_value=models.PositiveBigIntegerField(default=1)
    reset_yearly=models.BooleanField(default=False)
    current_year=models.PositiveSmallIntegerField(blank=True,null=True)
    is_active=models.BooleanField(default=True,db_index=True)
    extra_data=models.JSONField(default=dict,blank=True)
    created_at=models.DateTimeField(auto_now_add=True,db_index=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["company","key","scope_key"],name="unique_document_sequence_scope_key")]
        indexes=[models.Index(fields=["company","key","is_active"]),models.Index(fields=["company","branch","key"]),models.Index(fields=["company","register","key"])]
    def clean(self):
        super().clean(); self.key=str(self.key or "").strip().upper(); self.prefix=str(self.prefix or "").strip().upper(); self.suffix=str(self.suffix or "").strip().upper(); e={}
        if not self.key:e["key"]="Sequence key is required."
        if not 1<=self.padding<=18:e["padding"]="Padding must be between 1 and 18."
        if self.next_value<1:e["next_value"]="Next value must be positive."
        if self.scope==DocumentSequenceScope.COMPANY:
            if self.branch_id or self.register_id:e["scope"]="Company sequence cannot have branch/register."
            self.scope_key="COMPANY"
        elif self.scope==DocumentSequenceScope.BRANCH:
            if not self.branch_id or self.register_id:e["scope"]="Branch sequence requires branch only."
            elif self.branch.company_id!=self.company_id:e["branch"]="Branch must belong to company."
            else:self.scope_key=f"BRANCH:{self.branch_id}"
        elif self.scope==DocumentSequenceScope.REGISTER:
            if not self.register_id:e["scope"]="Register is required."
            elif self.register.company_id!=self.company_id:e["register"]="Register must belong to company."
            else:self.branch=self.register.branch;self.scope_key=f"REGISTER:{self.register_id}"
        else:e["scope"]="Invalid scope."
        if e:raise ValidationError(e)
    def save(self,*a,**k): self.full_clean(); return super().save(*a,**k)

class PrintProfile(models.Model):
    company=models.ForeignKey(Company,on_delete=models.CASCADE,related_name="print_profiles")
    branch=models.ForeignKey("companies.Branch",on_delete=models.PROTECT,related_name="print_profiles",blank=True,null=True)
    register=models.ForeignKey("pos.POSRegister",on_delete=models.PROTECT,related_name="print_profiles",blank=True,null=True)
    template=models.ForeignKey(DocumentTemplate,on_delete=models.PROTECT,related_name="print_profiles",blank=True,null=True)
    name=models.CharField(max_length=150,db_index=True)
    document_type=models.CharField(max_length=40,choices=DocumentType.choices,db_index=True)
    output_format=models.CharField(max_length=20,default="WEB_PRINT")
    paper_size=models.CharField(max_length=20,default="A4")
    thermal_width=models.CharField(max_length=10,default="80MM")
    language=models.CharField(max_length=10,default="ar")
    copies=models.PositiveSmallIntegerField(default=1)
    is_default=models.BooleanField(default=False,db_index=True)
    is_active=models.BooleanField(default=True,db_index=True)
    settings_data=models.JSONField(default=dict,blank=True)
    created_at=models.DateTimeField(auto_now_add=True,db_index=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["company","document_type","name"],name="unique_company_print_profile_name")]
        indexes=[models.Index(fields=["company","document_type","is_active"]),models.Index(fields=["company","branch","document_type"]),models.Index(fields=["company","register","document_type"])]
    def clean(self):
        super().clean(); e={}; self.name=str(self.name or "").strip(); self.output_format=str(self.output_format or "").strip().upper(); self.thermal_width=str(self.thermal_width or "").strip().upper()
        if not self.name:e["name"]="Name is required."
        if self.output_format not in {"PAYLOAD","WEB_PRINT","THERMAL","PDF"}:e["output_format"]="Invalid output format."
        if self.thermal_width not in {"58MM","80MM"}:e["thermal_width"]="Invalid thermal width."
        if self.branch_id and self.branch.company_id!=self.company_id:e["branch"]="Branch must belong to company."
        if self.register_id and self.register.company_id!=self.company_id:e["register"]="Register must belong to company."
        if self.template_id and (self.template.company_id!=self.company_id or self.template.document_type!=self.document_type):e["template"]="Template scope/type mismatch."
        if e:raise ValidationError(e)
    def save(self,*a,**k):
        self.full_clean()
        if self.is_default: PrintProfile.objects.filter(company=self.company,document_type=self.document_type,branch=self.branch,register=self.register,is_default=True).exclude(pk=self.pk).update(is_default=False)
        return super().save(*a,**k)

# ============================================================
# 📂 billing/models.py
# 🧠 PrimeyAcc | Platform Billing Documents Models V1.1
# ------------------------------------------------------------
# ✅ Platform subscription invoices
# ✅ Platform subscription payment receipts
# ✅ Safe yearly document numbering
# ✅ Immutable seller / buyer / subscription / payment snapshots
# ✅ Stored printable payload
# ✅ Complete separation from company documents and payments
# ✅ Duplicate document protection per subscription and type
# ✅ Database-safe constraint and index names
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - billing يخص فوترة مالك منصة PrimeyAcc داخل /system فقط
# - لا يستخدم payments/models.py لأنها تخص مدفوعات الشركات
# - لا يستخدم documents/models.py لأنها تخص قوالب مستندات الشركات
# - Company هنا هي الجهة المشتركة المستفيدة وليست مالك المستند
# - بيانات البائع والمشتري تحفظ Snapshot وقت إصدار المستند
# - الطباعة تعتمد على printable_payload المحفوظ وليس البيانات الحية
# - كل اشتراك يملك فاتورة منصة واحدة وإيصال دفع واحد كحد أقصى
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


ZERO_MONEY = Decimal("0.00")
MONEY_QUANTIZER = Decimal("0.01")


def money(value: Decimal | int | str | None) -> Decimal:
    """
    Normalize monetary values to two decimal places.

    This helper performs formatting only and must not contain
    subscription pricing or tax calculation logic.
    """

    if value in {None, ""}:
        value = ZERO_MONEY

    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError("القيمة المالية غير صحيحة.") from exc

    return decimal_value.quantize(
        MONEY_QUANTIZER,
        rounding=ROUND_HALF_UP,
    )


def validate_json_object(value: Any, field_name: str) -> None:
    """
    Ensure a JSON snapshot is stored as an object, not a list or scalar.
    """

    if value is None:
        return

    if not isinstance(value, dict):
        raise ValidationError(
            {
                field_name: "يجب أن تكون بيانات Snapshot كائن JSON.",
            }
        )


class PlatformBillingDocumentType(models.TextChoices):
    """
    Platform-owned billing document types.

    These values must never be mixed with documents.DocumentType,
    which belongs to tenant companies.
    """

    SUBSCRIPTION_INVOICE = (
        "SUBSCRIPTION_INVOICE",
        "Subscription invoice",
    )
    PAYMENT_RECEIPT = (
        "PAYMENT_RECEIPT",
        "Payment receipt",
    )


class PlatformBillingDocumentStatus(models.TextChoices):
    """
    Shared lifecycle statuses for platform billing documents.
    """

    DRAFT = "DRAFT", "Draft"
    ISSUED = "ISSUED", "Issued"
    PAID = "PAID", "Paid"
    CANCELLED = "CANCELLED", "Cancelled"


class PlatformDocumentSequence(models.Model):
    """
    Yearly sequence for platform billing document numbers.

    The sequence belongs to the platform globally and is not scoped
    by a tenant company.

    Number generation must be performed by a service using:
    - transaction.atomic()
    - select_for_update()

    Examples:
    - PINV-2026-000001
    - PREC-2026-000001
    """

    document_type = models.CharField(
        max_length=40,
        choices=PlatformBillingDocumentType.choices,
        db_index=True,
        verbose_name="نوع المستند",
    )
    year = models.PositiveSmallIntegerField(
        db_index=True,
        verbose_name="السنة",
    )
    prefix = models.CharField(
        max_length=20,
        verbose_name="بادئة الترقيم",
        help_text="مثل PINV لفاتورة المنصة وPREC لإيصال الدفع.",
    )
    last_number = models.PositiveBigIntegerField(
        default=0,
        verbose_name="آخر رقم مستخدم",
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
        verbose_name = "تسلسل مستند منصة"
        verbose_name_plural = "تسلسلات مستندات المنصة"
        ordering = ["-year", "document_type"]
        constraints = [
            models.UniqueConstraint(
                fields=["document_type", "year"],
                name="billing_seq_type_year_uniq",
            ),
            models.CheckConstraint(
                condition=Q(year__gte=2000),
                name="billing_seq_year_valid",
            ),
        ]
        indexes = [
            models.Index(
                fields=["document_type", "year"],
                name="billing_seq_type_year_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.document_type} - {self.year} - {self.last_number}"

    def clean(self) -> None:
        super().clean()

        self.prefix = str(self.prefix or "").strip().upper()

        if not self.prefix:
            raise ValidationError(
                {
                    "prefix": "بادئة ترقيم المستند مطلوبة.",
                }
            )

        if not self.prefix.replace("-", "").isalnum():
            raise ValidationError(
                {
                    "prefix": (
                        "بادئة الترقيم يجب أن تحتوي على أحرف أو أرقام فقط."
                    )
                }
            )

        if self.year and self.year < 2000:
            raise ValidationError(
                {
                    "year": "السنة غير صحيحة.",
                }
            )

    def save(self, *args, **kwargs):
        self.prefix = str(self.prefix or "").strip().upper()
        self.full_clean()
        return super().save(*args, **kwargs)


class PlatformBillingDocument(models.Model):
    """
    Platform-owned subscription invoice or payment receipt.

    Important:
    - company and subscription are operational references.
    - seller_snapshot and buyer_snapshot are the legal document source.
    - printable_payload is the stable payload used by frontend printing
      and future PDF generation.
    """

    document_type = models.CharField(
        max_length=40,
        choices=PlatformBillingDocumentType.choices,
        db_index=True,
        verbose_name="نوع المستند",
    )
    status = models.CharField(
        max_length=20,
        choices=PlatformBillingDocumentStatus.choices,
        default=PlatformBillingDocumentStatus.ISSUED,
        db_index=True,
        verbose_name="حالة المستند",
    )

    document_number = models.CharField(
        max_length=80,
        unique=True,
        db_index=True,
        verbose_name="رقم المستند",
    )
    sequence_number = models.PositiveBigIntegerField(
        verbose_name="الرقم التسلسلي",
    )
    sequence_year = models.PositiveSmallIntegerField(
        db_index=True,
        verbose_name="سنة التسلسل",
    )
    sequence_prefix = models.CharField(
        max_length=20,
        verbose_name="بادئة التسلسل",
    )

    subscription = models.ForeignKey(
        "subscriptions.CompanySubscription",
        on_delete=models.PROTECT,
        related_name="platform_billing_documents",
        verbose_name="الاشتراك",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="platform_billing_documents",
        verbose_name="الشركة المستفيدة",
    )
    related_invoice = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="payment_receipts",
        limit_choices_to={
            "document_type": PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        },
        verbose_name="الفاتورة المرتبطة",
        help_text="يستخدم في إيصال الدفع لربطه بفاتورة الاشتراك.",
    )

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        db_index=True,
        verbose_name="رمز العملة",
    )

    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="المجموع قبل الخصم",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="قيمة الخصم",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="المبلغ الخاضع للضريبة",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="قيمة الضريبة",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="إجمالي المستند",
    )
    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="المبلغ المدفوع",
    )
    balance_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="المبلغ المتبقي",
    )

    billing_reference = models.CharField(
        max_length=160,
        blank=True,
        db_index=True,
        verbose_name="مرجع الفوترة",
    )
    transaction_reference = models.CharField(
        max_length=160,
        blank=True,
        db_index=True,
        verbose_name="مرجع عملية الدفع",
    )
    payment_method = models.CharField(
        max_length=80,
        blank=True,
        db_index=True,
        verbose_name="طريقة الدفع",
        help_text=(
            "وصف طريقة دفع اشتراك المنصة، ولا يرتبط "
            "بـ CompanyPaymentMethod."
        ),
    )

    seller_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Snapshot بيانات البائع",
    )
    buyer_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Snapshot بيانات المشتري",
    )
    subscription_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Snapshot بيانات الاشتراك",
    )
    plan_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Snapshot بيانات الباقة",
    )
    payment_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Snapshot بيانات الدفع",
    )
    printable_payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="بيانات الطباعة الثابتة",
        help_text=(
            "النسخة الثابتة التي تعتمد عليها الطباعة "
            "وتوليد PDF مستقبلًا."
        ),
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="بيانات إضافية",
    )

    issue_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="تاريخ الإصدار",
    )
    issued_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name="وقت الإصدار",
    )
    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="وقت الدفع",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="وقت الإلغاء",
    )
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name="سبب الإلغاء",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="ملاحظات",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_platform_billing_documents",
        verbose_name="أنشئ بواسطة",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_platform_billing_documents",
        verbose_name="ألغي بواسطة",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="تاريخ الإنشاء",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="آخر تحديث",
    )

    class Meta:
        verbose_name = "مستند فوترة منصة"
        verbose_name_plural = "مستندات فوترة المنصة"
        ordering = ["-issued_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "document_type"],
                name="billing_doc_sub_type_uniq",
            ),
            models.UniqueConstraint(
                fields=[
                    "document_type",
                    "sequence_year",
                    "sequence_number",
                ],
                name="billing_doc_seq_number_uniq",
            ),
            models.CheckConstraint(
                condition=Q(sequence_year__gte=2000),
                name="billing_doc_year_valid",
            ),
            models.CheckConstraint(
                condition=Q(subtotal__gte=0),
                name="billing_doc_subtotal_gte_zero",
            ),
            models.CheckConstraint(
                condition=Q(discount_amount__gte=0),
                name="billing_doc_discount_gte_zero",
            ),
            models.CheckConstraint(
                condition=Q(taxable_amount__gte=0),
                name="billing_doc_taxable_gte_zero",
            ),
            models.CheckConstraint(
                condition=Q(tax_amount__gte=0),
                name="billing_doc_tax_gte_zero",
            ),
            models.CheckConstraint(
                condition=Q(total_amount__gte=0),
                name="billing_doc_total_gte_zero",
            ),
            models.CheckConstraint(
                condition=Q(paid_amount__gte=0),
                name="billing_doc_paid_gte_zero",
            ),
            models.CheckConstraint(
                condition=Q(balance_amount__gte=0),
                name="billing_doc_balance_gte_zero",
            ),
        ]
        indexes = [
            models.Index(
                fields=["document_type", "status"],
                name="billing_doc_type_status_idx",
            ),
            models.Index(
                fields=["company", "document_type"],
                name="billing_doc_company_type_idx",
            ),
            models.Index(
                fields=["subscription", "document_type"],
                name="billing_doc_sub_type_idx",
            ),
            models.Index(
                fields=["issue_date", "document_type"],
                name="billing_doc_date_type_idx",
            ),
            models.Index(
                fields=["billing_reference"],
                name="billing_doc_bill_ref_idx",
            ),
            models.Index(
                fields=["transaction_reference"],
                name="billing_doc_tx_ref_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.document_number} - {self.document_type}"

    @property
    def is_invoice(self) -> bool:
        return (
            self.document_type
            == PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
        )

    @property
    def is_payment_receipt(self) -> bool:
        return (
            self.document_type
            == PlatformBillingDocumentType.PAYMENT_RECEIPT
        )

    @property
    def is_cancelled(self) -> bool:
        return self.status == PlatformBillingDocumentStatus.CANCELLED

    @property
    def is_paid(self) -> bool:
        return self.status == PlatformBillingDocumentStatus.PAID

    @property
    def expected_taxable_amount(self) -> Decimal:
        """
        Amount after discount and before tax.
        """

        return money(
            max(
                money(self.subtotal) - money(self.discount_amount),
                ZERO_MONEY,
            )
        )

    @property
    def expected_total_amount(self) -> Decimal:
        """
        Taxable amount plus tax.
        """

        return money(
            money(self.taxable_amount) + money(self.tax_amount)
        )

    @property
    def expected_balance_amount(self) -> Decimal:
        """
        Remaining amount after payment.
        """

        return money(
            max(
                money(self.total_amount) - money(self.paid_amount),
                ZERO_MONEY,
            )
        )

    def clean(self) -> None:
        super().clean()

        self.document_number = str(
            self.document_number or ""
        ).strip().upper()
        self.sequence_prefix = str(
            self.sequence_prefix or ""
        ).strip().upper()
        self.currency_code = str(
            self.currency_code or "SAR"
        ).strip().upper()
        self.billing_reference = str(
            self.billing_reference or ""
        ).strip()
        self.transaction_reference = str(
            self.transaction_reference or ""
        ).strip()
        self.payment_method = str(
            self.payment_method or ""
        ).strip()

        if not self.document_number:
            raise ValidationError(
                {
                    "document_number": "رقم المستند مطلوب.",
                }
            )

        if not self.sequence_prefix:
            raise ValidationError(
                {
                    "sequence_prefix": "بادئة تسلسل المستند مطلوبة.",
                }
            )

        if not self.currency_code:
            raise ValidationError(
                {
                    "currency_code": "رمز العملة مطلوب.",
                }
            )

        if self.sequence_year and self.sequence_year < 2000:
            raise ValidationError(
                {
                    "sequence_year": "سنة تسلسل المستند غير صحيحة.",
                }
            )

        if self.subscription_id and self.company_id:
            subscription_company_id = getattr(
                self.subscription,
                "company_id",
                None,
            )

            if (
                subscription_company_id
                and subscription_company_id != self.company_id
            ):
                raise ValidationError(
                    {
                        "company": (
                            "الشركة يجب أن تكون هي نفس الشركة "
                            "المرتبطة بالاشتراك."
                        )
                    }
                )

        snapshots = {
            "seller_snapshot": self.seller_snapshot,
            "buyer_snapshot": self.buyer_snapshot,
            "subscription_snapshot": self.subscription_snapshot,
            "plan_snapshot": self.plan_snapshot,
            "payment_snapshot": self.payment_snapshot,
            "printable_payload": self.printable_payload,
            "metadata": self.metadata,
        }

        for field_name, value in snapshots.items():
            validate_json_object(value, field_name)

        monetary_fields = {
            "subtotal": self.subtotal,
            "discount_amount": self.discount_amount,
            "taxable_amount": self.taxable_amount,
            "tax_amount": self.tax_amount,
            "total_amount": self.total_amount,
            "paid_amount": self.paid_amount,
            "balance_amount": self.balance_amount,
        }

        for field_name, value in monetary_fields.items():
            normalized_value = money(value)

            if normalized_value < ZERO_MONEY:
                raise ValidationError(
                    {
                        field_name: (
                            "القيمة المالية لا يمكن أن تكون أقل من صفر."
                        )
                    }
                )

        if money(self.discount_amount) > money(self.subtotal):
            raise ValidationError(
                {
                    "discount_amount": (
                        "قيمة الخصم لا يمكن أن تتجاوز المجموع."
                    )
                }
            )

        if money(self.taxable_amount) != self.expected_taxable_amount:
            raise ValidationError(
                {
                    "taxable_amount": (
                        "المبلغ الخاضع للضريبة يجب أن يساوي "
                        "المجموع بعد الخصم."
                    )
                }
            )

        if money(self.total_amount) != self.expected_total_amount:
            raise ValidationError(
                {
                    "total_amount": (
                        "إجمالي المستند يجب أن يساوي المبلغ "
                        "الخاضع للضريبة مضافًا إليه الضريبة."
                    )
                }
            )

        if money(self.paid_amount) > money(self.total_amount):
            raise ValidationError(
                {
                    "paid_amount": (
                        "المبلغ المدفوع لا يمكن أن يتجاوز "
                        "إجمالي المستند."
                    )
                }
            )

        if money(self.balance_amount) != self.expected_balance_amount:
            raise ValidationError(
                {
                    "balance_amount": (
                        "المبلغ المتبقي يجب أن يساوي الإجمالي "
                        "ناقص المبلغ المدفوع."
                    )
                }
            )

        if self.document_type == (
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
        ):
            self._validate_invoice()

        elif self.document_type == (
            PlatformBillingDocumentType.PAYMENT_RECEIPT
        ):
            self._validate_payment_receipt()

        if self.status == PlatformBillingDocumentStatus.CANCELLED:
            if not self.cancelled_at:
                raise ValidationError(
                    {
                        "cancelled_at": (
                            "وقت الإلغاء مطلوب للمستند الملغي."
                        )
                    }
                )

        elif self.cancelled_at:
            raise ValidationError(
                {
                    "cancelled_at": (
                        "لا يمكن تحديد وقت الإلغاء لمستند غير ملغي."
                    )
                }
            )

        elif self.cancellation_reason:
            raise ValidationError(
                {
                    "cancellation_reason": (
                        "لا يمكن تحديد سبب إلغاء لمستند غير ملغي."
                    )
                }
            )

        elif self.cancelled_by_id:
            raise ValidationError(
                {
                    "cancelled_by": (
                        "لا يمكن تحديد منفذ الإلغاء لمستند غير ملغي."
                    )
                }
            )

    def _validate_invoice(self) -> None:
        """
        Validate subscription invoice lifecycle.
        """

        if self.related_invoice_id:
            raise ValidationError(
                {
                    "related_invoice": (
                        "فاتورة الاشتراك لا يمكن أن ترتبط بفاتورة أخرى."
                    )
                }
            )

        if self.status == PlatformBillingDocumentStatus.PAID:
            if money(self.paid_amount) != money(self.total_amount):
                raise ValidationError(
                    {
                        "paid_amount": (
                            "الفاتورة المدفوعة يجب أن يكون "
                            "مبلغها المدفوع مساويًا لإجماليها."
                        )
                    }
                )

            if money(self.balance_amount) != ZERO_MONEY:
                raise ValidationError(
                    {
                        "balance_amount": (
                            "الفاتورة المدفوعة يجب ألا تحتوي "
                            "على مبلغ متبقٍ."
                        )
                    }
                )

            if not self.paid_at:
                raise ValidationError(
                    {
                        "paid_at": (
                            "تاريخ الدفع مطلوب عندما تكون "
                            "الفاتورة مدفوعة."
                        )
                    }
                )

        elif self.status in {
            PlatformBillingDocumentStatus.DRAFT,
            PlatformBillingDocumentStatus.ISSUED,
        }:
            if money(self.paid_amount) != ZERO_MONEY:
                raise ValidationError(
                    {
                        "paid_amount": (
                            "الفاتورة غير المدفوعة يجب أن يكون "
                            "مبلغها المدفوع صفرًا."
                        )
                    }
                )

            if self.paid_at:
                raise ValidationError(
                    {
                        "paid_at": (
                            "لا يمكن تحديد وقت دفع لفاتورة "
                            "غير مدفوعة."
                        )
                    }
                )

    def _validate_payment_receipt(self) -> None:
        """
        Validate platform payment receipt lifecycle.
        """

        if self.status not in {
            PlatformBillingDocumentStatus.ISSUED,
            PlatformBillingDocumentStatus.CANCELLED,
        }:
            raise ValidationError(
                {
                    "status": (
                        "إيصال الدفع يستخدم حالة ISSUED أو CANCELLED فقط."
                    )
                }
            )

        if not self.related_invoice_id:
            raise ValidationError(
                {
                    "related_invoice": (
                        "إيصال الدفع يجب أن يرتبط بفاتورة اشتراك."
                    )
                }
            )

        if self.related_invoice_id == self.pk:
            raise ValidationError(
                {
                    "related_invoice": (
                        "لا يمكن أن يرتبط المستند بنفسه."
                    )
                }
            )

        related_invoice = self.related_invoice

        if related_invoice:
            if related_invoice.document_type != (
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ):
                raise ValidationError(
                    {
                        "related_invoice": (
                            "إيصال الدفع يجب أن يرتبط "
                            "بفاتورة اشتراك فقط."
                        )
                    }
                )

            if related_invoice.status == (
                PlatformBillingDocumentStatus.CANCELLED
            ):
                raise ValidationError(
                    {
                        "related_invoice": (
                            "لا يمكن إصدار إيصال دفع لفاتورة ملغاة."
                        )
                    }
                )

            if (
                self.subscription_id
                and related_invoice.subscription_id
                != self.subscription_id
            ):
                raise ValidationError(
                    {
                        "related_invoice": (
                            "الفاتورة والإيصال يجب أن يرتبطا "
                            "بنفس الاشتراك."
                        )
                    }
                )

            if (
                self.company_id
                and related_invoice.company_id != self.company_id
            ):
                raise ValidationError(
                    {
                        "related_invoice": (
                            "الفاتورة والإيصال يجب أن يكونا "
                            "للشركة نفسها."
                        )
                    }
                )

            if money(self.total_amount) != money(
                related_invoice.total_amount
            ):
                raise ValidationError(
                    {
                        "total_amount": (
                            "إجمالي إيصال الدفع يجب أن يطابق "
                            "إجمالي الفاتورة المرتبطة."
                        )
                    }
                )

        if not self.paid_at:
            raise ValidationError(
                {
                    "paid_at": "تاريخ الدفع مطلوب في إيصال الدفع.",
                }
            )

        if money(self.paid_amount) <= ZERO_MONEY:
            raise ValidationError(
                {
                    "paid_amount": (
                        "المبلغ المدفوع في إيصال الدفع "
                        "يجب أن يكون أكبر من صفر."
                    )
                }
            )

        if money(self.paid_amount) != money(self.total_amount):
            raise ValidationError(
                {
                    "paid_amount": (
                        "إيصال دفع الاشتراك يجب أن يمثل "
                        "دفع إجمالي المستند كاملًا."
                    )
                }
            )

        if money(self.balance_amount) != ZERO_MONEY:
            raise ValidationError(
                {
                    "balance_amount": (
                        "إيصال دفع الاشتراك الكامل يجب ألا "
                        "يحتوي على مبلغ متبقٍ."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.document_number = str(
            self.document_number or ""
        ).strip().upper()
        self.sequence_prefix = str(
            self.sequence_prefix or ""
        ).strip().upper()
        self.currency_code = str(
            self.currency_code or "SAR"
        ).strip().upper()

        self.subtotal = money(self.subtotal)
        self.discount_amount = money(self.discount_amount)
        self.taxable_amount = money(self.taxable_amount)
        self.tax_amount = money(self.tax_amount)
        self.total_amount = money(self.total_amount)
        self.paid_amount = money(self.paid_amount)
        self.balance_amount = money(self.balance_amount)

        self.full_clean()
        return super().save(*args, **kwargs)

    def mark_paid(
        self,
        *,
        paid_at=None,
        billing_reference: str = "",
        transaction_reference: str = "",
        payment_method: str = "",
        payment_snapshot: dict[str, Any] | None = None,
        save: bool = True,
    ) -> None:
        """
        Mark a subscription invoice as fully paid.

        This method does not create a payment receipt.
        Receipt creation belongs to billing services.
        """

        if not self.is_invoice:
            raise ValidationError(
                {
                    "document_type": (
                        "يمكن تعليم فواتير الاشتراك فقط كمدفوعة."
                    )
                }
            )

        if self.is_cancelled:
            raise ValidationError(
                {
                    "status": (
                        "لا يمكن تعليم مستند ملغي كمدفوع."
                    )
                }
            )

        self.status = PlatformBillingDocumentStatus.PAID
        self.paid_amount = money(self.total_amount)
        self.balance_amount = ZERO_MONEY
        self.paid_at = paid_at or timezone.now()

        if billing_reference:
            self.billing_reference = str(
                billing_reference
            ).strip()

        if transaction_reference:
            self.transaction_reference = str(
                transaction_reference
            ).strip()

        if payment_method:
            self.payment_method = str(payment_method).strip()

        if payment_snapshot is not None:
            validate_json_object(
                payment_snapshot,
                "payment_snapshot",
            )
            self.payment_snapshot = payment_snapshot

        if save:
            self.save(
                update_fields=[
                    "status",
                    "paid_amount",
                    "balance_amount",
                    "paid_at",
                    "billing_reference",
                    "transaction_reference",
                    "payment_method",
                    "payment_snapshot",
                    "updated_at",
                ]
            )

    def cancel(
        self,
        *,
        reason: str = "",
        cancelled_by=None,
        save: bool = True,
    ) -> None:
        """
        Cancel a platform billing document without deleting it.
        """

        if self.is_cancelled:
            return

        self.status = PlatformBillingDocumentStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancellation_reason = str(reason or "").strip()
        self.cancelled_by = cancelled_by

        if save:
            self.save(
                update_fields=[
                    "status",
                    "cancelled_at",
                    "cancellation_reason",
                    "cancelled_by",
                    "updated_at",
                ]
            )
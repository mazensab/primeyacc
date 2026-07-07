# ============================================================
# 📂 treasury/models.py
# 🧠 Mhamcloud | Treasury & Payments Models V1.1
# ------------------------------------------------------------
# ✅ Phase 11.1 Treasury Accounts Foundation
# ✅ Phase 11.2 Treasury Transactions Foundation
# ✅ Phase 11.3 Treasury APIs Foundation
# ✅ Phase 11.4 Customer & Supplier Payments Foundation
# ✅ Company-scoped cash / bank / wallet accounts
# ✅ Company-scoped treasury movement ledger
# ✅ Customer payments linked to treasury transaction
# ✅ Supplier payments linked to treasury transaction
# ✅ Safe payment status lifecycle
# ✅ Accounting-posting readiness
# ✅ Source reference readiness for sales / purchases / payments
# ------------------------------------------------------------
# القاعدة المعمارية المعتمدة:
# - كل سجل خزينة يجب أن يكون مربوطًا بشركة واحدة فقط
# - لا يتم الاعتماد على company_id القادم من الفرونت
# - خدمات /company هي المسؤولة عن تحديد الشركة من عضوية المستخدم
# - لا يسمح بخلط حسابات خزينة أو حركات أو مدفوعات بين شركات مختلفة
# - الرصيد لا يتغير من الموديل مباشرة، بل من treasury/services.py
# - لا يتم تعديل الحركات المرحلة ماليًا إلا عبر إلغاء/عكس آمن لاحقًا
# - CustomerPayment و SupplierPayment هما طبقة تشغيلية فوق TreasuryTransaction
# - هذا الملف يحتوي تعريفات البيانات فقط، أما منطق الإنشاء والترحيل في services.py
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class TreasuryAccount(models.Model):
    """
    Company-scoped treasury account.

    يمثل حساب خزينة أو بنك أو محفظة داخل شركة واحدة.
    هذا الحساب سيكون مصدر الحقيقة لحركات النقد والبنوك داخل /company.
    """

    class AccountType(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank"
        WALLET = "WALLET", "Wallet"

    class AccountStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="treasury_accounts",
    )

    accounting_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="treasury_accounts",
        help_text="Linked posting account in the company chart of accounts.",
    )

    opening_accounting_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treasury_opening_accounts",
        help_text="Auto-posted opening balance journal entry for this treasury account.",
    )
    name = models.CharField(max_length=180)
    code = models.CharField(max_length=50, blank=True)

    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.CASH,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        db_index=True,
    )

    currency = models.CharField(max_length=10, default="SAR")

    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    current_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    bank_name = models.CharField(max_length=180, blank=True)
    bank_account_number = models.CharField(max_length=80, blank=True)
    iban = models.CharField(max_length=40, blank=True)

    is_default = models.BooleanField(default=False, db_index=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_treasury_accounts",
    )
    updated_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_treasury_accounts",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "account_type", "name"]
        verbose_name = "Treasury Account"
        verbose_name_plural = "Treasury Accounts"
        indexes = [
            models.Index(fields=["company", "account_type"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "is_default"]),
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "accounting_account"]),
            models.Index(fields=["company", "opening_accounting_entry"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_treasury_account_name_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "code"],
                condition=~models.Q(code=""),
                name="unique_treasury_account_code_per_company_when_present",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.company_id}"

    @property
    def is_active(self) -> bool:
        return self.status == self.AccountStatus.ACTIVE

    def clean(self) -> None:
        super().clean()

        if self.opening_balance is None:
            self.opening_balance = Decimal("0.00")

        if self.current_balance is None:
            self.current_balance = self.opening_balance or Decimal("0.00")

        if self.opening_accounting_entry_id:
            if self.company_id and self.opening_accounting_entry.company_id != self.company_id:
                raise ValidationError(
                    {
                        "opening_accounting_entry": "Opening accounting entry must belong to the same company.",
                    }
                )
        if self.accounting_account_id:
            if self.company_id and self.accounting_account.company_id != self.company_id:
                raise ValidationError(
                    {
                        "accounting_account": "Accounting account must belong to the same company.",
                    }
                )

            if self.accounting_account.is_group:
                raise ValidationError(
                    {
                        "accounting_account": "Accounting account cannot be a group account.",
                    }
                )

            if not self.accounting_account.is_active:
                raise ValidationError(
                    {
                        "accounting_account": "Accounting account must be active.",
                    }
                )

            if not self.accounting_account.allow_manual_posting:
                raise ValidationError(
                    {
                        "accounting_account": "Accounting account must allow posting.",
                    }
                )

        if self.account_type == self.AccountType.BANK and not self.bank_name:
            raise ValidationError(
                {
                    "bank_name": "Bank name is required for bank treasury accounts.",
                }
            )

        if self.iban:
            normalized_iban = self.iban.replace(" ", "").upper()
            if len(normalized_iban) < 15:
                raise ValidationError(
                    {
                        "iban": "IBAN value is too short.",
                    }
                )
            self.iban = normalized_iban

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().upper()

        if self.currency:
            self.currency = self.currency.strip().upper()

        if self.current_balance is None:
            self.current_balance = self.opening_balance or Decimal("0.00")

        self.full_clean()
        return super().save(*args, **kwargs)


class TreasuryTransaction(models.Model):
    """
    Company-scoped treasury transaction ledger.

    يمثل كل حركة خزينة: قبض، صرف، تحويل، أو تسوية.
    الحركة لا تعتمد على الشركة من الفرونت، بل يتم ضبطها من الخدمات.
    """

    class TransactionType(models.TextChoices):
        INFLOW = "INFLOW", "Inflow"
        OUTFLOW = "OUTFLOW", "Outflow"
        TRANSFER = "TRANSFER", "Transfer"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    class TransactionStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        CANCELLED = "CANCELLED", "Cancelled"

    class SourceType(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        SALES_INVOICE = "SALES_INVOICE", "Sales Invoice"
        PURCHASE_BILL = "PURCHASE_BILL", "Purchase Bill"
        CUSTOMER_PAYMENT = "CUSTOMER_PAYMENT", "Customer Payment"
        SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "Supplier Payment"
        INVENTORY = "INVENTORY", "Inventory"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        TRANSFER = "TRANSFER", "Transfer"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="treasury_transactions",
    )

    account = models.ForeignKey(
        TreasuryAccount,
        on_delete=models.PROTECT,
        related_name="transactions",
    )

    counterparty_account = models.ForeignKey(
        TreasuryAccount,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="counterparty_transactions",
        help_text="Used for internal transfers between treasury accounts.",
    )

    transaction_number = models.CharField(max_length=80, blank=True)

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.DRAFT,
        db_index=True,
    )

    source_type = models.CharField(
        max_length=40,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
        db_index=True,
    )

    source_app = models.CharField(max_length=80, blank=True)
    source_model = models.CharField(max_length=120, blank=True)
    source_object_id = models.PositiveBigIntegerField(null=True, blank=True)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=10, default="SAR")

    transaction_date = models.DateField(default=timezone.localdate)
    reference = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    balance_before = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    balance_after = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )

    accounting_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treasury_transactions",
    )
    is_accounting_posted = models.BooleanField(default=False, db_index=True)
    accounting_posted_at = models.DateTimeField(null=True, blank=True)

    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posted_treasury_transactions",
    )

    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_treasury_transactions",
    )
    cancellation_reason = models.TextField(blank=True)

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_treasury_transactions",
    )
    updated_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_treasury_transactions",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-transaction_date", "-id"]
        verbose_name = "Treasury Transaction"
        verbose_name_plural = "Treasury Transactions"
        indexes = [
            models.Index(fields=["company", "transaction_type"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "source_type"]),
            models.Index(fields=["company", "transaction_date"]),
            models.Index(fields=["company", "transaction_number"]),
            models.Index(fields=["company", "reference"]),
            models.Index(fields=["source_app", "source_model", "source_object_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "transaction_number"],
                condition=~models.Q(transaction_number=""),
                name="unique_treasury_transaction_number_per_company_when_present",
            ),
            models.UniqueConstraint(
                fields=["company", "source_type", "source_app", "source_model", "source_object_id"],
                condition=models.Q(source_object_id__isnull=False),
                name="unique_treasury_transaction_source_per_company_when_present",
            ),
        ]

    def __str__(self) -> str:
        number = self.transaction_number or f"TX-{self.pk or 'new'}"
        return f"{number} - {self.transaction_type} - {self.amount}"

    @property
    def is_posted(self) -> bool:
        return self.status == self.TransactionStatus.POSTED

    @property
    def is_cancelled(self) -> bool:
        return self.status == self.TransactionStatus.CANCELLED

    def clean(self) -> None:
        super().clean()

        if self.amount is None or self.amount <= Decimal("0.00"):
            raise ValidationError(
                {
                    "amount": "Treasury transaction amount must be greater than zero.",
                }
            )

        if self.account_id and self.company_id and self.account.company_id != self.company_id:
            raise ValidationError(
                {
                    "account": "Treasury account must belong to the same company.",
                }
            )

        if self.counterparty_account_id:
            if not self.company_id:
                raise ValidationError(
                    {
                        "company": "Company is required before assigning a counterparty account.",
                    }
                )

            if self.counterparty_account.company_id != self.company_id:
                raise ValidationError(
                    {
                        "counterparty_account": "Counterparty account must belong to the same company.",
                    }
                )

            if self.account_id and self.counterparty_account_id == self.account_id:
                raise ValidationError(
                    {
                        "counterparty_account": "Counterparty account must be different from the main account.",
                    }
                )

        if self.transaction_type == self.TransactionType.TRANSFER and not self.counterparty_account_id:
            raise ValidationError(
                {
                    "counterparty_account": "Counterparty account is required for treasury transfers.",
                }
            )

        if self.transaction_type != self.TransactionType.TRANSFER and self.counterparty_account_id:
            raise ValidationError(
                {
                    "counterparty_account": "Counterparty account is only allowed for treasury transfers.",
                }
            )

        if self.status == self.TransactionStatus.POSTED and not self.posted_at:
            self.posted_at = timezone.now()

        if self.status == self.TransactionStatus.CANCELLED and not self.cancelled_at:
            self.cancelled_at = timezone.now()

    def save(self, *args, **kwargs):
        if self.transaction_number:
            self.transaction_number = self.transaction_number.strip().upper()

        if self.reference:
            self.reference = self.reference.strip()

        if self.currency:
            self.currency = self.currency.strip().upper()

        self.full_clean()
        return super().save(*args, **kwargs)


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
    CARD = "CARD", "Card"
    WALLET = "WALLET", "Wallet"
    CHECK = "CHECK", "Check"
    OTHER = "OTHER", "Other"


class PaymentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"


class CustomerPayment(models.Model):
    """
    Company-scoped customer payment.

    يمثل دفعة واردة من عميل.
    عند التأكيد في services.py يتم إنشاء/ربط TreasuryTransaction من نوع INFLOW.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="customer_payments",
    )

    payment_number = models.CharField(max_length=80, blank=True)

    customer_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Flexible party/customer id until parties model is finalized for direct FK.",
    )
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=50, blank=True)

    sales_invoice = models.ForeignKey(
        "sales.SalesInvoice",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="customer_payments",
    )

    treasury_account = models.ForeignKey(
        TreasuryAccount,
        on_delete=models.PROTECT,
        related_name="customer_payments",
    )

    treasury_transaction = models.OneToOneField(
        TreasuryTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_payment",
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=10, default="SAR")

    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.DRAFT,
        db_index=True,
    )

    payment_date = models.DateField(default=timezone.localdate)
    reference = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_customer_payments",
    )

    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_customer_payments",
    )
    cancellation_reason = models.TextField(blank=True)

    accounting_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_payments",
    )
    is_accounting_posted = models.BooleanField(default=False, db_index=True)
    accounting_posted_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_customer_payments",
    )
    updated_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_customer_payments",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date", "-id"]
        verbose_name = "Customer Payment"
        verbose_name_plural = "Customer Payments"
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "payment_method"]),
            models.Index(fields=["company", "payment_date"]),
            models.Index(fields=["company", "payment_number"]),
            models.Index(fields=["company", "reference"]),
            models.Index(fields=["company", "customer_id"]),
            models.Index(fields=["company", "sales_invoice"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "payment_number"],
                condition=~models.Q(payment_number=""),
                name="unique_customer_payment_number_per_company_when_present",
            ),
        ]

    def __str__(self) -> str:
        number = self.payment_number or f"CP-{self.pk or 'new'}"
        return f"{number} - {self.amount}"

    @property
    def is_confirmed(self) -> bool:
        return self.status == PaymentStatus.CONFIRMED

    @property
    def is_cancelled(self) -> bool:
        return self.status == PaymentStatus.CANCELLED

    def clean(self) -> None:
        super().clean()

        if self.amount is None or self.amount <= Decimal("0.00"):
            raise ValidationError(
                {
                    "amount": "Customer payment amount must be greater than zero.",
                }
            )

        if self.treasury_account_id and self.company_id:
            if self.treasury_account.company_id != self.company_id:
                raise ValidationError(
                    {
                        "treasury_account": "Treasury account must belong to the same company.",
                    }
                )

        if self.treasury_transaction_id and self.company_id:
            if self.treasury_transaction.company_id != self.company_id:
                raise ValidationError(
                    {
                        "treasury_transaction": "Treasury transaction must belong to the same company.",
                    }
                )

            if self.treasury_transaction.transaction_type != TreasuryTransaction.TransactionType.INFLOW:
                raise ValidationError(
                    {
                        "treasury_transaction": "Customer payment must be linked to an inflow treasury transaction.",
                    }
                )

        if self.sales_invoice_id and self.company_id:
            if self.sales_invoice.company_id != self.company_id:
                raise ValidationError(
                    {
                        "sales_invoice": "Sales invoice must belong to the same company.",
                    }
                )

        if self.status == PaymentStatus.CONFIRMED and not self.confirmed_at:
            self.confirmed_at = timezone.now()

        if self.status == PaymentStatus.CANCELLED and not self.cancelled_at:
            self.cancelled_at = timezone.now()

    def save(self, *args, **kwargs):
        if self.payment_number:
            self.payment_number = self.payment_number.strip().upper()

        if self.reference:
            self.reference = self.reference.strip()

        if self.currency:
            self.currency = self.currency.strip().upper()

        self.full_clean()
        return super().save(*args, **kwargs)


class SupplierPayment(models.Model):
    """
    Company-scoped supplier payment.

    يمثل دفعة صادرة لمورد.
    عند التأكيد في services.py يتم إنشاء/ربط TreasuryTransaction من نوع OUTFLOW.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="supplier_payments",
    )

    payment_number = models.CharField(max_length=80, blank=True)

    supplier_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Flexible party/supplier id until parties model is finalized for direct FK.",
    )
    supplier_name = models.CharField(max_length=255, blank=True)
    supplier_phone = models.CharField(max_length=50, blank=True)

    purchase_bill = models.ForeignKey(
        "purchases.PurchaseBill",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="supplier_payments",
    )

    treasury_account = models.ForeignKey(
        TreasuryAccount,
        on_delete=models.PROTECT,
        related_name="supplier_payments",
    )

    treasury_transaction = models.OneToOneField(
        TreasuryTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payment",
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=10, default="SAR")

    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.DRAFT,
        db_index=True,
    )

    payment_date = models.DateField(default=timezone.localdate)
    reference = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_supplier_payments",
    )

    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_supplier_payments",
    )
    cancellation_reason = models.TextField(blank=True)

    accounting_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payments",
    )
    is_accounting_posted = models.BooleanField(default=False, db_index=True)
    accounting_posted_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_supplier_payments",
    )
    updated_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_supplier_payments",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date", "-id"]
        verbose_name = "Supplier Payment"
        verbose_name_plural = "Supplier Payments"
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "payment_method"]),
            models.Index(fields=["company", "payment_date"]),
            models.Index(fields=["company", "payment_number"]),
            models.Index(fields=["company", "reference"]),
            models.Index(fields=["company", "supplier_id"]),
            models.Index(fields=["company", "purchase_bill"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "payment_number"],
                condition=~models.Q(payment_number=""),
                name="unique_supplier_payment_number_per_company_when_present",
            ),
        ]

    def __str__(self) -> str:
        number = self.payment_number or f"SP-{self.pk or 'new'}"
        return f"{number} - {self.amount}"

    @property
    def is_confirmed(self) -> bool:
        return self.status == PaymentStatus.CONFIRMED

    @property
    def is_cancelled(self) -> bool:
        return self.status == PaymentStatus.CANCELLED

    def clean(self) -> None:
        super().clean()

        if self.amount is None or self.amount <= Decimal("0.00"):
            raise ValidationError(
                {
                    "amount": "Supplier payment amount must be greater than zero.",
                }
            )

        if self.treasury_account_id and self.company_id:
            if self.treasury_account.company_id != self.company_id:
                raise ValidationError(
                    {
                        "treasury_account": "Treasury account must belong to the same company.",
                    }
                )

        if self.treasury_transaction_id and self.company_id:
            if self.treasury_transaction.company_id != self.company_id:
                raise ValidationError(
                    {
                        "treasury_transaction": "Treasury transaction must belong to the same company.",
                    }
                )

            if self.treasury_transaction.transaction_type != TreasuryTransaction.TransactionType.OUTFLOW:
                raise ValidationError(
                    {
                        "treasury_transaction": "Supplier payment must be linked to an outflow treasury transaction.",
                    }
                )

        if self.purchase_bill_id and self.company_id:
            if self.purchase_bill.company_id != self.company_id:
                raise ValidationError(
                    {
                        "purchase_bill": "Purchase bill must belong to the same company.",
                    }
                )

        if self.status == PaymentStatus.CONFIRMED and not self.confirmed_at:
            self.confirmed_at = timezone.now()

        if self.status == PaymentStatus.CANCELLED and not self.cancelled_at:
            self.cancelled_at = timezone.now()

    def save(self, *args, **kwargs):
        if self.payment_number:
            self.payment_number = self.payment_number.strip().upper()

        if self.reference:
            self.reference = self.reference.strip()

        if self.currency:
            self.currency = self.currency.strip().upper()

        self.full_clean()
        return super().save(*args, **kwargs)
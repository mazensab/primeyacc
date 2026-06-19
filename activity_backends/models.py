# ============================================================
# ًں“‚ activity_backends/models.py
# ًں§  PrimeyAcc | Activity-Specific Backend Models â€” Phase 25.3
# ============================================================
# âœ… Restaurant tables, menu categories/items, kitchen orders
# âœ… Clinic patients, services and appointments
# âœ… Contracting projects, work orders and cost lines
# âœ… Company-scoped tenant isolation
# âœ… Lightweight foundations without touching core apps
# ============================================================
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظƒظ„ ط³ط¬ظ„ ظ…ط±طھط¨ط· ط¨ط´ط±ظƒط© ظˆط§ط­ط¯ط© ظپظ‚ط·.
# - ظ„ط§ ظ†ط«ظ‚ ط¨ط£ظٹ company_id ظ‚ط§ط¯ظ… ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط©.
# - ظ„ط§ ظ†ط¶ط¹ ظ…ظ†ط·ظ‚ ظ…ط­ط§ط³ط¨ظٹ ط£ظˆ ظ…ط®ط²ظ†ظٹ ط«ظ‚ظٹظ„ ط¯ط§ط®ظ„ models.py.
# - ظ‡ط°ظ‡ foundation ظ„ظ„ظ†ط´ط§ط·ط§طھ ط§ظ„ظ…طھط®طµطµط© ظˆطھطھظƒط§ظ…ظ„ ظ„ط§ط­ظ‚ط§ ط¹ط¨ط± services.
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


MONEY_ZERO = Decimal("0.00")
QTY_ZERO = Decimal("0.0000")


def quant_money(value) -> Decimal:
    if value in [None, ""]:
        value = MONEY_ZERO
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def quant_qty(value) -> Decimal:
    if value in [None, ""]:
        value = QTY_ZERO
    return Decimal(str(value)).quantize(Decimal("0.0000"), rounding=ROUND_HALF_UP)


class RestaurantTableStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    OCCUPIED = "OCCUPIED", "Occupied"
    RESERVED = "RESERVED", "Reserved"
    INACTIVE = "INACTIVE", "Inactive"


class RestaurantKitchenOrderStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SENT = "SENT", "Sent to kitchen"
    PREPARING = "PREPARING", "Preparing"
    READY = "READY", "Ready"
    SERVED = "SERVED", "Served"
    CANCELLED = "CANCELLED", "Cancelled"


class RestaurantMenuCategory(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="restaurant_menu_categories",
        db_index=True,
    )
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=160, db_index=True)
    name_ar = models.CharField(max_length=160, blank=True, default="")
    name_en = models.CharField(max_length=160, blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "sort_order", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_restaurant_menu_category_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_restaurant_menu_category_name_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "sort_order"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    @property
    def display_name(self) -> str:
        return self.name_ar or self.name_en or self.name

    def clean(self) -> None:
        super().clean()
        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()
        if not self.code:
            raise ValidationError({"code": "Category code is required."})
        if not self.name:
            self.name = self.name_ar or self.name_en
        if not self.name:
            raise ValidationError({"name": "Category name is required."})


class RestaurantMenuItem(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="restaurant_menu_items",
        db_index=True,
    )
    category = models.ForeignKey(
        RestaurantMenuCategory,
        on_delete=models.SET_NULL,
        related_name="menu_items",
        blank=True,
        null=True,
        db_index=True,
    )
    catalog_item_id = models.PositiveBigIntegerField(blank=True, null=True, db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=220, db_index=True)
    name_ar = models.CharField(max_length=220, blank=True, default="")
    name_en = models.CharField(max_length=220, blank=True, default="")
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    taxable = models.BooleanField(default=True)
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    kitchen_station = models.CharField(max_length=120, blank=True, default="", db_index=True)
    is_available = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "sort_order", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_restaurant_menu_item_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "category"]),
            models.Index(fields=["company", "is_available"]),
            models.Index(fields=["company", "kitchen_station"]),
            models.Index(fields=["company", "catalog_item_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    @property
    def display_name(self) -> str:
        return self.name_ar or self.name_en or self.name

    def clean(self) -> None:
        super().clean()
        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()
        self.description = (self.description or "").strip()
        self.kitchen_station = (self.kitchen_station or "").strip()
        self.price = quant_money(self.price)
        self.tax_rate = quant_money(self.tax_rate)
        if not self.code:
            raise ValidationError({"code": "Menu item code is required."})
        if not self.name:
            self.name = self.name_ar or self.name_en
        if not self.name:
            raise ValidationError({"name": "Menu item name is required."})
        if self.category_id and self.company_id and self.category.company_id != self.company_id:
            raise ValidationError({"category": "Category must belong to the same company."})


class RestaurantTable(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="restaurant_tables",
        db_index=True,
    )
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=120, db_index=True)
    area = models.CharField(max_length=120, blank=True, default="", db_index=True)
    capacity = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=RestaurantTableStatus.choices,
        default=RestaurantTableStatus.AVAILABLE,
        db_index=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "area", "code", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_restaurant_table_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "area"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    def clean(self) -> None:
        super().clean()
        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.area = (self.area or "").strip()
        if not self.code:
            raise ValidationError({"code": "Table code is required."})
        if not self.name:
            raise ValidationError({"name": "Table name is required."})
        if self.capacity <= 0:
            raise ValidationError({"capacity": "Capacity must be greater than zero."})


class RestaurantKitchenOrder(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="restaurant_kitchen_orders",
        db_index=True,
    )
    table = models.ForeignKey(
        RestaurantTable,
        on_delete=models.SET_NULL,
        related_name="kitchen_orders",
        blank=True,
        null=True,
        db_index=True,
    )
    order_number = models.CharField(max_length=80, db_index=True)
    order_date = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=RestaurantKitchenOrderStatus.choices,
        default=RestaurantKitchenOrderStatus.DRAFT,
        db_index=True,
    )
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "-order_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "order_number"],
                name="unique_restaurant_kitchen_order_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "order_date"]),
            models.Index(fields=["company", "table"]),
        ]

    def __str__(self) -> str:
        return self.order_number

    def clean(self) -> None:
        super().clean()
        self.order_number = (self.order_number or "").strip().upper()
        self.subtotal = quant_money(self.subtotal)
        self.tax_amount = quant_money(self.tax_amount)
        self.total_amount = quant_money(self.total_amount)
        if not self.order_number:
            raise ValidationError({"order_number": "Order number is required."})
        if self.table_id and self.company_id and self.table.company_id != self.company_id:
            raise ValidationError({"table": "Table must belong to the same company."})

    def recalculate_totals(self, save: bool = True) -> None:
        if not self.pk:
            return
        subtotal = MONEY_ZERO
        tax_amount = MONEY_ZERO
        for line in self.items.all():
            subtotal += quant_money(line.line_subtotal)
            tax_amount += quant_money(line.tax_amount)
        self.subtotal = quant_money(subtotal)
        self.tax_amount = quant_money(tax_amount)
        self.total_amount = quant_money(self.subtotal + self.tax_amount)
        if save:
            self.save(update_fields=["subtotal", "tax_amount", "total_amount", "updated_at"])


class RestaurantKitchenOrderItem(models.Model):
    kitchen_order = models.ForeignKey(
        RestaurantKitchenOrder,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="restaurant_kitchen_order_items",
        db_index=True,
    )
    menu_item = models.ForeignKey(
        RestaurantMenuItem,
        on_delete=models.PROTECT,
        related_name="kitchen_order_items",
        db_index=True,
    )
    line_number = models.PositiveIntegerField(default=1, db_index=True)
    item_name_snapshot = models.CharField(max_length=220)
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal("1.0000"),
        validators=[MinValueValidator(Decimal("0.0001"))],
    )
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    line_subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("15.00"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["kitchen_order_id", "line_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["kitchen_order", "line_number"],
                name="unique_restaurant_kitchen_order_item_line",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "menu_item"]),
            models.Index(fields=["company", "created_at"]),
        ]

    def apply_menu_snapshot(self) -> None:
        if not self.menu_item_id:
            return
        self.item_name_snapshot = self.menu_item.display_name
        self.unit_price = quant_money(self.menu_item.price)
        self.tax_rate = quant_money(self.menu_item.tax_rate)

    def calculate_totals(self) -> None:
        self.quantity = quant_qty(self.quantity)
        self.unit_price = quant_money(self.unit_price)
        self.tax_rate = quant_money(self.tax_rate)
        self.line_subtotal = quant_money(self.quantity * self.unit_price)
        self.tax_amount = quant_money(self.line_subtotal * self.tax_rate / Decimal("100"))
        self.line_total = quant_money(self.line_subtotal + self.tax_amount)

    def clean(self) -> None:
        super().clean()
        if self.kitchen_order_id and self.company_id and self.kitchen_order.company_id != self.company_id:
            raise ValidationError({"company": "Line company must match kitchen order company."})
        if self.menu_item_id and self.company_id and self.menu_item.company_id != self.company_id:
            raise ValidationError({"menu_item": "Menu item must belong to the same company."})
        if not self.item_name_snapshot and self.menu_item_id:
            self.apply_menu_snapshot()
        self.calculate_totals()
        if self.quantity <= QTY_ZERO:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

    def save(self, *args, **kwargs):
        if self.kitchen_order_id and not self.company_id:
            self.company_id = self.kitchen_order.company_id
        if self.menu_item_id and not self.item_name_snapshot:
            self.apply_menu_snapshot()
        self.full_clean()
        super().save(*args, **kwargs)
        if self.kitchen_order_id:
            self.kitchen_order.recalculate_totals(save=True)


class ClinicAppointmentStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    CHECKED_IN = "CHECKED_IN", "Checked in"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    NO_SHOW = "NO_SHOW", "No show"


class ClinicPatient(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="clinic_patients",
        db_index=True,
    )
    patient_number = models.CharField(max_length=80, db_index=True)
    full_name = models.CharField(max_length=220, db_index=True)
    mobile = models.CharField(max_length=50, blank=True, default="", db_index=True)
    email = models.EmailField(blank=True, default="")
    national_id = models.CharField(max_length=80, blank=True, default="", db_index=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "full_name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "patient_number"],
                name="unique_clinic_patient_number_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "national_id"],
                condition=~Q(national_id=""),
                name="unique_clinic_patient_national_id_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "mobile"]),
            models.Index(fields=["company", "full_name"]),
            models.Index(fields=["company", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient_number} - {self.full_name}"

    def clean(self) -> None:
        super().clean()
        self.patient_number = (self.patient_number or "").strip().upper()
        self.full_name = (self.full_name or "").strip()
        self.mobile = (self.mobile or "").strip()
        self.national_id = (self.national_id or "").strip()
        if not self.patient_number:
            raise ValidationError({"patient_number": "Patient number is required."})
        if not self.full_name:
            raise ValidationError({"full_name": "Patient full name is required."})


class ClinicService(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="clinic_services",
        db_index=True,
    )
    catalog_item_id = models.PositiveBigIntegerField(blank=True, null=True, db_index=True)
    code = models.CharField(max_length=80, db_index=True)
    name = models.CharField(max_length=220, db_index=True)
    department = models.CharField(max_length=160, blank=True, default="", db_index=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    price = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    taxable = models.BooleanField(default=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("15.00"))
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "department", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_clinic_service_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "department"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "catalog_item_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    def clean(self) -> None:
        super().clean()
        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.department = (self.department or "").strip()
        self.price = quant_money(self.price)
        self.tax_rate = quant_money(self.tax_rate)
        if not self.code:
            raise ValidationError({"code": "Service code is required."})
        if not self.name:
            raise ValidationError({"name": "Service name is required."})
        if self.duration_minutes <= 0:
            raise ValidationError({"duration_minutes": "Duration must be greater than zero."})


class ClinicAppointment(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="clinic_appointments",
        db_index=True,
    )
    patient = models.ForeignKey(
        ClinicPatient,
        on_delete=models.PROTECT,
        related_name="appointments",
        db_index=True,
    )
    service = models.ForeignKey(
        ClinicService,
        on_delete=models.PROTECT,
        related_name="appointments",
        db_index=True,
    )
    appointment_number = models.CharField(max_length=80, db_index=True)
    appointment_at = models.DateTimeField(db_index=True)
    practitioner_name = models.CharField(max_length=180, blank=True, default="", db_index=True)
    status = models.CharField(
        max_length=20,
        choices=ClinicAppointmentStatus.choices,
        default=ClinicAppointmentStatus.SCHEDULED,
        db_index=True,
    )
    price_snapshot = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "-appointment_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "appointment_number"],
                name="unique_clinic_appointment_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "patient"]),
            models.Index(fields=["company", "service"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "appointment_at"]),
            models.Index(fields=["company", "practitioner_name"]),
        ]

    def __str__(self) -> str:
        return self.appointment_number

    def clean(self) -> None:
        super().clean()
        self.appointment_number = (self.appointment_number or "").strip().upper()
        self.practitioner_name = (self.practitioner_name or "").strip()
        self.price_snapshot = quant_money(self.price_snapshot)
        if not self.appointment_number:
            raise ValidationError({"appointment_number": "Appointment number is required."})
        if self.patient_id and self.company_id and self.patient.company_id != self.company_id:
            raise ValidationError({"patient": "Patient must belong to the same company."})
        if self.service_id and self.company_id and self.service.company_id != self.company_id:
            raise ValidationError({"service": "Service must belong to the same company."})
        if self.service_id and self.price_snapshot == MONEY_ZERO:
            self.price_snapshot = quant_money(self.service.price)


class ProjectStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    ON_HOLD = "ON_HOLD", "On hold"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class ProjectWorkOrderStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    APPROVED = "APPROVED", "Approved"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class Project(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="activity_projects",
        db_index=True,
    )
    project_number = models.CharField(max_length=80, db_index=True)
    name = models.CharField(max_length=220, db_index=True)
    customer_id = models.PositiveBigIntegerField(blank=True, null=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.DRAFT,
        db_index=True,
    )
    start_date = models.DateField(default=timezone.localdate, db_index=True)
    end_date = models.DateField(blank=True, null=True, db_index=True)
    budget_amount = models.DecimalField(max_digits=18, decimal_places=2, default=MONEY_ZERO)
    actual_cost_amount = models.DecimalField(max_digits=18, decimal_places=2, default=MONEY_ZERO)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "-start_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "project_number"],
                name="unique_activity_project_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "start_date"]),
            models.Index(fields=["company", "customer_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.project_number} - {self.name}"

    def clean(self) -> None:
        super().clean()
        self.project_number = (self.project_number or "").strip().upper()
        self.name = (self.name or "").strip()
        self.budget_amount = quant_money(self.budget_amount)
        self.actual_cost_amount = quant_money(self.actual_cost_amount)
        if not self.project_number:
            raise ValidationError({"project_number": "Project number is required."})
        if not self.name:
            raise ValidationError({"name": "Project name is required."})
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be before start date."})

    def recalculate_costs(self, save: bool = True) -> None:
        if not self.pk:
            return
        total = MONEY_ZERO
        for line in self.cost_lines.all():
            total += quant_money(line.total_cost)
        self.actual_cost_amount = quant_money(total)
        if save:
            self.save(update_fields=["actual_cost_amount", "updated_at"])


class ProjectWorkOrder(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="activity_project_work_orders",
        db_index=True,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="work_orders",
        db_index=True,
    )
    work_order_number = models.CharField(max_length=80, db_index=True)
    title = models.CharField(max_length=220, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=ProjectWorkOrderStatus.choices,
        default=ProjectWorkOrderStatus.DRAFT,
        db_index=True,
    )
    scheduled_start = models.DateField(blank=True, null=True, db_index=True)
    scheduled_end = models.DateField(blank=True, null=True, db_index=True)
    estimated_amount = models.DecimalField(max_digits=18, decimal_places=2, default=MONEY_ZERO)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "work_order_number"],
                name="unique_activity_work_order_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "project"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "scheduled_start"]),
        ]

    def __str__(self) -> str:
        return self.work_order_number

    def clean(self) -> None:
        super().clean()
        self.work_order_number = (self.work_order_number or "").strip().upper()
        self.title = (self.title or "").strip()
        self.estimated_amount = quant_money(self.estimated_amount)
        if not self.work_order_number:
            raise ValidationError({"work_order_number": "Work order number is required."})
        if not self.title:
            raise ValidationError({"title": "Work order title is required."})
        if self.project_id and self.company_id and self.project.company_id != self.company_id:
            raise ValidationError({"project": "Project must belong to the same company."})
        if self.scheduled_end and self.scheduled_start and self.scheduled_end < self.scheduled_start:
            raise ValidationError({"scheduled_end": "Scheduled end cannot be before scheduled start."})


class ProjectCostLine(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="activity_project_cost_lines",
        db_index=True,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="cost_lines",
        db_index=True,
    )
    work_order = models.ForeignKey(
        ProjectWorkOrder,
        on_delete=models.SET_NULL,
        related_name="cost_lines",
        blank=True,
        null=True,
        db_index=True,
    )
    cost_type = models.CharField(max_length=60, default="MATERIAL", db_index=True)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=4, default=Decimal("1.0000"))
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=MONEY_ZERO)
    total_cost = models.DecimalField(max_digits=18, decimal_places=2, default=MONEY_ZERO)
    cost_date = models.DateField(default=timezone.localdate, db_index=True)
    notes = models.TextField(blank=True, default="")
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["company_id", "-cost_date", "-id"]
        indexes = [
            models.Index(fields=["company", "project"]),
            models.Index(fields=["company", "work_order"]),
            models.Index(fields=["company", "cost_type"]),
            models.Index(fields=["company", "cost_date"]),
        ]

    def calculate_total(self) -> None:
        self.quantity = quant_qty(self.quantity)
        self.unit_cost = quant_money(self.unit_cost)
        self.total_cost = quant_money(self.quantity * self.unit_cost)

    def clean(self) -> None:
        super().clean()
        self.cost_type = (self.cost_type or "MATERIAL").strip().upper()
        self.description = (self.description or "").strip()
        if not self.description:
            raise ValidationError({"description": "Cost description is required."})
        if self.project_id and self.company_id and self.project.company_id != self.company_id:
            raise ValidationError({"project": "Project must belong to the same company."})
        if self.work_order_id:
            if self.work_order.company_id != self.company_id:
                raise ValidationError({"work_order": "Work order must belong to the same company."})
            if self.work_order.project_id != self.project_id:
                raise ValidationError({"work_order": "Work order must belong to the same project."})
        self.calculate_total()
        if self.quantity <= QTY_ZERO:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        if self.project_id:
            self.project.recalculate_costs(save=True)

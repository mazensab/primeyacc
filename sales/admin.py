# ============================================================
# 📂 sales/admin.py
# 🧠 PrimeyAcc | Sales Admin V1.2
# ------------------------------------------------------------
# ✅ Sales invoices admin
# ✅ Sales invoice items inline
# ✅ Sales quotations admin
# ✅ Sales quotation items inline
# ✅ Readonly totals and lifecycle timestamps
# ✅ Company / branch / customer visibility
# ✅ Search and filtering for operational review
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Admin هنا للمراجعة والإدارة الداخلية فقط
# - عمليات /company الحقيقية تتم عبر APIs وخدمات sales/services.py
# - لا نضع منطق business ثقيل داخل admin.py
# - إجماليات الفواتير وعروض الأسعار تُحسب من البنود
# - عروض الأسعار لا تنشئ قيودًا محاسبية أو حركات مخزون
# ============================================================

from __future__ import annotations

from django.contrib import admin

from sales.models import (
    SalesInvoice,
    SalesInvoiceItem,
    SalesOrder,
    SalesOrderItem,
    SalesQuotation,
    SalesQuotationItem,
)


class SalesInvoiceItemInline(admin.TabularInline):
    """
    Inline invoice items for quick operational review.
    """

    model = SalesInvoiceItem
    extra = 0

    fields = [
        "line_number",
        "catalog_item",
        "item_code_snapshot",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "line_subtotal",
        "discount_amount",
        "taxable",
        "tax_rate",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]

    autocomplete_fields = [
        "catalog_item",
    ]

    ordering = [
        "line_number",
        "id",
    ]


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales invoices.
    """

    list_display = [
        "invoice_number",
        "company",
        "branch",
        "customer",
        "status",
        "payment_status",
        "invoice_date",
        "due_date",
        "total_amount",
        "paid_amount",
        "balance_due",
        "source",
        "created_at",
    ]

    list_filter = [
        "status",
        "payment_status",
        "source",
        "invoice_date",
        "due_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "invoice_number",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "branch__name",
        "branch__branch_code",
        "customer__display_name",
        "customer__legal_name",
        "customer__code",
        "customer__phone",
        "customer__mobile",
    ]

    autocomplete_fields = [
        "company",
        "branch",
        "customer",
        "created_by",
        "updated_by",
        "issued_by",
        "cancelled_by",
    ]

    readonly_fields = [
        "subtotal",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "paid_amount",
        "balance_due",
        "customer_snapshot",
        "billing_address_snapshot",
        "tax_snapshot",
        "issued_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Invoice identity",
            {
                "fields": [
                    "company",
                    "branch",
                    "customer",
                    "invoice_number",
                    "status",
                    "payment_status",
                    "source",
                    "invoice_date",
                    "due_date",
                    "currency_code",
                ],
            },
        ),
        (
            "Totals",
            {
                "fields": [
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "paid_amount",
                    "balance_due",
                ],
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "issued_at",
                    "issued_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancelled_reason",
                ],
            },
        ),
        (
            "Snapshots",
            {
                "classes": ["collapse"],
                "fields": [
                    "customer_snapshot",
                    "billing_address_snapshot",
                    "tax_snapshot",
                ],
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": [
                    "public_notes",
                    "internal_notes",
                    "extra_data",
                ],
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    inlines = [
        SalesInvoiceItemInline,
    ]

    date_hierarchy = "invoice_date"

    ordering = [
        "-invoice_date",
        "-id",
    ]

    list_select_related = [
        "company",
        "branch",
        "customer",
    ]

    save_on_top = True

    def save_model(self, request, obj, form, change):
        """
        Keep invoice audit fields and snapshots synchronized.
        """
        if not change and not obj.created_by_id:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()

        super().save_model(
            request,
            obj,
            form,
            change,
        )

        obj.refresh_snapshots(save=True)
        obj.recalculate_totals(save=True)

    def save_formset(self, request, form, formset, change):
        """
        Save inline items then refresh invoice totals.
        """
        instances = formset.save(commit=False)

        for deleted_object in formset.deleted_objects:
            deleted_object.delete()

        for instance in instances:
            if isinstance(instance, SalesInvoiceItem):
                if instance.invoice_id and not instance.company_id:
                    instance.company_id = instance.invoice.company_id

                if (
                    instance.catalog_item_id
                    and not instance.item_name_snapshot
                ):
                    instance.apply_catalog_snapshot()

                instance.full_clean()

            instance.save()

        formset.save_m2m()

        if form.instance.pk:
            form.instance.recalculate_totals(save=True)


@admin.register(SalesInvoiceItem)
class SalesInvoiceItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales invoice items.
    """

    list_display = [
        "invoice",
        "company",
        "line_number",
        "catalog_item",
        "item_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "line_total",
        "created_at",
    ]

    list_filter = [
        "company",
        "taxable",
        "tax_rate",
        "created_at",
    ]

    search_fields = [
        "invoice__invoice_number",
        "company__name",
        "company__company_code",
        "catalog_item__name",
        "catalog_item__code",
        "catalog_item__sku",
        "catalog_item__barcode",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    autocomplete_fields = [
        "invoice",
        "company",
        "catalog_item",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Invoice line",
            {
                "fields": [
                    "invoice",
                    "company",
                    "catalog_item",
                    "line_number",
                ],
            },
        ),
        (
            "Snapshot",
            {
                "fields": [
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_description_snapshot",
                    "unit_name_snapshot",
                ],
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "quantity",
                    "unit_price",
                    "line_subtotal",
                    "discount_amount",
                    "taxable",
                    "tax_rate",
                    "taxable_amount",
                    "tax_amount",
                    "line_total",
                ],
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ],
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    ordering = [
        "-created_at",
        "-id",
    ]

    list_select_related = [
        "invoice",
        "company",
        "catalog_item",
    ]

    def save_model(self, request, obj, form, change):
        """
        Synchronize invoice line company and catalog snapshots.
        """
        if obj.invoice_id and not obj.company_id:
            obj.company_id = obj.invoice.company_id

        if (
            obj.catalog_item_id
            and not obj.item_name_snapshot
        ):
            obj.apply_catalog_snapshot()

        obj.full_clean()

        super().save_model(
            request,
            obj,
            form,
            change,
        )


class SalesQuotationItemInline(admin.TabularInline):
    """
    Inline quotation items for operational review.
    """

    model = SalesQuotationItem
    extra = 0

    fields = [
        "line_number",
        "catalog_item",
        "item_code_snapshot",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "line_subtotal",
        "discount_amount",
        "taxable",
        "tax_rate",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]

    autocomplete_fields = [
        "catalog_item",
    ]

    ordering = [
        "line_number",
        "id",
    ]

    def has_add_permission(self, request, obj=None):
        """
        Allow adding lines only while the quotation is a draft.
        """
        if obj and not obj.can_be_edited:
            return False

        return super().has_add_permission(
            request,
            obj,
        )

    def has_delete_permission(self, request, obj=None):
        """
        Allow deleting lines only while the quotation is a draft.
        """
        if obj and not obj.can_be_edited:
            return False

        return super().has_delete_permission(
            request,
            obj,
        )

    def get_readonly_fields(self, request, obj=None):
        """
        Lock all quotation line fields after leaving draft status.
        """
        readonly_fields = list(
            super().get_readonly_fields(
                request,
                obj,
            )
        )

        if obj and not obj.can_be_edited:
            return list(self.fields)

        return readonly_fields


@admin.register(SalesQuotation)
class SalesQuotationAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales quotations.
    """

    list_display = [
        "quotation_number",
        "company",
        "branch",
        "customer",
        "status",
        "quotation_date",
        "valid_until",
        "total_amount",
        "source",
        "sent_at",
        "accepted_at",
        "created_at",
    ]

    list_filter = [
        "status",
        "source",
        "quotation_date",
        "valid_until",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "quotation_number",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "branch__name",
        "branch__branch_code",
        "customer__display_name",
        "customer__legal_name",
        "customer__code",
        "customer__phone",
        "customer__mobile",
        "customer__email",
    ]

    autocomplete_fields = [
        "company",
        "branch",
        "customer",
        "created_by",
        "updated_by",
        "sent_by",
        "accepted_by",
        "rejected_by",
        "expired_by",
        "cancelled_by",
    ]

    readonly_fields = [
        "subtotal",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "customer_snapshot",
        "billing_address_snapshot",
        "tax_snapshot",
        "sent_at",
        "accepted_at",
        "rejected_at",
        "expired_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Quotation identity",
            {
                "fields": [
                    "company",
                    "branch",
                    "customer",
                    "quotation_number",
                    "status",
                    "source",
                    "quotation_date",
                    "valid_until",
                    "currency_code",
                ],
            },
        ),
        (
            "Totals",
            {
                "fields": [
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                ],
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "sent_at",
                    "sent_by",
                    "accepted_at",
                    "accepted_by",
                    "rejected_at",
                    "rejected_by",
                    "rejection_reason",
                    "expired_at",
                    "expired_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancelled_reason",
                ],
            },
        ),
        (
            "Snapshots",
            {
                "classes": ["collapse"],
                "fields": [
                    "customer_snapshot",
                    "billing_address_snapshot",
                    "tax_snapshot",
                ],
            },
        ),
        (
            "Terms, notes and extra data",
            {
                "fields": [
                    "terms_and_conditions",
                    "public_notes",
                    "internal_notes",
                    "extra_data",
                ],
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    inlines = [
        SalesQuotationItemInline,
    ]

    date_hierarchy = "quotation_date"

    ordering = [
        "-quotation_date",
        "-id",
    ]

    list_select_related = [
        "company",
        "branch",
        "customer",
    ]

    save_on_top = True

    def get_readonly_fields(self, request, obj=None):
        """
        Lock quotation operational fields after leaving draft status.

        Lifecycle metadata and calculated totals remain readonly at all times.
        """
        readonly_fields = list(
            super().get_readonly_fields(
                request,
                obj,
            )
        )

        if obj and not obj.can_be_edited:
            readonly_fields.extend(
                [
                    "company",
                    "branch",
                    "customer",
                    "quotation_number",
                    "source",
                    "quotation_date",
                    "valid_until",
                    "currency_code",
                    "terms_and_conditions",
                    "public_notes",
                    "internal_notes",
                    "extra_data",
                ]
            )

        return list(dict.fromkeys(readonly_fields))

    def save_model(self, request, obj, form, change):
        """
        Keep quotation audit fields and snapshots synchronized.
        """
        if not change and not obj.created_by_id:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()

        super().save_model(
            request,
            obj,
            form,
            change,
        )

        obj.refresh_snapshots(save=True)
        obj.recalculate_totals(save=True)

    def save_formset(self, request, form, formset, change):
        """
        Save quotation lines and refresh quotation totals.
        """
        instances = formset.save(commit=False)

        for deleted_object in formset.deleted_objects:
            deleted_object.delete()

        for instance in instances:
            if isinstance(instance, SalesQuotationItem):
                if (
                    instance.quotation_id
                    and not instance.company_id
                ):
                    instance.company_id = (
                        instance.quotation.company_id
                    )

                if (
                    instance.catalog_item_id
                    and not instance.item_name_snapshot
                ):
                    instance.apply_catalog_snapshot()

                instance.full_clean()

            instance.save()

        formset.save_m2m()

        if form.instance.pk:
            form.instance.recalculate_totals(save=True)


@admin.register(SalesQuotationItem)
class SalesQuotationItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales quotation items.
    """

    list_display = [
        "quotation",
        "company",
        "line_number",
        "catalog_item",
        "item_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "line_total",
        "created_at",
    ]

    list_filter = [
        "company",
        "taxable",
        "tax_rate",
        "created_at",
    ]

    search_fields = [
        "quotation__quotation_number",
        "company__name",
        "company__company_code",
        "catalog_item__name",
        "catalog_item__code",
        "catalog_item__sku",
        "catalog_item__barcode",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    autocomplete_fields = [
        "quotation",
        "company",
        "catalog_item",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Quotation line",
            {
                "fields": [
                    "quotation",
                    "company",
                    "catalog_item",
                    "line_number",
                ],
            },
        ),
        (
            "Snapshot",
            {
                "fields": [
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_description_snapshot",
                    "unit_name_snapshot",
                ],
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "quantity",
                    "unit_price",
                    "line_subtotal",
                    "discount_amount",
                    "taxable",
                    "tax_rate",
                    "taxable_amount",
                    "tax_amount",
                    "line_total",
                ],
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ],
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    ordering = [
        "-created_at",
        "-id",
    ]

    list_select_related = [
        "quotation",
        "company",
        "catalog_item",
    ]

    def get_readonly_fields(self, request, obj=None):
        """
        Lock quotation line fields when its quotation is no longer a draft.
        """
        readonly_fields = list(
            super().get_readonly_fields(
                request,
                obj,
            )
        )

        if (
            obj
            and obj.quotation_id
            and not obj.quotation.can_be_edited
        ):
            readonly_fields.extend(
                [
                    "quotation",
                    "company",
                    "catalog_item",
                    "line_number",
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_description_snapshot",
                    "unit_name_snapshot",
                    "quantity",
                    "unit_price",
                    "discount_amount",
                    "taxable",
                    "tax_rate",
                    "notes",
                    "extra_data",
                ]
            )

        return list(dict.fromkeys(readonly_fields))

    def has_delete_permission(self, request, obj=None):
        """
        Allow deleting a line only while its quotation is a draft.
        """
        if (
            obj
            and obj.quotation_id
            and not obj.quotation.can_be_edited
        ):
            return False

        return super().has_delete_permission(
            request,
            obj,
        )

    def save_model(self, request, obj, form, change):
        """
        Synchronize quotation line company and catalog snapshots.
        """
        if obj.quotation_id and not obj.company_id:
            obj.company_id = obj.quotation.company_id

        if (
            obj.catalog_item_id
            and not obj.item_name_snapshot
        ):
            obj.apply_catalog_snapshot()

        obj.full_clean()

        super().save_model(
            request,
            obj,
            form,
            change,
        )

class SalesOrderItemInline(admin.TabularInline):
    """
    Inline sales order items for operational review.
    """

    model = SalesOrderItem
    extra = 0

    fields = [
        "line_number",
        "catalog_item",
        "source_quotation_item",
        "item_code_snapshot",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "line_subtotal",
        "discount_amount",
        "taxable",
        "tax_rate",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]

    autocomplete_fields = [
        "catalog_item",
        "source_quotation_item",
    ]

    ordering = [
        "line_number",
        "id",
    ]

    def has_add_permission(self, request, obj=None):
        """
        Allow adding order lines only while the order is draft.
        """
        if obj and not obj.can_be_edited:
            return False

        return super().has_add_permission(
            request,
            obj,
        )

    def has_delete_permission(self, request, obj=None):
        """
        Allow deleting order lines only while the order is draft.
        """
        if obj and not obj.can_be_edited:
            return False

        return super().has_delete_permission(
            request,
            obj,
        )

    def get_readonly_fields(self, request, obj=None):
        """
        Lock all order line fields after leaving draft status.
        """
        readonly_fields = list(
            super().get_readonly_fields(
                request,
                obj,
            )
        )

        if obj and not obj.can_be_edited:
            return list(self.fields)

        return readonly_fields


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales orders.
    """

    list_display = [
        "order_number",
        "company",
        "branch",
        "customer",
        "status",
        "source",
        "source_quotation",
        "order_date",
        "expected_delivery_date",
        "total_amount",
        "confirmed_at",
        "processing_at",
        "completed_at",
        "created_at",
    ]

    list_filter = [
        "status",
        "source",
        "order_date",
        "expected_delivery_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "order_number",
        "source_quotation__quotation_number",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "branch__name",
        "branch__branch_code",
        "customer__display_name",
        "customer__legal_name",
        "customer__code",
        "customer__phone",
        "customer__mobile",
        "customer__email",
    ]

    autocomplete_fields = [
        "company",
        "branch",
        "customer",
        "source_quotation",
        "created_by",
        "updated_by",
        "confirmed_by",
        "processing_by",
        "completed_by",
        "cancelled_by",
    ]

    readonly_fields = [
        "subtotal",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "customer_snapshot",
        "billing_address_snapshot",
        "tax_snapshot",
        "quotation_snapshot",
        "confirmed_at",
        "processing_at",
        "completed_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Order identity",
            {
                "fields": [
                    "company",
                    "branch",
                    "customer",
                    "source_quotation",
                    "order_number",
                    "status",
                    "source",
                    "order_date",
                    "expected_delivery_date",
                    "currency_code",
                ],
            },
        ),
        (
            "Totals",
            {
                "fields": [
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                ],
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "confirmed_at",
                    "confirmed_by",
                    "processing_at",
                    "processing_by",
                    "completed_at",
                    "completed_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancelled_reason",
                ],
            },
        ),
        (
            "Snapshots",
            {
                "classes": ["collapse"],
                "fields": [
                    "customer_snapshot",
                    "billing_address_snapshot",
                    "tax_snapshot",
                    "quotation_snapshot",
                ],
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": [
                    "public_notes",
                    "internal_notes",
                    "extra_data",
                ],
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    inlines = [
        SalesOrderItemInline,
    ]

    date_hierarchy = "order_date"

    ordering = [
        "-order_date",
        "-id",
    ]

    list_select_related = [
        "company",
        "branch",
        "customer",
        "source_quotation",
    ]

    save_on_top = True

    def get_readonly_fields(self, request, obj=None):
        """
        Lock operational fields after the order leaves draft status.
        """
        readonly_fields = list(
            super().get_readonly_fields(
                request,
                obj,
            )
        )

        if obj and not obj.can_be_edited:
            readonly_fields.extend(
                [
                    "company",
                    "branch",
                    "customer",
                    "source_quotation",
                    "order_number",
                    "source",
                    "order_date",
                    "expected_delivery_date",
                    "currency_code",
                    "public_notes",
                    "internal_notes",
                    "extra_data",
                ]
            )

        return list(dict.fromkeys(readonly_fields))

    def save_model(self, request, obj, form, change):
        """
        Keep sales order audit fields and snapshots synchronized.
        """
        if not change and not obj.created_by_id:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()

        super().save_model(
            request,
            obj,
            form,
            change,
        )

        obj.refresh_snapshots(save=True)
        obj.recalculate_totals(save=True)

    def save_formset(self, request, form, formset, change):
        """
        Save sales order lines and refresh order totals.
        """
        instances = formset.save(commit=False)

        for deleted_object in formset.deleted_objects:
            deleted_object.delete()

        for instance in instances:
            if isinstance(instance, SalesOrderItem):
                if (
                    instance.order_id
                    and not instance.company_id
                ):
                    instance.company_id = (
                        instance.order.company_id
                    )

                if (
                    instance.source_quotation_item_id
                    and not instance.item_name_snapshot
                ):
                    instance.apply_quotation_item_snapshot()

                if (
                    instance.catalog_item_id
                    and not instance.item_name_snapshot
                ):
                    instance.apply_catalog_snapshot()

                instance.full_clean()

            instance.save()

        formset.save_m2m()

        if form.instance.pk:
            form.instance.recalculate_totals(save=True)


@admin.register(SalesOrderItem)
class SalesOrderItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales order items.
    """

    list_display = [
        "order",
        "company",
        "line_number",
        "catalog_item",
        "source_quotation_item",
        "item_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "line_total",
        "created_at",
    ]

    list_filter = [
        "company",
        "taxable",
        "tax_rate",
        "created_at",
    ]

    search_fields = [
        "order__order_number",
        "order__source_quotation__quotation_number",
        "company__name",
        "company__company_code",
        "catalog_item__name",
        "catalog_item__code",
        "catalog_item__sku",
        "catalog_item__barcode",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    autocomplete_fields = [
        "order",
        "company",
        "catalog_item",
        "source_quotation_item",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Order line",
            {
                "fields": [
                    "order",
                    "company",
                    "catalog_item",
                    "source_quotation_item",
                    "line_number",
                ],
            },
        ),
        (
            "Snapshot",
            {
                "fields": [
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_description_snapshot",
                    "unit_name_snapshot",
                ],
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "quantity",
                    "unit_price",
                    "line_subtotal",
                    "discount_amount",
                    "taxable",
                    "tax_rate",
                    "taxable_amount",
                    "tax_amount",
                    "line_total",
                ],
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ],
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    ordering = [
        "-created_at",
        "-id",
    ]

    list_select_related = [
        "order",
        "company",
        "catalog_item",
        "source_quotation_item",
    ]

    def get_readonly_fields(self, request, obj=None):
        """
        Lock order line fields when its order is no longer draft.
        """
        readonly_fields = list(
            super().get_readonly_fields(
                request,
                obj,
            )
        )

        if (
            obj
            and obj.order_id
            and not obj.order.can_be_edited
        ):
            readonly_fields.extend(
                [
                    "order",
                    "company",
                    "catalog_item",
                    "source_quotation_item",
                    "line_number",
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_description_snapshot",
                    "unit_name_snapshot",
                    "quantity",
                    "unit_price",
                    "discount_amount",
                    "taxable",
                    "tax_rate",
                    "notes",
                    "extra_data",
                ]
            )

        return list(dict.fromkeys(readonly_fields))

    def has_delete_permission(self, request, obj=None):
        """
        Allow deletion only while the related order is draft.
        """
        if (
            obj
            and obj.order_id
            and not obj.order.can_be_edited
        ):
            return False

        return super().has_delete_permission(
            request,
            obj,
        )

    def save_model(self, request, obj, form, change):
        """
        Synchronize company and source snapshots.
        """
        if obj.order_id and not obj.company_id:
            obj.company_id = obj.order.company_id

        if (
            obj.source_quotation_item_id
            and not obj.item_name_snapshot
        ):
            obj.apply_quotation_item_snapshot()

        if (
            obj.catalog_item_id
            and not obj.item_name_snapshot
        ):
            obj.apply_catalog_snapshot()

        obj.full_clean()

        super().save_model(
            request,
            obj,
            form,
            change,
        )


# End Phase 21.2 - Sales Orders Admin
# ============================================================

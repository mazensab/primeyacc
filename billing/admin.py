# ============================================================
# 📂 billing/admin.py
# 🧠 PrimeyAcc | Platform Billing Documents Admin V1.0
# ------------------------------------------------------------
# ✅ Platform document sequences administration
# ✅ Platform subscription invoices administration
# ✅ Platform payment receipts administration
# ✅ Safe read-only numbering and financial snapshots
# ✅ Search and filtering for platform billing documents
# ✅ Complete separation from company documents and payments
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه الإدارة تخص مستندات فوترة مالك المنصة فقط
# - أرقام المستندات والتسلسل لا تعدل يدويًا
# - Snapshots قابلة للمراجعة دون تعديل مباشر
# - لا يتم حذف مستندات الفوترة الصادرة من لوحة الإدارة
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils.html import format_html

from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformDocumentSequence,
)


@admin.register(PlatformDocumentSequence)
class PlatformDocumentSequenceAdmin(admin.ModelAdmin):
    """
    Administration for platform-owned yearly document sequences.

    Sequence values must be advanced only through billing services.
    """

    list_display = (
        "document_type",
        "year",
        "prefix",
        "last_number",
        "updated_at",
    )
    list_filter = (
        "document_type",
        "year",
    )
    search_fields = (
        "prefix",
    )
    ordering = (
        "-year",
        "document_type",
    )
    readonly_fields = (
        "document_type",
        "year",
        "prefix",
        "last_number",
        "created_at",
        "updated_at",
    )
    date_hierarchy = "created_at"
    list_per_page = 50

    fieldsets = (
        (
            "Sequence",
            {
                "fields": (
                    "document_type",
                    "year",
                    "prefix",
                    "last_number",
                ),
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    def has_add_permission(self, request: HttpRequest) -> bool:
        """
        Sequences are created automatically by billing services.
        """

        return False

    def has_delete_permission(
        self,
        request: HttpRequest,
        obj: PlatformDocumentSequence | None = None,
    ) -> bool:
        """
        Prevent sequence deletion to protect document numbering continuity.
        """

        return False


@admin.register(PlatformBillingDocument)
class PlatformBillingDocumentAdmin(admin.ModelAdmin):
    """
    Administration for platform subscription invoices and payment receipts.

    Issued billing documents are reviewed from the admin, but operational
    lifecycle changes must be performed through billing services and APIs.
    """

    list_display = (
        "document_number",
        "document_type",
        "status_badge",
        "company_name",
        "subscription_id",
        "total_amount",
        "paid_amount",
        "balance_amount",
        "currency_code",
        "issue_date",
    )
    list_filter = (
        "document_type",
        "status",
        "currency_code",
        "issue_date",
        "sequence_year",
        "payment_method",
    )
    search_fields = (
        "document_number",
        "billing_reference",
        "transaction_reference",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "company__commercial_registration",
        "company__tax_number",
        "subscription__plan__name",
        "subscription__plan__slug",
    )
    ordering = (
        "-issued_at",
        "-id",
    )
    readonly_fields = (
        "document_type",
        "status",
        "document_number",
        "sequence_number",
        "sequence_year",
        "sequence_prefix",
        "subscription",
        "company",
        "related_invoice",
        "currency_code",
        "subtotal",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "paid_amount",
        "balance_amount",
        "billing_reference",
        "transaction_reference",
        "payment_method",
        "seller_snapshot",
        "buyer_snapshot",
        "subscription_snapshot",
        "plan_snapshot",
        "payment_snapshot",
        "printable_payload",
        "metadata",
        "issue_date",
        "issued_at",
        "paid_at",
        "cancelled_at",
        "cancellation_reason",
        "notes",
        "created_by",
        "cancelled_by",
        "created_at",
        "updated_at",
    )
    list_select_related = (
        "company",
        "subscription",
        "subscription__plan",
        "related_invoice",
        "created_by",
        "cancelled_by",
    )
    date_hierarchy = "issue_date"
    list_per_page = 50
    save_on_top = True

    fieldsets = (
        (
            "Document identity",
            {
                "fields": (
                    "document_type",
                    "status",
                    "document_number",
                    "sequence_prefix",
                    "sequence_year",
                    "sequence_number",
                ),
            },
        ),
        (
            "Source references",
            {
                "fields": (
                    "company",
                    "subscription",
                    "related_invoice",
                ),
            },
        ),
        (
            "Financial values",
            {
                "fields": (
                    "currency_code",
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "paid_amount",
                    "balance_amount",
                ),
            },
        ),
        (
            "Payment information",
            {
                "fields": (
                    "billing_reference",
                    "transaction_reference",
                    "payment_method",
                    "paid_at",
                ),
            },
        ),
        (
            "Document snapshots",
            {
                "classes": ("collapse",),
                "fields": (
                    "seller_snapshot",
                    "buyer_snapshot",
                    "subscription_snapshot",
                    "plan_snapshot",
                    "payment_snapshot",
                ),
            },
        ),
        (
            "Printable payload",
            {
                "classes": ("collapse",),
                "fields": (
                    "printable_payload",
                    "metadata",
                ),
            },
        ),
        (
            "Lifecycle",
            {
                "fields": (
                    "issue_date",
                    "issued_at",
                    "cancelled_at",
                    "cancellation_reason",
                    "notes",
                ),
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_by",
                    "cancelled_by",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    @admin.display(
        description="Status",
        ordering="status",
    )
    def status_badge(
        self,
        obj: PlatformBillingDocument,
    ) -> str:
        """
        Display a compact status badge without changing document state.
        """

        labels = {
            PlatformBillingDocumentStatus.DRAFT: (
                "#6B7280",
                "Draft",
            ),
            PlatformBillingDocumentStatus.ISSUED: (
                "#2563EB",
                "Issued",
            ),
            PlatformBillingDocumentStatus.PAID: (
                "#15803D",
                "Paid",
            ),
            PlatformBillingDocumentStatus.CANCELLED: (
                "#B91C1C",
                "Cancelled",
            ),
        }

        background, label = labels.get(
            obj.status,
            ("#374151", obj.status),
        )

        return format_html(
            (
                '<span style="'
                "display:inline-block;"
                "padding:3px 9px;"
                "border-radius:999px;"
                "background:{};"
                "color:#ffffff;"
                "font-size:12px;"
                'font-weight:600;">{}</span>'
            ),
            background,
            label,
        )

    @admin.display(
        description="Company",
        ordering="company__name",
    )
    def company_name(
        self,
        obj: PlatformBillingDocument,
    ) -> str:
        """
        Return the current company display name for admin navigation.

        Legal printing remains based on buyer_snapshot.
        """

        return obj.company.display_name

    def get_queryset(
        self,
        request: HttpRequest,
    ) -> QuerySet[PlatformBillingDocument]:
        """
        Load related records efficiently for the list page.
        """

        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "subscription",
                "subscription__plan",
                "related_invoice",
                "created_by",
                "cancelled_by",
            )
        )

    def has_add_permission(self, request: HttpRequest) -> bool:
        """
        Billing documents must be created by domain services only.
        """

        return False

    def has_change_permission(
        self,
        request: HttpRequest,
        obj: PlatformBillingDocument | None = None,
    ) -> bool:
        """
        Allow viewing the detail page while all fields remain read-only.
        """

        return super().has_change_permission(request, obj)

    def has_delete_permission(
        self,
        request: HttpRequest,
        obj: PlatformBillingDocument | None = None,
    ) -> bool:
        """
        Issued financial documents must never be deleted from admin.
        """

        return False

    def get_actions(self, request: HttpRequest):
        """
        Remove bulk delete and prevent bypassing document lifecycle services.
        """

        actions = super().get_actions(request)
        actions.pop("delete_selected", None)
        return actions
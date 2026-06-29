# ============================================================
# 📂 whatsapp/admin.py
# 🧠 Mhamcloud | Company WhatsApp Admin V1.0
# ------------------------------------------------------------
# ✅ Register CompanyWhatsAppSetting
# ✅ Register WhatsAppTemplate
# ✅ Register WhatsAppMessageLog
# ✅ Admin filters/search
# ✅ Safe read-only audit fields
# ✅ Template status actions
# ✅ Message status actions
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    CompanyWhatsAppSetting,
    WhatsAppMessageLog,
    WhatsAppMessageStatus,
    WhatsAppTemplate,
    WhatsAppTemplateStatus,
)


@admin.register(CompanyWhatsAppSetting)
class CompanyWhatsAppSettingAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "company",
        "is_enabled",
        "provider",
        "phone_number",
        "default_country_code",
        "last_verified_at",
        "created_at",
    ]

    list_filter = [
        "is_enabled",
        "provider",
        "send_invoice_notifications",
        "send_payment_notifications",
        "send_pos_notifications",
        "send_system_notifications",
        "created_at",
    ]

    search_fields = [
        "company__name",
        "company__company_code",
        "phone_number",
        "phone_number_id",
        "business_account_id",
    ]

    readonly_fields = [
        "last_verified_at",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]

    fieldsets = (
        (
            "Company",
            {
                "fields": (
                    "company",
                    "is_enabled",
                    "provider",
                )
            },
        ),
        (
            "WhatsApp account",
            {
                "fields": (
                    "phone_number",
                    "phone_number_id",
                    "business_account_id",
                    "default_country_code",
                )
            },
        ),
        (
            "Provider credentials",
            {
                "fields": (
                    "access_token",
                    "webhook_verify_token",
                    "provider_config",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Notification switches",
            {
                "fields": (
                    "send_invoice_notifications",
                    "send_payment_notifications",
                    "send_pos_notifications",
                    "send_system_notifications",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "last_verified_at",
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


@admin.register(WhatsAppTemplate)
class WhatsAppTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "company",
        "name",
        "code",
        "category",
        "status",
        "language",
        "created_at",
    ]

    list_filter = [
        "status",
        "category",
        "language",
        "created_at",
        "company",
    ]

    search_fields = [
        "company__name",
        "company__company_code",
        "name",
        "code",
        "body",
        "external_template_name",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]

    fieldsets = (
        (
            "Template",
            {
                "fields": (
                    "company",
                    "name",
                    "code",
                    "category",
                    "status",
                    "language",
                )
            },
        ),
        (
            "Content",
            {
                "fields": (
                    "body",
                    "footer",
                    "variables",
                    "external_template_name",
                    "metadata",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = [
        "activate_templates",
        "deactivate_templates",
        "archive_templates",
    ]

    def activate_templates(self, request, queryset):
        updated_count = queryset.update(
            status=WhatsAppTemplateStatus.ACTIVE,
        )
        self.message_user(request, f"{updated_count} template(s) activated.")

    activate_templates.short_description = "Activate selected templates"

    def deactivate_templates(self, request, queryset):
        updated_count = queryset.update(
            status=WhatsAppTemplateStatus.INACTIVE,
        )
        self.message_user(request, f"{updated_count} template(s) deactivated.")

    deactivate_templates.short_description = "Deactivate selected templates"

    def archive_templates(self, request, queryset):
        updated_count = queryset.update(
            status=WhatsAppTemplateStatus.ARCHIVED,
        )
        self.message_user(request, f"{updated_count} template(s) archived.")

    archive_templates.short_description = "Archive selected templates"


@admin.register(WhatsAppMessageLog)
class WhatsAppMessageLogAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "company",
        "recipient_phone",
        "recipient_name",
        "direction",
        "status",
        "provider",
        "source_type",
        "source_id",
        "created_at",
    ]

    list_filter = [
        "direction",
        "status",
        "provider",
        "source_type",
        "created_at",
        "company",
    ]

    search_fields = [
        "company__name",
        "company__company_code",
        "recipient_name",
        "recipient_phone",
        "message_body",
        "provider_message_id",
        "source_id",
    ]

    readonly_fields = [
        "queued_at",
        "sent_at",
        "delivered_at",
        "read_at",
        "failed_at",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "company",
        "template",
        "created_by",
    ]

    fieldsets = (
        (
            "Message",
            {
                "fields": (
                    "company",
                    "template",
                    "direction",
                    "status",
                    "provider",
                    "recipient_name",
                    "recipient_phone",
                    "message_body",
                    "rendered_variables",
                )
            },
        ),
        (
            "Source",
            {
                "fields": (
                    "source_type",
                    "source_id",
                )
            },
        ),
        (
            "Provider",
            {
                "fields": (
                    "provider_message_id",
                    "provider_response",
                    "error_message",
                )
            },
        ),
        (
            "Timeline",
            {
                "fields": (
                    "queued_at",
                    "sent_at",
                    "delivered_at",
                    "read_at",
                    "failed_at",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = [
        "mark_selected_as_cancelled",
        "mark_selected_as_failed",
    ]

    def mark_selected_as_cancelled(self, request, queryset):
        updated_count = queryset.exclude(
            status__in=[
                WhatsAppMessageStatus.SENT,
                WhatsAppMessageStatus.DELIVERED,
                WhatsAppMessageStatus.READ,
            ]
        ).update(status=WhatsAppMessageStatus.CANCELLED)

        self.message_user(request, f"{updated_count} message(s) cancelled.")

    mark_selected_as_cancelled.short_description = "Cancel selected unsent messages"

    def mark_selected_as_failed(self, request, queryset):
        updated_count = queryset.exclude(
            status__in=[
                WhatsAppMessageStatus.SENT,
                WhatsAppMessageStatus.DELIVERED,
                WhatsAppMessageStatus.READ,
            ]
        ).update(
            status=WhatsAppMessageStatus.FAILED,
            error_message="Marked as failed from Django Admin.",
        )

        self.message_user(request, f"{updated_count} message(s) marked as failed.")

    mark_selected_as_failed.short_description = "Mark selected unsent messages as failed"
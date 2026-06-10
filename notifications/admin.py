# ============================================================
# 📂 notifications/admin.py
# 🧠 PrimeyAcc | Company Notifications Admin V1.0
# ------------------------------------------------------------
# ✅ Register CompanyNotification in Django Admin
# ✅ Fast search and filters
# ✅ Read-only audit fields
# ✅ Tenant and recipient visibility
# ✅ Safe bulk mark read/unread actions
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.utils import timezone

from .models import CompanyNotification


@admin.register(CompanyNotification)
class CompanyNotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "company",
        "recipient",
        "title",
        "notification_type",
        "channel",
        "priority",
        "is_read",
        "created_at",
    ]

    list_filter = [
        "notification_type",
        "channel",
        "priority",
        "is_read",
        "created_at",
        "company",
    ]

    search_fields = [
        "title",
        "message",
        "company__name",
        "company__display_name",
        "recipient__username",
        "recipient__email",
        "source_type",
        "source_id",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "read_at",
    ]

    autocomplete_fields = [
        "company",
        "recipient",
        "created_by",
    ]

    fieldsets = (
        (
            "Notification",
            {
                "fields": (
                    "company",
                    "recipient",
                    "title",
                    "message",
                    "notification_type",
                    "channel",
                    "priority",
                )
            },
        ),
        (
            "Source",
            {
                "fields": (
                    "source_type",
                    "source_id",
                    "action_url",
                    "metadata",
                )
            },
        ),
        (
            "Read status",
            {
                "fields": (
                    "is_read",
                    "read_at",
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
        "mark_selected_as_read",
        "mark_selected_as_unread",
    ]

    def mark_selected_as_read(self, request, queryset):
        updated_count = queryset.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{updated_count} notification(s) marked as read.",
        )

    mark_selected_as_read.short_description = "Mark selected notifications as read"

    def mark_selected_as_unread(self, request, queryset):
        updated_count = queryset.update(
            is_read=False,
            read_at=None,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{updated_count} notification(s) marked as unread.",
        )

    mark_selected_as_unread.short_description = "Mark selected notifications as unread"
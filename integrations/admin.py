# ============================================================
# 📂 integrations/admin.py
# 🧠 PrimeyAcc | Integration API Keys Admin V1.0
# ------------------------------------------------------------
# ✅ Read-safe admin display
# ✅ No raw API key exposure
# ✅ Usage log inspection
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    IntegrationApiKey,
    IntegrationApiKeyUsageLog,
    TikTokConnection,
    TikTokVideo,
)


@admin.register(IntegrationApiKey)
class IntegrationApiKeyAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "company",
        "environment",
        "status",
        "key_prefix",
        "usage_count",
        "last_used_at",
        "expires_at",
        "created_at",
    ]
    list_filter = [
        "environment",
        "status",
        "created_at",
        "expires_at",
        "last_used_at",
    ]
    search_fields = [
        "name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "key_prefix",
    ]
    readonly_fields = [
        "key_prefix",
        "key_hash",
        "usage_count",
        "last_used_at",
        "created_at",
        "updated_at",
        "disabled_at",
        "revoked_at",
    ]


@admin.register(IntegrationApiKeyUsageLog)
class IntegrationApiKeyUsageLogAdmin(admin.ModelAdmin):
    list_display = [
        "api_key",
        "company",
        "method",
        "path",
        "status_code",
        "success",
        "ip_address",
        "created_at",
    ]
    list_filter = [
        "success",
        "status_code",
        "method",
        "created_at",
    ]
    search_fields = [
        "api_key__key_prefix",
        "company__name",
        "company__company_code",
        "path",
        "ip_address",
        "request_id",
    ]
    readonly_fields = [
        "api_key",
        "company",
        "method",
        "path",
        "status_code",
        "ip_address",
        "user_agent",
        "request_id",
        "scope",
        "success",
        "error_message",
        "created_at",
    ]


@admin.register(TikTokConnection)
class TikTokConnectionAdmin(admin.ModelAdmin):
    list_display = [
        "display_name",
        "open_id",
        "is_active",
        "last_synced_at",
        "access_token_expires_at",
        "updated_at",
    ]

    list_filter = [
        "is_active",
        "last_synced_at",
        "updated_at",
    ]

    search_fields = [
        "display_name",
        "open_id",
    ]

    readonly_fields = [
        "open_id",
        "display_name",
        "avatar_url",
        "scopes",
        "access_token_expires_at",
        "refresh_token_expires_at",
        "last_synced_at",
        "last_error",
        "created_at",
        "updated_at",
    ]

    exclude = [
        "access_token",
        "refresh_token",
    ]


@admin.register(TikTokVideo)
class TikTokVideoAdmin(admin.ModelAdmin):
    list_display = [
        "tiktok_video_id",
        "title",
        "published_at",
        "is_visible",
        "view_count",
        "last_synced_at",
    ]

    list_filter = [
        "is_visible",
        "published_at",
        "last_synced_at",
    ]

    search_fields = [
        "tiktok_video_id",
        "title",
        "description",
    ]

    readonly_fields = [
        "connection",
        "tiktok_video_id",
        "title",
        "description",
        "cover_image_url",
        "share_url",
        "embed_link",
        "duration",
        "width",
        "height",
        "like_count",
        "comment_count",
        "share_count",
        "view_count",
        "published_at",
        "last_synced_at",
        "created_at",
    ]

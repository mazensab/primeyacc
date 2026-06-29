# ============================================================
# 📂 settings_center/admin.py
# Mhamcloud | System Settings Center Admin
# ------------------------------------------------------------
# ✅ Backend only
# ✅ Admin visibility for global system settings
# ============================================================

from django.contrib import admin

from .models import SystemSetting


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = (
        "full_key",
        "label_ar",
        "label_en",
        "value_type",
        "is_active",
        "is_public",
        "is_required",
        "updated_at",
    )
    list_filter = ("group", "value_type", "is_active", "is_public", "is_required")
    search_fields = ("group", "key", "label_ar", "label_en", "description_ar", "description_en")
    readonly_fields = ("created_at", "updated_at", "full_key")
    ordering = ("group", "sort_order", "key")
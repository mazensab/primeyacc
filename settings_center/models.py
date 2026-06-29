# ============================================================
# 📂 settings_center/models.py
# Mhamcloud | System Settings Center Models
# ------------------------------------------------------------
# ✅ Backend only
# ✅ Global system settings
# ✅ Typed JSON values
# ✅ Audit-ready update fields
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone


class SystemSetting(models.Model):
    """Global platform/system setting managed from the system workspace."""

    class ValueType(models.TextChoices):
        STRING = "string", "String"
        TEXT = "text", "Text"
        INTEGER = "integer", "Integer"
        DECIMAL = "decimal", "Decimal"
        BOOLEAN = "boolean", "Boolean"
        JSON = "json", "JSON"
        URL = "url", "URL"
        EMAIL = "email", "Email"

    group = models.CharField(max_length=80, db_index=True)
    key = models.CharField(max_length=120, db_index=True)

    label_ar = models.CharField(max_length=180)
    label_en = models.CharField(max_length=180)

    description_ar = models.TextField(blank=True)
    description_en = models.TextField(blank=True)

    value_type = models.CharField(
        max_length=20,
        choices=ValueType.choices,
        default=ValueType.STRING,
    )
    value_json = models.JSONField(default=dict, blank=True)
    default_value_json = models.JSONField(default=dict, blank=True)
    validation_schema = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    is_public = models.BooleanField(default=False, db_index=True)
    is_required = models.BooleanField(default=False)

    sort_order = models.PositiveIntegerField(default=100)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_system_settings",
    )
    updated_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["group", "sort_order", "key"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "key"],
                name="unique_system_setting_group_key",
            )
        ]
        indexes = [
            models.Index(fields=["group", "key"]),
            models.Index(fields=["is_active", "is_public"]),
        ]

    def __str__(self) -> str:
        return f"{self.group}.{self.key}"

    @property
    def full_key(self) -> str:
        return f"{self.group}.{self.key}"

    @property
    def value(self):
        return self.value_json.get("value")

    @property
    def default_value(self):
        return self.default_value_json.get("value")

    def touch(self, actor=None, save: bool = True) -> None:
        if actor is not None and getattr(actor, "is_authenticated", False):
            self.updated_by = actor
        self.updated_at = timezone.now()
        if save:
            self.save(update_fields=["updated_by", "updated_at"])
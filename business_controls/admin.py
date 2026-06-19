# ============================================================
# 📂 business_controls/admin.py
# 🧠 PrimeyAcc | Business Controls Admin V1.0
# ------------------------------------------------------------
# ✅ Audit event admin
# ✅ Idempotency key admin
# ✅ Reference sequence admin
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الإدارة للقراءة والمراجعة التشغيلية
# - لا نضع منطق أعمال داخل admin
# ============================================================

from __future__ import annotations

from django.contrib import admin

from business_controls.models import (
    BusinessAuditEvent,
    BusinessIdempotencyKey,
    BusinessReferenceSequence,
)


@admin.register(BusinessAuditEvent)
class BusinessAuditEventAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "event_type",
        "severity",
        "source_app",
        "source_model",
        "object_reference",
        "actor",
        "created_at",
    )
    list_filter = (
        "severity",
        "event_type",
        "source_app",
        "source_model",
        "created_at",
    )
    search_fields = (
        "event_type",
        "source_app",
        "source_model",
        "object_reference",
        "message",
        "idempotency_key",
        "request_id",
    )
    readonly_fields = ("created_at",)
    ordering = ("-created_at", "-id")


@admin.register(BusinessIdempotencyKey)
class BusinessIdempotencyKeyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "scope",
        "operation",
        "key",
        "status",
        "created_at",
        "completed_at",
    )
    list_filter = ("status", "scope", "operation", "created_at")
    search_fields = ("key", "scope", "operation", "request_hash")
    readonly_fields = ("created_at", "updated_at", "completed_at")
    ordering = ("-created_at", "-id")


@admin.register(BusinessReferenceSequence)
class BusinessReferenceSequenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "scope",
        "prefix",
        "current_number",
        "padding",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active", "scope", "prefix")
    search_fields = ("scope", "prefix", "description")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("company", "scope", "prefix")

# ============================================================
# 📂 documents/admin.py
# 🧠 PrimeyAcc | Documents Admin V1.0
# ------------------------------------------------------------
# ✅ DocumentTemplate admin registration
# ✅ Search / filters / readonly audit fields
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import DocumentTemplate


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "name",
        "document_type",
        "layout_style",
        "is_default",
        "is_active",
        "created_at",
    )
    list_filter = (
        "document_type",
        "layout_style",
        "is_default",
        "is_active",
        "created_at",
    )
    search_fields = (
        "name",
        "company__name",
        "company__display_name",
        "header_text",
        "footer_text",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "created_by",
        "updated_by",
    )
    ordering = (
        "document_type",
        "-is_default",
        "name",
    )
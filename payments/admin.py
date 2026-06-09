# ============================================================
# 📂 payments/admin.py
# 🧠 PrimeyAcc | Company Payments Admin
# ------------------------------------------------------------
# ✅ Admin management for company payment gateways
# ✅ Admin management for company payment methods
# ✅ Admin management for company payment terminals
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الإدارة هنا للتشخيص والتجهيز فقط
# - التشغيل الحقيقي سيكون عبر /api/company/payments
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    CompanyPaymentGateway,
    CompanyPaymentMethod,
    CompanyPaymentTerminal,
)


@admin.register(CompanyPaymentGateway)
class CompanyPaymentGatewayAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "name",
        "code",
        "gateway_type",
        "environment",
        "is_active",
        "is_default",
        "created_at",
    )
    list_filter = (
        "gateway_type",
        "environment",
        "is_active",
        "is_default",
        "created_at",
    )
    search_fields = (
        "name",
        "code",
        "merchant_id",
        "company__name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = (
        "company_id",
        "name",
    )


@admin.register(CompanyPaymentMethod)
class CompanyPaymentMethodAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "name",
        "code",
        "method_type",
        "settlement_behavior",
        "gateway",
        "is_active",
        "is_default",
        "allow_pos",
        "allow_customer_checkout",
        "sort_order",
    )
    list_filter = (
        "method_type",
        "settlement_behavior",
        "is_active",
        "is_default",
        "allow_pos",
        "allow_customer_checkout",
        "created_at",
    )
    search_fields = (
        "name",
        "code",
        "company__name",
        "gateway__name",
    )
    readonly_fields = (
        "is_cash",
        "is_bank_transfer",
        "is_card",
        "is_online",
        "is_pos_terminal",
        "created_at",
        "updated_at",
    )
    ordering = (
        "company_id",
        "sort_order",
        "name",
    )


@admin.register(CompanyPaymentTerminal)
class CompanyPaymentTerminalAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "branch",
        "name",
        "terminal_code",
        "terminal_id",
        "provider_name",
        "status",
        "is_active",
        "is_default_for_branch",
        "last_seen_at",
    )
    list_filter = (
        "status",
        "is_active",
        "is_default_for_branch",
        "provider_name",
        "created_at",
    )
    search_fields = (
        "name",
        "terminal_code",
        "terminal_id",
        "serial_number",
        "provider_name",
        "company__name",
        "branch__name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = (
        "company_id",
        "branch_id",
        "name",
    )
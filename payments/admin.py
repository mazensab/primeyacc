# ============================================================
# 📂 payments/admin.py
# 🧠 Mhamcloud | Company Payments Admin
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


# ============================================================
# 🧠 Mhamcloud | Phase 23 Payment Integrations Admin
# ============================================================

from .models import (
    PaymentCheckoutSession,
    PaymentWebhookEvent,
    PaymentSettlementBatch,
    PaymentSettlementItem,
)


@admin.register(PaymentCheckoutSession)
class PaymentCheckoutSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "gateway",
        "payment_method",
        "source_type",
        "source_id",
        "amount",
        "currency_code",
        "gateway_fee_amount",
        "net_amount",
        "status",
        "external_checkout_id",
        "external_payment_id",
        "paid_at",
        "created_at",
    )
    list_filter = (
        "status",
        "source_type",
        "currency_code",
        "gateway",
        "payment_method",
        "created_at",
        "paid_at",
    )
    search_fields = (
        "external_checkout_id",
        "external_payment_id",
        "idempotency_key",
        "description",
        "customer_email",
        "customer_phone",
        "company__name",
    )
    readonly_fields = (
        "gateway_fee_amount",
        "net_amount",
        "paid_at",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at", "-id")


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "gateway",
        "checkout_session",
        "event_type",
        "external_event_id",
        "external_payment_id",
        "status",
        "processed_at",
        "created_at",
    )
    list_filter = (
        "status",
        "event_type",
        "gateway",
        "created_at",
        "processed_at",
    )
    search_fields = (
        "external_event_id",
        "external_payment_id",
        "idempotency_key",
        "event_type",
        "company__name",
    )
    readonly_fields = (
        "created_at",
        "processed_at",
    )
    ordering = ("-created_at", "-id")


class PaymentSettlementItemInline(admin.TabularInline):
    model = PaymentSettlementItem
    extra = 0
    readonly_fields = (
        "net_amount",
        "created_at",
    )


@admin.register(PaymentSettlementBatch)
class PaymentSettlementBatchAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "gateway",
        "payment_method",
        "settlement_reference",
        "status",
        "gross_amount",
        "fee_amount",
        "net_amount",
        "settlement_date",
        "posted_at",
        "created_at",
    )
    list_filter = (
        "status",
        "gateway",
        "payment_method",
        "settlement_date",
        "created_at",
    )
    search_fields = (
        "settlement_reference",
        "company__name",
        "notes",
    )
    readonly_fields = (
        "gross_amount",
        "fee_amount",
        "net_amount",
        "posted_at",
        "created_at",
        "updated_at",
    )
    inlines = [PaymentSettlementItemInline]
    ordering = ("-created_at", "-id")

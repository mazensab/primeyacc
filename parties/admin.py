# ============================================================
# 📂 parties/admin.py
# 🧠 PrimeyAcc | Business Parties Admin V1.0
# ------------------------------------------------------------
# ✅ Register BusinessParty in Django Admin
# ✅ Organized list display for customers and suppliers
# ✅ Search by name, phone, email, VAT and commercial registration
# ✅ Filters by company, branch, type, kind and status
# ✅ Read-only audit timestamps
# ✅ Safe admin actions for activate, inactive, block and archive
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Django Admin أداة إدارة داخلية فقط وليس مصدر عزل /company
# - عزل /company الحقيقي يتم في APIs عبر CompanyMembership
# - لا يتم الاعتماد على company_id القادم من الفرونت كمصدر ثقة
# - BusinessParty هو الأساس الموحد للعملاء والموردين
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from .models import (
    BusinessParty,
    BusinessPartyKind,
    BusinessPartyStatus,
    BusinessPartyType,
)


@admin.register(BusinessParty)
class BusinessPartyAdmin(admin.ModelAdmin):
    """
    Admin configuration for customers, suppliers and shared business parties.
    """

    list_display = [
        "id",
        "display_name",
        "code",
        "company",
        "branch",
        "party_type",
        "party_kind",
        "status",
        "city",
        "phone",
        "mobile",
        "email",
        "vat_number",
        "created_at",
    ]
    list_display_links = [
        "id",
        "display_name",
    ]
    list_filter = [
        "status",
        "party_type",
        "party_kind",
        "company",
        "branch",
        "city",
        "tax_exempt",
        "created_at",
    ]
    search_fields = [
        "code",
        "display_name",
        "legal_name",
        "contact_person",
        "phone",
        "mobile",
        "whatsapp_number",
        "email",
        "commercial_registration",
        "vat_number",
        "national_id",
        "city",
        "short_address",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "blocked_at",
        "archived_at",
    ]
    autocomplete_fields = [
        "company",
        "branch",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "created_at"
    ordering = [
        "-created_at",
    ]
    list_per_page = 50
    actions = [
        "activate_parties",
        "mark_parties_inactive",
        "block_parties",
        "archive_parties",
    ]

    fieldsets = (
        (
            "Tenant",
            {
                "fields": (
                    "company",
                    "branch",
                )
            },
        ),
        (
            "Classification",
            {
                "fields": (
                    "party_type",
                    "party_kind",
                    "status",
                    "code",
                )
            },
        ),
        (
            "Main Information",
            {
                "fields": (
                    "display_name",
                    "legal_name",
                    "contact_person",
                )
            },
        ),
        (
            "Contact",
            {
                "fields": (
                    "phone",
                    "mobile",
                    "whatsapp_number",
                    "email",
                    "website",
                )
            },
        ),
        (
            "Commercial / Tax",
            {
                "fields": (
                    "commercial_registration",
                    "vat_number",
                    "national_id",
                    "tax_exempt",
                )
            },
        ),
        (
            "Address",
            {
                "fields": (
                    "country",
                    "city",
                    "district",
                    "street",
                    "building_number",
                    "additional_number",
                    "postal_code",
                    "short_address",
                    "address_line",
                )
            },
        ),
        (
            "Financial",
            {
                "fields": (
                    "credit_limit",
                    "opening_balance",
                    "opening_balance_date",
                    "payment_terms_days",
                )
            },
        ),
        (
            "Status Details",
            {
                "fields": (
                    "blocked_at",
                    "blocked_reason",
                    "archived_at",
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
        (
            "Extra",
            {
                "fields": (
                    "extra_data",
                    "notes",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    def save_model(
        self,
        request: HttpRequest,
        obj: BusinessParty,
        form,
        change: bool,
    ) -> None:
        """
        Keep admin audit fields updated.

        API audit assignment will be handled later in company party services/views.
        """
        if not change and not obj.created_by_id:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()
        super().save_model(request, obj, form, change)

    @admin.action(description="Activate selected parties")
    def activate_parties(
        self,
        request: HttpRequest,
        queryset,
    ) -> None:
        for party in queryset:
            party.activate(user=request.user)

    @admin.action(description="Mark selected parties inactive")
    def mark_parties_inactive(
        self,
        request: HttpRequest,
        queryset,
    ) -> None:
        for party in queryset:
            party.mark_inactive(user=request.user)

    @admin.action(description="Block selected parties")
    def block_parties(
        self,
        request: HttpRequest,
        queryset,
    ) -> None:
        for party in queryset:
            party.block(reason="Blocked from Django Admin.", user=request.user)

    @admin.action(description="Archive selected parties")
    def archive_parties(
        self,
        request: HttpRequest,
        queryset,
    ) -> None:
        for party in queryset:
            party.archive(user=request.user)

    def get_queryset(self, request: HttpRequest):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "branch",
                "created_by",
                "updated_by",
            )
        )

    def formfield_for_choice_field(
        self,
        db_field,
        request: HttpRequest,
        **kwargs,
    ):
        """
        Keep explicit choice handling readable for future admin customizations.
        """
        if db_field.name == "party_type":
            kwargs["choices"] = BusinessPartyType.choices

        if db_field.name == "party_kind":
            kwargs["choices"] = BusinessPartyKind.choices

        if db_field.name == "status":
            kwargs["choices"] = BusinessPartyStatus.choices

        return super().formfield_for_choice_field(
            db_field,
            request,
            **kwargs,
        )
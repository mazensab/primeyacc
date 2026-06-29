# ============================================================
# ًں“‚ activity_backends/admin.py
# ًں§  Mhamcloud | Activity-Specific Backends Admin â€” Phase 25.3
# ============================================================
# âœ… Admin registration for restaurant, clinic and project foundations
# ============================================================
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - Admin ظ„ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط¯ط§ط®ظ„ظٹط© ظپظ‚ط·.
# - ظ…ظ†ط·ظ‚ business ظٹط¨ظ‚ظ‰ ط¯ط§ط®ظ„ services.py.
# ============================================================

from django.contrib import admin

from .models import (
    ClinicAppointment,
    ClinicPatient,
    ClinicService,
    Project,
    ProjectCostLine,
    ProjectWorkOrder,
    RestaurantKitchenOrder,
    RestaurantKitchenOrderItem,
    RestaurantMenuCategory,
    RestaurantMenuItem,
    RestaurantTable,
)


class RestaurantKitchenOrderItemInline(admin.TabularInline):
    model = RestaurantKitchenOrderItem
    extra = 0
    readonly_fields = ["line_subtotal", "tax_amount", "line_total"]


@admin.register(RestaurantMenuCategory)
class RestaurantMenuCategoryAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "company", "is_active", "sort_order"]
    list_filter = ["company", "is_active"]
    search_fields = ["code", "name", "name_ar", "name_en"]


@admin.register(RestaurantMenuItem)
class RestaurantMenuItemAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "company", "category", "price", "is_available"]
    list_filter = ["company", "category", "is_available", "kitchen_station"]
    search_fields = ["code", "name", "name_ar", "name_en"]
    autocomplete_fields = ["category"]


@admin.register(RestaurantTable)
class RestaurantTableAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "company", "area", "capacity", "status", "is_active"]
    list_filter = ["company", "status", "area", "is_active"]
    search_fields = ["code", "name", "area"]


@admin.register(RestaurantKitchenOrder)
class RestaurantKitchenOrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "company", "table", "status", "total_amount", "order_date"]
    list_filter = ["company", "status", "order_date"]
    search_fields = ["order_number"]
    autocomplete_fields = ["table"]
    readonly_fields = ["subtotal", "tax_amount", "total_amount"]
    inlines = [RestaurantKitchenOrderItemInline]


@admin.register(ClinicPatient)
class ClinicPatientAdmin(admin.ModelAdmin):
    list_display = ["patient_number", "full_name", "company", "mobile", "national_id"]
    list_filter = ["company", "gender"]
    search_fields = ["patient_number", "full_name", "mobile", "national_id"]


@admin.register(ClinicService)
class ClinicServiceAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "company", "department", "price", "is_active"]
    list_filter = ["company", "department", "is_active"]
    search_fields = ["code", "name", "department"]


@admin.register(ClinicAppointment)
class ClinicAppointmentAdmin(admin.ModelAdmin):
    list_display = ["appointment_number", "company", "patient", "service", "status", "appointment_at"]
    list_filter = ["company", "status", "appointment_at", "practitioner_name"]
    search_fields = ["appointment_number", "patient__full_name", "service__name"]
    autocomplete_fields = ["patient", "service"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["project_number", "name", "company", "status", "budget_amount", "actual_cost_amount"]
    list_filter = ["company", "status", "start_date"]
    search_fields = ["project_number", "name"]


@admin.register(ProjectWorkOrder)
class ProjectWorkOrderAdmin(admin.ModelAdmin):
    list_display = ["work_order_number", "title", "company", "project", "status", "estimated_amount"]
    list_filter = ["company", "status"]
    search_fields = ["work_order_number", "title", "project__project_number"]
    autocomplete_fields = ["project"]


@admin.register(ProjectCostLine)
class ProjectCostLineAdmin(admin.ModelAdmin):
    list_display = ["project", "work_order", "cost_type", "description", "quantity", "unit_cost", "total_cost"]
    list_filter = ["company", "cost_type", "cost_date"]
    search_fields = ["description", "project__project_number", "work_order__work_order_number"]
    autocomplete_fields = ["project", "work_order"]

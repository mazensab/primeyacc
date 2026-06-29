# ============================================================
# ًں“‚ api/company/activity_backends/urls.py
# ًں§  Mhamcloud | Company Activity Backends API Routes â€” Phase 25.3
# ============================================================

from django.urls import path

from . import views


app_name = "company_activity_backends"


urlpatterns = [
    path("", views.summary_view, name="summary"),
    path("summary/", views.summary_view, name="summary"),
    path("seed/", views.seed_view, name="seed"),

    path("restaurant/categories/", views.restaurant_categories_view, name="restaurant-categories"),
    path("restaurant/menu-items/", views.restaurant_menu_items_view, name="restaurant-menu-items"),
    path("restaurant/tables/", views.restaurant_tables_view, name="restaurant-tables"),
    path("restaurant/kitchen-orders/", views.restaurant_kitchen_orders_view, name="restaurant-kitchen-orders"),

    path("clinic/patients/", views.clinic_patients_view, name="clinic-patients"),
    path("clinic/services/", views.clinic_services_view, name="clinic-services"),
    path("clinic/appointments/", views.clinic_appointments_view, name="clinic-appointments"),

    path("projects/", views.projects_view, name="projects"),
    path("projects/work-orders/", views.project_work_orders_view, name="project-work-orders"),
    path("projects/cost-lines/", views.project_cost_lines_view, name="project-cost-lines"),
]

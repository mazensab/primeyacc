from __future__ import annotations
from django.urls import path
from .views import (
    company_detail,
    company_retry,
    companies_list,
    integration_settings,
    integration_status,
    run_sync_now,
    runs_list,
    test_connection,
)
app_name = "system_mhamcloud"
urlpatterns = [
    path("status/", integration_status, name="status"),
    path("settings/", integration_settings, name="settings"),
    path("test-connection/", test_connection, name="test_connection"),
    path("companies/", companies_list, name="companies"),
    path("companies/<str:business_id>/", company_detail, name="company_detail"),
    path("companies/<str:business_id>/retry/", company_retry, name="company_retry"),
    path("runs/", runs_list, name="runs"),
    path("run-sync/", run_sync_now, name="run_sync"),
]

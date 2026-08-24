from __future__ import annotations

from django.urls import path

from .views import (
    system_platform_reports_export,
    system_platform_reports_overview,
)


app_name = "system_platform_reports"


urlpatterns = [
    path(
        "",
        system_platform_reports_overview,
        name="overview",
    ),
    path(
        "export/",
        system_platform_reports_export,
        name="export",
    ),
]

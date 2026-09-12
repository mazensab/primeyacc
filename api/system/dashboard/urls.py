from __future__ import annotations

from django.urls import path

from .analytics import system_dashboard_analytics
from .views import system_dashboard_overview


app_name = "system_dashboard"

urlpatterns = [
    path("overview/", system_dashboard_overview, name="overview"),
    path("analytics/", system_dashboard_analytics, name="analytics"),
]

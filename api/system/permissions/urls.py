from __future__ import annotations
from django.urls import path
from .views import (
    system_permissions_groups,
    system_permissions_list,
    system_permissions_overview,
)
app_name = "system_permissions"
urlpatterns = [
    path("", system_permissions_overview, name="overview"),
    path("list/", system_permissions_list, name="list"),
    path("groups/", system_permissions_groups, name="groups"),
]

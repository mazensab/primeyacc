from __future__ import annotations
from django.urls import path
from .views import (
    system_roles_list,
    system_roles_overview,
    system_roles_permissions,
)
app_name = "system_roles"
urlpatterns = [
    path("", system_roles_overview, name="overview"),
    path("list/", system_roles_list, name="list"),
    path("permissions/", system_roles_permissions, name="permissions"),
]

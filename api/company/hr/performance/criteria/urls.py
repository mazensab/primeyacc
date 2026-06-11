from __future__ import annotations

from django.urls import path

from .actions import (
    performance_criterion_activate,
    performance_criterion_deactivate,
)
from .create import performance_criterion_create
from .detail import performance_criterion_detail
from .list import performance_criteria_list
from .update import performance_criterion_update

urlpatterns = [
    path("", performance_criteria_list, name="performance-criteria-list"),
    path("create/", performance_criterion_create, name="performance-criterion-create"),
    path("<int:criterion_id>/", performance_criterion_detail, name="performance-criterion-detail"),
    path("<int:criterion_id>/update/", performance_criterion_update, name="performance-criterion-update"),
    path("<int:criterion_id>/activate/", performance_criterion_activate, name="performance-criterion-activate"),
    path("<int:criterion_id>/deactivate/", performance_criterion_deactivate, name="performance-criterion-deactivate"),
]

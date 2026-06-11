from __future__ import annotations

from django.urls import path

from .actions import (
    performance_cycle_cancel,
    performance_cycle_close,
    performance_cycle_open,
)
from .create import performance_cycle_create
from .detail import performance_cycle_detail
from .list import performance_cycles_list
from .update import performance_cycle_update

urlpatterns = [
    path("", performance_cycles_list, name="performance-cycles-list"),
    path("create/", performance_cycle_create, name="performance-cycle-create"),
    path("<int:cycle_id>/", performance_cycle_detail, name="performance-cycle-detail"),
    path("<int:cycle_id>/update/", performance_cycle_update, name="performance-cycle-update"),
    path("<int:cycle_id>/open/", performance_cycle_open, name="performance-cycle-open"),
    path("<int:cycle_id>/close/", performance_cycle_close, name="performance-cycle-close"),
    path("<int:cycle_id>/cancel/", performance_cycle_cancel, name="performance-cycle-cancel"),
]

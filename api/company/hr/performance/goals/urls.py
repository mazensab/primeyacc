from __future__ import annotations

from django.urls import path

from .actions import (
    employee_goal_activate,
    employee_goal_cancel,
    employee_goal_complete,
)
from .create import employee_goal_create
from .detail import employee_goal_detail
from .list import employee_goals_list
from .update import employee_goal_update

urlpatterns = [
    path("", employee_goals_list, name="employee-goals-list"),
    path("create/", employee_goal_create, name="employee-goal-create"),
    path("<int:goal_id>/", employee_goal_detail, name="employee-goal-detail"),
    path("<int:goal_id>/update/", employee_goal_update, name="employee-goal-update"),
    path("<int:goal_id>/activate/", employee_goal_activate, name="employee-goal-activate"),
    path("<int:goal_id>/complete/", employee_goal_complete, name="employee-goal-complete"),
    path("<int:goal_id>/cancel/", employee_goal_cancel, name="employee-goal-cancel"),
]

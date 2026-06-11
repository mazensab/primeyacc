from __future__ import annotations

from django.urls import path

from .create import performance_score_create
from .delete import performance_score_delete
from .detail import performance_score_detail
from .list import performance_scores_list
from .update import performance_score_update

urlpatterns = [
    path("", performance_scores_list, name="performance-scores-list"),
    path("create/", performance_score_create, name="performance-score-create"),
    path("<int:score_id>/", performance_score_detail, name="performance-score-detail"),
    path("<int:score_id>/update/", performance_score_update, name="performance-score-update"),
    path("<int:score_id>/delete/", performance_score_delete, name="performance-score-delete"),
]

from __future__ import annotations

from django.urls import path

from .actions import (
    performance_review_approve,
    performance_review_cancel,
    performance_review_submit,
)
from .create import performance_review_create
from .detail import performance_review_detail
from .list import performance_reviews_list
from .update import performance_review_update

urlpatterns = [
    path("", performance_reviews_list, name="performance-reviews-list"),
    path("create/", performance_review_create, name="performance-review-create"),
    path("<int:review_id>/", performance_review_detail, name="performance-review-detail"),
    path("<int:review_id>/update/", performance_review_update, name="performance-review-update"),
    path("<int:review_id>/submit/", performance_review_submit, name="performance-review-submit"),
    path("<int:review_id>/approve/", performance_review_approve, name="performance-review-approve"),
    path("<int:review_id>/cancel/", performance_review_cancel, name="performance-review-cancel"),
]

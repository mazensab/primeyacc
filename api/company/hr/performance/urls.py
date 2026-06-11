from __future__ import annotations

from django.urls import include, path

urlpatterns = [
    path("cycles/", include("api.company.hr.performance.cycles.urls")),
    path("criteria/", include("api.company.hr.performance.criteria.urls")),
    path("reviews/", include("api.company.hr.performance.reviews.urls")),
    path("scores/", include("api.company.hr.performance.scores.urls")),
    path("goals/", include("api.company.hr.performance.goals.urls")),
]

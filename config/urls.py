from django.contrib import admin
from django.urls import include, path

from core.views import health_check


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="api_health"),
    path("api/", include("api.urls")),
]
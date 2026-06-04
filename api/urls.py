from django.urls import include, path

urlpatterns = [
    path("system/", include("api.system.urls")),
    path("company/", include("api.company.urls")),
]
# ============================================================
# 📂 api/system/integration_api_keys/urls.py
# 🧠 PrimeyAcc | System Integration API Keys URLs V1.0
# ------------------------------------------------------------
# ✅ System endpoints for Integration API Keys
# ✅ List/create/detail/update/actions/usage
# ============================================================

from __future__ import annotations

from django.urls import path

from .views import (
    SystemIntegrationApiKeyDetailView,
    SystemIntegrationApiKeyDisableView,
    SystemIntegrationApiKeyEnableView,
    SystemIntegrationApiKeyListCreateView,
    SystemIntegrationApiKeyRevokeView,
    SystemIntegrationApiKeyRotateView,
    SystemIntegrationApiKeyUsageView,
)


app_name = "integration_api_keys"


urlpatterns = [
    path("", SystemIntegrationApiKeyListCreateView.as_view(), name="list_create"),
    path("<int:pk>/", SystemIntegrationApiKeyDetailView.as_view(), name="detail"),
    path("<int:pk>/disable/", SystemIntegrationApiKeyDisableView.as_view(), name="disable"),
    path("<int:pk>/enable/", SystemIntegrationApiKeyEnableView.as_view(), name="enable"),
    path("<int:pk>/revoke/", SystemIntegrationApiKeyRevokeView.as_view(), name="revoke"),
    path("<int:pk>/rotate/", SystemIntegrationApiKeyRotateView.as_view(), name="rotate"),
    path("<int:pk>/usage/", SystemIntegrationApiKeyUsageView.as_view(), name="usage"),
]

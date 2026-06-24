# ============================================================
# 📂 settings_center/urls.py
# PrimeyAcc | System Settings Center URLs
# ------------------------------------------------------------
# ✅ Backend only
# ✅ Mounted under /api/system/settings/
# ============================================================

from django.urls import path

from .views import (
    SystemSettingDetailAPIView,
    SystemSettingListCreateAPIView,
    SystemSettingResetAPIView,
    SystemSettingsBulkUpdateAPIView,
    SystemSettingsSeedDefaultsAPIView,
    SystemSettingsSummaryAPIView,
)

app_name = "settings_center"

urlpatterns = [
    path("", SystemSettingListCreateAPIView.as_view(), name="system-settings-list"),
    path("summary/", SystemSettingsSummaryAPIView.as_view(), name="system-settings-summary"),
    path("seed-defaults/", SystemSettingsSeedDefaultsAPIView.as_view(), name="system-settings-seed-defaults"),
    path("bulk/", SystemSettingsBulkUpdateAPIView.as_view(), name="system-settings-bulk"),
    path("<int:pk>/", SystemSettingDetailAPIView.as_view(), name="system-settings-detail"),
    path("<int:pk>/reset/", SystemSettingResetAPIView.as_view(), name="system-settings-reset"),
]
# ============================================================
# 📂 settings_center/apps.py
# Mhamcloud | Settings Center App Config
# ------------------------------------------------------------
# ✅ Backend only
# ✅ System settings center foundation
# ✅ No frontend changes
# ============================================================

from django.apps import AppConfig


class SettingsCenterConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "settings_center"
    verbose_name = "Settings Center"
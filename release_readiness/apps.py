# ============================================================
# 📂 release_readiness/apps.py
# 🧠 PrimeyAcc | Release Readiness App Config
# ============================================================
# ✅ Registers release readiness app
# ✅ Loads safe Django system checks
# ✅ No database migrations required
# ============================================================

from django.apps import AppConfig


class ReleaseReadinessConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "release_readiness"
    verbose_name = "PrimeyAcc Release Readiness"

    def ready(self) -> None:
        from . import checks  # noqa: F401

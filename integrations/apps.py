# ============================================================
# 📂 integrations/apps.py
# 🧠 PrimeyAcc | Integration API Keys App Config V1.0
# ------------------------------------------------------------
# ✅ Integration API Keys foundation
# ✅ Third-party/company integration security layer
# ✅ System-managed integration credentials
# ✅ Future-ready for external API authentication
# ============================================================

from __future__ import annotations

from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "integrations"
    verbose_name = "Integrations"

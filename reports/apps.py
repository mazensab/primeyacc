# ============================================================
# 📂 reports/apps.py
# 🧠 Mhamcloud | Reports App Config
# ------------------------------------------------------------
# ✅ Phase 16.1 Reports Foundation
# ✅ Company financial reports foundation
# ✅ No business logic inside apps.py
# ============================================================

from __future__ import annotations

from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reports"
    verbose_name = "Mhamcloud Reports"
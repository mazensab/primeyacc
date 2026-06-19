# ============================================================
# 📂 jewelry/apps.py
# 🧠 PrimeyAcc | Jewelry App Configuration
# ============================================================
# ✅ Registers the jewelry and gold backend foundation
# ✅ Keeps activity-specific logic isolated from inventory core
# ============================================================

from django.apps import AppConfig


class JewelryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "jewelry"
    verbose_name = "Jewelry and Gold"


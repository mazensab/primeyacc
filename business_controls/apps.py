# ============================================================
# 📂 business_controls/apps.py
# 🧠 PrimeyAcc | Business Controls App Configuration V1.0
# ------------------------------------------------------------
# ✅ Production hardening foundation
# ✅ Business audit events
# ✅ Idempotency records
# ✅ Business reference sequencing
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا التطبيق مستقل ولا يغير منجزات المراحل السابقة
# - يستخدم كطبقة رقابية وإنتاجية مشتركة
# - لا يحتوي منطق وحدات الأعمال الأصلية
# ============================================================

from __future__ import annotations

from django.apps import AppConfig


class BusinessControlsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "business_controls"
    verbose_name = "Business Controls"

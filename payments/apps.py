# ============================================================
# 📂 payments/apps.py
# 🧠 Mhamcloud | Company Payments App Configuration
# ------------------------------------------------------------
# ✅ Registers company payment methods foundation app
# ✅ Prepares gateways, terminals, and settlement configuration
# ✅ Keeps payment logic separated from system subscription billing
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا التطبيق خاص بطرق دفع الشركات داخل /company
# - لا يتم استخدامه لدفع اشتراكات Mhamcloud الخاصة بالمنصة
# ============================================================

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "payments"
    verbose_name = "Company Payments"
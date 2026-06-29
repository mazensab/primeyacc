# ============================================================
# ًں“‚ activity_backends/apps.py
# ًں§  Mhamcloud | Activity-Specific Backends App â€” Phase 25.3
# ============================================================
# âœ… Restaurant / food activity backend foundation
# âœ… Clinic / medical activity backend foundation
# âœ… Contracting / project activity backend foundation
# âœ… Company-scoped app registration
# ============================================================
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ‡ط°ط§ ط§ظ„طھط·ط¨ظٹظ‚ ظٹط¬ظ…ط¹ foundations ظ„ظ„ظ†ط´ط§ط·ط§طھ ط§ظ„ظ…طھط®طµطµط©.
# - ظ„ط§ ظٹظƒط±ط± ظ…ظ†ط·ظ‚ ط§ظ„ظ…ط­ط§ط³ط¨ط© ط£ظˆ ط§ظ„ظ…ط®ط²ظˆظ† ط£ظˆ ط§ظ„ظ…ط¨ظٹط¹ط§طھ.
# - ط§ظ„طھظƒط§ظ…ظ„ ط§ظ„ط¹ظ…ظٹظ‚ ظٹطھظ… ظ„ط§ط­ظ‚ط§ ط¹ط¨ط± services ظˆظ„ظٹط³ ظ…ظ† models.
# ============================================================

from django.apps import AppConfig


class ActivityBackendsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "activity_backends"
    verbose_name = "Mhamcloud Activity Backends"

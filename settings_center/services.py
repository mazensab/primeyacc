# ============================================================
# 📂 settings_center/services.py
# PrimeyAcc | System Settings Center Services
# ------------------------------------------------------------
# ✅ Backend only
# ✅ Type validation
# ✅ Default settings seed
# ✅ Summary helpers for system dashboard/settings page
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, URLValidator
from django.db import transaction
from django.utils import timezone

from .models import SystemSetting


SYSTEM_SETTING_DEFAULTS: list[dict[str, Any]] = [
    {
        "group": "platform",
        "key": "platform_name",
        "label_ar": "اسم المنصة",
        "label_en": "Platform Name",
        "description_ar": "الاسم الظاهر لمنصة PrimeyAcc في إعدادات النظام.",
        "description_en": "Visible PrimeyAcc platform name in system settings.",
        "value_type": SystemSetting.ValueType.STRING,
        "value": "PrimeyAcc",
        "default_value": "PrimeyAcc",
        "is_public": True,
        "is_required": True,
        "sort_order": 10,
    },
    {
        "group": "localization",
        "key": "default_language",
        "label_ar": "اللغة الافتراضية",
        "label_en": "Default Language",
        "description_ar": "اللغة الافتراضية لواجهات النظام.",
        "description_en": "Default language for system interfaces.",
        "value_type": SystemSetting.ValueType.STRING,
        "value": "ar",
        "default_value": "ar",
        "is_public": True,
        "is_required": True,
        "sort_order": 20,
    },
    {
        "group": "billing",
        "key": "default_currency",
        "label_ar": "العملة الافتراضية",
        "label_en": "Default Currency",
        "description_ar": "رمز العملة الافتراضية للفوترة.",
        "description_en": "Default billing currency code.",
        "value_type": SystemSetting.ValueType.STRING,
        "value": "SAR",
        "default_value": "SAR",
        "is_public": True,
        "is_required": True,
        "sort_order": 30,
    },
    {
        "group": "billing",
        "key": "vat_rate",
        "label_ar": "نسبة ضريبة القيمة المضافة",
        "label_en": "VAT Rate",
        "description_ar": "النسبة الافتراضية لضريبة القيمة المضافة داخل المنصة.",
        "description_en": "Default platform VAT rate.",
        "value_type": SystemSetting.ValueType.DECIMAL,
        "value": "15.00",
        "default_value": "15.00",
        "is_public": False,
        "is_required": True,
        "sort_order": 40,
    },
    {
        "group": "subscriptions",
        "key": "trial_days",
        "label_ar": "أيام التجربة",
        "label_en": "Trial Days",
        "description_ar": "عدد أيام التجربة الافتراضية لاشتراكات الشركات.",
        "description_en": "Default trial days for company subscriptions.",
        "value_type": SystemSetting.ValueType.INTEGER,
        "value": 14,
        "default_value": 14,
        "is_public": False,
        "is_required": True,
        "sort_order": 50,
    },
    {
        "group": "security",
        "key": "require_2fa",
        "label_ar": "تفعيل المصادقة الثنائية",
        "label_en": "Require Two-Factor Authentication",
        "description_ar": "تحديد ما إذا كانت المصادقة الثنائية مطلوبة لحسابات النظام.",
        "description_en": "Whether 2FA is required for system accounts.",
        "value_type": SystemSetting.ValueType.BOOLEAN,
        "value": False,
        "default_value": False,
        "is_public": False,
        "is_required": False,
        "sort_order": 60,
    },
    {
        "group": "notifications",
        "key": "email_enabled",
        "label_ar": "تفعيل البريد الإلكتروني",
        "label_en": "Email Notifications Enabled",
        "description_ar": "تحديد ما إذا كانت إشعارات البريد الإلكتروني مفعلة على مستوى النظام.",
        "description_en": "Whether platform email notifications are enabled.",
        "value_type": SystemSetting.ValueType.BOOLEAN,
        "value": False,
        "default_value": False,
        "is_public": False,
        "is_required": False,
        "sort_order": 70,
    },
    {
        "group": "documents",
        "key": "default_document_language",
        "label_ar": "لغة المستندات الافتراضية",
        "label_en": "Default Document Language",
        "description_ar": "اللغة الافتراضية للمستندات المطبوعة والمصدرة.",
        "description_en": "Default language for printed and exported documents.",
        "value_type": SystemSetting.ValueType.STRING,
        "value": "ar",
        "default_value": "ar",
        "is_public": False,
        "is_required": True,
        "sort_order": 80,
    },
    {
        "group": "appearance",
        "key": "theme",
        "label_ar": "سمة النظام",
        "label_en": "System Theme",
        "description_ar": "السمة الافتراضية لواجهة النظام.",
        "description_en": "Default system UI theme.",
        "value_type": SystemSetting.ValueType.STRING,
        "value": "neutral",
        "default_value": "neutral",
        "is_public": True,
        "is_required": False,
        "sort_order": 90,
    },
]


def normalize_setting_value(value_type: str, value: Any) -> Any:
    """Validate and normalize a setting value for JSON storage."""

    if value_type in {SystemSetting.ValueType.STRING, SystemSetting.ValueType.TEXT}:
        if value is None:
            return ""
        if isinstance(value, (dict, list)):
            raise ValidationError("String settings cannot store objects or arrays.")
        return str(value)

    if value_type == SystemSetting.ValueType.INTEGER:
        if isinstance(value, bool):
            raise ValidationError("Integer settings cannot store boolean values.")
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValidationError("Invalid integer setting value.")

    if value_type == SystemSetting.ValueType.DECIMAL:
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError("Invalid decimal setting value.")
        return str(decimal_value.quantize(Decimal("0.01")))

    if value_type == SystemSetting.ValueType.BOOLEAN:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"true", "1", "yes", "y", "on"}:
                return True
            if lowered in {"false", "0", "no", "n", "off"}:
                return False
        raise ValidationError("Invalid boolean setting value.")

    if value_type == SystemSetting.ValueType.JSON:
        if value is None:
            return {}
        if not isinstance(value, (dict, list)):
            raise ValidationError("JSON settings must store an object or array.")
        return value

    if value_type == SystemSetting.ValueType.URL:
        normalized = str(value or "").strip()
        URLValidator()(normalized)
        return normalized

    if value_type == SystemSetting.ValueType.EMAIL:
        normalized = str(value or "").strip().lower()
        EmailValidator()(normalized)
        return normalized

    raise ValidationError("Unsupported setting value type.")


def set_system_setting_value(setting: SystemSetting, value: Any, actor=None) -> SystemSetting:
    normalized_value = normalize_setting_value(setting.value_type, value)
    setting.value_json = {"value": normalized_value}
    if actor is not None and getattr(actor, "is_authenticated", False):
        setting.updated_by = actor
    setting.updated_at = timezone.now()
    setting.save(update_fields=["value_json", "updated_by", "updated_at"])
    return setting


@transaction.atomic
def seed_default_system_settings(actor=None) -> dict[str, int]:
    created = 0
    updated = 0

    for item in SYSTEM_SETTING_DEFAULTS:
        value_type = item["value_type"]
        value = normalize_setting_value(value_type, item["value"])
        default_value = normalize_setting_value(value_type, item["default_value"])

        defaults = {
            "label_ar": item["label_ar"],
            "label_en": item["label_en"],
            "description_ar": item.get("description_ar", ""),
            "description_en": item.get("description_en", ""),
            "value_type": value_type,
            "value_json": {"value": value},
            "default_value_json": {"value": default_value},
            "is_active": item.get("is_active", True),
            "is_public": item.get("is_public", False),
            "is_required": item.get("is_required", False),
            "sort_order": item.get("sort_order", 100),
        }

        setting, was_created = SystemSetting.objects.get_or_create(
            group=item["group"],
            key=item["key"],
            defaults=defaults,
        )

        if was_created:
            created += 1
            if actor is not None and getattr(actor, "is_authenticated", False):
                setting.updated_by = actor
                setting.save(update_fields=["updated_by"])
            continue

        changed = False
        for field, new_value in defaults.items():
            if field == "value_json":
                continue
            if getattr(setting, field) != new_value:
                setattr(setting, field, new_value)
                changed = True

        if changed:
            if actor is not None and getattr(actor, "is_authenticated", False):
                setting.updated_by = actor
            setting.updated_at = timezone.now()
            setting.save()
            updated += 1

    return {"created": created, "updated": updated}


def reset_setting_to_default(setting: SystemSetting, actor=None) -> SystemSetting:
    default_value = setting.default_value_json.get("value")
    return set_system_setting_value(setting, default_value, actor=actor)


def get_system_settings_summary() -> dict[str, Any]:
    qs = SystemSetting.objects.all()
    return {
        "total": qs.count(),
        "active": qs.filter(is_active=True).count(),
        "public": qs.filter(is_public=True).count(),
        "required": qs.filter(is_required=True).count(),
        "groups": list(qs.order_by("group").values_list("group", flat=True).distinct()),
    }
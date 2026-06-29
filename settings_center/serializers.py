# ============================================================
# 📂 settings_center/serializers.py
# Mhamcloud | System Settings Center Serializers
# ------------------------------------------------------------
# ✅ Backend only
# ✅ DRF serializers
# ✅ Typed value validation via services
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import SystemSetting
from .services import normalize_setting_value


class SystemSettingSerializer(serializers.ModelSerializer):
    full_key = serializers.CharField(read_only=True)
    value = serializers.JSONField(required=False)
    default_value = serializers.JSONField(read_only=True)
    updated_by_display = serializers.SerializerMethodField()

    class Meta:
        model = SystemSetting
        fields = [
            "id",
            "group",
            "key",
            "full_key",
            "label_ar",
            "label_en",
            "description_ar",
            "description_en",
            "value_type",
            "value",
            "default_value",
            "validation_schema",
            "is_active",
            "is_public",
            "is_required",
            "sort_order",
            "updated_by_display",
            "updated_at",
            "created_at",
        ]
        read_only_fields = ["id", "full_key", "updated_by_display", "updated_at", "created_at"]

    def get_updated_by_display(self, obj: SystemSetting) -> str:
        user = obj.updated_by
        if not user:
            return ""
        return (
            getattr(user, "get_full_name", lambda: "")()
            or getattr(user, "email", "")
            or getattr(user, "username", "")
            or str(user)
        )

    def to_representation(self, instance: SystemSetting) -> dict:
        data = super().to_representation(instance)
        data["value"] = instance.value
        data["default_value"] = instance.default_value
        return data

    def validate(self, attrs: dict) -> dict:
        value_type = attrs.get("value_type") or getattr(self.instance, "value_type", None)
        if "value" in attrs:
            try:
                attrs["value"] = normalize_setting_value(value_type, attrs["value"])
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"value": exc.messages})
        return attrs

    def create(self, validated_data: dict) -> SystemSetting:
        value = validated_data.pop("value", None)
        if value is None:
            value = validated_data.get("default_value_json", {}).get("value", "")
            value = normalize_setting_value(validated_data["value_type"], value)

        validated_data["value_json"] = {"value": value}
        validated_data.setdefault("default_value_json", {"value": value})

        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["updated_by"] = request.user

        return super().create(validated_data)

    def update(self, instance: SystemSetting, validated_data: dict) -> SystemSetting:
        value = validated_data.pop("value", serializers.empty)

        for field, field_value in validated_data.items():
            setattr(instance, field, field_value)

        if value is not serializers.empty:
            instance.value_json = {"value": value}

        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            instance.updated_by = request.user

        instance.save()
        return instance


class SystemSettingBulkUpdateItemSerializer(serializers.Serializer):
    group = serializers.CharField(max_length=80)
    key = serializers.CharField(max_length=120)
    value = serializers.JSONField()


class SystemSettingsSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    active = serializers.IntegerField()
    public = serializers.IntegerField()
    required = serializers.IntegerField()
    groups = serializers.ListField(child=serializers.CharField())
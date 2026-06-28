# ============================================================
# 📂 api/system/integration_api_keys/serializers.py
# 🧠 PrimeyAcc | System Integration API Keys Serializers V1.0
# ------------------------------------------------------------
# ✅ System serializers for Integration API Keys
# ✅ One-time secret response support
# ✅ Scope and IP allowlist validation
# ============================================================

from __future__ import annotations

from rest_framework import serializers

from companies.models import Company
from integrations.models import (
    ALLOWED_INTEGRATION_SCOPES,
    IntegrationApiKey,
    IntegrationApiKeyEnvironment,
    IntegrationApiKeyUsageLog,
)
from integrations.services import normalize_scopes


class IntegrationApiKeyListSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.display_name", read_only=True)
    company_code = serializers.CharField(source="company.company_code", read_only=True)
    effective_status = serializers.CharField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = IntegrationApiKey
        fields = [
            "id",
            "company_id",
            "company_name",
            "company_code",
            "name",
            "description",
            "environment",
            "status",
            "effective_status",
            "is_expired",
            "key_prefix",
            "scopes",
            "ip_allowlist",
            "rate_limit_per_minute",
            "expires_at",
            "last_used_at",
            "usage_count",
            "created_by_username",
            "created_at",
            "updated_at",
        ]


class IntegrationApiKeyDetailSerializer(IntegrationApiKeyListSerializer):
    rotated_from_id = serializers.IntegerField(source="rotated_from.id", read_only=True)
    disabled_by_username = serializers.CharField(
        source="disabled_by.username",
        read_only=True,
        allow_null=True,
    )
    revoked_by_username = serializers.CharField(
        source="revoked_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta(IntegrationApiKeyListSerializer.Meta):
        fields = IntegrationApiKeyListSerializer.Meta.fields + [
            "rotated_from_id",
            "disabled_at",
            "disabled_by_username",
            "disabled_reason",
            "revoked_at",
            "revoked_by_username",
            "revoked_reason",
            "metadata",
        ]


class IntegrationApiKeyCreateSerializer(serializers.Serializer):
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source="company",
    )
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    environment = serializers.ChoiceField(
        choices=IntegrationApiKeyEnvironment.choices,
        default=IntegrationApiKeyEnvironment.TEST,
    )
    scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=[(scope, scope) for scope in ALLOWED_INTEGRATION_SCOPES]),
        allow_empty=False,
        default=list,
    )
    ip_allowlist = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
    )
    rate_limit_per_minute = serializers.IntegerField(
        min_value=1,
        max_value=100000,
        default=60,
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False, default=dict)

    def validate_scopes(self, value):
        return normalize_scopes(value or ["company.read"])


class IntegrationApiKeyUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=[(scope, scope) for scope in ALLOWED_INTEGRATION_SCOPES]),
        allow_empty=False,
        required=False,
    )
    ip_allowlist = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
    )
    rate_limit_per_minute = serializers.IntegerField(
        min_value=1,
        max_value=100000,
        required=False,
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False)

    def validate_scopes(self, value):
        return normalize_scopes(value)


class IntegrationApiKeyActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class IntegrationApiKeyUsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationApiKeyUsageLog
        fields = [
            "id",
            "method",
            "path",
            "status_code",
            "ip_address",
            "user_agent",
            "request_id",
            "scope",
            "success",
            "error_message",
            "created_at",
        ]

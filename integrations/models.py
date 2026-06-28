# ============================================================
# 📂 integrations/models.py
# 🧠 PrimeyAcc | Integration API Keys Models V1.0
# ------------------------------------------------------------
# ✅ Secure Integration API Key model
# ✅ Hashed key storage only
# ✅ One-company tenant boundary
# ✅ Scopes / environment / lifecycle status
# ✅ Usage logging foundation
# ✅ Multi-company isolation ready
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم تخزين المفتاح الخام نهائيا
# - المفتاح الخام يظهر مرة واحدة فقط عند الإنشاء أو التدوير
# - كل مفتاح مرتبط بشركة واحدة فقط
# - لا يتم الوثوق بأي company_id قادم من جهة خارجية
# - system فقط يدير المفاتيح في هذه المرحلة
# ============================================================

from __future__ import annotations

import ipaddress

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from companies.models import Company, CompanyStatus


ALLOWED_INTEGRATION_SCOPES = [
    "company.read",
    "customers.read",
    "customers.write",
    "products.read",
    "products.write",
    "sales_invoices.read",
    "sales_invoices.write",
    "payments.read",
    "reports.read",
    "webhooks.manage",
]


class IntegrationApiKeyEnvironment(models.TextChoices):
    TEST = "TEST", "Test"
    LIVE = "LIVE", "Live"


class IntegrationApiKeyStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DISABLED = "DISABLED", "Disabled"
    REVOKED = "REVOKED", "Revoked"
    EXPIRED = "EXPIRED", "Expired"


class IntegrationApiKey(models.Model):
    """
    Secure API key used by external integrations.

    Important:
    - key_hash stores a Django password hash of the raw secret.
    - key_prefix is safe to display and is used for lookup.
    - raw key is never stored and must be shown once only.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="integration_api_keys",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Key name",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description",
    )

    environment = models.CharField(
        max_length=20,
        choices=IntegrationApiKeyEnvironment.choices,
        default=IntegrationApiKeyEnvironment.TEST,
        db_index=True,
        verbose_name="Environment",
    )
    status = models.CharField(
        max_length=20,
        choices=IntegrationApiKeyStatus.choices,
        default=IntegrationApiKeyStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    key_prefix = models.CharField(
        max_length=80,
        unique=True,
        db_index=True,
        verbose_name="Key prefix",
        help_text="Safe display prefix. The full key is never stored.",
    )
    key_hash = models.CharField(
        max_length=255,
        unique=True,
        verbose_name="Key hash",
    )

    scopes = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Scopes",
        help_text="Allowed integration permissions for this key.",
    )
    ip_allowlist = models.JSONField(
        default=list,
        blank=True,
        verbose_name="IP allowlist",
        help_text="Optional list of IPs or CIDR ranges allowed to use this key.",
    )

    rate_limit_per_minute = models.PositiveIntegerField(
        default=60,
        verbose_name="Rate limit per minute",
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expires at",
    )
    last_used_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Last used at",
    )
    usage_count = models.PositiveBigIntegerField(
        default=0,
        verbose_name="Usage count",
    )

    rotated_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="rotated_keys",
        verbose_name="Rotated from",
    )

    disabled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Disabled at",
    )
    disabled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="disabled_integration_api_keys",
        verbose_name="Disabled by",
    )
    disabled_reason = models.TextField(
        blank=True,
        verbose_name="Disabled reason",
    )

    revoked_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Revoked at",
    )
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="revoked_integration_api_keys",
        verbose_name="Revoked by",
    )
    revoked_reason = models.TextField(
        blank=True,
        verbose_name="Revoked reason",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadata",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_integration_api_keys",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_integration_api_keys",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Integration API key"
        verbose_name_plural = "Integration API keys"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "environment"]),
            models.Index(fields=["status", "environment"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["last_used_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.company.display_name} - {self.environment}"

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and timezone.now() >= self.expires_at)

    @property
    def effective_status(self) -> str:
        if self.is_expired:
            return IntegrationApiKeyStatus.EXPIRED
        return self.status

    @property
    def is_usable(self) -> bool:
        return (
            self.status == IntegrationApiKeyStatus.ACTIVE
            and not self.is_expired
            and self.company.is_active
            and self.company.status
            not in [
                CompanyStatus.SUSPENDED,
                CompanyStatus.EXPIRED,
                CompanyStatus.CANCELLED,
            ]
        )

    def clean(self) -> None:
        if not isinstance(self.scopes, list):
            raise ValidationError({"scopes": "Scopes must be a list."})

        invalid_scopes = [
            scope for scope in self.scopes if scope not in ALLOWED_INTEGRATION_SCOPES
        ]
        if invalid_scopes:
            raise ValidationError(
                {"scopes": f"Invalid scopes: {', '.join(invalid_scopes)}"}
            )

        if not isinstance(self.ip_allowlist, list):
            raise ValidationError({"ip_allowlist": "IP allowlist must be a list."})

        for ip_value in self.ip_allowlist:
            try:
                ipaddress.ip_network(str(ip_value), strict=False)
            except ValueError as exc:
                raise ValidationError(
                    {"ip_allowlist": f"Invalid IP/CIDR value: {ip_value}"}
                ) from exc

        if not isinstance(self.metadata, dict):
            raise ValidationError({"metadata": "Metadata must be a JSON object."})


class IntegrationApiKeyUsageLog(models.Model):
    """
    Usage log for Integration API Keys.

    This is intentionally append-only from services.
    """

    api_key = models.ForeignKey(
        IntegrationApiKey,
        on_delete=models.CASCADE,
        related_name="usage_logs",
        db_index=True,
        verbose_name="API key",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="integration_api_key_usage_logs",
        db_index=True,
        verbose_name="Company",
    )

    method = models.CharField(
        max_length=12,
        db_index=True,
        verbose_name="HTTP method",
    )
    path = models.CharField(
        max_length=500,
        db_index=True,
        verbose_name="Request path",
    )
    status_code = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Status code",
    )

    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="IP address",
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name="User agent",
    )
    request_id = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        verbose_name="Request ID",
    )

    scope = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        verbose_name="Scope",
    )
    success = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Success",
    )
    error_message = models.TextField(
        blank=True,
        verbose_name="Error message",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )

    class Meta:
        verbose_name = "Integration API key usage log"
        verbose_name_plural = "Integration API key usage logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["api_key", "created_at"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["success", "created_at"]),
            models.Index(fields=["method", "status_code"]),
        ]

    def __str__(self) -> str:
        return f"{self.api_key.key_prefix} {self.method} {self.path} {self.status_code}"

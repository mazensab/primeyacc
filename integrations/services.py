# ============================================================
# 📂 integrations/services.py
# 🧠 PrimeyAcc | Integration API Keys Services V1.0
# ------------------------------------------------------------
# ✅ Generate secure one-time API keys
# ✅ Store only hash + safe prefix
# ✅ Verify API keys safely
# ✅ Disable / enable / revoke / rotate
# ✅ Scope and IP allowlist checks
# ✅ Usage logging helpers
# ============================================================

from __future__ import annotations

import ipaddress
import secrets
from dataclasses import dataclass
from typing import Iterable

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from companies.models import CompanyStatus

from .models import (
    ALLOWED_INTEGRATION_SCOPES,
    IntegrationApiKey,
    IntegrationApiKeyEnvironment,
    IntegrationApiKeyStatus,
    IntegrationApiKeyUsageLog,
)


class IntegrationApiKeyError(ValueError):
    """Raised when an integration API key operation is invalid."""


class IntegrationApiKeyAuthError(PermissionError):
    """Raised when API key authentication fails."""


@dataclass(frozen=True)
class AuthenticatedIntegrationKey:
    api_key: IntegrationApiKey
    company_id: int
    company_code: str
    scopes: list[str]


def normalize_scopes(scopes: Iterable[str] | None) -> list[str]:
    normalized = sorted({str(scope).strip() for scope in scopes or [] if str(scope).strip()})
    invalid = [scope for scope in normalized if scope not in ALLOWED_INTEGRATION_SCOPES]
    if invalid:
        raise ValidationError({"scopes": f"Invalid scopes: {', '.join(invalid)}"})
    return normalized


def generate_raw_api_key(environment: str) -> tuple[str, str]:
    env = str(environment or IntegrationApiKeyEnvironment.TEST).lower()
    public_token = secrets.token_hex(8)
    secret_token = secrets.token_urlsafe(32)
    key_prefix = f"pmacc_{env}_{public_token}"
    raw_key = f"{key_prefix}_{secret_token}"
    return key_prefix, raw_key


def extract_key_prefix(raw_key: str) -> str:
    parts = str(raw_key or "").strip().split("_")
    if len(parts) < 4:
        return ""
    return "_".join(parts[:3])


def _ip_is_allowed(ip_address: str, allowlist: list[str]) -> bool:
    if not allowlist:
        return True

    if not ip_address:
        return False

    try:
        parsed_ip = ipaddress.ip_address(str(ip_address))
    except ValueError:
        return False

    for value in allowlist:
        try:
            network = ipaddress.ip_network(str(value), strict=False)
        except ValueError:
            continue

        if parsed_ip in network:
            return True

    return False


@transaction.atomic
def create_integration_api_key(
    *,
    company,
    name: str,
    environment: str = IntegrationApiKeyEnvironment.TEST,
    scopes: list[str] | None = None,
    description: str = "",
    ip_allowlist: list[str] | None = None,
    rate_limit_per_minute: int = 60,
    expires_at=None,
    created_by=None,
    metadata: dict | None = None,
    rotated_from: IntegrationApiKey | None = None,
) -> tuple[IntegrationApiKey, str]:
    """
    Create a new Integration API Key and return the raw key once.

    The raw key must never be stored by callers.
    """

    normalized_environment = str(environment or IntegrationApiKeyEnvironment.TEST).upper()
    if normalized_environment not in IntegrationApiKeyEnvironment.values:
        raise ValidationError({"environment": "Invalid API key environment."})

    normalized_scopes = normalize_scopes(scopes or ["company.read"])

    key_prefix, raw_key = generate_raw_api_key(normalized_environment)
    key_hash = make_password(raw_key)

    api_key = IntegrationApiKey(
        company=company,
        name=str(name or "").strip(),
        description=str(description or "").strip(),
        environment=normalized_environment,
        status=IntegrationApiKeyStatus.ACTIVE,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=normalized_scopes,
        ip_allowlist=ip_allowlist or [],
        rate_limit_per_minute=max(int(rate_limit_per_minute or 60), 1),
        expires_at=expires_at,
        metadata=metadata or {},
        rotated_from=rotated_from,
        created_by=created_by,
        updated_by=created_by,
    )
    api_key.full_clean()
    api_key.save()

    return api_key, raw_key


def authenticate_integration_api_key(
    *,
    raw_key: str,
    required_scopes: list[str] | None = None,
    ip_address: str = "",
) -> AuthenticatedIntegrationKey:
    """
    Validate an external API key.

    This helper is future-ready for external APIs. It does not trust company_id
    from the request. The company is resolved from the key itself.
    """

    key_prefix = extract_key_prefix(raw_key)
    if not key_prefix:
        raise IntegrationApiKeyAuthError("Invalid API key format.")

    api_key = (
        IntegrationApiKey.objects.select_related("company")
        .filter(key_prefix=key_prefix)
        .first()
    )
    if not api_key or not check_password(str(raw_key or "").strip(), api_key.key_hash):
        raise IntegrationApiKeyAuthError("Invalid API key.")

    if api_key.status != IntegrationApiKeyStatus.ACTIVE:
        raise IntegrationApiKeyAuthError("API key is not active.")

    if api_key.is_expired:
        raise IntegrationApiKeyAuthError("API key is expired.")

    if not api_key.company.is_active or api_key.company.status in [
        CompanyStatus.SUSPENDED,
        CompanyStatus.EXPIRED,
        CompanyStatus.CANCELLED,
    ]:
        raise IntegrationApiKeyAuthError("Company is not active.")

    normalized_required = normalize_scopes(required_scopes or [])
    missing_scopes = sorted(set(normalized_required) - set(api_key.scopes or []))
    if missing_scopes:
        raise IntegrationApiKeyAuthError(
            f"API key is missing required scopes: {', '.join(missing_scopes)}"
        )

    if not _ip_is_allowed(ip_address, api_key.ip_allowlist or []):
        raise IntegrationApiKeyAuthError("IP address is not allowed for this API key.")

    IntegrationApiKey.objects.filter(pk=api_key.pk).update(
        last_used_at=timezone.now(),
        usage_count=F("usage_count") + 1,
        updated_at=timezone.now(),
    )
    api_key.refresh_from_db()

    return AuthenticatedIntegrationKey(
        api_key=api_key,
        company_id=api_key.company_id,
        company_code=api_key.company.company_code,
        scopes=list(api_key.scopes or []),
    )


@transaction.atomic
def disable_integration_api_key(
    *,
    api_key: IntegrationApiKey,
    user=None,
    reason: str = "",
) -> IntegrationApiKey:
    if api_key.status == IntegrationApiKeyStatus.REVOKED:
        raise IntegrationApiKeyError("Revoked API keys cannot be disabled.")

    api_key.status = IntegrationApiKeyStatus.DISABLED
    api_key.disabled_at = timezone.now()
    api_key.disabled_by = user
    api_key.disabled_reason = str(reason or "").strip()
    api_key.updated_by = user
    api_key.full_clean()
    api_key.save(
        update_fields=[
            "status",
            "disabled_at",
            "disabled_by",
            "disabled_reason",
            "updated_by",
            "updated_at",
        ]
    )
    return api_key


@transaction.atomic
def enable_integration_api_key(
    *,
    api_key: IntegrationApiKey,
    user=None,
) -> IntegrationApiKey:
    if api_key.status == IntegrationApiKeyStatus.REVOKED:
        raise IntegrationApiKeyError("Revoked API keys cannot be enabled.")

    if api_key.is_expired:
        raise IntegrationApiKeyError("Expired API keys cannot be enabled.")

    api_key.status = IntegrationApiKeyStatus.ACTIVE
    api_key.disabled_at = None
    api_key.disabled_by = None
    api_key.disabled_reason = ""
    api_key.updated_by = user
    api_key.full_clean()
    api_key.save(
        update_fields=[
            "status",
            "disabled_at",
            "disabled_by",
            "disabled_reason",
            "updated_by",
            "updated_at",
        ]
    )
    return api_key


@transaction.atomic
def revoke_integration_api_key(
    *,
    api_key: IntegrationApiKey,
    user=None,
    reason: str = "",
) -> IntegrationApiKey:
    api_key.status = IntegrationApiKeyStatus.REVOKED
    api_key.revoked_at = timezone.now()
    api_key.revoked_by = user
    api_key.revoked_reason = str(reason or "").strip()
    api_key.updated_by = user
    api_key.full_clean()
    api_key.save(
        update_fields=[
            "status",
            "revoked_at",
            "revoked_by",
            "revoked_reason",
            "updated_by",
            "updated_at",
        ]
    )
    return api_key


@transaction.atomic
def rotate_integration_api_key(
    *,
    api_key: IntegrationApiKey,
    user=None,
    reason: str = "",
) -> tuple[IntegrationApiKey, str]:
    if api_key.status == IntegrationApiKeyStatus.REVOKED:
        raise IntegrationApiKeyError("Revoked API keys cannot be rotated.")

    old_key = disable_integration_api_key(
        api_key=api_key,
        user=user,
        reason=reason or "Rotated",
    )

    return create_integration_api_key(
        company=old_key.company,
        name=old_key.name,
        description=old_key.description,
        environment=old_key.environment,
        scopes=list(old_key.scopes or []),
        ip_allowlist=list(old_key.ip_allowlist or []),
        rate_limit_per_minute=old_key.rate_limit_per_minute,
        expires_at=old_key.expires_at,
        created_by=user,
        metadata=dict(old_key.metadata or {}),
        rotated_from=old_key,
    )


def record_integration_api_key_usage(
    *,
    api_key: IntegrationApiKey,
    method: str,
    path: str,
    status_code: int,
    ip_address: str = "",
    user_agent: str = "",
    request_id: str = "",
    scope: str = "",
    success: bool = False,
    error_message: str = "",
) -> IntegrationApiKeyUsageLog:
    return IntegrationApiKeyUsageLog.objects.create(
        api_key=api_key,
        company=api_key.company,
        method=str(method or "").upper()[:12],
        path=str(path or "")[:500],
        status_code=int(status_code or 0),
        ip_address=ip_address or None,
        user_agent=str(user_agent or ""),
        request_id=str(request_id or "")[:120],
        scope=str(scope or "")[:120],
        success=bool(success),
        error_message=str(error_message or ""),
    )

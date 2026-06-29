# ============================================================
# 📂 business_controls/services.py
# 🧠 Mhamcloud | Business Controls Services V1.0
# ------------------------------------------------------------
# ✅ Audit event creation service
# ✅ Idempotency registration and completion helpers
# ✅ Reference reservation helper
# ✅ Production hardening summary builder
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الخدمات قابلة للاستدعاء من أي تطبيق لاحقا
# - لا تعتمد على request مباشرة
# - لا تكسر منطق التطبيقات الحالية
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count

from business_controls.models import (
    BusinessAuditEvent,
    BusinessIdempotencyKey,
    BusinessReferenceSequence,
)


def _clean_text(value: Any, max_length: int = 255) -> str:
    if value is None:
        return ""
    return str(value).strip()[:max_length]


def log_business_event(
    *,
    company,
    actor=None,
    event_type: str,
    severity: str = BusinessAuditEvent.Severity.INFO,
    source_app: str = "",
    source_model: str = "",
    object_id: str | int | None = "",
    object_reference: str = "",
    action: str = "",
    message: str = "",
    metadata: dict | None = None,
    request_id: str = "",
    idempotency_key: str = "",
    ip_address: str | None = None,
) -> BusinessAuditEvent:
    if company is None:
        raise ValidationError("Company is required for business audit events.")

    event_type = _clean_text(event_type, 80)
    if not event_type:
        raise ValidationError("event_type is required.")

    return BusinessAuditEvent.objects.create(
        company=company,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        event_type=event_type,
        severity=severity or BusinessAuditEvent.Severity.INFO,
        source_app=_clean_text(source_app, 80),
        source_model=_clean_text(source_model, 120),
        object_id=_clean_text(object_id, 80),
        object_reference=_clean_text(object_reference, 120),
        action=_clean_text(action, 80),
        message=str(message or ""),
        metadata=metadata or {},
        request_id=_clean_text(request_id, 120),
        idempotency_key=_clean_text(idempotency_key, 160),
        ip_address=ip_address or None,
    )


def register_idempotency_key(
    *,
    company,
    key: str,
    scope: str,
    operation: str,
    request_hash: str = "",
    expires_at=None,
) -> tuple[BusinessIdempotencyKey, bool]:
    if company is None:
        raise ValidationError("Company is required for idempotency keys.")

    key = _clean_text(key, 160)
    scope = _clean_text(scope, 120)
    operation = _clean_text(operation, 120)

    if not key:
        raise ValidationError("Idempotency key is required.")
    if not scope:
        raise ValidationError("Idempotency scope is required.")
    if not operation:
        raise ValidationError("Idempotency operation is required.")

    try:
        with transaction.atomic():
            record, created = BusinessIdempotencyKey.objects.get_or_create(
                company=company,
                key=key,
                scope=scope,
                defaults={
                    "operation": operation,
                    "request_hash": _clean_text(request_hash, 128),
                    "expires_at": expires_at,
                },
            )
    except IntegrityError:
        record = BusinessIdempotencyKey.objects.get(
            company=company,
            key=key,
            scope=scope,
        )
        created = False

    return record, created


def complete_idempotency_key(
    *,
    record: BusinessIdempotencyKey,
    response_snapshot: dict | None = None,
) -> BusinessIdempotencyKey:
    record.mark_succeeded(response_snapshot=response_snapshot)
    return record


def fail_idempotency_key(
    *,
    record: BusinessIdempotencyKey,
    error_message: str = "",
) -> BusinessIdempotencyKey:
    record.mark_failed(error_message=error_message)
    return record


def get_or_create_reference_sequence(
    *,
    company,
    scope: str,
    prefix: str,
    padding: int = 6,
    description: str = "",
) -> BusinessReferenceSequence:
    if company is None:
        raise ValidationError("Company is required for reference sequences.")

    scope = _clean_text(scope, 120)
    prefix = _clean_text(prefix, 40)

    if not scope:
        raise ValidationError("Reference scope is required.")
    if not prefix:
        raise ValidationError("Reference prefix is required.")

    sequence, _ = BusinessReferenceSequence.objects.get_or_create(
        company=company,
        scope=scope,
        prefix=prefix,
        defaults={
            "padding": padding,
            "description": description,
        },
    )
    return sequence


def reserve_business_reference(
    *,
    company,
    scope: str,
    prefix: str,
    padding: int = 6,
    description: str = "",
) -> str:
    sequence = get_or_create_reference_sequence(
        company=company,
        scope=scope,
        prefix=prefix,
        padding=padding,
        description=description,
    )
    if not sequence.is_active:
        raise ValidationError("Reference sequence is inactive.")
    return sequence.reserve_next()


def build_business_controls_summary(*, company) -> dict:
    if company is None:
        raise ValidationError("Company is required for business controls summary.")

    events_qs = BusinessAuditEvent.objects.filter(company=company)
    idempotency_qs = BusinessIdempotencyKey.objects.filter(company=company)
    sequences_qs = BusinessReferenceSequence.objects.filter(company=company)

    events_by_severity = {
        item["severity"]: item["count"]
        for item in events_qs.values("severity").annotate(count=Count("id"))
    }

    idempotency_by_status = {
        item["status"]: item["count"]
        for item in idempotency_qs.values("status").annotate(count=Count("id"))
    }

    return {
        "audit_events": {
            "total": events_qs.count(),
            "by_severity": events_by_severity,
            "latest": [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "severity": event.severity,
                    "source_app": event.source_app,
                    "source_model": event.source_model,
                    "object_reference": event.object_reference,
                    "created_at": event.created_at.isoformat(),
                }
                for event in events_qs[:10]
            ],
        },
        "idempotency": {
            "total": idempotency_qs.count(),
            "by_status": idempotency_by_status,
        },
        "references": {
            "total_sequences": sequences_qs.count(),
            "active_sequences": sequences_qs.filter(is_active=True).count(),
        },
    }

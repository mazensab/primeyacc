# ============================================================
# ?? business_controls/integrations.py
# ?? PrimeyAcc | Business Controls Safe Integrations V1.0
# ------------------------------------------------------------
# ? Safe audit integration wrapper
# ? Safe idempotency integration wrapper
# ? Business object reference helpers
# ------------------------------------------------------------
# ??????? ????????:
# - ?? ???? ???????? ???????? ??? ??? ??????? ???????
# - ?? ????? ??? company_id ?? ???????
# - ?????? ????? ????? ????? ?????? ?? ??????? ???????
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError

from business_controls.models import BusinessAuditEvent, BusinessIdempotencyKey
from business_controls.services import (
    complete_idempotency_key,
    fail_idempotency_key,
    log_business_event,
    register_idempotency_key,
)


def get_object_company(obj: Any):
    if obj is None:
        return None
    company = getattr(obj, "company", None)
    if company is not None:
        return company
    return None


def resolve_object_reference(obj: Any) -> str:
    if obj is None:
        return ""
    for attr in [
        "invoice_number",
        "bill_number",
        "order_number",
        "receipt_number",
        "return_number",
        "count_number",
        "project_number",
        "appointment_number",
        "code",
        "reference",
        "number",
    ]:
        value = getattr(obj, attr, None)
        if value not in [None, ""]:
            return str(value)
    return str(getattr(obj, "id", "") or "")


def business_object_snapshot(obj: Any) -> dict[str, Any]:
    if obj is None:
        return {}

    data = {
        "model": obj.__class__.__name__,
        "id": getattr(obj, "id", None),
    }

    for attr in ["status", "code", "invoice_number", "bill_number", "order_number"]:
        value = getattr(obj, attr, None)
        if value not in [None, ""]:
            data[attr] = str(value)

    return data


def safe_log_business_event(
    *,
    company=None,
    actor=None,
    obj=None,
    event_type: str,
    action: str = "",
    severity: str = BusinessAuditEvent.Severity.INFO,
    source_app: str = "",
    message: str = "",
    metadata: dict[str, Any] | None = None,
):
    try:
        resolved_company = company or get_object_company(obj)
        if resolved_company is None:
            return None

        final_metadata = dict(metadata or {})
        if obj is not None:
            final_metadata.setdefault("object_snapshot", business_object_snapshot(obj))

        return log_business_event(
            company=resolved_company,
            actor=actor,
            event_type=event_type,
            severity=severity,
            source_app=source_app,
            source_model=obj.__class__.__name__ if obj is not None else "",
            object_id=getattr(obj, "id", "") if obj is not None else "",
            object_reference=resolve_object_reference(obj),
            action=action,
            message=message,
            metadata=final_metadata,
        )
    except Exception:
        return None


def safe_register_idempotency_key(
    *,
    company,
    key: str,
    scope: str,
    operation: str,
    request_hash: str = "",
):
    try:
        return register_idempotency_key(
            company=company,
            key=key,
            scope=scope,
            operation=operation,
            request_hash=request_hash,
        )
    except ValidationError:
        raise
    except Exception:
        return None, False


def safe_complete_idempotency_key(*, record, response_snapshot=None):
    if record is None:
        return None
    try:
        return complete_idempotency_key(
            record=record,
            response_snapshot=response_snapshot,
        )
    except Exception:
        return None


def safe_fail_idempotency_key(*, record, error_message: str = ""):
    if record is None:
        return None
    try:
        return fail_idempotency_key(record=record, error_message=error_message)
    except Exception:
        return None

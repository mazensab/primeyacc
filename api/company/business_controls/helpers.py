# ============================================================
# 📂 api/company/business_controls/helpers.py
# 🧠 Mhamcloud | Company Business Controls API Helpers V1.0
# ------------------------------------------------------------
# ✅ Safe company resolver
# ✅ JSON response helpers
# ✅ Shared serializers
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة تأتي من request.company أو العضوية النشطة
# - لا نقبل company_id من الواجهة
# ============================================================

from __future__ import annotations

from django.http import JsonResponse


def get_request_company(request):
    company = getattr(request, "company", None)
    if company is not None:
        return company

    user = getattr(request, "user", None)
    if not getattr(user, "is_authenticated", False):
        return None

    try:
        from companies.models import CompanyMembership

        membership = (
            CompanyMembership.objects.filter(
                user=user,
                is_active=True,
            )
            .select_related("company")
            .first()
        )
        if membership:
            return membership.company
    except Exception:
        return None

    return None


def error_response(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse(
        {
            "ok": False,
            "error": message,
        },
        status=status,
    )


def success_response(payload: dict | list, status: int = 200) -> JsonResponse:
    return JsonResponse(
        {
            "ok": True,
            "data": payload,
        },
        status=status,
        safe=not isinstance(payload, list),
    )


def audit_event_to_dict(event) -> dict:
    return {
        "id": event.id,
        "event_type": event.event_type,
        "severity": event.severity,
        "source_app": event.source_app,
        "source_model": event.source_model,
        "object_id": event.object_id,
        "object_reference": event.object_reference,
        "action": event.action,
        "message": event.message,
        "metadata": event.metadata,
        "request_id": event.request_id,
        "idempotency_key": event.idempotency_key,
        "ip_address": event.ip_address,
        "actor_id": event.actor_id,
        "created_at": event.created_at.isoformat(),
    }


def idempotency_key_to_dict(record) -> dict:
    return {
        "id": record.id,
        "key": record.key,
        "scope": record.scope,
        "operation": record.operation,
        "request_hash": record.request_hash,
        "status": record.status,
        "response_snapshot": record.response_snapshot,
        "error_message": record.error_message,
        "expires_at": record.expires_at.isoformat() if record.expires_at else None,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "is_expired": record.is_expired,
    }


def reference_sequence_to_dict(sequence) -> dict:
    return {
        "id": sequence.id,
        "scope": sequence.scope,
        "prefix": sequence.prefix,
        "current_number": sequence.current_number,
        "padding": sequence.padding,
        "is_active": sequence.is_active,
        "description": sequence.description,
        "next_preview": sequence.next_preview(),
        "created_at": sequence.created_at.isoformat(),
        "updated_at": sequence.updated_at.isoformat(),
    }

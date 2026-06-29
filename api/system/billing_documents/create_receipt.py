# ============================================================
# ًں“‚ api/system/billing_documents/create_receipt.py
# ًں§  Mhamcloud | System Billing Document Create Receipt API V1.0
# ------------------------------------------------------------
# âœ… Creates or returns a platform subscription payment receipt
# âœ… Uses billing.services.create_or_get_subscription_payment_receipt
# âœ… Supports JSON and form-data requests
# âœ… Accepts payment details, issue date, notes, and metadata
# âœ… Returns immutable snapshots and printable payload
# âœ… Idempotent: one platform payment receipt per subscription
# âœ… Marks the related subscription invoice as paid
# âœ… Protected by system.billing_documents.create_receipt
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ‡ط°ط§ ط§ظ„ط¥ظٹطµط§ظ„ ظٹط®طµ ط¯ظپط¹ ط§ط´طھط±ط§ظƒ ظ…ظ†طµط© Mhamcloud
# - ظ„ط§ ظٹط³طھط®ط¯ظ… payments ط§ظ„ط®ط§طµط© ط¨ط§ظ„ط´ط±ظƒط§طھ
# - ظ„ط§ ظ†ظƒط±ط± ظ…ظ†ط·ظ‚ ط§ظ„ط¯ظپط¹ ط§ظ„ظ…ظˆط¬ظˆط¯ ط¯ط§ط®ظ„ billing/services.py
# - ظ„ظƒظ„ ط§ط´طھط±ط§ظƒ ط¥ظٹطµط§ظ„ ط¯ظپط¹ ظ…ظ†طµط© ظˆط§ط­ط¯ ظپظ‚ط·
# - ط¥ظ†ط´ط§ط، ط§ظ„ط¥ظٹطµط§ظ„ ظٹط­ظˆظ„ ط§ظ„ظپط§طھظˆط±ط© ط§ظ„ظ…ط±طھط¨ط·ط© ط¥ظ„ظ‰ PAID
# - ظ„ط§ ظٹظ…ظƒظ† ط¥طµط¯ط§ط± ط¥ظٹطµط§ظ„ ظ„ظپط§طھظˆط±ط© ظ…ظ„ط؛ط§ط©
# ============================================================

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from api.system.billing_documents.serializers import (
    billing_document_payload,
)
from billing.models import PlatformBillingDocument
from billing.services import (
    create_or_get_subscription_payment_receipt,
)
from subscriptions.models import CompanySubscription


def _json_body(request: HttpRequest) -> dict[str, Any]:
    """
    Read a JSON request body safely.

    Empty or invalid JSON returns an empty dictionary.
    """

    if not request.body:
        return {}

    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}

    return payload if isinstance(payload, dict) else {}


def _get_value(
    request: HttpRequest,
    payload: dict[str, Any],
    key: str,
    default: Any = None,
) -> Any:
    """
    Read a value from JSON first, then form-data.
    """

    if key in payload:
        return payload.get(key)

    return request.POST.get(key, default)


def _clean_text(value: Any) -> str:
    """
    Normalize incoming text.
    """

    return str(value or "").strip()


def _parse_date(
    value: Any,
    field_name: str,
) -> date | None:
    """
    Parse an optional ISO date.
    """

    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(
            str(value).strip()
        )
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {
                field_name: (
                    "طµظٹط؛ط© ط§ظ„طھط§ط±ظٹط® ط؛ظٹط± طµط­ظٹط­ط©. "
                    "ط§ط³طھط®ط¯ظ… YYYY-MM-DD."
                ),
            }
        ) from exc


def _parse_datetime(
    value: Any,
    field_name: str,
) -> datetime | None:
    """
    Parse an optional ISO datetime.

    Naive values are converted to the current Django timezone.
    """

    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        parsed = value
    else:
        normalized_value = str(value).strip()

        if normalized_value.endswith("Z"):
            normalized_value = (
                normalized_value[:-1] + "+00:00"
            )

        try:
            parsed = datetime.fromisoformat(
                normalized_value
            )
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                {
                    field_name: (
                        "طµظٹط؛ط© ط§ظ„ظˆظ‚طھ ط؛ظٹط± طµط­ظٹط­ط©. "
                        "ط§ط³طھط®ط¯ظ… طµظٹط؛ط© ISO 8601."
                    ),
                }
            ) from exc

    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(
            parsed,
            timezone.get_current_timezone(),
        )

    return parsed


def _parse_json_object(
    value: Any,
    field_name: str,
) -> dict[str, Any]:
    """
    Parse and validate an optional JSON object.
    """

    if value is None or value == "":
        return {}

    if isinstance(value, dict):
        return dict(value)

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise ValidationError(
                {
                    field_name: (
                        "ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط§ظ„ظ‚ظٹظ…ط© ظƒط§ط¦ظ† JSON طµط­ظٹط­ظ‹ط§."
                    ),
                }
            ) from exc

        if isinstance(parsed, dict):
            return parsed

    raise ValidationError(
        {
            field_name: (
                "ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط§ظ„ظ‚ظٹظ…ط© ظƒط§ط¦ظ† JSON."
            ),
        }
    )


def _validation_errors(
    exc: ValidationError,
) -> dict[str, Any] | list[Any] | str:
    """
    Convert Django ValidationError to a JSON-safe payload.
    """

    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


def _get_document_with_relations(
    document_id: int,
) -> PlatformBillingDocument:
    """
    Reload a billing document with all API relations.
    """

    return (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__company",
            "subscription__plan",
            "subscription__previous_subscription",
            "related_invoice",
            "related_invoice__company",
            "related_invoice__subscription",
            "created_by",
            "cancelled_by",
        )
        .get(pk=document_id)
    )


@login_required
@csrf_protect
@require_POST
def system_billing_document_create_receipt(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    POST
    /api/system/billing-documents/subscriptions/
    <subscription_id>/receipt/

    Create or return the platform payment receipt for a subscription.
    """

    if not user_has_system_permission(
        request.user,
        "system.billing_documents.create_receipt",
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "ط؛ظٹط± ظ…طµط±ط­ ظ„ظƒ ط¨ط¥ظ†ط´ط§ط، ط¥ظٹطµط§ظ„ط§طھ ط¯ظپط¹ ط§ط´طھط±ط§ظƒط§طھ ط§ظ„ظ…ظ†طµط©."
                ),
                "code": (
                    "SYSTEM_BILLING_DOCUMENTS_"
                    "CREATE_RECEIPT_PERMISSION_REQUIRED"
                ),
            },
            status=403,
        )

    subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "previous_subscription",
            "previous_subscription__plan",
        ),
        id=subscription_id,
    )

    payload = _json_body(request)

    try:
        payment_method = _clean_text(
            _get_value(
                request,
                payload,
                "payment_method",
                "",
            )
        )

        if not payment_method:
            raise ValidationError(
                {
                    "payment_method": (
                        "ط·ط±ظٹظ‚ط© ط¯ظپط¹ ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ط·ظ„ظˆط¨ط©."
                    ),
                }
            )

        transaction_reference = _clean_text(
            _get_value(
                request,
                payload,
                "transaction_reference",
                "",
            )
        )

        billing_reference = _clean_text(
            _get_value(
                request,
                payload,
                "billing_reference",
                "",
            )
        )

        paid_at = _parse_datetime(
            _get_value(
                request,
                payload,
                "paid_at",
                None,
            ),
            "paid_at",
        )

        issue_date = _parse_date(
            _get_value(
                request,
                payload,
                "issue_date",
                None,
            ),
            "issue_date",
        )

        payment_extra = _parse_json_object(
            _get_value(
                request,
                payload,
                "payment_extra",
                None,
            ),
            "payment_extra",
        )

        seller_snapshot = _parse_json_object(
            _get_value(
                request,
                payload,
                "seller_snapshot",
                None,
            ),
            "seller_snapshot",
        )

        metadata = _parse_json_object(
            _get_value(
                request,
                payload,
                "metadata",
                None,
            ),
            "metadata",
        )

        notes = _clean_text(
            _get_value(
                request,
                payload,
                "notes",
                "",
            )
        )

        receipt, created = (
            create_or_get_subscription_payment_receipt(
                subscription=subscription,
                payment_method=payment_method,
                transaction_reference=(
                    transaction_reference
                ),
                billing_reference=billing_reference,
                paid_at=paid_at,
                issue_date=issue_date,
                payment_extra=(
                    payment_extra or None
                ),
                seller_snapshot=(
                    seller_snapshot or None
                ),
                created_by=request.user,
                notes=notes,
                metadata=metadata,
            )
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط¥ظٹطµط§ظ„ ط¯ظپط¹ ط§ط´طھط±ط§ظƒ ط§ظ„ظ…ظ†طµط©."
                ),
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    receipt = _get_document_with_relations(
        receipt.pk
    )

    related_invoice = None

    if receipt.related_invoice_id:
        related_invoice = _get_document_with_relations(
            receipt.related_invoice_id
        )

    return JsonResponse(
        {
            "ok": True,
            "message": (
                "طھظ… ط¥ظ†ط´ط§ط، ط¥ظٹطµط§ظ„ ط¯ظپط¹ ط§ط´طھط±ط§ظƒ ط§ظ„ظ…ظ†طµط© ط¨ظ†ط¬ط§ط­."
                if created
                else "ط¥ظٹطµط§ظ„ ط¯ظپط¹ ط§ط´طھط±ط§ظƒ ط§ظ„ظ…ظ†طµط© ظ…ظˆط¬ظˆط¯ ظ…ط³ط¨ظ‚ظ‹ط§."
            ),
            "data": {
                "created": created,
                "document": billing_document_payload(
                    receipt,
                    include_snapshots=True,
                    include_printable_payload=True,
                ),
                "related_invoice": (
                    billing_document_payload(
                        related_invoice,
                        include_snapshots=True,
                        include_printable_payload=True,
                    )
                    if related_invoice
                    else None
                ),
            },
        },
        status=201 if created else 200,
    )

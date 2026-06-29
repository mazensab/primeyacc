# ============================================================
# 📂 api/system/billing_documents/create_invoice.py
# 🧠 Mhamcloud | System Billing Document Create Invoice API V1.1
# ------------------------------------------------------------
# ✅ Creates or returns a platform subscription invoice
# ✅ Uses billing.services.create_or_get_subscription_invoice
# ✅ Supports JSON and form-data requests
# ✅ Accepts issue date, notes, metadata, and seller snapshot overrides
# ✅ Returns immutable snapshots and printable payload
# ✅ Idempotent: one platform invoice per subscription
# ✅ Protected by system.billing_documents.create_invoice
# ✅ Safely handles JSON dictionary payloads
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه الفاتورة تخص مالك منصة Mhamcloud وليست فاتورة شركة
# - لا نكرر منطق الفوترة الموجود داخل billing/services.py
# - لكل اشتراك فاتورة منصة واحدة فقط
# - عند وجود الفاتورة مسبقًا نعيدها ولا ننشئ مستندًا جديدًا
# - الطباعة تعتمد على printable_payload المحفوظ
# ============================================================

from __future__ import annotations

import json
from datetime import date
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from api.system.billing_documents.serializers import (
    billing_document_payload,
)
from billing.models import PlatformBillingDocument
from billing.services import create_or_get_subscription_invoice
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
    Parse an ISO date.

    An empty value means the billing service will use today's date.
    """

    if value is None or value == "":
        return None

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
                    "صيغة التاريخ غير صحيحة. "
                    "استخدم YYYY-MM-DD."
                ),
            }
        ) from exc


def _parse_json_object(
    value: Any,
    field_name: str,
) -> dict[str, Any]:
    """
    Parse and validate an optional JSON object.

    Supports:
    - A dictionary from JSON requests.
    - A JSON object string from form-data.
    - An empty value as an empty dictionary.
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
                        "يجب أن تكون القيمة كائن JSON صحيحًا."
                    ),
                }
            ) from exc

        if isinstance(parsed, dict):
            return parsed

    raise ValidationError(
        {
            field_name: (
                "يجب أن تكون القيمة كائن JSON."
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


def _get_invoice_with_relations(
    document_id: int,
) -> PlatformBillingDocument:
    """
    Reload the created or existing invoice with API relations.
    """

    return (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__company",
            "subscription__plan",
            "subscription__previous_subscription",
            "created_by",
            "cancelled_by",
            "related_invoice",
        )
        .get(pk=document_id)
    )


@login_required
@csrf_protect
@require_POST
def system_billing_document_create_invoice(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    POST
    /api/system/billing-documents/subscriptions/
    <subscription_id>/invoice/

    Create or return the platform invoice belonging to a subscription.
    """

    if not user_has_system_permission(
        request.user,
        "system.billing_documents.create_invoice",
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "غير مصرح لك بإنشاء فواتير اشتراكات المنصة."
                ),
                "code": (
                    "SYSTEM_BILLING_DOCUMENTS_"
                    "CREATE_INVOICE_PERMISSION_REQUIRED"
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
        issue_date = _parse_date(
            _get_value(
                request,
                payload,
                "issue_date",
                None,
            ),
            "issue_date",
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

        invoice, created = (
            create_or_get_subscription_invoice(
                subscription=subscription,
                issue_date=issue_date,
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
                    "تعذر إنشاء فاتورة اشتراك المنصة."
                ),
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    invoice = _get_invoice_with_relations(
        invoice.pk
    )

    return JsonResponse(
        {
            "ok": True,
            "message": (
                "تم إنشاء فاتورة اشتراك المنصة بنجاح."
                if created
                else "فاتورة اشتراك المنصة موجودة مسبقًا."
            ),
            "data": {
                "created": created,
                "document": billing_document_payload(
                    invoice,
                    include_snapshots=True,
                    include_printable_payload=True,
                ),
            },
        },
        status=201 if created else 200,
    )
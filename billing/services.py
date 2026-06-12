# ============================================================
# ًں“‚ billing/services.py
# ًں§  PrimeyAcc | Platform Billing Documents Services V1.2
# ------------------------------------------------------------
# âœ… Safe yearly platform document numbering
# âœ… Subscription invoice creation
# âœ… Subscription payment receipt creation
# âœ… Seller / buyer / plan / subscription snapshots
# âœ… Payment snapshots
# âœ… Stable printable payloads
# âœ… Duplicate invoice and receipt protection
# âœ… Transaction locking
# âœ… Complete separation from company documents and payments
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Final

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformDocumentSequence,
    money,
)
from subscriptions.models import CompanySubscription


DEFAULT_SEQUENCE_PADDING: Final[int] = 6
DEFAULT_CURRENCY_CODE: Final[str] = "SAR"

DOCUMENT_PREFIXES: Final[dict[str, str]] = {
    PlatformBillingDocumentType.SUBSCRIPTION_INVOICE: "PINV",
    PlatformBillingDocumentType.PAYMENT_RECEIPT: "PREC",
}


@dataclass(frozen=True)
class PlatformDocumentNumber:
    document_type: str
    prefix: str
    year: int
    sequence_number: int
    document_number: str


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _date_to_string(value: Any) -> str | None:
    if not value:
        return None

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    return _clean_text(value) or None


def _datetime_to_string(value: Any) -> str | None:
    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    return _clean_text(value) or None


def _money_to_string(value: Any) -> str:
    return f"{money(value):.2f}"


def _safe_file_url(file_field: Any) -> str:
    if not file_field:
        return ""

    try:
        return _clean_text(file_field.url)
    except (ValueError, AttributeError):
        return ""


def _validate_json_object(
    value: Any,
    *,
    field_name: str,
) -> dict[str, Any]:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise ValidationError(
            {
                field_name: "ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ظƒط§ط¦ظ† JSON.",
            }
        )

    return dict(value)


def _validate_document_type(document_type: str) -> str:
    normalized_type = _clean_text(document_type).upper()

    if normalized_type not in PlatformBillingDocumentType.values:
        raise ValidationError(
            {
                "document_type": "ظ†ظˆط¹ ظ…ط³طھظ†ط¯ ظپظˆطھط±ط© ط§ظ„ظ…ظ†طµط© ط؛ظٹط± طµط­ظٹط­.",
            }
        )

    return normalized_type


def _validate_sequence_year(
    year: int | str | None,
) -> int:
    if year in {None, ""}:
        normalized_year = timezone.localdate().year
    else:
        try:
            normalized_year = int(year)
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                {
                    "year": "ط³ظ†ط© طھط³ظ„ط³ظ„ ط§ظ„ظ…ط³طھظ†ط¯ ط؛ظٹط± طµط­ظٹط­ط©.",
                }
            ) from exc

    if normalized_year < 2000 or normalized_year > 9999:
        raise ValidationError(
            {
                "year": "ط³ظ†ط© طھط³ظ„ط³ظ„ ط§ظ„ظ…ط³طھظ†ط¯ ط؛ظٹط± طµط­ظٹط­ط©.",
            }
        )

    return normalized_year


def get_platform_document_prefix(
    document_type: str,
) -> str:
    normalized_type = _validate_document_type(document_type)
    prefix = DOCUMENT_PREFIXES.get(normalized_type)

    if not prefix:
        raise ValidationError(
            {
                "document_type": (
                    "ظ„ط§ طھظˆط¬ط¯ ط¨ط§ط¯ط¦ط© طھط±ظ‚ظٹظ… ظ…ط¹ط±ظپط© ظ„ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯."
                ),
            }
        )

    return prefix


def format_platform_document_number(
    *,
    prefix: str,
    year: int,
    sequence_number: int,
    padding: int = DEFAULT_SEQUENCE_PADDING,
) -> str:
    normalized_prefix = _clean_text(prefix).upper()

    if not normalized_prefix:
        raise ValidationError(
            {
                "prefix": "ط¨ط§ط¯ط¦ط© طھط±ظ‚ظٹظ… ط§ظ„ظ…ط³طھظ†ط¯ ظ…ط·ظ„ظˆط¨ط©.",
            }
        )

    if not normalized_prefix.replace("-", "").isalnum():
        raise ValidationError(
            {
                "prefix": (
                    "ط¨ط§ط¯ط¦ط© ط§ظ„طھط±ظ‚ظٹظ… ظٹط¬ط¨ ط£ظ† طھط­طھظˆظٹ ط¹ظ„ظ‰ ط£ط­ط±ظپ "
                    "ط£ظˆ ط£ط±ظ‚ط§ظ… ظپظ‚ط·."
                ),
            }
        )

    normalized_year = _validate_sequence_year(year)

    try:
        normalized_number = int(sequence_number)
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {
                "sequence_number": "ط§ظ„ط±ظ‚ظ… ط§ظ„طھط³ظ„ط³ظ„ظٹ ط؛ظٹط± طµط­ظٹط­.",
            }
        ) from exc

    if normalized_number <= 0:
        raise ValidationError(
            {
                "sequence_number": (
                    "ط§ظ„ط±ظ‚ظ… ط§ظ„طھط³ظ„ط³ظ„ظٹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط£ظƒط¨ط± ظ…ظ† طµظپط±."
                ),
            }
        )

    if padding < 1 or padding > 12:
        raise ValidationError(
            {
                "padding": "ط¹ط¯ط¯ ط®ط§ظ†ط§طھ ط§ظ„طھط±ظ‚ظٹظ… ط؛ظٹط± طµط­ظٹط­.",
            }
        )

    return (
        f"{normalized_prefix}-"
        f"{normalized_year}-"
        f"{normalized_number:0{padding}d}"
    )


@transaction.atomic
def generate_platform_document_number(
    *,
    document_type: str,
    issue_date: date | None = None,
) -> PlatformDocumentNumber:
    normalized_type = _validate_document_type(document_type)
    effective_date = issue_date or timezone.localdate()

    if not isinstance(effective_date, date):
        raise ValidationError(
            {
                "issue_date": "طھط§ط±ظٹط® ط¥طµط¯ط§ط± ط§ظ„ظ…ط³طھظ†ط¯ ط؛ظٹط± طµط­ظٹط­.",
            }
        )

    sequence_year = _validate_sequence_year(
        effective_date.year
    )
    prefix = get_platform_document_prefix(
        normalized_type
    )

    try:
        sequence = (
            PlatformDocumentSequence.objects.select_for_update()
            .filter(
                document_type=normalized_type,
                year=sequence_year,
            )
            .first()
        )

        if sequence is None:
            try:
                sequence = PlatformDocumentSequence.objects.create(
                    document_type=normalized_type,
                    year=sequence_year,
                    prefix=prefix,
                    last_number=0,
                )
            except IntegrityError:
                sequence = (
                    PlatformDocumentSequence.objects
                    .select_for_update()
                    .get(
                        document_type=normalized_type,
                        year=sequence_year,
                    )
                )

        if sequence.prefix != prefix:
            sequence.prefix = prefix

        sequence.last_number += 1
        sequence.full_clean()
        sequence.save(
            update_fields=[
                "prefix",
                "last_number",
                "updated_at",
            ]
        )

    except PlatformDocumentSequence.DoesNotExist as exc:
        raise ValidationError(
            {
                "sequence": (
                    "طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط£ظˆ ظ‚ظپظ„ طھط³ظ„ط³ظ„ ظ…ط³طھظ†ط¯ط§طھ ط§ظ„ظ…ظ†طµط©."
                ),
            }
        ) from exc

    document_number = format_platform_document_number(
        prefix=sequence.prefix,
        year=sequence.year,
        sequence_number=sequence.last_number,
    )

    return PlatformDocumentNumber(
        document_type=normalized_type,
        prefix=sequence.prefix,
        year=sequence.year,
        sequence_number=sequence.last_number,
        document_number=document_number,
    )


def get_platform_seller_settings() -> dict[str, Any]:
    configured = getattr(
        settings,
        "PRIMEYACC_PLATFORM_BILLING_SELLER",
        {},
    )

    if configured is None:
        configured = {}

    if not isinstance(configured, dict):
        raise ValidationError(
            {
                "seller_snapshot": (
                    "ط¥ط¹ط¯ط§ط¯ط§طھ ط¨ط§ط¦ط¹ ط§ظ„ظ…ظ†طµط© ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ظƒط§ط¦ظ† JSON."
                ),
            }
        )

    return dict(configured)


def build_platform_seller_snapshot(
    *,
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    source = {
        **get_platform_seller_settings(),
        **_validate_json_object(
            overrides,
            field_name="seller_snapshot",
        ),
    }

    name = (
        _clean_text(source.get("name"))
        or _clean_text(source.get("name_ar"))
        or _clean_text(source.get("name_en"))
        or "PrimeyAcc"
    )

    return {
        "name": name,
        "display_name": name,
        "name_ar": _clean_text(source.get("name_ar")),
        "name_en": _clean_text(source.get("name_en")),
        "commercial_registration": _clean_text(
            source.get("commercial_registration")
        ),
        "tax_number": _clean_text(
            source.get("tax_number")
        ),
        "email": _clean_text(source.get("email")),
        "phone": _clean_text(source.get("phone")),
        "mobile": _clean_text(source.get("mobile")),
        "country": _clean_text(
            source.get("country") or "Saudi Arabia"
        ),
        "building_number": _clean_text(
            source.get("building_number")
        ),
        "street_name": _clean_text(
            source.get("street_name")
        ),
        "district": _clean_text(
            source.get("district")
        ),
        "city": _clean_text(source.get("city")),
        "region": _clean_text(source.get("region")),
        "postal_code": _clean_text(
            source.get("postal_code")
        ),
        "short_address": _clean_text(
            source.get("short_address")
        ),
        "address": _clean_text(source.get("address")),
        "logo_url": _clean_text(
            source.get("logo_url")
        ),
    }


def build_company_buyer_snapshot(
    company,
) -> dict[str, Any]:
    if not company:
        raise ValidationError(
            {
                "company": "ط§ظ„ط´ط±ظƒط© ط§ظ„ظ…ط³طھظپظٹط¯ط© ظ…ط·ظ„ظˆط¨ط©.",
            }
        )

    display_name = (
        _clean_text(
            getattr(company, "display_name", "")
        )
        or _clean_text(getattr(company, "name", ""))
    )

    return {
        "id": company.pk,
        "name": _clean_text(
            getattr(company, "name", "")
        ),
        "display_name": display_name,
        "name_ar": _clean_text(
            getattr(company, "name_ar", "")
        ),
        "name_en": _clean_text(
            getattr(company, "name_en", "")
        ),
        "company_code": _clean_text(
            getattr(company, "company_code", "")
        ),
        "commercial_registration": _clean_text(
            getattr(
                company,
                "commercial_registration",
                "",
            )
        ),
        "tax_number": _clean_text(
            getattr(company, "tax_number", "")
        ),
        "email": _clean_text(
            getattr(company, "email", "")
        ),
        "phone": _clean_text(
            getattr(company, "phone", "")
        ),
        "mobile": _clean_text(
            getattr(company, "mobile", "")
        ),
        "whatsapp_number": _clean_text(
            getattr(company, "whatsapp_number", "")
        ),
        "country": _clean_text(
            getattr(company, "country", "")
        ),
        "building_number": _clean_text(
            getattr(company, "building_number", "")
        ),
        "street_name": _clean_text(
            getattr(company, "street_name", "")
        ),
        "district": _clean_text(
            getattr(company, "district", "")
        ),
        "city": _clean_text(
            getattr(company, "city", "")
        ),
        "region": _clean_text(
            getattr(company, "region", "")
        ),
        "postal_code": _clean_text(
            getattr(company, "postal_code", "")
        ),
        "short_address": _clean_text(
            getattr(company, "short_address", "")
        ),
        "address": _clean_text(
            getattr(company, "address", "")
        ),
        "national_address_line": _clean_text(
            getattr(
                company,
                "national_address_line",
                "",
            )
        ),
        "currency_code": (
            _clean_text(
                getattr(
                    company,
                    "currency_code",
                    DEFAULT_CURRENCY_CODE,
                )
            )
            or DEFAULT_CURRENCY_CODE
        ).upper(),
        "logo_url": _safe_file_url(
            getattr(company, "logo", None)
        ),
    }


def build_subscription_plan_snapshot(
    plan,
) -> dict[str, Any]:
    if not plan:
        raise ValidationError(
            {
                "plan": "ط¨ط§ظ‚ط© ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ط·ظ„ظˆط¨ط©.",
            }
        )

    features = getattr(plan, "features", [])

    if not isinstance(features, list):
        features = []

    return {
        "id": plan.pk,
        "name": _clean_text(
            getattr(plan, "name", "")
        ),
        "code": _clean_text(
            getattr(plan, "code", "")
        ),
        "slug": _clean_text(
            getattr(plan, "slug", "")
        ),
        "description": _clean_text(
            getattr(plan, "description", "")
        ),
        "monthly_price": _money_to_string(
            getattr(plan, "monthly_price", 0)
        ),
        "yearly_price": _money_to_string(
            getattr(plan, "yearly_price", 0)
        ),
        "max_users": getattr(
            plan,
            "max_users",
            None,
        ),
        "max_branches": getattr(
            plan,
            "max_branches",
            None,
        ),
        "max_warehouses": getattr(
            plan,
            "max_warehouses",
            None,
        ),
        "max_pos": getattr(
            plan,
            "max_pos",
            None,
        ),
        "features": list(features),
        "is_active": bool(
            getattr(plan, "is_active", False)
        ),
        "is_public": bool(
            getattr(plan, "is_public", False)
        ),
    }


def build_subscription_snapshot(
    subscription: CompanySubscription,
) -> dict[str, Any]:
    if not subscription:
        raise ValidationError(
            {
                "subscription": "ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ط·ظ„ظˆط¨.",
            }
        )

    previous_subscription = getattr(
        subscription,
        "previous_subscription",
        None,
    )

    return {
        "id": subscription.pk,
        "company_id": subscription.company_id,
        "plan_id": subscription.plan_id,
        "previous_subscription_id": (
            subscription.previous_subscription_id
        ),
        "previous_subscription": (
            {
                "id": previous_subscription.pk,
                "status": previous_subscription.status,
                "plan_id": (
                    previous_subscription.plan_id
                ),
                "billing_cycle": (
                    previous_subscription.billing_cycle
                ),
                "start_date": _date_to_string(
                    previous_subscription.start_date
                ),
                "end_date": _date_to_string(
                    previous_subscription.end_date
                ),
            }
            if previous_subscription
            else None
        ),
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(
            subscription.start_date
        ),
        "end_date": _date_to_string(
            subscription.end_date
        ),
        "price": _money_to_string(
            subscription.price
        ),
        "discount_amount": _money_to_string(
            subscription.discount_amount
        ),
        "amount_before_tax": _money_to_string(
            subscription.amount_before_tax
        ),
        "tax_amount": _money_to_string(
            subscription.tax_amount
        ),
        "total_amount": _money_to_string(
            subscription.total_amount
        ),
        "auto_renew": bool(
            subscription.auto_renew
        ),
        "billing_reference": _clean_text(
            subscription.billing_reference
        ),
        "paid_at": _datetime_to_string(
            subscription.paid_at
        ),
        "activated_at": _datetime_to_string(
            subscription.activated_at
        ),
        "created_at": _datetime_to_string(
            subscription.created_at
        ),
    }


def build_subscription_invoice_printable_payload(
    *,
    document_number: str,
    issue_date: date,
    currency_code: str,
    subtotal: Decimal,
    discount_amount: Decimal,
    taxable_amount: Decimal,
    tax_amount: Decimal,
    total_amount: Decimal,
    balance_amount: Decimal,
    seller_snapshot: dict[str, Any],
    buyer_snapshot: dict[str, Any],
    subscription_snapshot: dict[str, Any],
    plan_snapshot: dict[str, Any],
    notes: str = "",
) -> dict[str, Any]:
    return {
        "schema": (
            "primeyacc.platform_billing_document.v1"
        ),
        "document": {
            "type": (
                PlatformBillingDocumentType
                .SUBSCRIPTION_INVOICE
            ),
            "title": "Subscription invoice",
            "title_ar": "ظپط§طھظˆط±ط© ط§ط´طھط±ط§ظƒ",
            "number": _clean_text(
                document_number
            ),
            "issue_date": _date_to_string(
                issue_date
            ),
            "currency_code": (
                _clean_text(currency_code)
                or DEFAULT_CURRENCY_CODE
            ).upper(),
        },
        "seller": dict(seller_snapshot),
        "buyer": dict(buyer_snapshot),
        "subscription": dict(
            subscription_snapshot
        ),
        "plan": dict(plan_snapshot),
        "items": [
            {
                "line_number": 1,
                "description": (
                    _clean_text(
                        plan_snapshot.get("name")
                    )
                    or "PrimeyAcc subscription"
                ),
                "description_ar": (
                    "ط§ط´طھط±ط§ظƒ ظ…ظ†طµط© PrimeyAcc"
                ),
                "quantity": "1.00",
                "unit_price": _money_to_string(
                    subtotal
                ),
                "discount_amount": (
                    _money_to_string(
                        discount_amount
                    )
                ),
                "taxable_amount": (
                    _money_to_string(
                        taxable_amount
                    )
                ),
                "tax_amount": _money_to_string(
                    tax_amount
                ),
                "total_amount": _money_to_string(
                    total_amount
                ),
            }
        ],
        "totals": {
            "subtotal": _money_to_string(
                subtotal
            ),
            "discount_amount": _money_to_string(
                discount_amount
            ),
            "taxable_amount": _money_to_string(
                taxable_amount
            ),
            "tax_amount": _money_to_string(
                tax_amount
            ),
            "total_amount": _money_to_string(
                total_amount
            ),
            "paid_amount": "0.00",
            "balance_amount": _money_to_string(
                balance_amount
            ),
        },
        "notes": _clean_text(notes),
    }


def build_subscription_payment_snapshot(
    *,
    payment_method: str,
    transaction_reference: str = "",
    billing_reference: str = "",
    paid_at: datetime | None = None,
    paid_amount: Decimal,
    currency_code: str = DEFAULT_CURRENCY_CODE,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_method = _clean_text(
        payment_method
    )

    if not normalized_method:
        raise ValidationError(
            {
                "payment_method": (
                    "ط·ط±ظٹظ‚ط© ط¯ظپط¹ ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ط·ظ„ظˆط¨ط©."
                ),
            }
        )

    effective_paid_at = paid_at or timezone.now()

    if not isinstance(effective_paid_at, datetime):
        raise ValidationError(
            {
                "paid_at": (
                    "ظˆظ‚طھ ط¯ظپط¹ ط§ظ„ط§ط´طھط±ط§ظƒ ط؛ظٹط± طµط­ظٹط­."
                ),
            }
        )

    normalized_amount = money(paid_amount)

    if normalized_amount <= Decimal("0.00"):
        raise ValidationError(
            {
                "paid_amount": (
                    "ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† "
                    "ط£ظƒط¨ط± ظ…ظ† طµظپط±."
                ),
            }
        )

    normalized_currency = (
        _clean_text(currency_code)
        or DEFAULT_CURRENCY_CODE
    ).upper()

    return {
        "payment_method": normalized_method,
        "transaction_reference": _clean_text(
            transaction_reference
        ),
        "billing_reference": _clean_text(
            billing_reference
        ),
        "paid_at": _datetime_to_string(
            effective_paid_at
        ),
        "paid_amount": _money_to_string(
            normalized_amount
        ),
        "currency_code": normalized_currency,
        "extra": _validate_json_object(
            extra,
            field_name="payment_snapshot",
        ),
    }


def build_subscription_receipt_printable_payload(
    *,
    document_number: str,
    issue_date: date,
    currency_code: str,
    invoice: PlatformBillingDocument,
    payment_snapshot: dict[str, Any],
    subscription_snapshot: dict[str, Any],
    notes: str = "",
) -> dict[str, Any]:
    if not invoice or not invoice.pk:
        raise ValidationError(
            {
                "related_invoice": (
                    "ط§ظ„ظپط§طھظˆط±ط© ط§ظ„ظ…ط±طھط¨ط·ط© ط§ظ„ظ…ط­ظپظˆط¸ط© ظ…ط·ظ„ظˆط¨ط©."
                ),
            }
        )

    if not invoice.is_invoice:
        raise ValidationError(
            {
                "related_invoice": (
                    "ط¥ظٹطµط§ظ„ ط§ظ„ط¯ظپط¹ ظٹط¬ط¨ ط£ظ† ظٹط±طھط¨ط· "
                    "ط¨ظپط§طھظˆط±ط© ط§ط´طھط±ط§ظƒ."
                ),
            }
        )

    payment_data = _validate_json_object(
        payment_snapshot,
        field_name="payment_snapshot",
    )
    subscription_data = _validate_json_object(
        subscription_snapshot,
        field_name="subscription_snapshot",
    )

    return {
        "schema": (
            "primeyacc.platform_billing_document.v1"
        ),
        "document": {
            "type": (
                PlatformBillingDocumentType
                .PAYMENT_RECEIPT
            ),
            "title": "Payment receipt",
            "title_ar": "ط¥ظٹطµط§ظ„ ط¯ظپط¹ ط§ط´طھط±ط§ظƒ",
            "number": _clean_text(
                document_number
            ),
            "issue_date": _date_to_string(
                issue_date
            ),
            "currency_code": (
                _clean_text(currency_code)
                or DEFAULT_CURRENCY_CODE
            ).upper(),
        },
        "related_invoice": {
            "id": invoice.pk,
            "document_number": (
                invoice.document_number
            ),
            "issue_date": _date_to_string(
                invoice.issue_date
            ),
            "total_amount": _money_to_string(
                invoice.total_amount
            ),
        },
        "seller": dict(
            invoice.seller_snapshot
        ),
        "buyer": dict(
            invoice.buyer_snapshot
        ),
        "subscription": subscription_data,
        "plan": dict(
            invoice.plan_snapshot
        ),
        "payment": payment_data,
        "totals": {
            "subtotal": _money_to_string(
                invoice.subtotal
            ),
            "discount_amount": _money_to_string(
                invoice.discount_amount
            ),
            "taxable_amount": _money_to_string(
                invoice.taxable_amount
            ),
            "tax_amount": _money_to_string(
                invoice.tax_amount
            ),
            "total_amount": _money_to_string(
                invoice.total_amount
            ),
            "paid_amount": _money_to_string(
                invoice.total_amount
            ),
            "balance_amount": "0.00",
        },
        "notes": _clean_text(notes),
    }


def _validate_subscription_for_invoice(
    subscription: CompanySubscription,
) -> None:
    if not subscription:
        raise ValidationError(
            {
                "subscription": "ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ط·ظ„ظˆط¨.",
            }
        )

    if not subscription.pk:
        raise ValidationError(
            {
                "subscription": (
                    "ظٹط¬ط¨ ط­ظپط¸ ط§ظ„ط§ط´طھط±ط§ظƒ ظ‚ط¨ظ„ ط¥ظ†ط´ط§ط، ظپط§طھظˆط±طھظ‡."
                ),
            }
        )

    if not subscription.company_id:
        raise ValidationError(
            {
                "company": (
                    "ط§ظ„ط§ط´طھط±ط§ظƒ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ظ…ط±طھط¨ط·ظ‹ط§ ط¨ط´ط±ظƒط©."
                ),
            }
        )

    if not subscription.plan_id:
        raise ValidationError(
            {
                "plan": (
                    "ط§ظ„ط§ط´طھط±ط§ظƒ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ظ…ط±طھط¨ط·ظ‹ط§ ط¨ط¨ط§ظ‚ط©."
                ),
            }
        )

    if money(subscription.price) < Decimal("0.00"):
        raise ValidationError(
            {
                "price": "ظ‚ظٹظ…ط© ط§ظ„ط§ط´طھط±ط§ظƒ ط؛ظٹط± طµط­ظٹط­ط©.",
            }
        )

    if money(
        subscription.discount_amount
    ) > money(subscription.price):
        raise ValidationError(
            {
                "discount_amount": (
                    "ط®طµظ… ط§ظ„ط§ط´طھط±ط§ظƒ ظ„ط§ ظٹظ…ظƒظ† ط£ظ† "
                    "ظٹطھط¬ط§ظˆط² ظ‚ظٹظ…طھظ‡."
                ),
            }
        )

    expected_taxable = money(
        money(subscription.price)
        - money(subscription.discount_amount)
    )
    expected_total = money(
        expected_taxable
        + money(subscription.tax_amount)
    )

    if money(
        subscription.amount_before_tax
    ) != expected_taxable:
        raise ValidationError(
            {
                "amount_before_tax": (
                    "ظ‚ظٹظ…ط© ط§ظ„ط§ط´طھط±ط§ظƒ ظ‚ط¨ظ„ ط§ظ„ط¶ط±ظٹط¨ط© "
                    "ط؛ظٹط± ظ…طھط·ط§ط¨ظ‚ط©."
                ),
            }
        )

    if money(
        subscription.total_amount
    ) != expected_total:
        raise ValidationError(
            {
                "total_amount": (
                    "ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط§ط´طھط±ط§ظƒ ط؛ظٹط± ظ…طھط·ط§ط¨ظ‚ "
                    "ظ…ط¹ ط§ظ„ظ…ط¨ظ„ط؛ ظ‚ط¨ظ„ ط§ظ„ط¶ط±ظٹط¨ط© ظˆط§ظ„ط¶ط±ظٹط¨ط©."
                ),
            }
        )


@transaction.atomic
def create_or_get_subscription_invoice(
    *,
    subscription: CompanySubscription,
    issue_date: date | None = None,
    seller_snapshot: dict[str, Any] | None = None,
    created_by=None,
    notes: str = "",
    metadata: dict[str, Any] | None = None,
) -> tuple[PlatformBillingDocument, bool]:
    _validate_subscription_for_invoice(
        subscription
    )

    effective_issue_date = (
        issue_date or timezone.localdate()
    )

    if not isinstance(effective_issue_date, date):
        raise ValidationError(
            {
                "issue_date": (
                    "طھط§ط±ظٹط® ط¥طµط¯ط§ط± ط§ظ„ظپط§طھظˆط±ط© ط؛ظٹط± طµط­ظٹط­."
                ),
            }
        )

    metadata_payload = _validate_json_object(
        metadata,
        field_name="metadata",
    )

    locked_subscription = (
        CompanySubscription.objects
        .select_for_update()
        .select_related(
            "company",
            "plan",
            "previous_subscription",
            "previous_subscription__plan",
        )
        .get(pk=subscription.pk)
    )

    _validate_subscription_for_invoice(
        locked_subscription
    )

    existing_invoice = (
        PlatformBillingDocument.objects
        .select_for_update()
        .filter(
            subscription=locked_subscription,
            document_type=(
                PlatformBillingDocumentType
                .SUBSCRIPTION_INVOICE
            ),
        )
        .first()
    )

    if existing_invoice:
        return existing_invoice, False

    company = locked_subscription.company
    plan = locked_subscription.plan

    seller = build_platform_seller_snapshot(
        overrides=seller_snapshot
    )
    buyer = build_company_buyer_snapshot(
        company
    )
    subscription_data = build_subscription_snapshot(
        locked_subscription
    )
    plan_data = build_subscription_plan_snapshot(
        plan
    )

    currency_code = (
        _clean_text(
            getattr(company, "currency_code", "")
        )
        or DEFAULT_CURRENCY_CODE
    ).upper()

    subtotal = money(
        locked_subscription.price
    )
    discount = money(
        locked_subscription.discount_amount
    )
    taxable = money(
        locked_subscription.amount_before_tax
    )
    tax = money(
        locked_subscription.tax_amount
    )
    total = money(
        locked_subscription.total_amount
    )

    generated_number = (
        generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType
                .SUBSCRIPTION_INVOICE
            ),
            issue_date=effective_issue_date,
        )
    )

    printable_payload = (
        build_subscription_invoice_printable_payload(
            document_number=(
                generated_number.document_number
            ),
            issue_date=effective_issue_date,
            currency_code=currency_code,
            subtotal=subtotal,
            discount_amount=discount,
            taxable_amount=taxable,
            tax_amount=tax,
            total_amount=total,
            balance_amount=total,
            seller_snapshot=seller,
            buyer_snapshot=buyer,
            subscription_snapshot=(
                subscription_data
            ),
            plan_snapshot=plan_data,
            notes=(
                notes
                or locked_subscription.notes
            ),
        )
    )

    try:
        invoice = (
            PlatformBillingDocument.objects.create(
                document_type=(
                    PlatformBillingDocumentType
                    .SUBSCRIPTION_INVOICE
                ),
                status=(
                    PlatformBillingDocumentStatus
                    .ISSUED
                ),
                document_number=(
                    generated_number.document_number
                ),
                sequence_number=(
                    generated_number.sequence_number
                ),
                sequence_year=(
                    generated_number.year
                ),
                sequence_prefix=(
                    generated_number.prefix
                ),
                subscription=locked_subscription,
                company=company,
                currency_code=currency_code,
                subtotal=subtotal,
                discount_amount=discount,
                taxable_amount=taxable,
                tax_amount=tax,
                total_amount=total,
                paid_amount=Decimal("0.00"),
                balance_amount=total,
                billing_reference=_clean_text(
                    locked_subscription
                    .billing_reference
                ),
                seller_snapshot=seller,
                buyer_snapshot=buyer,
                subscription_snapshot=(
                    subscription_data
                ),
                plan_snapshot=plan_data,
                payment_snapshot={},
                printable_payload=(
                    printable_payload
                ),
                metadata=metadata_payload,
                issue_date=effective_issue_date,
                issued_at=timezone.now(),
                notes=_clean_text(
                    notes
                    or locked_subscription.notes
                ),
                created_by=created_by,
            )
        )

    except IntegrityError:
        existing_invoice = (
            PlatformBillingDocument.objects
            .filter(
                subscription=locked_subscription,
                document_type=(
                    PlatformBillingDocumentType
                    .SUBSCRIPTION_INVOICE
                ),
            )
            .first()
        )

        if existing_invoice:
            return existing_invoice, False

        raise

    return invoice, True


def get_subscription_invoice(
    *,
    subscription: CompanySubscription,
) -> PlatformBillingDocument | None:
    if not subscription or not subscription.pk:
        raise ValidationError(
            {
                "subscription": (
                    "ط§ظ„ط§ط´طھط±ط§ظƒ ط§ظ„ظ…ط­ظپظˆط¸ ظ…ط·ظ„ظˆط¨."
                ),
            }
        )

    return (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__plan",
            "related_invoice",
            "created_by",
            "cancelled_by",
        )
        .filter(
            subscription=subscription,
            document_type=(
                PlatformBillingDocumentType
                .SUBSCRIPTION_INVOICE
            ),
        )
        .first()
    )


def get_subscription_payment_receipt(
    *,
    subscription: CompanySubscription,
) -> PlatformBillingDocument | None:
    if not subscription or not subscription.pk:
        raise ValidationError(
            {
                "subscription": (
                    "ط§ظ„ط§ط´طھط±ط§ظƒ ط§ظ„ظ…ط­ظپظˆط¸ ظ…ط·ظ„ظˆط¨."
                ),
            }
        )

    return (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__plan",
            "related_invoice",
            "created_by",
            "cancelled_by",
        )
        .filter(
            subscription=subscription,
            document_type=(
                PlatformBillingDocumentType
                .PAYMENT_RECEIPT
            ),
        )
        .first()
    )


@transaction.atomic
def create_or_get_subscription_payment_receipt(
    *,
    subscription: CompanySubscription,
    payment_method: str,
    transaction_reference: str = "",
    billing_reference: str = "",
    paid_at: datetime | None = None,
    issue_date: date | None = None,
    payment_extra: dict[str, Any] | None = None,
    seller_snapshot: dict[str, Any] | None = None,
    created_by=None,
    notes: str = "",
    metadata: dict[str, Any] | None = None,
) -> tuple[PlatformBillingDocument, bool]:
    _validate_subscription_for_invoice(
        subscription
    )

    normalized_payment_method = _clean_text(
        payment_method
    )

    if not normalized_payment_method:
        raise ValidationError(
            {
                "payment_method": (
                    "ط·ط±ظٹظ‚ط© ط¯ظپط¹ ط§ظ„ط§ط´طھط±ط§ظƒ ظ…ط·ظ„ظˆط¨ط©."
                ),
            }
        )

    effective_paid_at = (
        paid_at or timezone.now()
    )

    if not isinstance(effective_paid_at, datetime):
        raise ValidationError(
            {
                "paid_at": (
                    "ظˆظ‚طھ ط¯ظپط¹ ط§ظ„ط§ط´طھط±ط§ظƒ ط؛ظٹط± طµط­ظٹط­."
                ),
            }
        )

    if timezone.is_naive(effective_paid_at):
        effective_paid_at = timezone.make_aware(
            effective_paid_at,
            timezone.get_current_timezone(),
        )

    effective_issue_date = (
        issue_date
        or timezone.localtime(
            effective_paid_at
        ).date()
    )

    if not isinstance(effective_issue_date, date):
        raise ValidationError(
            {
                "issue_date": (
                    "طھط§ط±ظٹط® ط¥طµط¯ط§ط± ط¥ظٹطµط§ظ„ ط§ظ„ط¯ظپط¹ ط؛ظٹط± طµط­ظٹط­."
                ),
            }
        )

    metadata_payload = _validate_json_object(
        metadata,
        field_name="metadata",
    )

    locked_subscription = (
        CompanySubscription.objects
        .select_for_update()
        .select_related(
            "company",
            "plan",
            "previous_subscription",
            "previous_subscription__plan",
        )
        .get(pk=subscription.pk)
    )

    _validate_subscription_for_invoice(
        locked_subscription
    )

    existing_receipt = (
        PlatformBillingDocument.objects
        .select_for_update()
        .filter(
            subscription=locked_subscription,
            document_type=(
                PlatformBillingDocumentType
                .PAYMENT_RECEIPT
            ),
        )
        .first()
    )

    if existing_receipt:
        return existing_receipt, False

    invoice, _ = (
        create_or_get_subscription_invoice(
            subscription=locked_subscription,
            issue_date=effective_issue_date,
            seller_snapshot=seller_snapshot,
            created_by=created_by,
            notes=notes,
        )
    )

    invoice = (
        PlatformBillingDocument.objects
        .select_for_update()
        .select_related(
            "company",
            "subscription",
            "subscription__plan",
        )
        .get(pk=invoice.pk)
    )

    if invoice.is_cancelled:
        raise ValidationError(
            {
                "invoice": (
                    "ظ„ط§ ظٹظ…ظƒظ† طھط³ط¬ظٹظ„ ط¯ظپط¹ "
                    "ظ„ظپط§طھظˆط±ط© ط§ط´طھط±ط§ظƒ ظ…ظ„ط؛ط§ط©."
                ),
            }
        )

    effective_billing_reference = (
        _clean_text(billing_reference)
        or _clean_text(
            locked_subscription.billing_reference
        )
        or _clean_text(
            invoice.billing_reference
        )
    )

    payment_snapshot = (
        build_subscription_payment_snapshot(
            payment_method=(
                normalized_payment_method
            ),
            transaction_reference=(
                transaction_reference
            ),
            billing_reference=(
                effective_billing_reference
            ),
            paid_at=effective_paid_at,
            paid_amount=(
                invoice.total_amount
            ),
            currency_code=(
                invoice.currency_code
            ),
            extra=payment_extra,
        )
    )

    if invoice.is_paid:
        if money(
            invoice.paid_amount
        ) != money(invoice.total_amount):
            raise ValidationError(
                {
                    "invoice": (
                        "ط¨ظٹط§ظ†ط§طھ ط¯ظپط¹ ط§ظ„ظپط§طھظˆط±ط© ط§ظ„ط­ط§ظ„ظٹط© "
                        "ط؛ظٹط± ظ…طھط·ط§ط¨ظ‚ط©."
                    ),
                }
            )
    else:
        invoice.mark_paid(
            paid_at=effective_paid_at,
            billing_reference=(
                effective_billing_reference
            ),
            transaction_reference=(
                transaction_reference
            ),
            payment_method=(
                normalized_payment_method
            ),
            payment_snapshot=(
                payment_snapshot
            ),
            save=True,
        )

    generated_number = (
        generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType
                .PAYMENT_RECEIPT
            ),
            issue_date=effective_issue_date,
        )
    )

    receipt_subscription_snapshot = (
        build_subscription_snapshot(
            locked_subscription
        )
    )

    printable_payload = (
        build_subscription_receipt_printable_payload(
            document_number=(
                generated_number.document_number
            ),
            issue_date=effective_issue_date,
            currency_code=(
                invoice.currency_code
            ),
            invoice=invoice,
            payment_snapshot=(
                payment_snapshot
            ),
            subscription_snapshot=(
                receipt_subscription_snapshot
            ),
            notes=notes,
        )
    )

    try:
        receipt = (
            PlatformBillingDocument.objects.create(
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
                status=(
                    PlatformBillingDocumentStatus
                    .ISSUED
                ),
                document_number=(
                    generated_number.document_number
                ),
                sequence_number=(
                    generated_number.sequence_number
                ),
                sequence_year=(
                    generated_number.year
                ),
                sequence_prefix=(
                    generated_number.prefix
                ),
                subscription=locked_subscription,
                company=(
                    locked_subscription.company
                ),
                related_invoice=invoice,
                currency_code=(
                    invoice.currency_code
                ),
                subtotal=invoice.subtotal,
                discount_amount=(
                    invoice.discount_amount
                ),
                taxable_amount=(
                    invoice.taxable_amount
                ),
                tax_amount=invoice.tax_amount,
                total_amount=(
                    invoice.total_amount
                ),
                paid_amount=(
                    invoice.total_amount
                ),
                balance_amount=Decimal("0.00"),
                billing_reference=(
                    effective_billing_reference
                ),
                transaction_reference=(
                    _clean_text(
                        transaction_reference
                    )
                ),
                payment_method=(
                    normalized_payment_method
                ),
                seller_snapshot=dict(
                    invoice.seller_snapshot
                ),
                buyer_snapshot=dict(
                    invoice.buyer_snapshot
                ),
                subscription_snapshot=(
                    receipt_subscription_snapshot
                ),
                plan_snapshot=dict(
                    invoice.plan_snapshot
                ),
                payment_snapshot=(
                    payment_snapshot
                ),
                printable_payload=(
                    printable_payload
                ),
                metadata=metadata_payload,
                issue_date=(
                    effective_issue_date
                ),
                issued_at=timezone.now(),
                paid_at=effective_paid_at,
                notes=_clean_text(notes),
                created_by=created_by,
            )
        )

    except IntegrityError:
        existing_receipt = (
            PlatformBillingDocument.objects
            .filter(
                subscription=locked_subscription,
                document_type=(
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
            )
            .first()
        )

        if existing_receipt:
            return existing_receipt, False

        raise

    return receipt, True

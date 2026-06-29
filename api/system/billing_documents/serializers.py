# ============================================================
# 📂 api/system/billing_documents/serializers.py
# 🧠 Mhamcloud | System Billing Documents Serializers V1.0
# ------------------------------------------------------------
# ✅ Shared platform billing document JSON payloads
# ✅ Company, subscription, plan, user, and invoice summaries
# ✅ Stable monetary, date, and datetime serialization
# ✅ Optional snapshots and printable payload inclusion
# ✅ Allowed actions for system billing document APIs
# ✅ Complete separation from company document serializers
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه الدوال تخص مستندات فوترة مالك منصة Mhamcloud فقط
# - القائمة تستخدم Payload مختصرًا لتقليل حجم الاستجابة
# - التفاصيل تعرض Snapshots وبيانات الطباعة المحفوظة
# - لا تعتمد الطباعة على بيانات الشركة أو الباقة الحية
# - جميع المبالغ ترجع كنص عشري بدقتين
# - لا يوجد منطق إنشاء أو تعديل Business داخل هذا الملف
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    money,
)
from subscriptions.models import CompanySubscription


def money_to_string(
    value: Decimal | int | str | None,
) -> str:
    """
    Convert a monetary value to a two-decimal string.
    """

    return f"{money(value):.2f}"


def date_to_string(value: Any) -> str | None:
    """
    Convert a date value to ISO format.
    """

    if not value:
        return None

    return value.isoformat()


def datetime_to_string(value: Any) -> str | None:
    """
    Convert a datetime value to ISO format.
    """

    if not value:
        return None

    return value.isoformat()


def user_summary_payload(user) -> dict[str, Any] | None:
    """
    Return a safe summary for a Django user.
    """

    if not user:
        return None

    profile = getattr(
        user,
        "Mhamcloud_profile",
        None,
    )

    display_name = ""

    if profile:
        display_name = str(
            getattr(profile, "display_name", "") or ""
        ).strip()

    if not display_name:
        get_full_name = getattr(
            user,
            "get_full_name",
            None,
        )

        if callable(get_full_name):
            display_name = str(
                get_full_name() or ""
            ).strip()

    if not display_name:
        display_name = str(
            getattr(user, "username", "") or ""
        ).strip()

    return {
        "id": user.pk,
        "username": str(
            getattr(user, "username", "") or ""
        ),
        "display_name": display_name,
        "email": str(
            getattr(user, "email", "") or ""
        ),
        "is_active": bool(
            getattr(user, "is_active", False)
        ),
    }


def company_summary_payload(company) -> dict[str, Any] | None:
    """
    Return a safe company summary.
    """

    if not company:
        return None

    display_name = (
        str(
            getattr(company, "display_name", "")
            or ""
        ).strip()
        or str(
            getattr(company, "name", "")
            or ""
        ).strip()
    )

    company_code = str(
        getattr(company, "company_code", "")
        or ""
    ).strip()

    return {
        "id": company.pk,
        "name": str(
            getattr(company, "name", "")
            or ""
        ),
        "display_name": display_name,
        "name_ar": str(
            getattr(company, "name_ar", "")
            or ""
        ),
        "name_en": str(
            getattr(company, "name_en", "")
            or ""
        ),
        "company_code": company_code,
        "code": company_code,
        "commercial_registration": str(
            getattr(
                company,
                "commercial_registration",
                "",
            )
            or ""
        ),
        "tax_number": str(
            getattr(company, "tax_number", "")
            or ""
        ),
        "email": str(
            getattr(company, "email", "")
            or ""
        ),
        "phone": str(
            getattr(company, "phone", "")
            or ""
        ),
        "mobile": str(
            getattr(company, "mobile", "")
            or ""
        ),
        "city": str(
            getattr(company, "city", "")
            or ""
        ),
        "country": str(
            getattr(company, "country", "")
            or ""
        ),
        "currency_code": str(
            getattr(company, "currency_code", "SAR")
            or "SAR"
        ).upper(),
        "status": str(
            getattr(company, "status", "")
            or ""
        ),
        "is_active": bool(
            getattr(company, "is_active", True)
        ),
    }


def plan_summary_payload(plan) -> dict[str, Any] | None:
    """
    Return a safe subscription plan summary.
    """

    if not plan:
        return None

    features = getattr(plan, "features", [])

    if not isinstance(features, list):
        features = []

    return {
        "id": plan.pk,
        "name": str(
            getattr(plan, "name", "") or ""
        ),
        "code": str(
            getattr(plan, "code", "") or ""
        ),
        "slug": str(
            getattr(plan, "slug", "") or ""
        ),
        "monthly_price": money_to_string(
            getattr(plan, "monthly_price", 0)
        ),
        "yearly_price": money_to_string(
            getattr(plan, "yearly_price", 0)
        ),
        "features": list(features),
        "is_active": bool(
            getattr(plan, "is_active", False)
        ),
        "is_public": bool(
            getattr(plan, "is_public", False)
        ),
    }


def subscription_summary_payload(
    subscription: CompanySubscription | None,
) -> dict[str, Any] | None:
    """
    Return a subscription summary for billing document responses.
    """

    if not subscription:
        return None

    plan = getattr(subscription, "plan", None)

    return {
        "id": subscription.pk,
        "company_id": subscription.company_id,
        "plan_id": subscription.plan_id,
        "previous_subscription_id": (
            subscription.previous_subscription_id
        ),
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": date_to_string(
            subscription.start_date
        ),
        "end_date": date_to_string(
            subscription.end_date
        ),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_pending_payment": (
            subscription.is_pending_payment
        ),
        "is_expired_by_date": (
            subscription.is_expired_by_date
        ),
        "price": money_to_string(
            subscription.price
        ),
        "discount_amount": money_to_string(
            subscription.discount_amount
        ),
        "amount_before_tax": money_to_string(
            subscription.amount_before_tax
        ),
        "tax_amount": money_to_string(
            subscription.tax_amount
        ),
        "total_amount": money_to_string(
            subscription.total_amount
        ),
        "currency_code": str(
            getattr(
                subscription.company,
                "currency_code",
                "SAR",
            )
            or "SAR"
        ).upper(),
        "billing_reference": str(
            subscription.billing_reference or ""
        ),
        "auto_renew": subscription.auto_renew,
        "paid_at": datetime_to_string(
            subscription.paid_at
        ),
        "activated_at": datetime_to_string(
            subscription.activated_at
        ),
        "cancelled_at": datetime_to_string(
            subscription.cancelled_at
        ),
        "suspended_at": datetime_to_string(
            subscription.suspended_at
        ),
        "plan": plan_summary_payload(plan),
        "created_at": datetime_to_string(
            subscription.created_at
        ),
        "updated_at": datetime_to_string(
            subscription.updated_at
        ),
    }


def related_invoice_summary_payload(
    invoice: PlatformBillingDocument | None,
) -> dict[str, Any] | None:
    """
    Return the invoice summary linked to a payment receipt.
    """

    if not invoice:
        return None

    return {
        "id": invoice.pk,
        "document_number": invoice.document_number,
        "document_type": invoice.document_type,
        "status": invoice.status,
        "subscription_id": invoice.subscription_id,
        "company_id": invoice.company_id,
        "currency_code": invoice.currency_code,
        "issue_date": date_to_string(
            invoice.issue_date
        ),
        "total_amount": money_to_string(
            invoice.total_amount
        ),
        "paid_amount": money_to_string(
            invoice.paid_amount
        ),
        "balance_amount": money_to_string(
            invoice.balance_amount
        ),
        "paid_at": datetime_to_string(
            invoice.paid_at
        ),
    }


def billing_document_allowed_actions(
    document: PlatformBillingDocument,
) -> dict[str, bool]:
    """
    Return actions currently allowed for the billing document.

    Creation permissions are enforced by the API views.
    These flags describe document lifecycle only.
    """

    is_invoice = (
        document.document_type
        == PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
    )
    is_receipt = (
        document.document_type
        == PlatformBillingDocumentType.PAYMENT_RECEIPT
    )
    is_cancelled = (
        document.status
        == PlatformBillingDocumentStatus.CANCELLED
    )
    is_paid = (
        document.status
        == PlatformBillingDocumentStatus.PAID
    )

    return {
        "view": True,
        "print": bool(document.printable_payload),
        "create_receipt": (
            is_invoice
            and not is_cancelled
            and not is_paid
        ),
        "cancel": (
            not is_cancelled
            and (
                is_invoice
                or is_receipt
            )
        ),
    }


def billing_document_payload(
    document: PlatformBillingDocument,
    *,
    include_snapshots: bool = False,
    include_printable_payload: bool = False,
) -> dict[str, Any]:
    """
    Serialize a platform billing document.

    List endpoints should keep both optional flags disabled.
    Detail and creation endpoints may enable them.
    """

    payload: dict[str, Any] = {
        "id": document.pk,
        "document_type": document.document_type,
        "status": document.status,
        "document_number": document.document_number,
        "sequence": {
            "prefix": document.sequence_prefix,
            "year": document.sequence_year,
            "number": document.sequence_number,
        },
        "subscription_id": document.subscription_id,
        "company_id": document.company_id,
        "related_invoice_id": (
            document.related_invoice_id
        ),
        "company": company_summary_payload(
            getattr(document, "company", None)
        ),
        "subscription": subscription_summary_payload(
            getattr(document, "subscription", None)
        ),
        "related_invoice": (
            related_invoice_summary_payload(
                getattr(
                    document,
                    "related_invoice",
                    None,
                )
            )
        ),
        "currency_code": document.currency_code,
        "amounts": {
            "subtotal": money_to_string(
                document.subtotal
            ),
            "discount_amount": money_to_string(
                document.discount_amount
            ),
            "taxable_amount": money_to_string(
                document.taxable_amount
            ),
            "tax_amount": money_to_string(
                document.tax_amount
            ),
            "total_amount": money_to_string(
                document.total_amount
            ),
            "paid_amount": money_to_string(
                document.paid_amount
            ),
            "balance_amount": money_to_string(
                document.balance_amount
            ),
        },
        "subtotal": money_to_string(
            document.subtotal
        ),
        "discount_amount": money_to_string(
            document.discount_amount
        ),
        "taxable_amount": money_to_string(
            document.taxable_amount
        ),
        "tax_amount": money_to_string(
            document.tax_amount
        ),
        "total_amount": money_to_string(
            document.total_amount
        ),
        "paid_amount": money_to_string(
            document.paid_amount
        ),
        "balance_amount": money_to_string(
            document.balance_amount
        ),
        "billing_reference": (
            document.billing_reference
        ),
        "transaction_reference": (
            document.transaction_reference
        ),
        "payment_method": document.payment_method,
        "issue_date": date_to_string(
            document.issue_date
        ),
        "issued_at": datetime_to_string(
            document.issued_at
        ),
        "paid_at": datetime_to_string(
            document.paid_at
        ),
        "cancelled_at": datetime_to_string(
            document.cancelled_at
        ),
        "cancellation_reason": (
            document.cancellation_reason
        ),
        "notes": document.notes,
        "metadata": dict(
            document.metadata or {}
        ),
        "created_by": user_summary_payload(
            getattr(document, "created_by", None)
        ),
        "cancelled_by": user_summary_payload(
            getattr(document, "cancelled_by", None)
        ),
        "created_at": datetime_to_string(
            document.created_at
        ),
        "updated_at": datetime_to_string(
            document.updated_at
        ),
        "is_invoice": document.is_invoice,
        "is_payment_receipt": (
            document.is_payment_receipt
        ),
        "is_paid": document.is_paid,
        "is_cancelled": document.is_cancelled,
        "allowed_actions": (
            billing_document_allowed_actions(
                document
            )
        ),
    }

    if include_snapshots:
        payload["snapshots"] = {
            "seller": dict(
                document.seller_snapshot or {}
            ),
            "buyer": dict(
                document.buyer_snapshot or {}
            ),
            "subscription": dict(
                document.subscription_snapshot or {}
            ),
            "plan": dict(
                document.plan_snapshot or {}
            ),
            "payment": dict(
                document.payment_snapshot or {}
            ),
        }

        payload["seller_snapshot"] = dict(
            document.seller_snapshot or {}
        )
        payload["buyer_snapshot"] = dict(
            document.buyer_snapshot or {}
        )
        payload["subscription_snapshot"] = dict(
            document.subscription_snapshot or {}
        )
        payload["plan_snapshot"] = dict(
            document.plan_snapshot or {}
        )
        payload["payment_snapshot"] = dict(
            document.payment_snapshot or {}
        )

    if include_printable_payload:
        payload["printable_payload"] = dict(
            document.printable_payload or {}
        )

    return payload
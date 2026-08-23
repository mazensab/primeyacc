from __future__ import annotations

import logging
from typing import Any, Callable

from django.db import transaction


logger = logging.getLogger(__name__)


LIFECYCLE_CHANNELS = (
    "IN_APP",
    "EMAIL",
    "WHATSAPP",
)


def _clean(
    value: Any,
) -> str:
    return str(
        value or ""
    ).strip()


def resolve_company_notification_recipient(
    company,
):
    """
    Resolve the canonical notification recipient for one company.

    Priority:
    1. Company.owner if active.
    2. Active OWNER membership, primary first.
    """

    if company is None:
        return None

    owner = getattr(
        company,
        "owner",
        None,
    )

    if (
        owner is not None
        and getattr(
            owner,
            "is_active",
            True,
        )
    ):
        return owner

    try:
        from accounts.models import (
            CompanyMembership,
            CompanyRole,
            MembershipStatus,
        )

        membership = (
            CompanyMembership.objects
            .select_related("user")
            .filter(
                company=company,
                role=CompanyRole.OWNER,
                status=MembershipStatus.ACTIVE,
                user__is_active=True,
            )
            .order_by(
                "-is_primary",
                "-created_at",
                "-id",
            )
            .first()
        )

        if membership is not None:
            return membership.user

    except Exception:
        logger.exception(
            "Could not resolve company notification owner.",
        )

    return None


def _recipient_phone(
    recipient,
) -> str:
    """
    Resolve phone from the actual Mhamcloud user/profile contract.
    """

    if recipient is None:
        return ""

    for attribute in (
        "phone",
        "phone_number",
        "mobile",
    ):
        value = _clean(
            getattr(
                recipient,
                attribute,
                "",
            )
        )

        if value:
            return value

    profile = None

    for relation_name in (
        "Mhamcloud_profile",
        "profile",
    ):
        try:
            profile = getattr(
                recipient,
                relation_name,
                None,
            )
        except Exception:
            profile = None

        if profile is not None:
            break

    if profile is not None:
        for attribute in (
            "phone",
            "phone_number",
            "mobile",
        ):
            value = _clean(
                getattr(
                    profile,
                    attribute,
                    "",
                )
            )

            if value:
                return value

    return ""


def _recipient_email(
    recipient,
) -> str:
    if recipient is None:
        return ""

    return _clean(
        getattr(
            recipient,
            "email",
            "",
        )
    )


def emit_lifecycle_notification(
    *,
    company_id: int,
    event_type: str,
    event_key: str,
    title: str,
    message: str,
    metadata: dict[str, Any] | None = None,
    created_by_id: int | None = None,
) -> None:
    """
    Create one idempotent lifecycle NotificationEvent and attempt delivery.

    This function intentionally runs after the originating transaction
    commits. Any delivery/provider error is isolated from the business
    transaction.
    """

    from companies.models import Company
    from notifications.services import (
        create_or_get_notification_event,
        deliver_notification_event,
    )

    company = (
        Company.objects
        .select_related("owner")
        .filter(
            pk=company_id
        )
        .first()
    )

    if company is None:
        return

    created_by = None

    if created_by_id:
        try:
            from django.contrib.auth import (
                get_user_model,
            )

            User = get_user_model()

            created_by = (
                User.objects
                .filter(
                    pk=created_by_id
                )
                .first()
            )
        except Exception:
            created_by = None

    event, _created = (
        create_or_get_notification_event(
            company=company,
            event_type=_clean(
                event_type
            ),
            event_key=_clean(
                event_key
            ),
            title=_clean(
                title
            ),
            message=_clean(
                message
            ),
            payload=dict(
                metadata or {}
            ),
            created_by=created_by,
        )
    )

    recipient = (
        resolve_company_notification_recipient(
            company
        )
    )

    if recipient is None:
        return

    deliver_notification_event(
        event=event,
        recipient=recipient,
        channels=LIFECYCLE_CHANNELS,
        email_destination=(
            _recipient_email(
                recipient
            )
        ),
        whatsapp_destination=(
            _recipient_phone(
                recipient
            )
        ),
    )


def schedule_lifecycle_notification(
    *,
    company_id: int,
    event_type: str,
    event_key: str,
    title: str,
    message: str,
    metadata: dict[str, Any] | None = None,
    created_by_id: int | None = None,
) -> None:
    """
    Register a robust post-commit notification callback.

    The callback catches its own errors and Django is also instructed to
    treat it as robust. Notification transport can therefore never roll
    back payment, subscription or onboarding state.
    """

    company_id = int(
        company_id
    )

    created_by_id = (
        int(created_by_id)
        if created_by_id
        else None
    )

    safe_metadata = dict(
        metadata or {}
    )

    def callback() -> None:
        try:
            emit_lifecycle_notification(
                company_id=company_id,
                event_type=event_type,
                event_key=event_key,
                title=title,
                message=message,
                metadata=safe_metadata,
                created_by_id=(
                    created_by_id
                ),
            )

        except Exception:
            logger.exception(
                "Lifecycle notification failed after commit. "
                "event_type=%s event_key=%s company_id=%s",
                event_type,
                event_key,
                company_id,
            )

    transaction.on_commit(
        callback,
        robust=True,
    )

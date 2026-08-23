# ============================================================
# 📂 notifications/services.py
# 🧠 Mhamcloud | Company Notifications Services V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated notification helpers
# ✅ Create single recipient notification
# ✅ Create company-wide notification
# ✅ List notifications safely by company/user
# ✅ Mark one notification as read
# ✅ Mark all notifications as read
# ✅ Unread count helper
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل العمليات تعتمد على company القادم من request.company لاحقًا
# - لا يتم إنشاء إشعار خارج نطاق الشركة
# - recipient يجب أن يكون عضوًا في نفس الشركة عند استخدام التحقق
# - الخدمات لا تعتمد على HTTP مباشرة لتبقى قابلة للاختبار والاستدعاء من باقي الموديولات
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, QuerySet
from django.utils import timezone

from accounts.models import CompanyMembership, MembershipStatus
from companies.models import Company
from notifications.models import (
    CompanyNotification,
    NotificationChannel,
    NotificationDelivery,
    NotificationDeliveryStatus,
    NotificationEvent,
    NotificationPriority,
    NotificationType,
)

User = get_user_model()


def user_belongs_to_company(*, user: User, company: Company) -> bool:
    """
    Check whether a user has an active membership in the given company.
    """
    if not user or not company:
        return False

    return CompanyMembership.objects.filter(
        user=user,
        company=company,
        status=MembershipStatus.ACTIVE,
        company__is_active=True,
    ).exists()


def get_company_notifications_queryset(
    *,
    company: Company,
    user: User | None = None,
    include_company_wide: bool = True,
) -> QuerySet[CompanyNotification]:
    """
    Return notifications scoped to one company.

    If user is provided:
    - include notifications assigned to that user
    - optionally include company-wide notifications where recipient is empty
    """
    queryset = CompanyNotification.objects.select_related(
        "company",
        "recipient",
        "created_by",
    ).filter(company=company)

    if user:
        user_filter = Q(recipient=user)
        if include_company_wide:
            user_filter |= Q(recipient__isnull=True)

        queryset = queryset.filter(user_filter)

    return queryset.order_by("-created_at")


def create_notification(
    *,
    company: Company,
    title: str,
    message: str,
    recipient: User | None = None,
    notification_type: str = NotificationType.INFO,
    channel: str = NotificationChannel.IN_APP,
    priority: str = NotificationPriority.NORMAL,
    source_type: str = "",
    source_id: str | int = "",
    action_url: str = "",
    metadata: dict[str, Any] | None = None,
    created_by: User | None = None,
    validate_recipient_membership: bool = True,
) -> CompanyNotification:
    """
    Create one tenant-isolated notification.

    Raises:
        ValueError: if required data is missing or recipient is outside company.
    """
    if not company:
        raise ValueError("Company is required.")

    title = (title or "").strip()
    message = (message or "").strip()

    if not title:
        raise ValueError("Notification title is required.")

    if not message:
        raise ValueError("Notification message is required.")

    if recipient and validate_recipient_membership:
        if not user_belongs_to_company(user=recipient, company=company):
            raise ValueError("Recipient does not belong to this company.")

    return CompanyNotification.objects.create(
        company=company,
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        channel=channel,
        priority=priority,
        source_type=(source_type or "").strip(),
        source_id=str(source_id or "").strip(),
        action_url=(action_url or "").strip(),
        metadata=metadata or {},
        created_by=created_by,
    )


def create_company_wide_notification(
    *,
    company: Company,
    title: str,
    message: str,
    notification_type: str = NotificationType.INFO,
    channel: str = NotificationChannel.IN_APP,
    priority: str = NotificationPriority.NORMAL,
    source_type: str = "",
    source_id: str | int = "",
    action_url: str = "",
    metadata: dict[str, Any] | None = None,
    created_by: User | None = None,
) -> CompanyNotification:
    """
    Create a company-wide notification without a specific recipient.
    """
    return create_notification(
        company=company,
        recipient=None,
        title=title,
        message=message,
        notification_type=notification_type,
        channel=channel,
        priority=priority,
        source_type=source_type,
        source_id=source_id,
        action_url=action_url,
        metadata=metadata,
        created_by=created_by,
        validate_recipient_membership=False,
    )


def get_notification_for_company(
    *,
    company: Company,
    notification_id: int,
    user: User | None = None,
    include_company_wide: bool = True,
) -> CompanyNotification | None:
    """
    Return one notification safely scoped by company and optional user.
    """
    queryset = get_company_notifications_queryset(
        company=company,
        user=user,
        include_company_wide=include_company_wide,
    )

    return queryset.filter(id=notification_id).first()


@transaction.atomic
def mark_notification_as_read(
    *,
    company: Company,
    notification_id: int,
    user: User | None = None,
) -> CompanyNotification:
    """
    Mark one notification as read safely.
    """
    notification = get_notification_for_company(
        company=company,
        notification_id=notification_id,
        user=user,
    )

    if not notification:
        raise ValueError("Notification was not found.")

    notification.mark_as_read()
    return notification


@transaction.atomic
def mark_all_notifications_as_read(
    *,
    company: Company,
    user: User | None = None,
    include_company_wide: bool = True,
) -> int:
    """
    Mark all unread notifications as read for one company/user scope.
    """
    queryset = get_company_notifications_queryset(
        company=company,
        user=user,
        include_company_wide=include_company_wide,
    ).filter(is_read=False)

    now = timezone.now()

    return queryset.update(
        is_read=True,
        read_at=now,
        updated_at=now,
    )


def get_unread_notifications_count(
    *,
    company: Company,
    user: User | None = None,
    include_company_wide: bool = True,
) -> int:
    """
    Count unread notifications safely by company/user scope.
    """
    return get_company_notifications_queryset(
        company=company,
        user=user,
        include_company_wide=include_company_wide,
    ).filter(is_read=False).count()


def serialize_notification(notification: CompanyNotification) -> dict[str, Any]:
    """
    Serialize notification for API responses.

    Keeping serializer here avoids adding DRF serializers too early in the foundation.
    """
    return {
        "id": notification.id,
        "company_id": notification.company_id,
        "recipient_id": notification.recipient_id,
        "recipient_username": (
            notification.recipient.get_username()
            if notification.recipient_id
            else None
        ),
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type,
        "channel": notification.channel,
        "priority": notification.priority,
        "source_type": notification.source_type,
        "source_id": notification.source_id,
        "action_url": notification.action_url,
        "is_read": notification.is_read,
        "read_at": notification.read_at.isoformat() if notification.read_at else None,
        "metadata": notification.metadata,
        "created_by_id": notification.created_by_id,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "updated_at": notification.updated_at.isoformat() if notification.updated_at else None,
    }


# ============================================================
# Phase 27 - Event / Delivery Services
# ============================================================


def _notification_clean_text(value: Any) -> str:
    return str(value or "").strip()


def _notification_json_object(
    value: dict[str, Any] | None,
    field_name: str,
) -> dict[str, Any]:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise ValueError(
            f"{field_name} must be a JSON object."
        )

    return dict(value)


@transaction.atomic
def create_or_get_notification_event(
    *,
    company: Company,
    event_type: str,
    event_key: str,
    source_type: str = "",
    source_id: str | int = "",
    title: str = "",
    message: str = "",
    action_url: str = "",
    payload: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    created_by=None,
) -> tuple[NotificationEvent, bool]:
    """
    Create one logical idempotent event.

    Same event_key always resolves to the same event. It is not legal to reuse
    the same key for another company/event/source.

    payload is the canonical NotificationEvent JSON body.

    metadata is accepted as a backward-compatible lifecycle alias and is
    persisted inside payload because NotificationEvent intentionally has no
    separate metadata field. If both are supplied, payload wins for duplicate
    keys.
    """

    if not company:
        raise ValueError("Company is required.")

    normalized_type = _notification_clean_text(
        event_type
    ).lower()

    normalized_key = _notification_clean_text(
        event_key
    )

    if not normalized_type:
        raise ValueError("Event type is required.")

    if not normalized_key:
        raise ValueError("Event key is required.")

    normalized_metadata = _notification_json_object(
        metadata,
        "metadata",
    )
    normalized_payload = {
        **normalized_metadata,
        **_notification_json_object(
            payload,
            "payload",
        ),
    }

    existing = (
        NotificationEvent.objects
        .select_related("company")
        .filter(
            company=company,
            event_key=normalized_key,
        )
        .first()
    )

    if existing is not None:
        if existing.event_type != normalized_type:
            raise ValueError(
                "Notification event key already belongs to another event type."
            )

        expected_source_type = _notification_clean_text(
            source_type
        )
        expected_source_id = _notification_clean_text(
            source_id
        )

        if (
            expected_source_type
            and existing.source_type
            and existing.source_type != expected_source_type
        ):
            raise ValueError(
                "Notification event key source type mismatch."
            )

        if (
            expected_source_id
            and existing.source_id
            and existing.source_id != expected_source_id
        ):
            raise ValueError(
                "Notification event key source id mismatch."
            )

        return existing, False

    event = NotificationEvent.objects.create(
        company=company,
        event_type=normalized_type,
        event_key=normalized_key,
        source_type=_notification_clean_text(
            source_type
        ),
        source_id=_notification_clean_text(
            source_id
        ),
        title=_notification_clean_text(
            title
        ),
        message=_notification_clean_text(
            message
        ),
        action_url=_notification_clean_text(
            action_url
        ),
        payload=normalized_payload,
        created_by=created_by,
    )

    return event, True


@transaction.atomic
def create_or_get_notification_delivery(
    *,
    event: NotificationEvent,
    channel: str,
    recipient=None,
    destination: str = "",
    metadata: dict[str, Any] | None = None,
) -> tuple[NotificationDelivery, bool]:
    """
    Create one idempotent target/channel delivery row.
    """

    if not event or not event.pk:
        raise ValueError("Saved notification event is required.")

    normalized_channel = _notification_clean_text(
        channel
    ).upper()

    if normalized_channel not in NotificationChannel.values:
        raise ValueError("Invalid notification channel.")

    normalized_destination = _notification_clean_text(
        destination
    )

    if recipient is not None:
        if not user_belongs_to_company(
            user=recipient,
            company=event.company,
        ):
            raise ValueError(
                "Recipient does not belong to the event company."
            )

    delivery, created = (
        NotificationDelivery.objects.get_or_create(
            event=event,
            company=event.company,
            recipient=recipient,
            channel=normalized_channel,
            destination=normalized_destination,
            defaults={
                "status": (
                    NotificationDeliveryStatus.PENDING
                ),
                "metadata": _notification_json_object(
                    metadata,
                    "metadata",
                ),
            },
        )
    )

    return delivery, created


@transaction.atomic
def deliver_notification_in_app(
    *,
    event: NotificationEvent,
    recipient=None,
    notification_type: str = NotificationType.INFO,
    priority: str = NotificationPriority.NORMAL,
) -> tuple[
    CompanyNotification,
    NotificationDelivery,
    bool,
]:
    """
    Materialize an event into the existing CompanyNotification model.

    This preserves the current frontend/API contract while Delivery owns
    transport/audit state.
    """

    destination = (
        str(recipient.pk)
        if recipient is not None
        else "COMPANY"
    )

    delivery, created = create_or_get_notification_delivery(
        event=event,
        channel=NotificationChannel.IN_APP,
        recipient=recipient,
        destination=destination,
        metadata={
            "event_key": event.event_key,
            "event_type": event.event_type,
        },
    )

    existing_notification_id = (
        delivery.metadata or {}
    ).get("company_notification_id")

    if existing_notification_id:
        notification = (
            CompanyNotification.objects
            .filter(
                pk=existing_notification_id,
                company=event.company,
            )
            .first()
        )

        if notification is not None:
            return notification, delivery, False

    delivery.mark_processing()

    try:
        notification = create_notification(
            company=event.company,
            recipient=recipient,
            title=event.title or event.event_type,
            message=event.message or event.event_type,
            notification_type=notification_type,
            channel=NotificationChannel.IN_APP,
            priority=priority,
            source_type=event.source_type,
            source_id=event.source_id,
            action_url=event.action_url,
            metadata={
                **(event.payload or {}),
                "notification_event_id": event.id,
                "notification_event_key": (
                    event.event_key
                ),
                "notification_event_type": (
                    event.event_type
                ),
            },
            created_by=event.created_by,
            validate_recipient_membership=(
                recipient is not None
            ),
        )

        delivery_metadata = {
            **(delivery.metadata or {}),
            "company_notification_id": (
                notification.id
            ),
        }

        delivery.mark_sent(
            provider="IN_APP",
            provider_reference=str(
                notification.id
            ),
            metadata=delivery_metadata,
        )

        return notification, delivery, created

    except Exception as exc:
        delivery.mark_failed(
            error_code=exc.__class__.__name__,
            error_message=str(exc),
        )
        raise


def serialize_notification_event(
    event: NotificationEvent,
) -> dict[str, Any]:
    return {
        "id": event.id,
        "company_id": event.company_id,
        "event_type": event.event_type,
        "event_key": event.event_key,
        "source_type": event.source_type,
        "source_id": event.source_id,
        "title": event.title,
        "message": event.message,
        "action_url": event.action_url,
        "payload": event.payload or {},
        "created_by_id": event.created_by_id,
        "created_at": (
            event.created_at.isoformat()
            if event.created_at
            else None
        ),
    }


def serialize_notification_delivery(
    delivery: NotificationDelivery,
) -> dict[str, Any]:
    return {
        "id": delivery.id,
        "event_id": delivery.event_id,
        "company_id": delivery.company_id,
        "recipient_id": delivery.recipient_id,
        "channel": delivery.channel,
        "destination": delivery.destination,
        "status": delivery.status,
        "attempt_count": delivery.attempt_count,
        "provider": delivery.provider,
        "provider_reference": (
            delivery.provider_reference
        ),
        "error_code": delivery.error_code,
        "error_message": delivery.error_message,
        "metadata": delivery.metadata or {},
        "started_at": (
            delivery.started_at.isoformat()
            if delivery.started_at
            else None
        ),
        "sent_at": (
            delivery.sent_at.isoformat()
            if delivery.sent_at
            else None
        ),
        "failed_at": (
            delivery.failed_at.isoformat()
            if delivery.failed_at
            else None
        ),
        "created_at": (
            delivery.created_at.isoformat()
            if delivery.created_at
            else None
        ),
        "updated_at": (
            delivery.updated_at.isoformat()
            if delivery.updated_at
            else None
        ),
    }



# ============================================================
# Phase 27C - External Channel Delivery Adapters
# ============================================================


def _notification_recipient_name(recipient) -> str:
    if recipient is None:
        return ""

    get_full_name = getattr(
        recipient,
        "get_full_name",
        None,
    )

    if callable(get_full_name):
        name = str(get_full_name() or "").strip()
        if name:
            return name

    return str(
        getattr(recipient, "username", "") or ""
    ).strip()


def deliver_notification_email(
    *,
    event: NotificationEvent,
    recipient,
    destination: str = "",
    fail_silently: bool = True,
) -> tuple[NotificationDelivery, bool]:
    """
    Deliver an event through Django's configured email backend.

    Financial/business lifecycle callers can safely use fail_silently=True:
    delivery failure is persisted on NotificationDelivery and does not
    invalidate the originating payment/subscription transaction.
    """
    from django.conf import settings
    from django.core.mail import EmailMessage

    if recipient is None:
        raise ValueError(
            "Email delivery requires a recipient."
        )

    email = _notification_clean_text(
        destination
        or getattr(recipient, "email", "")
    )

    delivery, created = create_or_get_notification_delivery(
        event=event,
        channel=NotificationChannel.EMAIL,
        recipient=recipient,
        destination=email,
        metadata={
            "event_key": event.event_key,
            "event_type": event.event_type,
        },
    )

    if (
        delivery.status
        == NotificationDeliveryStatus.SENT
    ):
        return delivery, False

    if not email:
        delivery.mark_skipped(
            reason="Recipient email is missing.",
        )
        return delivery, created

    backend = _notification_clean_text(
        getattr(settings, "EMAIL_BACKEND", "")
    )

    if not backend:
        delivery.mark_skipped(
            reason="Django EMAIL_BACKEND is not configured.",
        )
        return delivery, created

    delivery.mark_processing()

    try:
        message = EmailMessage(
            subject=event.title or event.event_type,
            body=event.message or event.event_type,
            from_email=getattr(
                settings,
                "DEFAULT_FROM_EMAIL",
                None,
            ),
            to=[email],
        )

        sent_count = message.send(
            fail_silently=False
        )

        if sent_count != 1:
            raise RuntimeError(
                "Email backend did not report one sent message."
            )

        delivery.mark_sent(
            provider=backend,
            provider_reference="",
            metadata={
                **(delivery.metadata or {}),
                "email": email,
                "sent_count": sent_count,
            },
        )

        return delivery, created

    except Exception as exc:
        delivery.mark_failed(
            error_code=exc.__class__.__name__,
            error_message=str(exc),
            metadata={
                **(delivery.metadata or {}),
                "email": email,
            },
        )

        if not fail_silently:
            raise

        return delivery, created


def deliver_notification_whatsapp(
    *,
    event: NotificationEvent,
    recipient=None,
    destination: str = "",
    fail_silently: bool = True,
) -> tuple[NotificationDelivery, bool]:
    """
    Deliver an event through the existing Company WhatsApp Session Gateway.
    """
    from whatsapp.services import (
        send_company_whatsapp_message,
    )

    phone = _notification_clean_text(
        destination
    )

    delivery, created = create_or_get_notification_delivery(
        event=event,
        channel=NotificationChannel.WHATSAPP,
        recipient=recipient,
        destination=phone,
        metadata={
            "event_key": event.event_key,
            "event_type": event.event_type,
        },
    )

    if (
        delivery.status
        == NotificationDeliveryStatus.SENT
    ):
        return delivery, False

    if not phone:
        delivery.mark_skipped(
            reason="WhatsApp recipient phone is missing.",
        )
        return delivery, created

    delivery.mark_processing()

    try:
        result = send_company_whatsapp_message(
            company=event.company,
            recipient_phone=phone,
            recipient_name=(
                _notification_recipient_name(
                    recipient
                )
            ),
            message_body=(
                event.message
                or event.title
                or event.event_type
            ),
            source_type="SYSTEM",
            source_id=event.event_key,
            user=event.created_by,
        )

        success = bool(
            result.get("success")
        )

        message_log = (
            result.get("message_log")
            or {}
        )

        provider_reference = _notification_clean_text(
            message_log.get("provider_message_id")
            or (
                result.get("result")
                or {}
            ).get("message_id")
            or (
                result.get("result")
                or {}
            ).get("external_message_id")
        )

        provider = _notification_clean_text(
            message_log.get("provider")
            or "WHATSAPP_GATEWAY"
        )

        if not success:
            gateway_result = (
                result.get("result")
                or {}
            )

            raise RuntimeError(
                _notification_clean_text(
                    gateway_result.get(
                        "error_message"
                    )
                    or result.get("message")
                    or "WhatsApp gateway failed."
                )
            )

        delivery.mark_sent(
            provider=provider,
            provider_reference=provider_reference,
            metadata={
                **(delivery.metadata or {}),
                "phone": phone,
                "whatsapp_message_log_id": (
                    message_log.get("id")
                ),
            },
        )

        return delivery, created

    except Exception as exc:
        delivery.mark_failed(
            error_code=exc.__class__.__name__,
            error_message=str(exc),
            metadata={
                **(delivery.metadata or {}),
                "phone": phone,
            },
        )

        if not fail_silently:
            raise

        return delivery, created



def deliver_notification_event(
    *,
    event: NotificationEvent,
    recipient=None,
    channels: tuple[str, ...] | list[str] = (
        NotificationChannel.IN_APP,
    ),
    email_destination: str = "",
    whatsapp_destination: str = "",
    notification_type: str = NotificationType.INFO,
    priority: str = NotificationPriority.NORMAL,
) -> dict[str, Any]:
    """
    Deliver one notification event through multiple independent channels.

    Important:
    - One transport failure never blocks the remaining channels.
    - Business/payment/subscription state is not rolled back by delivery failure.
    - Existing SENT deliveries remain idempotent.
    """

    results: dict[str, Any] = {}

    normalized_channels: list[str] = []

    for channel in channels:
        value = _notification_clean_text(
            channel
        ).upper()

        if (
            value
            and value not in normalized_channels
        ):
            normalized_channels.append(
                value
            )

    for channel in normalized_channels:

        if (
            channel
            == NotificationChannel.IN_APP
        ):
            try:
                (
                    notification,
                    delivery,
                    created,
                ) = (
                    deliver_notification_in_app(
                        event=event,
                        recipient=recipient,
                        notification_type=notification_type,
                        priority=priority,
                    )
                )

                results[channel] = {
                    "success": (
                        delivery.status
                        == NotificationDeliveryStatus.SENT
                    ),
                    "created": created,
                    "notification_id": notification.id,
                    "delivery": (
                        serialize_notification_delivery(
                            delivery
                        )
                    ),
                }

            except Exception as exc:
                results[channel] = {
                    "success": False,
                    "error": str(exc),
                }

            continue

        if (
            channel
            == NotificationChannel.EMAIL
        ):
            try:
                delivery, created = (
                    deliver_notification_email(
                        event=event,
                        recipient=recipient,
                        destination=email_destination,
                        fail_silently=True,
                    )
                )

                results[channel] = {
                    "success": (
                        delivery.status
                        == NotificationDeliveryStatus.SENT
                    ),
                    "created": created,
                    "delivery": (
                        serialize_notification_delivery(
                            delivery
                        )
                    ),
                }

            except Exception as exc:
                results[channel] = {
                    "success": False,
                    "error": str(exc),
                }

            continue

        if (
            channel
            == NotificationChannel.WHATSAPP
        ):
            try:
                delivery, created = (
                    deliver_notification_whatsapp(
                        event=event,
                        recipient=recipient,
                        destination=whatsapp_destination,
                        fail_silently=True,
                    )
                )

                results[channel] = {
                    "success": (
                        delivery.status
                        == NotificationDeliveryStatus.SENT
                    ),
                    "created": created,
                    "delivery": (
                        serialize_notification_delivery(
                            delivery
                        )
                    ),
                }

            except Exception as exc:
                results[channel] = {
                    "success": False,
                    "error": str(exc),
                }

            continue

        results[channel] = {
            "success": False,
            "error": (
                "Unsupported notification channel."
            ),
        }

    return results

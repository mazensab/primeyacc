# ============================================================
# 📂 notifications/services.py
# 🧠 PrimeyAcc | Company Notifications Services V1.0
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
# ============================================================
# 📂 notifications/models.py
# 🧠 Mhamcloud | Company Notifications Models V1.0
# ------------------------------------------------------------
# ✅ Company Notification Foundation
# ✅ Tenant-isolated notifications by company
# ✅ Recipient-based read/unread notifications
# ✅ In-app / Email / WhatsApp / System channel foundation
# ✅ Notification source tracking
# ✅ Priority and type support
# ✅ Safe metadata JSON field
# ✅ Audit fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل إشعار مرتبط بشركة واحدة فقط
# - لا يتم عرض إشعارات شركة لشركة أخرى
# - recipient اختياري لدعم إشعارات عامة للشركة لاحقًا
# - الإرسال الفعلي للقنوات الخارجية لا يتم هنا
# - هذا الملف هو طبقة البيانات فقط، والمنطق في services.py
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from companies.models import Company


class NotificationType(models.TextChoices):
    INFO = "INFO", "Info"
    SUCCESS = "SUCCESS", "Success"
    WARNING = "WARNING", "Warning"
    ERROR = "ERROR", "Error"


class NotificationChannel(models.TextChoices):
    IN_APP = "IN_APP", "In App"
    EMAIL = "EMAIL", "Email"
    WHATSAPP = "WHATSAPP", "WhatsApp"
    SYSTEM = "SYSTEM", "System"


class NotificationPriority(models.TextChoices):
    LOW = "LOW", "Low"
    NORMAL = "NORMAL", "Normal"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class CompanyNotification(models.Model):
    """
    Tenant-isolated company notification.

    This model stores internal notifications for company workspace users.
    It can also represent notification records for external channels such as
    WhatsApp or email, but actual delivery should be handled by services.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
        verbose_name="Company",
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_notifications",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Recipient",
        help_text="Optional. Empty means company-wide notification.",
    )

    title = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Title",
    )

    message = models.TextField(
        verbose_name="Message",
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
        db_index=True,
        verbose_name="Notification type",
    )

    channel = models.CharField(
        max_length=30,
        choices=NotificationChannel.choices,
        default=NotificationChannel.IN_APP,
        db_index=True,
        verbose_name="Channel",
    )

    priority = models.CharField(
        max_length=30,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL,
        db_index=True,
        verbose_name="Priority",
    )

    source_type = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Source type",
        help_text="Examples: sales_invoice, purchase_bill, pos_order, treasury_transaction.",
    )

    source_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Source ID",
        help_text="Stores source object ID as string to avoid hard coupling with modules.",
    )

    action_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Action URL",
        help_text="Optional frontend URL related to this notification.",
    )

    is_read = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Read",
    )

    read_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Read at",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadata",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_company_notifications",
        verbose_name="Created by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Company notification"
        verbose_name_plural = "Company notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "recipient", "is_read"]),
            models.Index(fields=["company", "channel", "created_at"]),
            models.Index(fields=["company", "notification_type", "created_at"]),
            models.Index(fields=["company", "priority", "created_at"]),
            models.Index(fields=["company", "source_type", "source_id"]),
        ]

    def __str__(self) -> str:
        recipient = self.recipient.get_username() if self.recipient_id else "Company"
        return f"{self.company.display_name} - {recipient} - {self.title}"

    def mark_as_read(self) -> None:
        """
        Mark notification as read.

        Safe to call multiple times.
        """
        if self.is_read:
            return

        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at", "updated_at"])

    def mark_as_unread(self) -> None:
        """
        Mark notification as unread.
        """
        if not self.is_read and self.read_at is None:
            return

        self.is_read = False
        self.read_at = None
        self.save(update_fields=["is_read", "read_at", "updated_at"])


# ============================================================
# Phase 27 - Notification Event + Delivery Tracking
# ============================================================


class NotificationDeliveryStatus(models.TextChoices):
    """
    Delivery lifecycle is intentionally separate from CompanyNotification.is_read.

    is_read:
        Controls UI read/unread state.

    delivery status:
        Controls whether an external/in-app delivery attempt succeeded.
    """

    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"
    SKIPPED = "SKIPPED", "Skipped"


class NotificationEvent(models.Model):
    """
    One immutable logical application event.

    Examples:
    - payment.confirmed
    - payment.failed
    - subscription.activated
    - subscription.renewed
    - subscription.expiring_soon
    - subscription.grace_started
    - subscription.expired
    - onboarding.ready

    event_key provides idempotency. Replaying the same lifecycle operation
    must not create a second logical event.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="notification_events",
        db_index=True,
        verbose_name="Company",
    )

    event_type = models.CharField(
        max_length=120,
        db_index=True,
        verbose_name="Event type",
    )

    event_key = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Idempotency event key",
    )

    source_type = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Source type",
    )

    source_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Source ID",
    )

    title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Title",
    )

    message = models.TextField(
        blank=True,
        verbose_name="Message",
    )

    action_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Action URL",
    )

    payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Event payload",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_notification_events",
        verbose_name="Created by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )

    class Meta:
        verbose_name = "Notification event"
        verbose_name_plural = "Notification events"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "event_key",
                ],
                name="notify_event_company_key_uniq",
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "event_type", "created_at"],
                name="notify_event_company_type_idx",
            ),
            models.Index(
                fields=["company", "source_type", "source_id"],
                name="notify_evt_co_src_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} - {self.event_key}"


class NotificationDelivery(models.Model):
    """
    One channel delivery attempt for one logical NotificationEvent.

    This model deliberately does not overload CompanyNotification because:
    - CompanyNotification owns UI read/unread state.
    - NotificationDelivery owns transport state.
    """

    event = models.ForeignKey(
        NotificationEvent,
        on_delete=models.CASCADE,
        related_name="deliveries",
        verbose_name="Event",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="notification_deliveries",
        db_index=True,
        verbose_name="Company",
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notification_deliveries",
        verbose_name="Recipient",
    )

    channel = models.CharField(
        max_length=30,
        choices=NotificationChannel.choices,
        db_index=True,
        verbose_name="Channel",
    )

    destination = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Destination",
        help_text="Email address, phone number, or internal recipient identifier.",
    )

    status = models.CharField(
        max_length=30,
        choices=NotificationDeliveryStatus.choices,
        default=NotificationDeliveryStatus.PENDING,
        db_index=True,
        verbose_name="Delivery status",
    )

    attempt_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Attempt count",
    )

    provider = models.CharField(
        max_length=80,
        blank=True,
        db_index=True,
        verbose_name="Provider",
    )

    provider_reference = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Provider reference",
    )

    error_code = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Error code",
    )

    error_message = models.TextField(
        blank=True,
        verbose_name="Error message",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadata",
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Started at",
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Sent at",
    )

    failed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Failed at",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Notification delivery"
        verbose_name_plural = "Notification deliveries"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "event",
                    "channel",
                    "recipient",
                    "destination",
                ],
                condition=models.Q(
                    recipient__isnull=False
                ),
                name="notify_delivery_recipient_uniq",
            ),
            models.UniqueConstraint(
                fields=[
                    "event",
                    "channel",
                    "destination",
                ],
                condition=models.Q(
                    recipient__isnull=True
                ),
                name="notify_delivery_company_uniq",
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status", "created_at"],
                name="notify_del_co_stat_idx",
            ),
            models.Index(
                fields=["event", "channel", "status"],
                name="notify_del_evt_stat_idx",
            ),
            models.Index(
                fields=["channel", "provider_reference"],
                name="notify_del_prov_ref_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.event.event_type} - "
            f"{self.channel} - "
            f"{self.status}"
        )

    def mark_processing(self) -> None:
        self.status = NotificationDeliveryStatus.PROCESSING
        self.attempt_count += 1
        self.started_at = timezone.now()
        self.failed_at = None
        self.error_code = ""
        self.error_message = ""
        self.save(
            update_fields=[
                "status",
                "attempt_count",
                "started_at",
                "failed_at",
                "error_code",
                "error_message",
                "updated_at",
            ]
        )

    def mark_sent(
        self,
        *,
        provider: str = "",
        provider_reference: str = "",
        metadata: dict | None = None,
    ) -> None:
        self.status = NotificationDeliveryStatus.SENT
        self.sent_at = timezone.now()
        self.failed_at = None
        self.error_code = ""
        self.error_message = ""

        if provider:
            self.provider = str(provider).strip()

        if provider_reference:
            self.provider_reference = str(
                provider_reference
            ).strip()

        if metadata is not None:
            self.metadata = metadata

        self.save(
            update_fields=[
                "status",
                "sent_at",
                "failed_at",
                "error_code",
                "error_message",
                "provider",
                "provider_reference",
                "metadata",
                "updated_at",
            ]
        )

    def mark_failed(
        self,
        *,
        error_code: str = "",
        error_message: str = "",
        metadata: dict | None = None,
    ) -> None:
        self.status = NotificationDeliveryStatus.FAILED
        self.failed_at = timezone.now()
        self.error_code = str(error_code or "").strip()
        self.error_message = str(error_message or "").strip()

        if metadata is not None:
            self.metadata = metadata

        self.save(
            update_fields=[
                "status",
                "failed_at",
                "error_code",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

    def mark_skipped(
        self,
        *,
        reason: str = "",
        metadata: dict | None = None,
    ) -> None:
        self.status = NotificationDeliveryStatus.SKIPPED
        self.error_message = str(reason or "").strip()

        if metadata is not None:
            self.metadata = metadata

        self.save(
            update_fields=[
                "status",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

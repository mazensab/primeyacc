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
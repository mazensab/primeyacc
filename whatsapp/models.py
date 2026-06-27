# ============================================================
# 📂 whatsapp/models.py
# 🧠 PrimeyAcc | Company WhatsApp Models V1.0
# ------------------------------------------------------------
# ✅ Company WhatsApp Settings Foundation
# ✅ WhatsApp Templates Foundation
# ✅ WhatsApp Message Log Foundation
# ✅ Tenant-isolated by company
# ✅ Safe provider configuration placeholder
# ✅ No real external sending in this phase
# ✅ Audit fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل إعدادات واتساب مرتبطة بشركة واحدة فقط
# - لا يتم إرسال رسائل فعلية من models.py
# - الإرسال الفعلي لاحقًا يتم من services.py وربط مزود خارجي
# - هذه المرحلة تؤسس البيانات والقوالب والسجل فقط
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from companies.models import Company


class WhatsAppProvider(models.TextChoices):
    MOCK = "MOCK", "Mock"
    WHATSAPP_CLOUD = "WHATSAPP_CLOUD", "WhatsApp Cloud API"
    CUSTOM = "CUSTOM", "Custom Provider"


class WhatsAppTemplateStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class WhatsAppTemplateCategory(models.TextChoices):
    GENERAL = "GENERAL", "General"
    SALES = "SALES", "Sales"
    PURCHASES = "PURCHASES", "Purchases"
    TREASURY = "TREASURY", "Treasury"
    POS = "POS", "POS"
    ACCOUNTING = "ACCOUNTING", "Accounting"
    INVENTORY = "INVENTORY", "Inventory"
    CUSTOMER_SERVICE = "CUSTOMER_SERVICE", "Customer Service"


class WhatsAppMessageDirection(models.TextChoices):
    OUTBOUND = "OUTBOUND", "Outbound"
    INBOUND = "INBOUND", "Inbound"


class WhatsAppMessageStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    QUEUED = "QUEUED", "Queued"
    SENT = "SENT", "Sent"
    DELIVERED = "DELIVERED", "Delivered"
    READ = "READ", "Read"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


class WhatsAppMessageSourceType(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    SALES_INVOICE = "SALES_INVOICE", "Sales Invoice"
    PURCHASE_BILL = "PURCHASE_BILL", "Purchase Bill"
    CUSTOMER_PAYMENT = "CUSTOMER_PAYMENT", "Customer Payment"
    SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "Supplier Payment"
    POS_ORDER = "POS_ORDER", "POS Order"
    POS_RETURN = "POS_RETURN", "POS Return"
    INVENTORY_MOVEMENT = "INVENTORY_MOVEMENT", "Inventory Movement"
    SYSTEM = "SYSTEM", "System"

# ============================================================
# ?? System WhatsApp Connection
# ============================================================
class SystemWhatsAppSessionMode(models.TextChoices):
    QR = "qr", "QR"
    PAIRING_CODE = "pairing_code", "Pairing Code"
class SystemWhatsAppConnectionStatus(models.TextChoices):
    DISCONNECTED = "disconnected", "Disconnected"
    CONNECTING = "connecting", "Connecting"
    QR_PENDING = "qr_pending", "QR Pending"
    PAIR_PENDING = "pair_pending", "Pair Pending"
    CONNECTED = "connected", "Connected"
    RECONNECTING = "reconnecting", "Reconnecting"
    FAILED = "failed", "Failed"
class SystemWhatsAppConnection(models.Model):
    """
    Singleton system-level WhatsApp connection settings.
    This model is separate from CompanyWhatsAppSetting because it represents
    the platform/system support WhatsApp number and session connection.
    """
    provider = models.CharField(
        max_length=50,
        default="WEB_SESSION",
        db_index=True,
        verbose_name="Provider",
    )
    is_enabled = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Enabled",
    )
    is_active = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Active",
    )
    business_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Business name",
    )
    phone_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp phone number",
    )
    phone_number_id = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Phone number ID",
    )
    business_account_id = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Business account ID",
    )
    app_id = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="App ID",
    )
    access_token = models.TextField(
        blank=True,
        verbose_name="Access token",
    )
    webhook_verify_token = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Webhook verify token",
    )
    webhook_callback_url = models.URLField(
        blank=True,
        verbose_name="Webhook callback URL",
    )
    webhook_verified = models.BooleanField(
        default=False,
        verbose_name="Webhook verified",
    )
    api_version = models.CharField(
        max_length=50,
        default="v22.0",
        verbose_name="API version",
    )
    default_language_code = models.CharField(
        max_length=20,
        default="ar",
        verbose_name="Default language code",
    )
    default_country_code = models.CharField(
        max_length=10,
        default="+966",
        verbose_name="Default country code",
    )
    allow_broadcasts = models.BooleanField(
        default=True,
        verbose_name="Allow broadcasts",
    )
    send_test_enabled = models.BooleanField(
        default=True,
        verbose_name="Send test enabled",
    )
    default_test_recipient = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Default test recipient",
    )
    session_name = models.CharField(
        max_length=150,
        default="primeyacc-system-session",
        db_index=True,
        verbose_name="Session name",
    )
    session_mode = models.CharField(
        max_length=30,
        choices=SystemWhatsAppSessionMode.choices,
        default=SystemWhatsAppSessionMode.QR,
        verbose_name="Session mode",
    )
    session_status = models.CharField(
        max_length=30,
        choices=SystemWhatsAppConnectionStatus.choices,
        default=SystemWhatsAppConnectionStatus.DISCONNECTED,
        db_index=True,
        verbose_name="Session status",
    )
    session_connected_phone = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Connected phone",
    )
    session_device_label = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Device label",
    )
    session_last_connected_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Last connected at",
    )
    session_qr_code = models.TextField(
        blank=True,
        verbose_name="QR code",
    )
    session_pairing_code = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Pairing code",
    )
    last_health_check_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Last health check at",
    )
    last_error_message = models.TextField(
        blank=True,
        verbose_name="Last error message",
    )
    provider_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Provider config",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_system_whatsapp_connections",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_system_whatsapp_connections",
        verbose_name="Updated by",
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
        verbose_name = "System WhatsApp connection"
        verbose_name_plural = "System WhatsApp connections"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_enabled", "is_active"]),
            models.Index(fields=["session_status"]),
            models.Index(fields=["session_name"]),
        ]
    def __str__(self) -> str:
        return f"System WhatsApp - {self.session_status}"
    @property
    def is_connected(self) -> bool:
        return self.session_status == SystemWhatsAppConnectionStatus.CONNECTED


class CompanyWhatsAppSetting(models.Model):
    """
    Tenant-isolated WhatsApp settings for one company.

    This model stores provider configuration placeholders.
    Real credentials should be encrypted or moved to a secrets manager later
    before enabling real external sending.
    """

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="whatsapp_setting",
        verbose_name="Company",
    )

    is_enabled = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Enabled",
    )

    provider = models.CharField(
        max_length=50,
        choices=WhatsAppProvider.choices,
        default=WhatsAppProvider.MOCK,
        db_index=True,
        verbose_name="Provider",
    )

    phone_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp phone number",
    )

    phone_number_id = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Phone number ID",
        help_text="Used by WhatsApp Cloud API when enabled later.",
    )

    business_account_id = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Business account ID",
    )

    access_token = models.TextField(
        blank=True,
        verbose_name="Access token",
        help_text="Foundation only. Encrypt or move to secrets manager before production use.",
    )

    webhook_verify_token = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Webhook verify token",
    )

    default_country_code = models.CharField(
        max_length=10,
        default="+966",
        verbose_name="Default country code",
    )

    send_invoice_notifications = models.BooleanField(
        default=True,
        verbose_name="Send invoice notifications",
    )

    send_payment_notifications = models.BooleanField(
        default=True,
        verbose_name="Send payment notifications",
    )

    send_pos_notifications = models.BooleanField(
        default=True,
        verbose_name="Send POS notifications",
    )

    send_system_notifications = models.BooleanField(
        default=True,
        verbose_name="Send system notifications",
    )

    provider_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Provider config",
    )

    last_verified_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Last verified at",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_whatsapp_settings",
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_whatsapp_settings",
        verbose_name="Updated by",
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
        verbose_name = "Company WhatsApp setting"
        verbose_name_plural = "Company WhatsApp settings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_enabled", "provider"]),
            models.Index(fields=["phone_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.company.display_name} - WhatsApp Settings"

    def mark_verified(self) -> None:
        """
        Mark the WhatsApp configuration as verified.
        """
        self.last_verified_at = timezone.now()
        self.save(update_fields=["last_verified_at", "updated_at"])


class WhatsAppTemplate(models.Model):
    """
    Company WhatsApp message template.

    Templates are tenant-isolated and can be used later by services to render
    outgoing WhatsApp messages.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="whatsapp_templates",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Template name",
    )

    code = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Template code",
        help_text="Unique per company.",
    )

    category = models.CharField(
        max_length=50,
        choices=WhatsAppTemplateCategory.choices,
        default=WhatsAppTemplateCategory.GENERAL,
        db_index=True,
        verbose_name="Category",
    )

    status = models.CharField(
        max_length=30,
        choices=WhatsAppTemplateStatus.choices,
        default=WhatsAppTemplateStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    language = models.CharField(
        max_length=20,
        default="ar",
        db_index=True,
        verbose_name="Language",
    )

    body = models.TextField(
        verbose_name="Template body",
        help_text="Supports placeholders such as {{customer_name}} and {{invoice_number}}.",
    )

    footer = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Footer",
    )

    external_template_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="External template name",
        help_text="Used later if approved provider templates are required.",
    )

    variables = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Variables",
        help_text="List of placeholders expected by this template.",
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
        related_name="created_whatsapp_templates",
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_whatsapp_templates",
        verbose_name="Updated by",
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
        verbose_name = "WhatsApp template"
        verbose_name_plural = "WhatsApp templates"
        ordering = ["company", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_whatsapp_template_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "category"]),
            models.Index(fields=["company", "language"]),
            models.Index(fields=["company", "code"]),
        ]

    def __str__(self) -> str:
        return f"{self.company.display_name} - {self.name}"

    @property
    def is_active(self) -> bool:
        return self.status == WhatsAppTemplateStatus.ACTIVE

    def activate(self, user=None) -> None:
        self.status = WhatsAppTemplateStatus.ACTIVE
        if user:
            self.updated_by = user
        self.save(update_fields=["status", "updated_by", "updated_at"])

    def deactivate(self, user=None) -> None:
        self.status = WhatsAppTemplateStatus.INACTIVE
        if user:
            self.updated_by = user
        self.save(update_fields=["status", "updated_by", "updated_at"])

    def archive(self, user=None) -> None:
        self.status = WhatsAppTemplateStatus.ARCHIVED
        if user:
            self.updated_by = user
        self.save(update_fields=["status", "updated_by", "updated_at"])


class WhatsAppMessageLog(models.Model):
    """
    WhatsApp message log.

    Stores outbound/inbound records for audit and future provider integration.
    In Phase 14, sending can be mocked safely through services.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="whatsapp_message_logs",
        db_index=True,
        verbose_name="Company",
    )

    template = models.ForeignKey(
        WhatsAppTemplate,
        on_delete=models.SET_NULL,
        related_name="message_logs",
        blank=True,
        null=True,
        verbose_name="Template",
    )

    direction = models.CharField(
        max_length=30,
        choices=WhatsAppMessageDirection.choices,
        default=WhatsAppMessageDirection.OUTBOUND,
        db_index=True,
        verbose_name="Direction",
    )

    status = models.CharField(
        max_length=30,
        choices=WhatsAppMessageStatus.choices,
        default=WhatsAppMessageStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    source_type = models.CharField(
        max_length=50,
        choices=WhatsAppMessageSourceType.choices,
        default=WhatsAppMessageSourceType.MANUAL,
        db_index=True,
        verbose_name="Source type",
    )

    source_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Source ID",
    )

    recipient_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Recipient name",
    )

    recipient_phone = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Recipient phone",
    )

    message_body = models.TextField(
        verbose_name="Message body",
    )

    rendered_variables = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Rendered variables",
    )

    provider = models.CharField(
        max_length=50,
        choices=WhatsAppProvider.choices,
        default=WhatsAppProvider.MOCK,
        db_index=True,
        verbose_name="Provider",
    )

    provider_message_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Provider message ID",
    )

    provider_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Provider response",
    )

    error_message = models.TextField(
        blank=True,
        verbose_name="Error message",
    )

    queued_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Queued at",
    )

    sent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Sent at",
    )

    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Delivered at",
    )

    read_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Read at",
    )

    failed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Failed at",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_whatsapp_message_logs",
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
        verbose_name = "WhatsApp message log"
        verbose_name_plural = "WhatsApp message logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "status", "created_at"]),
            models.Index(fields=["company", "direction", "created_at"]),
            models.Index(fields=["company", "source_type", "source_id"]),
            models.Index(fields=["company", "recipient_phone"]),
            models.Index(fields=["company", "provider", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.company.display_name} - {self.recipient_phone} - {self.status}"

    def mark_queued(self) -> None:
        now = timezone.now()
        self.status = WhatsAppMessageStatus.QUEUED
        self.queued_at = now
        self.save(update_fields=["status", "queued_at", "updated_at"])

    def mark_sent(
        self,
        *,
        provider_message_id: str = "",
        provider_response: dict | None = None,
    ) -> None:
        now = timezone.now()
        self.status = WhatsAppMessageStatus.SENT
        self.sent_at = now

        if provider_message_id:
            self.provider_message_id = provider_message_id

        if provider_response is not None:
            self.provider_response = provider_response

        self.save(
            update_fields=[
                "status",
                "sent_at",
                "provider_message_id",
                "provider_response",
                "updated_at",
            ]
        )

    def mark_delivered(self) -> None:
        self.status = WhatsAppMessageStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=["status", "delivered_at", "updated_at"])

    def mark_read(self) -> None:
        self.status = WhatsAppMessageStatus.READ
        self.read_at = timezone.now()
        self.save(update_fields=["status", "read_at", "updated_at"])

    def mark_failed(self, error_message: str = "") -> None:
        self.status = WhatsAppMessageStatus.FAILED
        self.failed_at = timezone.now()
        self.error_message = error_message or ""
        self.save(
            update_fields=[
                "status",
                "failed_at",
                "error_message",
                "updated_at",
            ]
        )

class WhatsAppInboxScope(models.TextChoices):
    SYSTEM = "SYSTEM", "System"
    COMPANY = "COMPANY", "Company"
class WhatsAppConversationStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"
    ARCHIVED = "ARCHIVED", "Archived"
    SPAM = "SPAM", "Spam"
class WhatsAppConversationMessageStatus(models.TextChoices):
    RECEIVED = "RECEIVED", "Received"
    QUEUED = "QUEUED", "Queued"
    SENT = "SENT", "Sent"
    DELIVERED = "DELIVERED", "Delivered"
    READ = "READ", "Read"
    FAILED = "FAILED", "Failed"
class WhatsAppConversationMessageType(models.TextChoices):
    TEXT = "TEXT", "Text"
    IMAGE = "IMAGE", "Image"
    AUDIO = "AUDIO", "Audio"
    VIDEO = "VIDEO", "Video"
    DOCUMENT = "DOCUMENT", "Document"
    STICKER = "STICKER", "Sticker"
    LOCATION = "LOCATION", "Location"
    CONTACT = "CONTACT", "Contact"
    UNKNOWN = "UNKNOWN", "Unknown"
class WhatsAppWebhookEventStatus(models.TextChoices):
    RECEIVED = "RECEIVED", "Received"
    PROCESSED = "PROCESSED", "Processed"
    FAILED = "FAILED", "Failed"
    IGNORED = "IGNORED", "Ignored"
class WhatsAppContact(models.Model):
    """
    WhatsApp contact identity for system/company inbox conversations.
    """
    scope = models.CharField(
        max_length=30,
        choices=WhatsAppInboxScope.choices,
        default=WhatsAppInboxScope.SYSTEM,
        db_index=True,
        verbose_name="Inbox scope",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="whatsapp_inbox_contacts",
        verbose_name="Company",
    )
    session_name = models.CharField(
        max_length=120,
        default="primeyacc-system-session",
        db_index=True,
        verbose_name="Session name",
    )
    phone_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Phone number",
    )
    normalized_phone = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Normalized phone",
    )
    whatsapp_jid = models.CharField(
        max_length=180,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp JID",
    )
    display_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Display name",
    )
    push_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="WhatsApp push name",
    )
    last_seen_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Last seen at",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadata",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )
    class Meta:
        verbose_name = "WhatsApp contact"
        verbose_name_plural = "WhatsApp contacts"
        indexes = [
            models.Index(fields=["scope", "session_name", "normalized_phone"]),
            models.Index(fields=["scope", "company", "updated_at"]),
        ]
    def __str__(self) -> str:
        return self.display_name or self.push_name or self.normalized_phone or self.whatsapp_jid or f"WhatsApp contact #{self.pk}"
class WhatsAppConversation(models.Model):
    """
    Inbox conversation linked to a WhatsApp contact.
    """
    scope = models.CharField(
        max_length=30,
        choices=WhatsAppInboxScope.choices,
        default=WhatsAppInboxScope.SYSTEM,
        db_index=True,
        verbose_name="Inbox scope",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="whatsapp_inbox_conversations",
        verbose_name="Company",
    )
    contact = models.ForeignKey(
        WhatsAppContact,
        on_delete=models.CASCADE,
        related_name="conversations",
        verbose_name="Contact",
    )
    session_name = models.CharField(
        max_length=120,
        default="primeyacc-system-session",
        db_index=True,
        verbose_name="Session name",
    )
    status = models.CharField(
        max_length=30,
        choices=WhatsAppConversationStatus.choices,
        default=WhatsAppConversationStatus.OPEN,
        db_index=True,
        verbose_name="Status",
    )
    is_pinned = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Pinned",
    )
    is_resolved = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Resolved",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_whatsapp_conversations",
        verbose_name="Assigned to",
    )
    last_message_preview = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Last message preview",
    )
    last_message_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Last message at",
    )
    unread_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Unread count",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadata",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )
    class Meta:
        verbose_name = "WhatsApp conversation"
        verbose_name_plural = "WhatsApp conversations"
        indexes = [
            models.Index(fields=["scope", "session_name", "status", "last_message_at"]),
            models.Index(fields=["scope", "is_pinned", "last_message_at"]),
            models.Index(fields=["scope", "is_resolved", "last_message_at"]),
        ]
    def __str__(self) -> str:
        return f"{self.contact} — {self.status}"
class WhatsAppConversationMessage(models.Model):
    """
    Message stored inside a WhatsApp inbox conversation.
    """
    conversation = models.ForeignKey(
        WhatsAppConversation,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Conversation",
    )
    contact = models.ForeignKey(
        WhatsAppContact,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Contact",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="whatsapp_inbox_messages",
        verbose_name="Company",
    )
    scope = models.CharField(
        max_length=30,
        choices=WhatsAppInboxScope.choices,
        default=WhatsAppInboxScope.SYSTEM,
        db_index=True,
        verbose_name="Inbox scope",
    )
    session_name = models.CharField(
        max_length=120,
        default="primeyacc-system-session",
        db_index=True,
        verbose_name="Session name",
    )
    direction = models.CharField(
        max_length=30,
        choices=WhatsAppMessageDirection.choices,
        default=WhatsAppMessageDirection.INBOUND,
        db_index=True,
        verbose_name="Direction",
    )
    status = models.CharField(
        max_length=30,
        choices=WhatsAppConversationMessageStatus.choices,
        default=WhatsAppConversationMessageStatus.RECEIVED,
        db_index=True,
        verbose_name="Status",
    )
    message_type = models.CharField(
        max_length=30,
        choices=WhatsAppConversationMessageType.choices,
        default=WhatsAppConversationMessageType.TEXT,
        db_index=True,
        verbose_name="Message type",
    )
    body = models.TextField(
        blank=True,
        verbose_name="Body",
    )
    external_message_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="External message ID",
    )
    provider = models.CharField(
        max_length=80,
        default="WHATSAPP_GATEWAY",
        verbose_name="Provider",
    )
    provider_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Provider response",
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_whatsapp_inbox_messages",
        verbose_name="Sent by",
    )
    received_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Received at",
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Sent at",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadata",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )
    class Meta:
        verbose_name = "WhatsApp conversation message"
        verbose_name_plural = "WhatsApp conversation messages"
        indexes = [
            models.Index(fields=["scope", "session_name", "direction", "created_at"]),
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["external_message_id"]),
        ]
    def __str__(self) -> str:
        return f"{self.direction} {self.status} — {self.body[:60]}"
class WhatsAppWebhookEvent(models.Model):
    """
    Raw incoming gateway webhook event for idempotency and audit.
    """
    event_uid = models.CharField(
        max_length=255,
        unique=True,
        verbose_name="Event UID",
    )
    session_name = models.CharField(
        max_length=120,
        default="primeyacc-system-session",
        db_index=True,
        verbose_name="Session name",
    )
    event_type = models.CharField(
        max_length=80,
        default="message.incoming",
        db_index=True,
        verbose_name="Event type",
    )
    status = models.CharField(
        max_length=30,
        choices=WhatsAppWebhookEventStatus.choices,
        default=WhatsAppWebhookEventStatus.RECEIVED,
        db_index=True,
        verbose_name="Status",
    )
    external_message_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="External message ID",
    )
    payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Payload",
    )
    error_message = models.TextField(
        blank=True,
        verbose_name="Error message",
    )
    received_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Received at",
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Processed at",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created at",
    )
    class Meta:
        verbose_name = "WhatsApp webhook event"
        verbose_name_plural = "WhatsApp webhook events"
        indexes = [
            models.Index(fields=["session_name", "status", "created_at"]),
            models.Index(fields=["external_message_id"]),
        ]
    def __str__(self) -> str:
        return f"{self.event_type} — {self.status} — {self.event_uid}"

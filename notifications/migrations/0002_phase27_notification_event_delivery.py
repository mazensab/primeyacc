from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
        migrations.swappable_dependency(
            settings.AUTH_USER_MODEL
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        db_index=True,
                        max_length=120,
                        verbose_name="Event type",
                    ),
                ),
                (
                    "event_key",
                    models.CharField(
                        db_index=True,
                        max_length=255,
                        verbose_name="Idempotency event key",
                    ),
                ),
                (
                    "source_type",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=100,
                        verbose_name="Source type",
                    ),
                ),
                (
                    "source_id",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=100,
                        verbose_name="Source ID",
                    ),
                ),
                (
                    "title",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        verbose_name="Title",
                    ),
                ),
                (
                    "message",
                    models.TextField(
                        blank=True,
                        verbose_name="Message",
                    ),
                ),
                (
                    "action_url",
                    models.CharField(
                        blank=True,
                        max_length=500,
                        verbose_name="Action URL",
                    ),
                ),
                (
                    "payload",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        verbose_name="Event payload",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        db_index=True,
                        verbose_name="Created at",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=(
                            django.db.models.deletion.CASCADE
                        ),
                        related_name="notification_events",
                        to="companies.company",
                        verbose_name="Company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=(
                            django.db.models.deletion.SET_NULL
                        ),
                        related_name=(
                            "created_notification_events"
                        ),
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created by",
                    ),
                ),
            ],
            options={
                "verbose_name": "Notification event",
                "verbose_name_plural": (
                    "Notification events"
                ),
                "ordering": [
                    "-created_at",
                    "-id",
                ],
            },
        ),
        migrations.CreateModel(
            name="NotificationDelivery",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "channel",
                    models.CharField(
                        choices=[
                            ("IN_APP", "In App"),
                            ("EMAIL", "Email"),
                            ("WHATSAPP", "WhatsApp"),
                            ("SYSTEM", "System"),
                        ],
                        db_index=True,
                        max_length=30,
                        verbose_name="Channel",
                    ),
                ),
                (
                    "destination",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        help_text=(
                            "Email address, phone number, "
                            "or internal recipient identifier."
                        ),
                        max_length=255,
                        verbose_name="Destination",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("PROCESSING", "Processing"),
                            ("SENT", "Sent"),
                            ("FAILED", "Failed"),
                            ("SKIPPED", "Skipped"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=30,
                        verbose_name="Delivery status",
                    ),
                ),
                (
                    "attempt_count",
                    models.PositiveIntegerField(
                        default=0,
                        verbose_name="Attempt count",
                    ),
                ),
                (
                    "provider",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=80,
                        verbose_name="Provider",
                    ),
                ),
                (
                    "provider_reference",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=255,
                        verbose_name="Provider reference",
                    ),
                ),
                (
                    "error_code",
                    models.CharField(
                        blank=True,
                        max_length=100,
                        verbose_name="Error code",
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True,
                        verbose_name="Error message",
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        verbose_name="Metadata",
                    ),
                ),
                (
                    "started_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="Started at",
                    ),
                ),
                (
                    "sent_at",
                    models.DateTimeField(
                        blank=True,
                        db_index=True,
                        null=True,
                        verbose_name="Sent at",
                    ),
                ),
                (
                    "failed_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="Failed at",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        db_index=True,
                        verbose_name="Created at",
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True,
                        verbose_name="Updated at",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=(
                            django.db.models.deletion.CASCADE
                        ),
                        related_name=(
                            "notification_deliveries"
                        ),
                        to="companies.company",
                        verbose_name="Company",
                    ),
                ),
                (
                    "event",
                    models.ForeignKey(
                        on_delete=(
                            django.db.models.deletion.CASCADE
                        ),
                        related_name="deliveries",
                        to="notifications.notificationevent",
                        verbose_name="Event",
                    ),
                ),
                (
                    "recipient",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=(
                            django.db.models.deletion.SET_NULL
                        ),
                        related_name=(
                            "notification_deliveries"
                        ),
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Recipient",
                    ),
                ),
            ],
            options={
                "verbose_name": "Notification delivery",
                "verbose_name_plural": (
                    "Notification deliveries"
                ),
                "ordering": [
                    "-created_at",
                    "-id",
                ],
            },
        ),
        migrations.AddIndex(
            model_name="notificationevent",
            index=models.Index(
                fields=[
                    "company",
                    "event_type",
                    "created_at",
                ],
                name="notify_event_company_type_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="notificationevent",
            index=models.Index(
                fields=[
                    "company",
                    "source_type",
                    "source_id",
                ],
                name="notify_evt_co_src_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="notificationevent",
            constraint=models.UniqueConstraint(
                fields=(
                    "company",
                    "event_key",
                ),
                name="notify_event_company_key_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="notificationdelivery",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("recipient__isnull", False)
                ),
                fields=(
                    "event",
                    "channel",
                    "recipient",
                    "destination",
                ),
                name="notify_delivery_recipient_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="notificationdelivery",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("recipient__isnull", True)
                ),
                fields=(
                    "event",
                    "channel",
                    "destination",
                ),
                name="notify_delivery_company_uniq",
            ),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(
                fields=[
                    "company",
                    "status",
                    "created_at",
                ],
                name="notify_del_co_stat_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(
                fields=[
                    "event",
                    "channel",
                    "status",
                ],
                name="notify_del_evt_stat_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(
                fields=[
                    "channel",
                    "provider_reference",
                ],
                name="notify_del_prov_ref_idx",
            ),
        ),
    ]

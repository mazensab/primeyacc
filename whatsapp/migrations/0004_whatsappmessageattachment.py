from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("whatsapp", "0003_whatsappcontact_whatsappconversation_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppMessageAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("attachment_type", models.CharField(db_index=True, max_length=30)),
                ("file", models.FileField(upload_to="whatsapp/inbox/%Y/%m/%d/")),
                ("original_filename", models.CharField(blank=True, max_length=255)),
                ("mime_type", models.CharField(blank=True, db_index=True, max_length=150)),
                ("file_size", models.PositiveBigIntegerField(default=0)),
                ("width", models.PositiveIntegerField(blank=True, null=True)),
                ("height", models.PositiveIntegerField(blank=True, null=True)),
                ("duration_ms", models.PositiveBigIntegerField(blank=True, null=True)),
                ("provider_media_id", models.CharField(blank=True, db_index=True, max_length=255)),
                ("sha256", models.CharField(blank=True, db_index=True, max_length=64)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="whatsapp.whatsappconversationmessage", verbose_name="Message")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.AddIndex(
            model_name="whatsappmessageattachment",
            index=models.Index(fields=["message", "attachment_type"], name="whatsapp_wh_message_011fe2_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessageattachment",
            index=models.Index(fields=["sha256"], name="whatsapp_wh_sha256_e79261_idx"),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("whatsapp", "0004_whatsappmessageattachment"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsappconversationmessage",
            name="reply_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="replies",
                to="whatsapp.whatsappconversationmessage",
                verbose_name="Reply to message",
            ),
        ),
    ]

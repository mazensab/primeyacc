from django.apps import AppConfig


class WhatsappConfig(AppConfig):
    name = "whatsapp"

    def ready(self) -> None:
        from django.db.models.signals import post_migrate

        from whatsapp.bootstrap import seed_system_templates_after_migrate

        post_migrate.connect(
            seed_system_templates_after_migrate,
            sender=self,
            dispatch_uid="primey.whatsapp.seed_system_templates_after_migrate",
            weak=False,
        )

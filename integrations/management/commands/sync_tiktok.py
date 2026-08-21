from django.core.management.base import BaseCommand, CommandError

from integrations.models import TikTokConnection
from integrations.tiktok_service import sync_tiktok_account


class Command(BaseCommand):
    help = "Synchronize active TikTok connections."

    def handle(self, *args, **options):
        connections = TikTokConnection.objects.filter(
            is_active=True
        ).order_by("id")

        if not connections.exists():
            raise CommandError(
                "No active TikTok connection found."
            )

        failed = False

        for connection in connections:
            try:
                result = sync_tiktok_account(connection)

                self.stdout.write(
                    self.style.SUCCESS(
                        f"TikTok {connection.pk}: {result}"
                    )
                )

            except Exception as exc:
                failed = True

                self.stderr.write(
                    self.style.ERROR(
                        f"TikTok {connection.pk}: {exc}"
                    )
                )

        if failed:
            raise CommandError(
                "One or more TikTok syncs failed."
            )
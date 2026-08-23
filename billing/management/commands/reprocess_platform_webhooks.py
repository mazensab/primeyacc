from __future__ import annotations

from django.core.management.base import BaseCommand

from billing.webhook_services import (
    due_platform_webhook_events,
)
from integrations.payments.platform_webhooks import (
    reprocess_platform_webhook_event,
)


class Command(BaseCommand):
    help = (
        "Safely reprocess due Mhamcloud platform subscription "
        "payment webhook events."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
        )

        parser.add_argument(
            "--event-id",
            type=int,
            default=None,
        )

        parser.add_argument(
            "--force",
            action="store_true",
        )

    def handle(self, *args, **options):
        event_id = options.get(
            "event_id"
        )

        force = bool(
            options.get("force")
        )

        if event_id:
            event_ids = [event_id]
        else:
            event_ids = list(
                due_platform_webhook_events(
                    limit=options.get(
                        "limit"
                    )
                    or 100,
                ).values_list(
                    "id",
                    flat=True,
                )
            )

        processed = 0
        failed = 0

        for current_id in event_ids:
            try:
                result = (
                    reprocess_platform_webhook_event(
                        event_id=current_id,
                        force=force,
                    )
                )

                processed += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        "Webhook event "
                        f"{current_id} processed "
                        f"for payment "
                        f"{result.payment_id}."
                    )
                )

            except Exception as exc:
                failed += 1

                self.stderr.write(
                    self.style.WARNING(
                        "Webhook event "
                        f"{current_id} was not processed: "
                        f"{exc.__class__.__name__}"
                    )
                )

        self.stdout.write(
            (
                "platform_webhook_reprocess "
                f"selected={len(event_ids)} "
                f"processed={processed} "
                f"failed={failed}"
            )
        )

from __future__ import annotations

from datetime import date

from django.core.management.base import (
    BaseCommand,
    CommandError,
)

from subscriptions.lifecycle import (
    process_subscription_lifecycle,
)


class Command(BaseCommand):
    help = (
        "Process Mhamcloud subscription lifecycle transitions. "
        "TRIAL expires after end_date. ACTIVE expires after "
        "the configured grace period."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview transitions without modifying the database.",
        )
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Process only one company.",
        )
        parser.add_argument(
            "--date",
            dest="process_date",
            default="",
            help=(
                "Override processing date in YYYY-MM-DD format. "
                "Intended for controlled testing."
            ),
        )

    def handle(self, *args, **options):
        process_date = None
        raw_date = str(
            options.get("process_date") or ""
        ).strip()

        if raw_date:
            try:
                process_date = date.fromisoformat(raw_date)
            except ValueError as exc:
                raise CommandError(
                    "--date must use YYYY-MM-DD."
                ) from exc

        company_id = options.get("company_id")
        dry_run = bool(options.get("dry_run"))

        result = process_subscription_lifecycle(
            today=process_date,
            company_id=company_id,
            dry_run=dry_run,
        )

        mode = "DRY_RUN" if dry_run else "APPLY"

        self.stdout.write(
            f"MODE={mode}"
        )
        self.stdout.write(
            f"EVALUATED={result.evaluated}"
        )
        self.stdout.write(
            f"WOULD_CHANGE={result.would_change}"
        )
        self.stdout.write(
            f"CHANGED={result.changed}"
        )
        self.stdout.write(
            f"UNCHANGED={result.unchanged}"
        )

        for action in result.actions:
            self.stdout.write(
                "ACTION "
                f"subscription_id={action.subscription_id} "
                f"company_id={action.company_id} "
                f"from={action.from_status} "
                f"to={action.to_status} "
                f"reason={action.reason} "
                f"end_date={action.end_date.isoformat()}"
            )

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    "SUBSCRIPTION_LIFECYCLE_DRY_RUN=PASS"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "SUBSCRIPTION_LIFECYCLE_PROCESSING=PASS"
                )
            )

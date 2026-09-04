from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from integrations.mham_legacy.sync_engine import (
    run_full_background_cycle,
    sync_business_ids,
)


class Command(BaseCommand):
    help = (
        "Synchronize MhamCloud V1 into Primey during the PRE-CUTOVER window. "
        "MhamCloud stays read-only; only changed Primey tenants are replaced."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--business-id",
            action="append",
            dest="business_ids",
            default=[],
        )
        parser.add_argument("--all-eligible", action="store_true")
        parser.add_argument("--scan-only", action="store_true")

    def handle(self, *args, **options):
        business_ids = [
            str(value).strip()
            for value in options["business_ids"]
            if str(value).strip()
        ]

        if options["all_eligible"]:
            result = run_full_background_cycle(
                scan_only=options["scan_only"]
            )
        elif business_ids:
            result = sync_business_ids(
                business_ids,
                scan_only=options["scan_only"],
            )
        else:
            raise CommandError(
                "Provide --business-id or --all-eligible."
            )

        self.stdout.write(
            f"SYNC_REQUESTED={result['requested_business_count']} "
            f"SYNC_CHANGED={result['changed_business_count']} "
            f"SYNC_FAILURES={result['failure_count']}"
        )

        if result["failure_count"]:
            raise CommandError(
                "Mham legacy sync completed with failures."
            )

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from integrations.mham_legacy.management import now_iso, safe_error, update_run
from integrations.mham_legacy.sync_engine import run_full_background_cycle, sync_business_ids


class Command(BaseCommand):
    help = "Phase 52 local management wrapper around the frozen MhamCloud Phase 51 sync engine."

    def add_arguments(self, parser):
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--trigger", default="COMMAND")
        parser.add_argument("--business-id", action="append", dest="business_ids", default=[])
        parser.add_argument("--all-eligible", action="store_true")
        parser.add_argument("--scan-only", action="store_true")

    def handle(self, *args, **options):
        run_id = str(options["run_id"])
        business_ids = [str(v).strip() for v in options["business_ids"] if str(v).strip()]
        update_run(run_id, status="RUNNING", started_at=now_iso())

        try:
            if options["all_eligible"]:
                result = run_full_background_cycle(scan_only=options["scan_only"])
            elif business_ids:
                result = sync_business_ids(business_ids, scan_only=options["scan_only"])
            else:
                raise CommandError("Provide --business-id or --all-eligible.")

            rows = result.get("results") if isinstance(result.get("results"), list) else []
            applied = sum(isinstance(x, dict) and str(x.get("status", "")).upper() == "APPLIED" for x in rows)
            unchanged = sum(isinstance(x, dict) and str(x.get("status", "")).upper() == "UNCHANGED" for x in rows)
            failures = int(result.get("failure_count") or 0)

            update_run(
                run_id,
                status="SUCCESS" if failures == 0 else "PARTIAL",
                completed_at=now_iso(),
                requested_count=int(result.get("requested_business_count") or len(rows)),
                changed_count=int(result.get("changed_business_count") or 0),
                applied_count=applied,
                unchanged_count=unchanged,
                failure_count=failures,
                safe_error_message=safe_error("; ".join(f"{k}: {v}" for k, v in (result.get("failures") or {}).items())),
            )

            self.stdout.write(
                f"SYNC_REQUESTED={result['requested_business_count']} "
                f"SYNC_CHANGED={result['changed_business_count']} "
                f"SYNC_FAILURES={result['failure_count']}"
            )

            if failures:
                raise CommandError("Mham legacy sync completed with failures.")
        except Exception as exc:
            update_run(run_id, status="FAILED", completed_at=now_iso(), safe_error_message=safe_error(f"{type(exc).__name__}: {exc}"))
            raise

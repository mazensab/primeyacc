# ============================================================
# 📂 release_readiness/management/commands/check_release_readiness.py
# 🧠 PrimeyAcc | Release Readiness Management Command v1
# ============================================================
# ✅ Prints backend release readiness summary
# ✅ Can fail CI only when hard blockers exist
# ✅ Read-only command
# ============================================================

from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError

from release_readiness.services import build_release_readiness_payload


class Command(BaseCommand):
    help = "Check PrimeyAcc backend release readiness and API contract registry."

    def add_arguments(self, parser):
        parser.add_argument(
            "--json",
            action="store_true",
            help="Print full JSON payload.",
        )
        parser.add_argument(
            "--fail-on-warning",
            action="store_true",
            help="Treat warnings as command failure.",
        )

    def handle(self, *args, **options):
        payload = build_release_readiness_payload()
        data = payload["data"]
        status = data["status"]

        if options["json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            self.stdout.write(self.style.SUCCESS("PrimeyAcc Phase 27 Release Readiness"))
            self.stdout.write(f"Status: {status}")
            self.stdout.write(f"Contracts: {data['summary']['contracts_count']}")
            self.stdout.write(f"Checks: {data['summary']['checks_count']}")
            self.stdout.write(f"Failed: {data['summary']['failed_count']}")
            self.stdout.write(f"Warnings: {data['summary']['warning_count']}")

            for check in data["checks"]:
                self.stdout.write(
                    f"- [{check['status']}] {check['label']}: {check['message']}"
                )

        if status == "blocked":
            raise CommandError("Release readiness is blocked.")

        if status == "ready_with_warnings" and options["fail_on_warning"]:
            raise CommandError("Release readiness has warnings.")

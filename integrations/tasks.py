from __future__ import annotations

from integrations.mham_legacy.sync_engine import run_management_sync


def run_mham_legacy_background_sync() -> dict:
    """Scheduler-friendly post-cutover-aware MhamCloud synchronization entry point."""
    return run_management_sync(all_eligible=True, scan_only=False)

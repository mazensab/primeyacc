from __future__ import annotations

from integrations.mham_legacy.sync_engine import run_full_background_cycle


def run_mham_legacy_background_sync() -> dict:
    """Scheduler-friendly PRE-CUTOVER MhamCloud synchronization entry point."""
    return run_full_background_cycle(scan_only=False)

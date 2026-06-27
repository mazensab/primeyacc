#!/usr/bin/env python
"""Django's command-line utility for administrative tasks.
PrimeyAcc local development note:
- When running `python manage.py runserver`, the persistent WhatsApp Session
  Gateway is started first through scripts/start-primeyacc-whatsapp-gateway.ps1.
- This hook is limited to runserver only. It does not run during tests,
  migrations, checks, shell, or other management commands.
"""
import os
import subprocess
import sys
from pathlib import Path
def _primeyacc_should_start_whatsapp_gateway() -> bool:
    """Return True only for local runserver startup."""
    if os.environ.get("PRIMEYACC_SKIP_WHATSAPP_GATEWAY_AUTOSTART") == "1":
        return False
    if os.environ.get("PRIMEYACC_WHATSAPP_GATEWAY_STARTED_BY_MANAGE") == "1":
        return False
    commands = set(sys.argv[1:])
    if "runserver" not in commands:
        return False
    return True
def _primeyacc_start_whatsapp_gateway() -> None:
    """Start the local WhatsApp Session Gateway before Django runserver."""
    root = Path(__file__).resolve().parent
    launcher = root / "scripts" / "start-primeyacc-whatsapp-gateway.ps1"
    if not launcher.exists():
        print(
            f"[PrimeyAcc] WhatsApp gateway launcher not found: {launcher}",
            file=sys.stderr,
        )
        return
    powershell = "powershell.exe" if os.name == "nt" else "pwsh"
    print("[PrimeyAcc] Starting WhatsApp Gateway before Django runserver...")
    try:
        subprocess.run(
            [
                powershell,
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(launcher),
            ],
            cwd=str(root),
            check=False,
            timeout=25,
        )
        os.environ["PRIMEYACC_WHATSAPP_GATEWAY_STARTED_BY_MANAGE"] = "1"
    except Exception as exc:
        print(
            f"[PrimeyAcc] WhatsApp Gateway autostart warning: {exc}",
            file=sys.stderr,
        )
def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    if _primeyacc_should_start_whatsapp_gateway():
        _primeyacc_start_whatsapp_gateway()
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn\'t import Django. Are you sure it\'s installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
if __name__ == "__main__":
    main()

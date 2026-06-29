#!/usr/bin/env python
"""Django's command-line utility for administrative tasks.
Mhamcloud local development note:
- When running `python manage.py runserver`, the persistent WhatsApp Session
  Gateway is started in the background through scripts/start-Mhamcloud-whatsapp-gateway.ps1.
- This hook is limited to runserver only. It does not run during tests,
  migrations, checks, shell, or other management commands.
"""
import os
import subprocess
import sys
from pathlib import Path
def _Mhamcloud_should_start_whatsapp_gateway() -> bool:
    """Return True only for local runserver startup."""
    if os.environ.get("Mhamcloud_SKIP_WHATSAPP_GATEWAY_AUTOSTART") == "1":
        return False
    if os.environ.get("Mhamcloud_WHATSAPP_GATEWAY_STARTED_BY_MANAGE") == "1":
        return False
    if "runserver" not in set(sys.argv[1:]):
        return False
    return True
def _Mhamcloud_start_whatsapp_gateway() -> None:
    """Start the local WhatsApp Session Gateway in the background."""
    root = Path(__file__).resolve().parent
    launcher = root / "scripts" / "start-Mhamcloud-whatsapp-gateway.ps1"
    if not launcher.exists():
        print(
            f"[Mhamcloud] WhatsApp gateway launcher not found: {launcher}",
            file=sys.stderr,
        )
        return
    powershell = "powershell.exe" if os.name == "nt" else "pwsh"
    os.environ["Mhamcloud_WHATSAPP_GATEWAY_STARTED_BY_MANAGE"] = "1"
    print("[Mhamcloud] Starting WhatsApp Gateway in background before Django runserver...")
    try:
        subprocess.Popen(
            [
                powershell,
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-File",
                str(launcher),
            ],
            cwd=str(root),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            close_fds=True,
        )
    except Exception as exc:
        print(
            f"[Mhamcloud] WhatsApp Gateway autostart warning: {exc}",
            file=sys.stderr,
        )
def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    if _Mhamcloud_should_start_whatsapp_gateway():
        _Mhamcloud_start_whatsapp_gateway()
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

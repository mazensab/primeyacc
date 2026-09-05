from __future__ import annotations

import base64
import ctypes
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone as dt_timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from django.apps import apps

from .sync_engine import (
    CREDENTIAL_FILE,
    ELIGIBILITY_FILE,
    LOCK_FILE,
    SOURCE_CACHE_DIR,
    STATE_FILE,
    _load_v13,
    load_background_credentials,
)

ROOT = Path.cwd()
SETTINGS_FILE = ROOT / "_audit" / "production" / "mham_legacy_management_settings.json"
RUNS_FILE = ROOT / "_audit" / "production" / "mham_legacy_management_runs.json"


def txt(value: Any) -> str:
    return str(value or "").strip()


def now_iso() -> str:
    return datetime.now(dt_timezone.utc).isoformat()


def safe_error(value: Any, limit: int = 1000) -> str:
    s = txt(value)
    if not s:
        return ""
    s = re.sub(
        r"(?i)(authorization|bearer|token|secret|password|client_secret|access_token)\s*[:=]\s*[^\s,;]+",
        r"\1=[REDACTED]",
        s,
    )
    s = re.sub(r"(?i)Bearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]", s)
    return s[:limit]


def validate_base_url(value: str) -> str:
    value = txt(value).rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme.lower() != "https":
        raise ValueError("MhamCloud base URL must use HTTPS.")
    if (parsed.hostname or "").lower() != "mhamcloud.sa":
        raise ValueError("MhamCloud base URL host must be mhamcloud.sa.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("MhamCloud base URL must not contain credentials, query, or fragment.")
    return value


def read_settings() -> dict[str, Any]:
    defaults = {
        "enabled": True,
        "base_url": "https://mhamcloud.sa/connector/api",
        "timeout_seconds": 30,
        "last_connection_test_at": None,
        "last_connection_ok": None,
        "last_connection_error": "",
        "updated_at": None,
    }
    if SETTINGS_FILE.exists():
        try:
            payload = json.loads(SETTINGS_FILE.read_text(encoding="utf-8-sig"))
            if isinstance(payload, dict):
                defaults.update(payload)
        except Exception:
            pass
    defaults["base_url"] = validate_base_url(defaults["base_url"])
    defaults["timeout_seconds"] = min(max(int(defaults["timeout_seconds"]), 5), 120)
    return defaults


def write_settings(payload: dict[str, Any]) -> dict[str, Any]:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp = SETTINGS_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(SETTINGS_FILE)
    return payload


def update_settings(data: dict[str, Any]) -> dict[str, Any]:
    current = read_settings()
    if "enabled" in data:
        current["enabled"] = bool(data["enabled"])
    if "base_url" in data:
        current["base_url"] = validate_base_url(data["base_url"])
    if "timeout_seconds" in data:
        timeout = int(data["timeout_seconds"])
        if not 5 <= timeout <= 120:
            raise ValueError("Timeout must be between 5 and 120 seconds.")
        current["timeout_seconds"] = timeout
    current["updated_at"] = now_iso()
    return write_settings(current)


def _protect_windows_user(raw: bytes) -> bytes:
    if os.name != "nt":
        raise RuntimeError("Windows DPAPI is required for MhamCloud credential storage.")

    class DATA_BLOB(ctypes.Structure):
        _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]

    def blob(data: bytes):
        buf = ctypes.create_string_buffer(data)
        return DATA_BLOB(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte))), buf

    in_blob, in_buf = blob(raw)
    out_blob = DATA_BLOB()
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    ok = crypt32.CryptProtectData(
        ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)
    )
    if not ok:
        raise ctypes.WinError()
    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        kernel32.LocalFree(out_blob.pbData)


def credential_flags() -> dict[str, bool]:
    try:
        values = load_background_credentials()
    except Exception:
        values = {}
    return {
        "client_id_configured": bool(txt(values.get("MHAM_LEGACY_CLIENT_ID"))),
        "client_secret_configured": bool(txt(values.get("MHAM_LEGACY_CLIENT_SECRET"))),
        "username_configured": bool(txt(values.get("MHAM_LEGACY_USERNAME"))),
        "password_configured": bool(txt(values.get("MHAM_LEGACY_PASSWORD"))),
    }


def save_credentials(data: dict[str, Any]) -> dict[str, bool]:
    current = load_background_credentials()
    mapping = {
        "client_id": "MHAM_LEGACY_CLIENT_ID",
        "client_secret": "MHAM_LEGACY_CLIENT_SECRET",
        "username": "MHAM_LEGACY_USERNAME",
        "password": "MHAM_LEGACY_PASSWORD",
    }
    stored = {}
    for ui_name, env_name in mapping.items():
        stored[env_name] = txt(data[ui_name]) if ui_name in data else txt(current.get(env_name))

    missing = [
        name
        for name in ("MHAM_LEGACY_CLIENT_ID", "MHAM_LEGACY_USERNAME", "MHAM_LEGACY_PASSWORD")
        if not stored[name]
    ]
    if missing:
        raise ValueError("Required MhamCloud credentials are missing.")

    protected = _protect_windows_user(json.dumps(stored, ensure_ascii=False).encode("utf-8"))
    CREDENTIAL_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp = CREDENTIAL_FILE.with_suffix(".tmp")
    temp.write_bytes(base64.b64encode(protected))
    temp.replace(CREDENTIAL_FILE)
    for name, value in stored.items():
        os.environ[name] = value
    return credential_flags()


def public_settings() -> dict[str, Any]:
    return {**read_settings(), **credential_flags()}


def test_connection() -> dict[str, Any]:
    settings = read_settings()
    os.environ["MHAM_LEGACY_API_BASE_URL"] = settings["base_url"]
    os.environ["MHAM_LEGACY_API_TIMEOUT"] = str(settings["timeout_seconds"])
    credentials = load_background_credentials()
    missing = [
        name
        for name in ("MHAM_LEGACY_CLIENT_ID", "MHAM_LEGACY_USERNAME", "MHAM_LEGACY_PASSWORD")
        if not txt(credentials.get(name))
    ]
    if missing:
        raise ValueError("Required MhamCloud credentials are not configured.")
    v13 = _load_v13()
    v13.auth_token()
    settings["last_connection_test_at"] = now_iso()
    settings["last_connection_ok"] = True
    settings["last_connection_error"] = ""
    write_settings(settings)
    return {
        "connected": True,
        "tested_at": settings["last_connection_test_at"],
        "message": "MhamCloud authentication succeeded.",
    }


def record_connection_failure(exc: Exception) -> dict[str, Any]:
    settings = read_settings()
    settings["last_connection_test_at"] = now_iso()
    settings["last_connection_ok"] = False
    settings["last_connection_error"] = safe_error(f"{type(exc).__name__}: {exc}", 500)
    write_settings(settings)
    return {
        "connected": False,
        "tested_at": settings["last_connection_test_at"],
        "message": settings["last_connection_error"],
    }


def eligible_rows() -> list[dict[str, str]]:
    if not ELIGIBILITY_FILE.exists():
        return []
    try:
        root = json.loads(ELIGIBILITY_FILE.read_text(encoding="utf-8-sig"))
    except Exception:
        return []
    rows = []
    for item in root.get("companies", []):
        if isinstance(item, dict) and item.get("eligible") is True:
            bid = txt(item.get("legacy_company_id"))
            if bid:
                rows.append({"business_id": bid, "company_name": txt(item.get("name"))})
    return rows


def company_map() -> dict[str, Any]:
    LegacyObjectMap = apps.get_model("business_controls", "LegacyObjectMap")
    result = {}
    for row in (
        LegacyObjectMap.objects.filter(source_system="mhamcloud_v1", source_table="business")
        .select_related("company")
        .order_by("legacy_company_id", "-id")
    ):
        bid = txt(row.legacy_company_id)
        if bid and bid not in result:
            result[bid] = row.company
    return result


def current_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {}
    try:
        value = json.loads(STATE_FILE.read_text(encoding="utf-8-sig"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def state_by_business() -> dict[str, dict[str, Any]]:
    result = {}
    for row in current_state().get("results", []):
        if isinstance(row, dict):
            bid = txt(row.get("business_id"))
            if bid:
                result[bid] = row
    return result


def domain_summary(business_id: str, status: str) -> list[dict[str, Any]]:
    path = SOURCE_CACHE_DIR / f"company_{business_id}.json"
    if not path.exists():
        return []
    try:
        root = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return []
    if not isinstance(root, dict):
        return []
    source = next(
        (root[k] for k in ("source", "snapshot", "data", "payload") if isinstance(root.get(k), dict)),
        root,
    )
    ignored = {"source_checksum", "checksum", "business_id", "fetched_at", "created_at", "updated_at", "metadata"}
    rows = []
    for key, value in source.items():
        if key in ignored or not isinstance(value, (list, dict)):
            continue
        rows.append(
            {
                "domain": str(key),
                "status": "SUCCESS" if status in {"APPLIED", "UNCHANGED", "BASELINE_SYNCED"} else status,
                "source_count": len(value),
                "error": "",
            }
        )
    return sorted(rows, key=lambda x: x["domain"])


def companies_payload() -> list[dict[str, Any]]:
    mapping = company_map()
    states = state_by_business()
    state_root = current_state()
    rows = []
    for base in eligible_rows():
        bid = base["business_id"]
        state = states.get(bid, {})
        status = txt(state.get("status")).upper()
        if status == "FAIL":
            status = "FAILED"
        if not status:
            status = "BASELINE_SYNCED"
        company = mapping.get(bid)
        err = safe_error(state.get("error"))
        domains = domain_summary(bid, status)
        if status == "FAILED" and not domains:
            domains = [{"domain": "GENERAL", "status": "FAILED", "source_count": None, "error": err}]
        rows.append(
            {
                "business_id": bid,
                "company_id": getattr(company, "id", None),
                "company_name": base["company_name"] or getattr(company, "display_name", "") or "",
                "company_code": getattr(company, "company_code", "") if company else "",
                "status": status,
                "domain_count": len(domains),
                "successful_domain_count": sum(x.get("status") == "SUCCESS" for x in domains),
                "domain_statuses": domains,
                "safe_error_code": err.split(":", 1)[0][:120] if err else "",
                "safe_error_message": err,
                "source_checksum": txt(state.get("before_checksum")),
                "target_checksum": txt(state.get("after_checksum")),
                "legacy_map_count": int(state.get("legacy_map_count") or 0),
                "last_attempt_at": state_root.get("completed_at_utc") if state else None,
            }
        )
    return rows


def read_runs() -> list[dict[str, Any]]:
    if not RUNS_FILE.exists():
        return []
    try:
        value = json.loads(RUNS_FILE.read_text(encoding="utf-8-sig"))
        return value if isinstance(value, list) else []
    except Exception:
        return []


def write_runs(rows: list[dict[str, Any]]) -> None:
    RUNS_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp = RUNS_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(rows[-250:], ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(RUNS_FILE)


def create_run(*, trigger: str, business_ids: list[str], all_eligible: bool, scan_only: bool) -> dict[str, Any]:
    run = {
        "id": uuid.uuid4().hex,
        "trigger": trigger,
        "status": "QUEUED",
        "business_ids": business_ids,
        "all_eligible": all_eligible,
        "scan_only": scan_only,
        "queued_at": now_iso(),
        "started_at": None,
        "completed_at": None,
        "requested_count": len(business_ids),
        "changed_count": 0,
        "applied_count": 0,
        "unchanged_count": 0,
        "failure_count": 0,
        "safe_error_message": "",
    }
    rows = read_runs()
    rows.append(run)
    write_runs(rows)
    return run


def update_run(run_id: str, **updates: Any) -> dict[str, Any]:
    rows = read_runs()
    found = None
    for row in rows:
        if row.get("id") == run_id:
            row.update(updates)
            found = row
            break
    if found is None:
        raise ValueError("MhamCloud management run was not found.")
    write_runs(rows)
    return found


def start_background_sync(*, trigger: str, business_ids: list[str] | None = None, all_eligible=False, scan_only=False) -> dict[str, Any]:
    settings = read_settings()
    if not settings["enabled"]:
        raise ValueError("MhamCloud integration is disabled.")
    if LOCK_FILE.exists():
        raise ValueError("A MhamCloud sync is already running.")
    business_ids = [txt(x) for x in (business_ids or []) if txt(x)]
    run = create_run(trigger=trigger, business_ids=business_ids, all_eligible=all_eligible, scan_only=scan_only)

    command = [
        sys.executable,
        "manage.py",
        "mhamcloud_management_run",
        "--run-id",
        run["id"],
        "--trigger",
        trigger,
    ]
    if all_eligible:
        command.append("--all-eligible")
    for bid in business_ids:
        command.extend(["--business-id", bid])
    if scan_only:
        command.append("--scan-only")

    env = os.environ.copy()
    env["MHAM_LEGACY_API_BASE_URL"] = settings["base_url"]
    env["MHAM_LEGACY_API_TIMEOUT"] = str(settings["timeout_seconds"])

    log_path = ROOT / "_audit" / "production" / f"mham_management_run_{run['id']}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    handle = log_path.open("ab")
    try:
        kwargs = {
            "cwd": str(ROOT),
            "env": env,
            "stdin": subprocess.DEVNULL,
            "stdout": handle,
            "stderr": subprocess.STDOUT,
        }
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        else:
            kwargs["start_new_session"] = True
        subprocess.Popen(command, **kwargs)
    except Exception:
        handle.close()
        update_run(run["id"], status="FAILED", completed_at=now_iso(), safe_error_message="Unable to start MhamCloud background sync process.")
        raise
    else:
        handle.close()
    return run


def integration_status() -> dict[str, Any]:
    rows = companies_payload()
    latest_runs = read_runs()
    settings = public_settings()
    flags = credential_flags()
    state = current_state()
    return {
        "enabled": settings["enabled"],
        "connection": {
            **flags,
            "credentials_ready": flags["client_id_configured"] and flags["username_configured"] and flags["password_configured"],
            "last_test_ok": settings.get("last_connection_ok"),
            "last_test_at": settings.get("last_connection_test_at"),
        },
        "sync_running": LOCK_FILE.exists(),
        "companies": {
            "total": len(rows),
            "baseline_synced": sum(x["status"] == "BASELINE_SYNCED" for x in rows),
            "applied": sum(x["status"] == "APPLIED" for x in rows),
            "unchanged": sum(x["status"] == "UNCHANGED" for x in rows),
            "failed": sum(x["status"] == "FAILED" for x in rows),
        },
        "latest_state": {
            "started_at": state.get("started_at_utc"),
            "completed_at": state.get("completed_at_utc"),
            "requested_count": int(state.get("requested_business_count") or 0),
            "changed_count": int(state.get("changed_business_count") or 0),
            "failure_count": int(state.get("failure_count") or 0),
        },
        "latest_run": latest_runs[-1] if latest_runs else None,
    }

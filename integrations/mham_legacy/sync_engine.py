from __future__ import annotations

import base64
import ctypes
import importlib.util
import inspect
import json
import os
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone as dt_timezone
from pathlib import Path
from typing import Any, Iterable

from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone

ROOT = Path.cwd()
SOURCE_SYSTEM = "mhamcloud_v1"
V13_PATH = ROOT / "backups" / "phase49_final_consolidated_import_and_close_v13_final.py"
SOURCE_CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"
CREDENTIAL_FILE = ROOT / "_audit" / "production" / "mham_legacy_sync_credentials.dpapi"
LOCK_FILE = ROOT / "_audit" / "production" / "mham_legacy_sync.lock"
STATE_FILE = ROOT / "_audit" / "production" / "mham_legacy_sync_state.json"
ELIGIBILITY_FILE = ROOT / "_audit" / "phase49j_general_apply" / "phase49_final_dynamic_eligibility.json"


class MhamSyncError(RuntimeError):
    pass


@dataclass(slots=True)
class SyncCompanyResult:
    business_id: str
    status: str
    before_checksum: str = ""
    after_checksum: str = ""
    company_id: int | None = None
    legacy_map_count: int = 0
    error: str = ""


def _txt(value: Any) -> str:
    return "" if value is None else str(value).strip()


def _load_v13():
    if not V13_PATH.exists():
        raise MhamSyncError(f"V13 importer missing: {V13_PATH}")
    spec = importlib.util.spec_from_file_location("phase49_v13_sync_base", V13_PATH)
    if spec is None or spec.loader is None:
        raise MhamSyncError("Unable to load the validated V13 importer.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _unprotect_windows_user(raw: bytes) -> bytes:
    if os.name != "nt":
        raise MhamSyncError("DPAPI credentials are supported only on Windows.")

    class DATA_BLOB(ctypes.Structure):
        _fields_ = [
            ("cbData", ctypes.c_uint32),
            ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
        ]

    def blob(data: bytes):
        buf = ctypes.create_string_buffer(data)
        return DATA_BLOB(
            len(data),
            ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte)),
        ), buf

    in_blob, in_buf = blob(raw)
    out_blob = DATA_BLOB()
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32

    ok = crypt32.CryptUnprotectData(
        ctypes.byref(in_blob),
        None,
        None,
        None,
        None,
        0,
        ctypes.byref(out_blob),
    )
    if not ok:
        raise ctypes.WinError()

    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        kernel32.LocalFree(out_blob.pbData)


def load_background_credentials() -> dict[str, str]:
    names = (
        "MHAM_LEGACY_CLIENT_ID",
        "MHAM_LEGACY_CLIENT_SECRET",
        "MHAM_LEGACY_USERNAME",
        "MHAM_LEGACY_PASSWORD",
    )
    current = {name: os.environ.get(name, "").strip() for name in names}

    if (
        current["MHAM_LEGACY_CLIENT_ID"]
        and current["MHAM_LEGACY_USERNAME"]
        and current["MHAM_LEGACY_PASSWORD"]
    ):
        return current

    if not CREDENTIAL_FILE.exists():
        return current

    protected = base64.b64decode(CREDENTIAL_FILE.read_bytes())
    clear = _unprotect_windows_user(protected)
    stored = json.loads(clear.decode("utf-8"))

    for name in names:
        if not current[name]:
            value = _txt(stored.get(name))
            current[name] = value
            if value:
                os.environ[name] = value

    return current


def _models():
    return {
        "Company": apps.get_model("companies", "Company"),
        "Branch": apps.get_model("companies", "Branch"),
        "CompanySettings": apps.get_model("companies", "CompanySettings"),
        "CompanyMembership": apps.get_model("accounts", "CompanyMembership"),
        "UserProfile": apps.get_model("accounts", "UserProfile"),
        "BusinessParty": apps.get_model("parties", "BusinessParty"),
        "CatalogUnit": apps.get_model("catalog", "CatalogUnit"),
        "CatalogCategory": apps.get_model("catalog", "CatalogCategory"),
        "CatalogItem": apps.get_model("catalog", "CatalogItem"),
        "TaxRate": apps.get_model("accounting", "TaxRate"),
        "CompanySubscription": apps.get_model("subscriptions", "CompanySubscription"),
        "SubscriptionPlan": apps.get_model("subscriptions", "SubscriptionPlan"),
        "MigrationRun": apps.get_model("business_controls", "MigrationRun"),
        "LegacyObjectMap": apps.get_model("business_controls", "LegacyObjectMap"),
        "User": get_user_model(),
        "Warehouse": apps.get_model("inventory", "Warehouse"),
        "InventoryLocation": apps.get_model("inventory", "InventoryLocation"),
        "StockItem": apps.get_model("inventory", "StockItem"),
        "StockMovement": apps.get_model("inventory", "StockMovement"),
        "SalesInvoice": apps.get_model("sales", "SalesInvoice"),
        "SalesInvoiceItem": apps.get_model("sales", "SalesInvoiceItem"),
        "SalesReturn": apps.get_model("sales", "SalesReturn"),
        "PurchaseBill": apps.get_model("purchases", "PurchaseBill"),
        "PurchaseBillItem": apps.get_model("purchases", "PurchaseBillItem"),
        "PurchaseReturn": apps.get_model("purchases", "PurchaseReturn"),
        "CustomerPayment": apps.get_model("treasury", "CustomerPayment"),
        "SupplierPayment": apps.get_model("treasury", "SupplierPayment"),
        "TreasuryAccount": apps.get_model("treasury", "TreasuryAccount"),
    }


def _deps():
    from treasury.services import create_treasury_account

    return {
        "ContentType": ContentType,
        "transaction": transaction,
        "timezone": timezone,
        "create_treasury_account": create_treasury_account,
    }


def _cache_wrapper(business_id: str) -> dict[str, Any] | None:
    path = SOURCE_CACHE_DIR / f"company_{business_id}.json"
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def _company_row_by_id(
    rows: Iterable[dict[str, Any]],
    business_id: str,
) -> dict[str, Any]:
    matches = [
        row
        for row in rows
        if _txt(row.get("id") or row.get("business_id")) == business_id
    ]
    if len(matches) != 1:
        raise MhamSyncError(
            f"Expected exactly one source company for {business_id}; found {len(matches)}."
        )
    return matches[0]


def _is_pid_running(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        cp = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        return str(pid) in cp.stdout
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _acquire_lock() -> None:
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    if LOCK_FILE.exists():
        try:
            existing = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
            pid = int(existing.get("pid", 0))
            if _is_pid_running(pid):
                raise MhamSyncError(f"Another Mham sync is already running (pid={pid}).")
        except MhamSyncError:
            raise
        except Exception:
            pass

    LOCK_FILE.write_text(
        json.dumps(
            {
                "pid": os.getpid(),
                "started_at_utc": datetime.now(dt_timezone.utc).isoformat(),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def _release_lock() -> None:
    try:
        LOCK_FILE.unlink(missing_ok=True)
    except Exception:
        pass


def snapshot_changed(
    business_id: str,
    live: dict[str, Any],
    v13,
) -> tuple[bool, str, str]:
    wrapper = _cache_wrapper(business_id)
    before = _txt((wrapper or {}).get("source_checksum"))
    after = v13.sha(live)
    return (not before or before != after), before, after


def _eligible_name_map() -> dict[str, str]:
    if not ELIGIBILITY_FILE.exists():
        raise MhamSyncError(f"Eligibility report missing: {ELIGIBILITY_FILE}")
    payload = json.loads(ELIGIBILITY_FILE.read_text(encoding="utf-8-sig"))
    return {
        _txt(row.get("legacy_company_id")): _txt(row.get("name"))
        for row in payload.get("companies", [])
        if isinstance(row, dict)
        and row.get("eligible") is True
        and _txt(row.get("legacy_company_id"))
    }



def _mapped_target(LegacyObjectMap, *, table: str, legacy_id: str):
    mapping = (
        LegacyObjectMap.objects
        .filter(
            source_system=SOURCE_SYSTEM,
            source_table=table,
            legacy_id=str(legacy_id),
        )
        .select_related("target_content_type")
        .first()
    )
    if mapping is None or not mapping.target_content_type_id or not mapping.target_object_id:
        return mapping, None
    model = mapping.target_content_type.model_class()
    if model is None:
        return mapping, None
    return mapping, model.objects.filter(pk=mapping.target_object_id).first()


def _sync_users_in_place(
    *,
    business_id: str,
    live: dict[str, Any],
    company,
    M,
    v13,
) -> dict[str, int]:
    """
    Preserve existing Primey user identities and memberships.

    V13 originally creates users only during first import. A background refresh
    must never create a second login merely because the source snapshot changed.
    Existing mapped users are updated in place; newly appearing legacy users are
    created once and mapped.
    """
    User = M["User"]
    UserProfile = M["UserProfile"]
    CompanyMembership = M["CompanyMembership"]
    LegacyObjectMap = M["LegacyObjectMap"]
    MigrationRun = M["MigrationRun"]

    role_text = " ".join(v13.txt(x.get("name")) for x in live.get("roles", [])).lower()

    def role_pref():
        preferred = ["EMPLOYEE"]
        for token, target in (
            ("owner", "OWNER"),
            ("admin", "ADMIN"),
            ("manager", "MANAGER"),
            ("accountant", "ACCOUNTANT"),
            ("cashier", "CASHIER"),
            ("sales", "SALES"),
            ("inventory", "INVENTORY"),
            ("hr", "HR"),
        ):
            if token in role_text:
                preferred = [target]
                break
        return preferred

    latest_run = (
        MigrationRun.objects
        .filter(source_system=SOURCE_SYSTEM, company=company)
        .order_by("-id")
        .first()
    )
    if latest_run is None:
        raise MhamSyncError(f"No migration run exists for company {business_id}.")

    created = updated = 0

    for index, row in enumerate(live.get("users", [])):
        uid = v13.sid(row)
        mapping, user = _mapped_target(
            LegacyObjectMap,
            table="users",
            legacy_id=uid,
        )

        raw_username = v13.txt(row.get("username")) or f"legacy_{business_id}_{uid}"
        desired_email = v13.clean(User, "email", v13.txt(row.get("email")))
        desired_first = v13.clean(User, "first_name", v13.txt(row.get("first_name")))
        desired_last = v13.clean(User, "last_name", v13.txt(row.get("last_name")))
        desired_active = (
            v13.txt(row.get("status")).lower() in {"", "active"}
            and v13.truthy(row.get("allow_login"), True)
        )

        if user is None:
            username = raw_username
            if User.objects.filter(username=username).exists():
                username = f"{username}__legacy_{business_id}_{uid}"
            user = User(
                username=v13.clean(User, "username", username),
                first_name=desired_first,
                last_name=desired_last,
                email=desired_email,
                is_active=desired_active,
                is_staff=False,
                is_superuser=False,
            )
            user.set_unusable_password()
            user.save()
            created += 1
        else:
            user.first_name = desired_first
            user.last_name = desired_last
            user.email = desired_email
            user.is_active = desired_active
            user.save(update_fields=["first_name", "last_name", "email", "is_active"])
            updated += 1

        profile, _ = UserProfile.objects.get_or_create(user=user)
        pf = v13.fields(UserProfile)
        if "display_name" in pf:
            profile.display_name = (
                " ".join(x for x in [user.first_name, user.last_name] if x)
                or user.username
            )[:255]
        if "default_company" in pf:
            profile.default_company = company
        if "status" in pf:
            profile.status = v13.choice(UserProfile, "status", ["ACTIVE"], "ACTIVE")
        if "language" in pf:
            profile.language = v13.txt(row.get("language")) or "ar"
        if "timezone" in pf:
            profile.timezone = "Asia/Riyadh"
        if "extra_data" in pf:
            profile.extra_data = {
                "migration": {
                    "legacy_user_id": uid,
                    "original_username": v13.txt(row.get("username")),
                    "password_policy": "UNUSABLE_UNTIL_RESET",
                    "background_sync": True,
                }
            }
        profile.save()

        membership = (
            CompanyMembership.objects
            .filter(user=user, company=company)
            .order_by("id")
            .first()
        )
        if membership is None:
            membership = CompanyMembership.objects.create(
                user=user,
                company=company,
                role=v13.choice(
                    CompanyMembership,
                    "role",
                    role_pref(),
                    role_pref()[0],
                ),
                status=v13.choice(
                    CompanyMembership,
                    "status",
                    ["ACTIVE"],
                    "ACTIVE",
                ),
                is_primary=index == 0,
                joined_at=timezone.now(),
                extra_data={
                    "migration": {
                        "legacy_user_id": uid,
                        "legacy_roles": [
                            v13.txt(x.get("name"))
                            for x in live.get("roles", [])
                        ],
                        "permissions_snapshot": live.get("permissions", {}),
                        "background_sync": True,
                    }
                },
            )
            membership.full_clean()
            membership.save()

        checksum = v13.sha(row)
        metadata = dict((mapping.metadata if mapping is not None else {}) or {})
        metadata.update(
            {
                "membership_id": membership.pk,
                "password_policy": "UNUSABLE_UNTIL_RESET",
                "background_sync": True,
            }
        )

        if mapping is None:
            v13.create_map(
                LegacyObjectMap,
                ContentType,
                latest_run,
                company,
                business_id,
                "users",
                uid,
                user,
                row,
                user.username,
                metadata,
            )
        else:
            mapping.company = company
            mapping.legacy_company_id = business_id
            mapping.target_content_type = ContentType.objects.get_for_model(User)
            mapping.target_object_id = str(user.pk)
            mapping.checksum = checksum
            mapping.source_reference = user.username[:255]
            mapping.metadata = metadata
            mapping.save(
                update_fields=[
                    "company",
                    "legacy_company_id",
                    "target_content_type",
                    "target_object_id",
                    "checksum",
                    "source_reference",
                    "metadata",
                    "updated_at",
                ]
            )

    return {"created": created, "updated": updated}


def _purge_refreshable_company_data(*, company, M) -> dict[str, int]:
    """
    Remove only data that V13 owns and can deterministically recreate.

    Company, users, memberships, profiles, migration history and treasury/accounting
    identities are deliberately preserved.  Deletions run inside the caller's
    transaction.  If an unexpected PROTECT relation outside this allow-list exists,
    the refresh fails closed and rolls back.
    """
    ordered_names = [
        "CustomerPayment",
        "SupplierPayment",
        "SalesReturn",
        "PurchaseReturn",
        "SalesInvoiceItem",
        "PurchaseBillItem",
        "StockMovement",
        "StockItem",
        "InventoryLocation",
        "Warehouse",
        "SalesInvoice",
        "PurchaseBill",
        "CatalogItem",
        "CatalogCategory",
        "CatalogUnit",
        "TaxRate",
        "BusinessParty",
        "CompanySubscription",
        "Branch",
        "CompanySettings",
    ]

    allowed_models = {M[name] for name in ordered_names}
    counts: dict[str, int] = {}

    for name in ordered_names:
        model = M[name]
        if "company" not in {field.name for field in model._meta.fields}:
            continue

        qs = model.objects.filter(company=company)
        existing = qs.count()
        if not existing:
            counts[name] = 0
            continue

        try:
            deleted, details = qs.delete()
        except ProtectedError as exc:
            protected_models = {
                obj.__class__
                for obj in exc.protected_objects
            }
            unsafe = [
                cls._meta.label
                for cls in protected_models
                if cls not in allowed_models
            ]
            if unsafe:
                raise MhamSyncError(
                    "Refresh blocked by non-V13 protected models: "
                    + ",".join(sorted(unsafe))
                ) from exc

            # Protected objects are themselves V13-owned. Delete those model
            # rows for this company first, then retry the current parent.
            for protected_model in protected_models:
                if "company" not in {
                    field.name
                    for field in protected_model._meta.fields
                }:
                    raise MhamSyncError(
                        "Refresh encountered protected V13 child without "
                        f"company scope: {protected_model._meta.label}"
                    ) from exc
                protected_model.objects.filter(company=company).delete()

            deleted, details = qs.delete()

        counts[name] = int(deleted)

    return counts


def _build_existing_company_apply(v13):
    source = inspect.getsource(v13.apply_company)
    source = source.replace("\r\n", "\n").replace("\r", "\n")
    lines = source.split("\n")

    def indexes(exact):
        return [i for i, line in enumerate(lines) if line.strip() == exact]

    sig = indexes("def apply_company(bid, expected_name, src, M, D):")
    if len(sig) != 1:
        raise MhamSyncError(f"V13 signature semantic guard failed found={len(sig)}")
    lines[sig[0]] = "def apply_company_existing(bid, expected_name, src, M, D, existing_company):"

    early = "if LegacyObjectMap.objects.filter(source_system=SOURCE_SYSTEM,legacy_company_id=bid).exists():"
    collision = 'if Company.objects.filter(company_code=f"LEGACY-{bid}").exists():'
    pos = indexes(early)
    if len(pos) != 1:
        raise MhamSyncError(f"V13 early guard semantic match failed found={len(pos)}")
    i = pos[0]
    if i + 3 >= len(lines) or "SKIPPED_ALREADY_MIGRATED" not in lines[i+1] or lines[i+2].strip() != collision or "company_code collision without legacy mapping" not in lines[i+3]:
        raise MhamSyncError("V13 early guard semantic shape failed")
    del lines[i:i+4]

    locked = "if LegacyObjectMap.objects.select_for_update().filter(source_system=SOURCE_SYSTEM,legacy_company_id=bid).exists():"
    pos = indexes(locked)
    if len(pos) != 1:
        raise MhamSyncError(f"V13 locked guard semantic match failed found={len(pos)}")
    i = pos[0]
    if i + 1 >= len(lines) or "SKIPPED_ALREADY_MIGRATED" not in lines[i+1]:
        raise MhamSyncError("V13 locked guard semantic shape failed")
    del lines[i:i+2]

    create_line = "company=Company.objects.create(**ck); company.full_clean(); company.save()"
    pos = indexes(create_line)
    if len(pos) != 1:
        raise MhamSyncError(f"V13 company create semantic match failed found={len(pos)}")
    i = pos[0]
    indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
    lines[i:i+1] = [
        indent + "company=existing_company",
        indent + "for _field_name,_field_value in ck.items(): setattr(company,_field_name,_field_value)",
        indent + "company.full_clean(); company.save()",
    ]

    role = [i for i,l in enumerate(lines) if l.strip().startswith('role_text=" ".join(txt(x.get("name")) for x in src["roles"])')]
    party = indexes("party_by={}")
    if len(role) != 1 or len(party) != 1 or party[0] <= role[0]:
        raise MhamSyncError(f"V13 user block semantic match failed role={len(role)} party={len(party)}")
    start, end = role[0], party[0]
    indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]
    lines[start:end] = [indent + "# Existing-company refresh preserves users/memberships."]

    namespace = dict(v13.__dict__)
    exec(compile("\n".join(lines), str(V13_PATH), "exec"), namespace)
    fn = namespace.get("apply_company_existing")
    if fn is None:
        raise MhamSyncError("V13 existing-company function compile failed")
    return fn


def replace_company_from_snapshot(
    *,
    business_id: str,
    live: dict[str, Any],
    expected_name: str,
    v13,
) -> SyncCompanyResult:
    """
    PRE-CUTOVER authoritative tenant refresh without deleting Company.

    The previous implementation attempted company.delete(), which correctly
    failed under Django PROTECT relationships.  This implementation keeps the
    Company identity stable, preserves users/memberships and treasury/accounting
    identities, rebuilds only V13-owned tenant data, and runs the entire refresh
    inside one atomic transaction.
    """
    M = _models()
    LegacyObjectMap = M["LegacyObjectMap"]
    Company = M["Company"]

    wrapper = _cache_wrapper(business_id)
    before = _txt((wrapper or {}).get("source_checksum"))
    after = v13.sha(live)

    source_name = _txt(live.get("company", {}).get("name"))
    if not source_name:
        raise MhamSyncError(
            f"Source company name is empty for business {business_id}."
        )
    if expected_name and source_name != expected_name:
        # Stable source identity is legacy business_id. Company name is mutable
        # source data and may legitimately change after the frozen eligibility
        # report. Accept the live source name while preserving Primey Company ID.
        print(
            f"SOURCE_COMPANY_NAME_DRIFT_ACCEPTED=YES "
            f"BUSINESS_ID={business_id} "
            f"FROZEN_NAME={expected_name!r} LIVE_NAME={source_name!r}",
            flush=True,
        )
        expected_name = source_name

    current_map = (
        LegacyObjectMap.objects
        .filter(
            source_system=SOURCE_SYSTEM,
            legacy_company_id=business_id,
            source_table="business",
        )
        .select_related("company")
        .order_by("-id")
        .first()
    )
    company = getattr(current_map, "company", None)
    if company is None:
        company = Company.objects.filter(
            company_code=f"LEGACY-{business_id}"
        ).first()
    if company is None:
        raise MhamSyncError(
            f"Target company missing for business {business_id}."
        )

    apply_existing = _build_existing_company_apply(v13)

    with transaction.atomic():
        company = (
            Company.objects
            .select_for_update()
            .get(pk=company.pk)
        )

        user_sync = _sync_users_in_place(
            business_id=business_id,
            live=live,
            company=company,
            M=M,
            v13=v13,
        )

        purge_counts = _purge_refreshable_company_data(
            company=company,
            M=M,
        )

        # User mappings are retained because user identities are intentionally
        # preserved. All other source mappings are recreated by V13.
        (
            LegacyObjectMap.objects
            .filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=business_id,
            )
            .exclude(source_table="users")
            .delete()
        )

        v13.normalize_final_legacy_anomalies(
            live,
            M,
            business_id,
        )

        result = apply_existing(
            business_id,
            expected_name,
            live,
            M,
            _deps(),
            company,
        )
        if result.get("status") != "APPLIED":
            raise MhamSyncError(
                f"V13 in-place refresh did not apply: {result}"
            )

        new_company_id = int(result["company_id"])
        if new_company_id != int(company.pk):
            raise MhamSyncError(
                "Company identity changed during in-place refresh."
            )

        legacy_map_count = int(result["legacy_map_count"])

        print(
            f"IN_PLACE_REFRESH=PASS BUSINESS_ID={business_id} "
            f"COMPANY_ID_PRESERVED={company.pk} "
            f"USERS_CREATED={user_sync['created']} "
            f"USERS_UPDATED={user_sync['updated']} "
            f"PURGED_MODELS={len([v for v in purge_counts.values() if v])}",
            flush=True,
        )

    # The source baseline advances only after the tenant transaction commits.
    v13.save_source_cache(business_id, live)

    return SyncCompanyResult(
        business_id=business_id,
        status="APPLIED",
        before_checksum=before,
        after_checksum=after,
        company_id=new_company_id,
        legacy_map_count=legacy_map_count,
    )



def sync_business_ids(
    business_ids: list[str],
    *,
    scan_only: bool = False,
) -> dict[str, Any]:
    _acquire_lock()
    started = datetime.now(dt_timezone.utc)

    try:
        credentials = load_background_credentials()
        required = (
            "MHAM_LEGACY_CLIENT_ID",
            "MHAM_LEGACY_USERNAME",
            "MHAM_LEGACY_PASSWORD",
        )
        missing = [name for name in required if not _txt(credentials.get(name))]
        if missing:
            raise MhamSyncError(
                "Missing OAuth credentials: " + ",".join(missing)
            )

        v13 = _load_v13()
        token = v13.auth_token()
        companies = v13.fetch_cursor(
            "/companies",
            token,
            "mham-sync:companies",
        )
        names = _eligible_name_map()

        ordered = sorted(
            {str(x).strip() for x in business_ids if str(x).strip()},
            key=lambda x: int(x) if x.isdigit() else 10**18,
        )

        results: list[dict[str, Any]] = []
        changed_ids: list[str] = []
        failures: dict[str, str] = {}

        for index, business_id in enumerate(ordered, 1):
            print(
                f"\n=== MHAM SYNC {index}/{len(ordered)} "
                f"BUSINESS_ID={business_id} ===",
                flush=True,
            )
            try:
                company_row = _company_row_by_id(companies, business_id)
                live = v13.collect_source(
                    business_id,
                    company_row,
                    token,
                )
                changed, before, after = snapshot_changed(
                    business_id,
                    live,
                    v13,
                )
                print(
                    f"SYNC_DELTA BUSINESS_ID={business_id} "
                    f"CHANGED={'YES' if changed else 'NO'} "
                    f"BEFORE={before or 'NONE'} AFTER={after}",
                    flush=True,
                )

                if not changed:
                    results.append(
                        asdict(
                            SyncCompanyResult(
                                business_id=business_id,
                                status="UNCHANGED",
                                before_checksum=before,
                                after_checksum=after,
                            )
                        )
                    )
                    continue

                changed_ids.append(business_id)

                if scan_only:
                    results.append(
                        asdict(
                            SyncCompanyResult(
                                business_id=business_id,
                                status="CHANGED_SCAN_ONLY",
                                before_checksum=before,
                                after_checksum=after,
                            )
                        )
                    )
                    continue

                applied = replace_company_from_snapshot(
                    business_id=business_id,
                    live=live,
                    expected_name=names.get(business_id, ""),
                    v13=v13,
                )
                results.append(asdict(applied))
                print(
                    f"SYNC_APPLY=PASS BUSINESS_ID={business_id} "
                    f"COMPANY_ID={applied.company_id} "
                    f"LEGACY_MAP_COUNT={applied.legacy_map_count}",
                    flush=True,
                )

            except Exception as exc:
                full_error = f"{type(exc).__name__}: {exc}"
                error = full_error[:2000]
                failures[business_id] = error
                results.append(
                    asdict(
                        SyncCompanyResult(
                            business_id=business_id,
                            status="FAIL",
                            error=error,
                        )
                    )
                )
                print(
                    f"SYNC_APPLY=FAIL BUSINESS_ID={business_id} ERROR={error}",
                    flush=True,
                )

        payload = {
            "started_at_utc": started.isoformat(),
            "completed_at_utc": datetime.now(dt_timezone.utc).isoformat(),
            "requested_business_count": len(ordered),
            "changed_business_count": len(changed_ids),
            "changed_business_ids": changed_ids,
            "failure_count": len(failures),
            "failures": failures,
            "scan_only": scan_only,
            "results": results,
        }
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )
        return payload
    finally:
        _release_lock()


def eligible_business_ids() -> list[str]:
    return sorted(
        _eligible_name_map().keys(),
        key=lambda x: int(x) if x.isdigit() else 10**18,
    )


def run_full_background_cycle(*, scan_only: bool = False) -> dict[str, Any]:
    # The current migration API has no webhook/updated_since contract.
    # Therefore background convergence is a periodic read-only source scan.
    # Primey writes occur only for checksum-changed tenants.
    return sync_business_ids(
        eligible_business_ids(),
        scan_only=scan_only,
    )

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

from .topology import assert_legacy_apply_allowed, decision_for, topology_summary

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



POST_CUTOVER_KEEP_NULL_PAYMENTS={("76","360486"),("76","360636"),("76","360641"),("174","1437151"),("290","3376678")}
POST_CUTOVER_DOMAINS=("sales","purchases","sale_returns","purchase_returns","payments","opening_stock","opening_balances")
def _pc_payload(bid):
    w=_cache_wrapper(bid) or {};p=w.get("payload",w);return p if isinstance(p,dict) else {}
def _pc_id(r):return _txt(r.get("id"))
def _pc_loc(r):return _txt(r.get("location_id") or r.get("business_location_id"))
def _pc_branch_targets(bid,M):
    d=decision_for(bid);allowed=set(d.kept_branch_ids if d.mode=="PARTIAL_INCLUDE" else d.split_branch_to_group);out={}
    for mp in M["LegacyObjectMap"].objects.filter(source_system=SOURCE_SYSTEM,legacy_company_id=bid,source_table="business_locations",legacy_id__in=allowed):
        tid=_txt(mp.target_object_id)
        if tid.isdigit():
            br=M["Branch"].objects.filter(pk=int(tid)).only("company_id").first()
            if br:out[_txt(mp.legacy_id)]=int(br.company_id)
    missing=allowed-set(out)
    if missing:raise MhamSyncError(f"POST_CUTOVER_BRANCH_TARGET_MISSING {bid} {sorted(missing)}")
    return out
def build_post_cutover_delta_plan(*,business_id,live,M=None):
    d=decision_for(business_id)
    if d is None:raise MhamSyncError(f"No post-cutover decision for {business_id}")
    if d.mode=="EXCLUDE":return {"business_id":business_id,"mode":d.mode,"ignored":True,"routes":[],"unresolved":[],"counts":{"ignored_source":1}}
    M=M or _models();bt=_pc_branch_targets(business_id,M);excluded=set(d.excluded_branch_ids);old=_pc_payload(business_id)
    oldids={k:{_pc_id(x) for x in old.get(k,[]) if isinstance(x,dict)} for k in POST_CUTOVER_DOMAINS};routes=[];un=[];tx={}
    def add(dom,row,target,reason):
        lid=_pc_id(row)
        if lid in oldids[dom]:return
        if target is None and reason!="EXPECTED_EXCLUDED":un.append({"domain":dom,"legacy_id":lid,"reason":reason});return
        routes.append({"domain":dom,"legacy_id":lid,"target_company_id":target,"reason":reason})
    for dom in ("sales","purchases"):
        for row in live.get(dom,[]):
            lid=_pc_id(row);l=_pc_loc(row)
            if d.mode=="PARTIAL_INCLUDE" and l in excluded:target=None;reason="EXPECTED_EXCLUDED"
            else:target=bt.get(l);reason="BRANCH" if target else f"UNKNOWN_LOCATION:{l or 'NONE'}"
            tx[lid]=target;add(dom,row,target,reason)
    for dom in ("sale_returns","purchase_returns"):
        for row in live.get(dom,[]):
            lid=_pc_id(row);parent=_txt(row.get("return_parent_id") or row.get("parent_transaction_id") or row.get("original_transaction_id"))
            if parent in tx:target=tx[parent];reason="PARENT_TRANSACTION" if target else "EXPECTED_EXCLUDED"
            else:
                l=_pc_loc(row)
                if d.mode=="PARTIAL_INCLUDE" and l in excluded:target=None;reason="EXPECTED_EXCLUDED"
                else:target=bt.get(l);reason="RETURN_LOCATION_FALLBACK" if target else f"UNKNOWN_RETURN_PARENT:{parent or 'NONE'}"
            tx[lid]=target;add(dom,row,target,reason)
    retained=next(iter(bt.values())) if bt else None
    if d.mode=="SPLIT":
        gs=d.raw.get("output_groups",[]);survivor=next((g for g in gs if g.get("source_company_survivor")),None);gid=_txt((survivor or {}).get("group_id") or d.raw.get("retained_source_group") or (gs or [{}])[0].get("group_id"));lbs=[_txt(b.get("legacy_branch_id")) for g in gs if _txt(g.get("group_id"))==gid for b in g.get("branches",[])]
        if lbs:retained=bt.get(lbs[0])
    for row in live.get("payments",[]):
        lid=_pc_id(row)
        if lid in oldids["payments"]:continue
        parent=_txt(row.get("transaction_id"))
        if parent in tx:target=tx[parent];reason="PARENT_TRANSACTION" if target else "EXPECTED_EXCLUDED"
        elif (business_id,lid) in POST_CUTOVER_KEEP_NULL_PAYMENTS and retained:target=retained;reason="FROZEN_KEEP_NULL"
        else:target=None;reason=f"UNKNOWN_PAYMENT_PARENT:{parent or 'NONE'}"
        add("payments",row,target,reason)
    for dom in ("opening_stock","opening_balances"):
        for row in live.get(dom,[]):
            l=_pc_loc(row)
            if d.mode=="PARTIAL_INCLUDE" and l in excluded:target=None;reason="EXPECTED_EXCLUDED"
            else:target=bt.get(l);reason="BRANCH" if target else f"UNKNOWN_LOCATION:{l or 'NONE'}"
            add(dom,row,target,reason)
    counts={}
    for r in routes:
        k="expected_excluded" if r["reason"]=="EXPECTED_EXCLUDED" else "new_"+r["domain"];counts[k]=counts.get(k,0)+1
    return {"business_id":business_id,"mode":d.mode,"ignored":False,"apply":not un,"routes":routes,"unresolved":un,"counts":counts,"target_company_ids":sorted({r["target_company_id"] for r in routes if r["target_company_id"]})}
def _pc_extra_migration(obj):
    extra = getattr(obj, "extra_data", None)
    if not isinstance(extra, dict):
        return {}
    mig = extra.get("migration", {})
    return mig if isinstance(mig, dict) else {}

def _pc_master_matches_legacy(obj, *, legacy_id: str, kind: str) -> bool:
    mig = _pc_extra_migration(obj)
    legacy_id = _txt(legacy_id)
    if kind == "contact":
        return legacy_id in {
            _txt(mig.get("legacy_id")),
            _txt(mig.get("legacy_contact_id")),
        }
    if kind == "item":
        if legacy_id in {_txt(mig.get("legacy_id")), _txt(mig.get("legacy_product_id"))}:
            return True
        vids = mig.get("legacy_variation_ids", [])
        return isinstance(vids, list) and legacy_id in {_txt(x) for x in vids}
    return False

def resolve_post_cutover_master(*, business_id: str, target_company_id: int, legacy_id: str, kind: str, M=None):
    """Resolve a split-aware master without requiring duplicate LegacyObjectMap rows.

    LegacyObjectMap is globally unique by source_system/source_table/legacy_id, so a
    shared legacy master cannot have one map per split Company. B22 clones retain
    migration identity in extra_data; this resolver uses that identity inside the
    requested target Company and falls back to the canonical legacy map.
    """
    M = M or _models()
    model = M["BusinessParty"] if kind == "contact" else M["CatalogItem"]
    tables = ("contacts",) if kind == "contact" else ("variations", "products")

    # First prefer an object already in the requested target Company.
    for obj in model.objects.filter(company_id=target_company_id).iterator():
        if _pc_master_matches_legacy(obj, legacy_id=legacy_id, kind=kind):
            return obj

    # Canonical map may itself already point to the requested Company.
    canonical = None
    for table in tables:
        mapping = M["LegacyObjectMap"].objects.filter(
            source_system=SOURCE_SYSTEM,
            legacy_company_id=_txt(business_id),
            source_table=table,
            legacy_id=_txt(legacy_id),
        ).first()
        if mapping is None:
            continue
        obj = mapping.target_object
        if obj is not None and isinstance(obj, model):
            canonical = obj
            if int(obj.company_id) == int(target_company_id):
                return obj
            break

    # B22 split clones can predate explicit legacy identity in extra_data.
    # Resolve only one unambiguous stable-identity match; ambiguity fails closed.
    if canonical is not None:
        identity_fields=[name for name in ("code","sku","name") if any(f.name==name for f in model._meta.concrete_fields) and _txt(getattr(canonical,name,""))]
        target_qs=model.objects.filter(company_id=target_company_id)
        candidate_ids=set()
        for name in identity_fields:
            for pk in target_qs.filter(**{name:getattr(canonical,name,None)}).values_list("pk",flat=True):
                candidate_ids.add(pk)
        if candidate_ids:
            candidates=list(model.objects.filter(pk__in=candidate_ids))
            compatible=[candidate for candidate in candidates if all(not _txt(getattr(candidate,name,"")) or _txt(getattr(candidate,name,""))==_txt(getattr(canonical,name,"")) for name in identity_fields)]
            if len(compatible)==1:
                return compatible[0]
            raise MhamSyncError(
                f"POST_CUTOVER_MASTER_RESOLVE_AMBIGUOUS model={model._meta.label} business={business_id} "
                f"legacy={legacy_id} target_company={target_company_id} canonical_pk={canonical.pk} "
                f"identity_fields={identity_fields} candidate_ids={sorted(candidate_ids)} "
                f"compatible_ids={[x.pk for x in compatible]}"
            )
    return None


def _pc_clone_model_to_company(obj, *, target_company_id: int, M):
    model=obj.__class__
    values={}
    for field in model._meta.concrete_fields:
        if field.primary_key or field.auto_created:
            continue
        if field.name in {"company","created_at","updated_at"}:
            continue
        if field.is_relation:
            values[field.attname]=getattr(obj,field.attname)
        else:
            values[field.name]=getattr(obj,field.name)
    values["company_id"]=int(target_company_id)

    # Split foundation already cloned company-scoped CatalogCategory/CatalogUnit.
    # Rebind those FKs by stable code/name rather than retaining a cross-company FK.
    for fk_name, model_name in (("category","CatalogCategory"),("unit","CatalogUnit")):
        att=fk_name+"_id"
        source_id=values.get(att)
        if not source_id:
            continue
        source=M[model_name].objects.filter(pk=source_id).first()
        target=None
        if source is not None:
            if hasattr(source,"code") and _txt(getattr(source,"code","")):
                target=M[model_name].objects.filter(company_id=target_company_id,code=source.code).first()
            if target is None and hasattr(source,"name") and _txt(getattr(source,"name","")):
                target=M[model_name].objects.filter(company_id=target_company_id,name=source.name).first()
        if target is None:
            raise MhamSyncError(f"POST_CUTOVER_MASTER_DEPENDENCY_MISSING {model_name} source={source_id} target_company={target_company_id}")
        values[att]=target.pk

    # B22 may already have cloned this master into the target company while
    # preserving business uniqueness but without legacy identity in extra_data.
    # Reuse only an unambiguous object whose available stable identity fields
    # agree with the canonical object. Never mutate code/SKU/name to force a clone.
    identity_fields=[
        name for name in ("code","sku","name")
        if any(f.name==name for f in model._meta.concrete_fields)
        and _txt(getattr(obj,name,""))
    ]
    collision_qs=model.objects.filter(company_id=target_company_id)
    collision_ids=set()
    for name in identity_fields:
        value=getattr(obj,name,None)
        for pk in collision_qs.filter(**{name:value}).values_list("pk",flat=True):
            collision_ids.add(pk)
    if collision_ids:
        candidates=list(model.objects.filter(pk__in=collision_ids))
        compatible=[]
        for candidate in candidates:
            if all(
                not _txt(getattr(candidate,name,""))
                or _txt(getattr(candidate,name,""))==_txt(getattr(obj,name,""))
                for name in identity_fields
            ):
                compatible.append(candidate)
        if len(compatible)==1:
            return compatible[0]
        raise MhamSyncError(
            f"POST_CUTOVER_MASTER_IDENTITY_COLLISION model={model._meta.label} "
            f"target_company={target_company_id} source_pk={obj.pk} "
            f"identity_fields={identity_fields} collision_ids={sorted(collision_ids)} "
            f"compatible_ids={[x.pk for x in compatible]}"
        )

    clone=model(**values)
    clone.full_clean()
    clone.save()
    return clone


def materialize_post_cutover_master(*, business_id: str, target_company_id: int, legacy_id: str, kind: str, live: dict[str, Any], M=None, v13=None):
    """Ensure a split-aware master exists in target company.

    Existing target object -> reuse.
    Existing canonical object in another split company -> clone.
    New live contact -> create a BusinessParty from the live source.
    New item without any canonical representation -> fail closed; catalog creation
    needs the complete product/unit/tax contract and is not guessed here.
    """
    M=M or _models()
    v13=v13 or _load_v13()
    existing=resolve_post_cutover_master(
        business_id=business_id,target_company_id=target_company_id,
        legacy_id=legacy_id,kind=kind,M=M,
    )
    if existing is not None:
        return existing,"REUSE"

    model=M["BusinessParty"] if kind=="contact" else M["CatalogItem"]
    tables=("contacts",) if kind=="contact" else ("variations","products")
    canonical=None
    for table in tables:
        mp=M["LegacyObjectMap"].objects.filter(
            source_system=SOURCE_SYSTEM,legacy_company_id=business_id,
            source_table=table,legacy_id=_txt(legacy_id),
        ).select_related("target_content_type").first()
        obj=getattr(mp,"target_object",None) if mp is not None else None
        if obj is not None and isinstance(obj,model):
            canonical=obj
            break
    if canonical is not None:
        clone=_pc_clone_model_to_company(canonical,target_company_id=target_company_id,M=M)
        return clone,"CLONE_EXISTING"

    if kind!="contact":
        raise MhamSyncError(
            f"POST_CUTOVER_NEW_ITEM_REQUIRES_CATALOG_CONTRACT business={business_id} legacy={legacy_id} target={target_company_id}"
        )

    row=next((x for x in live.get("contacts",[]) if isinstance(x,dict) and _txt(x.get("id"))==_txt(legacy_id)),None)
    if row is None:
        raise MhamSyncError(
            f"POST_CUTOVER_CONTACT_NOT_IN_LIVE business={business_id} legacy={legacy_id}"
        )

    BP=M["BusinessParty"]
    raw=_txt(row.get("type")).lower()
    pref=["SUPPLIER"] if raw=="supplier" else (["BOTH","CUSTOMER"] if raw=="both" else ["CUSTOMER"])
    org=bool(_txt(row.get("supplier_business_name")))
    display=(
        _txt(row.get("supplier_business_name"))
        or " ".join(x for x in [_txt(row.get("first_name")),_txt(row.get("middle_name")),_txt(row.get("last_name"))] if x)
        or _txt(row.get("name"))
        or f"Legacy Contact {legacy_id}"
    )
    party=BP(
        company_id=int(target_company_id),branch=None,
        party_type=v13.choice(BP,"party_type",pref,pref[0]),
        party_kind=v13.choice(BP,"party_kind",["ORGANIZATION" if org else "INDIVIDUAL"],"ORGANIZATION" if org else "INDIVIDUAL"),
        status=v13.choice(BP,"status",["ACTIVE"],"ACTIVE"),
        code=v13.clean(BP,"code",_txt(row.get("contact_id")) or f"LEGACY-C-{legacy_id}"),
        display_name=v13.clean(BP,"display_name",display),
        legal_name=v13.clean(BP,"legal_name",_txt(row.get("supplier_business_name"))),
        contact_person=v13.clean(BP,"contact_person"," ".join(x for x in [_txt(row.get("first_name")),_txt(row.get("middle_name")),_txt(row.get("last_name"))] if x)),
        phone=v13.clean(BP,"phone",_txt(row.get("landline"))),
        mobile=v13.clean(BP,"mobile",_txt(row.get("mobile"))),
        whatsapp_number=v13.clean(BP,"whatsapp_number",_txt(row.get("mobile"))),
        email=v13.clean(BP,"email",_txt(row.get("email"))),
        commercial_registration=v13.clean(BP,"commercial_registration",_txt(row.get("commercial_registration"))),
        vat_number=v13.clean(BP,"vat_number",_txt(row.get("tax_number"))),
        country=v13.clean(BP,"country",_txt(row.get("country")) or "Saudi Arabia"),
        city=v13.clean(BP,"city",_txt(row.get("city"))),
        address_line=_txt(row.get("address_line_1") or row.get("shipping_address")),
        credit_limit=v13.dfield(BP,"credit_limit",row.get("credit_limit")),
        opening_balance=v13.dfield(BP,"opening_balance",0),
        payment_terms_days=max(0,int(v13.dec(row.get("pay_term_number") or 0))),
        tax_exempt=False,
        extra_data={"migration":{"source_system":SOURCE_SYSTEM,"legacy_id":_txt(legacy_id),"legacy_contact_id":_txt(legacy_id),"legacy_payload":row,"post_cutover":True}},
    )
    party.full_clean(); party.save()
    return party,"CREATE_FROM_LIVE"


POST_CUTOVER_OPERATION_MODELS={"sales":"SalesInvoice","purchases":"PurchaseBill","sale_returns":"SalesReturn","purchase_returns":"PurchaseReturn"}

def _pc_operation_identity(*,business_id:str,legacy_id:str,domain:str,payload=None):
    return {"source_system":SOURCE_SYSTEM,"legacy_company_id":_txt(business_id),"legacy_id":_txt(legacy_id),"post_cutover_domain":domain,"post_cutover":True,"source_payload":payload or {}}

def _pc_operation_matches(obj,*,business_id:str,legacy_id:str,domain:str)->bool:
    mig=_pc_extra_migration(obj)
    return _txt(mig.get("source_system"))==SOURCE_SYSTEM and _txt(mig.get("legacy_company_id"))==_txt(business_id) and _txt(mig.get("legacy_id"))==_txt(legacy_id) and _txt(mig.get("post_cutover_domain"))==domain

def resolve_post_cutover_operation(*,business_id:str,target_company_id:int,legacy_id:str,domain:str,M=None):
    M=M or _models()
    if domain in POST_CUTOVER_OPERATION_MODELS:
        model=M[POST_CUTOVER_OPERATION_MODELS[domain]]
        matches=[obj for obj in model.objects.filter(company_id=target_company_id).iterator() if _pc_operation_matches(obj,business_id=business_id,legacy_id=legacy_id,domain=domain)]
        if len(matches)>1: raise MhamSyncError(f"POST_CUTOVER_OPERATION_AMBIGUOUS domain={domain} business={business_id} legacy={legacy_id} target_company={target_company_id} ids={[x.pk for x in matches]}")
        return matches[0] if matches else None
    if domain=="payments":
        marker=f"post_cutover:{SOURCE_SYSTEM}:{business_id}:{legacy_id}";matches=[]
        for model_name in ("CustomerPayment","SupplierPayment"):
            matches.extend(obj for obj in M[model_name].objects.filter(company_id=target_company_id).iterator() if marker in _txt(getattr(obj,"notes","")))
        if len(matches)>1: raise MhamSyncError(f"POST_CUTOVER_OPERATION_AMBIGUOUS domain=payments business={business_id} legacy={legacy_id} target_company={target_company_id} ids={[x.pk for x in matches]}")
        return matches[0] if matches else None
    raise MhamSyncError(f"POST_CUTOVER_OPERATION_UNKNOWN_DOMAIN {domain}")

def _pc_target_branch(*,business_id:str,target_company_id:int,row:dict[str,Any],M):
    location=_pc_loc(row);targets=_pc_branch_targets(business_id,M)
    if targets.get(location)!=int(target_company_id): raise MhamSyncError(f"POST_CUTOVER_BRANCH_TARGET_MISMATCH business={business_id} location={location} planned={targets.get(location)} target={target_company_id}")
    mapping=M["LegacyObjectMap"].objects.filter(source_system=SOURCE_SYSTEM,legacy_company_id=business_id,source_table="business_locations",legacy_id=location).first()
    branch=M["Branch"].objects.filter(pk=_txt(getattr(mapping,"target_object_id","")),company_id=target_company_id).first()
    if branch is None: raise MhamSyncError(f"POST_CUTOVER_TARGET_BRANCH_MISSING business={business_id} location={location} target={target_company_id}")
    return branch

def _pc_live_row(live:dict[str,Any],domain:str,legacy_id:str):
    row=next((x for x in live.get(domain,[]) if isinstance(x,dict) and _pc_id(x)==_txt(legacy_id)),None)
    if row is None: raise MhamSyncError(f"POST_CUTOVER_LIVE_ROW_MISSING domain={domain} legacy={legacy_id}")
    return row

def apply_post_cutover_delta_foundation(*,business_id:str,live:dict[str,Any],plan:dict[str,Any],v13=None):
    if plan.get("unresolved"): raise MhamSyncError(f"POST_CUTOVER_APPLY_UNRESOLVED business={business_id} count={len(plan['unresolved'])}")
    if plan.get("ignored"): return {"status":"IGNORED","business_id":business_id,"routes":0}
    for route in plan.get("routes",[]):
        domain=_txt(route.get("domain"))
        if domain not in POST_CUTOVER_DOMAINS: raise MhamSyncError(f"POST_CUTOVER_APPLY_UNKNOWN_DOMAIN {domain}")
        if route.get("reason")!="EXPECTED_EXCLUDED" and not route.get("target_company_id"): raise MhamSyncError(f"POST_CUTOVER_APPLY_TARGET_MISSING domain={domain} legacy={route.get('legacy_id')}")
    return {"status":"FOUNDATION_ONLY","business_id":business_id,"routes":len(plan.get("routes",[])),"permanent_apply_enabled":False}


POST_CUTOVER_WRITER_DOMAINS=("sales","sale_returns","payments")

def _pc_writer_route_groups(plan):
    groups={k:[] for k in POST_CUTOVER_WRITER_DOMAINS}
    unsupported=[]
    excluded=0
    for route in plan.get("routes",[]):
        if route.get("reason")=="EXPECTED_EXCLUDED":
            excluded+=1
            continue
        domain=_txt(route.get("domain"))
        if domain in groups:
            groups[domain].append(route)
        else:
            unsupported.append(route)
    return groups,unsupported,excluded

def _pc_assert_writer_plan(*,business_id,plan):
    apply_post_cutover_delta_foundation(business_id=business_id,live={},plan=plan)
    groups,unsupported,excluded=_pc_writer_route_groups(plan)
    if unsupported:
        raise MhamSyncError(
            f"POST_CUTOVER_WRITER_UNSUPPORTED business={business_id} "
            f"count={len(unsupported)} sample={unsupported[:5]}"
        )
    return groups,excluded


def _pc_item_for_sale_line(*,business_id,target_company_id,line,live,M,v13):
    legacy_id=_txt(line.get("variation_id") or line.get("product_id"))
    if not legacy_id: raise MhamSyncError("POST_CUTOVER_LINE_ITEM_ID_MISSING")
    item=resolve_post_cutover_master(business_id=business_id,target_company_id=target_company_id,legacy_id=legacy_id,kind="item",M=M)
    if item is None:item,_=materialize_post_cutover_master(business_id=business_id,target_company_id=target_company_id,legacy_id=legacy_id,kind="item",live=live,M=M,v13=v13)
    return item

def _pc_pre_cutover_sale(*,business_id,target_company_id,legacy_id,M):
    mp=M["LegacyObjectMap"].objects.filter(source_system=SOURCE_SYSTEM,legacy_company_id=business_id,source_table="transactions_sell",legacy_id=_txt(legacy_id)).first()
    obj=getattr(mp,"target_object",None) if mp else None
    return obj if obj is not None and isinstance(obj,M["SalesInvoice"]) and int(obj.company_id)==int(target_company_id) else None

def _pc_write_sale(*,business_id,target_company_id,row,live,M,v13):
    lid=_pc_id(row);old=resolve_post_cutover_operation(business_id=business_id,target_company_id=target_company_id,legacy_id=lid,domain="sales",M=M)
    if old is not None:return old,0,"REUSE"
    branch=_pc_target_branch(business_id=business_id,target_company_id=target_company_id,row=row,M=M);cid=_txt(row.get("contact_id"))
    customer=resolve_post_cutover_master(business_id=business_id,target_company_id=target_company_id,legacy_id=cid,kind="contact",M=M)
    if customer is None:customer,_=materialize_post_cutover_master(business_id=business_id,target_company_id=target_company_id,legacy_id=cid,kind="contact",live=live,M=M,v13=v13)
    SI=M["SalesInvoice"];SII=M["SalesInvoiceItem"];subtotal=v13.dfield(SI,"subtotal",row.get("total_before_tax") or row.get("final_total"));tax=v13.dfield(SI,"tax_amount",row.get("tax_amount"));discount=v13.dfield(SI,"discount_amount",row.get("discount_amount"));total=v13.dfield(SI,"total_amount",row.get("final_total"));paid=v13.dfield(SI,"paid_amount",total if _txt(row.get("payment_status")).lower()=="paid" else 0)
    number=v13.clean(SI,"invoice_number",_txt(row.get("invoice_no")) or f"MHAM-PC-S-{business_id}-{lid}")
    if SI.objects.filter(company_id=target_company_id,invoice_number=number).exists():
        number=v13.clean(SI,"invoice_number",f"MHAM-PC-S-{business_id}-{lid}")
        if SI.objects.filter(company_id=target_company_id,invoice_number=number).exists():raise MhamSyncError(f"POST_CUTOVER_INVOICE_NUMBER_COLLISION {business_id} {lid} {target_company_id}")
    inv=SI(company_id=target_company_id,branch=branch,customer=customer,invoice_number=number,status=v13.choice(SI,"status",["ISSUED","POSTED","DRAFT"],""),payment_status=v13.choice(SI,"payment_status",["PAID"] if paid>=total and total>0 else ["UNPAID","DUE","PARTIAL"],""),source=v13.choice(SI,"source",["MIGRATION","MANUAL"],""),invoice_date=v13.pdate(row.get("transaction_date"),v13.date.today()),due_date=v13.pdate(row.get("transaction_date"),v13.date.today()),issued_at=timezone.now(),subtotal=subtotal,discount_amount=discount,taxable_amount=v13.dfield(SI,"taxable_amount",max(v13.Decimal("0"),subtotal-discount)),tax_amount=tax,total_amount=total,paid_amount=paid,balance_due=v13.dfield(SI,"balance_due",max(v13.Decimal("0"),total-paid)),currency_code="SAR",customer_snapshot={"legacy_contact_id":cid,"name":customer.display_name},billing_address_snapshot={},tax_snapshot={"legacy_tax_amount":_txt(row.get("tax_amount"))},extra_data={"migration":_pc_operation_identity(business_id=business_id,legacy_id=lid,domain="sales",payload=row)},public_notes=_txt(row.get("additional_notes")),internal_notes=_txt(row.get("staff_note")))
    inv.full_clean();inv.save();lines=v13.tx_lines(row,"sell")
    if not lines:raise MhamSyncError(f"POST_CUTOVER_SALE_NO_LINES {lid}")
    created=0
    for no,line in enumerate(lines,1):
        qty=v13.dfield(SII,"quantity",line.get("quantity"))
        if qty<=0:continue
        item=_pc_item_for_sale_line(business_id=business_id,target_company_id=target_company_id,line=line,live=live,M=M,v13=v13);price=v13.dfield(SII,"unit_price",line.get("unit_price_before_discount") or line.get("unit_price"));sub=v13.dfield(SII,"line_subtotal",qty*price);disc=v13.dfield(SII,"discount_amount",line.get("line_discount_amount"));ltax=v13.dfield(SII,"tax_amount",line.get("item_tax"));active=_txt(getattr(item,"status","")).upper()=="ACTIVE"
        it=SII(invoice=inv,company_id=target_company_id,catalog_item=item if active else None,line_number=no,item_code_snapshot=item.code,item_name_snapshot=item.name,item_description_snapshot=item.description,unit_name_snapshot=getattr(getattr(item,"unit",None),"name",""),quantity=qty,unit_price=price,line_subtotal=sub,discount_amount=disc,taxable=bool(ltax or getattr(item,"taxable",False)),tax_rate=v13.dfield(SII,"tax_rate",getattr(item,"tax_rate",0)),taxable_amount=v13.dfield(SII,"taxable_amount",max(v13.Decimal("0"),sub-disc)),tax_amount=ltax,line_total=v13.dfield(SII,"line_total",sub-disc+ltax),extra_data={"migration":{"source_system":SOURCE_SYSTEM,"legacy_company_id":business_id,"legacy_line_id":_pc_id(line),"post_cutover":True,"source_line":line}})
        it.full_clean();it.save();created+=1
    return inv,created,"CREATE"

def _pc_write_sale_return(*,business_id,target_company_id,row,M,v13):
    lid=_pc_id(row);old=resolve_post_cutover_operation(business_id=business_id,target_company_id=target_company_id,legacy_id=lid,domain="sale_returns",M=M)
    if old is not None:return old,"REUSE"
    parent=_txt(row.get("return_parent_id") or row.get("parent_transaction_id") or row.get("original_transaction_id"));inv=resolve_post_cutover_operation(business_id=business_id,target_company_id=target_company_id,legacy_id=parent,domain="sales",M=M) or _pc_pre_cutover_sale(business_id=business_id,target_company_id=target_company_id,legacy_id=parent,M=M)
    if inv is None:raise MhamSyncError(f"POST_CUTOVER_RETURN_PARENT_MISSING {business_id} {lid} {parent} {target_company_id}")
    rdate=v13.pdate(row.get("transaction_date"),v13.date.today());sub=v13.dec(row.get("total_before_tax") or row.get("final_total"));disc=v13.dec(row.get("discount_amount"));tax=v13.dec(row.get("tax_amount"));total=v13.dec(row.get("final_total"))
    if rdate<inv.invoice_date or sub<0 or disc<0 or tax<0 or total<0 or disc>sub:raise MhamSyncError(f"POST_CUTOVER_RETURN_NOT_REPRESENTABLE {lid}")
    SR=M["SalesReturn"];wh=M["Warehouse"].objects.filter(company_id=target_company_id,branch_id=inv.branch_id).order_by("id").first();ret=SR(company_id=target_company_id,branch=inv.branch,customer=inv.customer,invoice=inv,return_warehouse=wh,return_number=v13.clean(SR,"return_number",f"MHAM-PC-SR-{business_id}-{lid}"),status=v13.choice(SR,"status",["POSTED","CONFIRMED","DRAFT"],""),reason=v13.choice(SR,"reason",["OTHER","CUSTOMER_RETURN"],""),reason_details="Imported MhamCloud post-cutover sale return",return_date=rdate,confirmed_at=timezone.now(),posted_at=timezone.now(),subtotal=v13.dfield(SR,"subtotal",sub),discount_amount=v13.dfield(SR,"discount_amount",disc),taxable_amount=v13.dfield(SR,"taxable_amount",sub),tax_amount=v13.dfield(SR,"tax_amount",tax),total_amount=v13.dfield(SR,"total_amount",total),currency_code="SAR",customer_snapshot=inv.customer_snapshot,invoice_snapshot={"id":inv.pk,"invoice_number":inv.invoice_number},tax_snapshot=inv.tax_snapshot,extra_data={"migration":_pc_operation_identity(business_id=business_id,legacy_id=lid,domain="sale_returns",payload=row)})
    ret.full_clean();ret.save();return ret,"CREATE"

def _pc_write_payment(*,business_id,target_company_id,row,live,M,v13):
    lid=_pc_id(row);old=resolve_post_cutover_operation(business_id=business_id,target_company_id=target_company_id,legacy_id=lid,domain="payments",M=M)
    if old is not None:return old,"REUSE"
    amount=v13.dec(row.get("amount"))
    if amount<=0:raise MhamSyncError(f"POST_CUTOVER_PAYMENT_NONPOSITIVE {lid} {amount}")
    txid=_txt(row.get("transaction_id"));inv=resolve_post_cutover_operation(business_id=business_id,target_company_id=target_company_id,legacy_id=txid,domain="sales",M=M) if txid else None
    if inv is None and txid:inv=_pc_pre_cutover_sale(business_id=business_id,target_company_id=target_company_id,legacy_id=txid,M=M)
    source_sale=next((x for x in live.get("sales",[]) if _pc_id(x)==txid),{});cid=_txt(source_sale.get("contact_id"));customer=inv.customer if inv is not None else (resolve_post_cutover_master(business_id=business_id,target_company_id=target_company_id,legacy_id=cid,kind="contact",M=M) if cid else None)
    if customer is None:raise MhamSyncError(f"POST_CUTOVER_PAYMENT_CUSTOMER_MISSING {lid} {txid}")
    raw=_txt(row.get("method"));method=v13.payment_method(raw);bp=v13.treasury_blueprint(raw);account=M["TreasuryAccount"].objects.filter(company_id=target_company_id,code=bp["code"]).first()
    if account is None or not getattr(account,"accounting_account_id",None):raise MhamSyncError(f"POST_CUTOVER_TREASURY_MISSING {target_company_id} {bp['code']}")
    CP=M["CustomerPayment"];marker=f"post_cutover:{SOURCE_SYSTEM}:{business_id}:{lid}";note=f"Imported legacy payment; {marker}; raw_method={raw or '<empty>'}; normalized_method={method}."
    pay=CP(company_id=target_company_id,payment_number=v13.clean(CP,"payment_number",f"MHAM-PC-CP-{business_id}-{lid}"),customer_id=customer.pk,customer_name=customer.display_name,customer_phone=getattr(customer,"mobile",""),counterparty_type=v13.choice(CP,"counterparty_type",["CUSTOMER"],"CUSTOMER"),counterparty_id=str(customer.pk),counterparty_name=customer.display_name,counterparty_phone=getattr(customer,"mobile",""),counterparty_account=None,sales_invoice=inv,treasury_account=account,amount=v13.dfield(CP,"amount",amount),currency="SAR",payment_method=v13.choice(CP,"payment_method",[method,"OTHER","CASH","CARD","BANK_TRANSFER"],method),status=v13.choice(CP,"status",["CONFIRMED","POSTED","DRAFT"],""),payment_date=v13.pdate(row.get("paid_on"),v13.date.today()),reference=v13.clean(CP,"reference",_txt(row.get("payment_ref_no")) or f"MHAM-PC-PAY-{lid}"),description=note,notes=note,confirmed_at=timezone.now(),is_accounting_posted=False)
    v13.normalize_instance_text_lengths(pay,business_id=business_id,source_table="transaction_payments",source_id=lid);pay.full_clean();pay.save();return pay,"CREATE"

def apply_post_cutover_delta_writer(*,business_id,live,plan,v13=None,M=None):
    v13=v13 or _load_v13();M=M or _models();groups,excluded=_pc_assert_writer_plan(business_id=business_id,plan=plan);counts={"expected_excluded":excluded}
    for r in groups["sales"]:
        _,n,a=_pc_write_sale(business_id=business_id,target_company_id=int(r["target_company_id"]),row=_pc_live_row(live,"sales",r["legacy_id"]),live=live,M=M,v13=v13);counts["sales_"+a]=counts.get("sales_"+a,0)+1;counts["sale_lines_CREATE"]=counts.get("sale_lines_CREATE",0)+n
    for r in groups["sale_returns"]:
        _,a=_pc_write_sale_return(business_id=business_id,target_company_id=int(r["target_company_id"]),row=_pc_live_row(live,"sale_returns",r["legacy_id"]),M=M,v13=v13);counts["sale_returns_"+a]=counts.get("sale_returns_"+a,0)+1
    for r in groups["payments"]:
        _,a=_pc_write_payment(business_id=business_id,target_company_id=int(r["target_company_id"]),row=_pc_live_row(live,"payments",r["legacy_id"]),live=live,M=M,v13=v13);counts["payments_"+a]=counts.get("payments_"+a,0)+1
    return counts

POST_CUTOVER_STABILITY_MAX_ATTEMPTS = 3

def collect_stable_post_cutover_source(*, business_id: str, company_row, token: str, v13=None, max_attempts: int = POST_CUTOVER_STABILITY_MAX_ATTEMPTS):
    """Retry complete live collects when cross-endpoint races produce unresolved routes."""
    v13 = v13 or _load_v13()
    attempts = max(1, int(max_attempts))
    last_plan = None
    for attempt in range(1, attempts + 1):
        live = v13.collect_source(business_id, company_row, token)
        plan = build_post_cutover_delta_plan(business_id=business_id, live=live)
        last_plan = plan
        unresolved = list(plan.get("unresolved") or [])
        if not unresolved:
            return live, plan, attempt
        print(f"POST_CUTOVER_STABILITY_RETRY business={business_id} attempt={attempt}/{attempts} unresolved={len(unresolved)}")
    sample = (last_plan or {}).get("unresolved", [])[:10]
    raise MhamSyncError(f"Post-cutover source remained unresolved after {attempts} complete collects for business {business_id}: {sample}")

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

                # Post-cutover safety: decision-affected businesses cannot use
                # the legacy one-business -> one-company destructive refresher.
                assert_legacy_apply_allowed(business_id, scan_only=False)

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



def sync_post_cutover_business_ids(business_ids:list[str],*,scan_only:bool=False)->dict[str,Any]:
    """Incremental post-cutover writer for B22 topology-affected legacy businesses."""
    _acquire_lock();started=datetime.now(dt_timezone.utc)
    try:
        credentials=load_background_credentials()
        missing=[n for n in ("MHAM_LEGACY_CLIENT_ID","MHAM_LEGACY_USERNAME","MHAM_LEGACY_PASSWORD") if not _txt(credentials.get(n))]
        if missing:raise MhamSyncError("Missing OAuth credentials: "+",".join(missing))
        v13=_load_v13();token=v13.auth_token();companies=v13.fetch_cursor("/companies",token,"mham-post-cutover:companies");M=_models()
        ordered=sorted({_txt(x) for x in business_ids if _txt(x)},key=lambda x:int(x) if x.isdigit() else 10**18)
        results=[];changed_ids=[];failures={}
        for index,bid in enumerate(ordered,1):
            print(f"\\n=== MHAM POST-CUTOVER {index}/{len(ordered)} BUSINESS_ID={bid} ===",flush=True)
            try:
                decision=decision_for(bid)
                if decision is None:raise MhamSyncError(f"No post-cutover topology decision for {bid}")
                company_row=_company_row_by_id(companies,bid)
                live,plan,attempts=collect_stable_post_cutover_source(business_id=bid,company_row=company_row,token=token,v13=v13)
                wrapper=_cache_wrapper(bid);before=_txt((wrapper or {}).get("source_checksum"));after=v13.sha(live)
                if plan.get("ignored"):
                    results.append({"business_id":bid,"status":"POST_CUTOVER_IGNORED","before_checksum":before,"after_checksum":after,"attempts":attempts,"counts":plan.get("counts",{})})
                    continue
                groups,excluded=_pc_assert_writer_plan(business_id=bid,plan=plan)
                actionable=sum(len(v) for v in groups.values())
                if actionable==0:
                    results.append({"business_id":bid,"status":"UNCHANGED","before_checksum":before,"after_checksum":after,"attempts":attempts,"counts":{"expected_excluded":excluded}})
                    continue
                changed_ids.append(bid)
                if scan_only:
                    results.append({"business_id":bid,"status":"CHANGED_SCAN_ONLY","before_checksum":before,"after_checksum":after,"attempts":attempts,"counts":plan.get("counts",{})})
                    continue
                with transaction.atomic():
                    counts=apply_post_cutover_delta_writer(business_id=bid,live=live,plan=plan,v13=v13,M=M)
                    verify=[]
                    for route in plan.get("routes",[]):
                        if route.get("reason")=="EXPECTED_EXCLUDED":continue
                        obj=resolve_post_cutover_operation(business_id=bid,target_company_id=int(route["target_company_id"]),legacy_id=route["legacy_id"],domain=route["domain"],M=M)
                        if obj is None or int(obj.company_id)!=int(route["target_company_id"]):verify.append(route)
                    if verify:raise MhamSyncError(f"POST_CUTOVER_PRECOMMIT_VERIFY_FAILED business={bid} count={len(verify)} sample={verify[:5]}")
                v13.save_source_cache(bid,live)
                results.append({"business_id":bid,"status":"POST_CUTOVER_APPLIED","before_checksum":before,"after_checksum":after,"attempts":attempts,"counts":counts})
                print(f"POST_CUTOVER_APPLY=PASS BUSINESS_ID={bid} COUNTS={counts}",flush=True)
            except Exception as exc:
                error=f"{type(exc).__name__}: {exc}"[:2000];failures[bid]=error;results.append({"business_id":bid,"status":"FAIL","error":error})
                print(f"POST_CUTOVER_APPLY=FAIL BUSINESS_ID={bid} ERROR={error}",flush=True)
        payload={"started_at_utc":started.isoformat(),"completed_at_utc":datetime.now(dt_timezone.utc).isoformat(),"requested_business_count":len(ordered),"changed_business_count":len(changed_ids),"changed_business_ids":changed_ids,"failure_count":len(failures),"failures":failures,"scan_only":scan_only,"results":results,"mode":"POST_CUTOVER"}
        return payload
    finally:_release_lock()

def run_management_sync(*,business_ids:list[str]|None=None,all_eligible:bool=False,scan_only:bool=False)->dict[str,Any]:
    """UI/management dispatcher: B22-affected -> incremental writer; normal -> frozen legacy path."""
    requested=eligible_business_ids() if all_eligible else sorted({_txt(x) for x in (business_ids or []) if _txt(x)},key=lambda x:int(x) if x.isdigit() else 10**18)
    if not requested:raise MhamSyncError("No business ids requested.")
    affected=[bid for bid in requested if decision_for(bid) is not None]
    normal=[bid for bid in requested if decision_for(bid) is None]
    parts=[]
    if normal:parts.append(sync_business_ids(normal,scan_only=scan_only))
    if affected:parts.append(sync_post_cutover_business_ids(affected,scan_only=scan_only))
    results=[];failures={};changed=[]
    for part in parts:
        results.extend(part.get("results") or []);failures.update(part.get("failures") or {});changed.extend(part.get("changed_business_ids") or [])
    payload={"started_at_utc":min((p.get("started_at_utc","") for p in parts),default=datetime.now(dt_timezone.utc).isoformat()),"completed_at_utc":datetime.now(dt_timezone.utc).isoformat(),"requested_business_count":len(requested),"changed_business_count":len(set(changed)),"changed_business_ids":sorted(set(changed),key=lambda x:int(x) if str(x).isdigit() else 10**18),"failure_count":len(failures),"failures":failures,"scan_only":scan_only,"results":results,"mode":"POST_CUTOVER_DISPATCH"}
    STATE_FILE.parent.mkdir(parents=True,exist_ok=True);STATE_FILE.write_text(json.dumps(payload,ensure_ascii=False,indent=2,default=str),encoding="utf-8")
    return payload

def eligible_business_ids() -> list[str]:
    return sorted(
        _eligible_name_map().keys(),
        key=lambda x: int(x) if x.isdigit() else 10**18,
    )


def run_full_background_cycle(*, scan_only: bool = False) -> dict[str, Any]:
    summary = topology_summary()
    print(
        "POST_CUTOVER_TOPOLOGY "
        f"EXCLUDE={summary['EXCLUDE']} "
        f"PARTIAL={summary['PARTIAL_INCLUDE']} "
        f"SPLIT={summary['SPLIT']} "
        f"SPLIT_GROUPS={summary['SPLIT_GROUPS']} "
        f"SCAN_ONLY={'YES' if scan_only else 'NO'}",
        flush=True,
    )
    # The current migration API has no webhook/updated_since contract.
    # Therefore background convergence is a periodic read-only source scan.
    # Primey writes occur only for checksum-changed tenants.
    return sync_business_ids(
        eligible_business_ids(),
        scan_only=scan_only,
    )

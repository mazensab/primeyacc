#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
REPORT = ROOT / "v2_company_split_a2_decision_audit_v3.txt"
SOURCE_SYSTEM = "mhamcloud_v1"
SOURCE_CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"

EXPECTED_IDS = {
    "75", "76", "88", "113", "119", "174", "188", "195",
    "290", "299", "307", "429", "431", "473", "478", "556",
}

def clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).replace("\r", " ").replace("\n", " ").strip()

def natural_key(v: Any):
    s = clean(v)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())

def yesno(v: Any) -> str:
    if v is None:
        return ""
    return "YES" if bool(v) else "NO"

def iso(v: Any) -> str:
    if v in (None, ""):
        return ""
    try:
        return v.isoformat()
    except Exception:
        return clean(v)

def progress(msg: str):
    print(msg, flush=True)

def git(*args: str) -> str:
    cp = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if cp.returncode:
        return f"ERROR[{cp.returncode}] {clean(cp.stderr)}"
    return cp.stdout.strip()

def detect_settings() -> str:
    current = os.environ.get("DJANGO_SETTINGS_MODULE", "").strip()
    if current:
        return current
    manage = ROOT / "manage.py"
    if not manage.exists():
        raise RuntimeError("manage.py not found; run from project root")
    raw = manage.read_text(encoding="utf-8", errors="replace")
    m = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not m:
        raise RuntimeError("Could not detect DJANGO_SETTINGS_MODULE")
    return m.group(1)

def first_attr(obj: Any, names: tuple[str, ...], default: Any = "") -> Any:
    if obj is None:
        return default
    for name in names:
        if hasattr(obj, name):
            try:
                value = getattr(obj, name)
            except Exception:
                continue
            if value not in (None, ""):
                return value
    return default

def model_label(model) -> str:
    return f"{model._meta.app_label}.{model.__name__}"

def direct_fk_fields(model, target_model):
    out = []
    for f in model._meta.get_fields():
        if not getattr(f, "concrete", False):
            continue
        remote = getattr(f, "remote_field", None)
        related = getattr(remote, "model", None) if remote else None
        if related is target_model and (
            getattr(f, "many_to_one", False) or getattr(f, "one_to_one", False)
        ):
            out.append(f)
    return out

def m2m_fields(model, target_model):
    out = []
    for f in model._meta.get_fields():
        if not getattr(f, "many_to_many", False):
            continue
        remote = getattr(f, "remote_field", None)
        related = getattr(remote, "model", None) if remote else None
        if related is target_model:
            out.append(f)
    return out

def cache_summary(payload: Any, prefix="$", depth=0):
    if depth > 2 or not isinstance(payload, dict):
        return []
    out = []
    for key in sorted(payload.keys(), key=str):
        value = payload[key]
        path = f"{prefix}.{key}"
        if isinstance(value, list):
            out.append(f"{path}=LIST[{len(value)}]")
        elif isinstance(value, dict):
            out.append(f"{path}=DICT[{len(value)}]")
            out.extend(cache_summary(value, path, depth + 1))
    return out

def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A2 V3 DECISION AUDIT",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={git('branch', '--show-current')}",
        f"HEAD={git('rev-parse', 'HEAD')}",
        f"ORIGIN_MAIN={git('rev-parse', 'origin/main')}",
    ]

    tracked = git("status", "--short", "--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not tracked else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        progress("[A2V3] 1/6 Loading Django...")
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.contrib.auth import get_user_model
        from django.db import connection

        Company = apps.get_model("companies", "Company")
        Branch = apps.get_model("companies", "Branch")
        Membership = apps.get_model("accounts", "CompanyMembership")
        Subscription = apps.get_model("subscriptions", "CompanySubscription")
        LegacyObjectMap = apps.get_model("business_controls", "LegacyObjectMap")
        User = get_user_model()

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Safety stop: expected PostgreSQL, got {connection.vendor}")

        # Session-level read-only safety.
        with connection.cursor() as cursor:
            cursor.execute("SET default_transaction_read_only = on")
            cursor.execute("SET statement_timeout = 8000")

        lines.extend([
            f"DJANGO_SETTINGS_MODULE={os.environ['DJANGO_SETTINGS_MODULE']}",
            f"DEFAULT_DB_VENDOR={connection.vendor}",
            "SESSION_DEFAULT_TRANSACTION_READ_ONLY=ON",
            "STATEMENT_TIMEOUT_MS=8000",
        ])

        progress("[A2V3] 2/6 Loading migration maps...")
        maps = LegacyObjectMap.objects.filter(source_system=SOURCE_SYSTEM)

        company_maps = list(maps.filter(source_table="business").select_related("company"))
        branch_maps = list(maps.filter(source_table="business_locations"))
        user_maps = list(maps.filter(source_table="users"))
        subscription_maps = list(maps.filter(source_table="subscriptions"))

        company_map_by_legacy = {clean(m.legacy_id): m for m in company_maps}
        branches_by_company = defaultdict(list)
        users_by_company = defaultdict(list)
        subs_by_company = defaultdict(list)

        for m in branch_maps:
            branches_by_company[clean(m.legacy_company_id)].append(m)
        for m in user_maps:
            users_by_company[clean(m.legacy_company_id)].append(m)
        for m in subscription_maps:
            subs_by_company[clean(m.legacy_company_id)].append(m)

        derived = {
            lid for lid in company_map_by_legacy
            if len(branches_by_company.get(lid, [])) >= 3
        }

        lines.extend([
            "",
            "===== A1 FREEZE RECONCILIATION =====",
            f"EXPECTED_THREE_PLUS_COUNT={len(EXPECTED_IDS)}",
            f"DERIVED_THREE_PLUS_COUNT={len(derived)}",
            f"EXPECTED_IDS={','.join(sorted(EXPECTED_IDS, key=natural_key))}",
            f"DERIVED_IDS={','.join(sorted(derived, key=natural_key))}",
        ])

        if derived != EXPECTED_IDS:
            raise RuntimeError(
                f"A1/A2 scope mismatch: missing={sorted(EXPECTED_IDS-derived, key=natural_key)} "
                f"extra={sorted(derived-EXPECTED_IDS, key=natural_key)}"
            )

        company_id_by_legacy = {}
        branch_id_by_legacy = {}
        user_id_by_pair = {}

        for lid in EXPECTED_IDS:
            cmap = company_map_by_legacy[lid]
            raw = clean(cmap.target_object_id) or clean(cmap.company_id)
            if not raw.isdigit():
                raise RuntimeError(f"Missing current company target for legacy company {lid}")
            company_id_by_legacy[lid] = int(raw)

            for bm in branches_by_company[lid]:
                rb = clean(bm.target_object_id)
                if rb.isdigit():
                    branch_id_by_legacy[clean(bm.legacy_id)] = int(rb)

            for um in users_by_company[lid]:
                ru = clean(um.target_object_id)
                if ru.isdigit():
                    user_id_by_pair[(lid, clean(um.legacy_id))] = int(ru)

        company_ids = sorted(set(company_id_by_legacy.values()))
        branch_ids = sorted(set(branch_id_by_legacy.values()))
        user_ids = sorted(set(user_id_by_pair.values()))

        companies = Company.objects.in_bulk(company_ids)
        branches = Branch.objects.in_bulk(branch_ids)
        users = User.objects.in_bulk(user_ids)

        memberships = list(
            Membership.objects.filter(company_id__in=company_ids)
            .select_related("user", "company")
            .order_by("company_id", "id")
        )
        memberships_by_company = defaultdict(list)
        for m in memberships:
            memberships_by_company[int(m.company_id)].append(m)

        subscriptions = list(
            Subscription.objects.filter(company_id__in=company_ids)
            .select_related("plan")
            .order_by("company_id", "start_date", "id")
        )
        subscription_rows_by_company = defaultdict(list)
        for s in subscriptions:
            subscription_rows_by_company[int(s.company_id)].append(s)

        sub_map_by_target = {}
        for lid, smaps in subs_by_company.items():
            for sm in smaps:
                sub_map_by_target[(lid, clean(sm.target_object_id))] = sm

        progress("[A2V3] 3/6 Discovering Branch access contracts...")
        branch_fk_contracts = []
        access_fk_contracts = []
        access_m2m_contracts = []

        for model in apps.get_models():
            if model._meta.proxy or not model._meta.managed:
                continue
            bfields = direct_fk_fields(model, Branch)
            mfields = direct_fk_fields(model, Membership)
            ufields = direct_fk_fields(model, User)

            for bf in bfields:
                branch_fk_contracts.append((model, bf))
                for mf in mfields:
                    access_fk_contracts.append((model, bf, mf, None))
                for uf in ufields:
                    access_fk_contracts.append((model, bf, None, uf))

            for f in m2m_fields(model, Branch):
                if model is Membership:
                    access_m2m_contracts.append((model, f, "membership"))
                elif model is User:
                    access_m2m_contracts.append((model, f, "user"))

        lines.extend([
            "",
            "===== BRANCH CONTRACT INVENTORY =====",
            f"BRANCH_FK_CONTRACT_COUNT={len(branch_fk_contracts)}",
            f"ACCESS_FK_CONTRACT_COUNT={len(access_fk_contracts)}",
            f"ACCESS_M2M_CONTRACT_COUNT={len(access_m2m_contracts)}",
            "BRANCH_FK_CONTRACTS_BEGIN",
        ])
        for model, field in sorted(branch_fk_contracts, key=lambda x: (model_label(x[0]), x[1].name)):
            lines.append(f"{model_label(model)}.{field.name}")
        lines.append("BRANCH_FK_CONTRACTS_END")

        access_by_membership = defaultdict(set)
        access_by_user = defaultdict(set)
        access_evidence = defaultdict(set)
        access_errors = []

        membership_ids = [int(m.id) for m in memberships]

        for model, bf, mf, uf in access_fk_contracts:
            key = f"{model_label(model)}.{bf.name}"
            try:
                kwargs = {f"{bf.name}_id__in": branch_ids}
                fields = [f"{bf.name}_id"]
                if mf is not None:
                    kwargs[f"{mf.name}_id__in"] = membership_ids
                    fields.append(f"{mf.name}_id")
                else:
                    kwargs[f"{uf.name}_id__in"] = user_ids
                    fields.append(f"{uf.name}_id")

                for row in model._default_manager.filter(**kwargs).values(*fields):
                    bid = int(row[f"{bf.name}_id"])
                    if mf is not None:
                        owner = int(row[f"{mf.name}_id"])
                        access_by_membership[owner].add(bid)
                        access_evidence[("membership", owner)].add(key)
                    else:
                        owner = int(row[f"{uf.name}_id"])
                        access_by_user[owner].add(bid)
                        access_evidence[("user", owner)].add(key)
            except Exception as exc:
                access_errors.append(f"{key}: {type(exc).__name__}: {clean(exc)}")

        for model, field, kind in access_m2m_contracts:
            try:
                owners = memberships if kind == "membership" else list(users.values())
                for owner in owners:
                    found = set(
                        getattr(owner, field.name)
                        .filter(id__in=branch_ids)
                        .values_list("id", flat=True)
                    )
                    if kind == "membership":
                        access_by_membership[int(owner.id)].update(int(x) for x in found)
                        if found:
                            access_evidence[("membership", int(owner.id))].add(
                                f"{model_label(model)}.{field.name}[M2M]"
                            )
                    else:
                        access_by_user[int(owner.id)].update(int(x) for x in found)
                        if found:
                            access_evidence[("user", int(owner.id))].add(
                                f"{model_label(model)}.{field.name}[M2M]"
                            )
            except Exception as exc:
                access_errors.append(
                    f"{model_label(model)}.{field.name}[M2M]: {type(exc).__name__}: {clean(exc)}"
                )

        legacy_branch_by_current = {v: k for k, v in branch_id_by_legacy.items()}

        def company_name(lid: str) -> str:
            obj = companies.get(company_id_by_legacy[lid])
            cmap = company_map_by_legacy[lid]
            return clean(first_attr(obj, ("name", "name_ar"), "") or cmap.source_reference)

        def branch_name(bid: int) -> str:
            return clean(first_attr(branches.get(bid), ("name", "name_ar"), ""))

        def clone_basis(lid: str, cid: int):
            rows = subscription_rows_by_company.get(cid, [])
            today = date.today()
            migration = []
            date_current = []

            for sub in rows:
                smap = sub_map_by_target.get((lid, clean(sub.id)))
                metadata = dict(getattr(smap, "metadata", {}) or {}) if smap else {}

                if metadata.get("migration_current") is True:
                    migration.append((sub, smap))

                status = clean(getattr(sub, "status", "")).upper()
                start = getattr(sub, "start_date", None)
                end = getattr(sub, "end_date", None)
                if (
                    status in {"ACTIVE", "TRIAL", "TRIALING", "GRACE", "CURRENT", "PAID"}
                    and (start is None or start <= today)
                    and (end is None or end >= today)
                ):
                    date_current.append((sub, smap))

            if len(migration) == 1:
                return "MIGRATION_CURRENT", migration[0]
            if len(date_current) == 1:
                return "DATE_CURRENT", date_current[0]
            if rows:
                latest = max(
                    rows,
                    key=lambda s: (
                        getattr(s, "end_date", None) or date.min,
                        getattr(s, "start_date", None) or date.min,
                        int(s.id),
                    ),
                )
                return "LATEST_END_FALLBACK", (
                    latest, sub_map_by_target.get((lid, clean(latest.id)))
                )
            return "NONE", (None, None)

        progress("[A2V3] 4/6 Building decision blocks...")
        ordered = sorted(
            EXPECTED_IDS,
            key=lambda lid: (
                -len(branches_by_company[lid]),
                company_name(lid).casefold(),
                natural_key(lid),
            ),
        )

        lines.extend([
            "",
            "=" * 120,
            "DECISION AUDIT — THREE PLUS BRANCH COMPANIES",
            "=" * 120,
        ])

        active_total = 0
        inactive_total = 0
        memberships_by_company_user = {
            cid: {int(m.user_id): m for m in mlist}
            for cid, mlist in memberships_by_company.items()
        }

        for lid in ordered:
            cid = company_id_by_legacy[lid]
            company = companies.get(cid)
            bmaps = sorted(branches_by_company[lid], key=lambda m: natural_key(m.legacy_id))
            local_branch_ids = {
                int(clean(bm.target_object_id))
                for bm in bmaps
                if clean(bm.target_object_id).isdigit()
            }

            active = 0
            inactive = 0
            for bm in bmaps:
                raw = clean(bm.target_object_id)
                branch = branches.get(int(raw)) if raw.isdigit() else None
                if bool(first_attr(branch, ("is_active",), False)):
                    active += 1
                else:
                    inactive += 1
            active_total += active
            inactive_total += inactive

            basis_type, (basis_sub, basis_map) = clone_basis(lid, cid)

            lines.extend([
                "",
                "-" * 120,
                f"COMPANY legacy_id={lid} | current_id={cid} | name={company_name(lid)} "
                f"| company_code={clean(first_attr(company, ('company_code', 'code'), ''))}",
                f"BRANCH_COUNT={len(bmaps)} | ACTIVE={active} | INACTIVE={inactive}",
                f"MAPPED_USER_COUNT={len(users_by_company[lid])}",
                f"CURRENT_MEMBERSHIP_COUNT={len(memberships_by_company.get(cid, []))}",
                f"MAPPED_SUBSCRIPTION_COUNT={len(subs_by_company[lid])}",
                f"CURRENT_SUBSCRIPTION_ROW_COUNT={len(subscription_rows_by_company.get(cid, []))}",
            ])

            cache_file = SOURCE_CACHE_DIR / f"company_{lid}.json"
            lines.append(f"SOURCE_CACHE_FILE={cache_file}")
            if cache_file.exists():
                try:
                    payload = json.loads(cache_file.read_text(encoding="utf-8"))
                    if isinstance(payload, dict):
                        lines.append(
                            "CACHE_TOP_LEVEL_KEYS=" + ",".join(sorted(map(str, payload.keys())))
                        )
                    for item in cache_summary(payload):
                        lines.append(f"CACHE_COLLECTION {item}")
                except Exception as exc:
                    lines.append(f"CACHE_PARSE_ERROR={type(exc).__name__}: {clean(exc)}")
            else:
                lines.append("CACHE_FILE_MISSING=YES")

            lines.append("SUBSCRIPTION_CLONE_BASIS_BEGIN")
            lines.append(f"CLONE_BASIS_SELECTION={basis_type}")
            if basis_sub is not None:
                meta = dict(getattr(basis_map, "metadata", {}) or {}) if basis_map else {}
                plan = getattr(basis_sub, "plan", None)
                lines.append(
                    "CLONE_BASIS"
                    f" current_subscription_id={basis_sub.id}"
                    f" | legacy_subscription_id={clean(basis_map.legacy_id) if basis_map else 'UNMAPPED'}"
                    f" | legacy_package_id={clean(meta.get('legacy_package_id'))}"
                    f" | migration_current={yesno(meta.get('migration_current')) if 'migration_current' in meta else ''}"
                    f" | plan_id={clean(getattr(basis_sub, 'plan_id', ''))}"
                    f" | plan_name={clean(first_attr(plan, ('name',), ''))}"
                    f" | status={clean(getattr(basis_sub, 'status', ''))}"
                    f" | billing_cycle={clean(getattr(basis_sub, 'billing_cycle', ''))}"
                    f" | start_date={iso(getattr(basis_sub, 'start_date', None))}"
                    f" | end_date={iso(getattr(basis_sub, 'end_date', None))}"
                    f" | price={clean(getattr(basis_sub, 'price', ''))}"
                    f" | total_amount={clean(getattr(basis_sub, 'total_amount', ''))}"
                    f" | auto_renew={yesno(getattr(basis_sub, 'auto_renew', None))}"
                )
            lines.append("SUBSCRIPTION_CLONE_BASIS_END")

            lines.append("BRANCHES_BEGIN")
            for bm in bmaps:
                legacy_bid = clean(bm.legacy_id)
                raw = clean(bm.target_object_id)
                bid = int(raw) if raw.isdigit() else None
                branch = branches.get(bid) if bid else None
                lines.append(
                    f"BRANCH legacy_id={legacy_bid} | current_id={raw or 'MISSING'} "
                    f"| name={clean(first_attr(branch, ('name','name_ar'), bm.source_reference))} "
                    f"| status={clean(first_attr(branch, ('status',), ''))} "
                    f"| active={yesno(first_attr(branch, ('is_active',), None))} "
                    f"| default={yesno(first_attr(branch, ('is_default',), None))}"
                )
            lines.append("BRANCHES_END")

            lines.append("USERS_AND_ACCESS_BEGIN")
            by_user = memberships_by_company_user.get(cid, {})

            for um in sorted(users_by_company[lid], key=lambda m: natural_key(m.legacy_id)):
                legacy_uid = clean(um.legacy_id)
                raw_uid = clean(um.target_object_id)
                uid = int(raw_uid) if raw_uid.isdigit() else None
                user = users.get(uid) if uid else None
                membership = by_user.get(uid or -1)

                lines.append(
                    f"USER legacy_id={legacy_uid} | current_id={raw_uid or 'MISSING'} "
                    f"| username={clean(first_attr(user, ('username',), ''))} "
                    f"| email={clean(first_attr(user, ('email',), ''))} "
                    f"| active={yesno(first_attr(user, ('is_active',), None))}"
                )

                if membership is None:
                    lines.append("  MEMBERSHIP=MISSING")
                    continue

                lines.append(
                    f"  MEMBERSHIP id={membership.id}"
                    f" | role={clean(getattr(membership, 'role', ''))}"
                    f" | branch_policy={clean(getattr(membership, 'branch_policy', ''))}"
                    f" | status={clean(getattr(membership, 'status', ''))}"
                    f" | primary={yesno(getattr(membership, 'is_primary', None))}"
                    f" | job_title={clean(getattr(membership, 'job_title', ''))}"
                )

                bids = set(access_by_membership.get(int(membership.id), set()))
                if uid:
                    bids.update(access_by_user.get(uid, set()))
                bids = sorted(bids & local_branch_ids)

                if bids:
                    rendered = [
                        f"{legacy_branch_by_current.get(bid, '')}->{bid}:{branch_name(bid)}"
                        for bid in bids
                    ]
                    lines.append("  DIRECT_BRANCH_ACCESS=" + "; ".join(rendered))
                else:
                    lines.append("  DIRECT_BRANCH_ACCESS=NONE_DETECTED")

                evidence = set(access_evidence.get(("membership", int(membership.id)), set()))
                if uid:
                    evidence.update(access_evidence.get(("user", uid), set()))
                lines.append("  ACCESS_EVIDENCE=" + ",".join(sorted(evidence)))

            lines.append("USERS_AND_ACCESS_END")

        progress("[A2V3] 5/6 Final reconciliation...")
        lines.extend([
            "",
            "=" * 120,
            "A2 V3 FINAL RECONCILIATION",
            "=" * 120,
            f"THREE_PLUS_COMPANIES={len(ordered)}",
            f"TOTAL_BRANCHES_IN_SCOPE={len(branch_ids)}",
            f"ACTIVE_BRANCHES_IN_SCOPE={active_total}",
            f"INACTIVE_BRANCHES_IN_SCOPE={inactive_total}",
            f"TARGET_MAPPED_USERS={len(user_ids)}",
            f"BRANCH_FK_CONTRACTS_DISCOVERED={len(branch_fk_contracts)}",
            f"ACCESS_FK_CONTRACTS_DISCOVERED={len(access_fk_contracts)}",
            f"ACCESS_M2M_CONTRACTS_DISCOVERED={len(access_m2m_contracts)}",
            f"ACCESS_QUERY_ERROR_COUNT={len(access_errors)}",
        ])
        if access_errors:
            lines.append("ACCESS_QUERY_ERRORS_BEGIN")
            lines.extend(access_errors)
            lines.append("ACCESS_QUERY_ERRORS_END")

        lines.extend([
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "A2_V3_RESULT=PASS",
            "=" * 120,
        ])

        progress("[A2V3] 6/6 Writing report...")
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        progress("===== PRIMEYACC COMPANY SPLIT A2 V3 =====")
        progress("A2_V3_RESULT=PASS")
        progress(f"THREE_PLUS_COMPANIES={len(ordered)}")
        progress(f"TOTAL_BRANCHES_IN_SCOPE={len(branch_ids)}")
        progress(f"ACTIVE_BRANCHES_IN_SCOPE={active_total}")
        progress(f"INACTIVE_BRANCHES_IN_SCOPE={inactive_total}")
        progress(f"ACCESS_QUERY_ERROR_COUNT={len(access_errors)}")
        progress("DATABASE_WRITES=0")
        progress(f"REPORT={REPORT.name}")
        progress(f"SIZE={REPORT.stat().st_size}")
        progress(f"SHA256={digest}")
        return 0

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A2_V3_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA2_V3_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A2_V3_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A2 V3 =====", flush=True)
        print("A2_V3_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())

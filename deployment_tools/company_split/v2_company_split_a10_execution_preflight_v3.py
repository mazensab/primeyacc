#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

MANIFEST = ROOT / "v2_company_split_transformation_manifest.json"
A9_REPORT = ROOT / "v2_company_split_a9_worktree_guard.txt"
A6C_REPORT = ROOT / "v2_company_split_a6c_customer_payment_semantics.txt"
A6D_REPORT = ROOT / "v2_company_split_a6d_exact_12_payment_closure.txt"
A6E_REPORT = ROOT / "v2_company_split_a6e_final_4_payment_closure.txt"

REPORT = ROOT / "v2_company_split_a10_execution_preflight_v3.txt"
PLAN = ROOT / "v2_company_split_local_execution_plan_v3.json"

SOURCE_SYSTEM = "mhamcloud_v1"

EXPECTED_MANIFEST_SHA256 = "42E39C884EE60EB097EE6BA30DB63628E75CCE1F084CF691EE04C3D9B79B981F"
EXPECTED_A9_SHA256 = "4CF7A4A0E3E94FF4E16E604C9C1EC2861F5D6033AC4E27A26C4C0945AB168199"
EXPECTED_A6C_SHA256 = "8CF446BBD07411EE100200F24A6214DCD1FC0C560304B218CB54BAE46F14BA02"
EXPECTED_A6D_SHA256 = "8FF94113ECA773F1B358BC6F6BEB9AE647E785FF5AA8B70742ED49B747911300"
EXPECTED_A6E_SHA256 = "97F98DAD8C3AC7CE8D86D6C4D5F8DA6E50ADE70ABED3853DBBD902ADE09F5332"
EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH_HASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

QUERY_TIMEOUT_MS = 90000

DIRECT_ROUTE_MODELS = [
    ("inventory", "Warehouse", "branch"),
    ("purchases", "PurchaseBill", "branch"),
    ("sales", "SalesInvoice", "branch"),
    ("sales", "SalesReturn", "branch"),
]

PARENT_ROUTE_MODELS = [
    ("inventory", "InventoryLocation", "warehouse__branch"),
    ("inventory", "StockItem", "warehouse__branch"),
    ("inventory", "StockMovement", "warehouse__branch"),
    ("purchases", "PurchaseBillItem", "bill__branch"),
    ("sales", "SalesInvoiceItem", "invoice__branch"),
]

FOUNDATION_MODELS = [
    ("accounting", "Account"),
    ("accounting", "TaxRate"),
    ("accounting", "AccountingRoutingRule"),
    ("accounting", "AccountingSettings"),
    ("companies", "CompanySettings"),
    ("catalog", "CatalogCategory"),
    ("catalog", "CatalogUnit"),
    ("treasury", "TreasuryAccount"),
]

USAGE_MASTER_MODELS = [
    ("catalog", "CatalogItem"),
    ("parties", "BusinessParty"),
]

PARTIAL_76_PURGE_LEGACY_CATALOG = {
    ("products", "374553"),
    ("variations", "305466"),
    ("variations", "305477"),
    ("variations", "305486"),
    ("variations", "305492"),
    ("variations", "376285"),
}


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def stable_digest(rows) -> tuple[int, str]:
    h = hashlib.sha256()
    count = 0
    for row in rows:
        if not isinstance(row, str):
            row = json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        h.update(row.encode("utf-8"))
        h.update(b"\n")
        count += 1
    return count, h.hexdigest().upper()


def git_cp(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    cp = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if check and cp.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed rc={cp.returncode}: {clean(cp.stderr or cp.stdout)}"
        )
    return cp


def git_text(*args: str) -> str:
    return git_cp(*args).stdout.strip()


def detect_settings() -> str:
    current = os.environ.get("DJANGO_SETTINGS_MODULE", "").strip()
    if current:
        return current
    manage = ROOT / "manage.py"
    if not manage.exists():
        raise RuntimeError("manage.py not found; run from PrimeyAcc project root")
    raw = manage.read_text(encoding="utf-8", errors="replace")
    m = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not m:
        raise RuntimeError("Could not detect DJANGO_SETTINGS_MODULE")
    return m.group(1)


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def reconnect_readonly(connection):
    connection.close()
    connection.connect()
    set_readonly(connection)


def model_label(model) -> str:
    return f"{model._meta.app_label}.{model.__name__}"


def direct_fk_fields(model):
    out = []
    for field in model._meta.get_fields():
        if not getattr(field, "concrete", False):
            continue
        if not (
            getattr(field, "many_to_one", False)
            or getattr(field, "one_to_one", False)
        ):
            continue
        remote = getattr(field, "remote_field", None)
        target = getattr(remote, "model", None) if remote else None
        if target is not None:
            out.append((field, target))
    return out


def relation_fields_to(model, target_model):
    return [
        field
        for field, target in direct_fk_fields(model)
        if target is target_model
    ]


def on_delete_name(field) -> str:
    remote = getattr(field, "remote_field", None)
    fn = getattr(remote, "on_delete", None) if remote else None
    if fn is None:
        return ""
    return clean(getattr(fn, "__name__", str(fn)))


def parse_a6_payment_routes() -> dict[int, dict[str, Any]]:
    routes: dict[int, dict[str, Any]] = {}

    a6c = A6C_REPORT.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(
        r"PAYMENT current_id=(\d+).*?\| semantic=TRANSACTION_LINKED_PAYMENT_RECOVERED_FROM_SOURCE_TRANSACTION_ID \| route=([0-9]+-G[0-9]+)",
        a6c,
    ):
        pid = int(m.group(1))
        routes[pid] = {
            "target_group": m.group(2),
            "branch_policy": "SOURCE_TRANSACTION_ROUTE",
            "source": "A6C",
        }

    a6d = A6D_REPORT.read_text(encoding="utf-8", errors="replace")
    block = re.search(
        r"FINAL_12_PAYMENT_ROUTE_MAP_BEGIN(.*?)FINAL_12_PAYMENT_ROUTE_MAP_END",
        a6d,
        flags=re.S,
    )
    if block:
        for m in re.finditer(
            r"legacy_company=(\d+)\|customer_payment=(\d+)\|legacy_branch=(\d+)\|current_branch=(\d+)\|target_group=([^|]+)\|reason=([^\n]+)",
            block.group(1),
        ):
            pid = int(m.group(2))
            routes[pid] = {
                "legacy_company_id": m.group(1),
                "legacy_branch_id": m.group(3),
                "current_branch_id_snapshot": int(m.group(4)),
                "target_group": m.group(5),
                "branch_policy": "SOURCE_TRANSACTION_ROUTE",
                "source": "A6D",
                "reason": clean(m.group(6)),
            }

    a6e = A6E_REPORT.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(
        r"ROUTED\|legacy_company=(\d+)\|customer_payment=(\d+)\|legacy_branch=(\d+)\|current_branch=(\d+)\|target_group=([^|]+)\|reason=([^\n]+)",
        a6e,
    ):
        pid = int(m.group(2))
        routes[pid] = {
            "legacy_company_id": m.group(1),
            "legacy_branch_id": m.group(3),
            "current_branch_id_snapshot": int(m.group(4)),
            "target_group": m.group(5),
            "branch_policy": "SOURCE_TRANSACTION_ROUTE",
            "source": "A6E",
            "reason": clean(m.group(6)),
        }

    for m in re.finditer(
        r"PRESERVE_ORPHAN\|legacy_company=(\d+)\|customer_payment=(\d+)\|missing_legacy_transaction=(\d+)\|payment_for=([^|]+)\|target_group=([^|]+)\|branch=NULL",
        a6e,
    ):
        pid = int(m.group(2))
        routes[pid] = {
            "legacy_company_id": m.group(1),
            "missing_legacy_transaction_id": m.group(3),
            "payment_for": clean(m.group(4)),
            "target_group": m.group(5),
            "branch_policy": "KEEP_NULL",
            "source": "A6E_ORPHAN",
        }

    return routes


def subscription_rank(row, today: date):
    status = clean(row.status).casefold()
    covers = bool(
        row.start_date
        and row.end_date
        and row.start_date <= today <= row.end_date
    )
    active_status = status in {"active", "trial", "trialing"}
    return (
        1 if covers else 0,
        1 if active_status else 0,
        row.end_date or date.min,
        row.start_date or date.min,
        int(row.id),
    )


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A10 V3 MUTATION PREFLIGHT & EXACT EXECUTION PLAN",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_PREFLIGHT",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A10] 1/9 Validating A9, manifest, stash, and clean worktree...", flush=True)

        required = [
            (MANIFEST, EXPECTED_MANIFEST_SHA256, "Manifest"),
            (A9_REPORT, EXPECTED_A9_SHA256, "A9"),
            (A6C_REPORT, EXPECTED_A6C_SHA256, "A6C"),
            (A6D_REPORT, EXPECTED_A6D_SHA256, "A6D"),
            (A6E_REPORT, EXPECTED_A6E_SHA256, "A6E"),
        ]
        for path, expected, label in required:
            if not path.exists():
                raise RuntimeError(f"Missing {label}: {path.name}")
            actual = sha256_file(path)
            if actual != expected:
                raise RuntimeError(
                    f"{label} SHA mismatch expected={expected} actual={actual}"
                )

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin_main = git_text("rev-parse", "origin/main")
        tracked_status = git_text("status", "--short", "--untracked-files=no")
        stash_top = git_text("rev-parse", "stash@{0}")

        if branch != "main":
            raise RuntimeError(f"Expected main, got {branch}")
        if head != EXPECTED_HEAD or origin_main != EXPECTED_HEAD:
            raise RuntimeError(
                f"Git baseline drifted head={head} origin_main={origin_main}"
            )
        if tracked_status:
            raise RuntimeError(f"Tracked worktree is not clean: {tracked_status}")
        if stash_top != EXPECTED_STASH_HASH:
            raise RuntimeError(
                f"A9 stash is not top/current expected={EXPECTED_STASH_HASH} actual={stash_top}"
            )

        lines.extend([
            "===== MUTATION GATE INPUTS =====",
            f"MANIFEST_SHA256={sha256_file(MANIFEST)}",
            f"A9_SHA256={sha256_file(A9_REPORT)}",
            f"BRANCH={branch}",
            f"HEAD={head}",
            f"ORIGIN_MAIN={origin_main}",
            "TRACKED_WORKTREE_CLEAN=PASS",
            f"V2_26C_STASH_HASH={stash_top}",
            "",
        ])

        print("[A10] 2/9 Running Django check and migration drift gate...", flush=True)

        check_cp = subprocess.run(
            [sys.executable, "manage.py", "check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        migration_cp = subprocess.run(
            [sys.executable, "manage.py", "makemigrations", "--check", "--dry-run"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

        if check_cp.returncode != 0:
            raise RuntimeError(f"Django check failed: {clean(check_cp.stdout + check_cp.stderr)}")
        if migration_cp.returncode != 0:
            raise RuntimeError(
                f"Migration drift gate failed: {clean(migration_cp.stdout + migration_cp.stderr)}"
            )

        lines.extend([
            "===== DJANGO STATIC GATES =====",
            "DJANGO_CHECK=PASS",
            f"DJANGO_CHECK_OUTPUT={clean(check_cp.stdout)}",
            "MIGRATION_DRIFT=PASS",
            f"MIGRATION_DRIFT_OUTPUT={clean(migration_cp.stdout)}",
            "",
        ])

        print("[A10] 3/9 Loading Django/current local snapshot...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()
        import django
        django.setup()

        from django.apps import apps
        from django.contrib.auth import get_user_model
        from django.db import connection
        from django.db.models import Count

        from accounts.models import (
            BranchAccessMode,
            CompanyMembership,
            CompanyMembershipBranchGrant,
            CompanyMembershipBranchPolicy,
            UserProfile,
        )
        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company
        from subscriptions.models import CompanySubscription
        from treasury.models import CustomerPayment

        User = get_user_model()

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        expected_counts = manifest["expected_counts"]

        mapped_company_count = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business",
        ).count()
        mapped_branch_count = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business_locations",
        ).count()

        if mapped_company_count != expected_counts["baseline_mapped_companies"]:
            raise RuntimeError(
                f"Mapped company baseline drift expected={expected_counts['baseline_mapped_companies']} actual={mapped_company_count}"
            )
        if mapped_branch_count != expected_counts["baseline_mapped_branches"]:
            raise RuntimeError(
                f"Mapped branch baseline drift expected={expected_counts['baseline_mapped_branches']} actual={mapped_branch_count}"
            )

        scoped_entries = manifest["companies"]
        scoped_legacy_ids = {clean(x["legacy_company_id"]) for x in scoped_entries}

        company_maps = {
            clean(x.legacy_id): x
            for x in LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=scoped_legacy_ids,
            )
        }
        company_id_by_legacy = {}
        for lcid in scoped_legacy_ids:
            row = company_maps.get(lcid)
            if row is None:
                raise RuntimeError(f"Missing company map {lcid}")
            raw = clean(row.target_object_id) or clean(row.company_id)
            if not raw.isdigit():
                raise RuntimeError(f"Missing current Company id for {lcid}")
            company_id_by_legacy[lcid] = int(raw)

        source_company_ids = sorted(company_id_by_legacy.values())
        companies = Company.objects.in_bulk(source_company_ids)

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=scoped_legacy_ids,
            )
        )
        branch_id_by_pair = {}
        pair_by_branch_id = {}
        for row in branch_maps:
            raw = clean(row.target_object_id)
            if raw.isdigit():
                pair = (clean(row.legacy_company_id), clean(row.legacy_id))
                bid = int(raw)
                branch_id_by_pair[pair] = bid
                pair_by_branch_id[bid] = pair

        branches = Branch.objects.in_bulk(list(pair_by_branch_id))

        print("[A10] 4/9 Building exact logical group/current-ID snapshot...", flush=True)

        group_plan = {}
        group_by_branch_id = {}
        source_group_by_company = {}
        partial_purge_branch_ids = set()
        full_excluded_company_ids = set()
        full_excluded_branch_ids = set()
        plan_errors = []

        for entry in scoped_entries:
            lcid = clean(entry["legacy_company_id"])
            mode = clean(entry["mode"])
            cid = company_id_by_legacy[lcid]

            expected_branch_set = set(entry["expected_source_branch_ids"])
            current_branch_set = {
                lbid
                for (mapped_lcid, lbid), _bid in branch_id_by_pair.items()
                if mapped_lcid == lcid
            }
            if current_branch_set != expected_branch_set:
                plan_errors.append(
                    f"branch delta company={lcid} expected={sorted(expected_branch_set,key=nkey)} actual={sorted(current_branch_set,key=nkey)}"
                )

            if mode == "SPLIT":
                source_group = entry["retained_source_group"]
                source_group_by_company[lcid] = source_group

                for group in entry["output_groups"]:
                    gid = group["group_id"]
                    branch_snapshot = []

                    for lbid in group["legacy_branch_ids"]:
                        bid = branch_id_by_pair.get((lcid, lbid))
                        if bid is None:
                            plan_errors.append(f"missing branch map {lcid}/{lbid}")
                            continue
                        branch = branches.get(bid)
                        if branch is None:
                            plan_errors.append(f"missing Branch row {lcid}/{lbid}/{bid}")
                            continue

                        group_by_branch_id[bid] = gid
                        branch_snapshot.append({
                            "legacy_branch_id": lbid,
                            "current_branch_id": bid,
                            "name": clean(branch.name),
                            "is_active": bool(branch.is_active),
                            "is_default_current": bool(branch.is_default),
                            "is_default_planned": lbid == group["default_branch_legacy_id"],
                        })

                    group_plan[gid] = {
                        "legacy_company_id": lcid,
                        "source_company_current_id": cid,
                        "source_company_name": clean(companies[cid].name),
                        "source_company_survivor": bool(group["source_company_survivor"]),
                        "target_company_current_id": cid if group["source_company_survivor"] else None,
                        "company_code": clean(group.get("company_code")),
                        "anchor_branch_legacy_id": group["anchor_branch_legacy_id"],
                        "default_branch_legacy_id": group["default_branch_legacy_id"],
                        "branches": branch_snapshot,
                    }

            elif mode == "PARTIAL_INCLUDE":
                gid = "SOURCE_COMPANY_SURVIVES"
                source_group_by_company[lcid] = gid
                keep = set(entry["keep_legacy_branch_ids"])
                exclude = set(entry["exclude_legacy_branch_ids"])

                branch_snapshot = []
                for lbid in sorted(keep, key=nkey):
                    bid = branch_id_by_pair[(lcid, lbid)]
                    branch = branches[bid]
                    group_by_branch_id[bid] = gid
                    branch_snapshot.append({
                        "legacy_branch_id": lbid,
                        "current_branch_id": bid,
                        "name": clean(branch.name),
                        "is_active": bool(branch.is_active),
                        "is_default_current": bool(branch.is_default),
                        "is_default_planned": lbid == entry["default_branch_after_transform"],
                    })

                for lbid in exclude:
                    bid = branch_id_by_pair[(lcid, lbid)]
                    partial_purge_branch_ids.add(bid)

                group_plan[f"{lcid}:{gid}"] = {
                    "legacy_company_id": lcid,
                    "source_company_current_id": cid,
                    "source_company_name": clean(companies[cid].name),
                    "source_company_survivor": True,
                    "target_company_current_id": cid,
                    "company_code": clean(companies[cid].company_code),
                    "anchor_branch_legacy_id": entry["keep_legacy_branch_ids"][0],
                    "default_branch_legacy_id": entry["default_branch_after_transform"],
                    "branches": branch_snapshot,
                }

            elif mode == "EXCLUDE":
                full_excluded_company_ids.add(cid)
                for lbid in entry["legacy_branch_ids"]:
                    full_excluded_branch_ids.add(branch_id_by_pair[(lcid, lbid)])

        if plan_errors:
            raise RuntimeError(f"Group/branch plan errors: {plan_errors}")

        print("[A10] 5/9 Building membership and subscription execution actions...", flush=True)

        legacy_user_map = {}
        for row in LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="users",
            legacy_company_id__in=scoped_legacy_ids,
        ):
            raw = clean(row.target_object_id)
            if raw.isdigit():
                legacy_user_map[(clean(row.legacy_company_id), int(raw))] = clean(row.legacy_id)

        memberships = list(
            CompanyMembership.objects.filter(
                company_id__in=source_company_ids
            ).select_related("user", "company")
        )
        policies = {
            int(row.membership_id): row
            for row in CompanyMembershipBranchPolicy.objects.filter(
                membership_id__in=[m.id for m in memberships]
            )
        }
        grants_by_policy = defaultdict(set)
        for row in CompanyMembershipBranchGrant.objects.filter(
            policy_id__in=[p.id for p in policies.values()]
        ):
            grants_by_policy[int(row.policy_id)].add(int(row.branch_id))

        entry_by_legacy = {clean(x["legacy_company_id"]): x for x in scoped_entries}
        legacy_by_company_id = {v: k for k, v in company_id_by_legacy.items()}
        membership_actions = []

        for membership in sorted(memberships, key=lambda x: (x.company_id, x.id)):
            lcid = legacy_by_company_id[int(membership.company_id)]
            entry = entry_by_legacy[lcid]
            mode = entry["mode"]
            policy = policies.get(int(membership.id))
            access_mode = clean(policy.mode) if policy is not None else "MISSING"

            action = {
                "legacy_company_id": lcid,
                "legacy_user_id": legacy_user_map.get((lcid, int(membership.user_id)), ""),
                "current_membership_id": int(membership.id),
                "current_user_id": int(membership.user_id),
                "username": clean(membership.user.username),
                "role": clean(membership.role),
                "is_primary": bool(membership.is_primary),
                "current_access_mode": access_mode,
                "target_groups": [],
                "reuse_existing_membership_for": None,
                "clone_membership_to": [],
                "delete_existing_membership": False,
                "target_access": {},
            }

            if mode == "EXCLUDE":
                action["delete_existing_membership"] = True

            elif mode == "PARTIAL_INCLUDE":
                keep_groups = ["SOURCE_COMPANY_SURVIVES"]
                if (
                    access_mode == clean(BranchAccessMode.RESTRICTED)
                    and policy is not None
                ):
                    grant_legacy = {
                        pair_by_branch_id[bid][1]
                        for bid in grants_by_policy.get(int(policy.id), set())
                        if bid in pair_by_branch_id and pair_by_branch_id[bid][0] == lcid
                    }
                    if grant_legacy and grant_legacy <= set(entry["exclude_legacy_branch_ids"]):
                        action["delete_existing_membership"] = True
                    else:
                        action["target_groups"] = keep_groups
                        action["reuse_existing_membership_for"] = keep_groups[0]
                        if membership.is_primary and clean(membership.role).upper() == "ADMIN":
                            action["target_access"][keep_groups[0]] = {
                                "mode": "ALL",
                                "legacy_grant_branch_ids": [],
                            }
                        elif access_mode == clean(BranchAccessMode.RESTRICTED):
                            action["target_access"][keep_groups[0]] = {
                                "mode": "RESTRICTED",
                                "legacy_grant_branch_ids": sorted(
                                    grant_legacy & set(entry["keep_legacy_branch_ids"]),
                                    key=nkey,
                                ),
                            }
                        else:
                            action["target_access"][keep_groups[0]] = {
                                "mode": access_mode,
                                "legacy_grant_branch_ids": [],
                            }
                else:
                    action["target_groups"] = keep_groups
                    action["reuse_existing_membership_for"] = keep_groups[0]
                    action["target_access"][keep_groups[0]] = {
                        "mode": "ALL" if (
                            membership.is_primary
                            and clean(membership.role).upper() == "ADMIN"
                        ) else access_mode,
                        "legacy_grant_branch_ids": [],
                    }

            else:
                groups = entry["output_groups"]
                all_group_ids = [g["group_id"] for g in groups]
                source_group = entry["retained_source_group"]

                if membership.is_primary and clean(membership.role).upper() == "ADMIN":
                    targets = set(all_group_ids)
                    for gid in targets:
                        action["target_access"][gid] = {
                            "mode": "ALL",
                            "legacy_grant_branch_ids": [],
                        }
                elif access_mode == clean(BranchAccessMode.ALL):
                    targets = set(all_group_ids)
                    for gid in targets:
                        action["target_access"][gid] = {
                            "mode": "ALL",
                            "legacy_grant_branch_ids": [],
                        }
                elif access_mode == clean(BranchAccessMode.RESTRICTED) and policy is not None:
                    grant_legacy = {
                        pair_by_branch_id[bid][1]
                        for bid in grants_by_policy.get(int(policy.id), set())
                        if bid in pair_by_branch_id and pair_by_branch_id[bid][0] == lcid
                    }
                    targets = set()
                    for g in groups:
                        intersection = grant_legacy & set(g["legacy_branch_ids"])
                        if intersection:
                            targets.add(g["group_id"])
                            action["target_access"][g["group_id"]] = {
                                "mode": "RESTRICTED",
                                "legacy_grant_branch_ids": sorted(intersection, key=nkey),
                            }
                else:
                    targets = set()

                target_list = sorted(targets)
                action["target_groups"] = target_list

                if target_list:
                    reuse = source_group if source_group in targets else target_list[0]
                    action["reuse_existing_membership_for"] = reuse
                    action["clone_membership_to"] = [x for x in target_list if x != reuse]
                else:
                    action["delete_existing_membership"] = True

            membership_actions.append(action)

        fail_closed_memberships = [
            x for x in membership_actions
            if not x["delete_existing_membership"]
            and not x["target_groups"]
        ]
        if fail_closed_memberships:
            raise RuntimeError(
                f"Membership plan contains unresolved/fail-closed rows: {fail_closed_memberships}"
            )

        today = date.today()
        subscription_candidates = {}
        subscription_errors = []
        for entry in scoped_entries:
            lcid = clean(entry["legacy_company_id"])
            if entry["mode"] != "SPLIT":
                continue
            cid = company_id_by_legacy[lcid]
            rows = list(
                CompanySubscription.objects.filter(company_id=cid).order_by("id")
            )
            if not rows:
                subscription_errors.append(f"split company {lcid} has no local subscription rows")
                continue

            ranked = sorted(rows, key=lambda row: subscription_rank(row, today), reverse=True)
            chosen = ranked[0]
            covering = [
                row for row in rows
                if row.start_date and row.end_date and row.start_date <= today <= row.end_date
            ]

            subscription_candidates[lcid] = {
                "selection_policy": "LOCAL_REHEARSAL_CANDIDATE_ONLY; PRODUCTION_RESELECT_FROM_FRESHEST_SOURCE_AT_CUTOVER",
                "today_local_snapshot": str(today),
                "candidate_current_subscription_id": int(chosen.id),
                "candidate_plan_id": int(chosen.plan_id),
                "candidate_status": clean(chosen.status),
                "candidate_billing_cycle": clean(chosen.billing_cycle),
                "candidate_start_date": str(chosen.start_date),
                "candidate_end_date": str(chosen.end_date),
                "candidate_price": str(chosen.price),
                "covering_period_row_count": len(covering),
                "source_subscription_row_count": len(rows),
                "clone_target_groups": [
                    g["group_id"]
                    for g in entry["output_groups"]
                    if not g["source_company_survivor"]
                ],
            }

        if subscription_errors:
            raise RuntimeError(f"Subscription preflight errors: {subscription_errors}")

        print("[A10] 6/9 Fingerprinting clone masters and operational routing...", flush=True)

        # Foundation rows: exact source PK -> logical target group clone actions.
        foundation_fingerprints = {}
        unsafe_foundation_dependencies = []

        clone_model_labels = {
            f"{a}.{m}" for a, m in FOUNDATION_MODELS
        }

        for app_label, model_name in FOUNDATION_MODELS:
            model = apps.get_model(app_label, model_name)
            print(
                f"[A10]   foundation {model_label(model)}",
                flush=True,
            )
            company_fields = relation_fields_to(model, Company)
            if len(company_fields) != 1:
                raise RuntimeError(
                    f"{model_label(model)} expected one Company FK, got {len(company_fields)}"
                )
            company_field = company_fields[0]
            rows_for_digest = []
            per_company = {}

            for entry in scoped_entries:
                if entry["mode"] != "SPLIT":
                    continue
                lcid = clean(entry["legacy_company_id"])
                cid = company_id_by_legacy[lcid]
                target_groups = [
                    g["group_id"]
                    for g in entry["output_groups"]
                    if not g["source_company_survivor"]
                ]
                source_pks = list(
                    model._default_manager.filter(
                        **{f"{company_field.name}_id": cid}
                    ).order_by("pk").values_list("pk", flat=True)
                )
                per_company[lcid] = {
                    "source_row_count": len(source_pks),
                    "target_group_count": len(target_groups),
                    "expected_clone_count": len(source_pks) * len(target_groups),
                }
                for pk in source_pks:
                    for gid in target_groups:
                        rows_for_digest.append(f"{lcid}|{model_label(model)}|{pk}|{gid}")

            # Safety-check non-null FKs to company-owned models that are not cloned.
            for field, target in direct_fk_fields(model):
                if target is Company:
                    continue
                target_company_fields = relation_fields_to(target, Company)
                if not target_company_fields:
                    continue
                target_label = model_label(target)
                if target is model or target_label in clone_model_labels:
                    continue
                for entry in scoped_entries:
                    if entry["mode"] != "SPLIT":
                        continue
                    lcid = clean(entry["legacy_company_id"])
                    cid = company_id_by_legacy[lcid]
                    n = model._default_manager.filter(
                        **{
                            f"{company_field.name}_id": cid,
                            f"{field.name}_id__isnull": False,
                        }
                    ).count()
                    if n:
                        unsafe_foundation_dependencies.append(
                            f"{model_label(model)}.{field.name}->{target_label} company={lcid} nonnull={n}"
                        )

            count, digest = stable_digest(sorted(rows_for_digest))
            foundation_fingerprints[model_label(model)] = {
                "clone_action_count": count,
                "sha256": digest,
                "per_source_company": per_company,
            }

        if unsafe_foundation_dependencies:
            raise RuntimeError(
                f"Foundation clone has company-owned dependencies outside clone graph: {unsafe_foundation_dependencies}"
            )

        # Usage-routed master exact target-group fingerprint.
        usage_master_fingerprints = {}
        usage_master_group_sets = {}
        cross_scope_master_refs = []

        for app_label, model_name in USAGE_MASTER_MODELS:
            master_model = apps.get_model(app_label, model_name)
            print(
                f"[A10]   usage-master begin {model_label(master_model)}",
                flush=True,
            )
            master_company_fields = relation_fields_to(master_model, Company)
            if len(master_company_fields) != 1:
                raise RuntimeError(f"{model_label(master_model)} expected one Company FK")
            master_company_field = master_company_fields[0]

            target_groups_by_master = defaultdict(set)

            # Direct references from branch-routed operational contracts.
            if model_label(master_model) == "catalog.CatalogItem":
                contracts = [
                    ("sales", "SalesInvoiceItem", "catalog_item", "invoice__branch_id"),
                    ("purchases", "PurchaseBillItem", "item", "bill__branch_id"),
                    ("inventory", "StockItem", "item", "warehouse__branch_id"),
                    ("inventory", "StockMovement", "item", "warehouse__branch_id"),
                ]
            else:
                contracts = [
                    ("sales", "SalesInvoice", "customer", "branch_id"),
                    ("sales", "SalesReturn", "customer", "branch_id"),
                    ("purchases", "PurchaseBill", "supplier", "branch_id"),
                ]

            for c_app, c_model_name, master_field, branch_lookup in contracts:
                model = apps.get_model(c_app, c_model_name)
                company_fields = relation_fields_to(model, Company)
                if len(company_fields) != 1:
                    raise RuntimeError(f"{model_label(model)} Company FK contract changed")
                company_field = company_fields[0]

                print(
                    f"[A10]   usage-master {model_label(master_model)} <- "
                    f"{model_label(model)}.{master_field}",
                    flush=True,
                )

                # IMPORTANT: clear Meta.ordering before DISTINCT. Otherwise Django
                # may include ordering columns in SELECT DISTINCT and explode a
                # logical (company, master, branch) set into hundreds of thousands
                # of rows.
                qs = (
                    model._default_manager.filter(
                        **{
                            f"{company_field.name}_id__in": source_company_ids,
                            f"{master_field}_id__isnull": False,
                        }
                    )
                    .order_by()
                    .values(
                        f"{company_field.name}_id",
                        f"{master_field}_id",
                        branch_lookup,
                    )
                    .distinct()
                )

                for row in qs.iterator(chunk_size=10000):
                    cid = int(row[f"{company_field.name}_id"])
                    lcid = legacy_by_company_id[cid]
                    mid = int(row[f"{master_field}_id"])
                    bid = row[branch_lookup]
                    if bid is None:
                        continue
                    bid = int(bid)
                    if bid in partial_purge_branch_ids:
                        continue
                    gid = group_by_branch_id.get(bid)
                    if gid is None:
                        if bid in full_excluded_branch_ids:
                            continue
                        cross_scope_master_refs.append(
                            f"{model_label(master_model)} master={mid} via {model_label(model)} branch={bid}"
                        )
                        continue
                    target_groups_by_master[(lcid, mid)].add(gid)

            if cross_scope_master_refs:
                raise RuntimeError(
                    f"Cross/unknown branch master refs: {cross_scope_master_refs[:20]}"
                )

            rows_for_digest = []
            per_company = defaultdict(lambda: Counter())
            for (lcid, mid), groups in sorted(target_groups_by_master.items()):
                source_group = source_group_by_company.get(lcid)
                non_source_groups = sorted(g for g in groups if g != source_group)
                per_company[lcid]["masters_used"] += 1
                if len(groups) > 1:
                    per_company[lcid]["masters_multi_group"] += 1
                per_company[lcid]["clone_actions"] += len(non_source_groups)
                for gid in non_source_groups:
                    rows_for_digest.append(
                        f"{lcid}|{model_label(master_model)}|{mid}|{gid}"
                    )

            usage_master_group_sets[model_label(master_model)] = {
                key: set(value)
                for key, value in target_groups_by_master.items()
            }

            count, digest = stable_digest(sorted(rows_for_digest))
            usage_master_fingerprints[model_label(master_model)] = {
                "clone_action_count": count,
                "sha256": digest,
                "per_source_company": {
                    lcid: dict(counter)
                    for lcid, counter in sorted(per_company.items(), key=lambda x: nkey(x[0]))
                },
            }

        print("[A10]   financial-master balance gate", flush=True)

        # Financial-value safety: clone structures, never duplicate unexplained balances.
        financial_master_risks = []

        Account = apps.get_model("accounting", "Account")
        TreasuryAccount = apps.get_model("treasury", "TreasuryAccount")
        BusinessPartyModel = apps.get_model("parties", "BusinessParty")

        for entry in scoped_entries:
            if entry["mode"] != "SPLIT":
                continue
            lcid = clean(entry["legacy_company_id"])
            cid = company_id_by_legacy[lcid]
            non_source_group_count = sum(
                1 for g in entry["output_groups"]
                if not g["source_company_survivor"]
            )
            if non_source_group_count == 0:
                continue

            nonzero_account_opening = Account.objects.filter(
                company_id=cid
            ).exclude(opening_balance=0).count()
            if nonzero_account_opening:
                financial_master_risks.append(
                    f"accounting.Account opening_balance nonzero company={lcid} rows={nonzero_account_opening}"
                )

            nonzero_treasury_opening = TreasuryAccount.objects.filter(
                company_id=cid
            ).exclude(opening_balance=0).count()
            nonzero_treasury_current = TreasuryAccount.objects.filter(
                company_id=cid
            ).exclude(current_balance=0).count()
            if nonzero_treasury_opening or nonzero_treasury_current:
                financial_master_risks.append(
                    "treasury.TreasuryAccount balances nonzero "
                    f"company={lcid} opening_rows={nonzero_treasury_opening} "
                    f"current_rows={nonzero_treasury_current}"
                )

        party_group_sets = usage_master_group_sets.get(
            "parties.BusinessParty", {}
        )
        party_ids_requiring_clone = defaultdict(set)
        for (lcid, party_id), groups in party_group_sets.items():
            source_group = source_group_by_company.get(lcid)
            for gid in groups:
                if gid != source_group:
                    party_ids_requiring_clone[lcid].add(int(party_id))

        for lcid, party_ids in sorted(
            party_ids_requiring_clone.items(), key=lambda x: nkey(x[0])
        ):
            cid = company_id_by_legacy[lcid]
            nonzero_party_opening = BusinessPartyModel.objects.filter(
                company_id=cid,
                id__in=party_ids,
            ).exclude(opening_balance=0).count()
            if nonzero_party_opening:
                financial_master_risks.append(
                    "parties.BusinessParty opening_balance nonzero on clone-required masters "
                    f"company={lcid} rows={nonzero_party_opening}"
                )

        # Operational route fingerprints.
        operational_fingerprints = {}
        operational_total_actions = 0
        operational_purge_actions = 0

        route_specs = []
        for app_label, model_name, branch_field in DIRECT_ROUTE_MODELS:
            route_specs.append(
                (apps.get_model(app_label, model_name), f"{branch_field}_id")
            )
        for app_label, model_name, branch_path in PARENT_ROUTE_MODELS:
            route_specs.append(
                (apps.get_model(app_label, model_name), f"{branch_path}_id")
            )

        for model, branch_lookup in route_specs:
            print(
                f"[A10]   operational-route {model_label(model)} via {branch_lookup}",
                flush=True,
            )
            company_fields = relation_fields_to(model, Company)
            if len(company_fields) != 1:
                raise RuntimeError(f"{model_label(model)} Company FK contract changed")
            company_field = company_fields[0]

            rows_for_digest = []
            counters = Counter()

            qs = model._default_manager.filter(
                **{f"{company_field.name}_id__in": source_company_ids}
            ).values("pk", f"{company_field.name}_id", branch_lookup).order_by("pk")

            for row in qs.iterator(chunk_size=20000):
                pk = int(row["pk"])
                cid = int(row[f"{company_field.name}_id"])
                lcid = legacy_by_company_id[cid]
                bid = row[branch_lookup]

                if bid is None:
                    plan_errors.append(
                        f"{model_label(model)} pk={pk} company={lcid} has NULL routing branch"
                    )
                    continue

                bid = int(bid)

                if bid in partial_purge_branch_ids:
                    target = "PURGE_PARTIAL_76"
                    counters[target] += 1
                    operational_purge_actions += 1
                elif bid in full_excluded_branch_ids:
                    target = "PURGE_FULL_EXCLUSION"
                    counters[target] += 1
                else:
                    gid = group_by_branch_id.get(bid)
                    if gid is None:
                        plan_errors.append(
                            f"{model_label(model)} pk={pk} branch={bid} has no logical target"
                        )
                        continue
                    target = gid
                    counters[target] += 1

                rows_for_digest.append(
                    f"{model_label(model)}|{pk}|{lcid}|{bid}|{target}"
                )

            count, digest = stable_digest(rows_for_digest)
            operational_total_actions += count
            operational_fingerprints[model_label(model)] = {
                "route_row_count": count,
                "sha256": digest,
                "target_counts": dict(sorted(counters.items())),
            }

        if plan_errors:
            raise RuntimeError(f"Operational routing preflight errors: {plan_errors[:20]}")

        print("[A10] 7/9 Closing CustomerPayment and protected-delete preflight...", flush=True)

        a6_routes = parse_a6_payment_routes()
        if len(a6_routes) != 412:
            raise RuntimeError(f"Expected 412 frozen non-invoice payment routes, got {len(a6_routes)}")

        # Map current group to source company.
        group_to_legacy_company = {}
        for entry in scoped_entries:
            if entry["mode"] == "SPLIT":
                for g in entry["output_groups"]:
                    group_to_legacy_company[g["group_id"]] = clean(entry["legacy_company_id"])
            elif entry["mode"] == "PARTIAL_INCLUDE":
                group_to_legacy_company["SOURCE_COMPANY_SURVIVES"] = "76"

        cp_rows_for_digest = []
        cp_counts = Counter()

        cp_qs = CustomerPayment.objects.filter(
            company_id__in=source_company_ids
        ).select_related("sales_invoice").order_by("pk")

        no_invoice_or_no_branch = 0
        cp_cross_party_errors = []
        cp_party_clone_coverage_errors = []
        cp_accounting_links = Counter()

        BusinessParty = apps.get_model("parties", "BusinessParty")
        source_party_company = dict(
            BusinessParty.objects.filter(company_id__in=source_company_ids)
            .values_list("id", "company_id")
        )

        for payment in cp_qs.iterator(chunk_size=20000):
            lcid = legacy_by_company_id[int(payment.company_id)]

            # Full-excluded Companies do not need branch routing at all.
            # Every CustomerPayment row is purged with the Company in dependency
            # order, regardless of sales_invoice/branch provenance.
            if int(payment.company_id) in full_excluded_company_ids:
                target = "PURGE_FULL_EXCLUSION"
                branch_policy = "FULL_EXCLUDED_COMPANY"
            else:
                if payment.accounting_entry_id:
                    cp_accounting_links["accounting_entry_nonnull"] += 1
                if payment.treasury_transaction_id:
                    cp_accounting_links["treasury_transaction_nonnull"] += 1

                if payment.sales_invoice_id and payment.sales_invoice and payment.sales_invoice.branch_id:
                    bid = int(payment.sales_invoice.branch_id)
                    if bid in partial_purge_branch_ids:
                        target = "PURGE_PARTIAL_76"
                    elif bid in full_excluded_branch_ids:
                        target = "PURGE_FULL_EXCLUSION"
                    else:
                        target = group_by_branch_id.get(bid)
                        if target is None:
                            raise RuntimeError(
                                f"CustomerPayment {payment.id} invoice branch {bid} has no target"
                            )
                    branch_policy = "INVOICE_BRANCH"
                else:
                    no_invoice_or_no_branch += 1
                    route = a6_routes.get(int(payment.id))
                    if route is None:
                        raise RuntimeError(
                            "CustomerPayment missing from frozen A6 route map "
                            f"for surviving split/partial Company only: "
                            f"payment={payment.id} legacy_company={lcid}"
                        )
                    target = route["target_group"]
                    branch_policy = route["branch_policy"]

            # Raw party IDs must point to same source Company if present.
            for raw_party_id in (payment.customer_id, payment.counterparty_id):
                if raw_party_id is None:
                    continue
                raw_party_id = int(raw_party_id)
                party_company_id = source_party_company.get(raw_party_id)
                if party_company_id is not None and int(party_company_id) != int(payment.company_id):
                    cp_cross_party_errors.append(
                        f"payment={payment.id} party={raw_party_id} party_company={party_company_id} payment_company={payment.company_id}"
                    )

                # If the payment moves to a non-source output Company and the raw
                # party id resolves to a BusinessParty in the source Company, that
                # BusinessParty must already be in the exact usage-clone set for
                # the same destination group.
                if (
                    party_company_id is not None
                    and target not in {"PURGE_PARTIAL_76", "PURGE_FULL_EXCLUSION"}
                    and target != source_group_by_company.get(lcid)
                ):
                    allowed_groups = usage_master_group_sets.get(
                        "parties.BusinessParty", {}
                    ).get((lcid, raw_party_id), set())
                    if target not in allowed_groups:
                        cp_party_clone_coverage_errors.append(
                            f"payment={payment.id} party={raw_party_id} company={lcid} target={target}"
                        )

            cp_counts[target] += 1
            cp_rows_for_digest.append(
                f"{payment.id}|{lcid}|{target}|{branch_policy}"
            )

        if no_invoice_or_no_branch != 412:
            raise RuntimeError(
                "CustomerPayment surviving split/partial no-invoice/no-branch drift "
                f"expected=412 actual={no_invoice_or_no_branch}"
            )
        if cp_cross_party_errors:
            raise RuntimeError(
                f"CustomerPayment cross-company party ids detected: {cp_cross_party_errors[:20]}"
            )
        if cp_party_clone_coverage_errors:
            raise RuntimeError(
                "CustomerPayment destination BusinessParty clone coverage is incomplete: "
                f"{cp_party_clone_coverage_errors[:20]}"
            )
        if cp_accounting_links["accounting_entry_nonnull"] or cp_accounting_links["treasury_transaction_nonnull"]:
            raise RuntimeError(
                f"CustomerPayment has accounting/treasury links not covered by split clone plan: {dict(cp_accounting_links)}"
            )

        cp_count, cp_digest = stable_digest(cp_rows_for_digest)
        if cp_count != 367272:
            # A5B total over all 16 companies, including excluded.
            raise RuntimeError(
                f"CustomerPayment scoped total drift expected=367272 actual={cp_count}"
            )

        customer_payment_fingerprint = {
            "row_count": cp_count,
            "sha256": cp_digest,
            "target_counts": dict(sorted(cp_counts.items())),
            "frozen_non_invoice_route_count": len(a6_routes),
            "orphan_keep_null_count": sum(
                1 for x in a6_routes.values() if x["branch_policy"] == "KEEP_NULL"
            ),
        }

        # Dynamic Company PROTECT/RESTRICT/DO_NOTHING rows for full exclusions.
        protected_company_rows = []
        protected_branch_rows = []
        protected_delete_models = set()

        for model in apps.get_models():
            if model._meta.proxy or not model._meta.managed:
                continue

            for field, target in direct_fk_fields(model):
                delete_name = on_delete_name(field)

                if target is Company and delete_name in {"PROTECT", "RESTRICT", "DO_NOTHING"}:
                    count = model._default_manager.filter(
                        **{f"{field.name}_id__in": full_excluded_company_ids}
                    ).count()
                    if count:
                        protected_company_rows.append({
                            "contract": f"{model_label(model)}.{field.name}",
                            "on_delete": delete_name,
                            "row_count": count,
                        })
                        protected_delete_models.add(model_label(model))

                if target is Branch and delete_name in {"PROTECT", "RESTRICT", "DO_NOTHING"}:
                    count = model._default_manager.filter(
                        **{
                            f"{field.name}_id__in":
                            (full_excluded_branch_ids | partial_purge_branch_ids)
                        }
                    ).count()
                    if count:
                        protected_branch_rows.append({
                            "contract": f"{model_label(model)}.{field.name}",
                            "on_delete": delete_name,
                            "row_count": count,
                        })

        if protected_branch_rows:
            raise RuntimeError(
                f"Branch deletion still has PROTECT/RESTRICT/DO_NOTHING rows: {protected_branch_rows}"
            )

        print("[A10] 8/9 Building partial-76 purge and user-delete exact snapshots...", flush=True)

        # Resolve partial 76 excluded CatalogItems from stable Legacy IDs.
        CatalogItem = apps.get_model("catalog", "CatalogItem")
        item_ct = apps.get_model("contenttypes", "ContentType").objects.get_for_model(CatalogItem)

        partial_76_item_ids = set()
        for source_table, legacy_id in PARTIAL_76_PURGE_LEGACY_CATALOG:
            maps = list(
                LegacyObjectMap.objects.filter(
                    source_system=SOURCE_SYSTEM,
                    legacy_company_id="76",
                    source_table=source_table,
                    legacy_id=legacy_id,
                    target_content_type=item_ct,
                )
            )
            if not maps:
                raise RuntimeError(
                    f"Partial 76 purge map missing {source_table}/{legacy_id}"
                )
            for row in maps:
                raw = clean(row.target_object_id)
                if raw.isdigit():
                    partial_76_item_ids.add(int(raw))

        if len(partial_76_item_ids) != 5:
            raise RuntimeError(
                f"Expected exactly 5 partial-76 CatalogItem purge targets, got {sorted(partial_76_item_ids)}"
            )

        # Exact user candidates after excluded/partial membership removal.
        membership_delete_user_ids = {
            int(x["current_user_id"])
            for x in membership_actions
            if x["delete_existing_membership"]
        }
        membership_keep_user_ids = {
            int(x["current_user_id"])
            for x in membership_actions
            if x["target_groups"]
        }
        candidate_user_ids = sorted(membership_delete_user_ids - membership_keep_user_ids)

        remaining_memberships = {
            int(row["user_id"]): int(row["n"])
            for row in (
                CompanyMembership.objects.filter(user_id__in=candidate_user_ids)
                .exclude(
                    id__in=[
                        x["current_membership_id"]
                        for x in membership_actions
                        if x["delete_existing_membership"]
                    ]
                )
                .values("user_id")
                .annotate(n=Count("pk"))
            )
        }
        blocked_users = {
            uid: n for uid, n in remaining_memberships.items() if n
        }
        if blocked_users:
            raise RuntimeError(
                f"User delete candidates gained remaining memberships: {blocked_users}"
            )
        if len(candidate_user_ids) != 47:
            raise RuntimeError(
                f"Expected 47 local user-delete candidates, got {len(candidate_user_ids)}"
            )

        # UserProfile default-company action summary.
        profile_actions = []
        profiles = {
            int(p.user_id): p
            for p in UserProfile.objects.filter(user_id__in={
                int(x["current_user_id"]) for x in membership_actions
            })
        }

        actions_by_user = defaultdict(list)
        for action in membership_actions:
            actions_by_user[int(action["current_user_id"])].append(action)

        for uid, user_actions in sorted(actions_by_user.items()):
            target_groups = sorted({
                gid
                for action in user_actions
                for gid in action["target_groups"]
            })
            current_default = (
                int(profiles[uid].default_company_id)
                if uid in profiles and profiles[uid].default_company_id
                else None
            )
            source_group_targets = []
            for action in user_actions:
                lcid = action["legacy_company_id"]
                sg = source_group_by_company.get(lcid)
                if sg and sg in action["target_groups"]:
                    source_group_targets.append((lcid, sg))

            if source_group_targets:
                policy = "KEEP_SOURCE_DEFAULT_IF_CURRENT_DEFAULT_MATCHES_SOURCE_COMPANY"
            elif len(target_groups) == 1:
                policy = "SET_SOLE_RESULTING_TARGET_COMPANY"
            elif len(target_groups) > 1:
                policy = "SET_NULL_AND_REQUIRE_USER_SELECTION"
            else:
                policy = "USER_WILL_BE_DELETED_IF_NO_OTHER_DEPENDENCIES"

            profile_actions.append({
                "current_user_id": uid,
                "current_default_company_id": current_default,
                "target_groups": target_groups,
                "policy": policy,
            })

        print("[A10] 9/9 Freezing local execution plan and rehearsal gate...", flush=True)

        plan = {
            "schema": "primeyacc.company_split_local_execution_plan.v1",
            "manifest_sha256": EXPECTED_MANIFEST_SHA256,
            "a9_sha256": EXPECTED_A9_SHA256,
            "git": {
                "branch": branch,
                "head": head,
                "origin_main": origin_main,
                "v2_26c_stash_hash": stash_top,
            },
            "local_snapshot_contract": {
                "current_ids_are_non_authoritative": True,
                "production_replay_must_resolve_from_legacy_ids": True,
                "source_system": SOURCE_SYSTEM,
            },
            "groups": group_plan,
            "membership_actions": membership_actions,
            "user_profile_actions": profile_actions,
            "subscription_candidates": subscription_candidates,
            "foundation_clone_fingerprints": foundation_fingerprints,
            "usage_master_clone_fingerprints": usage_master_fingerprints,
            "financial_master_balance_gate": {
                "risks": financial_master_risks,
                "policy": "NO_UNEXPLAINED_FINANCIAL_BALANCE_DUPLICATION_ACROSS_SPLIT_COMPANIES",
            },
            "operational_routing_fingerprints": operational_fingerprints,
            "customer_payment_fingerprint": customer_payment_fingerprint,
            "full_exclusion": {
                "current_company_ids_snapshot": sorted(full_excluded_company_ids),
                "current_branch_ids_snapshot": sorted(full_excluded_branch_ids),
                "protected_company_rows": protected_company_rows,
                "explicit_delete_models": sorted(protected_delete_models),
            },
            "partial_76": {
                "purge_branch_ids_snapshot": sorted(partial_purge_branch_ids),
                "purge_catalog_item_ids_snapshot": sorted(partial_76_item_ids),
                "purge_catalog_legacy_keys": sorted(
                    [f"{a}:{b}" for a, b in PARTIAL_76_PURGE_LEGACY_CATALOG]
                ),
            },
            "user_deletion": {
                "candidate_current_user_ids_snapshot": candidate_user_ids,
                "candidate_count": len(candidate_user_ids),
                "must_recheck_after_company_purge": True,
            },
            "rehearsal_contract": {
                "next_stage": "A11_ROLLBACK_REHEARSAL",
                "transaction": "ONE_POSTGRESQL_ATOMIC_TRANSACTION_ROLLED_BACK_INTENTIONALLY",
                "advisory_lock": "REQUIRED",
                "dry_run": "EXECUTE_REAL_MUTATION_CODE_THEN_FORCE_ROLLBACK",
                "post_mutation_verification_inside_transaction": True,
                "permanent_database_change": False,
                "apply_stage_after_rehearsal": "A12_EXACT_APPLY_USING_SAME_PLAN_SHA",
            },
        }

        PLAN.write_text(
            json.dumps(plan, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        plan_sha = sha256_file(PLAN)

        total_foundation_actions = sum(
            x["clone_action_count"] for x in foundation_fingerprints.values()
        )
        total_usage_clone_actions = sum(
            x["clone_action_count"] for x in usage_master_fingerprints.values()
        )

        safety_errors = []
        if total_foundation_actions != manifest["foundation_master_contract"]["estimated_new_rows_local_snapshot"]:
            safety_errors.append(
                f"foundation clone drift expected={manifest['foundation_master_contract']['estimated_new_rows_local_snapshot']} actual={total_foundation_actions}"
            )
        if total_usage_clone_actions != manifest["usage_master_contract"]["estimated_new_clones_local_snapshot"]:
            safety_errors.append(
                f"usage-master clone drift expected={manifest['usage_master_contract']['estimated_new_clones_local_snapshot']} actual={total_usage_clone_actions}"
            )
        if len(membership_actions) != 89:
            safety_errors.append(
                f"membership scope drift expected=89 actual={len(membership_actions)}"
            )
        if customer_payment_fingerprint["orphan_keep_null_count"] != 2:
            safety_errors.append(
                "CustomerPayment orphan exception count changed"
            )
        if financial_master_risks:
            safety_errors.extend(
                f"FINANCIAL_MASTER_BALANCE_REQUIRES_PARTITION_POLICY: {risk}"
                for risk in financial_master_risks
            )

        lines.extend([
            "",
            "=" * 120,
            "A10 EXECUTION PREFLIGHT SUMMARY",
            "=" * 120,
            f"GROUP_PLAN_COUNT={len(group_plan)}",
            f"NEW_COMPANY_GROUP_COUNT={expected_counts['new_companies']}",
            f"MEMBERSHIP_ACTION_COUNT={len(membership_actions)}",
            f"MEMBERSHIP_DELETE_ACTION_COUNT={sum(1 for x in membership_actions if x['delete_existing_membership'])}",
            f"MEMBERSHIP_CLONE_ACTION_COUNT={sum(len(x['clone_membership_to']) for x in membership_actions)}",
            f"USER_DELETE_CANDIDATE_COUNT={len(candidate_user_ids)}",
            f"SPLIT_SUBSCRIPTION_SOURCE_COUNT={len(subscription_candidates)}",
            f"FOUNDATION_CLONE_ACTION_COUNT={total_foundation_actions}",
            f"USAGE_MASTER_CLONE_ACTION_COUNT={total_usage_clone_actions}",
            f"OPERATIONAL_ROUTE_ROW_COUNT={operational_total_actions}",
            f"PARTIAL_76_OPERATIONAL_PURGE_ROUTE_COUNT={operational_purge_actions}",
            f"CUSTOMER_PAYMENT_ROW_COUNT={customer_payment_fingerprint['row_count']}",
            f"CUSTOMER_PAYMENT_NON_INVOICE_ROUTE_COUNT={customer_payment_fingerprint['frozen_non_invoice_route_count']}",
            f"CUSTOMER_PAYMENT_ORPHAN_KEEP_NULL_COUNT={customer_payment_fingerprint['orphan_keep_null_count']}",
            f"PARTIAL_76_PURGE_CATALOG_ITEM_COUNT={len(partial_76_item_ids)}",
            f"FULL_EXCLUSION_PROTECTED_COMPANY_CONTRACT_COUNT={len(protected_company_rows)}",
            f"FULL_EXCLUSION_PROTECTED_COMPANY_CONTRACTS={protected_company_rows}",
            f"BRANCH_PROTECT_BLOCKER_COUNT={len(protected_branch_rows)}",
            f"FINANCIAL_MASTER_BALANCE_RISK_COUNT={len(financial_master_risks)}",
            f"FINANCIAL_MASTER_BALANCE_RISKS={financial_master_risks}",
            f"CUSTOMER_PAYMENT_PARTY_CLONE_COVERAGE_ERROR_COUNT={len(cp_party_clone_coverage_errors)}",
            f"SAFETY_ERROR_COUNT={len(safety_errors)}",
        ])

        if safety_errors:
            lines.append("SAFETY_ERRORS_BEGIN")
            lines.extend(safety_errors)
            lines.append("SAFETY_ERRORS_END")

        lines.extend([
            f"EXECUTION_PLAN={PLAN.name}",
            f"EXECUTION_PLAN_SIZE={PLAN.stat().st_size}",
            f"EXECUTION_PLAN_SHA256={plan_sha}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "GIT_PUSH=0",
            f"A10_RESULT={'PASS' if not safety_errors else 'REVIEW_REQUIRED'}",
            f"MUTATION_PREFLIGHT_READY={'YES' if not safety_errors else 'NO'}",
            f"NEXT_STAGE={'A11_ROLLBACK_REHEARSAL' if not safety_errors else 'A10_REVIEW'}",
            "=" * 120,
        ])

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10 V3 =====")
        print(f"A10_RESULT={'PASS' if not safety_errors else 'REVIEW_REQUIRED'}")
        print(f"FOUNDATION_CLONE_ACTION_COUNT={total_foundation_actions}")
        print(f"USAGE_MASTER_CLONE_ACTION_COUNT={total_usage_clone_actions}")
        print(f"OPERATIONAL_ROUTE_ROW_COUNT={operational_total_actions}")
        print(f"CUSTOMER_PAYMENT_ROW_COUNT={customer_payment_fingerprint['row_count']}")
        print(f"USER_DELETE_CANDIDATE_COUNT={len(candidate_user_ids)}")
        print(f"SAFETY_ERROR_COUNT={len(safety_errors)}")
        print(f"MUTATION_PREFLIGHT_READY={'YES' if not safety_errors else 'NO'}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"EXECUTION_PLAN={PLAN.name}")
        print(f"EXECUTION_PLAN_SIZE={PLAN.stat().st_size}")
        print(f"EXECUTION_PLAN_SHA256={plan_sha}")

        return 0 if not safety_errors else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A10_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA10_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A10_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10 V3 =====", flush=True)
        print("A10_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print("GIT_PUSH=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SIZE={REPORT.stat().st_size}", flush=True)
        print(f"REPORT_SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

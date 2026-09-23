#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

MANIFEST = ROOT / "v2_company_split_transformation_manifest_v2.json"
A10_REPORT = ROOT / "v2_company_split_a10_execution_preflight_v5.txt"
A10_PLAN = ROOT / "v2_company_split_local_execution_plan_v5.json"
A6C_REPORT = ROOT / "v2_company_split_a6c_customer_payment_semantics.txt"
A6D_REPORT = ROOT / "v2_company_split_a6d_exact_12_payment_closure.txt"
A6E_REPORT = ROOT / "v2_company_split_a6e_final_4_payment_closure.txt"

CACHE_FILE = ROOT / "_audit" / "phase49j_general_apply" / "source_cache" / "company_88.json"
REPORT = ROOT / "v2_company_split_a10d_company88_opening_balance_closure.txt"
POLICY = ROOT / "v2_company_split_a10d_opening_balance_policy.json"

EXPECTED_MANIFEST_SHA256 = "B12A3C2916272B6A4D5E8051D7B51533E3FF05369084632685F0BCC809BE24DE"
EXPECTED_A10_REPORT_SHA256 = "68C4E393767305CB1C573ECEBD393A795DF14D1541E922BCDBF9A76898680D18"
EXPECTED_A10_PLAN_SHA256 = "ED52E632045354DDF1E80ADDD918D11E8AAC04026BF5D69C752D4B31B4BAB7A1"
EXPECTED_A6C_SHA256 = "8CF446BBD07411EE100200F24A6214DCD1FC0C560304B218CB54BAE46F14BA02"
EXPECTED_A6D_SHA256 = "8FF94113ECA773F1B358BC6F6BEB9AE647E785FF5AA8B70742ED49B747911300"
EXPECTED_A6E_SHA256 = "97F98DAD8C3AC7CE8D86D6C4D5F8DA6E50ADE70ABED3853DBBD902ADE09F5332"

EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH_HASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

SOURCE_SYSTEM = "mhamcloud_v1"
LEGACY_COMPANY_ID = "88"
SOURCE_GROUP = "88-G01"
QUERY_TIMEOUT_MS = 60000


def clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).replace("\r", " ").replace("\n", " ").strip()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def git_text(*args: str) -> str:
    cp = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if cp.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed rc={cp.returncode}: "
            f"{clean(cp.stderr or cp.stdout)}"
        )
    return cp.stdout.strip()


def require_sha(path: Path, expected: str, label: str):
    if not path.exists():
        raise RuntimeError(f"Missing {label}: {path.name}")
    actual = sha256_file(path)
    if actual != expected:
        raise RuntimeError(
            f"{label} SHA mismatch expected={expected} actual={actual}"
        )


def detect_settings() -> str:
    current = os.environ.get("DJANGO_SETTINGS_MODULE", "").strip()
    if current:
        return current
    raw = (ROOT / "manage.py").read_text(encoding="utf-8", errors="replace")
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


def jsonable(v: Any):
    if v is None or isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, Decimal):
        return str(v)
    if isinstance(v, dict):
        return {clean(k): jsonable(val) for k, val in v.items()}
    if isinstance(v, (list, tuple, set)):
        return [jsonable(x) for x in v]
    return str(v)


def parse_a6_routes() -> dict[int, str]:
    routes = {}

    a6c = A6C_REPORT.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(
        r"PAYMENT current_id=(\d+).*?\| semantic=TRANSACTION_LINKED_PAYMENT_RECOVERED_FROM_SOURCE_TRANSACTION_ID \| route=([0-9]+-G[0-9]+)",
        a6c,
    ):
        routes[int(m.group(1))] = m.group(2)

    a6d = A6D_REPORT.read_text(encoding="utf-8", errors="replace")
    block = re.search(
        r"FINAL_12_PAYMENT_ROUTE_MAP_BEGIN(.*?)FINAL_12_PAYMENT_ROUTE_MAP_END",
        a6d,
        flags=re.S,
    )
    if block:
        for m in re.finditer(
            r"customer_payment=(\d+).*?\|target_group=([^|]+)\|",
            block.group(1),
        ):
            routes[int(m.group(1))] = m.group(2)

    a6e = A6E_REPORT.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(
        r"ROUTED\|legacy_company=\d+\|customer_payment=(\d+).*?\|target_group=([^|]+)\|",
        a6e,
    ):
        routes[int(m.group(1))] = m.group(2)
    for m in re.finditer(
        r"PRESERVE_ORPHAN\|legacy_company=\d+\|customer_payment=(\d+).*?\|target_group=([^|]+)\|",
        a6e,
    ):
        routes[int(m.group(1))] = m.group(2)

    return routes


def row_mentions_contact(row: dict[str, Any], legacy_contact_id: str) -> bool:
    target = clean(legacy_contact_id)
    for key, val in row.items():
        lk = clean(key).lower()
        if any(token in lk for token in ("contact", "customer", "supplier", "party", "payment_for")):
            if clean(val) == target:
                return True
    return False


def extract_location_candidates(row: dict[str, Any]) -> list[tuple[str, str]]:
    result = []
    for key, val in row.items():
        lk = clean(key).lower()
        if any(token in lk for token in ("location_id", "business_location_id", "branch_id")):
            sval = clean(val)
            if sval and sval.lower() not in {"none", "null"}:
                result.append((clean(key), sval))
    return result


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A10D COMPANY 88 OPENING BALANCE CLOSURE",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_TARGETED_FINANCIAL_AUDIT",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A10D] 1/7 Validating frozen chain and Git guard...", flush=True)

        require_sha(MANIFEST, EXPECTED_MANIFEST_SHA256, "Manifest v2")
        require_sha(A10_REPORT, EXPECTED_A10_REPORT_SHA256, "A10 V5 report")
        require_sha(A10_PLAN, EXPECTED_A10_PLAN_SHA256, "A10 V5 execution plan")
        require_sha(A6C_REPORT, EXPECTED_A6C_SHA256, "A6C report")
        require_sha(A6D_REPORT, EXPECTED_A6D_SHA256, "A6D report")
        require_sha(A6E_REPORT, EXPECTED_A6E_SHA256, "A6E report")

        if not CACHE_FILE.exists():
            raise RuntimeError(f"Missing source cache {CACHE_FILE}")

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin = git_text("rev-parse", "origin/main")
        tracked = git_text("status", "--short", "--untracked-files=no")
        stash = git_text("rev-parse", "stash@{0}")

        if branch != "main":
            raise RuntimeError(f"Expected main, got {branch}")
        if head != EXPECTED_HEAD or origin != EXPECTED_HEAD:
            raise RuntimeError(f"Git baseline drift head={head} origin={origin}")
        if tracked:
            raise RuntimeError(f"Tracked worktree not clean: {tracked}")
        if stash != EXPECTED_STASH_HASH:
            raise RuntimeError(
                f"V2-26C stash drift expected={EXPECTED_STASH_HASH} actual={stash}"
            )

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        plan = json.loads(A10_PLAN.read_text(encoding="utf-8"))

        print("[A10D] 2/7 Loading Django and resolving Company 88 groups...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()
        import django
        django.setup()

        from django.apps import apps
        from django.contrib.contenttypes.models import ContentType
        from django.db import connection

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        BusinessParty = apps.get_model("parties", "BusinessParty")
        SalesInvoice = apps.get_model("sales", "SalesInvoice")
        SalesReturn = apps.get_model("sales", "SalesReturn")
        PurchaseBill = apps.get_model("purchases", "PurchaseBill")

        company_map = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business",
            legacy_id=LEGACY_COMPANY_ID,
        ).first()
        if company_map is None:
            raise RuntimeError("Company 88 map missing")
        raw_company = clean(company_map.target_object_id) or clean(company_map.company_id)
        if not raw_company.isdigit():
            raise RuntimeError("Company 88 current id unresolved")
        company_id = int(raw_company)

        entry = next(
            x for x in manifest["companies"]
            if clean(x["legacy_company_id"]) == LEGACY_COMPANY_ID
        )
        if entry["mode"] != "SPLIT" or entry["retained_source_group"] != SOURCE_GROUP:
            raise RuntimeError("Company 88 manifest contract changed")

        branch_id_by_legacy = {}
        group_by_branch_id = {}

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id=LEGACY_COMPANY_ID,
            )
        )
        for m in branch_maps:
            raw = clean(m.target_object_id)
            if raw.isdigit():
                branch_id_by_legacy[clean(m.legacy_id)] = int(raw)

        for group in entry["output_groups"]:
            for legacy_branch_id in group["legacy_branch_ids"]:
                bid = branch_id_by_legacy[clean(legacy_branch_id)]
                group_by_branch_id[bid] = group["group_id"]

        print("[A10D] 3/7 Identifying the exact nonzero clone-required BusinessParty...", flush=True)

        # Rebuild usage groups exactly from operational references.
        party_groups = defaultdict(set)

        refs = [
            (SalesInvoice, "customer_id", "branch_id"),
            (SalesReturn, "customer_id", "branch_id"),
            (PurchaseBill, "supplier_id", "branch_id"),
        ]

        for model, party_field, branch_field in refs:
            qs = (
                model._default_manager.filter(
                    company_id=company_id,
                    **{f"{party_field}__isnull": False},
                )
                .order_by()
                .values(party_field, branch_field)
                .distinct()
            )
            for row in qs.iterator(chunk_size=10000):
                pid = int(row[party_field])
                bid = row[branch_field]
                if bid is not None and int(bid) in group_by_branch_id:
                    party_groups[pid].add(group_by_branch_id[int(bid)])

        # Manifest-v2 payment-driven party coverage can also add groups.
        bp_contract = (
            manifest["customer_payment_contract"]
            ["business_party_coverage_contract"]
        )
        bp_ct = ContentType.objects.get_for_model(BusinessParty)
        for row in bp_contract["rows"]:
            if clean(row["legacy_company_id"]) != LEGACY_COMPANY_ID:
                continue
            maps = list(
                LegacyObjectMap.objects.filter(
                    source_system=SOURCE_SYSTEM,
                    legacy_company_id=LEGACY_COMPANY_ID,
                    source_table="contacts",
                    legacy_id=clean(row["legacy_contact_id"]),
                    target_content_type=bp_ct,
                )
            )
            if len(maps) != 1:
                raise RuntimeError(
                    f"Manifest-v2 party identity not unique for contact {row['legacy_contact_id']}"
                )
            pid = int(clean(maps[0].target_object_id))
            party_groups[pid].update(row["payment_usage_coverage_groups"])

        nonzero_parties = []
        for pid, groups in party_groups.items():
            non_source_groups = sorted(g for g in groups if g != SOURCE_GROUP)
            if not non_source_groups:
                continue
            party = BusinessParty.objects.filter(
                pk=pid, company_id=company_id
            ).first()
            if party is not None and party.opening_balance != 0:
                nonzero_parties.append((party, sorted(groups), non_source_groups))

        if len(nonzero_parties) != 1:
            raise RuntimeError(
                f"Expected exactly one nonzero clone-required party, got {len(nonzero_parties)}"
            )

        party, usage_groups, clone_groups = nonzero_parties[0]

        party_snapshot = {}
        for field in party._meta.concrete_fields:
            if field.primary_key:
                party_snapshot[field.name] = party.pk
                continue
            try:
                value = getattr(party, field.attname)
            except Exception:
                continue
            party_snapshot[field.name] = jsonable(value)

        canonical_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=LEGACY_COMPANY_ID,
                source_table="contacts",
                target_content_type=bp_ct,
                target_object_id=str(party.id),
            ).order_by("id")
        )
        if len(canonical_maps) != 1:
            raise RuntimeError(
                f"Expected one canonical contacts map for party {party.id}, got {len(canonical_maps)}"
            )
        legacy_contact_id = clean(canonical_maps[0].legacy_id)

        print("[A10D] 4/7 Building exact branch/group reference evidence...", flush=True)

        group_evidence = defaultdict(lambda: Counter())

        for model, party_field, branch_field in refs:
            model_name = model._meta.label
            qs = model._default_manager.filter(
                company_id=company_id,
                **{party_field: party.id},
            ).values("id", branch_field)
            for row in qs.iterator(chunk_size=10000):
                bid = row[branch_field]
                if bid is None:
                    group = "NULL_BRANCH"
                else:
                    group = group_by_branch_id.get(int(bid), f"UNKNOWN_BRANCH_{bid}")
                group_evidence[group][model_name] += 1

        a6_routes = parse_a6_routes()
        cp_total = 0
        cp_by_group = Counter()

        cp_qs = CustomerPayment.objects.filter(company_id=company_id).filter(
            models_Q_customer_or_counterparty(party.id)
        ).select_related("sales_invoice").order_by("id")

        for payment in cp_qs.iterator(chunk_size=10000):
            cp_total += 1
            if payment.sales_invoice_id and payment.sales_invoice and payment.sales_invoice.branch_id:
                group = group_by_branch_id.get(
                    int(payment.sales_invoice.branch_id),
                    f"UNKNOWN_BRANCH_{payment.sales_invoice.branch_id}",
                )
            else:
                group = a6_routes.get(int(payment.id), "MISSING_A6_ROUTE")
            cp_by_group[group] += 1
            group_evidence[group]["treasury.CustomerPayment"] += 1

        print("[A10D] 5/7 Inspecting exact legacy opening-balance source evidence...", flush=True)

        payload = (
            json.loads(
                CACHE_FILE.read_text(
                    encoding="utf-8-sig",
                    errors="replace",
                )
            ).get("payload")
            or {}
        )

        opening_collections = {}
        contact_mentions = []

        for collection_name, collection in payload.items():
            if not isinstance(collection, list):
                continue

            if "opening" in clean(collection_name).lower():
                opening_collections[clean(collection_name)] = [
                    jsonable(row)
                    for row in collection
                    if isinstance(row, dict)
                ]

            for row in collection:
                if not isinstance(row, dict):
                    continue
                if row_mentions_contact(row, legacy_contact_id):
                    contact_mentions.append({
                        "collection": clean(collection_name),
                        "row": jsonable(row),
                        "locations": extract_location_candidates(row),
                    })

        opening_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=LEGACY_COMPANY_ID,
                source_table="opening_balances",
            ).select_related("target_content_type").order_by("legacy_id")
        )

        opening_map_evidence = []
        for m in opening_maps:
            ct = m.target_content_type
            opening_map_evidence.append({
                "legacy_id": clean(m.legacy_id),
                "target": (
                    f"{clean(ct.app_label)}.{clean(ct.model)}:{clean(m.target_object_id)}"
                    if ct is not None else clean(m.target_object_id)
                ),
                "source_reference": clean(m.source_reference),
                "metadata": jsonable(m.metadata or {}),
            })

        # Determine whether any contact/opening row gives a unique legacy location.
        legacy_location_candidates = set()
        location_evidence = []

        for hit in contact_mentions:
            for key, value in hit["locations"]:
                if value in branch_id_by_legacy:
                    bid = branch_id_by_legacy[value]
                    gid = group_by_branch_id.get(bid)
                    if gid:
                        legacy_location_candidates.add(value)
                        location_evidence.append({
                            "collection": hit["collection"],
                            "key": key,
                            "legacy_location_id": value,
                            "current_branch_id_snapshot": bid,
                            "target_group": gid,
                        })

        unique_groups_from_source = sorted({
            row["target_group"] for row in location_evidence
        })

        print("[A10D] 6/7 Freezing deterministic opening-balance policy...", flush=True)

        opening_balance = str(party.opening_balance)

        if len(unique_groups_from_source) == 1:
            balance_owner_group = unique_groups_from_source[0]
            provenance = "UNIQUE_RAW_SOURCE_LOCATION"
            policy_result = "PASS"
        elif len(unique_groups_from_source) == 0:
            # Existing frozen master rule: company-level/unattributed master data
            # stays on the canonical source survivor; do not invent allocation.
            balance_owner_group = SOURCE_GROUP
            provenance = "NO_BRANCH_PROVENANCE_KEEP_CANONICAL_SOURCE_SURVIVOR"
            policy_result = "PASS"
        else:
            balance_owner_group = None
            provenance = "MULTIPLE_SOURCE_GROUPS_REQUIRES_MANUAL_PARTITION"
            policy_result = "REVIEW_REQUIRED"

        clone_balance_policy = {}
        for gid in usage_groups:
            clone_balance_policy[gid] = (
                opening_balance if gid == balance_owner_group else "0"
            )

        policy = {
            "schema": "primeyacc.company_split_business_party_opening_balance_policy.v1",
            "manifest_v2_sha256": EXPECTED_MANIFEST_SHA256,
            "legacy_company_id": LEGACY_COMPANY_ID,
            "legacy_contact_id": legacy_contact_id,
            "current_business_party_id_snapshot": int(party.id),
            "opening_balance_snapshot": opening_balance,
            "usage_groups": usage_groups,
            "clone_required_groups": clone_groups,
            "balance_owner_group": balance_owner_group,
            "balance_owner_provenance": provenance,
            "group_opening_balance_policy": clone_balance_policy,
            "canonical_source_rule": (
                "Canonical original BusinessParty remains on 88-G01. "
                "If balance belongs to another uniquely proven group, set canonical opening_balance=0 "
                "and assign the full frozen balance only to that destination clone. "
                "All other clones receive opening_balance=0."
            ),
            "no_duplication_rule": "SUM_OF_POST_SPLIT_OPENING_BALANCES_MUST_EQUAL_PRE_SPLIT_OPENING_BALANCE",
        }

        POLICY.write_text(
            json.dumps(policy, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        policy_sha = sha256_file(POLICY)

        print("[A10D] 7/7 Writing closure report...", flush=True)

        lines.extend([
            "===== EXACT BUSINESSPARTY =====",
            f"CURRENT_PARTY_ID={party.id}",
            f"LEGACY_CONTACT_ID={legacy_contact_id}",
            f"DISPLAY_NAME={clean(getattr(party, 'display_name', ''))}",
            f"CODE={clean(getattr(party, 'code', ''))}",
            f"OPENING_BALANCE={opening_balance}",
            f"PARTY_BRANCH_ID={getattr(party, 'branch_id', None)}",
            f"USAGE_GROUPS={usage_groups}",
            f"CLONE_REQUIRED_GROUPS={clone_groups}",
            f"GROUP_REFERENCE_EVIDENCE={json.dumps({k: dict(v) for k, v in sorted(group_evidence.items())}, ensure_ascii=False, sort_keys=True)}",
            f"CUSTOMER_PAYMENT_TOTAL_FOR_PARTY={cp_total}",
            f"CUSTOMER_PAYMENT_BY_GROUP={dict(sorted(cp_by_group.items()))}",
            "",
            "===== LEGACY OPENING BALANCE EVIDENCE =====",
            f"OPENING_COLLECTION_NAMES={sorted(opening_collections)}",
            f"OPENING_COLLECTIONS={json.dumps(opening_collections, ensure_ascii=False, sort_keys=True)}",
            f"CONTACT_MENTION_ROW_COUNT={len(contact_mentions)}",
            f"CONTACT_MENTIONS={json.dumps(contact_mentions, ensure_ascii=False, sort_keys=True)}",
            f"OPENING_BALANCE_LEGACY_MAP_COUNT={len(opening_map_evidence)}",
            f"OPENING_BALANCE_LEGACY_MAPS={json.dumps(opening_map_evidence, ensure_ascii=False, sort_keys=True)}",
            f"SOURCE_LOCATION_EVIDENCE={json.dumps(location_evidence, ensure_ascii=False, sort_keys=True)}",
            f"UNIQUE_SOURCE_GROUPS={unique_groups_from_source}",
            "",
            "===== A10D POLICY =====",
            f"BALANCE_OWNER_GROUP={balance_owner_group}",
            f"BALANCE_OWNER_PROVENANCE={provenance}",
            f"GROUP_OPENING_BALANCE_POLICY={clone_balance_policy}",
            "NO_DUPLICATION_CHECK=SUM(post-split opening balances) == pre-split opening balance",
            f"POLICY={POLICY.name}",
            f"POLICY_SHA256={policy_sha}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "GIT_PUSH=0",
            f"A10D_RESULT={policy_result}",
            (
                "NEXT_STAGE=A8C_FINANCIAL_POLICY_AMENDMENT_FREEZE"
                if policy_result == "PASS"
                else "NEXT_STAGE=A10D_REVIEW"
            ),
            "=" * 120,
        ])

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10D =====")
        print(f"A10D_RESULT={policy_result}")
        print(f"LEGACY_CONTACT_ID={legacy_contact_id}")
        print(f"OPENING_BALANCE={opening_balance}")
        print(f"USAGE_GROUPS={usage_groups}")
        print(f"BALANCE_OWNER_GROUP={balance_owner_group}")
        print(f"BALANCE_OWNER_PROVENANCE={provenance}")
        print(f"UNIQUE_SOURCE_GROUPS={unique_groups_from_source}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"POLICY={POLICY.name}")
        print(f"POLICY_SHA256={policy_sha}")

        return 0 if policy_result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A10D_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA10D_RESULT=INTERRUPTED", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A10D_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("===== PRIMEYACC COMPANY SPLIT A10D =====", flush=True)
        print("A10D_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SHA256={sha256_file(REPORT)}", flush=True)
        return 2


def models_Q_customer_or_counterparty(party_id: int):
    from django.db.models import Q
    return Q(customer_id=party_id) | Q(counterparty_id=party_id)


if __name__ == "__main__":
    raise SystemExit(main())

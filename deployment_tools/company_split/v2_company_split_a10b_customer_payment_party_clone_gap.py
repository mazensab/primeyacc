#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

MANIFEST = ROOT / "v2_company_split_transformation_manifest.json"
A9_REPORT = ROOT / "v2_company_split_a9_worktree_guard.txt"
A6C_REPORT = ROOT / "v2_company_split_a6c_customer_payment_semantics.txt"
A6D_REPORT = ROOT / "v2_company_split_a6d_exact_12_payment_closure.txt"
A6E_REPORT = ROOT / "v2_company_split_a6e_final_4_payment_closure.txt"
A7_REPORT = ROOT / "v2_company_split_a7_master_clone_remap_audit.txt"

REPORT = ROOT / "v2_company_split_a10b_customer_payment_party_clone_gap.txt"
AMENDMENT = ROOT / "v2_company_split_a10b_party_clone_amendment.json"

SOURCE_SYSTEM = "mhamcloud_v1"

EXPECTED_MANIFEST_SHA256 = "42E39C884EE60EB097EE6BA30DB63628E75CCE1F084CF691EE04C3D9B79B981F"
EXPECTED_A9_SHA256 = "4CF7A4A0E3E94FF4E16E604C9C1EC2861F5D6033AC4E27A26C4C0945AB168199"
EXPECTED_A6C_SHA256 = "8CF446BBD07411EE100200F24A6214DCD1FC0C560304B218CB54BAE46F14BA02"
EXPECTED_A6D_SHA256 = "8FF94113ECA773F1B358BC6F6BEB9AE647E785FF5AA8B70742ED49B747911300"
EXPECTED_A6E_SHA256 = "97F98DAD8C3AC7CE8D86D6C4D5F8DA6E50ADE70ABED3853DBBD902ADE09F5332"
EXPECTED_A7_SHA256 = "CED410C22A5F128B4A039832F9D5839AD2ACAF3A203D7FB0C3D1F325BFBB99BB"
EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH_HASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

A7_USAGE_MASTER_ESTIMATE = 43887
QUERY_TIMEOUT_MS = 60000


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


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
    if cp.returncode:
        raise RuntimeError(
            f"git {' '.join(args)} failed rc={cp.returncode}: {clean(cp.stderr or cp.stdout)}"
        )
    return cp.stdout.strip()


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


def parse_a6_payment_routes() -> dict[int, dict[str, Any]]:
    routes: dict[int, dict[str, Any]] = {}

    a6c = A6C_REPORT.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(
        r"PAYMENT current_id=(\d+).*?\| semantic=TRANSACTION_LINKED_PAYMENT_RECOVERED_FROM_SOURCE_TRANSACTION_ID \| route=([0-9]+-G[0-9]+)",
        a6c,
    ):
        routes[int(m.group(1))] = {
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
            routes[int(m.group(2))] = {
                "legacy_company_id": m.group(1),
                "legacy_branch_id": m.group(3),
                "current_branch_id_snapshot": int(m.group(4)),
                "target_group": m.group(5),
                "branch_policy": "SOURCE_TRANSACTION_ROUTE",
                "source": "A6D",
            }

    a6e = A6E_REPORT.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(
        r"ROUTED\|legacy_company=(\d+)\|customer_payment=(\d+)\|legacy_branch=(\d+)\|current_branch=(\d+)\|target_group=([^|]+)\|reason=([^\n]+)",
        a6e,
    ):
        routes[int(m.group(2))] = {
            "legacy_company_id": m.group(1),
            "legacy_branch_id": m.group(3),
            "current_branch_id_snapshot": int(m.group(4)),
            "target_group": m.group(5),
            "branch_policy": "SOURCE_TRANSACTION_ROUTE",
            "source": "A6E",
        }

    for m in re.finditer(
        r"PRESERVE_ORPHAN\|legacy_company=(\d+)\|customer_payment=(\d+)\|missing_legacy_transaction=(\d+)\|payment_for=([^|]+)\|target_group=([^|]+)\|branch=NULL",
        a6e,
    ):
        routes[int(m.group(2))] = {
            "legacy_company_id": m.group(1),
            "target_group": m.group(5),
            "branch_policy": "KEEP_NULL",
            "source": "A6E_ORPHAN",
        }

    return routes


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A10B CUSTOMER PAYMENT → BUSINESSPARTY CLONE GAP",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_TARGETED_AUDIT",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A10B] 1/6 Validating frozen chain and Git gate...", flush=True)

        required = [
            (MANIFEST, EXPECTED_MANIFEST_SHA256, "Manifest"),
            (A9_REPORT, EXPECTED_A9_SHA256, "A9"),
            (A6C_REPORT, EXPECTED_A6C_SHA256, "A6C"),
            (A6D_REPORT, EXPECTED_A6D_SHA256, "A6D"),
            (A6E_REPORT, EXPECTED_A6E_SHA256, "A6E"),
            (A7_REPORT, EXPECTED_A7_SHA256, "A7"),
        ]
        for path, expected, label in required:
            if not path.exists():
                raise RuntimeError(f"Missing {label}: {path.name}")
            actual = sha256_file(path)
            if actual != expected:
                raise RuntimeError(
                    f"{label} SHA mismatch expected={expected} actual={actual}"
                )

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin_main = git_text("rev-parse", "origin/main")
        status = git_text("status", "--short", "--untracked-files=no")
        stash = git_text("rev-parse", "stash@{0}")

        if branch != "main":
            raise RuntimeError(f"Expected main, got {branch}")
        if head != EXPECTED_HEAD or origin_main != EXPECTED_HEAD:
            raise RuntimeError(f"Git baseline drift head={head} origin={origin_main}")
        if status:
            raise RuntimeError(f"Tracked worktree not clean: {status}")
        if stash != EXPECTED_STASH_HASH:
            raise RuntimeError(
                f"V2-26C stash drift expected={EXPECTED_STASH_HASH} actual={stash}"
            )

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

        print("[A10B] 2/6 Loading Django and exact split groups...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()
        import django
        django.setup()

        from django.apps import apps
        from django.contrib.contenttypes.models import ContentType
        from django.db import connection

        from business_controls.models import LegacyObjectMap
        from companies.models import Company
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        scoped_entries = manifest["companies"]
        surviving_entries = [
            x for x in scoped_entries
            if x["mode"] in {"SPLIT", "PARTIAL_INCLUDE"}
        ]
        surviving_legacy_ids = {clean(x["legacy_company_id"]) for x in surviving_entries}

        company_maps = {
            clean(x.legacy_id): x
            for x in LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=surviving_legacy_ids,
            )
        }
        company_id_by_legacy = {}
        for lcid in surviving_legacy_ids:
            row = company_maps[lcid]
            raw = clean(row.target_object_id) or clean(row.company_id)
            if not raw.isdigit():
                raise RuntimeError(f"Missing current company id for {lcid}")
            company_id_by_legacy[lcid] = int(raw)

        legacy_by_company_id = {v: k for k, v in company_id_by_legacy.items()}
        source_company_ids = sorted(company_id_by_legacy.values())

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=surviving_legacy_ids,
            )
        )
        pair_by_branch_id = {}
        for row in branch_maps:
            raw = clean(row.target_object_id)
            if raw.isdigit():
                pair_by_branch_id[int(raw)] = (
                    clean(row.legacy_company_id),
                    clean(row.legacy_id),
                )

        group_by_branch_id = {}
        source_group_by_company = {}
        partial_purge_branch_ids = set()

        for entry in surviving_entries:
            lcid = clean(entry["legacy_company_id"])
            if entry["mode"] == "SPLIT":
                source_group_by_company[lcid] = entry["retained_source_group"]
                for group in entry["output_groups"]:
                    for lbid in group["legacy_branch_ids"]:
                        bid = next(
                            (
                                bid for bid, pair in pair_by_branch_id.items()
                                if pair == (lcid, clean(lbid))
                            ),
                            None,
                        )
                        if bid is None:
                            raise RuntimeError(f"Missing branch map {lcid}/{lbid}")
                        group_by_branch_id[bid] = group["group_id"]
            else:
                source_group_by_company[lcid] = "SOURCE_COMPANY_SURVIVES"
                for lbid in entry["keep_legacy_branch_ids"]:
                    bid = next(
                        (
                            bid for bid, pair in pair_by_branch_id.items()
                            if pair == (lcid, clean(lbid))
                        ),
                        None,
                    )
                    if bid is None:
                        raise RuntimeError(f"Missing kept branch map {lcid}/{lbid}")
                    group_by_branch_id[bid] = "SOURCE_COMPANY_SURVIVES"
                for lbid in entry["exclude_legacy_branch_ids"]:
                    bid = next(
                        (
                            bid for bid, pair in pair_by_branch_id.items()
                            if pair == (lcid, clean(lbid))
                        ),
                        None,
                    )
                    if bid is None:
                        raise RuntimeError(f"Missing excluded branch map {lcid}/{lbid}")
                    partial_purge_branch_ids.add(bid)

        print("[A10B] 3/6 Rebuilding A7 BusinessParty usage groups...", flush=True)

        BusinessParty = apps.get_model("parties", "BusinessParty")
        party_usage_groups = defaultdict(set)

        contracts = [
            ("sales", "SalesInvoice", "customer", "branch_id"),
            ("sales", "SalesReturn", "customer", "branch_id"),
            ("purchases", "PurchaseBill", "supplier", "branch_id"),
        ]

        for app_label, model_name, party_field, branch_lookup in contracts:
            model = apps.get_model(app_label, model_name)
            print(
                f"[A10B]   baseline {model._meta.label}.{party_field}",
                flush=True,
            )
            qs = (
                model._default_manager.filter(
                    company_id__in=source_company_ids,
                    **{f"{party_field}_id__isnull": False},
                )
                .order_by()
                .values("company_id", f"{party_field}_id", branch_lookup)
                .distinct()
            )
            for row in qs.iterator(chunk_size=10000):
                cid = int(row["company_id"])
                lcid = legacy_by_company_id[cid]
                party_id = int(row[f"{party_field}_id"])
                bid = row[branch_lookup]
                if bid is None:
                    continue
                bid = int(bid)
                if bid in partial_purge_branch_ids:
                    continue
                gid = group_by_branch_id.get(bid)
                if gid:
                    party_usage_groups[(lcid, party_id)].add(gid)

        print("[A10B] 4/6 Adding CustomerPayment destination usage...", flush=True)

        a6_routes = parse_a6_payment_routes()
        if len(a6_routes) != 412:
            raise RuntimeError(f"Expected 412 A6 routes, got {len(a6_routes)}")

        party_company_by_id = dict(
            BusinessParty.objects.filter(company_id__in=source_company_ids)
            .values_list("id", "company_id")
        )

        payment_required_groups = defaultdict(set)
        payment_reference_counts = Counter()
        duplicate_raw_party_slots = 0
        cross_company_errors = []
        missing_a6_routes = []

        payments = (
            CustomerPayment.objects.filter(company_id__in=source_company_ids)
            .select_related("sales_invoice")
            .order_by("pk")
        )

        special_count = 0

        for payment in payments.iterator(chunk_size=20000):
            lcid = legacy_by_company_id[int(payment.company_id)]

            if (
                payment.sales_invoice_id
                and payment.sales_invoice
                and payment.sales_invoice.branch_id
            ):
                bid = int(payment.sales_invoice.branch_id)
                if bid in partial_purge_branch_ids:
                    continue
                target_group = group_by_branch_id.get(bid)
                if not target_group:
                    raise RuntimeError(
                        f"Payment {payment.id} invoice branch {bid} has no surviving target"
                    )
            else:
                special_count += 1
                route = a6_routes.get(int(payment.id))
                if route is None:
                    missing_a6_routes.append(int(payment.id))
                    continue
                target_group = route["target_group"]

            # customer_id and counterparty_id often repeat the same Party ID.
            raw_party_ids = [
                int(x)
                for x in (payment.customer_id, payment.counterparty_id)
                if x is not None
            ]
            if len(raw_party_ids) == 2 and raw_party_ids[0] == raw_party_ids[1]:
                duplicate_raw_party_slots += 1

            for party_id in set(raw_party_ids):
                party_company_id = party_company_by_id.get(party_id)
                if party_company_id is None:
                    continue
                if int(party_company_id) != int(payment.company_id):
                    cross_company_errors.append(
                        f"payment={payment.id} party={party_id} "
                        f"party_company={party_company_id} payment_company={payment.company_id}"
                    )
                    continue

                payment_required_groups[(lcid, party_id)].add(target_group)
                payment_reference_counts[(lcid, party_id, target_group)] += 1

        if special_count != 412:
            raise RuntimeError(
                f"Surviving split/partial special CustomerPayment drift expected=412 actual={special_count}"
            )
        if missing_a6_routes:
            raise RuntimeError(
                f"Missing A6 routes: {missing_a6_routes[:20]}"
            )
        if cross_company_errors:
            raise RuntimeError(
                f"Cross-company raw party IDs: {cross_company_errors[:20]}"
            )

        additional_pairs = []
        additional_by_party = defaultdict(set)

        for key, required_groups in payment_required_groups.items():
            baseline_groups = party_usage_groups.get(key, set())
            missing_groups = sorted(required_groups - baseline_groups)
            if not missing_groups:
                continue
            lcid, party_id = key
            for gid in missing_groups:
                additional_pairs.append((lcid, party_id, gid))
                additional_by_party[(lcid, party_id)].add(gid)

        print("[A10B] 5/6 Resolving canonical legacy contacts and balance safety...", flush=True)

        party_ct = ContentType.objects.get_for_model(BusinessParty)
        target_ids = [str(party_id) for _lcid, party_id in additional_by_party]

        maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="contacts",
                target_content_type=party_ct,
                target_object_id__in=target_ids,
            )
        )
        maps_by_target = defaultdict(list)
        for row in maps:
            maps_by_target[(clean(row.legacy_company_id), clean(row.target_object_id))].append(row)

        amendment_rows = []
        missing_canonical_maps = []
        duplicate_canonical_maps = []
        nonzero_opening_balance = []

        party_objects = {
            int(x.id): x
            for x in BusinessParty.objects.filter(
                id__in=[party_id for _lcid, party_id in additional_by_party]
            )
        }

        for (lcid, party_id), groups in sorted(
            additional_by_party.items(),
            key=lambda item: (nkey(item[0][0]), item[0][1]),
        ):
            canonical = maps_by_target.get((lcid, str(party_id)), [])
            if len(canonical) == 0:
                missing_canonical_maps.append((lcid, party_id))
                legacy_contact_id = ""
            elif len(canonical) > 1:
                duplicate_canonical_maps.append(
                    (lcid, party_id, [clean(x.legacy_id) for x in canonical])
                )
                legacy_contact_id = clean(canonical[0].legacy_id)
            else:
                legacy_contact_id = clean(canonical[0].legacy_id)

            party = party_objects[party_id]
            if party.opening_balance != 0:
                nonzero_opening_balance.append(
                    {
                        "legacy_company_id": lcid,
                        "current_party_id": party_id,
                        "legacy_contact_id": legacy_contact_id,
                        "opening_balance": str(party.opening_balance),
                        "target_groups": sorted(groups),
                    }
                )

            amendment_rows.append({
                "legacy_company_id": lcid,
                "legacy_contact_id": legacy_contact_id,
                "current_business_party_id_snapshot": party_id,
                "display_name_snapshot": clean(party.display_name),
                "code_snapshot": clean(party.code),
                "additional_target_groups": sorted(groups),
                "payment_reference_counts": {
                    gid: payment_reference_counts[(lcid, party_id, gid)]
                    for gid in sorted(groups)
                },
                "reason": "CUSTOMER_PAYMENT_RAW_PARTY_REFERENCE_REQUIRES_DESTINATION_BUSINESSPARTY_CLONE",
            })

        additional_clone_count = len(additional_pairs)
        revised_usage_master_estimate = A7_USAGE_MASTER_ESTIMATE + additional_clone_count

        amendment = {
            "schema": "primeyacc.company_split_customer_payment_party_clone_amendment.v1",
            "base_manifest_sha256": EXPECTED_MANIFEST_SHA256,
            "base_a7_usage_master_clone_estimate": A7_USAGE_MASTER_ESTIMATE,
            "additional_business_party_clone_actions": additional_clone_count,
            "revised_usage_master_clone_estimate": revised_usage_master_estimate,
            "identity_contract": "LEGACY_CONTACT_IDS_AUTHORITATIVE; CURRENT_BUSINESS_PARTY_IDS_SNAPSHOT_ONLY",
            "rows": amendment_rows,
        }

        AMENDMENT.write_text(
            json.dumps(amendment, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        amendment_sha = sha256_file(AMENDMENT)

        print("[A10B] 6/6 Writing closure report...", flush=True)

        safety_errors = []
        if missing_canonical_maps:
            safety_errors.append(
                f"MISSING_CANONICAL_CONTACT_MAPS={missing_canonical_maps}"
            )
        if duplicate_canonical_maps:
            safety_errors.append(
                f"DUPLICATE_CANONICAL_CONTACT_MAPS={duplicate_canonical_maps}"
            )
        if nonzero_opening_balance:
            safety_errors.append(
                f"NONZERO_OPENING_BALANCE_ON_NEW_PAYMENT_DRIVEN_CLONES={nonzero_opening_balance}"
            )

        per_company = Counter(lcid for lcid, _party, _gid in additional_pairs)
        per_group = Counter(gid for _lcid, _party, gid in additional_pairs)

        lines.extend([
            "===== A10B RESULT =====",
            f"SPECIAL_CUSTOMER_PAYMENT_COUNT={special_count}",
            f"DUPLICATE_CUSTOMER_COUNTERPARTY_SLOT_COUNT={duplicate_raw_party_slots}",
            f"BUSINESSPARTY_WITH_PAYMENT_USAGE_COUNT={len(payment_required_groups)}",
            f"BUSINESSPARTY_ADDITIONAL_CLONE_MASTER_COUNT={len(additional_by_party)}",
            f"ADDITIONAL_BUSINESSPARTY_CLONE_ACTION_COUNT={additional_clone_count}",
            f"ADDITIONAL_CLONE_ACTIONS_BY_COMPANY={dict(sorted(per_company.items(), key=lambda x: nkey(x[0])))}",
            f"ADDITIONAL_CLONE_ACTIONS_BY_GROUP={dict(sorted(per_group.items()))}",
            f"BASE_A7_USAGE_MASTER_CLONE_ESTIMATE={A7_USAGE_MASTER_ESTIMATE}",
            f"REVISED_USAGE_MASTER_CLONE_ESTIMATE={revised_usage_master_estimate}",
            f"MISSING_CANONICAL_CONTACT_MAP_COUNT={len(missing_canonical_maps)}",
            f"DUPLICATE_CANONICAL_CONTACT_MAP_COUNT={len(duplicate_canonical_maps)}",
            f"NONZERO_OPENING_BALANCE_COUNT={len(nonzero_opening_balance)}",
            f"SAFETY_ERROR_COUNT={len(safety_errors)}",
            "",
            "ADDITIONAL_CLONE_ROWS_BEGIN",
        ])

        for row in amendment_rows:
            lines.append(json.dumps(row, ensure_ascii=False, sort_keys=True))

        lines.append("ADDITIONAL_CLONE_ROWS_END")

        if safety_errors:
            lines.append("SAFETY_ERRORS_BEGIN")
            lines.extend(safety_errors)
            lines.append("SAFETY_ERRORS_END")

        lines.extend([
            f"AMENDMENT={AMENDMENT.name}",
            f"AMENDMENT_SIZE={AMENDMENT.stat().st_size}",
            f"AMENDMENT_SHA256={amendment_sha}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "GIT_PUSH=0",
            f"A10B_RESULT={'PASS' if not safety_errors else 'REVIEW_REQUIRED'}",
            (
                "NEXT_STAGE=A8B_MANIFEST_AMENDMENT_FREEZE"
                if not safety_errors and additional_clone_count > 0
                else (
                    "NEXT_STAGE=A10_V4"
                    if not safety_errors
                    else "NEXT_STAGE=A10B_REVIEW"
                )
            ),
            "=" * 120,
        ])

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10B =====")
        print(f"A10B_RESULT={'PASS' if not safety_errors else 'REVIEW_REQUIRED'}")
        print(f"BUSINESSPARTY_ADDITIONAL_CLONE_MASTER_COUNT={len(additional_by_party)}")
        print(f"ADDITIONAL_BUSINESSPARTY_CLONE_ACTION_COUNT={additional_clone_count}")
        print(f"REVISED_USAGE_MASTER_CLONE_ESTIMATE={revised_usage_master_estimate}")
        print(f"NONZERO_OPENING_BALANCE_COUNT={len(nonzero_opening_balance)}")
        print(f"SAFETY_ERROR_COUNT={len(safety_errors)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"AMENDMENT={AMENDMENT.name}")
        print(f"AMENDMENT_SIZE={AMENDMENT.stat().st_size}")
        print(f"AMENDMENT_SHA256={amendment_sha}")

        return 0 if not safety_errors else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A10B_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA10B_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A10B_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = sha256_file(REPORT)
        print("===== PRIMEYACC COMPANY SPLIT A10B =====", flush=True)
        print("A10B_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

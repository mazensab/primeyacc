#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
DECISION_MAP = ROOT / "v2_company_split_decision_map.json"
A6C_REPORT = ROOT / "v2_company_split_a6c_customer_payment_semantics.txt"
REPORT = ROOT / "v2_company_split_a6d_exact_12_payment_closure.txt"
CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"

SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
EXPECTED_A6C_SHA256 = "8CF446BBD07411EE100200F24A6214DCD1FC0C560304B218CB54BAE46F14BA02"
QUERY_TIMEOUT_MS = 60000

TRANSACTION_SOURCE_TABLES = {
    "transactions_sell",
    "transactions_sell_return",
    "transactions_purchase",
    "transactions_purchase_return",
}

LOCATION_KEYS = (
    "location_id",
    "business_location_id",
    "branch_id",
)


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def as_int(value: Any):
    s = clean(value)
    if not s or s.lower() in {"none", "null"}:
        return None
    try:
        return int(s)
    except Exception:
        return None


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
        raise RuntimeError("manage.py not found; run from PrimeyAcc project root")

    raw = manage.read_text(encoding="utf-8", errors="replace")
    match = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not match:
        raise RuntimeError("Could not detect DJANGO_SETTINGS_MODULE")
    return match.group(1)


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def relevant_row_preview(row: dict[str, Any]) -> dict[str, Any]:
    preferred = (
        "id",
        "business_id",
        "location_id",
        "business_location_id",
        "branch_id",
        "type",
        "sub_type",
        "status",
        "payment_status",
        "invoice_no",
        "ref_no",
        "return_parent_id",
        "created_at",
        "transaction_date",
        "final_total",
    )
    result = {}
    for key in preferred:
        if key in row:
            result[key] = row.get(key)
    return result


def extract_location_ids(row: dict[str, Any]) -> list[tuple[str, int]]:
    out = []
    for key in LOCATION_KEYS:
        value = as_int(row.get(key))
        if value is not None:
            out.append((key, value))
    return out


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A6D EXACT 12 PAYMENT CLOSURE",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        f"QUERY_TIMEOUT_MS={QUERY_TIMEOUT_MS}",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={git('branch','--show-current')}",
        f"HEAD={git('rev-parse','HEAD')}",
        f"ORIGIN_MAIN={git('rev-parse','origin/main')}",
    ]

    tracked = git("status", "--short", "--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not tracked else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        print("[A6D] 1/6 Validating frozen artifacts...", flush=True)

        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")
        decision_sha = hashlib.sha256(DECISION_MAP.read_bytes()).hexdigest().upper()
        if decision_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                f"Decision map SHA mismatch expected={EXPECTED_DECISION_SHA256} actual={decision_sha}"
            )

        if not A6C_REPORT.exists():
            raise RuntimeError(f"Missing {A6C_REPORT.name}")
        a6c_sha = hashlib.sha256(A6C_REPORT.read_bytes()).hexdigest().upper()
        if a6c_sha != EXPECTED_A6C_SHA256:
            raise RuntimeError(
                f"A6C SHA mismatch expected={EXPECTED_A6C_SHA256} actual={a6c_sha}"
            )

        a6c_text = A6C_REPORT.read_text(encoding="utf-8", errors="replace")
        problem_pairs = sorted(
            {
                (legacy_company_id, int(payment_id))
                for legacy_company_id, payment_id in re.findall(
                    r"legacy_company=(\d+)\|customer_payment=(\d+)",
                    a6c_text,
                )
            },
            key=lambda x: (nkey(x[0]), x[1]),
        )

        if len(problem_pairs) != 12:
            raise RuntimeError(
                f"Expected exactly 12 A6C problem rows, found {len(problem_pairs)}: {problem_pairs}"
            )

        decision = json.loads(DECISION_MAP.read_text(encoding="utf-8"))
        cfg_by_legacy = {
            clean(row["legacy_company_id"]): row
            for row in decision.get("companies", [])
            if clean(row.get("mode")) in {"SPLIT", "PARTIAL_INCLUDE"}
        }

        lines.extend([
            "",
            "===== FROZEN INPUTS =====",
            f"DECISION_MAP_SHA256={decision_sha}",
            f"A6C_REPORT_SHA256={a6c_sha}",
            f"PROBLEM_PAYMENT_COUNT={len(problem_pairs)}",
            f"PROBLEM_PAYMENT_IDS={problem_pairs}",
        ])

        print("[A6D] 2/6 Loading Django, maps, and source caches...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.contrib.contenttypes.models import ContentType
        from django.db import connection

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        legacy_company_ids = {lcid for lcid, _ in problem_pairs}

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=legacy_company_ids,
            )
        )
        company_id_by_legacy = {}
        for row in company_maps:
            raw = clean(row.target_object_id) or clean(row.company_id)
            if raw.isdigit():
                company_id_by_legacy[clean(row.legacy_id)] = int(raw)

        if set(company_id_by_legacy) != legacy_company_ids:
            raise RuntimeError(
                f"Company map mismatch expected={sorted(legacy_company_ids, key=nkey)} "
                f"actual={sorted(company_id_by_legacy, key=nkey)}"
            )

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=legacy_company_ids,
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

        group_by_branch = {}
        for lcid, cfg in cfg_by_legacy.items():
            if lcid not in legacy_company_ids:
                continue
            mode = clean(cfg.get("mode"))

            if mode == "SPLIT":
                for group in cfg.get("output_groups", []) or []:
                    gid = clean(group.get("group_id"))
                    for branch_row in group.get("branches", []) or []:
                        lbid = clean(branch_row.get("legacy_branch_id"))
                        bid = branch_id_by_pair.get((lcid, lbid))
                        if bid:
                            group_by_branch[(lcid, bid)] = gid
            else:
                for branch_row in cfg.get("kept_branches", []) or []:
                    lbid = clean(branch_row.get("legacy_branch_id"))
                    bid = branch_id_by_pair.get((lcid, lbid))
                    if bid:
                        group_by_branch[(lcid, bid)] = "SOURCE_COMPANY_SURVIVES"

        payments_by_id = CustomerPayment.objects.in_bulk(
            [payment_id for _, payment_id in problem_pairs]
        )

        cp_ct = ContentType.objects.get_for_model(CustomerPayment)
        cp_maps = {
            clean(row.target_object_id): row
            for row in LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                target_content_type=cp_ct,
                target_object_id__in=[
                    str(payment_id) for _, payment_id in problem_pairs
                ],
            )
        }

        cache_by_company = {}
        payments_source_by_company = {}
        collection_index_by_company = {}

        for lcid in sorted(legacy_company_ids, key=nkey):
            cache_file = CACHE_DIR / f"company_{lcid}.json"
            if not cache_file.exists():
                raise RuntimeError(f"Missing source cache {cache_file}")

            payload = (
                json.loads(
                    cache_file.read_text(
                        encoding="utf-8-sig",
                        errors="replace",
                    )
                ).get("payload")
                or {}
            )
            cache_by_company[lcid] = payload

            payment_index = {}
            collection_index = defaultdict(list)

            for collection_name, collection in payload.items():
                if not isinstance(collection, list):
                    continue
                for row in collection:
                    if not isinstance(row, dict):
                        continue
                    legacy_id = clean(row.get("id"))
                    if not legacy_id:
                        continue
                    collection_index[legacy_id].append(
                        (clean(collection_name), row)
                    )
                    if collection_name == "payments":
                        payment_index[legacy_id] = row

            payments_source_by_company[lcid] = payment_index
            collection_index_by_company[lcid] = collection_index

        print("[A6D] 3/6 Resolving raw legacy transaction location evidence...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "EXACT 12-PAYMENT RAW SOURCE EVIDENCE",
            "=" * 120,
        ])

        resolved = []
        unresolved = []
        raw_conflicts = []
        false_collision_count = 0

        for lcid, payment_id in problem_pairs:
            cid = company_id_by_legacy[lcid]
            payment = payments_by_id.get(payment_id)
            lom = cp_maps.get(str(payment_id))

            if payment is None:
                unresolved.append((lcid, payment_id, "CURRENT_PAYMENT_MISSING"))
                continue
            if lom is None:
                unresolved.append((lcid, payment_id, "PAYMENT_LEGACY_MAP_MISSING"))
                continue

            legacy_payment_id = clean(lom.legacy_id)
            source_payment = payments_source_by_company[lcid].get(
                legacy_payment_id
            )
            if not isinstance(source_payment, dict):
                unresolved.append((lcid, payment_id, "SOURCE_PAYMENT_ROW_MISSING"))
                continue

            transaction_id = as_int(source_payment.get("transaction_id"))
            payment_for = as_int(source_payment.get("payment_for"))

            lines.extend([
                "",
                f"PAYMENT legacy_company={lcid}"
                f" | current_payment={payment_id}"
                f" | legacy_payment={legacy_payment_id}"
                f" | payment_number={clean(payment.payment_number)}"
                f" | source_transaction_id={transaction_id}"
                f" | source_payment_for={payment_for}",
                f"  SOURCE_PAYMENT_PREVIEW={relevant_row_preview(source_payment)}",
            ])

            if transaction_id is None:
                unresolved.append(
                    (lcid, payment_id, "SOURCE_TRANSACTION_ID_NULL")
                )
                lines.append("  RESULT=UNRESOLVED_SOURCE_TRANSACTION_ID_NULL")
                continue

            raw_matches = collection_index_by_company[lcid].get(
                str(transaction_id),
                [],
            )

            tx_matches = []
            noise_matches = []

            for collection_name, row in raw_matches:
                entry = {
                    "collection": collection_name,
                    "preview": relevant_row_preview(row),
                    "locations": extract_location_ids(row),
                }

                if (
                    collection_name in TRANSACTION_SOURCE_TABLES
                    or (
                        "transaction" in collection_name
                        and "line" not in collection_name
                        and "payment" not in collection_name
                    )
                ):
                    tx_matches.append(entry)
                else:
                    noise_matches.append(entry)

            if noise_matches:
                false_collision_count += 1

            lines.append(f"  RAW_TRANSACTION_MATCHES={tx_matches}")
            if noise_matches:
                lines.append(
                    f"  SAME_NUMERIC_ID_NON_TRANSACTION_COLLISIONS={noise_matches}"
                )

            candidate_legacy_locations = []
            for entry in tx_matches:
                for key, legacy_location_id in entry["locations"]:
                    if (
                        lcid,
                        str(legacy_location_id),
                    ) in branch_id_by_pair:
                        candidate_legacy_locations.append(
                            (
                                entry["collection"],
                                key,
                                legacy_location_id,
                            )
                        )

            unique_legacy_locations = sorted(
                {
                    location_id
                    for _, _, location_id
                    in candidate_legacy_locations
                }
            )

            # Strong secondary evidence: exact transaction source-table LegacyObjectMap.
            exact_transaction_maps = list(
                LegacyObjectMap.objects.filter(
                    source_system=SOURCE_SYSTEM,
                    legacy_company_id=lcid,
                    legacy_id=str(transaction_id),
                    source_table__in=TRANSACTION_SOURCE_TABLES,
                )
                .select_related("target_content_type")
                .order_by("source_table", "id")
            )

            mapping_evidence = []
            mapping_branch_ids = []

            for tx_map in exact_transaction_maps:
                ct = tx_map.target_content_type
                target_label = (
                    f"{clean(ct.app_label)}.{clean(ct.model)}"
                    if ct is not None
                    else ""
                )

                branch_id = None

                if target_label == "sales.salesreturn":
                    from sales.models import SalesReturn
                    row = SalesReturn.objects.filter(
                        pk=as_int(tx_map.target_object_id)
                    ).values("branch_id").first()
                    branch_id = row.get("branch_id") if row else None

                elif target_label == "sales.salesinvoice":
                    from sales.models import SalesInvoice
                    row = SalesInvoice.objects.filter(
                        pk=as_int(tx_map.target_object_id)
                    ).values("branch_id").first()
                    branch_id = row.get("branch_id") if row else None

                elif target_label == "purchases.purchasebill":
                    from purchases.models import PurchaseBill
                    row = PurchaseBill.objects.filter(
                        pk=as_int(tx_map.target_object_id)
                    ).values("branch_id").first()
                    branch_id = row.get("branch_id") if row else None

                mapping_evidence.append(
                    {
                        "source_table": clean(tx_map.source_table),
                        "target": f"{target_label}:{clean(tx_map.target_object_id)}",
                        "branch_id": branch_id,
                    }
                )

                if (
                    branch_id is not None
                    and int(branch_id) in pair_by_branch_id
                ):
                    pair = pair_by_branch_id[int(branch_id)]
                    if pair[0] == lcid:
                        mapping_branch_ids.append(int(branch_id))

            lines.append(
                f"  EXACT_TRANSACTION_MAP_EVIDENCE={mapping_evidence}"
            )

            raw_branch_ids = [
                branch_id_by_pair[(lcid, str(location_id))]
                for location_id in unique_legacy_locations
                if (lcid, str(location_id)) in branch_id_by_pair
            ]

            unique_raw_branch_ids = sorted(set(raw_branch_ids))
            unique_map_branch_ids = sorted(set(mapping_branch_ids))

            chosen_branch_id = None
            decision_reason = ""

            # Raw source transaction location is authoritative for the split.
            if len(unique_raw_branch_ids) == 1:
                chosen_branch_id = unique_raw_branch_ids[0]
                decision_reason = "RAW_TRANSACTION_LOCATION_ID"

                # If exact transaction mapping has a branch, it must agree.
                if (
                    unique_map_branch_ids
                    and unique_map_branch_ids != [chosen_branch_id]
                ):
                    raw_conflicts.append(
                        (
                            lcid,
                            payment_id,
                            chosen_branch_id,
                            unique_map_branch_ids,
                        )
                    )

            # Fallback only if raw row exists but location wasn't present,
            # and exact transaction mapping points to one unique branch.
            elif len(unique_raw_branch_ids) == 0 and len(unique_map_branch_ids) == 1:
                chosen_branch_id = unique_map_branch_ids[0]
                decision_reason = "EXACT_TRANSACTION_MAP_UNIQUE_BRANCH"

            elif len(unique_raw_branch_ids) > 1:
                raw_conflicts.append(
                    (
                        lcid,
                        payment_id,
                        unique_raw_branch_ids,
                        unique_map_branch_ids,
                    )
                )

            if chosen_branch_id is None:
                unresolved.append(
                    (
                        lcid,
                        payment_id,
                        "NO_UNIQUE_TRANSACTION_LOCATION",
                    )
                )
                lines.append(
                    "  RESULT=UNRESOLVED_NO_UNIQUE_TRANSACTION_LOCATION"
                )
                continue

            pair = pair_by_branch_id.get(chosen_branch_id)
            legacy_branch_id = pair[1] if pair else ""
            target_group = group_by_branch.get(
                (lcid, chosen_branch_id),
                "UNKNOWN_GROUP",
            )
            branch = branches.get(chosen_branch_id)

            resolved.append(
                (
                    lcid,
                    payment_id,
                    legacy_branch_id,
                    chosen_branch_id,
                    target_group,
                    decision_reason,
                )
            )

            lines.append(
                f"  RESULT=RESOLVED"
                f" | decision_reason={decision_reason}"
                f" | legacy_branch={legacy_branch_id}"
                f" | current_branch={chosen_branch_id}"
                f" | branch_name={clean(branch.name if branch else '')}"
                f" | target_group={target_group}"
            )

        print("[A6D] 4/6 Validating the eight prior conflicts as table-ID collisions...", flush=True)

        # A6C conflict rows should become non-conflicting once only transaction
        # source tables + raw transaction locations are considered.
        a6c_conflict_pairs = {
            (lcid, int(payment_id))
            for lcid, payment_id in re.findall(
                r"legacy_company=(\d+)\|customer_payment=(\d+)",
                re.search(
                    r"CONFLICT_IDS_BEGIN(.*?)CONFLICT_IDS_END",
                    a6c_text,
                    flags=re.S,
                ).group(1)
                if re.search(
                    r"CONFLICT_IDS_BEGIN(.*?)CONFLICT_IDS_END",
                    a6c_text,
                    flags=re.S,
                )
                else "",
            )
        }

        resolved_pairs = {
            (lcid, payment_id)
            for lcid, payment_id, *_ in resolved
        }

        prior_conflicts_closed = sorted(
            a6c_conflict_pairs & resolved_pairs,
            key=lambda x: (nkey(x[0]), x[1]),
        )
        prior_conflicts_remaining = sorted(
            a6c_conflict_pairs - resolved_pairs,
            key=lambda x: (nkey(x[0]), x[1]),
        )

        lines.extend([
            "",
            "=" * 120,
            "PRIOR A6C CONFLICT RECONCILIATION",
            "=" * 120,
            f"A6C_PRIOR_CONFLICT_COUNT={len(a6c_conflict_pairs)}",
            f"PRIOR_CONFLICTS_CLOSED={len(prior_conflicts_closed)}",
            f"PRIOR_CONFLICTS_REMAINING={len(prior_conflicts_remaining)}",
            f"NON_TRANSACTION_NUMERIC_COLLISION_PAYMENT_COUNT={false_collision_count}",
        ])

        for pair in prior_conflicts_closed:
            lines.append(
                f"CLOSED legacy_company={pair[0]}|customer_payment={pair[1]}"
            )

        if prior_conflicts_remaining:
            lines.append("REMAINING_PRIOR_CONFLICTS_BEGIN")
            for pair in prior_conflicts_remaining:
                lines.append(
                    f"legacy_company={pair[0]}|customer_payment={pair[1]}"
                )
            lines.append("REMAINING_PRIOR_CONFLICTS_END")

        print("[A6D] 5/6 Building exact closure summary...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "A6D FINAL CLOSURE SUMMARY",
            "=" * 120,
            f"PROBLEM_PAYMENT_COUNT={len(problem_pairs)}",
            f"RESOLVED_PAYMENT_COUNT={len(resolved)}",
            f"UNRESOLVED_PAYMENT_COUNT={len(unresolved)}",
            f"RAW_OR_MAPPING_CONFLICT_COUNT={len(raw_conflicts)}",
            f"PRIOR_A6C_CONFLICT_COUNT={len(a6c_conflict_pairs)}",
            f"PRIOR_A6C_CONFLICTS_CLOSED={len(prior_conflicts_closed)}",
            f"PRIOR_A6C_CONFLICTS_REMAINING={len(prior_conflicts_remaining)}",
        ])

        if resolved:
            lines.append("FINAL_12_PAYMENT_ROUTE_MAP_BEGIN")
            for (
                lcid,
                payment_id,
                legacy_branch_id,
                current_branch_id,
                target_group,
                reason,
            ) in resolved:
                lines.append(
                    f"legacy_company={lcid}"
                    f"|customer_payment={payment_id}"
                    f"|legacy_branch={legacy_branch_id}"
                    f"|current_branch={current_branch_id}"
                    f"|target_group={target_group}"
                    f"|reason={reason}"
                )
            lines.append("FINAL_12_PAYMENT_ROUTE_MAP_END")

        if unresolved:
            lines.append("UNRESOLVED_BEGIN")
            for row in unresolved:
                lines.append(clean(row))
            lines.append("UNRESOLVED_END")

        if raw_conflicts:
            lines.append("RAW_CONFLICTS_BEGIN")
            for row in raw_conflicts:
                lines.append(clean(row))
            lines.append("RAW_CONFLICTS_END")

        result = (
            "PASS"
            if len(resolved) == 12
            and not unresolved
            and not raw_conflicts
            and not prior_conflicts_remaining
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "",
            "FINAL_CUSTOMER_PAYMENT_ROUTING_CONTRACT:",
            "A) Existing sales_invoice.branch remains the first routing source.",
            "B) For legacy payments without sales_invoice, use raw legacy transaction_id -> raw transaction location_id/business_location_id.",
            "C) Legacy IDs are table-scoped. Never treat a numeric collision in transaction_sell_lines as evidence for a transaction_id.",
            "D) Exact LegacyObjectMap transaction-table mapping is secondary corroboration/fallback only; source transaction location is authoritative when present.",
            "E) Any row without one unique destination remains a hard safety stop.",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A6D_RESULT={result}",
            "=" * 120,
        ])

        print("[A6D] 6/6 Writing report...", flush=True)

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A6D =====")
        print(f"A6D_RESULT={result}")
        print(f"PROBLEM_PAYMENT_COUNT={len(problem_pairs)}")
        print(f"RESOLVED_PAYMENT_COUNT={len(resolved)}")
        print(f"UNRESOLVED_PAYMENT_COUNT={len(unresolved)}")
        print(f"RAW_OR_MAPPING_CONFLICT_COUNT={len(raw_conflicts)}")
        print(f"PRIOR_A6C_CONFLICTS_REMAINING={len(prior_conflicts_remaining)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A6D_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA6D_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A6D_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A6D =====", flush=True)
        print("A6D_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

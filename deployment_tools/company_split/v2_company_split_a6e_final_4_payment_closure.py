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
A6D_REPORT = ROOT / "v2_company_split_a6d_exact_12_payment_closure.txt"
REPORT = ROOT / "v2_company_split_a6e_final_4_payment_closure.txt"
CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"

SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
EXPECTED_A6D_SHA256 = "8FF94113ECA773F1B358BC6F6BEB9AE647E785FF5AA8B70742ED49B747911300"
QUERY_TIMEOUT_MS = 60000

# Source-cache collection names are not identical to LegacyObjectMap source_table names.
TRANSACTION_COLLECTION_ALIASES = {
    "sales": "transactions_sell",
    "sale_returns": "transactions_sell_return",
    "purchases": "transactions_purchase",
    "purchase_returns": "transactions_purchase_return",
    "purchase_return": "transactions_purchase_return",
    "transactions_sell": "transactions_sell",
    "transactions_sell_return": "transactions_sell_return",
    "transactions_purchase": "transactions_purchase",
    "transactions_purchase_return": "transactions_purchase_return",
}

TRANSACTION_SOURCE_TABLES = set(TRANSACTION_COLLECTION_ALIASES.values())

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


def yesno(value: Any) -> str:
    return "YES" if bool(value) else "NO"


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


def extract_location_ids(row: dict[str, Any]) -> list[tuple[str, int]]:
    out = []
    for key in LOCATION_KEYS:
        value = as_int(row.get(key))
        if value is not None:
            out.append((key, value))
    return out


def compact_row(row: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "id",
        "business_id",
        "location_id",
        "business_location_id",
        "branch_id",
        "transaction_id",
        "payment_for",
        "type",
        "sub_type",
        "status",
        "payment_status",
        "invoice_no",
        "ref_no",
        "return_parent_id",
        "amount",
        "method",
        "payment_ref_no",
        "paid_on",
        "transaction_date",
        "created_at",
        "final_total",
    )
    return {key: row.get(key) for key in keys if key in row}


def metadata_preview(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    preferred = {}
    for key, item in value.items():
        lk = clean(key).lower()
        if any(
            token in lk
            for token in (
                "location",
                "branch",
                "transaction",
                "payment",
                "source",
                "legacy",
            )
        ):
            preferred[key] = item
    return preferred or value


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A6E FINAL 4 PAYMENT CLOSURE",
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
        print("[A6E] 1/6 Validating frozen artifacts...", flush=True)

        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")
        decision_sha = hashlib.sha256(
            DECISION_MAP.read_bytes()
        ).hexdigest().upper()
        if decision_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                f"Decision map SHA mismatch expected={EXPECTED_DECISION_SHA256} actual={decision_sha}"
            )

        if not A6D_REPORT.exists():
            raise RuntimeError(f"Missing {A6D_REPORT.name}")
        a6d_sha = hashlib.sha256(
            A6D_REPORT.read_bytes()
        ).hexdigest().upper()
        if a6d_sha != EXPECTED_A6D_SHA256:
            raise RuntimeError(
                f"A6D SHA mismatch expected={EXPECTED_A6D_SHA256} actual={a6d_sha}"
            )

        a6d_text = A6D_REPORT.read_text(
            encoding="utf-8",
            errors="replace",
        )
        unresolved_block = re.search(
            r"UNRESOLVED_BEGIN(.*?)UNRESOLVED_END",
            a6d_text,
            flags=re.S,
        )
        if not unresolved_block:
            raise RuntimeError("A6D unresolved block not found")

        problem_pairs = []
        for lcid, payment_id in re.findall(
            r"\('(\d+)'\s*,\s*(\d+)\s*,",
            unresolved_block.group(1),
        ):
            problem_pairs.append((lcid, int(payment_id)))

        problem_pairs = sorted(
            set(problem_pairs),
            key=lambda x: (nkey(x[0]), x[1]),
        )

        if len(problem_pairs) != 4:
            raise RuntimeError(
                f"Expected exactly 4 A6D unresolved payments, got {problem_pairs}"
            )

        decision = json.loads(
            DECISION_MAP.read_text(encoding="utf-8")
        )
        cfg_by_legacy = {
            clean(row["legacy_company_id"]): row
            for row in decision.get("companies", [])
            if clean(row.get("mode")) in {"SPLIT", "PARTIAL_INCLUDE"}
        }

        lines.extend([
            "",
            "===== FROZEN INPUTS =====",
            f"DECISION_MAP_SHA256={decision_sha}",
            f"A6D_REPORT_SHA256={a6d_sha}",
            f"PROBLEM_PAYMENT_COUNT={len(problem_pairs)}",
            f"PROBLEM_PAYMENT_IDS={problem_pairs}",
        ])

        print("[A6E] 2/6 Loading Django/maps/source cache...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.contrib.contenttypes.models import ContentType
        from django.db import connection

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch
        from parties.models import BusinessParty
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        legacy_company_ids = {
            lcid for lcid, _ in problem_pairs
        }

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
                company_id_by_legacy[
                    clean(row.legacy_id)
                ] = int(raw)

        if set(company_id_by_legacy) != legacy_company_ids:
            raise RuntimeError("Problem-company map mismatch")

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
                pair = (
                    clean(row.legacy_company_id),
                    clean(row.legacy_id),
                )
                bid = int(raw)
                branch_id_by_pair[pair] = bid
                pair_by_branch_id[bid] = pair

        branches = Branch.objects.in_bulk(
            list(pair_by_branch_id)
        )

        group_by_branch = {}
        retained_group_by_company = {}

        for lcid, cfg in cfg_by_legacy.items():
            if lcid not in legacy_company_ids:
                continue

            mode = clean(cfg.get("mode"))

            if mode == "SPLIT":
                default_groups = []
                for group in cfg.get("output_groups", []) or []:
                    gid = clean(group.get("group_id"))

                    for branch_row in group.get("branches", []) or []:
                        lbid = clean(
                            branch_row.get("legacy_branch_id")
                        )
                        bid = branch_id_by_pair.get(
                            (lcid, lbid)
                        )
                        if not bid:
                            continue

                        group_by_branch[
                            (lcid, bid)
                        ] = gid

                        branch = branches.get(bid)
                        if (
                            branch is not None
                            and bool(branch.is_default)
                        ):
                            default_groups.append(gid)

                if len(set(default_groups)) != 1:
                    raise RuntimeError(
                        f"Invalid retained group for {lcid}: {default_groups}"
                    )

                retained_group_by_company[
                    lcid
                ] = default_groups[0]

            else:
                retained_group_by_company[
                    lcid
                ] = "SOURCE_COMPANY_SURVIVES"

                for branch_row in cfg.get(
                    "kept_branches",
                    [],
                ) or []:
                    lbid = clean(
                        branch_row.get("legacy_branch_id")
                    )
                    bid = branch_id_by_pair.get(
                        (lcid, lbid)
                    )
                    if bid:
                        group_by_branch[
                            (lcid, bid)
                        ] = "SOURCE_COMPANY_SURVIVES"

        payments_by_id = CustomerPayment.objects.in_bulk(
            [payment_id for _, payment_id in problem_pairs]
        )
        cp_ct = ContentType.objects.get_for_model(
            CustomerPayment
        )
        cp_maps = {
            clean(row.target_object_id): row
            for row in LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                target_content_type=cp_ct,
                target_object_id__in=[
                    str(payment_id)
                    for _, payment_id in problem_pairs
                ],
            )
        }

        cache_payload_by_company = {}
        collection_index_by_company = {}
        payment_index_by_company = {}

        for lcid in sorted(legacy_company_ids, key=nkey):
            cache_file = CACHE_DIR / f"company_{lcid}.json"
            if not cache_file.exists():
                raise RuntimeError(
                    f"Missing source cache {cache_file}"
                )

            payload = (
                json.loads(
                    cache_file.read_text(
                        encoding="utf-8-sig",
                        errors="replace",
                    )
                ).get("payload")
                or {}
            )

            cache_payload_by_company[lcid] = payload

            collection_index = defaultdict(list)
            payment_index = {}

            for collection_name, collection in payload.items():
                if not isinstance(collection, list):
                    continue

                for row in collection:
                    if not isinstance(row, dict):
                        continue

                    legacy_id = clean(row.get("id"))
                    if not legacy_id:
                        continue

                    collection_index[
                        legacy_id
                    ].append(
                        (clean(collection_name), row)
                    )

                    if collection_name == "payments":
                        payment_index[
                            legacy_id
                        ] = row

            collection_index_by_company[
                lcid
            ] = collection_index
            payment_index_by_company[
                lcid
            ] = payment_index

        print("[A6E] 3/6 Resolving source collection aliases...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "FINAL FOUR PAYMENT EVIDENCE",
            "=" * 120,
        ])

        final_routes = []
        orphan_preserve = []
        unresolved = []
        conflicts = []

        for lcid, payment_id in problem_pairs:
            cid = company_id_by_legacy[lcid]
            payment = payments_by_id.get(payment_id)
            lom = cp_maps.get(str(payment_id))

            if payment is None or lom is None:
                unresolved.append(
                    (lcid, payment_id, "CURRENT_OR_MAP_MISSING")
                )
                continue

            legacy_payment_id = clean(lom.legacy_id)
            source_payment = payment_index_by_company[
                lcid
            ].get(legacy_payment_id)

            if not isinstance(source_payment, dict):
                unresolved.append(
                    (lcid, payment_id, "SOURCE_PAYMENT_MISSING")
                )
                continue

            transaction_id = as_int(
                source_payment.get("transaction_id")
            )
            payment_for = as_int(
                source_payment.get("payment_for")
            )

            lines.extend([
                "",
                f"PAYMENT legacy_company={lcid}"
                f" | current_payment={payment_id}"
                f" | legacy_payment={legacy_payment_id}"
                f" | source_transaction_id={transaction_id}"
                f" | source_payment_for={payment_for}",
                f"  SOURCE_PAYMENT_FULL={source_payment}",
            ])

            if transaction_id is None:
                unresolved.append(
                    (lcid, payment_id, "TRANSACTION_ID_NULL")
                )
                lines.append(
                    "  RESULT=UNRESOLVED_TRANSACTION_ID_NULL"
                )
                continue

            all_raw_matches = collection_index_by_company[
                lcid
            ].get(str(transaction_id), [])

            transaction_matches = []
            non_transaction_matches = []

            for collection_name, row in all_raw_matches:
                canonical = TRANSACTION_COLLECTION_ALIASES.get(
                    collection_name
                )

                evidence = {
                    "collection": collection_name,
                    "canonical_source_table": canonical,
                    "locations": extract_location_ids(row),
                    "row": compact_row(row),
                }

                if canonical:
                    transaction_matches.append(evidence)
                else:
                    non_transaction_matches.append(evidence)

            lines.append(
                f"  RAW_TRANSACTION_COLLECTION_MATCHES={transaction_matches}"
            )
            if non_transaction_matches:
                lines.append(
                    f"  NON_TRANSACTION_SAME_ID_MATCHES={non_transaction_matches}"
                )

            raw_location_ids = sorted(
                {
                    location_id
                    for evidence in transaction_matches
                    for _key, location_id in evidence["locations"]
                    if (
                        lcid,
                        str(location_id),
                    ) in branch_id_by_pair
                }
            )

            raw_branch_ids = sorted(
                {
                    branch_id_by_pair[
                        (lcid, str(location_id))
                    ]
                    for location_id in raw_location_ids
                }
            )

            # Every LegacyObjectMap with this numeric ID, same company.
            all_same_id_maps = list(
                LegacyObjectMap.objects.filter(
                    source_system=SOURCE_SYSTEM,
                    legacy_company_id=lcid,
                    legacy_id=str(transaction_id),
                )
                .select_related("target_content_type")
                .order_by("source_table", "id")
            )

            map_details = []

            for row in all_same_id_maps:
                ct = row.target_content_type
                target_label = (
                    f"{clean(ct.app_label)}."
                    f"{clean(ct.model)}"
                    if ct is not None
                    else ""
                )

                map_details.append(
                    {
                        "id": int(row.id),
                        "source_table": clean(row.source_table),
                        "target": (
                            f"{target_label}:"
                            f"{clean(row.target_object_id)}"
                        ),
                        "source_reference": clean(
                            row.source_reference
                        ),
                        "metadata": metadata_preview(
                            getattr(row, "metadata", {})
                            or {}
                        ),
                    }
                )

            lines.append(
                f"  ALL_SAME_ID_LEGACY_MAPS={map_details}"
            )

            # Check cross-company mapping existence only as integrity evidence;
            # never use it to route this company.
            other_company_maps = list(
                LegacyObjectMap.objects.filter(
                    source_system=SOURCE_SYSTEM,
                    legacy_id=str(transaction_id),
                )
                .exclude(
                    legacy_company_id=lcid
                )
                .values(
                    "legacy_company_id",
                    "source_table",
                    "target_object_id",
                )[:20]
            )

            if other_company_maps:
                lines.append(
                    f"  OTHER_COMPANY_SAME_ID_MAPS={other_company_maps}"
                )

            if len(raw_branch_ids) == 1:
                chosen_branch = raw_branch_ids[0]
                pair = pair_by_branch_id.get(
                    chosen_branch
                )
                legacy_branch = (
                    pair[1] if pair else ""
                )
                target_group = group_by_branch.get(
                    (lcid, chosen_branch),
                    "UNKNOWN_GROUP",
                )

                final_routes.append(
                    (
                        lcid,
                        payment_id,
                        legacy_branch,
                        chosen_branch,
                        target_group,
                        "RAW_SOURCE_TRANSACTION_COLLECTION_LOCATION",
                    )
                )

                lines.append(
                    f"  RESULT=RESOLVED_FROM_RAW_SOURCE"
                    f" | legacy_branch={legacy_branch}"
                    f" | current_branch={chosen_branch}"
                    f" | target_group={target_group}"
                )
                continue

            if len(raw_branch_ids) > 1:
                conflicts.append(
                    (
                        lcid,
                        payment_id,
                        raw_branch_ids,
                    )
                )
                lines.append(
                    f"  RESULT=CONFLICT_MULTIPLE_RAW_BRANCHES"
                    f" | branches={raw_branch_ids}"
                )
                continue

            # No transaction row/location exists in source cache.
            # Prove whether this is a historical orphaned parent reference.
            same_company_transaction_maps = [
                detail
                for detail in map_details
                if detail[
                    "source_table"
                ] in TRANSACTION_SOURCE_TABLES
            ]

            contact_map_details = []

            if payment_for is not None:
                contact_maps = list(
                    LegacyObjectMap.objects.filter(
                        source_system=SOURCE_SYSTEM,
                        legacy_company_id=lcid,
                        source_table="contacts",
                        legacy_id=str(payment_for),
                    )
                    .select_related(
                        "target_content_type"
                    )
                    .order_by("id")
                )

                for contact_map in contact_maps:
                    ct = contact_map.target_content_type
                    target_label = (
                        f"{clean(ct.app_label)}."
                        f"{clean(ct.model)}"
                        if ct is not None
                        else ""
                    )

                    target_id = as_int(
                        contact_map.target_object_id
                    )
                    party = (
                        BusinessParty.objects.filter(
                            pk=target_id,
                            company_id=cid,
                        ).values(
                            "id",
                            "company_id",
                            "branch_id",
                        ).first()
                        if (
                            target_label
                            == "parties.businessparty"
                            and target_id is not None
                        )
                        else None
                    )

                    contact_map_details.append(
                        {
                            "legacy_contact_id": str(
                                payment_for
                            ),
                            "target": (
                                f"{target_label}:"
                                f"{clean(contact_map.target_object_id)}"
                            ),
                            "party": party,
                        }
                    )

            lines.append(
                f"  PAYMENT_FOR_CONTACT_EVIDENCE={contact_map_details}"
            )

            source_transaction_absent = (
                len(transaction_matches) == 0
            )
            mapped_transaction_absent = (
                len(same_company_transaction_maps)
                == 0
            )

            if (
                source_transaction_absent
                and mapped_transaction_absent
            ):
                retained_group = retained_group_by_company[
                    lcid
                ]

                orphan_preserve.append(
                    (
                        lcid,
                        payment_id,
                        retained_group,
                        transaction_id,
                        payment_for,
                    )
                )

                lines.append(
                    f"  RESULT=ORPHANED_LEGACY_PARENT_TRANSACTION"
                    f" | source_transaction_row_absent=YES"
                    f" | migrated_transaction_map_absent=YES"
                    f" | branch_provenance=NONE"
                    f" | preservation_target={retained_group}"
                    f" | branch_remains=NULL"
                )
            else:
                unresolved.append(
                    (
                        lcid,
                        payment_id,
                        "NO_UNIQUE_ROUTE_DESPITE_AVAILABLE_TRANSACTION_EVIDENCE",
                    )
                )
                lines.append(
                    "  RESULT=UNRESOLVED_AVAILABLE_TRANSACTION_EVIDENCE_WITHOUT_UNIQUE_ROUTE"
                )

        print("[A6E] 4/6 Verifying the two alias-resolved cases and orphan policy...", flush=True)

        # Based on A6D evidence there should be exactly two raw alias routes and
        # two genuine missing-parent historical payments.
        raw_route_count = len(final_routes)
        orphan_count = len(orphan_preserve)

        lines.extend([
            "",
            "=" * 120,
            "FINAL FOUR CLOSURE MAP",
            "=" * 120,
            f"RAW_SOURCE_RESOLVED_COUNT={raw_route_count}",
            f"ORPHAN_PARENT_PRESERVE_COUNT={orphan_count}",
            f"CONFLICT_COUNT={len(conflicts)}",
            f"UNRESOLVED_COUNT={len(unresolved)}",
        ])

        for (
            lcid,
            payment_id,
            legacy_branch,
            current_branch,
            target_group,
            reason,
        ) in final_routes:
            lines.append(
                f"ROUTED"
                f"|legacy_company={lcid}"
                f"|customer_payment={payment_id}"
                f"|legacy_branch={legacy_branch}"
                f"|current_branch={current_branch}"
                f"|target_group={target_group}"
                f"|reason={reason}"
            )

        for (
            lcid,
            payment_id,
            target_group,
            transaction_id,
            payment_for,
        ) in orphan_preserve:
            lines.append(
                f"PRESERVE_ORPHAN"
                f"|legacy_company={lcid}"
                f"|customer_payment={payment_id}"
                f"|missing_legacy_transaction={transaction_id}"
                f"|payment_for={payment_for}"
                f"|target_group={target_group}"
                f"|branch=NULL"
                f"|reason=SOURCE_PARENT_TRANSACTION_ABSENT_AND_NO_TRANSACTION_LEGACY_MAP"
            )

        if conflicts:
            lines.append("CONFLICTS_BEGIN")
            for row in conflicts:
                lines.append(clean(row))
            lines.append("CONFLICTS_END")

        if unresolved:
            lines.append("UNRESOLVED_BEGIN")
            for row in unresolved:
                lines.append(clean(row))
            lines.append("UNRESOLVED_END")

        print("[A6E] 5/6 Freezing final CustomerPayment routing contract...", flush=True)

        result = (
            "PASS"
            if raw_route_count == 2
            and orphan_count == 2
            and not conflicts
            and not unresolved
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "",
            "=" * 120,
            "A6E FINAL SUMMARY",
            "=" * 120,
            "A6B_CUSTOMER_PAYMENT_TOTAL=320030",
            "A6B_INVOICE_ROUTED=319618",
            "A6C_TRANSACTION_LINK_RECOVERED=400",
            "A6D_PRIOR_CONFLICTS_CLOSED=8",
            f"A6E_RAW_ALIAS_RESOLVED={raw_route_count}",
            f"A6E_ORPHAN_PARENT_PRESERVED={orphan_count}",
            f"A6E_CONFLICT_COUNT={len(conflicts)}",
            f"A6E_UNRESOLVED_COUNT={len(unresolved)}",
            "",
            "FINAL_CUSTOMER_PAYMENT_SPLIT_CONTRACT:",
            "1) If CustomerPayment.sales_invoice has Branch, route with that invoice Branch.",
            "2) Otherwise use legacy payment.transaction_id and the raw source transaction collection; collection aliases such as sales/sale_returns are transaction sources.",
            "3) Read location_id/business_location_id from the raw source transaction and route to that output Company.",
            "4) Legacy numeric IDs are table-scoped; same-number rows in unrelated collections are ignored.",
            "5) If the referenced legacy parent transaction is absent both from source cache and from transaction LegacyObjectMap, the payment is preserved as an orphan historical Company-level payment on the retained source Company with branch=NULL. No Branch is invented.",
            "6) Any row with multiple source transaction locations or other unresolved evidence is a hard safety stop.",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A6E_RESULT={result}",
            "=" * 120,
        ])

        print("[A6E] 6/6 Writing report...", flush=True)

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A6E =====")
        print(f"A6E_RESULT={result}")
        print(f"RAW_SOURCE_RESOLVED_COUNT={raw_route_count}")
        print(f"ORPHAN_PARENT_PRESERVE_COUNT={orphan_count}")
        print(f"CONFLICT_COUNT={len(conflicts)}")
        print(f"UNRESOLVED_COUNT={len(unresolved)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A6E_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA6E_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A6E_RESULT=FAIL",
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

        print("===== PRIMEYACC COMPANY SPLIT A6E =====", flush=True)
        print("A6E_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)

        return 2


if __name__ == "__main__":
    raise SystemExit(main())

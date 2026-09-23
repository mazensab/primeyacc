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
DECISION_MAP = ROOT / "v2_company_split_decision_map.json"
A6B_REPORT = ROOT / "v2_company_split_a6b_targeted_partition_closure.txt"
REPORT = ROOT / "v2_company_split_a6c_customer_payment_semantics.txt"
CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"

SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
EXPECTED_A6B_SHA256 = "48DC367842B689D4EE573EC92238960F13F53081A8FE1F264ED3DD180DC9E7A1"
QUERY_TIMEOUT_MS = 60000


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def yesno(value: Any) -> str:
    return "YES" if bool(value) else "NO"


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
        raise RuntimeError("manage.py not found; run from project root")

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


def model_branch_id(target_model, target_object_id):
    if target_model is None:
        return None, "NO_MODEL"

    raw_id = clean(target_object_id)
    if not raw_id.isdigit():
        return None, "NON_NUMERIC_TARGET"

    # Direct Branch FK on mapped target.
    try:
        target_model._meta.get_field("branch")
        row = target_model._default_manager.filter(
            pk=int(raw_id)
        ).values("branch_id").first()
        if row:
            return row.get("branch_id"), "DIRECT_TARGET_BRANCH"
    except Exception:
        pass

    # Known parent routes for mapped child targets.
    parent_paths = [
        ("invoice", "branch_id"),
        ("sales_return", "branch_id"),
        ("bill", "branch_id"),
        ("purchase_return", "branch_id"),
        ("warehouse", "branch_id"),
        ("journal_entry", "branch_id"),
    ]

    for parent_field, branch_field in parent_paths:
        try:
            target_model._meta.get_field(parent_field)
            lookup = f"{parent_field}__{branch_field}"
            row = target_model._default_manager.filter(
                pk=int(raw_id)
            ).values(lookup).first()
            if row:
                return row.get(lookup), f"PARENT_ROUTE:{lookup}"
        except Exception:
            continue

    return None, "NO_BRANCH_ROUTE"


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A6C CUSTOMER PAYMENT SEMANTICS",
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
        print("[A6C] 1/6 Validating frozen artifacts...", flush=True)

        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")
        decision_sha = hashlib.sha256(
            DECISION_MAP.read_bytes()
        ).hexdigest().upper()
        if decision_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                f"Decision map SHA mismatch expected={EXPECTED_DECISION_SHA256} actual={decision_sha}"
            )

        if not A6B_REPORT.exists():
            raise RuntimeError(f"Missing {A6B_REPORT.name}")
        a6b_sha = hashlib.sha256(
            A6B_REPORT.read_bytes()
        ).hexdigest().upper()
        if a6b_sha != EXPECTED_A6B_SHA256:
            raise RuntimeError(
                f"A6B report SHA mismatch expected={EXPECTED_A6B_SHA256} actual={a6b_sha}"
            )

        decision = json.loads(
            DECISION_MAP.read_text(encoding="utf-8")
        )
        surviving_cfg = [
            row
            for row in decision.get("companies", [])
            if clean(row.get("mode")) in {"SPLIT", "PARTIAL_INCLUDE"}
        ]
        cfg_by_legacy = {
            clean(row["legacy_company_id"]): row
            for row in surviving_cfg
        }
        surviving_legacy_ids = set(cfg_by_legacy)

        lines.extend([
            "",
            "===== FROZEN ARTIFACTS =====",
            f"DECISION_MAP_SHA256={decision_sha}",
            f"A6B_REPORT_SHA256={a6b_sha}",
            f"SURVIVING_COMPANIES={len(surviving_cfg)}",
        ])

        print("[A6C] 2/6 Loading Django and migration maps...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.contrib.contenttypes.models import ContentType
        from django.db import connection

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company
        from parties.models import BusinessParty
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(
                f"Expected PostgreSQL, got {connection.vendor}"
            )
        set_readonly(connection)

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=surviving_legacy_ids,
            )
        )
        company_id_by_legacy = {}
        for row in company_maps:
            raw = clean(row.target_object_id) or clean(row.company_id)
            if raw.isdigit():
                company_id_by_legacy[
                    clean(row.legacy_id)
                ] = int(raw)

        if set(company_id_by_legacy) != surviving_legacy_ids:
            raise RuntimeError(
                "Surviving company map mismatch"
            )

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=surviving_legacy_ids,
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

        # Output group per branch + retained source group.
        group_by_branch = {}
        retained_group_by_company = {}

        for lcid, cfg in cfg_by_legacy.items():
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
                        if branch is not None and branch.is_default:
                            default_groups.append(gid)

                if len(set(default_groups)) != 1:
                    raise RuntimeError(
                        f"Invalid retained/default group for {lcid}: {default_groups}"
                    )
                retained_group_by_company[
                    lcid
                ] = default_groups[0]

            else:
                retained_group_by_company[
                    lcid
                ] = "SOURCE_COMPANY_SURVIVES"

                for branch_row in cfg.get("kept_branches", []) or []:
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

        cp_ct = ContentType.objects.get_for_model(
            CustomerPayment
        )

        print("[A6C] 3/6 Rebuilding the exact 412-payment gap...", flush=True)

        gap_by_company = defaultdict(list)
        all_gap = []

        for lcid in sorted(surviving_legacy_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            branch_ids = {
                bid
                for (mapped_lcid, _), bid
                in branch_id_by_pair.items()
                if mapped_lcid == lcid
            }

            gap = list(
                CustomerPayment.objects.filter(
                    company_id=cid
                )
                .exclude(
                    sales_invoice__branch_id__in=branch_ids
                )
                .order_by("id")
            )

            if gap:
                gap_by_company[lcid] = gap
                all_gap.extend(gap)

        if len(all_gap) != 412:
            raise RuntimeError(
                f"Expected exact A6B gap=412, got {len(all_gap)}"
            )

        lines.extend([
            "",
            "===== GAP RECONSTRUCTION =====",
            f"GAP_TOTAL={len(all_gap)}",
        ])
        for lcid in sorted(gap_by_company, key=nkey):
            lines.append(
                f"COMPANY legacy_id={lcid}"
                f" | current_id={company_id_by_legacy[lcid]}"
                f" | gap={len(gap_by_company[lcid])}"
            )

        print("[A6C] 4/6 Reading exact legacy payment semantics...", flush=True)

        target_ids = [clean(row.id) for row in all_gap]

        cp_maps = {
            clean(row.target_object_id): row
            for row in LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                target_content_type=cp_ct,
                target_object_id__in=target_ids,
            ).select_related("target_content_type")
        }

        cache_payload_by_company = {}
        payment_source_by_company_legacy_id = {}

        for lcid in sorted(gap_by_company, key=nkey):
            cache_file = CACHE_DIR / f"company_{lcid}.json"
            if not cache_file.exists():
                raise RuntimeError(
                    f"Missing source cache: {cache_file}"
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

            source_index = {}
            for row in payload.get("payments", []) or []:
                if not isinstance(row, dict):
                    continue
                legacy_id = clean(row.get("id"))
                if legacy_id:
                    source_index[legacy_id] = row

            payment_source_by_company_legacy_id[
                lcid
            ] = source_index

        # Collect referenced legacy transaction/contact ids first.
        transaction_ids_by_company = defaultdict(set)
        payment_for_ids_by_company = defaultdict(set)

        source_rows = {}

        for lcid, payments in gap_by_company.items():
            index = payment_source_by_company_legacy_id[lcid]

            for payment in payments:
                lom = cp_maps.get(clean(payment.id))
                if lom is None:
                    continue

                legacy_payment_id = clean(lom.legacy_id)
                source_row = index.get(legacy_payment_id)
                source_rows[
                    (lcid, int(payment.id))
                ] = source_row

                if isinstance(source_row, dict):
                    transaction_id = as_int(
                        source_row.get("transaction_id")
                    )
                    payment_for = as_int(
                        source_row.get("payment_for")
                    )

                    if transaction_id is not None:
                        transaction_ids_by_company[
                            lcid
                        ].add(str(transaction_id))

                    if payment_for is not None:
                        payment_for_ids_by_company[
                            lcid
                        ].add(str(payment_for))

        # Read mappings for transaction_id and payment_for.
        candidate_map_by_company_legacy_id = defaultdict(list)

        for lcid in sorted(gap_by_company, key=nkey):
            ids = (
                transaction_ids_by_company[lcid]
                | payment_for_ids_by_company[lcid]
            )
            if not ids:
                continue

            for lom in (
                LegacyObjectMap.objects.filter(
                    source_system=SOURCE_SYSTEM,
                    legacy_company_id=lcid,
                    legacy_id__in=ids,
                )
                .exclude(source_table="transaction_payments")
                .select_related("target_content_type")
                .order_by("legacy_id", "source_table", "id")
            ):
                candidate_map_by_company_legacy_id[
                    (lcid, clean(lom.legacy_id))
                ].append(lom)

        lines.extend([
            "",
            "=" * 120,
            "PAYMENT SEMANTICS & ROUTING",
            "=" * 120,
        ])

        semantic_counts = Counter()
        routing_counts = Counter()
        unresolved_ids = []
        conflict_ids = []

        for lcid in sorted(gap_by_company, key=nkey):
            cid = company_id_by_legacy[lcid]
            retained_group = retained_group_by_company[
                lcid
            ]
            lines.append(
                f"COMPANY legacy_id={lcid}"
                f" | current_id={cid}"
                f" | retained_group={retained_group}"
            )

            for payment in gap_by_company[lcid]:
                lom = cp_maps.get(clean(payment.id))
                legacy_payment_id = (
                    clean(lom.legacy_id)
                    if lom is not None
                    else ""
                )
                source_row = source_rows.get(
                    (lcid, int(payment.id))
                )

                if not isinstance(source_row, dict):
                    semantic = "MISSING_SOURCE_PAYMENT_ROW"
                    route = "UNRESOLVED"
                    transaction_id = None
                    payment_for = None
                    candidate_details = []
                else:
                    transaction_id = as_int(
                        source_row.get("transaction_id")
                    )
                    payment_for = as_int(
                        source_row.get("payment_for")
                    )

                    candidate_details = []

                    # 1) Strongest evidence: source transaction_id -> migrated object -> branch.
                    transaction_branch_candidates = []

                    if transaction_id is not None:
                        for candidate in candidate_map_by_company_legacy_id.get(
                            (lcid, str(transaction_id)),
                            [],
                        ):
                            ct = candidate.target_content_type
                            model = (
                                ct.model_class()
                                if ct is not None
                                else None
                            )
                            bid, route_kind = model_branch_id(
                                model,
                                candidate.target_object_id,
                            )
                            candidate_details.append(
                                {
                                    "source": "transaction_id",
                                    "legacy_id": str(transaction_id),
                                    "source_table": clean(
                                        candidate.source_table
                                    ),
                                    "target": (
                                        f"{clean(ct.app_label)}."
                                        f"{clean(ct.model)}:"
                                        f"{clean(candidate.target_object_id)}"
                                        if ct is not None
                                        else ""
                                    ),
                                    "branch_id": bid,
                                    "route_kind": route_kind,
                                }
                            )
                            if bid is not None:
                                transaction_branch_candidates.append(
                                    int(bid)
                                )

                    unique_tx_branches = sorted(
                        set(transaction_branch_candidates)
                    )

                    if len(unique_tx_branches) == 1:
                        resolved_bid = unique_tx_branches[0]
                        semantic = (
                            "TRANSACTION_LINKED_PAYMENT_RECOVERED_FROM_SOURCE_TRANSACTION_ID"
                        )
                        route = group_by_branch.get(
                            (lcid, resolved_bid),
                            "UNKNOWN_BRANCH_GROUP",
                        )

                    elif len(unique_tx_branches) > 1:
                        semantic = (
                            "TRANSACTION_ID_BRANCH_CONFLICT"
                        )
                        route = "CONFLICT"

                    else:
                        # 2) Determine whether payment_for is a legacy contact id.
                        contact_matches = []

                        if payment_for is not None:
                            for candidate in candidate_map_by_company_legacy_id.get(
                                (lcid, str(payment_for)),
                                [],
                            ):
                                ct = candidate.target_content_type
                                target_label = (
                                    f"{clean(ct.app_label)}."
                                    f"{clean(ct.model)}"
                                    if ct is not None
                                    else ""
                                )
                                candidate_details.append(
                                    {
                                        "source": "payment_for",
                                        "legacy_id": str(payment_for),
                                        "source_table": clean(
                                            candidate.source_table
                                        ),
                                        "target": (
                                            f"{target_label}:"
                                            f"{clean(candidate.target_object_id)}"
                                        ),
                                        "branch_id": None,
                                        "route_kind": "SEMANTIC_LOOKUP",
                                    }
                                )

                                if (
                                    clean(candidate.source_table)
                                    == "contacts"
                                    and target_label
                                    == "parties.businessparty"
                                ):
                                    target_id = as_int(
                                        candidate.target_object_id
                                    )
                                    if target_id is not None:
                                        contact_matches.append(
                                            target_id
                                        )

                        contact_matches = sorted(
                            set(contact_matches)
                        )

                        payment_party_ids = {
                            value
                            for value in (
                                payment.customer_id,
                                payment.counterparty_id,
                            )
                            if value is not None
                        }

                        if (
                            transaction_id is None
                            and contact_matches
                            and any(
                                target_id in payment_party_ids
                                for target_id in contact_matches
                            )
                        ):
                            semantic = (
                                "CONTACT_LEVEL_ADVANCE_OR_ON_ACCOUNT_PAYMENT"
                            )
                            route = retained_group

                        elif (
                            transaction_id is None
                            and payment_for is None
                        ):
                            semantic = (
                                "COMPANY_LEVEL_STANDALONE_PAYMENT_NO_TRANSACTION_NO_CONTACT_KEY"
                            )
                            route = retained_group

                        elif (
                            transaction_id is None
                            and contact_matches
                        ):
                            semantic = (
                                "CONTACT_LEVEL_PAYMENT_CONTACT_MAPPING_PRESENT_BUT_TARGET_DIFFERS"
                            )
                            route = retained_group

                        else:
                            semantic = "UNRESOLVED_LEGACY_PAYMENT_SEMANTICS"
                            route = "UNRESOLVED"

                semantic_counts[semantic] += 1
                routing_counts[route] += 1

                if route == "UNRESOLVED":
                    unresolved_ids.append(
                        (lcid, int(payment.id))
                    )
                if route == "CONFLICT":
                    conflict_ids.append(
                        (lcid, int(payment.id))
                    )

                # Keep the report compact: full detail for non-standard rows;
                # aggregate repeated contact-level payments.
                if semantic not in {
                    "CONTACT_LEVEL_ADVANCE_OR_ON_ACCOUNT_PAYMENT",
                }:
                    lines.append(
                        f"  PAYMENT current_id={payment.id}"
                        f" | legacy_id={legacy_payment_id}"
                        f" | payment_number={clean(payment.payment_number)}"
                        f" | source_transaction_id={transaction_id}"
                        f" | source_payment_for={payment_for}"
                        f" | semantic={semantic}"
                        f" | route={route}"
                        f" | candidates={candidate_details}"
                    )

            company_semantics = Counter()
            company_routes = Counter()

            for payment in gap_by_company[lcid]:
                # Recalculate from global lists would be cumbersome; summarize
                # from report-independent source heuristics below.
                source_row = source_rows.get(
                    (lcid, int(payment.id))
                )
                transaction_id = (
                    as_int(source_row.get("transaction_id"))
                    if isinstance(source_row, dict)
                    else None
                )
                payment_for = (
                    as_int(source_row.get("payment_for"))
                    if isinstance(source_row, dict)
                    else None
                )

                if transaction_id is None and payment_for is not None:
                    candidates = candidate_map_by_company_legacy_id.get(
                        (lcid, str(payment_for)),
                        [],
                    )
                    has_contact = any(
                        clean(c.source_table) == "contacts"
                        and c.target_content_type is not None
                        and f"{clean(c.target_content_type.app_label)}.{clean(c.target_content_type.model)}"
                        == "parties.businessparty"
                        for c in candidates
                    )
                    if has_contact:
                        company_semantics[
                            "CONTACT_LEVEL_ADVANCE_OR_ON_ACCOUNT_PAYMENT"
                        ] += 1
                        company_routes[
                            retained_group
                        ] += 1

            lines.append(
                f"  CONTACT_LEVEL_AGGREGATE={company_semantics.get('CONTACT_LEVEL_ADVANCE_OR_ON_ACCOUNT_PAYMENT', 0)}"
                f" | fallback_route={retained_group}"
            )

        print("[A6C] 5/6 Building final semantic policy...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "A6C SEMANTIC SUMMARY",
            "=" * 120,
            f"GAP_TOTAL={len(all_gap)}",
            f"SEMANTIC_COUNTS={dict(semantic_counts)}",
            f"ROUTING_COUNTS={dict(routing_counts)}",
            f"UNRESOLVED_COUNT={len(unresolved_ids)}",
            f"CONFLICT_COUNT={len(conflict_ids)}",
        ])

        if unresolved_ids:
            lines.append("UNRESOLVED_IDS_BEGIN")
            for row in unresolved_ids:
                lines.append(
                    f"legacy_company={row[0]}|customer_payment={row[1]}"
                )
            lines.append("UNRESOLVED_IDS_END")

        if conflict_ids:
            lines.append("CONFLICT_IDS_BEGIN")
            for row in conflict_ids:
                lines.append(
                    f"legacy_company={row[0]}|customer_payment={row[1]}"
                )
            lines.append("CONFLICT_IDS_END")

        lines.extend([
            "",
            "FINAL_PAYMENT_ROUTING_POLICY:",
            "1) If migrated CustomerPayment.sales_invoice has an in-scope Branch, route with that SalesInvoice Branch.",
            "2) Else if legacy source transaction_id maps to a migrated branch-scoped transaction, route to that transaction's output Company.",
            "3) Else if legacy transaction_id is NULL and payment_for maps to the same legacy contact/BusinessParty, classify as historical advance/on-account customer payment with no branch provenance; preserve it on the retained source Company rather than inventing a Branch.",
            "4) Else if both transaction_id and payment_for are NULL, preserve the standalone historical Company-level payment on the retained source Company.",
            "5) Any remaining conflict/unresolved row is a hard safety stop.",
        ])

        result = (
            "PASS"
            if not unresolved_ids and not conflict_ids
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A6C_RESULT={result}",
            "=" * 120,
        ])

        print("[A6C] 6/6 Writing report...", flush=True)

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A6C =====")
        print(f"A6C_RESULT={result}")
        print(f"GAP_TOTAL={len(all_gap)}")
        print(f"SEMANTIC_COUNTS={dict(semantic_counts)}")
        print(f"UNRESOLVED_COUNT={len(unresolved_ids)}")
        print(f"CONFLICT_COUNT={len(conflict_ids)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A6C_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA6C_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A6C_RESULT=FAIL",
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

        print("===== PRIMEYACC COMPANY SPLIT A6C =====", flush=True)
        print("A6C_RESULT=FAIL", flush=True)
        print(
            f"ERROR={type(exc).__name__}: {exc}",
            flush=True,
        )
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)

        return 2


if __name__ == "__main__":
    raise SystemExit(main())

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
REPORT = ROOT / "v2_company_split_a6b_targeted_partition_closure.txt"
CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"
SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
QUERY_TIMEOUT_MS = 90000


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


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
        raise RuntimeError("manage.py not found; run from project root")
    raw = manage.read_text(encoding="utf-8", errors="replace")
    match = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not match:
        raise RuntimeError("Cannot detect DJANGO_SETTINGS_MODULE")
    return match.group(1)


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def reconnect_readonly(connection):
    connection.close()
    connection.connect()
    set_readonly(connection)


def candidate_legacy_branch_ids_from_mapping(metadata: Any, source_row: Any):
    candidates = []

    def inspect_dict(d: dict[str, Any], source: str):
        for key, value in d.items():
            k = clean(key).lower()
            if any(token in k for token in ("location_id", "branch_id", "business_location_id")):
                v = clean(value)
                if v:
                    candidates.append((source, k, v))

    if isinstance(metadata, dict):
        inspect_dict(metadata, "legacy_map.metadata")
        for nested_key, nested_value in metadata.items():
            if isinstance(nested_value, dict):
                inspect_dict(nested_value, f"legacy_map.metadata.{nested_key}")

    if isinstance(source_row, dict):
        inspect_dict(source_row, "source_cache.payments")

    return candidates


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A6B TARGETED PARTITION CLOSURE",
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
        print("[A6B] 1/7 Validating decision map...", flush=True)
        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")

        actual_sha = hashlib.sha256(DECISION_MAP.read_bytes()).hexdigest().upper()
        if actual_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                f"Decision map SHA mismatch expected={EXPECTED_DECISION_SHA256} actual={actual_sha}"
            )

        decision = json.loads(DECISION_MAP.read_text(encoding="utf-8"))
        surviving_cfg = [
            row
            for row in decision.get("companies", [])
            if clean(row.get("mode")) in {"SPLIT", "PARTIAL_INCLUDE"}
        ]
        cfg_by_legacy = {
            clean(row["legacy_company_id"]): row for row in surviving_cfg
        }
        surviving_legacy_ids = set(cfg_by_legacy)

        print("[A6B] 2/7 Loading Django/maps...", flush=True)
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.contrib.contenttypes.models import ContentType
        from django.db import connection
        from django.db.models import Count

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company
        from parties.models import BusinessParty
        from sales.models import SalesInvoiceItem, SalesReturnItem
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=surviving_legacy_ids,
            )
        )
        company_id_by_legacy = {}
        for m in company_maps:
            raw = clean(m.target_object_id) or clean(m.company_id)
            if raw.isdigit():
                company_id_by_legacy[clean(m.legacy_id)] = int(raw)

        if set(company_id_by_legacy) != surviving_legacy_ids:
            raise RuntimeError("Surviving company map mismatch")

        target_company_ids = sorted(company_id_by_legacy.values())
        companies = Company.objects.in_bulk(target_company_ids)

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=surviving_legacy_ids,
            )
        )
        branch_id_by_pair = {}
        pair_by_branch_id = {}
        for m in branch_maps:
            raw = clean(m.target_object_id)
            if raw.isdigit():
                pair = (clean(m.legacy_company_id), clean(m.legacy_id))
                bid = int(raw)
                branch_id_by_pair[pair] = bid
                pair_by_branch_id[bid] = pair

        target_branch_ids = sorted(branch_id_by_pair.values())
        branches = Branch.objects.in_bulk(target_branch_ids)

        group_by_branch = {}
        source_group_by_company = {}
        excluded_branch_ids_partial = defaultdict(set)

        for lcid, cfg in cfg_by_legacy.items():
            mode = clean(cfg.get("mode"))
            if mode == "SPLIT":
                default_groups = []
                for group in cfg.get("output_groups", []) or []:
                    gid = clean(group.get("group_id"))
                    for brow in group.get("branches", []) or []:
                        lbid = clean(brow.get("legacy_branch_id"))
                        bid = branch_id_by_pair.get((lcid, lbid))
                        if not bid:
                            continue
                        group_by_branch[(lcid, bid)] = gid
                        branch = branches.get(bid)
                        if branch is not None and branch.is_default:
                            default_groups.append(gid)
                if len(set(default_groups)) != 1:
                    raise RuntimeError(f"Invalid default group for {lcid}: {default_groups}")
                source_group_by_company[lcid] = default_groups[0]
            else:
                source_group_by_company[lcid] = "SOURCE_COMPANY_SURVIVES"
                for brow in cfg.get("kept_branches", []) or []:
                    lbid = clean(brow.get("legacy_branch_id"))
                    bid = branch_id_by_pair.get((lcid, lbid))
                    if bid:
                        group_by_branch[(lcid, bid)] = "SOURCE_COMPANY_SURVIVES"
                for brow in cfg.get("excluded_branches", []) or []:
                    lbid = clean(brow.get("legacy_branch_id"))
                    bid = branch_id_by_pair.get((lcid, lbid))
                    if bid:
                        excluded_branch_ids_partial[lcid].add(bid)

        reverse_company = {cid: lcid for lcid, cid in company_id_by_legacy.items()}

        lines.extend([
            "",
            "===== FROZEN SCOPE =====",
            f"DECISION_MAP_SHA256={actual_sha}",
            f"SURVIVING_COMPANIES={len(surviving_legacy_ids)}",
            f"LEGACY_COMPANY_IDS={','.join(sorted(surviving_legacy_ids, key=nkey))}",
        ])

        query_errors = []

        print("[A6B] 3/7 Closing SalesInvoiceItem parent routing...", flush=True)
        lines.extend([
            "",
            "=" * 120,
            "SALES INVOICE ITEM ROUTING CLOSURE",
            "=" * 120,
        ])

        sii_total = 0
        sii_routed = 0
        sii_unrouted = 0

        for lcid in sorted(surviving_legacy_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            branch_ids = [
                bid
                for (mapped_lcid, _), bid in branch_id_by_pair.items()
                if mapped_lcid == lcid
            ]
            try:
                base = SalesInvoiceItem.objects.filter(company_id=cid)
                total = base.count()
                rows = list(
                    base.filter(invoice__branch_id__in=branch_ids)
                    .values("invoice__branch_id")
                    .annotate(n=Count("pk"))
                    .order_by("invoice__branch_id")
                )
                routed = sum(int(row["n"]) for row in rows)
                unrouted = total - routed
                sii_total += total
                sii_routed += routed
                sii_unrouted += unrouted

                lines.append(
                    f"COMPANY legacy_id={lcid} | current_id={cid}"
                    f" | total={total} | routed_via_invoice_branch={routed}"
                    f" | unrouted={unrouted}"
                )
                for row in rows:
                    bid = int(row["invoice__branch_id"])
                    pair = pair_by_branch_id.get(bid)
                    lbid = pair[1] if pair else ""
                    group = group_by_branch.get((lcid, bid), "EXCLUDED_OR_UNKNOWN")
                    lines.append(
                        f"  ROUTE branch_legacy={lbid}"
                        f" | branch_current={bid}"
                        f" | target_group={group}"
                        f" | item_rows={int(row['n'])}"
                    )
            except Exception as exc:
                query_errors.append(
                    f"SalesInvoiceItem company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )
                reconnect_readonly(connection)

        # SalesReturnItem is smaller and should follow SalesReturn.branch.
        sri_total = 0
        sri_routed = 0
        sri_unrouted = 0

        lines.extend([
            "",
            "===== SALES RETURN ITEM ROUTING CHECK =====",
        ])

        for lcid in sorted(surviving_legacy_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            branch_ids = [
                bid
                for (mapped_lcid, _), bid in branch_id_by_pair.items()
                if mapped_lcid == lcid
            ]
            try:
                base = SalesReturnItem.objects.filter(company_id=cid)
                total = base.count()
                routed = base.filter(
                    sales_return__branch_id__in=branch_ids
                ).count()
                unrouted = total - routed
                sri_total += total
                sri_routed += routed
                sri_unrouted += unrouted
                if total:
                    lines.append(
                        f"COMPANY legacy_id={lcid} | total={total}"
                        f" | routed_via_sales_return_branch={routed}"
                        f" | unrouted={unrouted}"
                    )
            except Exception as exc:
                query_errors.append(
                    f"SalesReturnItem company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )
                reconnect_readonly(connection)

        print("[A6B] 4/7 Decomposing LegacyObjectMap...", flush=True)
        lines.extend([
            "",
            "=" * 120,
            "LEGACY OBJECT MAP DECOMPOSITION",
            "=" * 120,
        ])

        legacy_map_total = 0
        legacy_map_table_counts = Counter()
        legacy_map_content_counts = Counter()

        for lcid in sorted(surviving_legacy_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            try:
                by_table = list(
                    LegacyObjectMap.objects.filter(company_id=cid)
                    .values("source_table")
                    .annotate(n=Count("pk"))
                    .order_by("-n", "source_table")
                )
                subtotal = sum(int(row["n"]) for row in by_table)
                legacy_map_total += subtotal
                lines.append(
                    f"COMPANY legacy_id={lcid} | current_id={cid}"
                    f" | map_rows={subtotal} | source_table_count={len(by_table)}"
                )
                for row in by_table:
                    table = clean(row["source_table"])
                    count = int(row["n"])
                    legacy_map_table_counts[table] += count
                    lines.append(f"  SOURCE_TABLE {table} | count={count}")

                by_content = list(
                    LegacyObjectMap.objects.filter(company_id=cid)
                    .values(
                        "target_content_type__app_label",
                        "target_content_type__model",
                    )
                    .annotate(n=Count("pk"))
                    .order_by("-n")
                )
                for row in by_content:
                    label = (
                        f"{clean(row['target_content_type__app_label'])}."
                        f"{clean(row['target_content_type__model'])}"
                    )
                    count = int(row["n"])
                    legacy_map_content_counts[label] += count
            except Exception as exc:
                query_errors.append(
                    f"LegacyObjectMap company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )
                reconnect_readonly(connection)

        lines.append("LEGACY_MAP_TOP_SOURCE_TABLES_BEGIN")
        for table, count in legacy_map_table_counts.most_common(40):
            lines.append(f"{table}={count}")
        lines.append("LEGACY_MAP_TOP_SOURCE_TABLES_END")

        lines.append("LEGACY_MAP_TOP_TARGET_CONTENT_TYPES_BEGIN")
        for label, count in legacy_map_content_counts.most_common(40):
            lines.append(f"{label}={count}")
        lines.append("LEGACY_MAP_TOP_TARGET_CONTENT_TYPES_END")

        # Capture uniqueness/constraint contract; critical for clone provenance.
        lom_meta = LegacyObjectMap._meta
        lines.extend([
            "",
            "LEGACY_OBJECT_MAP_CONSTRAINT_CONTRACT_BEGIN",
            f"UNIQUE_TOGETHER={clean(lom_meta.unique_together)}",
        ])
        for constraint in lom_meta.constraints:
            lines.append(
                f"CONSTRAINT name={clean(getattr(constraint,'name',''))}"
                f" | type={constraint.__class__.__name__}"
                f" | fields={clean(getattr(constraint,'fields',''))}"
                f" | condition={clean(getattr(constraint,'condition',''))}"
            )
        for index in lom_meta.indexes:
            lines.append(
                f"INDEX name={clean(getattr(index,'name',''))}"
                f" | fields={clean(getattr(index,'fields',''))}"
            )
        lines.append("LEGACY_OBJECT_MAP_CONSTRAINT_CONTRACT_END")

        print("[A6B] 5/7 Resolving the 412 CustomerPayment gap...", flush=True)
        lines.extend([
            "",
            "=" * 120,
            "CUSTOMER PAYMENT UNROUTED GAP",
            "=" * 120,
        ])

        customer_payment_total = 0
        customer_payment_invoice_routed = 0
        gap_total = 0
        gap_resolved = 0
        gap_conflict = 0
        gap_unresolved = 0
        resolution_sources = Counter()

        cp_ct = ContentType.objects.get_for_model(CustomerPayment)

        for lcid in sorted(surviving_legacy_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            company_branch_ids = {
                bid
                for (mapped_lcid, _), bid in branch_id_by_pair.items()
                if mapped_lcid == lcid
            }
            excluded_ids = excluded_branch_ids_partial.get(lcid, set())

            try:
                base = CustomerPayment.objects.filter(company_id=cid)
                total = base.count()
                invoice_routed = base.filter(
                    sales_invoice__branch_id__in=company_branch_ids
                ).count()
                gap = list(
                    base.exclude(
                        sales_invoice__branch_id__in=company_branch_ids
                    )
                    .select_related(
                        "accounting_entry",
                        "treasury_transaction__accounting_entry",
                    )
                    .order_by("id")
                )

                customer_payment_total += total
                customer_payment_invoice_routed += invoice_routed
                gap_total += len(gap)

                party_ids = {
                    int(x)
                    for p in gap
                    for x in (p.customer_id, p.counterparty_id)
                    if x is not None
                }
                parties = {
                    int(p.id): p
                    for p in BusinessParty.objects.filter(
                        company_id=cid,
                        id__in=party_ids,
                    ).only("id", "branch_id", "company_id")
                }

                target_ids = [clean(p.id) for p in gap]
                legacy_maps = {
                    clean(m.target_object_id): m
                    for m in LegacyObjectMap.objects.filter(
                        company_id=cid,
                        target_content_type=cp_ct,
                        target_object_id__in=target_ids,
                    )
                }

                cache_file = CACHE_DIR / f"company_{lcid}.json"
                payments_by_legacy_id = {}
                if cache_file.exists():
                    try:
                        cache = json.loads(
                            cache_file.read_text(
                                encoding="utf-8-sig",
                                errors="replace",
                            )
                        )
                        payload = cache.get("payload") or {}
                        for row in payload.get("payments", []) or []:
                            if isinstance(row, dict):
                                rid = clean(row.get("id"))
                                if rid:
                                    payments_by_legacy_id[rid] = row
                    except Exception as exc:
                        query_errors.append(
                            f"Source cache company={lcid}: {type(exc).__name__}: {clean(exc)}"
                        )

                lines.append(
                    f"COMPANY legacy_id={lcid}"
                    f" | total={total}"
                    f" | invoice_route={invoice_routed}"
                    f" | gap={len(gap)}"
                )

                company_resolved = 0
                company_conflict = 0
                company_unresolved = 0

                for payment in gap:
                    candidates = []

                    if (
                        payment.accounting_entry_id
                        and payment.accounting_entry
                        and payment.accounting_entry.branch_id in company_branch_ids
                    ):
                        candidates.append(
                            ("accounting_entry.branch", int(payment.accounting_entry.branch_id))
                        )

                    tx = getattr(payment, "treasury_transaction", None)
                    tx_entry = getattr(tx, "accounting_entry", None) if tx else None
                    if (
                        tx_entry is not None
                        and tx_entry.branch_id in company_branch_ids
                    ):
                        candidates.append(
                            ("treasury_transaction.accounting_entry.branch", int(tx_entry.branch_id))
                        )

                    for attr, source in (
                        ("customer_id", "customer_business_party.branch"),
                        ("counterparty_id", "counterparty_business_party.branch"),
                    ):
                        raw = getattr(payment, attr, None)
                        party = parties.get(int(raw)) if raw is not None else None
                        if party is not None and party.branch_id in company_branch_ids:
                            candidates.append((source, int(party.branch_id)))

                    legacy_map = legacy_maps.get(clean(payment.id))
                    source_row = None
                    if legacy_map is not None:
                        source_row = payments_by_legacy_id.get(
                            clean(legacy_map.legacy_id)
                        )
                        for source, key, legacy_branch_value in candidate_legacy_branch_ids_from_mapping(
                            getattr(legacy_map, "metadata", {}) or {},
                            source_row,
                        ):
                            bid = branch_id_by_pair.get((lcid, legacy_branch_value))
                            if bid:
                                candidates.append((f"{source}:{key}", int(bid)))

                    unique_branch_ids = sorted({bid for _, bid in candidates})

                    if len(unique_branch_ids) == 1:
                        resolved_branch = unique_branch_ids[0]
                        company_resolved += 1
                        gap_resolved += 1
                        for source, bid in candidates:
                            if bid == resolved_branch:
                                resolution_sources[source] += 1
                        pair = pair_by_branch_id.get(resolved_branch)
                        lbid = pair[1] if pair else ""
                        target_group = group_by_branch.get(
                            (lcid, resolved_branch),
                            "EXCLUDED_OR_UNKNOWN",
                        )
                        lines.append(
                            f"  RESOLVED payment_id={payment.id}"
                            f" | branch_legacy={lbid}"
                            f" | branch_current={resolved_branch}"
                            f" | target_group={target_group}"
                            f" | sources={[s for s,b in candidates if b == resolved_branch]}"
                        )
                    elif len(unique_branch_ids) > 1:
                        company_conflict += 1
                        gap_conflict += 1
                        lines.append(
                            f"  CONFLICT payment_id={payment.id}"
                            f" | candidates={candidates}"
                            f" | legacy_map_id={getattr(legacy_map,'id',None)}"
                            f" | legacy_payment_id={clean(getattr(legacy_map,'legacy_id',''))}"
                        )
                    else:
                        company_unresolved += 1
                        gap_unresolved += 1
                        source_preview = {}
                        if isinstance(source_row, dict):
                            for key in sorted(source_row):
                                lk = clean(key).lower()
                                if any(token in lk for token in ("location", "branch", "invoice", "payment", "customer")):
                                    source_preview[key] = source_row.get(key)
                        lines.append(
                            f"  UNRESOLVED payment_id={payment.id}"
                            f" | payment_number={clean(payment.payment_number)}"
                            f" | customer_id={payment.customer_id}"
                            f" | counterparty_id={payment.counterparty_id}"
                            f" | legacy_map_id={getattr(legacy_map,'id',None)}"
                            f" | legacy_payment_id={clean(getattr(legacy_map,'legacy_id',''))}"
                            f" | source_preview={source_preview}"
                        )

                lines.append(
                    f"  GAP_RESULT resolved={company_resolved}"
                    f" | conflict={company_conflict}"
                    f" | unresolved={company_unresolved}"
                )
            except Exception as exc:
                query_errors.append(
                    f"CustomerPayment company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )
                reconnect_readonly(connection)

        lines.append("CUSTOMER_PAYMENT_RESOLUTION_SOURCES_BEGIN")
        for source, count in resolution_sources.most_common():
            lines.append(f"{source}={count}")
        lines.append("CUSTOMER_PAYMENT_RESOLUTION_SOURCES_END")

        print("[A6B] 6/7 Building partition closure summary...", flush=True)
        lines.extend([
            "",
            "=" * 120,
            "A6B FINAL PARTITION CLOSURE SUMMARY",
            "=" * 120,
            f"DECISION_MAP_SHA256={actual_sha}",
            f"SURVIVING_COMPANY_COUNT={len(surviving_legacy_ids)}",
            f"SALES_INVOICE_ITEM_TOTAL={sii_total}",
            f"SALES_INVOICE_ITEM_ROUTED={sii_routed}",
            f"SALES_INVOICE_ITEM_UNROUTED={sii_unrouted}",
            f"SALES_RETURN_ITEM_TOTAL={sri_total}",
            f"SALES_RETURN_ITEM_ROUTED={sri_routed}",
            f"SALES_RETURN_ITEM_UNROUTED={sri_unrouted}",
            f"LEGACY_OBJECT_MAP_TOTAL={legacy_map_total}",
            f"LEGACY_OBJECT_MAP_SOURCE_TABLE_COUNT={len(legacy_map_table_counts)}",
            f"CUSTOMER_PAYMENT_TOTAL={customer_payment_total}",
            f"CUSTOMER_PAYMENT_INVOICE_ROUTED={customer_payment_invoice_routed}",
            f"CUSTOMER_PAYMENT_GAP_TOTAL={gap_total}",
            f"CUSTOMER_PAYMENT_GAP_RESOLVED={gap_resolved}",
            f"CUSTOMER_PAYMENT_GAP_CONFLICT={gap_conflict}",
            f"CUSTOMER_PAYMENT_GAP_UNRESOLVED={gap_unresolved}",
            f"QUERY_ERROR_COUNT={len(query_errors)}",
        ])

        if query_errors:
            lines.append("QUERY_ERRORS_BEGIN")
            lines.extend(query_errors)
            lines.append("QUERY_ERRORS_END")

        # PASS requires both prior timeout closures and the CustomerPayment routing gap
        # to be fully explained without conflicts.
        result = (
            "PASS"
            if not query_errors
            and sii_unrouted == 0
            and sri_unrouted == 0
            and gap_conflict == 0
            and gap_unresolved == 0
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "SALES_INVOICE_ITEM_CLASSIFICATION=PARENT_BRANCH_ROUTE_FULL_VIA_INVOICE",
            "LEGACY_OBJECT_MAP_POLICY_HINT=Do not duplicate a source legacy mapping blindly when cloning masters; preserve canonical source mapping and record split-clone provenance separately if uniqueness contract requires it.",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A6B_RESULT={result}",
            "=" * 120,
        ])

        print("[A6B] 7/7 Writing report...", flush=True)
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A6B =====")
        print(f"A6B_RESULT={result}")
        print(f"SALES_INVOICE_ITEM_TOTAL={sii_total}")
        print(f"SALES_INVOICE_ITEM_UNROUTED={sii_unrouted}")
        print(f"CUSTOMER_PAYMENT_GAP_TOTAL={gap_total}")
        print(f"CUSTOMER_PAYMENT_GAP_RESOLVED={gap_resolved}")
        print(f"CUSTOMER_PAYMENT_GAP_CONFLICT={gap_conflict}")
        print(f"CUSTOMER_PAYMENT_GAP_UNRESOLVED={gap_unresolved}")
        print(f"QUERY_ERROR_COUNT={len(query_errors)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")
        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A6B_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA6B_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A6B_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A6B =====", flush=True)
        print("A6B_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

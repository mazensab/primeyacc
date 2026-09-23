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
REPORT = ROOT / "v2_company_split_a6_partitionability_blueprint_audit.txt"
SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
QUERY_TIMEOUT_MS = 60000
MAX_PATH_DEPTH = 3

# Only companies that survive and require partition/clone logic.
SURVIVING_MODES = {"SPLIT", "PARTIAL_INCLUDE"}

# These are printed with full FK schema even if generic discovery already classifies them.
CRITICAL_MODELS = {
    "treasury.CustomerPayment",
    "treasury.SupplierPayment",
    "treasury.TreasuryAccount",
    "treasury.TreasuryTransaction",
    "sales.SalesInvoice",
    "sales.SalesInvoiceItem",
    "sales.SalesReturn",
    "sales.SalesReturnItem",
    "purchases.PurchaseBill",
    "purchases.PurchaseBillItem",
    "purchases.PurchaseReturn",
    "purchases.PurchaseReturnItem",
    "parties.BusinessParty",
    "catalog.CatalogItem",
    "catalog.CatalogCategory",
    "catalog.CatalogUnit",
    "accounting.Account",
    "accounting.JournalEntry",
    "accounting.JournalEntryLine",
    "inventory.Warehouse",
    "inventory.InventoryLocation",
    "inventory.StockItem",
    "inventory.StockMovement",
    "subscriptions.CompanySubscription",
    "business_controls.LegacyObjectMap",
}


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
        raise RuntimeError("Could not detect DJANGO_SETTINGS_MODULE")
    return match.group(1)


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


def find_branch_paths(start_model, Branch, Company, max_depth=3):
    """
    Return forward FK paths from start_model to Branch.
    Each result is (lookup_to_branch_id, readable_path, depth).
    We avoid Company/User-like administrative detours and cycles.
    """
    results = []
    seen = set()

    def walk(model, parts, readable, depth, visited):
        if depth > max_depth:
            return

        key = (model, tuple(parts))
        if key in seen:
            return
        seen.add(key)

        for field, target in direct_fk_fields(model):
            if target in visited:
                continue

            # A direct Branch relation is a routing path.
            if target is Branch:
                lookup = "__".join(parts + [f"{field.name}_id"])
                human = " -> ".join(readable + [f"{model_label(model)}.{field.name} -> Branch"])
                results.append((lookup, human, depth))
                continue

            # Never route through Company itself.
            if target is Company:
                continue

            # Skip self-evidently administrative/audit targets to reduce noise.
            target_label = model_label(target)
            if target_label.startswith("auth.") or target_label.startswith("contenttypes."):
                continue
            if target_label in {
                "accounts.User",
                "accounts.CompanyMembership",
                "companies.Company",
            }:
                continue

            walk(
                target,
                parts + [field.name],
                readable + [f"{model_label(model)}.{field.name} -> {target_label}"],
                depth + 1,
                visited | {target},
            )

    walk(start_model, [], [], 1, {start_model})
    # Deduplicate by lookup; prefer shortest readable path.
    best = {}
    for lookup, human, depth in results:
        if lookup not in best or depth < best[lookup][1]:
            best[lookup] = (human, depth)
    return sorted(
        [(lookup, human, depth) for lookup, (human, depth) in best.items()],
        key=lambda x: (x[2], x[0]),
    )


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def reconnect_readonly(connection):
    connection.close()
    connection.connect()
    set_readonly(connection)


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A6 PARTITIONABILITY BLUEPRINT AUDIT",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        f"QUERY_TIMEOUT_MS={QUERY_TIMEOUT_MS}",
        f"MAX_BRANCH_PATH_DEPTH={MAX_PATH_DEPTH}",
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
        print("[A6] 1/7 Validating frozen decision map...", flush=True)
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
            if clean(row.get("mode")) in SURVIVING_MODES
        ]
        surviving_legacy_ids = {
            clean(row["legacy_company_id"]) for row in surviving_cfg
        }

        lines.extend([
            "",
            "===== FROZEN DECISION MAP =====",
            f"DECISION_MAP_SHA256={actual_sha}",
            f"SURVIVING_SPLIT_OR_PARTIAL_COMPANIES={len(surviving_cfg)}",
            f"SURVIVING_LEGACY_COMPANY_IDS={','.join(sorted(surviving_legacy_ids, key=nkey))}",
        ])

        print("[A6] 2/7 Loading Django/maps...", flush=True)
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.db import connection
        from django.db.models import Count

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company

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
            raise RuntimeError("Surviving company map scope mismatch")

        surviving_company_ids = sorted(company_id_by_legacy.values())

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=surviving_legacy_ids,
            )
        )
        branch_id_by_pair = {}
        legacy_pair_by_branch = {}
        for m in branch_maps:
            raw = clean(m.target_object_id)
            if raw.isdigit():
                pair = (clean(m.legacy_company_id), clean(m.legacy_id))
                bid = int(raw)
                branch_id_by_pair[pair] = bid
                legacy_pair_by_branch[bid] = pair

        surviving_branch_ids = sorted(branch_id_by_pair.values())
        branches = Branch.objects.in_bulk(surviving_branch_ids)
        companies = Company.objects.in_bulk(surviving_company_ids)

        # Target group routing table.
        target_group_by_branch = {}
        retained_group_by_company = {}

        for cfg in surviving_cfg:
            lcid = clean(cfg["legacy_company_id"])
            mode = clean(cfg["mode"])

            if mode == "SPLIT":
                default_groups = []
                for group in cfg.get("output_groups", []) or []:
                    gid = clean(group.get("group_id"))
                    for brow in group.get("branches", []) or []:
                        lbid = clean(brow.get("legacy_branch_id"))
                        bid = branch_id_by_pair.get((lcid, lbid))
                        if not bid:
                            continue
                        target_group_by_branch[(lcid, bid)] = gid
                        branch = branches.get(bid)
                        if branch is not None and bool(branch.is_default):
                            default_groups.append(gid)

                if len(set(default_groups)) != 1:
                    raise RuntimeError(
                        f"Company {lcid} expected exactly one retained default group, got {default_groups}"
                    )
                retained_group_by_company[lcid] = default_groups[0]

            elif mode == "PARTIAL_INCLUDE":
                retained_group_by_company[lcid] = "SOURCE_COMPANY_SURVIVES"
                for brow in cfg.get("kept_branches", []) or []:
                    lbid = clean(brow.get("legacy_branch_id"))
                    bid = branch_id_by_pair.get((lcid, lbid))
                    if bid:
                        target_group_by_branch[(lcid, bid)] = "SOURCE_COMPANY_SURVIVES"

        print("[A6] 3/7 Discovering Company models and branch routes...", flush=True)

        company_contracts = []
        branch_path_cache = {}

        for model in apps.get_models():
            if model._meta.proxy or not model._meta.managed:
                continue

            company_fields = relation_fields_to(model, Company)
            if not company_fields:
                continue

            paths = find_branch_paths(model, Branch, Company, MAX_PATH_DEPTH)
            branch_path_cache[model] = paths

            for company_field in company_fields:
                company_contracts.append((model, company_field, paths))

        lines.extend([
            "",
            "===== MODEL PARTITIONABILITY INVENTORY =====",
            f"COMPANY_CONTRACT_COUNT={len(company_contracts)}",
        ])

        print(
            f"[A6] 4/7 Evaluating {len(company_contracts)} Company contracts...",
            flush=True,
        )

        query_errors = []
        classification_counts = defaultdict(int)
        model_results = []

        sorted_contracts = sorted(
            company_contracts,
            key=lambda x: (model_label(x[0]), x[1].name),
        )

        for idx, (model, company_field, paths) in enumerate(sorted_contracts, start=1):
            key = f"{model_label(model)}.{company_field.name}"
            print(f"[A6]   [{idx}/{len(sorted_contracts)}] {key}", flush=True)

            try:
                base = model._default_manager.filter(
                    **{f"{company_field.name}_id__in": surviving_company_ids}
                )
                total = base.count()
            except Exception as exc:
                query_errors.append(f"TOTAL {key}: {type(exc).__name__}: {clean(exc)}")
                reconnect_readonly(connection)
                continue

            if total == 0:
                continue

            best = None
            path_metrics = []

            for lookup, human, depth in paths[:8]:
                try:
                    nonnull = base.exclude(**{f"{lookup}__isnull": True}).count()
                    in_scope = base.filter(**{f"{lookup}__in": surviving_branch_ids}).count()
                    metric = {
                        "lookup": lookup,
                        "human": human,
                        "depth": depth,
                        "nonnull": nonnull,
                        "in_scope": in_scope,
                    }
                    path_metrics.append(metric)

                    score = (in_scope, nonnull, -depth)
                    if best is None or score > best[0]:
                        best = (score, metric)
                except Exception as exc:
                    query_errors.append(
                        f"PATH {key} via {lookup}: {type(exc).__name__}: {clean(exc)}"
                    )
                    reconnect_readonly(connection)

            if best is None or best[1]["in_scope"] == 0:
                classification = "COMPANY_LEVEL_CLONE_OR_POLICY"
                best_metric = None
            elif best[1]["in_scope"] == total:
                # Direct or parent route fully determines branch for every row.
                classification = (
                    "DIRECT_BRANCH_ROUTE"
                    if best[1]["depth"] == 1
                    else "PARENT_BRANCH_ROUTE_FULL"
                )
                best_metric = best[1]
            else:
                classification = "PARENT_OR_DIRECT_BRANCH_ROUTE_PARTIAL"
                best_metric = best[1]

            classification_counts[classification] += 1

            per_company_counts = []
            try:
                rows = list(
                    base.values(f"{company_field.name}_id")
                    .annotate(n=Count("pk"))
                    .order_by(f"{company_field.name}_id")
                )
                per_company_counts = [
                    (int(row[f"{company_field.name}_id"]), int(row["n"]))
                    for row in rows
                ]
            except Exception as exc:
                query_errors.append(
                    f"PER_COMPANY {key}: {type(exc).__name__}: {clean(exc)}"
                )
                reconnect_readonly(connection)

            result = {
                "model": model_label(model),
                "company_field": company_field.name,
                "total": total,
                "classification": classification,
                "best_metric": best_metric,
                "path_metrics": path_metrics,
                "per_company_counts": per_company_counts,
            }
            model_results.append(result)

            lines.extend([
                "",
                f"MODEL {key}",
                f"  TOTAL_ROWS_IN_SURVIVING_SCOPE={total}",
                f"  CLASSIFICATION={classification}",
            ])

            if best_metric:
                lines.append(
                    f"  BEST_BRANCH_PATH={best_metric['lookup']}"
                    f" | depth={best_metric['depth']}"
                    f" | nonnull={best_metric['nonnull']}"
                    f" | in_scope={best_metric['in_scope']}"
                )
                lines.append(f"  BEST_BRANCH_PATH_HUMAN={best_metric['human']}")
                if best_metric["in_scope"] < total:
                    lines.append(
                        f"  UNROUTED_ROW_COUNT={total - best_metric['in_scope']}"
                    )
            else:
                lines.append("  BEST_BRANCH_PATH=NONE")

            if per_company_counts:
                rendered = []
                reverse_company = {v: k for k, v in company_id_by_legacy.items()}
                for cid, count in per_company_counts:
                    rendered.append(
                        f"{reverse_company.get(cid,'?')}->{cid}:{count}"
                    )
                lines.append("  PER_COMPANY_COUNTS=" + "; ".join(rendered))

            # For company-level models, print all forward FKs so we can design clone/remap graph.
            if classification == "COMPANY_LEVEL_CLONE_OR_POLICY":
                fk_lines = []
                for field, target in direct_fk_fields(model):
                    if target is Company:
                        continue
                    fk_lines.append(
                        f"{field.name}->{model_label(target)}"
                        f"[on_delete={clean(getattr(getattr(field,'remote_field',None).on_delete,'__name__',''))}]"
                    )
                lines.append(
                    "  FORWARD_FKS=" + ("; ".join(fk_lines) if fk_lines else "NONE")
                )

        print("[A6] 5/7 Auditing critical model schemas...", flush=True)
        lines.extend([
            "",
            "=" * 120,
            "CRITICAL MODEL FK SCHEMAS",
            "=" * 120,
        ])

        critical_found = set()

        for model in sorted(apps.get_models(), key=model_label):
            lbl = model_label(model)
            if lbl not in CRITICAL_MODELS:
                continue
            critical_found.add(lbl)

            lines.append(f"MODEL_SCHEMA {lbl}")
            for field in model._meta.get_fields():
                if not getattr(field, "concrete", False):
                    continue
                remote = getattr(field, "remote_field", None)
                target = getattr(remote, "model", None) if remote else None
                if target is not None:
                    lines.append(
                        f"  FK {field.name} -> {model_label(target)}"
                        f" | null={yesno(getattr(field,'null',False))}"
                        f" | on_delete={clean(getattr(getattr(remote,'on_delete',None),'__name__',''))}"
                    )
                else:
                    lines.append(
                        f"  FIELD {field.name}"
                        f" | type={field.__class__.__name__}"
                        f" | null={yesno(getattr(field,'null',False))}"
                    )

        missing_critical = sorted(CRITICAL_MODELS - critical_found)

        print("[A6] 6/7 Building routing and clone blueprint summary...", flush=True)
        lines.extend([
            "",
            "=" * 120,
            "A6 ROUTING BLUEPRINT SUMMARY",
            "=" * 120,
        ])

        direct_models = []
        parent_full_models = []
        partial_models = []
        company_level_models = []

        for result in model_results:
            item = f"{result['model']}.{result['company_field']}:{result['total']}"
            if result["classification"] == "DIRECT_BRANCH_ROUTE":
                direct_models.append(item)
            elif result["classification"] == "PARENT_BRANCH_ROUTE_FULL":
                parent_full_models.append(item)
            elif result["classification"] == "PARENT_OR_DIRECT_BRANCH_ROUTE_PARTIAL":
                partial_models.append(item)
            elif result["classification"] == "COMPANY_LEVEL_CLONE_OR_POLICY":
                company_level_models.append(item)

        lines.extend([
            f"CLASSIFICATION_COUNTS={dict(sorted(classification_counts.items()))}",
            f"DIRECT_BRANCH_ROUTE_MODEL_COUNT={len(direct_models)}",
            f"PARENT_BRANCH_ROUTE_FULL_MODEL_COUNT={len(parent_full_models)}",
            f"PARTIAL_ROUTE_MODEL_COUNT={len(partial_models)}",
            f"COMPANY_LEVEL_MODEL_COUNT={len(company_level_models)}",
            f"QUERY_ERROR_COUNT={len(query_errors)}",
            f"MISSING_CRITICAL_MODEL_COUNT={len(missing_critical)}",
            "",
            "DIRECT_BRANCH_ROUTE_MODELS_BEGIN",
            *direct_models,
            "DIRECT_BRANCH_ROUTE_MODELS_END",
            "",
            "PARENT_BRANCH_ROUTE_FULL_MODELS_BEGIN",
            *parent_full_models,
            "PARENT_BRANCH_ROUTE_FULL_MODELS_END",
            "",
            "PARTIAL_ROUTE_MODELS_BEGIN",
            *partial_models,
            "PARTIAL_ROUTE_MODELS_END",
            "",
            "COMPANY_LEVEL_MODELS_BEGIN",
            *company_level_models,
            "COMPANY_LEVEL_MODELS_END",
        ])

        if missing_critical:
            lines.append("MISSING_CRITICAL_MODELS_BEGIN")
            lines.extend(missing_critical)
            lines.append("MISSING_CRITICAL_MODELS_END")

        if query_errors:
            lines.append("QUERY_ERRORS_BEGIN")
            lines.extend(query_errors)
            lines.append("QUERY_ERRORS_END")

        # Retained company rule is part of the blueprint.
        lines.extend([
            "",
            "SOURCE_COMPANY_RETENTION_BEGIN",
        ])
        for lcid in sorted(retained_group_by_company, key=nkey):
            lines.append(
                f"legacy_company={lcid}"
                f" | retain_group={retained_group_by_company[lcid]}"
                f" | current_company_id={company_id_by_legacy[lcid]}"
            )
        lines.append("SOURCE_COMPANY_RETENTION_END")

        # Admin policy finalized from A5B + user's approved business rule.
        lines.extend([
            "",
            "ADMIN_MEMBERSHIP_POLICY=Primary legacy Admin#Company with LEGACY_UNRESOLVED receives ADMIN membership in every output Company for SPLIT; remains ADMIN on surviving Company for PARTIAL_INCLUDE.",
            "RESTRICTED_MEMBERSHIP_POLICY=Membership follows only output Company groups containing its original granted Branch IDs.",
            "ALL_MEMBERSHIP_POLICY=Membership is replicated to every output Company.",
        ])

        result = "PASS" if not query_errors and not missing_critical else "REVIEW_REQUIRED"

        lines.extend([
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A6_RESULT={result}",
            "=" * 120,
        ])

        print("[A6] 7/7 Writing report...", flush=True)
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A6 =====")
        print(f"A6_RESULT={result}")
        print(f"SURVIVING_SPLIT_OR_PARTIAL_COMPANIES={len(surviving_cfg)}")
        print(f"MODEL_RESULT_COUNT={len(model_results)}")
        print(f"DIRECT_BRANCH_ROUTE_MODEL_COUNT={len(direct_models)}")
        print(f"PARENT_BRANCH_ROUTE_FULL_MODEL_COUNT={len(parent_full_models)}")
        print(f"PARTIAL_ROUTE_MODEL_COUNT={len(partial_models)}")
        print(f"COMPANY_LEVEL_MODEL_COUNT={len(company_level_models)}")
        print(f"QUERY_ERROR_COUNT={len(query_errors)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")
        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A6_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA6_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A6_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A6 =====", flush=True)
        print("A6_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

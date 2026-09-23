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
A6E_REPORT = ROOT / "v2_company_split_a6e_final_4_payment_closure.txt"
REPORT = ROOT / "v2_company_split_a7_master_clone_remap_audit.txt"

SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
EXPECTED_A6E_SHA256 = "97F98DAD8C3AC7CE8D86D6C4D5F8DA6E50ADE70ABED3853DBBD902ADE09F5332"
QUERY_TIMEOUT_MS = 90000
MAX_BRANCH_PATH_DEPTH = 4

CLONE_ALL_MODELS = [
    "accounting.Account",
    "accounting.TaxRate",
    "accounting.AccountingRoutingRule",
    "accounting.AccountingSettings",
    "companies.CompanySettings",
    "catalog.CatalogCategory",
    "catalog.CatalogUnit",
    "treasury.TreasuryAccount",
]

USAGE_ROUTED_MASTERS = [
    "catalog.CatalogItem",
    "parties.BusinessParty",
]


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
        raise RuntimeError("manage.py not found; run from PrimeyAcc project root")
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


def find_branch_paths(start_model, Branch, Company, max_depth=4):
    results = []
    seen = set()

    def walk(model, parts, readable, depth, visited):
        if depth > max_depth:
            return

        state = (model, tuple(parts))
        if state in seen:
            return
        seen.add(state)

        for field, target in direct_fk_fields(model):
            if target in visited:
                continue

            if target is Branch:
                lookup = "__".join(parts + [f"{field.name}_id"])
                human = " -> ".join(
                    readable
                    + [
                        f"{model_label(model)}.{field.name}"
                        " -> companies.Branch"
                    ]
                )
                results.append((lookup, human, depth))
                continue

            if target is Company:
                continue

            target_label = model_label(target)

            if target_label.startswith("auth."):
                continue
            if target_label.startswith("contenttypes."):
                continue
            if target_label in {
                "accounts.CompanyMembership",
                "companies.Company",
            }:
                continue

            walk(
                target,
                parts + [field.name],
                readable
                + [
                    f"{model_label(model)}.{field.name}"
                    f" -> {target_label}"
                ],
                depth + 1,
                visited | {target},
            )

    walk(start_model, [], [], 1, {start_model})

    best = {}
    for lookup, human, depth in results:
        if lookup not in best or depth < best[lookup][1]:
            best[lookup] = (human, depth)

    return sorted(
        [
            (lookup, human, depth)
            for lookup, (human, depth) in best.items()
        ],
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


def constraint_contract(model) -> list[str]:
    out = []
    meta = model._meta

    if meta.unique_together:
        out.append(f"unique_together={meta.unique_together}")

    for constraint in meta.constraints:
        out.append(
            f"constraint={constraint.__class__.__name__}"
            f" name={clean(getattr(constraint,'name',''))}"
            f" fields={clean(getattr(constraint,'fields',''))}"
            f" condition={clean(getattr(constraint,'condition',''))}"
        )

    for field in meta.fields:
        if getattr(field, "unique", False):
            out.append(f"unique_field={field.name}")

    return out


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A7 MASTER CLONE / REMAP AUDIT",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        f"QUERY_TIMEOUT_MS={QUERY_TIMEOUT_MS}",
        f"MAX_BRANCH_PATH_DEPTH={MAX_BRANCH_PATH_DEPTH}",
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
        print("[A7] 1/7 Validating frozen artifacts...", flush=True)

        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")

        decision_sha = hashlib.sha256(
            DECISION_MAP.read_bytes()
        ).hexdigest().upper()

        if decision_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                "Decision map SHA mismatch "
                f"expected={EXPECTED_DECISION_SHA256} actual={decision_sha}"
            )

        if not A6E_REPORT.exists():
            raise RuntimeError(f"Missing {A6E_REPORT.name}")

        a6e_sha = hashlib.sha256(
            A6E_REPORT.read_bytes()
        ).hexdigest().upper()

        if a6e_sha != EXPECTED_A6E_SHA256:
            raise RuntimeError(
                "A6E SHA mismatch "
                f"expected={EXPECTED_A6E_SHA256} actual={a6e_sha}"
            )

        decision = json.loads(
            DECISION_MAP.read_text(encoding="utf-8")
        )

        surviving_cfg = [
            row
            for row in decision.get("companies", [])
            if clean(row.get("mode")) in {
                "SPLIT",
                "PARTIAL_INCLUDE",
            }
        ]

        cfg_by_legacy = {
            clean(row["legacy_company_id"]): row
            for row in surviving_cfg
        }

        surviving_legacy_ids = set(cfg_by_legacy)

        lines.extend([
            "",
            "===== FROZEN INPUTS =====",
            f"DECISION_MAP_SHA256={decision_sha}",
            f"A6E_REPORT_SHA256={a6e_sha}",
            f"SURVIVING_COMPANIES={len(surviving_cfg)}",
            f"SURVIVING_LEGACY_IDS={','.join(sorted(surviving_legacy_ids, key=nkey))}",
        ])

        print("[A7] 2/7 Loading Django/maps/output groups...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.db import connection
        from django.db.models import Count

        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company

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

        current_company_ids = sorted(
            company_id_by_legacy.values()
        )

        reverse_company = {
            current_id: legacy_id
            for legacy_id, current_id
            in company_id_by_legacy.items()
        }

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
                branch_id = int(raw)
                branch_id_by_pair[pair] = branch_id
                pair_by_branch_id[branch_id] = pair

        branches = Branch.objects.in_bulk(
            list(pair_by_branch_id)
        )

        group_by_branch = {}
        groups_by_company = defaultdict(list)
        source_group_by_company = {}
        excluded_branch_ids_by_company = defaultdict(set)

        for legacy_company_id, cfg in cfg_by_legacy.items():
            mode = clean(cfg.get("mode"))

            if mode == "SPLIT":
                default_groups = []

                for group in cfg.get("output_groups", []) or []:
                    group_id = clean(group.get("group_id"))
                    groups_by_company[
                        legacy_company_id
                    ].append(group_id)

                    for branch_row in group.get("branches", []) or []:
                        legacy_branch_id = clean(
                            branch_row.get(
                                "legacy_branch_id"
                            )
                        )
                        branch_id = branch_id_by_pair.get(
                            (
                                legacy_company_id,
                                legacy_branch_id,
                            )
                        )

                        if not branch_id:
                            continue

                        group_by_branch[
                            (
                                legacy_company_id,
                                branch_id,
                            )
                        ] = group_id

                        branch = branches.get(branch_id)

                        if (
                            branch is not None
                            and bool(branch.is_default)
                        ):
                            default_groups.append(group_id)

                if len(set(default_groups)) != 1:
                    raise RuntimeError(
                        f"Invalid retained/default group for {legacy_company_id}: {default_groups}"
                    )

                source_group_by_company[
                    legacy_company_id
                ] = default_groups[0]

            else:
                groups_by_company[
                    legacy_company_id
                ] = ["SOURCE_COMPANY_SURVIVES"]

                source_group_by_company[
                    legacy_company_id
                ] = "SOURCE_COMPANY_SURVIVES"

                for branch_row in cfg.get(
                    "kept_branches",
                    [],
                ) or []:
                    legacy_branch_id = clean(
                        branch_row.get(
                            "legacy_branch_id"
                        )
                    )
                    branch_id = branch_id_by_pair.get(
                        (
                            legacy_company_id,
                            legacy_branch_id,
                        )
                    )

                    if branch_id:
                        group_by_branch[
                            (
                                legacy_company_id,
                                branch_id,
                            )
                        ] = "SOURCE_COMPANY_SURVIVES"

                for branch_row in cfg.get(
                    "excluded_branches",
                    [],
                ) or []:
                    legacy_branch_id = clean(
                        branch_row.get(
                            "legacy_branch_id"
                        )
                    )
                    branch_id = branch_id_by_pair.get(
                        (
                            legacy_company_id,
                            legacy_branch_id,
                        )
                    )

                    if branch_id:
                        excluded_branch_ids_by_company[
                            legacy_company_id
                        ].add(branch_id)

        print("[A7] 3/7 Auditing clone-all foundation masters...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "CLONE-ALL FOUNDATION MASTER CONTRACTS",
            "=" * 120,
        ])

        query_errors = []
        missing_models = []
        clone_all_estimate = 0

        for label in CLONE_ALL_MODELS:
            app_label, model_name = label.split(".", 1)
            try:
                model = apps.get_model(
                    app_label,
                    model_name,
                )
            except Exception:
                model = None

            if model is None:
                missing_models.append(label)
                lines.append(
                    f"MODEL {label} | MISSING"
                )
                continue

            company_fields = relation_fields_to(
                model,
                Company,
            )

            if len(company_fields) != 1:
                lines.append(
                    f"MODEL {label}"
                    f" | COMPANY_FIELD_COUNT={len(company_fields)}"
                    f" | REVIEW_REQUIRED"
                )
                continue

            company_field = company_fields[0]

            lines.extend([
                "",
                f"MODEL {label}",
                f"COMPANY_FIELD={company_field.name}",
                "CONSTRAINTS_BEGIN",
                *constraint_contract(model),
                "CONSTRAINTS_END",
            ])

            for legacy_company_id in sorted(
                surviving_legacy_ids,
                key=nkey,
            ):
                current_company_id = company_id_by_legacy[
                    legacy_company_id
                ]
                group_count = len(
                    groups_by_company[
                        legacy_company_id
                    ]
                )

                try:
                    count = model._default_manager.filter(
                        **{
                            f"{company_field.name}_id":
                            current_company_id
                        }
                    ).count()
                except Exception as exc:
                    query_errors.append(
                        f"CLONE_ALL {label} company={legacy_company_id}/{current_company_id}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )
                    reconnect_readonly(connection)
                    count = -1

                clone_count = (
                    count * max(group_count - 1, 0)
                    if count >= 0
                    else -1
                )

                if clone_count > 0:
                    clone_all_estimate += clone_count

                lines.append(
                    f"  COMPANY legacy_id={legacy_company_id}"
                    f" | current_id={current_company_id}"
                    f" | source_rows={count}"
                    f" | output_groups={group_count}"
                    f" | expected_new_clones={clone_count}"
                )

        print("[A7] 4/7 Discovering usage-routed master dependencies...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "USAGE-ROUTED MASTER DEPENDENCY CONTRACTS",
            "=" * 120,
        ])

        master_results = {}
        unsupported_active_contracts = []
        cross_company_branch_refs = []

        for master_label in USAGE_ROUTED_MASTERS:
            app_label, model_name = master_label.split(".", 1)
            master_model = apps.get_model(
                app_label,
                model_name,
            )

            master_company_fields = relation_fields_to(
                master_model,
                Company,
            )

            if len(master_company_fields) != 1:
                raise RuntimeError(
                    f"{master_label} expected one Company FK, got {len(master_company_fields)}"
                )

            master_company_field = (
                master_company_fields[0]
            )

            # master_groups[(legacy_company_id, master_id)] = set(output groups)
            master_groups = defaultdict(set)
            master_excluded_branch_refs = defaultdict(set)
            contract_summaries = []

            # BusinessParty has its own direct Branch dimension.
            if master_label == "parties.BusinessParty":
                try:
                    direct_branch_rows = list(
                        master_model._default_manager.filter(
                            **{
                                f"{master_company_field.name}_id__in":
                                current_company_ids,
                                "branch_id__isnull": False,
                            }
                        )
                        .values(
                            "id",
                            f"{master_company_field.name}_id",
                            "branch_id",
                        )
                        .order_by()
                    )

                    for row in direct_branch_rows:
                        current_company_id = int(
                            row[
                                f"{master_company_field.name}_id"
                            ]
                        )
                        legacy_company_id = reverse_company[
                            current_company_id
                        ]
                        master_id = int(row["id"])
                        branch_id = int(row["branch_id"])

                        group = group_by_branch.get(
                            (
                                legacy_company_id,
                                branch_id,
                            )
                        )

                        if group:
                            master_groups[
                                (
                                    legacy_company_id,
                                    master_id,
                                )
                            ].add(group)
                        elif branch_id in excluded_branch_ids_by_company[
                            legacy_company_id
                        ]:
                            master_excluded_branch_refs[
                                (
                                    legacy_company_id,
                                    master_id,
                                )
                            ].add(branch_id)
                        else:
                            cross_company_branch_refs.append(
                                (
                                    master_label,
                                    legacy_company_id,
                                    master_id,
                                    branch_id,
                                    "MASTER_DIRECT_BRANCH",
                                )
                            )

                    contract_summaries.append(
                        {
                            "contract":
                            f"{master_label}.branch",
                            "classification":
                            "MASTER_DIRECT_BRANCH",
                            "rows":
                            len(direct_branch_rows),
                        }
                    )

                except Exception as exc:
                    query_errors.append(
                        f"MASTER_DIRECT_BRANCH {master_label}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )
                    reconnect_readonly(connection)

            # Discover every concrete FK to this master model.
            for model in apps.get_models():
                if (
                    model._meta.proxy
                    or not model._meta.managed
                ):
                    continue

                master_fk_fields = relation_fields_to(
                    model,
                    master_model,
                )

                if not master_fk_fields:
                    continue

                company_fields = relation_fields_to(
                    model,
                    Company,
                )

                for master_fk in master_fk_fields:
                    contract = (
                        f"{model_label(model)}."
                        f"{master_fk.name}"
                    )

                    if len(company_fields) != 1:
                        # Count whether this unsupported contract is active in scope.
                        unsupported_active_contracts.append(
                            (
                                master_label,
                                contract,
                                "NO_SINGLE_DIRECT_COMPANY_FK",
                            )
                        )
                        continue

                    company_field = company_fields[0]

                    branch_paths = find_branch_paths(
                        model,
                        Branch,
                        Company,
                        MAX_BRANCH_PATH_DEPTH,
                    )

                    best_path = (
                        branch_paths[0]
                        if branch_paths
                        else None
                    )

                    try:
                        base = (
                            model._default_manager.filter(
                                **{
                                    f"{company_field.name}_id__in":
                                    current_company_ids,
                                    f"{master_fk.name}_id__isnull":
                                    False,
                                }
                            )
                        )

                        total = base.count()

                        if total == 0:
                            contract_summaries.append(
                                {
                                    "contract": contract,
                                    "classification":
                                    "NO_ROWS_IN_SCOPE",
                                    "rows": 0,
                                }
                            )
                            continue

                        if best_path is None:
                            contract_summaries.append(
                                {
                                    "contract": contract,
                                    "classification":
                                    "COMPANY_LEVEL_REFERENCE_NO_BRANCH_ROUTE",
                                    "rows": total,
                                }
                            )
                            continue

                        lookup, human, depth = best_path

                        grouped_rows = list(
                            base.exclude(
                                **{
                                    f"{lookup}__isnull":
                                    True
                                }
                            )
                            .values(
                                f"{company_field.name}_id",
                                f"{master_fk.name}_id",
                                lookup,
                            )
                            .distinct()
                            .iterator(
                                chunk_size=10000
                            )
                        )

                        routed_pair_count = 0
                        excluded_pair_count = 0
                        outside_pair_count = 0

                        for row in grouped_rows:
                            current_company_id = int(
                                row[
                                    f"{company_field.name}_id"
                                ]
                            )
                            legacy_company_id = (
                                reverse_company[
                                    current_company_id
                                ]
                            )
                            master_id = int(
                                row[
                                    f"{master_fk.name}_id"
                                ]
                            )
                            branch_id = int(
                                row[lookup]
                            )

                            group = group_by_branch.get(
                                (
                                    legacy_company_id,
                                    branch_id,
                                )
                            )

                            if group:
                                master_groups[
                                    (
                                        legacy_company_id,
                                        master_id,
                                    )
                                ].add(group)
                                routed_pair_count += 1
                            elif (
                                branch_id
                                in excluded_branch_ids_by_company[
                                    legacy_company_id
                                ]
                            ):
                                master_excluded_branch_refs[
                                    (
                                        legacy_company_id,
                                        master_id,
                                    )
                                ].add(branch_id)
                                excluded_pair_count += 1
                            else:
                                cross_company_branch_refs.append(
                                    (
                                        master_label,
                                        legacy_company_id,
                                        master_id,
                                        branch_id,
                                        contract,
                                    )
                                )
                                outside_pair_count += 1

                        nonnull_branch_rows = base.exclude(
                            **{
                                f"{lookup}__isnull":
                                True
                            }
                        ).count()

                        null_branch_rows = (
                            total - nonnull_branch_rows
                        )

                        contract_summaries.append(
                            {
                                "contract": contract,
                                "classification":
                                "BRANCH_ROUTABLE_REFERENCE",
                                "rows": total,
                                "path": lookup,
                                "path_human": human,
                                "depth": depth,
                                "nonnull_branch_rows":
                                nonnull_branch_rows,
                                "null_branch_rows":
                                null_branch_rows,
                                "routed_distinct_pairs":
                                routed_pair_count,
                                "excluded_distinct_pairs":
                                excluded_pair_count,
                                "outside_distinct_pairs":
                                outside_pair_count,
                            }
                        )

                    except Exception as exc:
                        query_errors.append(
                            f"MASTER_REF {master_label} via {contract}: "
                            f"{type(exc).__name__}: {clean(exc)}"
                        )
                        reconnect_readonly(connection)

            master_results[
                master_label
            ] = {
                "master_model": master_model,
                "master_company_field":
                master_company_field,
                "master_groups": master_groups,
                "master_excluded_branch_refs":
                master_excluded_branch_refs,
                "contract_summaries":
                contract_summaries,
            }

            lines.extend([
                "",
                f"MASTER {master_label}",
                "CONSTRAINTS_BEGIN",
                *constraint_contract(master_model),
                "CONSTRAINTS_END",
                "REFERENCE_CONTRACTS_BEGIN",
            ])

            for summary in contract_summaries:
                lines.append(
                    json.dumps(
                        summary,
                        ensure_ascii=False,
                        sort_keys=True,
                    )
                )

            lines.append(
                "REFERENCE_CONTRACTS_END"
            )

        print("[A7] 5/7 Calculating exact clone/remap counts...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "MASTER CLONE / REMAP COUNTS",
            "=" * 120,
        ])

        usage_clone_estimate = 0
        partial_party_conflicts = []

        for master_label in USAGE_ROUTED_MASTERS:
            result = master_results[
                master_label
            ]
            master_model = result[
                "master_model"
            ]
            company_field = result[
                "master_company_field"
            ]
            master_groups = result[
                "master_groups"
            ]
            excluded_refs = result[
                "master_excluded_branch_refs"
            ]

            lines.extend([
                "",
                f"MASTER {master_label}",
            ])

            for legacy_company_id in sorted(
                surviving_legacy_ids,
                key=nkey,
            ):
                current_company_id = (
                    company_id_by_legacy[
                        legacy_company_id
                    ]
                )
                source_group = (
                    source_group_by_company[
                        legacy_company_id
                    ]
                )

                try:
                    total_master_ids = set(
                        master_model._default_manager.filter(
                            **{
                                f"{company_field.name}_id":
                                current_company_id
                            }
                        )
                        .values_list(
                            "id",
                            flat=True,
                        )
                        .iterator(
                            chunk_size=20000
                        )
                    )
                except Exception as exc:
                    query_errors.append(
                        f"MASTER_IDS {master_label} company={legacy_company_id}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )
                    reconnect_readonly(connection)
                    total_master_ids = set()

                used_ids = {
                    master_id
                    for (
                        mapped_legacy_company_id,
                        master_id,
                    ), groups
                    in master_groups.items()
                    if (
                        mapped_legacy_company_id
                        == legacy_company_id
                        and groups
                    )
                }

                unreferenced_ids = (
                    total_master_ids - used_ids
                )

                multi_group_ids = 0
                source_group_used_ids = 0
                non_source_used_ids = 0
                company_clone_count = 0

                group_usage_counts = Counter()

                for master_id in total_master_ids:
                    groups = master_groups.get(
                        (
                            legacy_company_id,
                            int(master_id),
                        ),
                        set(),
                    )

                    if len(groups) > 1:
                        multi_group_ids += 1

                    if source_group in groups:
                        source_group_used_ids += 1

                    non_source_groups = {
                        group
                        for group in groups
                        if group != source_group
                    }

                    if non_source_groups:
                        non_source_used_ids += 1

                    company_clone_count += len(
                        non_source_groups
                    )

                    for group in groups:
                        group_usage_counts[
                            group
                        ] += 1

                usage_clone_estimate += (
                    company_clone_count
                )

                excluded_only_ids = {
                    master_id
                    for (
                        mapped_legacy_company_id,
                        master_id,
                    ), branch_ids
                    in excluded_refs.items()
                    if (
                        mapped_legacy_company_id
                        == legacy_company_id
                        and branch_ids
                        and master_id
                        not in used_ids
                    )
                }

                excluded_and_surviving_ids = {
                    master_id
                    for (
                        mapped_legacy_company_id,
                        master_id,
                    ), branch_ids
                    in excluded_refs.items()
                    if (
                        mapped_legacy_company_id
                        == legacy_company_id
                        and branch_ids
                        and master_id
                        in used_ids
                    )
                }

                if (
                    legacy_company_id == "76"
                    and master_label
                    == "parties.BusinessParty"
                    and excluded_and_surviving_ids
                ):
                    partial_party_conflicts.extend(
                        sorted(
                            excluded_and_surviving_ids
                        )
                    )

                lines.append(
                    f"  COMPANY legacy_id={legacy_company_id}"
                    f" | current_id={current_company_id}"
                    f" | source_group={source_group}"
                    f" | total_master_rows={len(total_master_ids)}"
                    f" | used_by_surviving_groups={len(used_ids)}"
                    f" | unreferenced_or_company_level_only={len(unreferenced_ids)}"
                    f" | multi_group_master_rows={multi_group_ids}"
                    f" | source_group_used_rows={source_group_used_ids}"
                    f" | non_source_used_rows={non_source_used_ids}"
                    f" | expected_clones={company_clone_count}"
                    f" | excluded_branch_only_rows={len(excluded_only_ids)}"
                    f" | excluded_and_surviving_rows={len(excluded_and_surviving_ids)}"
                    f" | group_usage={dict(sorted(group_usage_counts.items()))}"
                )

        print("[A7] 6/7 Auditing Company/Branch clone field contracts...", flush=True)

        CompanyModel = apps.get_model(
            "companies",
            "Company",
        )
        BranchModel = apps.get_model(
            "companies",
            "Branch",
        )

        lines.extend([
            "",
            "=" * 120,
            "COMPANY / BRANCH CLONE FIELD CONTRACTS",
            "=" * 120,
            "COMPANY_CONCRETE_FIELDS_BEGIN",
        ])

        for field in CompanyModel._meta.concrete_fields:
            if field.primary_key:
                continue

            remote = getattr(
                getattr(field, "remote_field", None),
                "model",
                None,
            )

            lines.append(
                f"{field.name}"
                f" | type={field.__class__.__name__}"
                f" | null={yesno(getattr(field,'null',False))}"
                f" | unique={yesno(getattr(field,'unique',False))}"
                f" | relation={model_label(remote) if remote else ''}"
            )

        lines.append(
            "COMPANY_CONCRETE_FIELDS_END"
        )
        lines.append(
            "COMPANY_CONSTRAINTS_BEGIN"
        )
        lines.extend(
            constraint_contract(
                CompanyModel
            )
        )
        lines.append(
            "COMPANY_CONSTRAINTS_END"
        )

        lines.append(
            "BRANCH_CONCRETE_FIELDS_BEGIN"
        )

        for field in BranchModel._meta.concrete_fields:
            if field.primary_key:
                continue

            remote = getattr(
                getattr(field, "remote_field", None),
                "model",
                None,
            )

            lines.append(
                f"{field.name}"
                f" | type={field.__class__.__name__}"
                f" | null={yesno(getattr(field,'null',False))}"
                f" | unique={yesno(getattr(field,'unique',False))}"
                f" | relation={model_label(remote) if remote else ''}"
            )

        lines.append(
            "BRANCH_CONCRETE_FIELDS_END"
        )

        print("[A7] 7/7 Building final master strategy summary...", flush=True)

        lines.extend([
            "",
            "=" * 120,
            "A7 FINAL MASTER STRATEGY SUMMARY",
            "=" * 120,
            f"CLONE_ALL_MODEL_COUNT={len(CLONE_ALL_MODELS)}",
            f"CLONE_ALL_ESTIMATED_NEW_ROWS={clone_all_estimate}",
            f"USAGE_ROUTED_MASTER_COUNT={len(USAGE_ROUTED_MASTERS)}",
            f"USAGE_ROUTED_ESTIMATED_NEW_CLONES={usage_clone_estimate}",
            f"QUERY_ERROR_COUNT={len(query_errors)}",
            f"MISSING_MODEL_COUNT={len(missing_models)}",
            f"UNSUPPORTED_ACTIVE_CONTRACT_COUNT={len(unsupported_active_contracts)}",
            f"CROSS_COMPANY_OR_UNKNOWN_BRANCH_REF_COUNT={len(cross_company_branch_refs)}",
            f"PARTIAL_76_BUSINESSPARTY_EXCLUDED_AND_SURVIVING_COUNT={len(set(partial_party_conflicts))}",
        ])

        if unsupported_active_contracts:
            lines.append(
                "UNSUPPORTED_ACTIVE_CONTRACTS_BEGIN"
            )
            for row in unsupported_active_contracts:
                lines.append(clean(row))
            lines.append(
                "UNSUPPORTED_ACTIVE_CONTRACTS_END"
            )

        if cross_company_branch_refs:
            lines.append(
                "CROSS_COMPANY_OR_UNKNOWN_BRANCH_REFS_BEGIN"
            )
            for row in cross_company_branch_refs:
                lines.append(clean(row))
            lines.append(
                "CROSS_COMPANY_OR_UNKNOWN_BRANCH_REFS_END"
            )

        if partial_party_conflicts:
            lines.append(
                "PARTIAL_76_PARTY_CONFLICT_IDS_BEGIN"
            )
            for master_id in sorted(
                set(partial_party_conflicts)
            ):
                lines.append(
                    f"business_party_id={master_id}"
                )
            lines.append(
                "PARTIAL_76_PARTY_CONFLICT_IDS_END"
            )

        if query_errors:
            lines.append(
                "QUERY_ERRORS_BEGIN"
            )
            lines.extend(query_errors)
            lines.append(
                "QUERY_ERRORS_END"
            )

        if missing_models:
            lines.append(
                "MISSING_MODELS_BEGIN"
            )
            lines.extend(missing_models)
            lines.append(
                "MISSING_MODELS_END"
            )

        lines.extend([
            "",
            "PROPOSED_MASTER_EXECUTION_POLICY:",
            "1) Keep the original Company row for the output group containing the original default Branch. Move that group's Branch(es) nowhere; they remain on the source Company.",
            "2) Create new Company rows for every other SPLIT output group. PARTIAL_INCLUDE Company 76 keeps its source Company row.",
            "3) Clone the small foundation masters to every new Company: chart of accounts, tax rates, accounting routing/settings, CompanySettings, CatalogCategory, CatalogUnit, and TreasuryAccount. Remap internal parent/FK graphs inside each clone set.",
            "4) Keep canonical original CatalogItem and BusinessParty rows on the retained source Company to preserve the unique LegacyObjectMap target. Clone those masters only into non-source output groups that actually reference them through branch-routed operational history/inventory.",
            "5) A master referenced by multiple output groups gets one clone per required non-source group. Operational FKs are remapped to the clone in their destination Company.",
            "6) Masters with no surviving branch-routed usage remain only on the retained source Company; do not multiply them blindly.",
            "7) For Company 76, records tied only to excluded Branches are purge candidates. If one BusinessParty is tied to an excluded Branch but is also referenced by surviving Branch 92, do not delete it automatically; it requires explicit remap/branch normalization.",
            "8) LegacyObjectMap source identity remains canonical and unique. Do not duplicate source_system/source_table/legacy_id mappings for split clones. Split-clone provenance must be recorded separately by the transformation manifest/report.",
            "",
            "SUBSCRIPTION_POLICY=Source Company keeps its original subscription history/current row. Each newly created Company receives one independent clone of the authoritative current subscription selected at cutover, preserving plan/start/end/status/commercial amounts rather than starting on split date.",
            "USER_POLICY=Primary Admin#Company is replicated as ADMIN to every output Company; ALL users to every output Company; RESTRICTED users only to output groups intersecting original Branch grants.",
        ])

        result = (
            "PASS"
            if not query_errors
            and not missing_models
            and not cross_company_branch_refs
            and not partial_party_conflicts
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A7_RESULT={result}",
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A7 =====")
        print(f"A7_RESULT={result}")
        print(f"CLONE_ALL_ESTIMATED_NEW_ROWS={clone_all_estimate}")
        print(f"USAGE_ROUTED_ESTIMATED_NEW_CLONES={usage_clone_estimate}")
        print(f"QUERY_ERROR_COUNT={len(query_errors)}")
        print(f"CROSS_COMPANY_OR_UNKNOWN_BRANCH_REF_COUNT={len(cross_company_branch_refs)}")
        print(
            "PARTIAL_76_BUSINESSPARTY_EXCLUDED_AND_SURVIVING_COUNT="
            f"{len(set(partial_party_conflicts))}"
        )
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A7_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA7_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A7_RESULT=FAIL",
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

        print("===== PRIMEYACC COMPANY SPLIT A7 =====", flush=True)
        print("A7_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
DECISION_MAP = ROOT / "v2_company_split_decision_map.json"
REPORT = ROOT / "v2_company_split_a5_dependency_safety_audit.txt"
SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
QUERY_TIMEOUT_MS = 8000


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def yesno(value: Any) -> str:
    return "YES" if bool(value) else "NO"


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


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


def relation_fields_to(model, target_model):
    out = []
    for field in model._meta.get_fields():
        if not getattr(field, "concrete", False):
            continue

        remote = getattr(field, "remote_field", None)
        related = getattr(remote, "model", None) if remote else None

        if related is target_model and (
            getattr(field, "many_to_one", False)
            or getattr(field, "one_to_one", False)
        ):
            out.append(field)

    return out


def on_delete_name(field) -> str:
    remote = getattr(field, "remote_field", None)
    fn = getattr(remote, "on_delete", None) if remote else None
    if fn is None:
        return ""
    return clean(getattr(fn, "__name__", str(fn)))


def reset_readonly_connection(connection) -> None:
    connection.close()
    connection.connect()
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def main() -> int:
    lines: list[str] = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A5 DEEP DEPENDENCY & SAFETY AUDIT",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
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
        print("[A5] 1/8 Validating frozen decision map...", flush=True)

        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing decision map: {DECISION_MAP}")

        actual_sha = hashlib.sha256(DECISION_MAP.read_bytes()).hexdigest().upper()
        if actual_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                "Decision map SHA mismatch. "
                f"expected={EXPECTED_DECISION_SHA256} actual={actual_sha}"
            )

        decision = json.loads(DECISION_MAP.read_text(encoding="utf-8"))
        companies_cfg = decision.get("companies") or []

        if len(companies_cfg) != 16:
            raise RuntimeError(
                f"Decision map expected 16 scoped companies, got {len(companies_cfg)}"
            )

        lines.extend(
            [
                "",
                "===== DECISION MAP FREEZE =====",
                f"DECISION_MAP={DECISION_MAP.name}",
                f"DECISION_MAP_SHA256={actual_sha}",
                f"DECISION_SCHEMA={clean(decision.get('schema'))}",
                f"SCOPED_COMPANIES={len(companies_cfg)}",
                f"SUMMARY={decision.get('summary')}",
            ]
        )

        print("[A5] 2/8 Loading Django and authoritative maps...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.contrib.auth import get_user_model
        from django.db import connection
        from django.db.models import Count, F

        from accounts.models import (
            BranchAccessMode,
            CompanyMembership,
            CompanyMembershipBranchGrant,
            CompanyMembershipBranchPolicy,
        )
        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company

        User = get_user_model()

        if connection.vendor != "postgresql":
            raise RuntimeError(
                f"Safety stop: expected PostgreSQL, got {connection.vendor}"
            )

        with connection.cursor() as cursor:
            cursor.execute("SET default_transaction_read_only = on")
            cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")

        legacy_company_ids = {
            clean(row["legacy_company_id"]) for row in companies_cfg
        }

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=legacy_company_ids,
            )
        )

        company_map_by_legacy = {
            clean(m.legacy_id): m for m in company_maps
        }

        missing_company_maps = sorted(
            legacy_company_ids - set(company_map_by_legacy),
            key=nkey,
        )
        if missing_company_maps:
            raise RuntimeError(
                f"Missing company maps: {missing_company_maps}"
            )

        company_id_by_legacy: dict[str, int] = {}

        for legacy_company_id in legacy_company_ids:
            cmap = company_map_by_legacy[legacy_company_id]
            raw = clean(cmap.target_object_id) or clean(cmap.company_id)

            if not raw.isdigit():
                raise RuntimeError(
                    f"Missing current company id for legacy company {legacy_company_id}"
                )

            company_id_by_legacy[legacy_company_id] = int(raw)

        target_company_ids = sorted(set(company_id_by_legacy.values()))
        companies = Company.objects.in_bulk(target_company_ids)

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=legacy_company_ids,
            )
        )

        branch_current_by_pair: dict[tuple[str, str], int] = {}
        legacy_pair_by_current_branch: dict[int, tuple[str, str]] = {}

        for m in branch_maps:
            raw = clean(m.target_object_id)
            if not raw.isdigit():
                continue

            pair = (
                clean(m.legacy_company_id),
                clean(m.legacy_id),
            )
            current_branch_id = int(raw)
            branch_current_by_pair[pair] = current_branch_id
            legacy_pair_by_current_branch[current_branch_id] = pair

        target_branch_ids = sorted(set(branch_current_by_pair.values()))
        branches = Branch.objects.in_bulk(target_branch_ids)

        # Validate current company/branch ownership from authoritative mappings.
        ownership_errors: list[str] = []

        for (legacy_company_id, legacy_branch_id), branch_id in (
            branch_current_by_pair.items()
        ):
            branch = branches.get(branch_id)
            expected_company_id = company_id_by_legacy[legacy_company_id]

            if branch is None:
                ownership_errors.append(
                    f"branch_missing legacy_company={legacy_company_id} "
                    f"legacy_branch={legacy_branch_id} current_branch={branch_id}"
                )
            elif int(branch.company_id) != expected_company_id:
                ownership_errors.append(
                    f"branch_company_mismatch legacy_company={legacy_company_id} "
                    f"legacy_branch={legacy_branch_id} current_branch={branch_id} "
                    f"actual_company={branch.company_id} expected_company={expected_company_id}"
                )

        if ownership_errors:
            raise RuntimeError(
                f"Ownership validation failed count={len(ownership_errors)} "
                f"first={ownership_errors[0]}"
            )

        print("[A5] 3/8 Discovering dependency contracts...", flush=True)

        branch_fk_contracts = []
        company_fk_contracts = []
        user_fk_contracts = []

        for model in apps.get_models():
            if model._meta.proxy or not model._meta.managed:
                continue

            for field in relation_fields_to(model, Branch):
                branch_fk_contracts.append((model, field))

            for field in relation_fields_to(model, Company):
                company_fk_contracts.append((model, field))

            for field in relation_fields_to(model, User):
                user_fk_contracts.append((model, field))

        branch_models = defaultdict(list)
        company_models = defaultdict(list)

        for model, field in branch_fk_contracts:
            branch_models[model].append(field)

        for model, field in company_fk_contracts:
            company_models[model].append(field)

        dual_scope_models = sorted(
            set(branch_models) & set(company_models),
            key=model_label,
        )

        lines.extend(
            [
                "",
                "===== DEPENDENCY CONTRACT INVENTORY =====",
                f"BRANCH_FK_CONTRACT_COUNT={len(branch_fk_contracts)}",
                f"COMPANY_FK_CONTRACT_COUNT={len(company_fk_contracts)}",
                f"USER_FK_CONTRACT_COUNT={len(user_fk_contracts)}",
                f"DUAL_SCOPE_MODEL_COUNT={len(dual_scope_models)}",
                "BRANCH_FK_CONTRACTS_BEGIN",
            ]
        )

        for model, field in sorted(
            branch_fk_contracts,
            key=lambda x: (model_label(x[0]), x[1].name),
        ):
            lines.append(
                f"{model_label(model)}.{field.name}"
                f" | on_delete={on_delete_name(field)}"
            )

        lines.append("BRANCH_FK_CONTRACTS_END")
        lines.append("COMPANY_FK_CONTRACTS_BEGIN")

        for model, field in sorted(
            company_fk_contracts,
            key=lambda x: (model_label(x[0]), x[1].name),
        ):
            lines.append(
                f"{model_label(model)}.{field.name}"
                f" | on_delete={on_delete_name(field)}"
            )

        lines.append("COMPANY_FK_CONTRACTS_END")

        print(
            f"[A5] 4/8 Counting {len(branch_fk_contracts)} Branch-linked contracts...",
            flush=True,
        )

        branch_counts: dict[
            int, list[tuple[str, str, str, int]]
        ] = defaultdict(list)
        company_counts: dict[
            int, list[tuple[str, str, str, int]]
        ] = defaultdict(list)

        query_errors: list[str] = []

        sorted_branch_contracts = sorted(
            branch_fk_contracts,
            key=lambda x: (model_label(x[0]), x[1].name),
        )

        for index, (model, field) in enumerate(
            sorted_branch_contracts,
            start=1,
        ):
            key = f"{model_label(model)}.{field.name}"
            print(
                f"[A5]   Branch [{index}/{len(sorted_branch_contracts)}] {key}",
                flush=True,
            )

            try:
                rows = list(
                    model._default_manager.filter(
                        **{f"{field.name}_id__in": target_branch_ids}
                    )
                    .values(f"{field.name}_id")
                    .annotate(n=Count("pk"))
                    .order_by()
                )

                for row in rows:
                    branch_id = int(row[f"{field.name}_id"])
                    branch_counts[branch_id].append(
                        (
                            model_label(model),
                            field.name,
                            on_delete_name(field),
                            int(row["n"]),
                        )
                    )
            except Exception as exc:
                query_errors.append(
                    f"BRANCH_COUNT {key}: "
                    f"{type(exc).__name__}: {clean(exc)}"
                )
                reset_readonly_connection(connection)

        print(
            f"[A5] 5/8 Counting {len(company_fk_contracts)} Company-linked contracts...",
            flush=True,
        )

        sorted_company_contracts = sorted(
            company_fk_contracts,
            key=lambda x: (model_label(x[0]), x[1].name),
        )

        for index, (model, field) in enumerate(
            sorted_company_contracts,
            start=1,
        ):
            key = f"{model_label(model)}.{field.name}"
            print(
                f"[A5]   Company [{index}/{len(sorted_company_contracts)}] {key}",
                flush=True,
            )

            try:
                rows = list(
                    model._default_manager.filter(
                        **{f"{field.name}_id__in": target_company_ids}
                    )
                    .values(f"{field.name}_id")
                    .annotate(n=Count("pk"))
                    .order_by()
                )

                for row in rows:
                    company_id = int(row[f"{field.name}_id"])
                    company_counts[company_id].append(
                        (
                            model_label(model),
                            field.name,
                            on_delete_name(field),
                            int(row["n"]),
                        )
                    )
            except Exception as exc:
                query_errors.append(
                    f"COMPANY_COUNT {key}: "
                    f"{type(exc).__name__}: {clean(exc)}"
                )
                reset_readonly_connection(connection)

        print("[A5] 6/8 Checking dual-scope integrity and users...", flush=True)

        dual_scope_mismatches: list[str] = []
        dual_scope_query_errors: list[str] = []

        for model in dual_scope_models:
            for branch_field in branch_models[model]:
                for company_field in company_models[model]:
                    key = (
                        f"{model_label(model)}"
                        f" branch={branch_field.name}"
                        f" company={company_field.name}"
                    )

                    try:
                        mismatch_count = (
                            model._default_manager.filter(
                                **{
                                    f"{branch_field.name}_id__in":
                                    target_branch_ids
                                }
                            )
                            .exclude(
                                **{
                                    f"{company_field.name}_id":
                                    F(f"{branch_field.name}__company_id")
                                }
                            )
                            .count()
                        )

                        if mismatch_count:
                            dual_scope_mismatches.append(
                                f"{key} mismatch_count={mismatch_count}"
                            )
                    except Exception as exc:
                        dual_scope_query_errors.append(
                            f"{key}: {type(exc).__name__}: {clean(exc)}"
                        )
                        reset_readonly_connection(connection)

        memberships = list(
            CompanyMembership.objects.filter(
                company_id__in=target_company_ids
            )
            .select_related("user", "company")
            .order_by("company_id", "id")
        )

        policies = {
            int(policy.membership_id): policy
            for policy in CompanyMembershipBranchPolicy.objects.filter(
                membership_id__in=[m.id for m in memberships]
            ).select_related(
                "membership",
                "default_branch",
                "last_active_branch",
            )
        }

        grants_by_policy: dict[int, list[Any]] = defaultdict(list)

        for grant in (
            CompanyMembershipBranchGrant.objects.filter(
                policy_id__in=[p.id for p in policies.values()]
            )
            .select_related("branch")
            .order_by("policy_id", "branch_id")
        ):
            grants_by_policy[int(grant.policy_id)].append(grant)

        membership_by_company: dict[int, list[Any]] = defaultdict(list)
        for membership in memberships:
            membership_by_company[int(membership.company_id)].append(
                membership
            )

        scoped_user_ids = sorted(
            {int(m.user_id) for m in memberships}
        )

        outside_memberships_by_user: dict[int, int] = defaultdict(int)

        for row in (
            CompanyMembership.objects.filter(user_id__in=scoped_user_ids)
            .exclude(company_id__in=target_company_ids)
            .values("user_id")
            .annotate(n=Count("pk"))
            .order_by()
        ):
            outside_memberships_by_user[int(row["user_id"])] = int(row["n"])

        # Global FK reference counts for User rows. This is advisory only.
        user_ref_counts: dict[int, list[tuple[str, str, str, int]]] = defaultdict(list)

        sorted_user_contracts = sorted(
            user_fk_contracts,
            key=lambda x: (model_label(x[0]), x[1].name),
        )

        for model, field in sorted_user_contracts:
            key = f"{model_label(model)}.{field.name}"

            try:
                rows = list(
                    model._default_manager.filter(
                        **{f"{field.name}_id__in": scoped_user_ids}
                    )
                    .values(f"{field.name}_id")
                    .annotate(n=Count("pk"))
                    .order_by()
                )

                for row in rows:
                    uid = int(row[f"{field.name}_id"])
                    user_ref_counts[uid].append(
                        (
                            model_label(model),
                            field.name,
                            on_delete_name(field),
                            int(row["n"]),
                        )
                    )
            except Exception as exc:
                query_errors.append(
                    f"USER_COUNT {key}: "
                    f"{type(exc).__name__}: {clean(exc)}"
                )
                reset_readonly_connection(connection)

        cfg_by_legacy = {
            clean(row["legacy_company_id"]): row
            for row in companies_cfg
        }

        # Build current branch -> output group for SPLIT companies.
        group_by_current_branch: dict[
            tuple[str, int], str
        ] = {}

        keep_branch_ids_by_company: dict[str, set[int]] = defaultdict(set)
        excluded_branch_ids_by_company: dict[str, set[int]] = defaultdict(set)

        for legacy_company_id, cfg in cfg_by_legacy.items():
            mode = clean(cfg.get("mode"))

            if mode == "SPLIT":
                for group in cfg.get("output_groups") or []:
                    group_id = clean(group.get("group_id"))

                    for branch_row in group.get("branches") or []:
                        legacy_branch_id = clean(
                            branch_row.get("legacy_branch_id")
                        )
                        current_branch_id = branch_current_by_pair.get(
                            (legacy_company_id, legacy_branch_id)
                        )

                        if current_branch_id:
                            group_by_current_branch[
                                (
                                    legacy_company_id,
                                    current_branch_id,
                                )
                            ] = group_id

            elif mode == "PARTIAL_INCLUDE":
                for branch_row in cfg.get("kept_branches") or []:
                    legacy_branch_id = clean(
                        branch_row.get("legacy_branch_id")
                    )
                    current_branch_id = branch_current_by_pair.get(
                        (legacy_company_id, legacy_branch_id)
                    )

                    if current_branch_id:
                        keep_branch_ids_by_company[
                            legacy_company_id
                        ].add(current_branch_id)

                for branch_row in cfg.get("excluded_branches") or []:
                    legacy_branch_id = clean(
                        branch_row.get("legacy_branch_id")
                    )
                    current_branch_id = branch_current_by_pair.get(
                        (legacy_company_id, legacy_branch_id)
                    )

                    if current_branch_id:
                        excluded_branch_ids_by_company[
                            legacy_company_id
                        ].add(current_branch_id)

        membership_plan_rows: list[dict[str, Any]] = []
        unresolved_memberships: list[str] = []
        exclusive_user_candidates: set[int] = set()
        shared_users: set[int] = set()

        lines.extend(
            [
                "",
                "=" * 120,
                "PER-COMPANY DEPENDENCY & MEMBERSHIP PLAN",
                "=" * 120,
            ]
        )

        mode_order = {
            "SPLIT": 0,
            "PARTIAL_INCLUDE": 1,
            "EXCLUDE": 2,
        }

        for legacy_company_id in sorted(
            legacy_company_ids,
            key=lambda lcid: (
                mode_order.get(
                    clean(cfg_by_legacy[lcid].get("mode")),
                    9,
                ),
                nkey(lcid),
            ),
        ):
            cfg = cfg_by_legacy[legacy_company_id]
            mode = clean(cfg.get("mode"))
            company_id = company_id_by_legacy[legacy_company_id]
            company = companies.get(company_id)

            source_branch_ids = sorted(
                branch_id
                for (
                    mapped_legacy_company_id,
                    _legacy_branch_id,
                ), branch_id in branch_current_by_pair.items()
                if mapped_legacy_company_id == legacy_company_id
            )

            lines.extend(
                [
                    "",
                    "-" * 120,
                    f"COMPANY legacy_id={legacy_company_id}"
                    f" | current_id={company_id}"
                    f" | name={clean(company.name if company else '')}"
                    f" | mode={mode}",
                    f"SOURCE_BRANCH_COUNT={len(source_branch_ids)}",
                ]
            )

            # Branch scoped dependency totals.
            branch_total = 0
            blocker_total = 0

            for branch_id in source_branch_ids:
                branch = branches.get(branch_id)
                pair = legacy_pair_by_current_branch.get(branch_id)
                legacy_branch_id = pair[1] if pair else ""

                lines.append(
                    f"BRANCH legacy_id={legacy_branch_id}"
                    f" | current_id={branch_id}"
                    f" | name={clean(branch.name if branch else '')}"
                    f" | active={yesno(branch.is_active) if branch else ''}"
                )

                records = sorted(
                    branch_counts.get(branch_id, []),
                    key=lambda x: (x[0], x[1]),
                )

                if not records:
                    lines.append("  BRANCH_DEPENDENCIES=NONE_DETECTED")
                else:
                    for (
                        model_name,
                        field_name,
                        on_delete,
                        count,
                    ) in records:
                        branch_total += count

                        if on_delete in {
                            "PROTECT",
                            "RESTRICT",
                            "DO_NOTHING",
                        }:
                            blocker_total += count

                        lines.append(
                            f"  BRANCH_DEP {model_name}.{field_name}"
                            f" | count={count}"
                            f" | on_delete={on_delete}"
                        )

            lines.append(
                f"BRANCH_DEPENDENCY_ROW_TOTAL={branch_total}"
            )
            lines.append(
                f"BRANCH_BLOCKING_RELATION_ROW_TOTAL={blocker_total}"
            )

            # Company scoped records, classified by whether model also has Branch FK.
            company_only_total = 0
            dual_scope_total = 0
            company_blocker_total = 0

            company_records = sorted(
                company_counts.get(company_id, []),
                key=lambda x: (x[0], x[1]),
            )

            lines.append("COMPANY_DEPENDENCIES_BEGIN")

            if not company_records:
                lines.append("COMPANY_DEPENDENCIES=NONE_DETECTED")

            for (
                model_name,
                field_name,
                on_delete,
                count,
            ) in company_records:
                model_obj = next(
                    (
                        model
                        for model in apps.get_models()
                        if model_label(model) == model_name
                    ),
                    None,
                )

                has_branch_scope = (
                    model_obj in branch_models
                    if model_obj is not None
                    else False
                )

                classification = (
                    "DUAL_SCOPE_BRANCH_AND_COMPANY"
                    if has_branch_scope
                    else "COMPANY_ONLY_REQUIRES_POLICY"
                )

                if has_branch_scope:
                    dual_scope_total += count
                else:
                    company_only_total += count

                if on_delete in {
                    "PROTECT",
                    "RESTRICT",
                    "DO_NOTHING",
                }:
                    company_blocker_total += count

                lines.append(
                    f"COMPANY_DEP {model_name}.{field_name}"
                    f" | count={count}"
                    f" | on_delete={on_delete}"
                    f" | classification={classification}"
                )

            lines.append("COMPANY_DEPENDENCIES_END")
            lines.append(
                f"COMPANY_ONLY_REQUIRES_POLICY_ROW_TOTAL={company_only_total}"
            )
            lines.append(
                f"DUAL_SCOPE_ROW_TOTAL={dual_scope_total}"
            )
            lines.append(
                f"COMPANY_BLOCKING_RELATION_ROW_TOTAL={company_blocker_total}"
            )

            # Membership action plan.
            lines.append("MEMBERSHIP_PLAN_BEGIN")

            for membership in membership_by_company.get(
                company_id,
                [],
            ):
                user = membership.user
                user_id = int(membership.user_id)
                policy = policies.get(int(membership.id))
                outside_count = outside_memberships_by_user.get(
                    user_id,
                    0,
                )

                if outside_count > 0:
                    shared_users.add(user_id)
                else:
                    exclusive_user_candidates.add(user_id)

                current_mode = (
                    clean(policy.mode)
                    if policy is not None
                    else "MISSING_POLICY"
                )

                grant_branch_ids = set()

                if policy is not None:
                    grant_branch_ids = {
                        int(grant.branch_id)
                        for grant in grants_by_policy.get(
                            int(policy.id),
                            [],
                        )
                    }

                action = ""
                targets: list[str] = []

                if mode == "SPLIT":
                    if current_mode == clean(BranchAccessMode.ALL):
                        targets = sorted(
                            {
                                group_id
                                for (
                                    mapped_legacy_company_id,
                                    _branch_id,
                                ), group_id in group_by_current_branch.items()
                                if mapped_legacy_company_id
                                == legacy_company_id
                            }
                        )
                        action = "CLONE_MEMBERSHIP_TO_ALL_OUTPUT_COMPANIES"

                    elif current_mode == clean(
                        BranchAccessMode.RESTRICTED
                    ):
                        targets = sorted(
                            {
                                group_by_current_branch[
                                    (
                                        legacy_company_id,
                                        branch_id,
                                    )
                                ]
                                for branch_id in grant_branch_ids
                                if (
                                    legacy_company_id,
                                    branch_id,
                                )
                                in group_by_current_branch
                            }
                        )
                        action = (
                            "CLONE_MEMBERSHIP_TO_INTERSECTING_OUTPUT_COMPANIES"
                        )

                    elif current_mode == clean(
                        BranchAccessMode.LEGACY_UNRESOLVED
                    ):
                        action = (
                            "NO_AUTOMATIC_OUTPUT_MEMBERSHIP_FAIL_CLOSED"
                        )
                        unresolved_memberships.append(
                            f"company={legacy_company_id}"
                            f"|membership={membership.id}"
                            f"|user={user_id}"
                        )
                    else:
                        action = "REVIEW_MISSING_OR_UNKNOWN_POLICY"

                elif mode == "EXCLUDE":
                    action = "DELETE_MEMBERSHIP_WITH_SOURCE_COMPANY"

                elif mode == "PARTIAL_INCLUDE":
                    keep_ids = keep_branch_ids_by_company[
                        legacy_company_id
                    ]
                    exclude_ids = excluded_branch_ids_by_company[
                        legacy_company_id
                    ]

                    if current_mode == clean(BranchAccessMode.ALL):
                        action = (
                            "KEEP_MEMBERSHIP_ALL_ON_SURVIVING_COMPANY"
                        )
                        targets = ["SOURCE_COMPANY_SURVIVES"]

                    elif current_mode == clean(
                        BranchAccessMode.RESTRICTED
                    ):
                        keep_grants = sorted(
                            grant_branch_ids & keep_ids
                        )
                        excluded_grants = sorted(
                            grant_branch_ids & exclude_ids
                        )

                        if keep_grants:
                            action = (
                                "KEEP_MEMBERSHIP_REMOVE_EXCLUDED_GRANTS"
                            )
                            targets = [
                                f"KEEP_BRANCH:{branch_id}"
                                for branch_id in keep_grants
                            ]
                        elif excluded_grants:
                            action = (
                                "REMOVE_MEMBERSHIP_AFTER_EXCLUDED_BRANCH_PURGE"
                            )
                        else:
                            action = (
                                "REVIEW_RESTRICTED_WITH_NO_DECISION_BRANCH_GRANTS"
                            )

                    elif current_mode == clean(
                        BranchAccessMode.LEGACY_UNRESOLVED
                    ):
                        action = (
                            "KEEP_MEMBERSHIP_FAIL_CLOSED_ON_SURVIVING_COMPANY"
                        )
                        unresolved_memberships.append(
                            f"company={legacy_company_id}"
                            f"|membership={membership.id}"
                            f"|user={user_id}"
                        )
                    else:
                        action = "REVIEW_MISSING_OR_UNKNOWN_POLICY"

                membership_plan_rows.append(
                    {
                        "legacy_company_id": legacy_company_id,
                        "membership_id": int(membership.id),
                        "user_id": user_id,
                        "policy_mode": current_mode,
                        "action": action,
                        "targets": targets,
                        "outside_memberships": outside_count,
                    }
                )

                lines.append(
                    f"MEMBERSHIP id={membership.id}"
                    f" | user_id={user_id}"
                    f" | username={clean(getattr(user,'username',''))}"
                    f" | primary={yesno(membership.is_primary)}"
                    f" | mode={current_mode}"
                    f" | grant_branch_ids={sorted(grant_branch_ids)}"
                    f" | outside_memberships={outside_count}"
                    f" | user_shared_elsewhere={yesno(outside_count > 0)}"
                    f" | action={action}"
                    f" | targets={targets}"
                )

            lines.append("MEMBERSHIP_PLAN_END")

        # Exclusive user candidate reference audit.
        lines.extend(
            [
                "",
                "=" * 120,
                "USER DELETE CANDIDATE SAFETY",
                "=" * 120,
            ]
        )

        exclusive_only_users = sorted(
            exclusive_user_candidates - shared_users
        )

        for user_id in exclusive_only_users:
            refs = sorted(
                user_ref_counts.get(user_id, []),
                key=lambda x: (x[0], x[1]),
            )

            lines.append(
                f"USER_CANDIDATE current_user_id={user_id}"
                f" | outside_company_memberships=0"
                f" | global_fk_contracts_with_rows={len(refs)}"
            )

            for (
                model_name,
                field_name,
                on_delete,
                count,
            ) in refs:
                lines.append(
                    f"  USER_REF {model_name}.{field_name}"
                    f" | count={count}"
                    f" | on_delete={on_delete}"
                )

        print("[A5] 7/8 Building final safety summary...", flush=True)

        blocking_branch_contracts = sorted(
            {
                f"{model_name}.{field_name}:{on_delete}"
                for records in branch_counts.values()
                for model_name, field_name, on_delete, count in records
                if count
                and on_delete in {
                    "PROTECT",
                    "RESTRICT",
                    "DO_NOTHING",
                }
            }
        )

        blocking_company_contracts = sorted(
            {
                f"{model_name}.{field_name}:{on_delete}"
                for records in company_counts.values()
                for model_name, field_name, on_delete, count in records
                if count
                and on_delete in {
                    "PROTECT",
                    "RESTRICT",
                    "DO_NOTHING",
                }
            }
        )

        lines.extend(
            [
                "",
                "=" * 120,
                "A5 FINAL SAFETY SUMMARY",
                "=" * 120,
                f"DECISION_MAP_SHA256={actual_sha}",
                f"SCOPED_COMPANIES={len(legacy_company_ids)}",
                f"SCOPED_BRANCHES={len(target_branch_ids)}",
                f"BRANCH_FK_CONTRACTS={len(branch_fk_contracts)}",
                f"COMPANY_FK_CONTRACTS={len(company_fk_contracts)}",
                f"USER_FK_CONTRACTS={len(user_fk_contracts)}",
                f"DUAL_SCOPE_MODELS={len(dual_scope_models)}",
                f"DUAL_SCOPE_MISMATCH_COUNT={len(dual_scope_mismatches)}",
                f"DUAL_SCOPE_QUERY_ERROR_COUNT={len(dual_scope_query_errors)}",
                f"DEPENDENCY_QUERY_ERROR_COUNT={len(query_errors)}",
                f"BLOCKING_BRANCH_CONTRACT_COUNT={len(blocking_branch_contracts)}",
                f"BLOCKING_COMPANY_CONTRACT_COUNT={len(blocking_company_contracts)}",
                f"MEMBERSHIP_PLAN_ROWS={len(membership_plan_rows)}",
                f"UNRESOLVED_MEMBERSHIP_COUNT={len(unresolved_memberships)}",
                f"SHARED_USER_COUNT={len(shared_users)}",
                f"EXCLUSIVE_USER_CANDIDATE_COUNT={len(exclusive_only_users)}",
            ]
        )

        if dual_scope_mismatches:
            lines.append("DUAL_SCOPE_MISMATCHES_BEGIN")
            lines.extend(dual_scope_mismatches)
            lines.append("DUAL_SCOPE_MISMATCHES_END")

        if dual_scope_query_errors:
            lines.append("DUAL_SCOPE_QUERY_ERRORS_BEGIN")
            lines.extend(dual_scope_query_errors)
            lines.append("DUAL_SCOPE_QUERY_ERRORS_END")

        if query_errors:
            lines.append("DEPENDENCY_QUERY_ERRORS_BEGIN")
            lines.extend(query_errors)
            lines.append("DEPENDENCY_QUERY_ERRORS_END")

        if blocking_branch_contracts:
            lines.append("BLOCKING_BRANCH_CONTRACTS_BEGIN")
            lines.extend(blocking_branch_contracts)
            lines.append("BLOCKING_BRANCH_CONTRACTS_END")

        if blocking_company_contracts:
            lines.append("BLOCKING_COMPANY_CONTRACTS_BEGIN")
            lines.extend(blocking_company_contracts)
            lines.append("BLOCKING_COMPANY_CONTRACTS_END")

        if unresolved_memberships:
            lines.append("UNRESOLVED_MEMBERSHIPS_BEGIN")
            lines.extend(unresolved_memberships)
            lines.append("UNRESOLVED_MEMBERSHIPS_END")

        # PASS here means the audit completed consistently. Blockers are findings,
        # not failures. Query errors or integrity mismatches require review.
        result = (
            "PASS"
            if not dual_scope_mismatches
            and not dual_scope_query_errors
            and not query_errors
            else "REVIEW_REQUIRED"
        )

        lines.extend(
            [
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
                f"A5_RESULT={result}",
                "=" * 120,
            ]
        )

        print("[A5] 8/8 Writing report...", flush=True)

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A5 =====")
        print(f"A5_RESULT={result}")
        print(f"SCOPED_COMPANIES={len(legacy_company_ids)}")
        print(f"SCOPED_BRANCHES={len(target_branch_ids)}")
        print(f"BRANCH_FK_CONTRACTS={len(branch_fk_contracts)}")
        print(f"COMPANY_FK_CONTRACTS={len(company_fk_contracts)}")
        print(f"DUAL_SCOPE_MISMATCH_COUNT={len(dual_scope_mismatches)}")
        print(f"DEPENDENCY_QUERY_ERROR_COUNT={len(query_errors)}")
        print(f"UNRESOLVED_MEMBERSHIP_COUNT={len(unresolved_memberships)}")
        print(f"SHARED_USER_COUNT={len(shared_users)}")
        print(
            f"EXCLUSIVE_USER_CANDIDATE_COUNT={len(exclusive_only_users)}"
        )
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend(
            [
                "",
                "A5_RESULT=INTERRUPTED",
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
            ]
        )
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA5_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend(
            [
                "",
                "=" * 120,
                "A5_RESULT=FAIL",
                f"ERROR_TYPE={type(exc).__name__}",
                f"ERROR={clean(exc)}",
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
                "=" * 120,
            ]
        )

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        digest = hashlib.sha256(
            REPORT.read_bytes()
        ).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A5 =====")
        print("A5_RESULT=FAIL")
        print(f"ERROR={type(exc).__name__}: {exc}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 2


if __name__ == "__main__":
    raise SystemExit(main())

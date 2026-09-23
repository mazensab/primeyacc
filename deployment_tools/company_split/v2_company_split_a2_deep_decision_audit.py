#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
REPORT = ROOT / "v2_company_split_a2_deep_decision_audit.txt"
SOURCE_SYSTEM = "mhamcloud_v1"
SOURCE_CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"

# Frozen from A1. A2 must reconcile to exactly this set before producing decision data.
EXPECTED_THREE_PLUS_LEGACY_IDS = {
    "188", "478", "88", "195", "556", "473", "113", "431",
    "174", "290", "307", "429", "119", "75", "76", "299",
}


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def natural_key(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def bool_text(value: Any) -> str:
    if value is None:
        return ""
    return "YES" if bool(value) else "NO"


def date_text(value: Any) -> str:
    if value in (None, ""):
        return ""
    try:
        return value.isoformat()
    except Exception:
        return clean(value)


def run_git(*args: str) -> str:
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
    raw = (ROOT / "manage.py").read_text(encoding="utf-8", errors="replace")
    match = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not match:
        raise RuntimeError("Cannot detect DJANGO_SETTINGS_MODULE")
    return match.group(1)


def first_attr(obj: Any, names: tuple[str, ...], default: Any = "") -> Any:
    if obj is None:
        return default
    for name in names:
        if hasattr(obj, name):
            try:
                value = getattr(obj, name)
            except Exception:
                continue
            if value not in (None, ""):
                return value
    return default


def relation_fields_to(model, target_model):
    result = []
    for field in model._meta.get_fields():
        if not getattr(field, "concrete", False):
            continue
        remote = getattr(field, "remote_field", None)
        related = getattr(remote, "model", None) if remote else None
        if related is target_model and getattr(field, "many_to_one", False):
            result.append(field)
        elif related is target_model and getattr(field, "one_to_one", False):
            result.append(field)
    return result


def m2m_fields_to(model, target_model):
    result = []
    for field in model._meta.get_fields():
        if not getattr(field, "many_to_many", False):
            continue
        remote = getattr(field, "remote_field", None)
        related = getattr(remote, "model", None) if remote else None
        if related is target_model:
            result.append(field)
    return result


def model_label(model) -> str:
    return f"{model._meta.app_label}.{model.__name__}"


def cache_collection_counts(obj: Any, prefix: str = "$", depth: int = 0) -> list[str]:
    out: list[str] = []
    if depth > 3:
        return out
    if isinstance(obj, dict):
        for key in sorted(obj.keys(), key=str):
            value = obj[key]
            path = f"{prefix}.{key}"
            if isinstance(value, list):
                out.append(f"{path}=LIST[{len(value)}]")
            elif isinstance(value, dict):
                out.append(f"{path}=DICT[{len(value)}]")
                out.extend(cache_collection_counts(value, path, depth + 1))
    return out


def subscription_candidate(sub, sub_map, today: date):
    metadata = dict(getattr(sub_map, "metadata", {}) or {}) if sub_map else {}
    migration_current = metadata.get("migration_current")
    status = clean(getattr(sub, "status", "")).upper()
    start = getattr(sub, "start_date", None)
    end = getattr(sub, "end_date", None)
    date_current = (
        status in {"ACTIVE", "TRIAL", "TRIALING", "GRACE", "CURRENT", "PAID"}
        and (start is None or start <= today)
        and (end is None or end >= today)
    )
    return migration_current is True, date_current


def main() -> int:
    lines: list[str] = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A2 DEEP READ-ONLY DECISION AUDIT",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "SOURCE_CACHE_WRITE=0",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={run_git('branch', '--show-current')}",
        f"HEAD={run_git('rev-parse', 'HEAD')}",
        f"ORIGIN_MAIN={run_git('rev-parse', 'origin/main')}",
    ]

    tracked = run_git("status", "--short", "--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not tracked else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        if not (ROOT / "manage.py").exists():
            raise RuntimeError("Run from the PrimeyAcc project root")

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.contrib.auth import get_user_model
        from django.db import connection, transaction
        from django.db.models import Count

        Company = apps.get_model("companies", "Company")
        Branch = apps.get_model("companies", "Branch")
        Membership = apps.get_model("accounts", "CompanyMembership")
        CompanySubscription = apps.get_model("subscriptions", "CompanySubscription")
        LegacyObjectMap = apps.get_model("business_controls", "LegacyObjectMap")
        User = get_user_model()

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Safety stop: expected PostgreSQL, got {connection.vendor}")

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SET TRANSACTION READ ONLY")

            all_maps = LegacyObjectMap.objects.filter(source_system=SOURCE_SYSTEM)

            company_maps = list(
                all_maps.filter(source_table="business")
                .select_related("company", "target_content_type")
                .order_by("legacy_id")
            )
            branch_maps = list(
                all_maps.filter(source_table="business_locations")
                .select_related("company", "target_content_type")
                .order_by("legacy_company_id", "legacy_id")
            )
            user_maps = list(
                all_maps.filter(source_table="users")
                .select_related("target_content_type")
                .order_by("legacy_company_id", "legacy_id")
            )
            subscription_maps = list(
                all_maps.filter(source_table="subscriptions")
                .select_related("target_content_type")
                .order_by("legacy_company_id", "legacy_id")
            )

            company_map_by_legacy = {clean(m.legacy_id): m for m in company_maps}
            branches_by_legacy_company: dict[str, list[Any]] = defaultdict(list)
            users_by_legacy_company: dict[str, list[Any]] = defaultdict(list)
            subs_by_legacy_company: dict[str, list[Any]] = defaultdict(list)

            for m in branch_maps:
                branches_by_legacy_company[clean(m.legacy_company_id)].append(m)
            for m in user_maps:
                users_by_legacy_company[clean(m.legacy_company_id)].append(m)
            for m in subscription_maps:
                subs_by_legacy_company[clean(m.legacy_company_id)].append(m)

            derived_three_plus = {
                legacy_id
                for legacy_id in company_map_by_legacy
                if len(branches_by_legacy_company.get(legacy_id, [])) >= 3
            }

            lines.extend(
                [
                    f"DJANGO_SETTINGS_MODULE={os.environ['DJANGO_SETTINGS_MODULE']}",
                    f"DEFAULT_DB_VENDOR={connection.vendor}",
                    "",
                    "===== A1 FREEZE RECONCILIATION =====",
                    f"EXPECTED_THREE_PLUS_COUNT={len(EXPECTED_THREE_PLUS_LEGACY_IDS)}",
                    f"DERIVED_THREE_PLUS_COUNT={len(derived_three_plus)}",
                    f"EXPECTED_IDS={','.join(sorted(EXPECTED_THREE_PLUS_LEGACY_IDS, key=natural_key))}",
                    f"DERIVED_IDS={','.join(sorted(derived_three_plus, key=natural_key))}",
                ]
            )

            if derived_three_plus != EXPECTED_THREE_PLUS_LEGACY_IDS:
                missing = sorted(EXPECTED_THREE_PLUS_LEGACY_IDS - derived_three_plus, key=natural_key)
                extra = sorted(derived_three_plus - EXPECTED_THREE_PLUS_LEGACY_IDS, key=natural_key)
                raise RuntimeError(
                    f"A1/A2 scope mismatch. missing={missing} extra={extra}"
                )

            current_company_id_by_legacy: dict[str, int] = {}
            current_branch_id_by_legacy: dict[str, int] = {}
            current_user_id_by_legacy_pair: dict[tuple[str, str], int] = {}

            for legacy_id in EXPECTED_THREE_PLUS_LEGACY_IDS:
                m = company_map_by_legacy[legacy_id]
                raw = clean(m.target_object_id) or clean(m.company_id)
                if not raw.isdigit():
                    raise RuntimeError(f"Company target missing for legacy company {legacy_id}")
                current_company_id_by_legacy[legacy_id] = int(raw)

            for legacy_company_id in EXPECTED_THREE_PLUS_LEGACY_IDS:
                for m in branches_by_legacy_company[legacy_company_id]:
                    raw = clean(m.target_object_id)
                    if raw.isdigit():
                        current_branch_id_by_legacy[clean(m.legacy_id)] = int(raw)

                for m in users_by_legacy_company[legacy_company_id]:
                    raw = clean(m.target_object_id)
                    if raw.isdigit():
                        current_user_id_by_legacy_pair[
                            (legacy_company_id, clean(m.legacy_id))
                        ] = int(raw)

            target_company_ids = list(current_company_id_by_legacy.values())
            target_branch_ids = list(current_branch_id_by_legacy.values())
            target_user_ids = list(current_user_id_by_legacy_pair.values())

            company_objects = Company.objects.in_bulk(target_company_ids)
            branch_objects = Branch.objects.in_bulk(target_branch_ids)
            user_objects = User.objects.in_bulk(target_user_ids)

            memberships = list(
                Membership.objects.filter(company_id__in=target_company_ids)
                .select_related("user", "company", "role")
                .order_by("company_id", "id")
            )
            memberships_by_company: dict[int, list[Any]] = defaultdict(list)
            for membership in memberships:
                memberships_by_company[int(membership.company_id)].append(membership)

            subscription_rows = list(
                CompanySubscription.objects.filter(company_id__in=target_company_ids)
                .select_related("plan")
                .order_by("company_id", "start_date", "id")
            )
            subscriptions_by_company: dict[int, list[Any]] = defaultdict(list)
            for sub in subscription_rows:
                subscriptions_by_company[int(sub.company_id)].append(sub)

            subscription_map_by_target: dict[tuple[str, str], Any] = {}
            for legacy_company_id, maps in subs_by_legacy_company.items():
                for m in maps:
                    subscription_map_by_target[
                        (legacy_company_id, clean(m.target_object_id))
                    ] = m

            # Discover relational contracts dynamically.
            branch_fk_contracts: list[tuple[Any, Any]] = []
            company_fk_contracts: list[tuple[Any, Any]] = []
            access_fk_contracts: list[tuple[Any, Any, Any | None, Any | None]] = []
            access_m2m_contracts: list[tuple[Any, Any, str]] = []
            relation_errors: list[str] = []

            for model in apps.get_models():
                if model._meta.proxy or not model._meta.managed:
                    continue

                branch_fields = relation_fields_to(model, Branch)
                company_fields = relation_fields_to(model, Company)
                membership_fields = relation_fields_to(model, Membership)
                user_fields = relation_fields_to(model, User)

                for field in branch_fields:
                    branch_fk_contracts.append((model, field))
                for field in company_fields:
                    company_fk_contracts.append((model, field))

                if branch_fields and (membership_fields or user_fields):
                    for bfield in branch_fields:
                        if membership_fields:
                            for mfield in membership_fields:
                                access_fk_contracts.append((model, bfield, mfield, None))
                        if user_fields:
                            for ufield in user_fields:
                                access_fk_contracts.append((model, bfield, None, ufield))

                for field in m2m_fields_to(model, Branch):
                    if model is Membership:
                        access_m2m_contracts.append((model, field, "membership"))
                    elif model is User:
                        access_m2m_contracts.append((model, field, "user"))

            lines.extend(
                [
                    "",
                    "===== DYNAMIC BRANCH CONTRACT DISCOVERY =====",
                    f"BRANCH_FK_CONTRACT_COUNT={len(branch_fk_contracts)}",
                    f"COMPANY_FK_CONTRACT_COUNT={len(company_fk_contracts)}",
                    f"ACCESS_FK_CONTRACT_COUNT={len(access_fk_contracts)}",
                    f"ACCESS_M2M_CONTRACT_COUNT={len(access_m2m_contracts)}",
                    "BRANCH_FK_CONTRACTS_BEGIN",
                ]
            )
            for model, field in sorted(
                branch_fk_contracts, key=lambda x: (model_label(x[0]), x[1].name)
            ):
                lines.append(f"{model_label(model)}.{field.name}")
            lines.append("BRANCH_FK_CONTRACTS_END")

            lines.append("ACCESS_CONTRACTS_BEGIN")
            for model, bfield, mfield, ufield in sorted(
                access_fk_contracts,
                key=lambda x: (
                    model_label(x[0]),
                    x[1].name,
                    x[2].name if x[2] else "",
                    x[3].name if x[3] else "",
                ),
            ):
                lines.append(
                    f"{model_label(model)}"
                    f" branch_field={bfield.name}"
                    f" membership_field={mfield.name if mfield else ''}"
                    f" user_field={ufield.name if ufield else ''}"
                )
            for model, field, owner_kind in access_m2m_contracts:
                lines.append(
                    f"{model_label(model)} M2M field={field.name} owner={owner_kind}"
                )
            lines.append("ACCESS_CONTRACTS_END")

            # Aggregate all direct Branch FK counts in batches.
            branch_model_counts: dict[int, list[tuple[str, str, int]]] = defaultdict(list)
            for model, field in branch_fk_contracts:
                try:
                    rows = (
                        model._default_manager.filter(
                            **{f"{field.name}_id__in": target_branch_ids}
                        )
                        .values(f"{field.name}_id")
                        .annotate(n=Count("pk"))
                        .order_by()
                    )
                    for row in rows:
                        branch_id = int(row[f"{field.name}_id"])
                        branch_model_counts[branch_id].append(
                            (model_label(model), field.name, int(row["n"]))
                        )
                except Exception as exc:
                    relation_errors.append(
                        f"BRANCH_COUNT_ERROR {model_label(model)}.{field.name}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )

            # Aggregate Company FK counts to identify shared/company-level records.
            company_model_counts: dict[int, list[tuple[str, str, int]]] = defaultdict(list)
            for model, field in company_fk_contracts:
                if model is Company:
                    continue
                try:
                    rows = (
                        model._default_manager.filter(
                            **{f"{field.name}_id__in": target_company_ids}
                        )
                        .values(f"{field.name}_id")
                        .annotate(n=Count("pk"))
                        .order_by()
                    )
                    for row in rows:
                        company_id = int(row[f"{field.name}_id"])
                        company_model_counts[company_id].append(
                            (model_label(model), field.name, int(row["n"]))
                        )
                except Exception as exc:
                    relation_errors.append(
                        f"COMPANY_COUNT_ERROR {model_label(model)}.{field.name}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )

            # Build inferred direct access evidence from discovered relationship models.
            access_by_membership: dict[int, set[int]] = defaultdict(set)
            access_by_user: dict[int, set[int]] = defaultdict(set)
            access_evidence: dict[tuple[str, int], list[str]] = defaultdict(list)

            for model, bfield, mfield, ufield in access_fk_contracts:
                try:
                    filters = {f"{bfield.name}_id__in": target_branch_ids}
                    value_fields = [f"{bfield.name}_id"]
                    owner_key = ""
                    if mfield:
                        filters[f"{mfield.name}_id__in"] = [m.id for m in memberships]
                        value_fields.append(f"{mfield.name}_id")
                        owner_key = f"{mfield.name}_id"
                    elif ufield:
                        filters[f"{ufield.name}_id__in"] = target_user_ids
                        value_fields.append(f"{ufield.name}_id")
                        owner_key = f"{ufield.name}_id"
                    rows = model._default_manager.filter(**filters).values(*value_fields)
                    for row in rows:
                        branch_id = int(row[f"{bfield.name}_id"])
                        owner_id = int(row[owner_key])
                        if mfield:
                            access_by_membership[owner_id].add(branch_id)
                            access_evidence[("membership", owner_id)].append(
                                f"{model_label(model)}.{bfield.name}"
                            )
                        else:
                            access_by_user[owner_id].add(branch_id)
                            access_evidence[("user", owner_id)].append(
                                f"{model_label(model)}.{bfield.name}"
                            )
                except Exception as exc:
                    relation_errors.append(
                        f"ACCESS_FK_ERROR {model_label(model)}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )

            for model, field, owner_kind in access_m2m_contracts:
                try:
                    if owner_kind == "membership":
                        owners = memberships
                    else:
                        owners = [u for u in user_objects.values() if u is not None]
                    for owner in owners:
                        manager = getattr(owner, field.name)
                        ids = set(
                            manager.filter(id__in=target_branch_ids).values_list(
                                "id", flat=True
                            )
                        )
                        if owner_kind == "membership":
                            access_by_membership[int(owner.id)].update(int(x) for x in ids)
                        else:
                            access_by_user[int(owner.id)].update(int(x) for x in ids)
                        if ids:
                            access_evidence[(owner_kind, int(owner.id))].append(
                                f"{model_label(model)}.{field.name}[M2M]"
                            )
                except Exception as exc:
                    relation_errors.append(
                        f"ACCESS_M2M_ERROR {model_label(model)}.{field.name}: "
                        f"{type(exc).__name__}: {clean(exc)}"
                    )

            # Helpers for output.
            legacy_branch_by_current = {
                current_id: legacy_id
                for legacy_id, current_id in current_branch_id_by_legacy.items()
            }

            def company_name(company_obj, cmap) -> str:
                return clean(
                    first_attr(company_obj, ("name", "name_ar", "legal_name"), "")
                    or cmap.source_reference
                )

            def role_text(membership) -> str:
                role = getattr(membership, "role", None)
                return clean(first_attr(role, ("name", "code", "slug"), role or ""))

            def branch_display(branch_id: int) -> str:
                branch = branch_objects.get(branch_id)
                legacy_id = legacy_branch_by_current.get(branch_id, "")
                name = clean(first_attr(branch, ("name", "name_ar"), ""))
                return f"{legacy_id}->{branch_id}:{name}"

            def candidate_basis(legacy_company_id: str, company_id: int):
                subs = subscriptions_by_company.get(company_id, [])
                today = date.today()
                migration = []
                date_current = []
                for sub in subs:
                    smap = subscription_map_by_target.get(
                        (legacy_company_id, clean(sub.id))
                    )
                    mig, cur = subscription_candidate(sub, smap, today)
                    if mig:
                        migration.append((sub, smap))
                    if cur:
                        date_current.append((sub, smap))
                if len(migration) == 1:
                    return "MIGRATION_CURRENT", migration[0][0], migration[0][1]
                if len(date_current) == 1:
                    return "DATE_CURRENT", date_current[0][0], date_current[0][1]
                if subs:
                    latest = max(
                        subs,
                        key=lambda s: (
                            getattr(s, "end_date", None) or date.min,
                            getattr(s, "start_date", None) or date.min,
                            int(s.id),
                        ),
                    )
                    return (
                        "LATEST_END_FALLBACK",
                        latest,
                        subscription_map_by_target.get(
                            (legacy_company_id, clean(latest.id))
                        ),
                    )
                return "NONE", None, None

            # Sort companies by branch count desc, then name.
            ordered_legacy_ids = sorted(
                EXPECTED_THREE_PLUS_LEGACY_IDS,
                key=lambda legacy_id: (
                    -len(branches_by_legacy_company[legacy_id]),
                    company_name(
                        company_objects.get(current_company_id_by_legacy[legacy_id]),
                        company_map_by_legacy[legacy_id],
                    ).casefold(),
                    natural_key(legacy_id),
                ),
            )

            lines.extend(
                [
                    "",
                    "=" * 120,
                    "DEEP DECISION AUDIT — THREE PLUS BRANCH COMPANIES",
                    "=" * 120,
                ]
            )

            total_branches = 0
            total_active = 0
            total_inactive = 0

            for legacy_company_id in ordered_legacy_ids:
                cmap = company_map_by_legacy[legacy_company_id]
                company_id = current_company_id_by_legacy[legacy_company_id]
                company = company_objects.get(company_id)
                bmaps = sorted(
                    branches_by_legacy_company[legacy_company_id],
                    key=lambda m: natural_key(m.legacy_id),
                )
                total_branches += len(bmaps)

                active_count = 0
                inactive_count = 0
                for bm in bmaps:
                    current_branch_id = clean(bm.target_object_id)
                    branch = (
                        branch_objects.get(int(current_branch_id))
                        if current_branch_id.isdigit()
                        else None
                    )
                    if bool(first_attr(branch, ("is_active",), False)):
                        active_count += 1
                    else:
                        inactive_count += 1
                total_active += active_count
                total_inactive += inactive_count

                basis_kind, basis_sub, basis_map = candidate_basis(
                    legacy_company_id, company_id
                )

                lines.extend(
                    [
                        "",
                        "-" * 120,
                        f"COMPANY legacy_id={legacy_company_id}"
                        f" | current_id={company_id}"
                        f" | name={company_name(company, cmap)}"
                        f" | company_code={clean(first_attr(company, ('company_code','code'), ''))}",
                        f"BRANCH_COUNT={len(bmaps)}"
                        f" | ACTIVE={active_count}"
                        f" | INACTIVE={inactive_count}",
                        f"MAPPED_USER_COUNT={len(users_by_legacy_company[legacy_company_id])}",
                        f"CURRENT_MEMBERSHIP_COUNT={len(memberships_by_company.get(company_id, []))}",
                        f"MAPPED_SUBSCRIPTION_COUNT={len(subs_by_legacy_company[legacy_company_id])}",
                        f"CURRENT_SUBSCRIPTION_ROW_COUNT={len(subscriptions_by_company.get(company_id, []))}",
                    ]
                )

                # Cache summary.
                cache_path = SOURCE_CACHE_DIR / f"company_{legacy_company_id}.json"
                lines.append(f"SOURCE_CACHE_FILE={cache_path}")
                if cache_path.exists():
                    try:
                        payload = json.loads(
                            cache_path.read_text(encoding="utf-8", errors="strict")
                        )
                        if isinstance(payload, dict):
                            lines.append(
                                "CACHE_TOP_LEVEL_KEYS="
                                + ",".join(sorted(map(str, payload.keys())))
                            )
                        for item in cache_collection_counts(payload):
                            lines.append(f"CACHE_COLLECTION {item}")
                    except Exception as exc:
                        lines.append(
                            f"CACHE_PARSE_ERROR={type(exc).__name__}: {clean(exc)}"
                        )
                else:
                    lines.append("CACHE_FILE_MISSING=YES")

                # Clone basis.
                lines.append("SUBSCRIPTION_CLONE_BASIS_BEGIN")
                lines.append(f"CLONE_BASIS_SELECTION={basis_kind}")
                if basis_sub is not None:
                    metadata = dict(getattr(basis_map, "metadata", {}) or {}) if basis_map else {}
                    plan = getattr(basis_sub, "plan", None)
                    lines.append(
                        "CLONE_BASIS"
                        f" current_subscription_id={basis_sub.id}"
                        f" | legacy_subscription_id={clean(basis_map.legacy_id) if basis_map else 'UNMAPPED'}"
                        f" | legacy_package_id={clean(metadata.get('legacy_package_id'))}"
                        f" | migration_current={bool_text(metadata.get('migration_current')) if 'migration_current' in metadata else ''}"
                        f" | plan_id={clean(getattr(basis_sub, 'plan_id', ''))}"
                        f" | plan_name={clean(first_attr(plan, ('name',), ''))}"
                        f" | plan_slug={clean(first_attr(plan, ('slug',), ''))}"
                        f" | status={clean(getattr(basis_sub, 'status', ''))}"
                        f" | billing_cycle={clean(getattr(basis_sub, 'billing_cycle', ''))}"
                        f" | start_date={date_text(getattr(basis_sub, 'start_date', None))}"
                        f" | end_date={date_text(getattr(basis_sub, 'end_date', None))}"
                        f" | price={clean(getattr(basis_sub, 'price', ''))}"
                        f" | discount_amount={clean(getattr(basis_sub, 'discount_amount', ''))}"
                        f" | tax_amount={clean(getattr(basis_sub, 'tax_amount', ''))}"
                        f" | total_amount={clean(getattr(basis_sub, 'total_amount', ''))}"
                        f" | auto_renew={bool_text(getattr(basis_sub, 'auto_renew', None))}"
                    )
                lines.append("SUBSCRIPTION_CLONE_BASIS_END")

                # Branch detail + per-branch linked model counts.
                lines.append("BRANCHES_BEGIN")
                for bm in bmaps:
                    legacy_branch_id = clean(bm.legacy_id)
                    raw_current = clean(bm.target_object_id)
                    branch_id = int(raw_current) if raw_current.isdigit() else None
                    branch = branch_objects.get(branch_id) if branch_id else None
                    lines.append(
                        f"BRANCH legacy_id={legacy_branch_id}"
                        f" | current_id={raw_current or 'MISSING'}"
                        f" | name={clean(first_attr(branch, ('name','name_ar'), bm.source_reference))}"
                        f" | code={clean(first_attr(branch, ('branch_code','code'), ''))}"
                        f" | status={clean(first_attr(branch, ('status',), ''))}"
                        f" | active={bool_text(first_attr(branch, ('is_active',), None))}"
                        f" | default={bool_text(first_attr(branch, ('is_default',), None))}"
                    )

                    counts = sorted(
                        branch_model_counts.get(branch_id or -1, []),
                        key=lambda x: (x[0], x[1]),
                    )
                    if counts:
                        for label, field_name, n in counts:
                            lines.append(
                                f"  BRANCH_LINKED {label}.{field_name}={n}"
                            )
                    else:
                        lines.append("  BRANCH_LINKED NONE_DETECTED")
                lines.append("BRANCHES_END")

                # Users / memberships / inferred direct branch access evidence.
                lines.append("USERS_AND_ACCESS_BEGIN")
                mapped_users = sorted(
                    users_by_legacy_company[legacy_company_id],
                    key=lambda m: natural_key(m.legacy_id),
                )
                memberships_for_company = memberships_by_company.get(company_id, [])
                memberships_by_user = {
                    int(m.user_id): m for m in memberships_for_company
                }

                for umap in mapped_users:
                    legacy_user_id = clean(umap.legacy_id)
                    raw_current = clean(umap.target_object_id)
                    user_id = int(raw_current) if raw_current.isdigit() else None
                    user = user_objects.get(user_id) if user_id else None
                    membership = memberships_by_user.get(user_id or -1)

                    username = clean(first_attr(user, ("username",), ""))
                    email = clean(first_attr(user, ("email",), ""))
                    first_name = clean(first_attr(user, ("first_name",), ""))
                    last_name = clean(first_attr(user, ("last_name",), ""))
                    display_name = " ".join(
                        x for x in (first_name, last_name) if x
                    ).strip()

                    lines.append(
                        f"USER legacy_id={legacy_user_id}"
                        f" | current_id={raw_current or 'MISSING'}"
                        f" | username={username}"
                        f" | email={email}"
                        f" | display_name={display_name}"
                        f" | active={bool_text(first_attr(user, ('is_active',), None))}"
                    )

                    if membership is None:
                        lines.append("  MEMBERSHIP=MISSING")
                        continue

                    lines.append(
                        f"  MEMBERSHIP id={membership.id}"
                        f" | role={role_text(membership)}"
                        f" | status={clean(getattr(membership, 'status', ''))}"
                        f" | primary={bool_text(getattr(membership, 'is_primary', None))}"
                        f" | job_title={clean(getattr(membership, 'job_title', ''))}"
                        f" | department={clean(getattr(membership, 'department', ''))}"
                    )

                    branch_ids = set(access_by_membership.get(int(membership.id), set()))
                    branch_ids.update(access_by_user.get(int(user_id), set()) if user_id else set())
                    evidence = []
                    evidence.extend(access_evidence.get(("membership", int(membership.id)), []))
                    if user_id:
                        evidence.extend(access_evidence.get(("user", int(user_id)), []))

                    if branch_ids:
                        scoped = sorted(
                            [bid for bid in branch_ids if bid in {
                                int(clean(bm.target_object_id))
                                for bm in bmaps
                                if clean(bm.target_object_id).isdigit()
                            }]
                        )
                        lines.append(
                            "  INFERRED_DIRECT_BRANCH_ACCESS="
                            + "; ".join(branch_display(bid) for bid in scoped)
                        )
                        lines.append(
                            "  ACCESS_EVIDENCE="
                            + ",".join(sorted(set(evidence)))
                        )
                    else:
                        lines.append(
                            "  INFERRED_DIRECT_BRANCH_ACCESS=NONE_DETECTED_BY_RELATION_DISCOVERY"
                        )
                lines.append("USERS_AND_ACCESS_END")

                # Company-level linked objects, useful to flag records that may need clone/share policy.
                lines.append("COMPANY_LINKED_MODELS_BEGIN")
                company_counts = sorted(
                    company_model_counts.get(company_id, []),
                    key=lambda x: (x[0], x[1]),
                )
                for label, field_name, n in company_counts:
                    lines.append(f"COMPANY_LINKED {label}.{field_name}={n}")
                if not company_counts:
                    lines.append("COMPANY_LINKED NONE_DETECTED")
                lines.append("COMPANY_LINKED_MODELS_END")

            lines.extend(
                [
                    "",
                    "=" * 120,
                    "A2 FINAL RECONCILIATION",
                    "=" * 120,
                    f"THREE_PLUS_COMPANIES={len(ordered_legacy_ids)}",
                    f"TOTAL_BRANCHES_IN_SCOPE={total_branches}",
                    f"ACTIVE_BRANCHES_IN_SCOPE={total_active}",
                    f"INACTIVE_BRANCHES_IN_SCOPE={total_inactive}",
                    f"TARGET_COMPANY_IDS={len(target_company_ids)}",
                    f"TARGET_BRANCH_IDS={len(target_branch_ids)}",
                    f"TARGET_MAPPED_USER_IDS={len(target_user_ids)}",
                    f"DYNAMIC_BRANCH_FK_CONTRACTS={len(branch_fk_contracts)}",
                    f"DYNAMIC_COMPANY_FK_CONTRACTS={len(company_fk_contracts)}",
                    f"DYNAMIC_ACCESS_FK_CONTRACTS={len(access_fk_contracts)}",
                    f"DYNAMIC_ACCESS_M2M_CONTRACTS={len(access_m2m_contracts)}",
                    f"RELATION_QUERY_ERROR_COUNT={len(relation_errors)}",
                ]
            )
            if relation_errors:
                lines.append("RELATION_QUERY_ERRORS_BEGIN")
                lines.extend(relation_errors)
                lines.append("RELATION_QUERY_ERRORS_END")
            lines.extend(
                [
                    "DATABASE_WRITES=0",
                    "SOURCE_NETWORK_CALLS=0",
                    "A2_RESULT=PASS",
                    "=" * 120,
                ]
            )

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A2 DEEP READ-ONLY DECISION AUDIT =====")
        print("THREE_PLUS_COMPANIES=16")
        print(f"TOTAL_BRANCHES_IN_SCOPE={total_branches}")
        print(f"ACTIVE_BRANCHES_IN_SCOPE={total_active}")
        print(f"INACTIVE_BRANCHES_IN_SCOPE={total_inactive}")
        print(f"RELATION_QUERY_ERROR_COUNT={len(relation_errors)}")
        print("DATABASE_WRITES=0")
        print("SOURCE_NETWORK_CALLS=0")
        print("A2_RESULT=PASS")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")
        return 0

    except Exception as exc:
        lines.extend(
            [
                "",
                "=" * 120,
                "A2_RESULT=FAIL",
                f"ERROR_TYPE={type(exc).__name__}",
                f"ERROR={clean(exc)}",
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
                "=" * 120,
            ]
        )
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A2 DEEP READ-ONLY DECISION AUDIT =====")
        print("A2_RESULT=FAIL")
        print(f"ERROR={type(exc).__name__}: {exc}")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

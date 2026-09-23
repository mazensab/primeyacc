#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
REPORT = ROOT / "v2_company_split_a1_readonly_discovery.txt"
SOURCE_SYSTEM = "mhamcloud_v1"
SOURCE_CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"


def text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def natural_key(value: Any):
    s = text(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def run_git(*args: str) -> str:
    try:
        cp = subprocess.run(
            ["git", *args],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        if cp.returncode != 0:
            return f"ERROR[{cp.returncode}] {text(cp.stderr)}"
        return cp.stdout.strip()
    except Exception as exc:
        return f"ERROR {type(exc).__name__}: {exc}"


def detect_settings() -> str:
    existing = os.environ.get("DJANGO_SETTINGS_MODULE", "").strip()
    if existing:
        return existing
    manage = ROOT / "manage.py"
    if not manage.exists():
        raise RuntimeError(f"manage.py missing under {ROOT}")
    raw = manage.read_text(encoding="utf-8", errors="replace")
    match = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not match:
        raise RuntimeError("Cannot detect DJANGO_SETTINGS_MODULE from manage.py")
    return match.group(1)


def model_field_names(model) -> list[str]:
    return [
        f.name
        for f in model._meta.get_fields()
        if getattr(f, "concrete", False)
    ]


def model_value(obj, name: str, default: Any = "") -> Any:
    try:
        return getattr(obj, name)
    except Exception:
        return default


def first_existing(obj, names: tuple[str, ...], default: Any = "") -> Any:
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value not in (None, ""):
                return value
    return default


def fmt_bool(value: Any) -> str:
    if value is None:
        return ""
    return "YES" if bool(value) else "NO"


def fmt_date(value: Any) -> str:
    if value in (None, ""):
        return ""
    try:
        return value.isoformat()
    except Exception:
        return text(value)


def fmt_money(value: Any) -> str:
    if value in (None, ""):
        return ""
    return text(value)


def write_failure(lines: list[str], exc: Exception) -> int:
    lines.extend(
        [
            "",
            "=" * 110,
            "A1_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={text(exc)}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "=" * 110,
        ]
    )
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
    print("===== PRIMEYACC COMPANY SPLIT A1 READ-ONLY DISCOVERY =====")
    print("A1_RESULT=FAIL")
    print(f"REPORT={REPORT.name}")
    print(f"SIZE={REPORT.stat().st_size}")
    print(f"SHA256={digest}")
    print(f"ERROR={type(exc).__name__}: {exc}")
    return 2


def main() -> int:
    lines: list[str] = []
    lines.extend(
        [
            "=" * 110,
            "PRIMEYACC — COMPANY SPLIT A1 READ-ONLY DISCOVERY",
            "=" * 110,
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
    )

    tracked = run_git("status", "--short", "--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if tracked == '' else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    if not (ROOT / "manage.py").exists():
        return write_failure(lines, RuntimeError("Run this script from the PrimeyAcc project root"))

    try:
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.db import connections
        from django.db.models import Count

        Company = apps.get_model("companies", "Company")
        Branch = apps.get_model("companies", "Branch")
        CompanyMembership = apps.get_model("accounts", "CompanyMembership")
        CompanySubscription = apps.get_model("subscriptions", "CompanySubscription")
        SubscriptionPlan = apps.get_model("subscriptions", "SubscriptionPlan")
        LegacyObjectMap = apps.get_model("business_controls", "LegacyObjectMap")

        default_conn = connections["default"]
        if default_conn.vendor != "postgresql":
            raise RuntimeError(
                f"Safety stop: Primey default DB must be PostgreSQL, got {default_conn.vendor}"
            )

        lines.extend(
            [
                f"DJANGO_SETTINGS_MODULE={os.environ['DJANGO_SETTINGS_MODULE']}",
                f"DEFAULT_DB_VENDOR={default_conn.vendor}",
                "",
                "===== MODEL CONTRACT SNAPSHOT =====",
                f"Company_FIELDS={','.join(model_field_names(Company))}",
                f"Branch_FIELDS={','.join(model_field_names(Branch))}",
                f"CompanyMembership_FIELDS={','.join(model_field_names(CompanyMembership))}",
                f"CompanySubscription_FIELDS={','.join(model_field_names(CompanySubscription))}",
                f"SubscriptionPlan_FIELDS={','.join(model_field_names(SubscriptionPlan))}",
                f"LegacyObjectMap_FIELDS={','.join(model_field_names(LegacyObjectMap))}",
            ]
        )

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
            .order_by("legacy_company_id", "legacy_id")
        )
        subscription_maps = list(
            all_maps.filter(source_table="subscriptions")
            .order_by("legacy_company_id", "legacy_id")
        )

        company_map_by_legacy: dict[str, Any] = {}
        duplicate_company_map_ids: list[str] = []
        for m in company_maps:
            lid = text(m.legacy_id)
            if lid in company_map_by_legacy:
                duplicate_company_map_ids.append(lid)
            else:
                company_map_by_legacy[lid] = m

        branches_by_company: dict[str, list[Any]] = defaultdict(list)
        for m in branch_maps:
            branches_by_company[text(m.legacy_company_id)].append(m)

        users_by_company: Counter[str] = Counter(
            text(m.legacy_company_id) for m in user_maps
        )
        subs_maps_by_company: dict[str, list[Any]] = defaultdict(list)
        sub_map_by_target: dict[tuple[str, str], Any] = {}
        for m in subscription_maps:
            legacy_company_id = text(m.legacy_company_id)
            subs_maps_by_company[legacy_company_id].append(m)
            if text(m.target_object_id):
                sub_map_by_target[(legacy_company_id, text(m.target_object_id))] = m

        mapped_legacy_company_ids = sorted(company_map_by_legacy, key=natural_key)

        current_company_ids: list[int] = []
        company_current_id_by_legacy: dict[str, int | None] = {}
        missing_company_targets: list[str] = []
        for legacy_id in mapped_legacy_company_ids:
            m = company_map_by_legacy[legacy_id]
            raw_target = text(m.target_object_id) or text(m.company_id)
            current_id = int(raw_target) if raw_target.isdigit() else None
            company_current_id_by_legacy[legacy_id] = current_id
            if current_id is None:
                missing_company_targets.append(legacy_id)
            else:
                current_company_ids.append(current_id)

        company_objects = Company.objects.in_bulk(current_company_ids)

        current_branch_ids: list[int] = []
        for m in branch_maps:
            raw = text(m.target_object_id)
            if raw.isdigit():
                current_branch_ids.append(int(raw))
        branch_objects = Branch.objects.in_bulk(current_branch_ids)

        membership_counts = Counter({
            int(row["company_id"]): int(row["n"])
            for row in (
                CompanyMembership.objects.filter(company_id__in=current_company_ids)
                .values("company_id")
                .annotate(n=Count("id"))
            )
        })

        subscription_objects_by_company: dict[int, list[Any]] = defaultdict(list)
        for sub in (
            CompanySubscription.objects.filter(company_id__in=current_company_ids)
            .select_related("plan")
            .order_by("company_id", "start_date", "id")
        ):
            subscription_objects_by_company[int(sub.company_id)].append(sub)

        branch_count_distribution = Counter(
            len(branches_by_company.get(legacy_id, []))
            for legacy_id in mapped_legacy_company_ids
        )
        one_branch = branch_count_distribution.get(1, 0)
        two_branches = branch_count_distribution.get(2, 0)
        three_plus = sum(
            company_count
            for branch_count, company_count in branch_count_distribution.items()
            if branch_count >= 3
        )
        multi_total = sum(
            company_count
            for branch_count, company_count in branch_count_distribution.items()
            if branch_count >= 2
        )
        zero_branch = branch_count_distribution.get(0, 0)

        cache_files = (
            list(SOURCE_CACHE_DIR.glob("company_*.json"))
            if SOURCE_CACHE_DIR.exists()
            else []
        )
        cache_legacy_ids = {
            p.stem.removeprefix("company_")
            for p in cache_files
            if p.stem.startswith("company_")
        }
        mapped_set = set(mapped_legacy_company_ids)
        cache_missing_for_mapped = sorted(mapped_set - cache_legacy_ids, key=natural_key)
        cache_extra = sorted(cache_legacy_ids - mapped_set, key=natural_key)

        lines.extend(
            [
                "",
                "===== MIGRATION / CACHE BASELINE =====",
                f"SOURCE_SYSTEM={SOURCE_SYSTEM}",
                f"MAPPED_COMPANIES={len(mapped_legacy_company_ids)}",
                f"MAPPED_BRANCHES={len(branch_maps)}",
                f"MAPPED_USERS={len(user_maps)}",
                f"MAPPED_SUBSCRIPTIONS={len(subscription_maps)}",
                f"DUPLICATE_COMPANY_MAP_COUNT={len(duplicate_company_map_ids)}",
                f"MISSING_CURRENT_COMPANY_TARGET_COUNT={len(missing_company_targets)}",
                f"SOURCE_CACHE_DIR={SOURCE_CACHE_DIR}",
                f"SOURCE_CACHE_FILES={len(cache_files)}",
                f"SOURCE_CACHE_MISSING_FOR_MAPPED_COUNT={len(cache_missing_for_mapped)}",
                f"SOURCE_CACHE_EXTRA_COUNT={len(cache_extra)}",
                f"SOURCE_CACHE_MISSING_FOR_MAPPED_IDS={','.join(cache_missing_for_mapped)}",
                f"SOURCE_CACHE_EXTRA_IDS={','.join(cache_extra)}",
                "",
                "===== BRANCH DISTRIBUTION =====",
                f"ZERO_BRANCH_COMPANIES={zero_branch}",
                f"ONE_BRANCH_COMPANIES={one_branch}",
                f"TWO_BRANCH_COMPANIES={two_branches}",
                f"THREE_PLUS_BRANCH_COMPANIES={three_plus}",
                f"MULTI_BRANCH_COMPANIES={multi_total}",
                f"DISTRIBUTION_RAW={dict(sorted(branch_count_distribution.items()))}",
            ]
        )

        # Optional local legacy DB snapshot. No failure if the alias is unavailable.
        lines.extend(["", "===== LOCAL LEGACY DB SNAPSHOT ====="])
        try:
            if "legacy" not in connections.databases:
                lines.append("LEGACY_DB_ALIAS_PRESENT=NO")
            else:
                legacy_conn = connections["legacy"]
                lines.append("LEGACY_DB_ALIAS_PRESENT=YES")
                lines.append(f"LEGACY_DB_VENDOR={legacy_conn.vendor}")
                table_names = set(legacy_conn.introspection.table_names())
                for table in ("business", "business_locations", "users", "subscriptions"):
                    if table not in table_names:
                        lines.append(f"LEGACY_TABLE_{table.upper()}=MISSING")
                        continue
                    with legacy_conn.cursor() as cursor:
                        cursor.execute(f"SELECT COUNT(*) FROM {legacy_conn.ops.quote_name(table)}")
                        count = cursor.fetchone()[0]
                    lines.append(f"LEGACY_TABLE_{table.upper()}_COUNT={count}")
        except Exception as exc:
            lines.append(f"LEGACY_DB_SNAPSHOT_ERROR={type(exc).__name__}: {text(exc)}")

        def company_name(legacy_id: str, company_obj: Any, company_map: Any) -> str:
            return text(
                first_existing(company_obj, ("name", "legal_name", "name_ar"), "")
                or company_map.source_reference
                or f"Legacy Company {legacy_id}"
            )

        def branch_line(branch_map: Any) -> str:
            legacy_branch_id = text(branch_map.legacy_id)
            current_branch_id = text(branch_map.target_object_id)
            branch_obj = None
            if current_branch_id.isdigit():
                branch_obj = branch_objects.get(int(current_branch_id))

            name = text(
                first_existing(branch_obj, ("name", "branch_name"), "")
                or branch_map.source_reference
                or f"Legacy Branch {legacy_branch_id}"
            )
            code = text(first_existing(branch_obj, ("branch_code", "code"), ""))
            active = (
                fmt_bool(first_existing(branch_obj, ("is_active",), None))
                if branch_obj is not None
                else ""
            )
            default = (
                fmt_bool(first_existing(branch_obj, ("is_default",), None))
                if branch_obj is not None
                else ""
            )
            status = (
                text(first_existing(branch_obj, ("status",), ""))
                if branch_obj is not None
                else ""
            )
            return (
                f"BRANCH legacy_id={legacy_branch_id}"
                f" | current_id={current_branch_id or 'MISSING'}"
                f" | name={name}"
                f" | code={code}"
                f" | status={status}"
                f" | active={active}"
                f" | default={default}"
            )

        def subscription_lines(legacy_id: str, current_company_id: int | None) -> list[str]:
            out: list[str] = []
            if current_company_id is None:
                return ["SUBSCRIPTION current_company_id=MISSING"]

            subs = subscription_objects_by_company.get(current_company_id, [])
            out.append(f"CURRENT_SUBSCRIPTION_ROW_COUNT={len(subs)}")
            if not subs:
                return out

            today = date.today()
            for sub in subs:
                smap = sub_map_by_target.get((legacy_id, text(sub.pk)))
                meta = dict(getattr(smap, "metadata", {}) or {}) if smap else {}
                legacy_sub_id = text(smap.legacy_id) if smap else ""
                legacy_package_id = text(meta.get("legacy_package_id"))
                migration_current = meta.get("migration_current")
                plan = getattr(sub, "plan", None)

                start = model_value(sub, "start_date", None)
                end = model_value(sub, "end_date", None)
                status = text(model_value(sub, "status", ""))
                current_like = bool(
                    status.upper() in {"ACTIVE", "TRIAL", "TRIALING", "GRACE", "CURRENT", "PAID"}
                    and (start is None or start <= today)
                    and (end is None or end >= today)
                )

                out.append(
                    "SUBSCRIPTION"
                    f" current_id={sub.pk}"
                    f" | legacy_id={legacy_sub_id or 'UNMAPPED'}"
                    f" | legacy_package_id={legacy_package_id}"
                    f" | migration_current={fmt_bool(migration_current) if migration_current is not None else ''}"
                    f" | current_like={fmt_bool(current_like)}"
                    f" | plan_id={text(getattr(sub, 'plan_id', ''))}"
                    f" | plan_name={text(first_existing(plan, ('name',), '')) if plan else ''}"
                    f" | plan_slug={text(first_existing(plan, ('slug',), '')) if plan else ''}"
                    f" | status={status}"
                    f" | action={text(model_value(sub, 'action', ''))}"
                    f" | billing_cycle={text(model_value(sub, 'billing_cycle', ''))}"
                    f" | start_date={fmt_date(start)}"
                    f" | end_date={fmt_date(end)}"
                    f" | price={fmt_money(model_value(sub, 'price', ''))}"
                    f" | discount_amount={fmt_money(model_value(sub, 'discount_amount', ''))}"
                    f" | tax_amount={fmt_money(model_value(sub, 'tax_amount', ''))}"
                    f" | total_amount={fmt_money(model_value(sub, 'total_amount', ''))}"
                    f" | auto_renew={fmt_bool(model_value(sub, 'auto_renew', None))}"
                    f" | billing_reference={text(model_value(sub, 'billing_reference', ''))}"
                )
            return out

        multi_legacy_ids = [
            legacy_id
            for legacy_id in mapped_legacy_company_ids
            if len(branches_by_company.get(legacy_id, [])) >= 2
        ]

        def output_company_block(legacy_id: str) -> list[str]:
            company_map = company_map_by_legacy[legacy_id]
            current_company_id = company_current_id_by_legacy.get(legacy_id)
            company_obj = (
                company_objects.get(current_company_id)
                if current_company_id is not None
                else None
            )
            branch_list = sorted(
                branches_by_company.get(legacy_id, []),
                key=lambda m: natural_key(m.legacy_id),
            )

            current_name = company_name(legacy_id, company_obj, company_map)
            source_name = text(company_map.source_reference)
            current_code = (
                text(first_existing(company_obj, ("company_code", "code"), ""))
                if company_obj is not None
                else ""
            )

            block = [
                "-" * 110,
                f"COMPANY legacy_id={legacy_id}"
                f" | current_id={current_company_id if current_company_id is not None else 'MISSING'}"
                f" | name={current_name}"
                f" | source_reference={source_name}"
                f" | company_code={current_code}",
                f"BRANCH_COUNT={len(branch_list)}",
                f"MAPPED_USER_COUNT={users_by_company.get(legacy_id, 0)}",
                f"CURRENT_MEMBERSHIP_COUNT={membership_counts.get(current_company_id, 0) if current_company_id else 0}",
                f"MAPPED_SUBSCRIPTION_COUNT={len(subs_maps_by_company.get(legacy_id, []))}",
            ]
            block.extend(branch_line(m) for m in branch_list)
            block.extend(subscription_lines(legacy_id, current_company_id))
            return block

        exactly_two = [
            legacy_id
            for legacy_id in multi_legacy_ids
            if len(branches_by_company.get(legacy_id, [])) == 2
        ]
        three_or_more = [
            legacy_id
            for legacy_id in multi_legacy_ids
            if len(branches_by_company.get(legacy_id, [])) >= 3
        ]

        exactly_two.sort(key=lambda lid: (company_name(
            lid,
            company_objects.get(company_current_id_by_legacy.get(lid)),
            company_map_by_legacy[lid],
        ).casefold(), natural_key(lid)))
        three_or_more.sort(
            key=lambda lid: (
                -len(branches_by_company.get(lid, [])),
                company_name(
                    lid,
                    company_objects.get(company_current_id_by_legacy.get(lid)),
                    company_map_by_legacy[lid],
                ).casefold(),
                natural_key(lid),
            )
        )

        lines.extend(
            [
                "",
                "=" * 110,
                f"EXACTLY_TWO_BRANCHES — COUNT={len(exactly_two)}",
                "=" * 110,
            ]
        )
        for legacy_id in exactly_two:
            lines.extend(output_company_block(legacy_id))

        lines.extend(
            [
                "",
                "=" * 110,
                f"THREE_PLUS_BRANCHES — COUNT={len(three_or_more)}",
                "=" * 110,
            ]
        )
        for legacy_id in three_or_more:
            lines.extend(output_company_block(legacy_id))

        current_sub_company_count = sum(
            1
            for cid in current_company_ids
            if subscription_objects_by_company.get(cid)
        )
        lines.extend(
            [
                "",
                "=" * 110,
                "A1 FINAL RECONCILIATION",
                "=" * 110,
                f"MAPPED_COMPANIES={len(mapped_legacy_company_ids)}",
                f"MAPPED_BRANCHES={len(branch_maps)}",
                f"MAPPED_USERS={len(user_maps)}",
                f"ONE_BRANCH_COMPANIES={one_branch}",
                f"TWO_BRANCH_COMPANIES={two_branches}",
                f"THREE_PLUS_BRANCH_COMPANIES={three_plus}",
                f"MULTI_BRANCH_COMPANIES={multi_total}",
                f"COMPANIES_WITH_ANY_CURRENT_SUBSCRIPTION_ROWS={current_sub_company_count}",
                f"SOURCE_CACHE_FILES={len(cache_files)}",
                f"LEGACY_COMPANY_MAP_DUPLICATES={len(duplicate_company_map_ids)}",
                f"MISSING_CURRENT_COMPANY_TARGETS={len(missing_company_targets)}",
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
                "A1_RESULT=PASS",
                "=" * 110,
            ]
        )

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A1 READ-ONLY DISCOVERY =====")
        print(f"MAPPED_COMPANIES={len(mapped_legacy_company_ids)}")
        print(f"MAPPED_BRANCHES={len(branch_maps)}")
        print(f"MAPPED_USERS={len(user_maps)}")
        print(f"ONE_BRANCH_COMPANIES={one_branch}")
        print(f"TWO_BRANCH_COMPANIES={two_branches}")
        print(f"THREE_PLUS_BRANCH_COMPANIES={three_plus}")
        print(f"MULTI_BRANCH_COMPANIES={multi_total}")
        print(f"SOURCE_CACHE_FILES={len(cache_files)}")
        print("DATABASE_WRITES=0")
        print("SOURCE_NETWORK_CALLS=0")
        print("A1_RESULT=PASS")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")
        return 0

    except Exception as exc:
        return write_failure(lines, exc)


if __name__ == "__main__":
    raise SystemExit(main())

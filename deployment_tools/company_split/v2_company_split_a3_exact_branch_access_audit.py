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
REPORT = ROOT / "v2_company_split_a3_exact_branch_access_audit.txt"
SOURCE_SYSTEM = "mhamcloud_v1"
CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"

EXPECTED_COMPANIES = {
    "75", "76", "88", "113", "119", "174", "188", "195",
    "290", "299", "307", "429", "431", "473", "478", "556",
}


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def natural_key(value: Any):
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
        raise RuntimeError("Unable to detect DJANGO_SETTINGS_MODULE")
    return match.group(1)


def progress(message: str) -> None:
    print(message, flush=True)


def branch_label(branch, legacy_id: str = "") -> str:
    if branch is None:
        return f"{legacy_id}->MISSING"
    name = clean(getattr(branch, "name", ""))
    return f"{legacy_id}->{branch.id}:{name}"


def main() -> int:
    lines: list[str] = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A3 EXACT BRANCH ACCESS AUDIT",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={git('branch', '--show-current')}",
        f"HEAD={git('rev-parse', 'HEAD')}",
        f"ORIGIN_MAIN={git('rev-parse', 'origin/main')}",
    ]

    tracked = git("status", "--short", "--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not tracked else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        progress("[A3] 1/6 Loading Django...")
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.contrib.auth import get_user_model
        from django.db import connection
        from accounts.branch_access import accessible_branches
        from accounts.models import (
            BranchAccessMode,
            CompanyMembership,
            CompanyMembershipBranchGrant,
            CompanyMembershipBranchPolicy,
        )
        from business_controls.models import LegacyObjectMap
        from companies.models import Branch

        User = get_user_model()

        if connection.vendor != "postgresql":
            raise RuntimeError(
                f"Safety stop: expected PostgreSQL, got {connection.vendor}"
            )

        with connection.cursor() as cursor:
            cursor.execute("SET default_transaction_read_only = on")
            cursor.execute("SET statement_timeout = 10000")

        lines.extend(
            [
                f"DJANGO_SETTINGS_MODULE={os.environ['DJANGO_SETTINGS_MODULE']}",
                f"DEFAULT_DB_VENDOR={connection.vendor}",
                "SESSION_DEFAULT_TRANSACTION_READ_ONLY=ON",
                "STATEMENT_TIMEOUT_MS=10000",
            ]
        )

        progress("[A3] 2/6 Loading maps and target memberships...")

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
            ).order_by("legacy_id")
        )
        company_target = {
            clean(m.legacy_id): int(m.company_id)
            for m in company_maps
            if m.company_id and clean(m.legacy_id) in EXPECTED_COMPANIES
        }

        if set(company_target) != EXPECTED_COMPANIES:
            raise RuntimeError(
                "Target company mapping mismatch: "
                f"missing={sorted(EXPECTED_COMPANIES-set(company_target), key=natural_key)}"
            )

        branch_maps_qs = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business_locations",
            legacy_company_id__in=EXPECTED_COMPANIES,
        )

        branch_map_by_pair: dict[tuple[str, str], int] = {}
        legacy_branch_by_current: dict[int, tuple[str, str]] = {}

        for m in branch_maps_qs:
            raw = clean(m.target_object_id)
            if raw.isdigit():
                key = (clean(m.legacy_company_id), clean(m.legacy_id))
                current_id = int(raw)
                branch_map_by_pair[key] = current_id
                legacy_branch_by_current[current_id] = key

        user_maps_qs = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="users",
            legacy_company_id__in=EXPECTED_COMPANIES,
        )

        user_map_by_pair: dict[tuple[str, str], int] = {}
        legacy_user_by_current_company: dict[tuple[int, int], tuple[str, str]] = {}

        for m in user_maps_qs:
            raw = clean(m.target_object_id)
            if raw.isdigit():
                lcid = clean(m.legacy_company_id)
                luid = clean(m.legacy_id)
                uid = int(raw)
                user_map_by_pair[(lcid, luid)] = uid
                cid = company_target.get(lcid)
                if cid:
                    legacy_user_by_current_company[(uid, cid)] = (lcid, luid)

        target_company_ids = sorted(company_target.values())

        memberships = list(
            CompanyMembership.objects.filter(company_id__in=target_company_ids)
            .select_related("user", "company")
            .order_by("company_id", "id")
        )

        membership_by_user_company = {
            (int(m.user_id), int(m.company_id)): m for m in memberships
        }

        policies = {
            int(p.membership_id): p
            for p in CompanyMembershipBranchPolicy.objects.filter(
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
            .select_related("branch", "policy")
            .order_by("policy_id", "branch_id", "id")
        ):
            grants_by_policy[int(grant.policy_id)].append(grant)

        branches = {
            int(b.id): b
            for b in Branch.objects.filter(company_id__in=target_company_ids)
        }

        progress("[A3] 3/6 Rebuilding original 25C legacy authorization plan...")

        legacy_plan_by_membership: dict[int, dict[str, Any]] = {}
        cache_errors: list[str] = []
        unknown_locations: list[tuple[str, str, str]] = []
        wrong_company_locations: list[tuple[str, str, str, int]] = []

        for index, legacy_company_id in enumerate(
            sorted(EXPECTED_COMPANIES, key=natural_key), start=1
        ):
            progress(
                f"[A3]   cache {index}/{len(EXPECTED_COMPANIES)} company={legacy_company_id}"
            )

            cache_file = CACHE_DIR / f"company_{legacy_company_id}.json"
            if not cache_file.exists():
                cache_errors.append(
                    f"company={legacy_company_id} cache_missing={cache_file}"
                )
                continue

            try:
                data = json.loads(
                    cache_file.read_text(encoding="utf-8-sig")
                )
            except Exception as exc:
                cache_errors.append(
                    f"company={legacy_company_id} "
                    f"parse_error={type(exc).__name__}:{clean(exc)}"
                )
                continue

            payload = data.get("payload") or {}
            pdata = (payload.get("permissions") or {}).get("data") or {}

            permissions = {
                clean(row.get("id")): clean(row.get("name"))
                for row in pdata.get("permissions", [])
                if isinstance(row, dict) and row.get("id") is not None
            }

            role_permissions: dict[str, set[str]] = defaultdict(set)
            for row in pdata.get("role_permissions", []):
                if isinstance(row, dict):
                    role_permissions[clean(row.get("role_id"))].add(
                        clean(row.get("permission_id"))
                    )

            user_roles: dict[str, set[str]] = defaultdict(set)
            for row in pdata.get("user_roles", []):
                if (
                    isinstance(row, dict)
                    and clean(row.get("model_type")) == r"App\User"
                ):
                    user_roles[clean(row.get("model_id"))].add(
                        clean(row.get("role_id"))
                    )

            direct_permissions: dict[str, set[str]] = defaultdict(set)
            for row in pdata.get("direct_permissions", []):
                if (
                    isinstance(row, dict)
                    and clean(row.get("model_type")) == r"App\User"
                ):
                    direct_permissions[clean(row.get("model_id"))].add(
                        clean(row.get("permission_id"))
                    )

            target_company_id = company_target[legacy_company_id]

            for raw_user in payload.get("users", []):
                if not isinstance(raw_user, dict):
                    continue

                legacy_user_id = clean(raw_user.get("id"))
                current_user_id = user_map_by_pair.get(
                    (legacy_company_id, legacy_user_id)
                )

                if current_user_id is None:
                    cache_errors.append(
                        f"company={legacy_company_id} "
                        f"legacy_user={legacy_user_id} unmapped_user"
                    )
                    continue

                membership = membership_by_user_company.get(
                    (current_user_id, target_company_id)
                )

                if membership is None:
                    cache_errors.append(
                        f"company={legacy_company_id} "
                        f"legacy_user={legacy_user_id} "
                        f"current_user={current_user_id} missing_membership"
                    )
                    continue

                permission_ids = set(
                    direct_permissions.get(legacy_user_id, set())
                )

                for role_id in user_roles.get(legacy_user_id, set()):
                    permission_ids.update(
                        role_permissions.get(role_id, set())
                    )

                names = {
                    permissions.get(permission_id, "")
                    for permission_id in permission_ids
                }
                names.discard("")

                all_access = "access_all_locations" in names

                legacy_location_ids: set[str] = set()
                for permission_name in names:
                    if permission_name.startswith("location."):
                        raw_location = permission_name.split(".", 1)[1].strip()
                        if raw_location.isdigit():
                            legacy_location_ids.add(raw_location)

                grant_branch_ids: list[int] = []

                for legacy_location_id in sorted(
                    legacy_location_ids, key=natural_key
                ):
                    current_branch_id = branch_map_by_pair.get(
                        (legacy_company_id, legacy_location_id)
                    )
                    if current_branch_id is None:
                        unknown_locations.append(
                            (
                                legacy_company_id,
                                legacy_user_id,
                                legacy_location_id,
                            )
                        )
                        continue

                    branch = branches.get(current_branch_id)
                    if branch is None or int(branch.company_id) != target_company_id:
                        wrong_company_locations.append(
                            (
                                legacy_company_id,
                                legacy_user_id,
                                legacy_location_id,
                                current_branch_id,
                            )
                        )
                        continue

                    grant_branch_ids.append(current_branch_id)

                if all_access:
                    legacy_mode = BranchAccessMode.ALL
                elif legacy_location_ids:
                    legacy_mode = BranchAccessMode.RESTRICTED
                else:
                    legacy_mode = BranchAccessMode.LEGACY_UNRESOLVED

                legacy_plan_by_membership[int(membership.id)] = {
                    "legacy_company_id": legacy_company_id,
                    "legacy_user_id": legacy_user_id,
                    "mode": clean(legacy_mode),
                    "grant_branch_ids": sorted(set(grant_branch_ids)),
                    "raw_location_ids": sorted(
                        legacy_location_ids, key=natural_key
                    ),
                    "has_access_all_locations": all_access,
                }

        progress("[A3] 4/6 Comparing current policy with legacy plan...")

        mismatch_rows: list[str] = []
        current_mode_counts: Counter[str] = Counter()
        legacy_mode_counts: Counter[str] = Counter()

        company_memberships: dict[int, list[Any]] = defaultdict(list)
        for membership in memberships:
            company_memberships[int(membership.company_id)].append(membership)

        lines.extend(
            [
                "",
                "=" * 120,
                "EXACT ACCESS BY COMPANY / USER",
                "=" * 120,
            ]
        )

        for legacy_company_id in sorted(
            EXPECTED_COMPANIES,
            key=lambda lid: (
                -sum(
                    1
                    for (lcid, _), _bid in branch_map_by_pair.items()
                    if lcid == lid
                ),
                natural_key(lid),
            ),
        ):
            company_id = company_target[legacy_company_id]
            company_members = company_memberships.get(company_id, [])

            company_branch_ids = sorted(
                bid
                for (lcid, _), bid in branch_map_by_pair.items()
                if lcid == legacy_company_id
            )

            company_name = ""
            if company_members:
                company_name = clean(company_members[0].company.name)

            lines.extend(
                [
                    "",
                    "-" * 120,
                    f"COMPANY legacy_id={legacy_company_id}"
                    f" | current_id={company_id}"
                    f" | name={company_name}"
                    f" | branch_count={len(company_branch_ids)}"
                    f" | membership_count={len(company_members)}",
                ]
            )

            for membership in sorted(
                company_members,
                key=lambda m: (
                    0 if bool(m.is_primary) else 1,
                    int(m.id),
                ),
            ):
                current_user_id = int(membership.user_id)
                legacy_pair = legacy_user_by_current_company.get(
                    (current_user_id, company_id)
                )
                legacy_user_id = legacy_pair[1] if legacy_pair else ""

                policy = policies.get(int(membership.id))
                legacy_plan = legacy_plan_by_membership.get(int(membership.id))

                username = clean(getattr(membership.user, "username", ""))

                if policy is None:
                    current_mode = "MISSING_POLICY"
                    current_grant_ids: list[int] = []
                    accessible_ids: list[int] = []
                    default_branch_id = None
                    last_active_branch_id = None
                else:
                    current_mode = clean(policy.mode)
                    current_grant_ids = sorted(
                        int(grant.branch_id)
                        for grant in grants_by_policy.get(int(policy.id), [])
                    )
                    accessible_ids = sorted(
                        int(x)
                        for x in accessible_branches(membership).values_list(
                            "id", flat=True
                        )
                    )
                    default_branch_id = policy.default_branch_id
                    last_active_branch_id = policy.last_active_branch_id

                legacy_mode = (
                    clean(legacy_plan.get("mode"))
                    if legacy_plan
                    else "MISSING_LEGACY_PLAN"
                )
                legacy_grant_ids = (
                    sorted(
                        int(x)
                        for x in legacy_plan.get("grant_branch_ids", [])
                    )
                    if legacy_plan
                    else []
                )

                current_mode_counts[current_mode] += 1
                legacy_mode_counts[legacy_mode] += 1

                mode_match = current_mode == legacy_mode

                if current_mode == clean(BranchAccessMode.RESTRICTED):
                    grant_match = current_grant_ids == legacy_grant_ids
                elif current_mode == clean(BranchAccessMode.ALL):
                    grant_match = len(current_grant_ids) == 0
                elif current_mode == clean(BranchAccessMode.LEGACY_UNRESOLVED):
                    grant_match = len(current_grant_ids) == 0
                else:
                    grant_match = False

                expected_accessible_ids: list[int] = []

                if current_mode == clean(BranchAccessMode.ALL):
                    expected_accessible_ids = sorted(
                        bid
                        for bid in company_branch_ids
                        if branches.get(bid) is not None
                        and bool(branches[bid].is_active)
                    )
                elif current_mode == clean(BranchAccessMode.RESTRICTED):
                    expected_accessible_ids = sorted(
                        bid
                        for bid in current_grant_ids
                        if branches.get(bid) is not None
                        and bool(branches[bid].is_active)
                    )

                accessible_match = accessible_ids == expected_accessible_ids

                overall_match = (
                    mode_match and grant_match and accessible_match
                )

                if not overall_match:
                    mismatch_rows.append(
                        f"company={legacy_company_id}"
                        f"|membership={membership.id}"
                        f"|legacy_user={legacy_user_id}"
                        f"|current_user={current_user_id}"
                        f"|current_mode={current_mode}"
                        f"|legacy_mode={legacy_mode}"
                        f"|current_grants={current_grant_ids}"
                        f"|legacy_grants={legacy_grant_ids}"
                        f"|accessible={accessible_ids}"
                        f"|expected_accessible={expected_accessible_ids}"
                    )

                lines.append(
                    f"USER legacy_id={legacy_user_id or 'UNMAPPED'}"
                    f" | current_id={current_user_id}"
                    f" | username={username}"
                    f" | membership_id={membership.id}"
                    f" | primary={yesno(membership.is_primary)}"
                )

                lines.append(
                    f"  CURRENT_POLICY mode={current_mode}"
                    f" | policy_id={policy.id if policy else ''}"
                    f" | default_branch_id={default_branch_id or ''}"
                    f" | last_active_branch_id={last_active_branch_id or ''}"
                )

                if policy is not None:
                    if default_branch_id:
                        pair = legacy_branch_by_current.get(
                            int(default_branch_id)
                        )
                        legacy_branch_id = pair[1] if pair else ""
                        lines.append(
                            "  CURRENT_DEFAULT="
                            + branch_label(
                                branches.get(int(default_branch_id)),
                                legacy_branch_id,
                            )
                        )

                    if last_active_branch_id:
                        pair = legacy_branch_by_current.get(
                            int(last_active_branch_id)
                        )
                        legacy_branch_id = pair[1] if pair else ""
                        lines.append(
                            "  CURRENT_LAST_ACTIVE="
                            + branch_label(
                                branches.get(int(last_active_branch_id)),
                                legacy_branch_id,
                            )
                        )

                if current_grant_ids:
                    rendered = []
                    for bid in current_grant_ids:
                        pair = legacy_branch_by_current.get(bid)
                        lbid = pair[1] if pair else ""
                        grant = next(
                            (
                                g
                                for g in grants_by_policy.get(
                                    int(policy.id), []
                                )
                                if int(g.branch_id) == bid
                            ),
                            None,
                        )
                        permissions = (
                            list(grant.permissions or [])
                            if grant is not None
                            else []
                        )
                        rendered.append(
                            branch_label(branches.get(bid), lbid)
                            + f":permissions={permissions}"
                        )
                    lines.append(
                        "  CURRENT_GRANTS=" + "; ".join(rendered)
                    )
                else:
                    lines.append("  CURRENT_GRANTS=NONE")

                if accessible_ids:
                    rendered = []
                    for bid in accessible_ids:
                        pair = legacy_branch_by_current.get(bid)
                        lbid = pair[1] if pair else ""
                        rendered.append(
                            branch_label(branches.get(bid), lbid)
                        )
                    lines.append(
                        "  CURRENT_EFFECTIVE_ACCESS=" + "; ".join(rendered)
                    )
                else:
                    lines.append("  CURRENT_EFFECTIVE_ACCESS=NONE")

                if legacy_plan:
                    lines.append(
                        f"  LEGACY_DERIVED mode={legacy_mode}"
                        f" | access_all_locations="
                        f"{yesno(legacy_plan['has_access_all_locations'])}"
                        f" | raw_location_ids="
                        f"{legacy_plan['raw_location_ids']}"
                    )

                    if legacy_grant_ids:
                        rendered = []
                        for bid in legacy_grant_ids:
                            pair = legacy_branch_by_current.get(bid)
                            lbid = pair[1] if pair else ""
                            rendered.append(
                                branch_label(branches.get(bid), lbid)
                            )
                        lines.append(
                            "  LEGACY_DERIVED_GRANTS="
                            + "; ".join(rendered)
                        )
                    else:
                        lines.append(
                            "  LEGACY_DERIVED_GRANTS=NONE"
                        )
                else:
                    lines.append("  LEGACY_DERIVED=MISSING")

                lines.append(
                    f"  RECONCILIATION mode_match={yesno(mode_match)}"
                    f" | grant_match={yesno(grant_match)}"
                    f" | effective_access_match={yesno(accessible_match)}"
                    f" | overall={yesno(overall_match)}"
                )

        progress("[A3] 5/6 Building summary...")

        lines.extend(
            [
                "",
                "=" * 120,
                "A3 SUMMARY",
                "=" * 120,
                f"COMPANIES_IN_SCOPE={len(EXPECTED_COMPANIES)}",
                f"MEMBERSHIPS_IN_SCOPE={len(memberships)}",
                f"POLICIES_IN_SCOPE={len(policies)}",
                f"GRANTS_IN_SCOPE={sum(len(v) for v in grants_by_policy.values())}",
                f"LEGACY_PLAN_ROWS={len(legacy_plan_by_membership)}",
                f"CURRENT_MODE_COUNTS={dict(sorted(current_mode_counts.items()))}",
                f"LEGACY_MODE_COUNTS={dict(sorted(legacy_mode_counts.items()))}",
                f"CACHE_ERROR_COUNT={len(cache_errors)}",
                f"UNKNOWN_LOCATION_COUNT={len(unknown_locations)}",
                f"WRONG_COMPANY_LOCATION_COUNT={len(wrong_company_locations)}",
                f"RECONCILIATION_MISMATCH_COUNT={len(mismatch_rows)}",
            ]
        )

        if cache_errors:
            lines.append("CACHE_ERRORS_BEGIN")
            lines.extend(cache_errors)
            lines.append("CACHE_ERRORS_END")

        if unknown_locations:
            lines.append("UNKNOWN_LOCATIONS_BEGIN")
            for row in unknown_locations:
                lines.append("|".join(row))
            lines.append("UNKNOWN_LOCATIONS_END")

        if wrong_company_locations:
            lines.append("WRONG_COMPANY_LOCATIONS_BEGIN")
            for row in wrong_company_locations:
                lines.append("|".join(map(str, row)))
            lines.append("WRONG_COMPANY_LOCATIONS_END")

        if mismatch_rows:
            lines.append("RECONCILIATION_MISMATCHES_BEGIN")
            lines.extend(mismatch_rows)
            lines.append("RECONCILIATION_MISMATCHES_END")

        result = (
            "PASS"
            if not cache_errors
            and not wrong_company_locations
            and not mismatch_rows
            and len(legacy_plan_by_membership) == len(memberships)
            else "REVIEW_REQUIRED"
        )

        lines.extend(
            [
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
                f"A3_RESULT={result}",
                "=" * 120,
            ]
        )

        progress("[A3] 6/6 Writing report...")

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        progress("===== PRIMEYACC COMPANY SPLIT A3 =====")
        progress(f"A3_RESULT={result}")
        progress(f"COMPANIES_IN_SCOPE={len(EXPECTED_COMPANIES)}")
        progress(f"MEMBERSHIPS_IN_SCOPE={len(memberships)}")
        progress(f"POLICIES_IN_SCOPE={len(policies)}")
        progress(
            f"GRANTS_IN_SCOPE="
            f"{sum(len(v) for v in grants_by_policy.values())}"
        )
        progress(
            f"RECONCILIATION_MISMATCH_COUNT={len(mismatch_rows)}"
        )
        progress(f"CACHE_ERROR_COUNT={len(cache_errors)}")
        progress(
            f"WRONG_COMPANY_LOCATION_COUNT="
            f"{len(wrong_company_locations)}"
        )
        progress("DATABASE_WRITES=0")
        progress(f"REPORT={REPORT.name}")
        progress(f"SIZE={REPORT.stat().st_size}")
        progress(f"SHA256={digest}")
        return 0

    except KeyboardInterrupt:
        lines.extend(
            [
                "",
                "A3_RESULT=INTERRUPTED",
                "DATABASE_WRITES=0",
                "SOURCE_NETWORK_CALLS=0",
            ]
        )
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA3_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend(
            [
                "",
                "=" * 120,
                "A3_RESULT=FAIL",
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
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A3 =====", flush=True)
        print("A3_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

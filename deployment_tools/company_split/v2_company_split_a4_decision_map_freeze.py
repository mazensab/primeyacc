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
REPORT = ROOT / "v2_company_split_a4_decision_map_freeze.txt"
JSON_MAP = ROOT / "v2_company_split_decision_map.json"
SOURCE_SYSTEM = "mhamcloud_v1"

DECISIONS = {
    "188": {"mode": "SPLIT", "groups": [["215","772"],["216","775"],["217","770"],["218","773"],["219","774"],["220","771"]]},
    "478": {"mode": "SPLIT", "groups": [["578"],["579"],["580"],["581"],["582"],["583"],["584"],["585"],["717"],["718"]]},
    "88": {"mode": "SPLIT", "groups": [["106","752"],["107","751"],["108","753"],["735","739"]]},
    "195": {"mode": "SPLIT", "groups": [["227"],["228"],["229"],["230"],["231"],["232"],["416"]], "preserve_inactive": ["229","230","232","416"]},
    "556": {"mode": "SPLIT", "groups": [["676"],["677"],["678"],["706"],["778"],["779"],["781"]]},
    "174": {"mode": "SPLIT", "groups": [["197"],["207"],["208"],["209"],["210"]]},
    "290": {"mode": "SPLIT", "groups": [["353"],["354"],["355"],["356"],["357"]]},
    "299": {"mode": "SPLIT", "groups": [["367"],["368"],["369"]]},

    "473": {"mode": "EXCLUDE", "branches": ["569","572","573","574","587","590","591"]},
    "113": {"mode": "EXCLUDE", "branches": ["134","243","244","245","246","247","248"]},
    "431": {"mode": "EXCLUDE", "branches": ["519","522","523","524","525","526"]},
    "307": {"mode": "EXCLUDE", "branches": ["383","384","666","667"]},
    "429": {"mode": "EXCLUDE", "branches": ["517","596","597"]},
    "119": {"mode": "EXCLUDE", "branches": ["140","154","155"]},
    "75": {"mode": "EXCLUDE", "branches": ["88","89","444"]},

    "76": {"mode": "PARTIAL_INCLUDE", "include": ["92"], "exclude": ["90","91"]},
}

EXPECTED_THREE_PLUS = set(DECISIONS)
EXPECTED_SCOPE_BRANCHES = 93
BASELINE_MAPPED_COMPANIES = 319
BASELINE_MAPPED_BRANCHES = 450
UNTOUCHED_1_OR_2_BRANCH_COMPANIES = 303

USER_ACCESS_POLICY = {
    "ALL": "Preserve access to every resulting Company from the source; ALL remains ALL within each resulting Company.",
    "RESTRICTED": "Create/retain membership only where original granted branches intersect the resulting Company; preserve only that intersection.",
    "LEGACY_UNRESOLVED": "Do not create new access automatically; preserve fail-closed semantics pending explicit decision.",
    "USER_DELETE": "Never delete a User row until proving it has no other CompanyMembership/global shared dependency.",
}


def clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).replace("\r", " ").replace("\n", " ").strip()


def nkey(v: Any):
    s = clean(v)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def yesno(v: Any) -> str:
    return "YES" if bool(v) else "NO"


def git(*args: str) -> str:
    cp = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=False
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
    m = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not m:
        raise RuntimeError("Unable to detect DJANGO_SETTINGS_MODULE")
    return m.group(1)


def subscription_basis(legacy_company_id, company_id, rows_by_company, map_by_target):
    rows = rows_by_company.get(company_id, [])
    today = date.today()
    migration = []
    current = []

    for sub in rows:
        smap = map_by_target.get((legacy_company_id, clean(sub.id)))
        meta = dict(getattr(smap, "metadata", {}) or {}) if smap else {}
        if meta.get("migration_current") is True:
            migration.append((sub, smap))

        status = clean(getattr(sub, "status", "")).upper()
        start = getattr(sub, "start_date", None)
        end = getattr(sub, "end_date", None)
        if (
            status in {"ACTIVE","TRIAL","TRIALING","GRACE","CURRENT","PAID"}
            and (start is None or start <= today)
            and (end is None or end >= today)
        ):
            current.append((sub, smap))

    if len(migration) == 1:
        return "MIGRATION_CURRENT", migration[0]
    if len(current) == 1:
        return "DATE_CURRENT", current[0]
    if rows:
        latest = max(
            rows,
            key=lambda s: (
                getattr(s, "end_date", None) or date.min,
                getattr(s, "start_date", None) or date.min,
                int(s.id),
            ),
        )
        return "LATEST_END_FALLBACK", (
            latest, map_by_target.get((legacy_company_id, clean(latest.id)))
        )
    return "NONE", (None, None)


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A4 DECISION MAP FREEZE",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_VALIDATION",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={git('branch','--show-current')}",
        f"HEAD={git('rev-parse','HEAD')}",
        f"ORIGIN_MAIN={git('rev-parse','origin/main')}",
    ]

    tracked = git("status","--short","--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not tracked else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        print("[A4] 1/5 Loading Django...", flush=True)
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.db import connection
        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company
        from subscriptions.models import CompanySubscription

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Safety stop: expected PostgreSQL, got {connection.vendor}")

        with connection.cursor() as cursor:
            cursor.execute("SET default_transaction_read_only = on")
            cursor.execute("SET statement_timeout = 10000")

        print("[A4] 2/5 Loading mappings...", flush=True)

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM, source_table="business"
            ).select_related("company")
        )
        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM, source_table="business_locations"
            )
        )
        subscription_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM, source_table="subscriptions"
            )
        )

        company_map = {clean(m.legacy_id): m for m in company_maps}
        branches_by_company = defaultdict(list)
        branch_map = {}

        for m in branch_maps:
            lcid = clean(m.legacy_company_id)
            lbid = clean(m.legacy_id)
            branches_by_company[lcid].append(m)
            branch_map[(lcid, lbid)] = m

        derived_three_plus = {
            lcid for lcid in company_map
            if len(branches_by_company.get(lcid, [])) >= 3
        }

        if derived_three_plus != EXPECTED_THREE_PLUS:
            raise RuntimeError(
                "Decision scope mismatch: "
                f"missing={sorted(derived_three_plus-EXPECTED_THREE_PLUS, key=nkey)} "
                f"extra={sorted(EXPECTED_THREE_PLUS-derived_three_plus, key=nkey)}"
            )

        current_company_ids = []
        company_id_by_legacy = {}
        for lcid in sorted(EXPECTED_THREE_PLUS, key=nkey):
            m = company_map[lcid]
            raw = clean(m.target_object_id) or clean(m.company_id)
            if not raw.isdigit():
                raise RuntimeError(f"Missing current company id for legacy {lcid}")
            cid = int(raw)
            company_id_by_legacy[lcid] = cid
            current_company_ids.append(cid)

        companies = Company.objects.in_bulk(current_company_ids)

        current_branch_ids = []
        for lcid in EXPECTED_THREE_PLUS:
            for m in branches_by_company[lcid]:
                raw = clean(m.target_object_id)
                if raw.isdigit():
                    current_branch_ids.append(int(raw))
        branches = Branch.objects.in_bulk(current_branch_ids)

        subs_by_company = defaultdict(list)
        for sub in (
            CompanySubscription.objects.filter(company_id__in=current_company_ids)
            .select_related("plan")
            .order_by("company_id","start_date","id")
        ):
            subs_by_company[int(sub.company_id)].append(sub)

        sub_map_by_target = {}
        for m in subscription_maps:
            sub_map_by_target[(clean(m.legacy_company_id), clean(m.target_object_id))] = m

        print("[A4] 3/5 Validating decisions...", flush=True)

        errors = []
        warnings = []
        mode_counts = Counter()
        scope_branch_count = 0
        retained_branch_count = 0
        excluded_branch_count = 0
        split_output_count = 0
        partial_output_count = 0

        machine_companies = []

        lines.extend(["", "=" * 120, "APPROVED DECISION MAP", "=" * 120])

        mode_order = {"SPLIT": 0, "PARTIAL_INCLUDE": 1, "EXCLUDE": 2}

        for lcid in sorted(
            EXPECTED_THREE_PLUS,
            key=lambda x: (mode_order.get(DECISIONS[x]["mode"], 9), nkey(x))
        ):
            decision = DECISIONS[lcid]
            mode = decision["mode"]
            mode_counts[mode] += 1

            cid = company_id_by_legacy[lcid]
            company = companies.get(cid)
            name = clean(getattr(company, "name", "") if company else "")
            actual = {clean(m.legacy_id) for m in branches_by_company[lcid]}
            scope_branch_count += len(actual)

            basis_kind, (basis_sub, basis_map) = subscription_basis(
                lcid, cid, subs_by_company, sub_map_by_target
            )

            basis_payload = None
            if basis_sub is not None:
                meta = dict(getattr(basis_map, "metadata", {}) or {}) if basis_map else {}
                basis_payload = {
                    "selection": basis_kind,
                    "legacy_subscription_id": clean(basis_map.legacy_id) if basis_map else None,
                    "current_subscription_id_snapshot": int(basis_sub.id),
                    "legacy_package_id": clean(meta.get("legacy_package_id")),
                    "plan_id_snapshot": int(basis_sub.plan_id) if basis_sub.plan_id else None,
                    "plan_name_snapshot": clean(getattr(basis_sub.plan, "name", "") if basis_sub.plan else ""),
                    "status_snapshot": clean(basis_sub.status),
                    "billing_cycle_snapshot": clean(basis_sub.billing_cycle),
                    "start_date_snapshot": basis_sub.start_date.isoformat() if basis_sub.start_date else None,
                    "end_date_snapshot": basis_sub.end_date.isoformat() if basis_sub.end_date else None,
                    "price_snapshot": clean(basis_sub.price),
                    "total_amount_snapshot": clean(basis_sub.total_amount),
                }

            lines.extend([
                "",
                "-" * 120,
                f"COMPANY legacy_id={lcid} | current_id={cid} | name={name} | mode={mode} | branch_count={len(actual)}",
                f"SOURCE_SUBSCRIPTION_BASIS={basis_kind}",
            ])

            if basis_payload:
                lines.append(
                    "SOURCE_SUBSCRIPTION"
                    f" legacy_id={basis_payload['legacy_subscription_id']}"
                    f" | current_id={basis_payload['current_subscription_id_snapshot']}"
                    f" | legacy_package_id={basis_payload['legacy_package_id']}"
                    f" | plan_id={basis_payload['plan_id_snapshot']}"
                    f" | plan_name={basis_payload['plan_name_snapshot']}"
                    f" | status={basis_payload['status_snapshot']}"
                    f" | start={basis_payload['start_date_snapshot']}"
                    f" | end={basis_payload['end_date_snapshot']}"
                    f" | price={basis_payload['price_snapshot']}"
                )

            entry = {
                "legacy_company_id": lcid,
                "current_company_id_snapshot": cid,
                "source_company_name_snapshot": name,
                "mode": mode,
                "source_subscription_snapshot": basis_payload,
            }

            def branch_entry(lbid: str):
                m = branch_map.get((lcid, lbid))
                raw = clean(m.target_object_id) if m else ""
                bid = int(raw) if raw.isdigit() else None
                b = branches.get(bid) if bid else None
                if not m or not bid or not b:
                    errors.append(f"company={lcid}: branch={lbid} mapping/current row missing")
                    return {
                        "legacy_branch_id": lbid,
                        "current_branch_id_snapshot": bid,
                    }

                if int(b.company_id) != cid:
                    errors.append(
                        f"company={lcid}: branch={lbid}/{bid} belongs to company={b.company_id}, expected={cid}"
                    )

                return {
                    "legacy_branch_id": lbid,
                    "current_branch_id_snapshot": bid,
                    "name_snapshot": clean(b.name),
                    "status_snapshot": clean(b.status),
                    "is_active_snapshot": bool(b.is_active),
                    "is_default_snapshot": bool(b.is_default),
                }

            if mode == "SPLIT":
                groups = decision["groups"]
                flat = [x for group in groups for x in group]

                if len(flat) != len(set(flat)):
                    errors.append(f"company={lcid}: duplicate branch across split groups")
                if set(flat) != actual:
                    errors.append(
                        f"company={lcid}: split coverage mismatch "
                        f"missing={sorted(actual-set(flat), key=nkey)} "
                        f"extra={sorted(set(flat)-actual, key=nkey)}"
                    )

                preserve_inactive = set(decision.get("preserve_inactive", []))
                output_groups = []

                for i, group in enumerate(groups, start=1):
                    split_output_count += 1
                    retained_branch_count += len(group)
                    bentries = [branch_entry(lbid) for lbid in group]

                    for be in bentries:
                        if (
                            be.get("is_active_snapshot") is False
                            and be["legacy_branch_id"] not in preserve_inactive
                        ):
                            warnings.append(
                                f"company={lcid}: inactive split branch {be['legacy_branch_id']} not explicitly flagged"
                            )

                    gid = f"{lcid}-G{i:02d}"
                    lines.append(
                        f"OUTPUT_GROUP {gid} | legacy_branches={','.join(group)}"
                        f" | company_name_policy=FIRST_BRANCH_NAME_AT_CUTOVER"
                    )
                    for be in bentries:
                        lines.append(
                            f"  BRANCH legacy_id={be.get('legacy_branch_id')}"
                            f" | current_id={be.get('current_branch_id_snapshot')}"
                            f" | name={be.get('name_snapshot','')}"
                            f" | active={yesno(be.get('is_active_snapshot')) if 'is_active_snapshot' in be else ''}"
                        )

                    output_groups.append({
                        "group_id": gid,
                        "company_name_policy": "FIRST_BRANCH_NAME_AT_CUTOVER",
                        "branches": bentries,
                    })

                entry["output_groups"] = output_groups
                entry["subscription_policy"] = "CLONE_SOURCE_CURRENT_AT_CUTOVER"
                entry["user_access_policy"] = USER_ACCESS_POLICY

            elif mode == "EXCLUDE":
                approved = set(decision["branches"])
                if approved != actual:
                    errors.append(
                        f"company={lcid}: exclude coverage mismatch "
                        f"missing={sorted(actual-approved, key=nkey)} "
                        f"extra={sorted(approved-actual, key=nkey)}"
                    )

                excluded_branch_count += len(approved)
                excluded = [branch_entry(x) for x in sorted(approved, key=nkey)]
                for be in excluded:
                    lines.append(
                        f"EXCLUDE_BRANCH legacy_id={be.get('legacy_branch_id')}"
                        f" | current_id={be.get('current_branch_id_snapshot')}"
                        f" | name={be.get('name_snapshot','')}"
                        f" | active={yesno(be.get('is_active_snapshot')) if 'is_active_snapshot' in be else ''}"
                    )

                entry["exclude_from_future_migration"] = True
                entry["delete_locally_after_dependency_audit"] = True
                entry["excluded_branches"] = excluded
                entry["subscription_policy"] = "NONE"
                entry["user_delete_rule"] = USER_ACCESS_POLICY["USER_DELETE"]

            elif mode == "PARTIAL_INCLUDE":
                include = set(decision["include"])
                exclude = set(decision["exclude"])

                if include & exclude:
                    errors.append(f"company={lcid}: partial include/exclude overlap")
                if include | exclude != actual:
                    errors.append(
                        f"company={lcid}: partial coverage mismatch "
                        f"missing={sorted(actual-(include|exclude), key=nkey)} "
                        f"extra={sorted((include|exclude)-actual, key=nkey)}"
                    )

                retained_branch_count += len(include)
                excluded_branch_count += len(exclude)
                partial_output_count += 1

                kept = [branch_entry(x) for x in sorted(include, key=nkey)]
                removed = [branch_entry(x) for x in sorted(exclude, key=nkey)]

                for be in kept:
                    lines.append(
                        f"KEEP_BRANCH legacy_id={be.get('legacy_branch_id')}"
                        f" | current_id={be.get('current_branch_id_snapshot')}"
                        f" | name={be.get('name_snapshot','')}"
                        f" | active={yesno(be.get('is_active_snapshot')) if 'is_active_snapshot' in be else ''}"
                    )
                for be in removed:
                    lines.append(
                        f"EXCLUDE_BRANCH legacy_id={be.get('legacy_branch_id')}"
                        f" | current_id={be.get('current_branch_id_snapshot')}"
                        f" | name={be.get('name_snapshot','')}"
                        f" | active={yesno(be.get('is_active_snapshot')) if 'is_active_snapshot' in be else ''}"
                    )

                entry["keep_source_company"] = True
                entry["kept_branches"] = kept
                entry["excluded_branches"] = removed
                entry["subscription_policy"] = "KEEP_SOURCE_CURRENT"
                entry["user_delete_rule"] = USER_ACCESS_POLICY["USER_DELETE"]

            machine_companies.append(entry)

        if scope_branch_count != EXPECTED_SCOPE_BRANCHES:
            errors.append(
                f"scope branch count expected={EXPECTED_SCOPE_BRANCHES}, got={scope_branch_count}"
            )

        final_companies_from_scope = split_output_count + partial_output_count
        expected_final_mapped_companies = (
            UNTOUCHED_1_OR_2_BRANCH_COMPANIES + final_companies_from_scope
        )
        expected_final_branches = BASELINE_MAPPED_BRANCHES - excluded_branch_count

        summary = {
            "source_companies_in_scope": len(EXPECTED_THREE_PLUS),
            "source_branches_in_scope": scope_branch_count,
            "split_source_companies": mode_counts["SPLIT"],
            "exclude_source_companies": mode_counts["EXCLUDE"],
            "partial_include_source_companies": mode_counts["PARTIAL_INCLUDE"],
            "split_output_companies": split_output_count,
            "partial_output_companies": partial_output_count,
            "final_companies_from_16_scope": final_companies_from_scope,
            "retained_branches_from_16_scope": retained_branch_count,
            "excluded_branches_from_16_scope": excluded_branch_count,
            "expected_post_transform_mapped_companies": expected_final_mapped_companies,
            "expected_post_transform_branches": expected_final_branches,
        }

        lines.extend([
            "",
            "=" * 120,
            "A4 DECISION FREEZE SUMMARY",
            "=" * 120,
            *[f"{k.upper()}={v}" for k, v in summary.items()],
            f"DECISION_MODE_COUNTS={dict(mode_counts)}",
            f"VALIDATION_ERROR_COUNT={len(errors)}",
            f"VALIDATION_WARNING_COUNT={len(warnings)}",
        ])

        if warnings:
            lines.append("WARNINGS_BEGIN")
            lines.extend(warnings)
            lines.append("WARNINGS_END")

        if errors:
            lines.append("ERRORS_BEGIN")
            lines.extend(errors)
            lines.append("ERRORS_END")

        result = "PASS" if not errors else "FAIL"

        frozen = {
            "schema": "primeyacc.company_split_decision_map.v1",
            "source_system": SOURCE_SYSTEM,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "identity_key": "LEGACY_IDS_AUTHORITATIVE_CURRENT_IDS_SNAPSHOT_ONLY",
            "baseline": {
                "mapped_companies": BASELINE_MAPPED_COMPANIES,
                "mapped_branches": BASELINE_MAPPED_BRANCHES,
                "untouched_companies_with_1_or_2_branches": UNTOUCHED_1_OR_2_BRANCH_COMPANIES,
            },
            "policies": {
                "split_subscription": "Clone latest authoritative source subscription at cutover; local subscription data is audit evidence only.",
                "exclude": "Never sync excluded legacy Company IDs again; local deletion only after dependency/share audit.",
                "partial_include": "Only explicitly included legacy Branch IDs may survive/resync.",
                "user_access": USER_ACCESS_POLICY,
            },
            "summary": summary,
            "companies": machine_companies,
        }

        print("[A4] 4/5 Writing TXT + JSON...", flush=True)

        JSON_MAP.write_text(
            json.dumps(frozen, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        json_sha = hashlib.sha256(JSON_MAP.read_bytes()).hexdigest().upper()

        lines.extend([
            f"JSON_MAP={JSON_MAP.name}",
            f"JSON_MAP_SIZE={JSON_MAP.stat().st_size}",
            f"JSON_MAP_SHA256={json_sha}",
            "DATABASE_WRITES=0",
            f"A4_RESULT={result}",
            "=" * 120,
        ])

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report_sha = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("[A4] 5/5 Complete.", flush=True)
        print("===== PRIMEYACC COMPANY SPLIT A4 DECISION MAP FREEZE =====")
        print(f"A4_RESULT={result}")
        for k, v in summary.items():
            print(f"{k.upper()}={v}")
        print(f"VALIDATION_ERROR_COUNT={len(errors)}")
        print(f"VALIDATION_WARNING_COUNT={len(warnings)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"JSON_MAP={JSON_MAP.name}")
        print(f"JSON_MAP_SIZE={JSON_MAP.stat().st_size}")
        print(f"JSON_MAP_SHA256={json_sha}")

        return 0 if result == "PASS" else 2

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A4_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        sha = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A4 DECISION MAP FREEZE =====")
        print("A4_RESULT=FAIL")
        print(f"ERROR={type(exc).__name__}: {exc}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={sha}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

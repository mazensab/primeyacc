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
A5B_REPORT = ROOT / "v2_company_split_a5b_targeted_closure_audit.txt"
A6E_REPORT = ROOT / "v2_company_split_a6e_final_4_payment_closure.txt"
A7_REPORT = ROOT / "v2_company_split_a7_master_clone_remap_audit.txt"
A7B_REPORT = ROOT / "v2_company_split_a7b_partial76_master_closure.txt"

REPORT = ROOT / "v2_company_split_a8_transformation_blueprint_freeze.txt"
MANIFEST = ROOT / "v2_company_split_transformation_manifest.json"

SOURCE_SYSTEM = "mhamcloud_v1"

EXPECTED_SHA = {
    "decision_map": "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7",
    "a5b": "CE0A30F6F30F32380F3997C220047F682BC30F7F21B95A08FE6D89C33991480A",
    "a6e": "97F98DAD8C3AC7CE8D86D6C4D5F8DA6E50ADE70ABED3853DBBD902ADE09F5332",
    "a7": "CED410C22A5F128B4A039832F9D5839AD2ACAF3A203D7FB0C3D1F325BFBB99BB",
    "a7b": "0810D2324DC16711A450D0AD1FA7D6D4922430B6D7AE74D1D9B0927103D5843D",
}

EXPECTED_BASELINE_COMPANIES = 319
EXPECTED_BASELINE_BRANCHES = 450
EXPECTED_FINAL_COMPANIES = 351
EXPECTED_FINAL_BRANCHES = 415
EXPECTED_SPLIT_SOURCE_COMPANIES = 8
EXPECTED_SPLIT_OUTPUT_COMPANIES = 47
EXPECTED_NEW_COMPANIES = 39
EXPECTED_FULL_EXCLUDED_COMPANIES = 7
EXPECTED_FULL_EXCLUDED_BRANCHES = 33
EXPECTED_PARTIAL_EXCLUDED_BRANCHES = 2
EXPECTED_TOTAL_EXCLUDED_BRANCHES = 35

# Frozen from A7B using LEGACY identities only.
PARTIAL_76_CATALOG_EXCLUSIONS = {
    "products": ["374553"],
    "variations": ["305466", "305477", "305486", "305492", "376285"],
}
PARTIAL_76_KEEP_CONTACTS = ["175"]

# Frozen from A6E using LEGACY identities only.
CUSTOMER_PAYMENT_ORPHAN_EXCEPTIONS = [
    {
        "legacy_company_id": "174",
        "legacy_payment_id": "1437151",
        "missing_legacy_transaction_id": "1388333",
        "retained_group": "174-G01",
        "branch_policy": "KEEP_NULL",
    },
    {
        "legacy_company_id": "290",
        "legacy_payment_id": "3376678",
        "missing_legacy_transaction_id": "3400717",
        "retained_group": "290-G01",
        "branch_policy": "KEEP_NULL",
    },
]

CLONE_ALL_FOUNDATION_MODELS = [
    "accounting.Account",
    "accounting.TaxRate",
    "accounting.AccountingRoutingRule",
    "accounting.AccountingSettings",
    "companies.CompanySettings",
    "catalog.CatalogCategory",
    "catalog.CatalogUnit",
    "treasury.TreasuryAccount",
]

USAGE_ROUTED_MASTER_MODELS = [
    "catalog.CatalogItem",
    "parties.BusinessParty",
]

COMPANY_CODE_PREFIX = "MHM-SPLIT"


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


def yesno(value: Any) -> str:
    return "YES" if bool(value) else "NO"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    m = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not m:
        raise RuntimeError("Could not detect DJANGO_SETTINGS_MODULE")
    return m.group(1)


def company_code_for(legacy_company_id: str, group_id: str) -> str:
    suffix = group_id.split("-G", 1)[-1] if "-G" in group_id else group_id
    return f"{COMPANY_CODE_PREFIX}-{legacy_company_id}-G{suffix}"


def assert_file(path: Path, expected_sha: str, label: str) -> str:
    if not path.exists():
        raise RuntimeError(f"Missing required artifact: {path.name}")
    actual = sha256(path)
    if actual != expected_sha:
        raise RuntimeError(
            f"{label} SHA mismatch expected={expected_sha} actual={actual}"
        )
    return actual


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute("SET statement_timeout = 60000")


def parse_int_field(text: str, key: str) -> int:
    m = re.search(rf"^{re.escape(key)}=(\d+)$", text, flags=re.M)
    if not m:
        raise RuntimeError(f"Could not parse {key}")
    return int(m.group(1))


def main() -> int:
    generated_at = datetime.now(timezone.utc).isoformat()

    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A8 TRANSFORMATION BLUEPRINT FREEZE",
        "=" * 120,
        f"GENERATED_AT_UTC={generated_at}",
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_BLUEPRINT_FREEZE",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={git('branch','--show-current')}",
        f"HEAD={git('rev-parse','HEAD')}",
        f"ORIGIN_MAIN={git('rev-parse','origin/main')}",
    ]

    tracked = git("status", "--short", "--untracked-files=no")
    dirty = bool(tracked)
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not dirty else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        print("[A8] 1/7 Validating all frozen artifacts...", flush=True)

        actual_sha = {
            "decision_map": assert_file(
                DECISION_MAP, EXPECTED_SHA["decision_map"], "Decision map"
            ),
            "a5b": assert_file(
                A5B_REPORT, EXPECTED_SHA["a5b"], "A5B"
            ),
            "a6e": assert_file(
                A6E_REPORT, EXPECTED_SHA["a6e"], "A6E"
            ),
            "a7": assert_file(
                A7_REPORT, EXPECTED_SHA["a7"], "A7"
            ),
            "a7b": assert_file(
                A7B_REPORT, EXPECTED_SHA["a7b"], "A7B"
            ),
        }

        decision = json.loads(
            DECISION_MAP.read_text(encoding="utf-8")
        )
        a5b_text = A5B_REPORT.read_text(encoding="utf-8", errors="replace")
        a6e_text = A6E_REPORT.read_text(encoding="utf-8", errors="replace")
        a7_text = A7_REPORT.read_text(encoding="utf-8", errors="replace")
        a7b_text = A7B_REPORT.read_text(encoding="utf-8", errors="replace")

        if "A5B_RESULT=PASS" not in a5b_text:
            raise RuntimeError("A5B is not PASS")
        if "A6E_RESULT=PASS" not in a6e_text:
            raise RuntimeError("A6E is not PASS")
        if "A7B_RESULT=PASS" not in a7b_text:
            raise RuntimeError("A7B is not PASS")

        if parse_int_field(a7b_text, "CATALOG_SHARED_KEEP") != 44:
            raise RuntimeError("A7B shared CatalogItem count changed")
        if parse_int_field(a7b_text, "CATALOG_EXCLUDED_ONLY_PURGE_CANDIDATE") != 5:
            raise RuntimeError("A7B excluded-only CatalogItem count changed")
        if parse_int_field(a7b_text, "PARTY_UNKNOWN_REF_COUNT") != 0:
            raise RuntimeError("A7B BusinessParty unknown refs are not zero")

        lines.extend([
            "",
            "===== FROZEN ARTIFACT CHAIN =====",
            f"DECISION_MAP_SHA256={actual_sha['decision_map']}",
            f"A5B_SHA256={actual_sha['a5b']}",
            f"A6E_SHA256={actual_sha['a6e']}",
            f"A7_SHA256={actual_sha['a7']}",
            f"A7B_SHA256={actual_sha['a7b']}",
        ])

        print("[A8] 2/7 Loading Django/current snapshot...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.db import connection

        from accounts.models import (
            BranchAccessMode,
            CompanyMembership,
            CompanyMembershipBranchGrant,
            CompanyMembershipBranchPolicy,
        )
        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company
        from subscriptions.models import CompanySubscription

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        mapped_company_count = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business",
        ).count()
        mapped_branch_count = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business_locations",
        ).count()

        if mapped_company_count != EXPECTED_BASELINE_COMPANIES:
            raise RuntimeError(
                f"Mapped company baseline changed expected={EXPECTED_BASELINE_COMPANIES} actual={mapped_company_count}"
            )
        if mapped_branch_count != EXPECTED_BASELINE_BRANCHES:
            raise RuntimeError(
                f"Mapped branch baseline changed expected={EXPECTED_BASELINE_BRANCHES} actual={mapped_branch_count}"
            )

        company_maps = {
            clean(row.legacy_id): row
            for row in LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
            )
        }

        branch_maps_by_company = defaultdict(list)
        branch_map_by_pair = {}

        for row in LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business_locations",
        ):
            lcid = clean(row.legacy_company_id)
            lbid = clean(row.legacy_id)
            branch_maps_by_company[lcid].append(row)
            branch_map_by_pair[(lcid, lbid)] = row

        print("[A8] 3/7 Building canonical legacy-keyed transformation manifest...", flush=True)

        manifest_companies = []
        split_count = 0
        exclude_count = 0
        partial_count = 0
        output_company_count = 0
        new_company_count = 0
        total_excluded_branches = 0
        code_candidates = []
        code_errors = []
        default_plan_errors = []
        branch_delta_errors = []

        company_code_field = Company._meta.get_field("company_code")
        company_code_max_length = int(company_code_field.max_length or 255)
        existing_company_codes = set(
            Company.objects.exclude(company_code="")
            .values_list("company_code", flat=True)
        )

        for cfg in sorted(
            decision.get("companies", []),
            key=lambda row: nkey(row["legacy_company_id"]),
        ):
            lcid = clean(cfg["legacy_company_id"])
            mode = clean(cfg["mode"])

            current_expected_branch_set = {
                clean(row.legacy_id)
                for row in branch_maps_by_company.get(lcid, [])
            }

            manifest_entry = {
                "legacy_company_id": lcid,
                "mode": mode,
                "expected_source_branch_ids": sorted(
                    current_expected_branch_set, key=nkey
                ),
                "delta_policy": "SAFETY_STOP_IF_SOURCE_BRANCH_SET_CHANGES",
            }

            if mode == "SPLIT":
                split_count += 1
                groups = []
                flattened = set()
                retained_groups = []

                for index, group in enumerate(cfg.get("output_groups", []), start=1):
                    gid = clean(group["group_id"])
                    legacy_branch_ids = [
                        clean(row["legacy_branch_id"])
                        for row in group.get("branches", [])
                    ]
                    flattened.update(legacy_branch_ids)

                    default_branch_legacy_id = legacy_branch_ids[0]
                    group_is_source = any(
                        bool(row.get("is_default_snapshot"))
                        for row in group.get("branches", [])
                    )

                    if group_is_source:
                        retained_groups.append(gid)

                    group_entry = {
                        "group_id": gid,
                        "source_company_survivor": group_is_source,
                        "legacy_branch_ids": legacy_branch_ids,
                        "anchor_branch_legacy_id": legacy_branch_ids[0],
                        "default_branch_legacy_id": default_branch_legacy_id,
                        "company_name_policy": "FRESH_ANCHOR_BRANCH_NAME_AT_EXECUTION",
                        "branch_status_policy": "PRESERVE",
                        "branch_default_policy": "FIRST_BRANCH_IN_GROUP_DEFAULT_TRUE_OTHERS_FALSE",
                    }

                    if group_is_source:
                        group_entry["company_code_policy"] = "KEEP_EXISTING_SOURCE_COMPANY_CODE"
                    else:
                        code = company_code_for(lcid, gid)
                        group_entry["company_code"] = code
                        group_entry["company_code_policy"] = "DETERMINISTIC_MANIFEST_CODE"
                        code_candidates.append(code)
                        new_company_count += 1

                        if len(code) > company_code_max_length:
                            code_errors.append(
                                f"{gid}: code length {len(code)} > max_length {company_code_max_length}"
                            )
                        if code in existing_company_codes:
                            code_errors.append(
                                f"{gid}: code already exists in current DB: {code}"
                            )

                    groups.append(group_entry)

                if flattened != current_expected_branch_set:
                    branch_delta_errors.append(
                        f"company={lcid}: manifest split branches != current mapped branches"
                    )
                if len(retained_groups) != 1:
                    default_plan_errors.append(
                        f"company={lcid}: expected exactly one source survivor group, got {retained_groups}"
                    )

                output_company_count += len(groups)

                manifest_entry.update({
                    "output_groups": groups,
                    "retained_source_group": retained_groups[0] if len(retained_groups) == 1 else None,
                    "new_company_identity_policy": {
                        "copy_from_source_company_fields": [
                            "activity_profile",
                            "activity_profile_ref",
                            "status",
                            "is_active",
                            "commercial_registration",
                            "tax_number",
                            "email",
                            "phone",
                            "mobile",
                            "whatsapp_number",
                            "country",
                            "building_number",
                            "street_name",
                            "district",
                            "city",
                            "region",
                            "postal_code",
                            "short_address",
                            "address",
                            "logo",
                            "currency_code",
                            "vat_percentage",
                            "trial_ends_at",
                            "suspended_at",
                            "suspended_reason",
                            "owner",
                            "settings",
                            "notes",
                        ],
                        "override_name_fields_from_anchor_branch": [
                            "name",
                            "name_ar",
                            "name_en",
                        ],
                        "provenance_field": "Company.extra_data.primey_company_split",
                    },
                })

            elif mode == "EXCLUDE":
                exclude_count += 1
                excluded_branches = [
                    clean(row["legacy_branch_id"])
                    for row in cfg.get("excluded_branches", [])
                ]
                total_excluded_branches += len(excluded_branches)

                if set(excluded_branches) != current_expected_branch_set:
                    branch_delta_errors.append(
                        f"company={lcid}: EXCLUDE branch set mismatch"
                    )

                manifest_entry.update({
                    "exclude_from_future_migration": True,
                    "delete_local_company_after_dependency_ordered_purge": True,
                    "legacy_branch_ids": sorted(excluded_branches, key=nkey),
                    "user_policy": "REMOVE_MEMBERSHIPS; DELETE_GLOBAL_USER_ONLY_IF_NO_REMAINING_MEMBERSHIP_OR_SHARED_DEPENDENCY",
                    "legacy_map_policy": "DELETE_SOURCE_COMPANY_SCOPED_LEGACY_MAPS_WITH_PURGED_DATA",
                })

            elif mode == "PARTIAL_INCLUDE":
                partial_count += 1

                kept = [
                    clean(row["legacy_branch_id"])
                    for row in cfg.get("kept_branches", [])
                ]
                excluded = [
                    clean(row["legacy_branch_id"])
                    for row in cfg.get("excluded_branches", [])
                ]
                total_excluded_branches += len(excluded)

                if set(kept) | set(excluded) != current_expected_branch_set:
                    branch_delta_errors.append(
                        f"company={lcid}: PARTIAL branch coverage mismatch"
                    )

                manifest_entry.update({
                    "keep_source_company": True,
                    "keep_legacy_branch_ids": kept,
                    "exclude_legacy_branch_ids": excluded,
                    "default_branch_after_transform": kept[0],
                    "membership_policy": {
                        "primary_admin": "KEEP_ADMIN_ALL_ON_SURVIVING_COMPANY",
                        "restricted_keep_if_grants_intersect_kept_branch": True,
                        "restricted_remove_if_grants_only_excluded_branches": True,
                    },
                    "partial_master_policy": {
                        "keep_contact_legacy_ids": PARTIAL_76_KEEP_CONTACTS,
                        "exclude_catalog_source_ids": PARTIAL_76_CATALOG_EXCLUSIONS,
                        "shared_catalog_policy": "KEEP",
                        "unreferenced_catalog_policy": "KEEP_CONSERVATIVE",
                    },
                })

                output_company_count += 1

            else:
                raise RuntimeError(f"Unsupported decision mode {mode} for {lcid}")

            manifest_companies.append(manifest_entry)

        if split_count != EXPECTED_SPLIT_SOURCE_COMPANIES:
            raise RuntimeError(
                f"Expected {EXPECTED_SPLIT_SOURCE_COMPANIES} split source companies, got {split_count}"
            )
        if exclude_count != EXPECTED_FULL_EXCLUDED_COMPANIES:
            raise RuntimeError(
                f"Expected {EXPECTED_FULL_EXCLUDED_COMPANIES} excluded source companies, got {exclude_count}"
            )
        if partial_count != 1:
            raise RuntimeError(f"Expected one partial company, got {partial_count}")
        if output_company_count != 48:
            raise RuntimeError(
                f"Expected 48 surviving output companies from 16-company scope, got {output_company_count}"
            )
        if new_company_count != EXPECTED_NEW_COMPANIES:
            raise RuntimeError(
                f"Expected {EXPECTED_NEW_COMPANIES} new Companies, got {new_company_count}"
            )
        if total_excluded_branches != EXPECTED_TOTAL_EXCLUDED_BRANCHES:
            raise RuntimeError(
                f"Expected {EXPECTED_TOTAL_EXCLUDED_BRANCHES} excluded branches, got {total_excluded_branches}"
            )
        if len(code_candidates) != len(set(code_candidates)):
            code_errors.append("Generated new Company codes are not unique inside manifest")

        print("[A8] 4/7 Building membership/subscription dry-run...", flush=True)

        # Current snapshot counts only. Canonical manifest remains legacy/policy keyed.
        scoped_legacy_ids = {
            clean(row["legacy_company_id"])
            for row in decision.get("companies", [])
        }
        current_company_id_by_legacy = {}
        for lcid in scoped_legacy_ids:
            cmap = company_maps.get(lcid)
            if cmap is None:
                raise RuntimeError(f"Missing current company map for {lcid}")
            raw = clean(cmap.target_object_id) or clean(cmap.company_id)
            if not raw.isdigit():
                raise RuntimeError(f"Missing current Company id for {lcid}")
            current_company_id_by_legacy[lcid] = int(raw)

        memberships = list(
            CompanyMembership.objects.filter(
                company_id__in=current_company_id_by_legacy.values()
            ).select_related("user", "company")
        )
        policies = {
            int(row.membership_id): row
            for row in CompanyMembershipBranchPolicy.objects.filter(
                membership_id__in=[m.id for m in memberships]
            )
        }
        grants_by_policy = defaultdict(set)
        for row in CompanyMembershipBranchGrant.objects.filter(
            policy_id__in=[p.id for p in policies.values()]
        ):
            grants_by_policy[int(row.policy_id)].add(int(row.branch_id))

        legacy_pair_by_current_branch = {}
        for (lcid, lbid), bmap in branch_map_by_pair.items():
            raw = clean(bmap.target_object_id)
            if raw.isdigit():
                legacy_pair_by_current_branch[int(raw)] = (lcid, lbid)

        membership_actions = Counter()
        expected_new_memberships = 0
        expected_removed_memberships = 0

        entry_by_legacy = {
            row["legacy_company_id"]: row
            for row in manifest_companies
        }

        for membership in memberships:
            lcid = next(
                (
                    legacy_id
                    for legacy_id, company_id
                    in current_company_id_by_legacy.items()
                    if company_id == int(membership.company_id)
                ),
                None,
            )
            if lcid is None:
                continue

            entry = entry_by_legacy[lcid]
            mode = entry["mode"]
            policy = policies.get(int(membership.id))
            access_mode = clean(policy.mode) if policy is not None else "MISSING"

            if mode == "EXCLUDE":
                expected_removed_memberships += 1
                membership_actions["DELETE_WITH_EXCLUDED_COMPANY"] += 1
                continue

            if mode == "PARTIAL_INCLUDE":
                if access_mode == clean(BranchAccessMode.RESTRICTED) and policy is not None:
                    grants = grants_by_policy.get(int(policy.id), set())
                    grant_legacy_branches = {
                        legacy_pair_by_current_branch[bid][1]
                        for bid in grants
                        if bid in legacy_pair_by_current_branch
                        and legacy_pair_by_current_branch[bid][0] == lcid
                    }
                    if (
                        grant_legacy_branches
                        and grant_legacy_branches
                        <= set(entry["exclude_legacy_branch_ids"])
                    ):
                        expected_removed_memberships += 1
                        membership_actions["PARTIAL_REMOVE_EXCLUDED_ONLY_RESTRICTED"] += 1
                    else:
                        membership_actions["PARTIAL_KEEP"] += 1
                else:
                    membership_actions["PARTIAL_KEEP"] += 1
                continue

            groups = entry["output_groups"]
            retained_group = entry["retained_source_group"]

            if (
                membership.is_primary
                and clean(membership.role).upper() == "ADMIN"
            ):
                target_groups = {row["group_id"] for row in groups}
                membership_actions["PRIMARY_ADMIN_TO_ALL_OUTPUTS"] += 1
            elif access_mode == clean(BranchAccessMode.ALL):
                target_groups = {row["group_id"] for row in groups}
                membership_actions["ALL_TO_ALL_OUTPUTS"] += 1
            elif access_mode == clean(BranchAccessMode.RESTRICTED) and policy is not None:
                grants = grants_by_policy.get(int(policy.id), set())
                target_groups = set()
                for bid in grants:
                    pair = legacy_pair_by_current_branch.get(bid)
                    if not pair or pair[0] != lcid:
                        continue
                    lbid = pair[1]
                    for group in groups:
                        if lbid in group["legacy_branch_ids"]:
                            target_groups.add(group["group_id"])
                membership_actions["RESTRICTED_TO_INTERSECTING_OUTPUTS"] += 1
            else:
                target_groups = set()
                membership_actions["FAIL_CLOSED_REVIEW"] += 1

            if target_groups:
                # One existing row can be kept/re-homed; all additional targets require clones.
                expected_new_memberships += max(len(target_groups) - 1, 0)
            else:
                expected_removed_memberships += 1

        current_subscriptions = CompanySubscription.objects.filter(
            company_id__in=current_company_id_by_legacy.values()
        ).count()

        print("[A8] 5/7 Freezing master/data routing policies...", flush=True)

        clone_all_estimated_new_rows = parse_int_field(
            a7_text, "CLONE_ALL_ESTIMATED_NEW_ROWS"
        )
        usage_routed_estimated_new_clones = parse_int_field(
            a7_text, "USAGE_ROUTED_ESTIMATED_NEW_CLONES"
        )

        manifest = {
            "schema": "primeyacc.company_split_transformation_manifest.v1",
            "source_system": SOURCE_SYSTEM,
            "identity_contract": {
                "authoritative_keys": "LEGACY_IDS_ONLY",
                "current_primey_ids": "NEVER_AUTHORITATIVE_FOR_PRODUCTION_REPLAY",
                "source_branch_delta_policy": "SAFETY_STOP",
            },
            "frozen_inputs": actual_sha,
            "expected_counts": {
                "baseline_mapped_companies": EXPECTED_BASELINE_COMPANIES,
                "baseline_mapped_branches": EXPECTED_BASELINE_BRANCHES,
                "split_source_companies": EXPECTED_SPLIT_SOURCE_COMPANIES,
                "split_output_companies": EXPECTED_SPLIT_OUTPUT_COMPANIES,
                "new_companies": EXPECTED_NEW_COMPANIES,
                "full_excluded_companies": EXPECTED_FULL_EXCLUDED_COMPANIES,
                "full_excluded_branches": EXPECTED_FULL_EXCLUDED_BRANCHES,
                "partial_excluded_branches": EXPECTED_PARTIAL_EXCLUDED_BRANCHES,
                "total_excluded_branches": EXPECTED_TOTAL_EXCLUDED_BRANCHES,
                "post_transform_companies": EXPECTED_FINAL_COMPANIES,
                "post_transform_branches": EXPECTED_FINAL_BRANCHES,
            },
            "company_creation_contract": {
                "survivor": "KEEP_SOURCE_COMPANY_FOR_GROUP_CONTAINING_SOURCE_DEFAULT_BRANCH",
                "new_company_code_pattern": f"{COMPANY_CODE_PREFIX}-{{legacy_company_id}}-G{{group_sequence}}",
                "new_company_name": "FRESH_ANCHOR_BRANCH_NAME_AT_EXECUTION",
                "identity_copy": "COPY_SOURCE_COMPANY_COMPLIANCE_CONTACT_ACTIVITY_FIELDS_THEN_OVERRIDE_NAME_FIELDS",
                "provenance": "WRITE_TO_Company.extra_data.primey_company_split",
            },
            "branch_contract": {
                "reparent_existing_branch_rows": True,
                "preserve_branch_status_and_is_active": True,
                "default_policy": "FIRST_BRANCH_IN_EACH_OUTPUT_GROUP_IS_DEFAULT; OTHERS_FALSE",
                "partial_76_default_after_purge": "92",
                "inactive_branch_policy": "PRESERVE_INACTIVE; DEFAULT_MAY_BE_INACTIVE",
            },
            "subscription_contract": {
                "source_company": "KEEP_ORIGINAL_SUBSCRIPTION_HISTORY_AND_CURRENT_ROW",
                "new_company": "CLONE_ONE_AUTHORITATIVE_CURRENT_SUBSCRIPTION_AT_CUTOVER",
                "clone_fields": [
                    "plan",
                    "status",
                    "action",
                    "billing_cycle",
                    "start_date",
                    "end_date",
                    "price",
                    "discount_amount",
                    "tax_amount",
                    "total_amount",
                    "auto_renew",
                    "promotion_code",
                    "promotion_discount_amount",
                    "manual_discount_amount",
                    "proration_charge_amount",
                    "proration_credit_amount",
                    "commercial_snapshot",
                    "billing_reference",
                    "paid_at",
                    "activated_at",
                    "cancelled_at",
                    "suspended_at",
                ],
                "new_start_date_policy": "NEVER_START_AT_SPLIT_DATE",
                "legacy_map_policy": "DO_NOT_DUPLICATE_SOURCE_SUBSCRIPTION_LEGACY_MAP",
                "provenance": "ADD_SPLIT_CLONE_MARKER_TO_COMMERCIAL_SNAPSHOT_OR_NOTES",
            },
            "membership_contract": {
                "primary_admin": "ADMIN_MEMBERSHIP_IN_EVERY_OUTPUT_COMPANY_WITH_BRANCH_ACCESS_ALL",
                "all_mode": "MEMBERSHIP_IN_EVERY_OUTPUT_COMPANY_WITH_BRANCH_ACCESS_ALL",
                "restricted_mode": "ONLY_OUTPUT_COMPANIES_INTERSECTING_ORIGINAL_GRANTED_BRANCHES",
                "partial_76": "KEEP_ADMIN_AND_BRANCH92_USERS; REMOVE_BRANCH90_91_ONLY_MEMBERSHIPS",
                "default_company_policy": "KEEP_SOURCE_IF_USER_RETAINS_SOURCE_MEMBERSHIP; OTHERWISE_SET_SOLE_RESULTING_COMPANY; MULTIPLE_WITHOUT_SOURCE=>NULL_REVIEW",
                "global_user_delete": "DELETE_ONLY_AFTER_ZERO_REMAINING_MEMBERSHIPS_AND_ZERO_SHARED_DEPENDENCIES",
            },
            "foundation_master_contract": {
                "clone_to_every_new_company": CLONE_ALL_FOUNDATION_MODELS,
                "estimated_new_rows_local_snapshot": clone_all_estimated_new_rows,
                "internal_remap_order": [
                    "accounting.Account parent graph",
                    "catalog.CatalogCategory parent graph",
                    "catalog.CatalogUnit",
                    "catalog.CatalogItem category/unit remap",
                    "accounting.TaxRate sales/purchase Account remap",
                    "accounting.AccountingSettings TaxRate remap",
                    "accounting.AccountingRoutingRule Account/TaxRate/CostCenter remap",
                    "treasury.TreasuryAccount accounting_account remap",
                ],
            },
            "usage_master_contract": {
                "models": USAGE_ROUTED_MASTER_MODELS,
                "estimated_new_clones_local_snapshot": usage_routed_estimated_new_clones,
                "source_company": "KEEP_CANONICAL_ORIGINAL_MASTER_ROWS",
                "new_companies": "CLONE_ONLY_IF_REFERENCED_BY_DESTINATION_GROUP",
                "multi_group": "ONE_CLONE_PER_NON_SOURCE_OUTPUT_GROUP_THAT_REFERENCES_MASTER",
                "unreferenced": "KEEP_ONLY_ON_SOURCE_COMPANY",
                "operational_fk_policy": "REMAP_TO_DESTINATION_COMPANY_CLONE",
            },
            "operational_routing_contract": {
                "direct_branch_models": [
                    "inventory.Warehouse",
                    "purchases.PurchaseBill",
                    "sales.SalesInvoice",
                    "sales.SalesReturn",
                ],
                "parent_branch_models": [
                    "inventory.InventoryLocation via Warehouse.branch",
                    "inventory.StockItem via Warehouse.branch",
                    "inventory.StockMovement via Warehouse.branch",
                    "purchases.PurchaseBillItem via PurchaseBill.branch",
                    "sales.SalesInvoiceItem via SalesInvoice.branch",
                ],
                "child_company_fields": "UPDATE_TO_PARENT_DESTINATION_COMPANY",
                "strict_same_company_after_transform": True,
            },
            "customer_payment_contract": {
                "total_local_snapshot": 320030,
                "rules": [
                    "IF sales_invoice.branch EXISTS => ROUTE_WITH_INVOICE_BRANCH",
                    "ELSE READ legacy payment.transaction_id",
                    "READ RAW SOURCE TRANSACTION COLLECTION INCLUDING aliases sales/sale_returns",
                    "ROUTE_WITH_RAW location_id/business_location_id",
                    "IGNORE SAME-NUMERIC-ID ROWS FROM UNRELATED TABLES",
                    "IF SOURCE PARENT TRANSACTION ABSENT AND NO TRANSACTION LEGACY MAP => PRESERVE_ON_RETAINED_SOURCE_COMPANY_WITH branch=NULL",
                    "MULTIPLE_OR_UNRESOLVED DESTINATIONS => SAFETY_STOP",
                ],
                "orphan_exceptions": CUSTOMER_PAYMENT_ORPHAN_EXCEPTIONS,
            },
            "legacy_object_map_contract": {
                "unique_identity": ["source_system", "source_table", "legacy_id"],
                "moved_canonical_objects": "UPDATE LegacyObjectMap.company TO DESTINATION COMPANY; KEEP legacy_company_id UNCHANGED",
                "cloned_masters": "DO_NOT_DUPLICATE CANONICAL LegacyObjectMap",
                "new_split_companies": "NO_FAKE_LEGACY_BUSINESS_ID; USE Company.extra_data PROVENANCE",
                "user_mapping": "KEEP_CANONICAL GLOBAL USER MAP; MEMBERSHIP CLONES DO NOT CREATE USER MAPS",
                "subscription_clone": "NO_DUPLICATE SUBSCRIPTION MAP",
                "excluded_data": "DELETE MAPS FOR PURGED SOURCE OBJECTS SO LOCAL STATE DOES NOT RETAIN STALE OWNERSHIP",
            },
            "partial_76_contract": {
                "keep_legacy_branch_ids": ["92"],
                "exclude_legacy_branch_ids": ["90", "91"],
                "keep_business_party_legacy_contact_ids": PARTIAL_76_KEEP_CONTACTS,
                "keep_business_party_policy": "KEEP_COMPANY_LEVEL_BRANCH_NULL",
                "exclude_catalog_source_ids": PARTIAL_76_CATALOG_EXCLUSIONS,
                "catalog_shared_keep_count_local_snapshot": 44,
                "catalog_excluded_only_count_local_snapshot": 5,
                "catalog_unreferenced_keep_conservative_count_local_snapshot": 8,
            },
            "full_exclusion_contract": {
                "legacy_company_ids": sorted(
                    [
                        row["legacy_company_id"]
                        for row in manifest_companies
                        if row["mode"] == "EXCLUDE"
                    ],
                    key=nkey,
                ),
                "future_migration": "SKIP_ENTIRE_COMPANY",
                "local_delete_order": [
                    "remove/clear branch policies and memberships",
                    "delete CustomerPayment/SupplierPayment protected rows",
                    "delete TreasuryTransaction rows if present",
                    "delete TreasuryAccount protected rows",
                    "delete other PROTECT children if any current-state audit finds them",
                    "delete Company (CASCADE remaining owned data)",
                    "delete scoped LegacyObjectMaps for purged data",
                    "delete global Users only if no remaining memberships/shared dependencies",
                ],
            },
            "execution_order": [
                "PRECHECK frozen manifest SHA + source branch delta + HEAD/origin + mutation gate",
                "CREATE new Companies and write split provenance",
                "CLONE foundation master graphs for new Companies",
                "CLONE usage-routed CatalogItem/BusinessParty masters by destination-group usage",
                "CREATE/REHOME memberships and branch access policies",
                "CLONE current subscriptions for new Companies",
                "REPARENT Branch rows and normalize one default Branch per output Company",
                "MOVE branch-routed operational headers to destination Companies",
                "MOVE child/detail rows to parent destination Companies",
                "REMAP operational master FKs to destination master clones",
                "ROUTE CustomerPayments using frozen routing contract",
                "UPDATE canonical LegacyObjectMap.company for moved canonical objects",
                "PURGE partial Company 76 excluded branch operations then five excluded-only CatalogItems",
                "PURGE seven fully excluded Companies in dependency order",
                "DELETE global Users proven orphaned after purge",
                "VERIFY strict same-company integrity, branch counts, company counts, memberships, subscriptions, and historical totals",
                "COMMIT ONLY AFTER full regression and final verification",
            ],
            "companies": manifest_companies,
        }

        # Deterministic JSON: no generated timestamp/current IDs.
        MANIFEST.write_text(
            json.dumps(
                manifest,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        manifest_sha = sha256(MANIFEST)

        print("[A8] 6/7 Running dry-run safety gates...", flush=True)

        safety_errors = []
        safety_warnings = []

        safety_errors.extend(branch_delta_errors)
        safety_errors.extend(default_plan_errors)
        safety_errors.extend(code_errors)

        if EXPECTED_BASELINE_COMPANIES - EXPECTED_FULL_EXCLUDED_COMPANIES - EXPECTED_SPLIT_SOURCE_COMPANIES + EXPECTED_SPLIT_OUTPUT_COMPANIES != EXPECTED_FINAL_COMPANIES:
            safety_errors.append("Final company count arithmetic mismatch")

        if EXPECTED_BASELINE_BRANCHES - EXPECTED_TOTAL_EXCLUDED_BRANCHES != EXPECTED_FINAL_BRANCHES:
            safety_errors.append("Final branch count arithmetic mismatch")

        if dirty:
            safety_warnings.append(
                "Tracked worktree is dirty with ongoing V2-26C changes. Blueprint may freeze, but DB mutation is BLOCKED until worktree is explicitly frozen/isolated."
            )

        mutation_ready = not dirty and not safety_errors

        lines.extend([
            "",
            "=" * 120,
            "A8 BLUEPRINT / DRY-RUN SUMMARY",
            "=" * 120,
            f"SPLIT_SOURCE_COMPANIES={split_count}",
            f"SPLIT_OUTPUT_COMPANIES={EXPECTED_SPLIT_OUTPUT_COMPANIES}",
            f"NEW_COMPANIES={new_company_count}",
            f"FULL_EXCLUDED_COMPANIES={exclude_count}",
            f"TOTAL_EXCLUDED_BRANCHES={total_excluded_branches}",
            f"EXPECTED_FINAL_COMPANIES={EXPECTED_FINAL_COMPANIES}",
            f"EXPECTED_FINAL_BRANCHES={EXPECTED_FINAL_BRANCHES}",
            f"GENERATED_COMPANY_CODE_COUNT={len(code_candidates)}",
            f"GENERATED_COMPANY_CODE_MAX_LENGTH={max(map(len, code_candidates)) if code_candidates else 0}",
            f"COMPANY_CODE_FIELD_MAX_LENGTH={company_code_max_length}",
            f"MEMBERSHIP_ACTION_COUNTS={dict(membership_actions)}",
            f"EXPECTED_NEW_MEMBERSHIP_ROWS={expected_new_memberships}",
            f"EXPECTED_REMOVED_MEMBERSHIP_ROWS={expected_removed_memberships}",
            f"CURRENT_SCOPED_SUBSCRIPTION_ROWS={current_subscriptions}",
            f"CLONE_ALL_ESTIMATED_NEW_ROWS={clone_all_estimated_new_rows}",
            f"USAGE_ROUTED_ESTIMATED_NEW_CLONES={usage_routed_estimated_new_clones}",
            f"SAFETY_ERROR_COUNT={len(safety_errors)}",
            f"SAFETY_WARNING_COUNT={len(safety_warnings)}",
        ])

        if safety_errors:
            lines.append("SAFETY_ERRORS_BEGIN")
            lines.extend(safety_errors)
            lines.append("SAFETY_ERRORS_END")

        if safety_warnings:
            lines.append("SAFETY_WARNINGS_BEGIN")
            lines.extend(safety_warnings)
            lines.append("SAFETY_WARNINGS_END")

        lines.extend([
            f"MANIFEST={MANIFEST.name}",
            f"MANIFEST_SIZE={MANIFEST.stat().st_size}",
            f"MANIFEST_SHA256={manifest_sha}",
            f"MUTATION_READY={'YES' if mutation_ready else 'NO'}",
            (
                "MUTATION_BLOCK_REASON=NONE"
                if mutation_ready
                else (
                    "MUTATION_BLOCK_REASON=DIRTY_TRACKED_WORKTREE"
                    if dirty and not safety_errors
                    else "MUTATION_BLOCK_REASON=SAFETY_ERRORS"
                )
            ),
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
        ])

        result = "PASS" if not safety_errors else "REVIEW_REQUIRED"
        lines.append(f"A8_RESULT={result}")
        lines.append("=" * 120)

        print("[A8] 7/7 Writing report...", flush=True)

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        report_sha = sha256(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A8 =====")
        print(f"A8_RESULT={result}")
        print(f"NEW_COMPANIES={new_company_count}")
        print(f"FULL_EXCLUDED_COMPANIES={exclude_count}")
        print(f"TOTAL_EXCLUDED_BRANCHES={total_excluded_branches}")
        print(f"EXPECTED_FINAL_COMPANIES={EXPECTED_FINAL_COMPANIES}")
        print(f"EXPECTED_FINAL_BRANCHES={EXPECTED_FINAL_BRANCHES}")
        print(f"SAFETY_ERROR_COUNT={len(safety_errors)}")
        print(f"SAFETY_WARNING_COUNT={len(safety_warnings)}")
        print(f"MUTATION_READY={'YES' if mutation_ready else 'NO'}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"MANIFEST={MANIFEST.name}")
        print(f"MANIFEST_SIZE={MANIFEST.stat().st_size}")
        print(f"MANIFEST_SHA256={manifest_sha}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A8_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA8_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A8_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        digest = sha256(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A8 =====", flush=True)
        print("A8_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SIZE={REPORT.stat().st_size}", flush=True)
        print(f"REPORT_SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

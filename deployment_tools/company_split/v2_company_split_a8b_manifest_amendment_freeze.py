#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

BASE_MANIFEST = ROOT / "v2_company_split_transformation_manifest.json"
A9_REPORT = ROOT / "v2_company_split_a9_worktree_guard.txt"
A10C_REPORT = ROOT / "v2_company_split_a10c_party_clone_action_correction.txt"
A10C_AMENDMENT = ROOT / "v2_company_split_a10c_party_clone_amendment_v2.json"

REPORT = ROOT / "v2_company_split_a8b_manifest_amendment_freeze.txt"
MANIFEST_V2 = ROOT / "v2_company_split_transformation_manifest_v2.json"

EXPECTED_BASE_MANIFEST_SHA256 = "42E39C884EE60EB097EE6BA30DB63628E75CCE1F084CF691EE04C3D9B79B981F"
EXPECTED_A9_SHA256 = "4CF7A4A0E3E94FF4E16E604C9C1EC2861F5D6033AC4E27A26C4C0945AB168199"
EXPECTED_A10C_REPORT_SHA256 = "6C682AAD8ACF71B02C6DD1CD78915BA91B75895594E9620A56E373154CEED4F4"
EXPECTED_A10C_AMENDMENT_SHA256 = "6E7C18D72AB0D311E854A999C9DBBFE24B61819C0E689FD72AAB545046D09DF6"

EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH_HASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

EXPECTED_BASE_USAGE_MASTER_CLONES = 43887
EXPECTED_ADDITIONAL_BP_CLONES = 4
EXPECTED_REVISED_USAGE_MASTER_CLONES = 43891
EXPECTED_PAYMENT_COVERAGE_PAIRS = 6
EXPECTED_SOURCE_COVERAGE_NO_CLONE = 2


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def git_text(*args: str) -> str:
    cp = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if cp.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed rc={cp.returncode}: "
            f"{clean(cp.stderr or cp.stdout)}"
        )
    return cp.stdout.strip()


def require_sha(path: Path, expected: str, label: str) -> str:
    if not path.exists():
        raise RuntimeError(f"Missing {label}: {path.name}")
    actual = sha256_file(path)
    if actual != expected:
        raise RuntimeError(
            f"{label} SHA mismatch expected={expected} actual={actual}"
        )
    return actual


def main() -> int:
    generated_at = datetime.now(timezone.utc).isoformat()
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A8B MANIFEST AMENDMENT FREEZE",
        "=" * 120,
        f"GENERATED_AT_UTC={generated_at}",
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_MANIFEST_FREEZE",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A8B] 1/6 Validating frozen inputs...", flush=True)

        actual = {
            "base_manifest": require_sha(
                BASE_MANIFEST,
                EXPECTED_BASE_MANIFEST_SHA256,
                "Base manifest",
            ),
            "a9": require_sha(
                A9_REPORT,
                EXPECTED_A9_SHA256,
                "A9 report",
            ),
            "a10c_report": require_sha(
                A10C_REPORT,
                EXPECTED_A10C_REPORT_SHA256,
                "A10C report",
            ),
            "a10c_amendment": require_sha(
                A10C_AMENDMENT,
                EXPECTED_A10C_AMENDMENT_SHA256,
                "A10C corrected amendment",
            ),
        }

        base = json.loads(BASE_MANIFEST.read_text(encoding="utf-8"))
        amendment = json.loads(A10C_AMENDMENT.read_text(encoding="utf-8"))

        if base.get("schema") != "primeyacc.company_split_transformation_manifest.v1":
            raise RuntimeError(f"Unexpected base manifest schema={base.get('schema')}")
        if amendment.get("schema") != "primeyacc.company_split_customer_payment_party_clone_amendment.v2":
            raise RuntimeError(f"Unexpected amendment schema={amendment.get('schema')}")
        if amendment.get("base_manifest_sha256") != EXPECTED_BASE_MANIFEST_SHA256:
            raise RuntimeError("Corrected amendment is not anchored to frozen Manifest v1")

        lines.extend([
            "===== FROZEN INPUT CHAIN =====",
            f"BASE_MANIFEST_SHA256={actual['base_manifest']}",
            f"A9_SHA256={actual['a9']}",
            f"A10C_REPORT_SHA256={actual['a10c_report']}",
            f"A10C_AMENDMENT_SHA256={actual['a10c_amendment']}",
            "",
        ])

        print("[A8B] 2/6 Validating Git mutation guard...", flush=True)

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin_main = git_text("rev-parse", "origin/main")
        tracked = git_text("status", "--short", "--untracked-files=no")
        stash = git_text("rev-parse", "stash@{0}")

        if branch != "main":
            raise RuntimeError(f"Expected main, got {branch}")
        if head != EXPECTED_HEAD or origin_main != EXPECTED_HEAD:
            raise RuntimeError(
                f"Git baseline drift head={head} origin_main={origin_main}"
            )
        if tracked:
            raise RuntimeError(f"Tracked worktree is not clean: {tracked}")
        if stash != EXPECTED_STASH_HASH:
            raise RuntimeError(
                f"V2-26C stash drift expected={EXPECTED_STASH_HASH} actual={stash}"
            )

        lines.extend([
            "===== GIT GUARD =====",
            f"BRANCH={branch}",
            f"HEAD={head}",
            f"ORIGIN_MAIN={origin_main}",
            "HEAD_ORIGIN_EQUALITY=PASS",
            "TRACKED_WORKTREE_CLEAN=PASS",
            f"V2_26C_STASH_HASH={stash}",
            "",
        ])

        print("[A8B] 3/6 Validating corrected clone semantics...", flush=True)

        if int(amendment.get("base_a7_usage_master_clone_estimate", -1)) != EXPECTED_BASE_USAGE_MASTER_CLONES:
            raise RuntimeError("A10C base usage-master estimate changed")
        if int(amendment.get("additional_business_party_clone_actions", -1)) != EXPECTED_ADDITIONAL_BP_CLONES:
            raise RuntimeError("A10C additional BusinessParty clone count changed")
        if int(amendment.get("revised_usage_master_clone_estimate", -1)) != EXPECTED_REVISED_USAGE_MASTER_CLONES:
            raise RuntimeError("A10C revised usage-master estimate changed")
        if int(amendment.get("payment_usage_coverage_pair_count", -1)) != EXPECTED_PAYMENT_COVERAGE_PAIRS:
            raise RuntimeError("A10C payment usage coverage pair count changed")
        if int(amendment.get("source_group_coverage_no_clone_count", -1)) != EXPECTED_SOURCE_COVERAGE_NO_CLONE:
            raise RuntimeError("A10C source-group coverage count changed")

        split_entries = {
            clean(row["legacy_company_id"]): row
            for row in base.get("companies", [])
            if clean(row.get("mode")) == "SPLIT"
        }

        authoritative_rows = []
        clone_pairs = []
        source_coverage_pairs = []
        validation_errors = []

        for row in amendment.get("rows", []):
            lcid = clean(row.get("legacy_company_id"))
            legacy_contact_id = clean(row.get("legacy_contact_id"))
            retained_group = clean(row.get("retained_source_group"))

            if not legacy_contact_id:
                validation_errors.append(f"company={lcid}: missing legacy_contact_id")
                continue
            if lcid not in split_entries:
                validation_errors.append(f"company={lcid}: not a SPLIT company in base manifest")
                continue

            entry = split_entries[lcid]
            legal_groups = {
                clean(group.get("group_id"))
                for group in entry.get("output_groups", [])
            }
            manifest_retained = clean(entry.get("retained_source_group"))

            if retained_group != manifest_retained:
                validation_errors.append(
                    f"company={lcid}: retained mismatch amendment={retained_group} manifest={manifest_retained}"
                )

            coverage_groups = sorted({
                clean(x)
                for x in row.get("payment_usage_coverage_groups", [])
                if clean(x)
            })
            source_no_clone = sorted({
                clean(x)
                for x in row.get("source_group_coverage_no_clone", [])
                if clean(x)
            })
            clone_groups = sorted({
                clean(x)
                for x in row.get("additional_clone_target_groups", [])
                if clean(x)
            })

            unknown = (set(coverage_groups) | set(source_no_clone) | set(clone_groups)) - legal_groups
            if unknown:
                validation_errors.append(
                    f"company={lcid} contact={legacy_contact_id}: unknown groups={sorted(unknown)}"
                )

            if any(group == retained_group for group in clone_groups):
                validation_errors.append(
                    f"company={lcid} contact={legacy_contact_id}: retained source group incorrectly marked for clone"
                )

            expected_source_no_clone = (
                [retained_group]
                if retained_group in coverage_groups
                else []
            )
            if source_no_clone != expected_source_no_clone:
                validation_errors.append(
                    f"company={lcid} contact={legacy_contact_id}: "
                    f"source_no_clone={source_no_clone} expected={expected_source_no_clone}"
                )

            expected_clone_groups = sorted(
                group
                for group in coverage_groups
                if group != retained_group
            )
            if clone_groups != expected_clone_groups:
                validation_errors.append(
                    f"company={lcid} contact={legacy_contact_id}: "
                    f"clone_groups={clone_groups} expected={expected_clone_groups}"
                )

            for group in source_no_clone:
                source_coverage_pairs.append((lcid, legacy_contact_id, group))
            for group in clone_groups:
                clone_pairs.append((lcid, legacy_contact_id, group))

            authoritative_rows.append({
                "legacy_company_id": lcid,
                "legacy_contact_id": legacy_contact_id,
                "retained_source_group": retained_group,
                "payment_usage_coverage_groups": coverage_groups,
                "source_group_coverage_no_clone": source_no_clone,
                "additional_clone_target_groups": clone_groups,
                "payment_reference_counts": {
                    clean(k): int(v)
                    for k, v in sorted(
                        (row.get("payment_reference_counts") or {}).items()
                    )
                },
                "reason": "CUSTOMER_PAYMENT_RAW_PARTY_REFERENCE_REQUIRES_DESTINATION_BUSINESSPARTY_COVERAGE",
            })

        if validation_errors:
            raise RuntimeError(
                "A10C semantic validation failed: " + " | ".join(validation_errors)
            )

        if len(clone_pairs) != EXPECTED_ADDITIONAL_BP_CLONES:
            raise RuntimeError(
                f"Actual clone pair count changed expected={EXPECTED_ADDITIONAL_BP_CLONES} actual={len(clone_pairs)}"
            )
        if len(source_coverage_pairs) != EXPECTED_SOURCE_COVERAGE_NO_CLONE:
            raise RuntimeError(
                f"Source coverage pair count changed expected={EXPECTED_SOURCE_COVERAGE_NO_CLONE} actual={len(source_coverage_pairs)}"
            )

        print("[A8B] 4/6 Building deterministic Manifest v2...", flush=True)

        v2 = copy.deepcopy(base)
        v2["schema"] = "primeyacc.company_split_transformation_manifest.v2"

        v2["manifest_lineage"] = {
            "base_manifest_schema": "primeyacc.company_split_transformation_manifest.v1",
            "base_manifest_sha256": EXPECTED_BASE_MANIFEST_SHA256,
            "amendment_reason": (
                "A10 preflight discovered CustomerPayment.customer_id/counterparty_id "
                "are numeric BusinessParty references not represented in A7 FK discovery."
            ),
            "a10c_report_sha256": EXPECTED_A10C_REPORT_SHA256,
            "a10c_corrected_amendment_sha256": EXPECTED_A10C_AMENDMENT_SHA256,
            "supersedes_usage_master_clone_estimate": EXPECTED_BASE_USAGE_MASTER_CLONES,
            "revised_usage_master_clone_estimate": EXPECTED_REVISED_USAGE_MASTER_CLONES,
        }

        frozen_inputs = dict(v2.get("frozen_inputs") or {})
        frozen_inputs["manifest_v1"] = EXPECTED_BASE_MANIFEST_SHA256
        frozen_inputs["a9"] = EXPECTED_A9_SHA256
        frozen_inputs["a10c_report"] = EXPECTED_A10C_REPORT_SHA256
        frozen_inputs["a10c_party_clone_amendment_v2"] = EXPECTED_A10C_AMENDMENT_SHA256
        v2["frozen_inputs"] = frozen_inputs

        usage_contract = dict(v2.get("usage_master_contract") or {})
        if int(usage_contract.get("estimated_new_clones_local_snapshot", -1)) != EXPECTED_BASE_USAGE_MASTER_CLONES:
            raise RuntimeError(
                "Base manifest usage_master_contract estimate no longer matches A7 baseline"
            )

        usage_contract["estimated_new_clones_local_snapshot"] = EXPECTED_REVISED_USAGE_MASTER_CLONES
        usage_contract["business_party_usage_sources"] = [
            "sales.SalesInvoice.customer",
            "sales.SalesReturn.customer",
            "purchases.PurchaseBill.supplier",
            "treasury.CustomerPayment.customer_id",
            "treasury.CustomerPayment.counterparty_id",
        ]
        usage_contract["payment_driven_business_party_clone_actions"] = EXPECTED_ADDITIONAL_BP_CLONES
        usage_contract["payment_source_group_coverage_no_clone_count"] = EXPECTED_SOURCE_COVERAGE_NO_CLONE
        usage_contract["payment_party_identity"] = (
            "Resolve BusinessParty canonically from legacy contacts; "
            "source survivor uses canonical original; clone only into non-source output groups."
        )
        v2["usage_master_contract"] = usage_contract

        cp_contract = dict(v2.get("customer_payment_contract") or {})
        cp_contract["business_party_coverage_contract"] = {
            "identity_contract": "LEGACY_CONTACT_IDS_AUTHORITATIVE",
            "current_primey_ids": "NOT_STORED_IN_AUTHORITATIVE_MANIFEST",
            "source_group_semantics": (
                "If payment usage requires the retained source group, keep canonical original BusinessParty; no clone."
            ),
            "non_source_group_semantics": (
                "Clone canonical BusinessParty once per required non-source output group and remap CustomerPayment raw party IDs."
            ),
            "additional_clone_action_count": EXPECTED_ADDITIONAL_BP_CLONES,
            "source_group_coverage_no_clone_count": EXPECTED_SOURCE_COVERAGE_NO_CLONE,
            "rows": sorted(
                authoritative_rows,
                key=lambda row: (
                    int(row["legacy_company_id"]),
                    int(row["legacy_contact_id"]),
                ),
            ),
        }
        v2["customer_payment_contract"] = cp_contract

        execution_order = list(v2.get("execution_order") or [])
        old_step = "CLONE usage-routed CatalogItem/BusinessParty masters by destination-group usage"
        new_step = (
            "CLONE usage-routed CatalogItem/BusinessParty masters by destination-group usage, "
            "including CustomerPayment raw-party coverage from Manifest v2"
        )
        if old_step in execution_order:
            execution_order[execution_order.index(old_step)] = new_step
        elif new_step not in execution_order:
            raise RuntimeError("Could not locate usage-master clone execution step")
        v2["execution_order"] = execution_order

        MANIFEST_V2.write_text(
            json.dumps(
                v2,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        manifest_v2_sha = sha256_file(MANIFEST_V2)

        rendered_v2 = MANIFEST_V2.read_text(encoding="utf-8")
        for forbidden in (
            '"current_business_party_id_snapshot"',
            '"display_name_snapshot"',
            '"code_snapshot"',
        ):
            if forbidden in rendered_v2:
                raise RuntimeError(
                    f"Authoritative Manifest v2 contains forbidden local snapshot field {forbidden}"
                )

        print("[A8B] 5/6 Verifying Manifest v2 invariants...", flush=True)

        invariant_errors = []

        if v2.get("expected_counts") != base.get("expected_counts"):
            invariant_errors.append("expected_counts changed unexpectedly")
        if v2.get("companies") != base.get("companies"):
            invariant_errors.append("company decision map changed unexpectedly")
        if v2.get("branch_contract") != base.get("branch_contract"):
            invariant_errors.append("branch_contract changed unexpectedly")
        if v2.get("subscription_contract") != base.get("subscription_contract"):
            invariant_errors.append("subscription_contract changed unexpectedly")
        if v2.get("membership_contract") != base.get("membership_contract"):
            invariant_errors.append("membership_contract changed unexpectedly")
        if v2.get("legacy_object_map_contract") != base.get("legacy_object_map_contract"):
            invariant_errors.append("legacy_object_map_contract changed unexpectedly")

        if int(v2["usage_master_contract"]["estimated_new_clones_local_snapshot"]) != EXPECTED_REVISED_USAGE_MASTER_CLONES:
            invariant_errors.append("usage-master revised count not frozen to 43891")

        cp_rows = v2["customer_payment_contract"]["business_party_coverage_contract"]["rows"]
        if len(cp_rows) != len(authoritative_rows):
            invariant_errors.append("authoritative CustomerPayment BusinessParty row count drift")

        if invariant_errors:
            raise RuntimeError(
                "Manifest v2 invariant failure: " + " | ".join(invariant_errors)
            )

        print("[A8B] 6/6 Writing freeze report...", flush=True)

        clone_by_company = Counter(
            lcid for lcid, _contact, _group in clone_pairs
        )
        clone_by_group = Counter(
            group for _lcid, _contact, group in clone_pairs
        )

        lines.extend([
            "===== A8B AMENDMENT FREEZE SUMMARY =====",
            f"BASE_USAGE_MASTER_CLONE_ESTIMATE={EXPECTED_BASE_USAGE_MASTER_CLONES}",
            f"PAYMENT_USAGE_COVERAGE_PAIR_COUNT={EXPECTED_PAYMENT_COVERAGE_PAIRS}",
            f"SOURCE_GROUP_COVERAGE_NO_CLONE_COUNT={len(source_coverage_pairs)}",
            f"ADDITIONAL_BUSINESSPARTY_CLONE_ACTION_COUNT={len(clone_pairs)}",
            f"ADDITIONAL_CLONE_ACTIONS_BY_COMPANY={dict(sorted(clone_by_company.items()))}",
            f"ADDITIONAL_CLONE_ACTIONS_BY_GROUP={dict(sorted(clone_by_group.items()))}",
            f"REVISED_USAGE_MASTER_CLONE_ESTIMATE={EXPECTED_REVISED_USAGE_MASTER_CLONES}",
            f"AUTHORITATIVE_LEGACY_CONTACT_ROW_COUNT={len(authoritative_rows)}",
            f"INVARIANT_ERROR_COUNT={len(invariant_errors)}",
            f"MANIFEST_V2={MANIFEST_V2.name}",
            f"MANIFEST_V2_SIZE={MANIFEST_V2.stat().st_size}",
            f"MANIFEST_V2_SHA256={manifest_v2_sha}",
            "TRACKED_WORKTREE_CLEAN=PASS",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "GIT_PUSH=0",
            "MUTATION_READY=YES",
            "NEXT_STAGE=A10_V4_PREFLIGHT_AGAINST_MANIFEST_V2",
            "A8B_RESULT=PASS",
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A8B =====")
        print("A8B_RESULT=PASS")
        print(f"ADDITIONAL_BUSINESSPARTY_CLONE_ACTION_COUNT={len(clone_pairs)}")
        print(f"REVISED_USAGE_MASTER_CLONE_ESTIMATE={EXPECTED_REVISED_USAGE_MASTER_CLONES}")
        print("MUTATION_READY=YES")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"MANIFEST_V2={MANIFEST_V2.name}")
        print(f"MANIFEST_V2_SIZE={MANIFEST_V2.stat().st_size}")
        print(f"MANIFEST_V2_SHA256={manifest_v2_sha}")

        return 0

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A8B_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA8B_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A8B_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        digest = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A8B =====", flush=True)
        print("A8B_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

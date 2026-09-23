#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from decimal import Decimal
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

MANIFEST = ROOT / "v2_company_split_transformation_manifest_v2.json"
A10_REPORT = ROOT / "v2_company_split_a10_execution_preflight_v5.txt"
A10_PLAN = ROOT / "v2_company_split_local_execution_plan_v5.json"
A10D_REPORT = ROOT / "v2_company_split_a10d_company88_opening_balance_closure.txt"
A10D_POLICY = ROOT / "v2_company_split_a10d_opening_balance_policy.json"
CACHE_FILE = ROOT / "_audit" / "phase49j_general_apply" / "source_cache" / "company_88.json"

REPORT = ROOT / "v2_company_split_a10e_opening_balance_provenance_correction.txt"
POLICY = ROOT / "v2_company_split_a10e_opening_balance_policy_v2.json"

EXPECTED_MANIFEST_SHA256 = "B12A3C2916272B6A4D5E8051D7B51533E3FF05369084632685F0BCC809BE24DE"
EXPECTED_A10_REPORT_SHA256 = "68C4E393767305CB1C573ECEBD393A795DF14D1541E922BCDBF9A76898680D18"
EXPECTED_A10_PLAN_SHA256 = "ED52E632045354DDF1E80ADDD918D11E8AAC04026BF5D69C752D4B31B4BAB7A1"
EXPECTED_A10D_REPORT_SHA256 = "CFEDFBB1EDCA7F7D9A942F97076AE2CBC985A23B5A2C9EEE74BCD70BDD1DBD58"
EXPECTED_A10D_POLICY_SHA256 = "A5B43C939054DAC53623D3E3D9E5DA362246B2D3C10125B44C4BD3FF0C6FDFD3"

EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH_HASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

SOURCE_SYSTEM = "mhamcloud_v1"
LEGACY_COMPANY_ID = "88"
LEGACY_CONTACT_ID = "122844"
LEGACY_OPENING_BALANCE_ID = "3357434"
LEGACY_OPENING_LOCATION_ID = "106"
EXPECTED_OPENING_BALANCE = Decimal("24.00")
EXPECTED_OWNER_GROUP = "88-G01"
EXPECTED_CLONE_GROUP = "88-G02"
QUERY_TIMEOUT_MS = 60000


def clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).replace("\r", " ").replace("\n", " ").strip()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require_sha(path: Path, expected: str, label: str) -> None:
    if not path.exists():
        raise RuntimeError(f"Missing {label}: {path.name}")
    actual = sha256_file(path)
    if actual != expected:
        raise RuntimeError(
            f"{label} SHA mismatch expected={expected} actual={actual}"
        )


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


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def decimal_value(v: Any) -> Decimal:
    return Decimal(clean(v))


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A10E OPENING BALANCE PROVENANCE CORRECTION",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_TARGETED_CORRECTION",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A10E] 1/6 Validating frozen chain and Git guard...", flush=True)

        require_sha(MANIFEST, EXPECTED_MANIFEST_SHA256, "Manifest v2")
        require_sha(A10_REPORT, EXPECTED_A10_REPORT_SHA256, "A10 V5 report")
        require_sha(A10_PLAN, EXPECTED_A10_PLAN_SHA256, "A10 V5 plan")
        require_sha(A10D_REPORT, EXPECTED_A10D_REPORT_SHA256, "A10D report")
        require_sha(A10D_POLICY, EXPECTED_A10D_POLICY_SHA256, "A10D policy")

        if not CACHE_FILE.exists():
            raise RuntimeError(f"Missing source cache: {CACHE_FILE}")

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin = git_text("rev-parse", "origin/main")
        tracked = git_text("status", "--short", "--untracked-files=no")
        stash = git_text("rev-parse", "stash@{0}")

        if branch != "main":
            raise RuntimeError(f"Expected main, got {branch}")
        if head != EXPECTED_HEAD or origin != EXPECTED_HEAD:
            raise RuntimeError(f"Git baseline drift head={head} origin={origin}")
        if tracked:
            raise RuntimeError(f"Tracked worktree not clean: {tracked}")
        if stash != EXPECTED_STASH_HASH:
            raise RuntimeError(
                f"V2-26C stash drift expected={EXPECTED_STASH_HASH} actual={stash}"
            )

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        a10d_policy = json.loads(A10D_POLICY.read_text(encoding="utf-8"))

        if a10d_policy.get("balance_owner_provenance") != "MULTIPLE_SOURCE_GROUPS_REQUIRES_MANUAL_PARTITION":
            raise RuntimeError("A10D policy state changed unexpectedly")

        print("[A10E] 2/6 Resolving exact legacy/current identities...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()
        import django
        django.setup()

        from django.apps import apps
        from django.contrib.contenttypes.models import ContentType
        from django.db import connection

        from business_controls.models import LegacyObjectMap

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        BusinessParty = apps.get_model("parties", "BusinessParty")
        bp_ct = ContentType.objects.get_for_model(BusinessParty)

        contact_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=LEGACY_COMPANY_ID,
                source_table="contacts",
                legacy_id=LEGACY_CONTACT_ID,
                target_content_type=bp_ct,
            )
        )
        if len(contact_maps) != 1:
            raise RuntimeError(
                f"Expected one canonical contact map, got {len(contact_maps)}"
            )

        current_party_id = int(clean(contact_maps[0].target_object_id))
        party = BusinessParty.objects.filter(pk=current_party_id).first()
        if party is None:
            raise RuntimeError(f"BusinessParty {current_party_id} missing")
        if Decimal(party.opening_balance) != EXPECTED_OPENING_BALANCE:
            raise RuntimeError(
                f"Current opening balance drift expected={EXPECTED_OPENING_BALANCE} "
                f"actual={party.opening_balance}"
            )

        opening_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=LEGACY_COMPANY_ID,
                source_table="opening_balances",
                legacy_id=LEGACY_OPENING_BALANCE_ID,
                target_content_type=bp_ct,
                target_object_id=str(current_party_id),
            )
        )
        if len(opening_maps) != 1:
            raise RuntimeError(
                f"Expected one opening-balance LegacyObjectMap, got {len(opening_maps)}"
            )

        opening_map = opening_maps[0]
        metadata_total = decimal_value(
            (opening_map.metadata or {}).get("source_final_total")
        )
        if metadata_total != EXPECTED_OPENING_BALANCE:
            raise RuntimeError(
                f"LegacyObjectMap source_final_total drift expected={EXPECTED_OPENING_BALANCE} "
                f"actual={metadata_total}"
            )

        print("[A10E] 3/6 Reading exact raw opening_balance source row...", flush=True)

        payload = (
            json.loads(
                CACHE_FILE.read_text(
                    encoding="utf-8-sig",
                    errors="replace",
                )
            ).get("payload")
            or {}
        )

        opening_rows = [
            row
            for row in (payload.get("opening_balances") or [])
            if isinstance(row, dict)
            and clean(row.get("id")) == LEGACY_OPENING_BALANCE_ID
        ]
        if len(opening_rows) != 1:
            raise RuntimeError(
                f"Expected one raw opening balance row id={LEGACY_OPENING_BALANCE_ID}, "
                f"got {len(opening_rows)}"
            )

        opening_row = opening_rows[0]

        if clean(opening_row.get("business_id")) != LEGACY_COMPANY_ID:
            raise RuntimeError("Raw opening balance business_id mismatch")
        if clean(opening_row.get("contact_id")) != LEGACY_CONTACT_ID:
            raise RuntimeError("Raw opening balance contact_id mismatch")
        if clean(opening_row.get("location_id")) != LEGACY_OPENING_LOCATION_ID:
            raise RuntimeError(
                f"Raw opening balance location drift expected={LEGACY_OPENING_LOCATION_ID} "
                f"actual={clean(opening_row.get('location_id'))}"
            )
        if decimal_value(opening_row.get("final_total")) != EXPECTED_OPENING_BALANCE:
            raise RuntimeError(
                f"Raw opening balance final_total drift expected={EXPECTED_OPENING_BALANCE} "
                f"actual={opening_row.get('final_total')}"
            )
        if clean(opening_row.get("type")) != "opening_balance":
            raise RuntimeError(
                f"Raw row type is not opening_balance: {opening_row.get('type')}"
            )

        print("[A10E] 4/6 Resolving opening_balance location to frozen output group...", flush=True)

        company_entry = next(
            row
            for row in manifest["companies"]
            if clean(row["legacy_company_id"]) == LEGACY_COMPANY_ID
        )

        owner_groups = []
        for group in company_entry["output_groups"]:
            if LEGACY_OPENING_LOCATION_ID in {
                clean(x) for x in group["legacy_branch_ids"]
            }:
                owner_groups.append(group["group_id"])

        if owner_groups != [EXPECTED_OWNER_GROUP]:
            raise RuntimeError(
                f"Opening balance location resolves unexpectedly: {owner_groups}"
            )

        # Validate that the Party needs a clone in G02, but that this usage is
        # operational usage and not opening-balance provenance.
        plan = json.loads(A10_PLAN.read_text(encoding="utf-8"))
        usage = plan["usage_master_clone_fingerprints"]["parties.BusinessParty"]
        if int(usage["clone_action_count"]) != 12663:
            raise RuntimeError("BusinessParty clone fingerprint drifted")

        # Raw source evidence of the later sale is explicitly separate.
        later_sales = [
            row
            for row in (payload.get("sales") or [])
            if isinstance(row, dict)
            and clean(row.get("contact_id")) == LEGACY_CONTACT_ID
        ]
        sale_locations = sorted({
            clean(row.get("location_id"))
            for row in later_sales
            if clean(row.get("location_id"))
        })

        if "107" not in sale_locations:
            raise RuntimeError(
                f"Expected later operational sale at location 107, got {sale_locations}"
            )

        print("[A10E] 5/6 Freezing corrected no-duplication policy...", flush=True)

        corrected_policy = {
            "schema": "primeyacc.company_split_business_party_opening_balance_policy.v2",
            "manifest_v2_sha256": EXPECTED_MANIFEST_SHA256,
            "supersedes_a10d_policy_sha256": EXPECTED_A10D_POLICY_SHA256,
            "legacy_company_id": LEGACY_COMPANY_ID,
            "legacy_contact_id": LEGACY_CONTACT_ID,
            "legacy_opening_balance_id": LEGACY_OPENING_BALANCE_ID,
            "opening_balance_source_table": "opening_balances",
            "opening_balance_source_location_id": LEGACY_OPENING_LOCATION_ID,
            "opening_balance_source_final_total": str(EXPECTED_OPENING_BALANCE),
            "current_business_party_id_snapshot": current_party_id,
            "opening_balance_snapshot": str(EXPECTED_OPENING_BALANCE),
            "balance_owner_group": EXPECTED_OWNER_GROUP,
            "balance_owner_provenance": (
                "EXACT_RAW_OPENING_BALANCE_ROW_LOCATION; "
                "GENERAL CONTACT SALES/PAYMENT USAGE DOES_NOT_REALLOCATE_OPENING_BALANCE"
            ),
            "operational_clone_required_groups": [EXPECTED_CLONE_GROUP],
            "group_opening_balance_policy": {
                EXPECTED_OWNER_GROUP: str(EXPECTED_OPENING_BALANCE),
                EXPECTED_CLONE_GROUP: "0.00",
            },
            "canonical_original_policy": (
                "KEEP canonical original BusinessParty on 88-G01 with opening_balance=24.00"
            ),
            "clone_policy": (
                "Clone BusinessParty to 88-G02 because of operational usage, "
                "but set clone opening_balance=0.00"
            ),
            "no_duplication_rule": (
                "SUM_OF_POST_SPLIT_OPENING_BALANCES_MUST_EQUAL_PRE_SPLIT_OPENING_BALANCE"
            ),
            "post_split_sum_expected": str(EXPECTED_OPENING_BALANCE),
        }

        post_split_sum = sum(
            Decimal(v)
            for v in corrected_policy["group_opening_balance_policy"].values()
        )
        if post_split_sum != EXPECTED_OPENING_BALANCE:
            raise RuntimeError(
                f"No-duplication sum failed expected={EXPECTED_OPENING_BALANCE} "
                f"actual={post_split_sum}"
            )

        POLICY.write_text(
            json.dumps(
                corrected_policy,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        policy_sha = sha256_file(POLICY)

        print("[A10E] 6/6 Writing closure report...", flush=True)

        lines.extend([
            "===== A10E CORRECTED PROVENANCE =====",
            f"LEGACY_COMPANY_ID={LEGACY_COMPANY_ID}",
            f"LEGACY_CONTACT_ID={LEGACY_CONTACT_ID}",
            f"CURRENT_PARTY_ID={current_party_id}",
            f"LEGACY_OPENING_BALANCE_ID={LEGACY_OPENING_BALANCE_ID}",
            f"OPENING_BALANCE={EXPECTED_OPENING_BALANCE}",
            f"RAW_OPENING_BALANCE_LOCATION_ID={LEGACY_OPENING_LOCATION_ID}",
            f"RAW_OPENING_BALANCE_OWNER_GROUP={EXPECTED_OWNER_GROUP}",
            f"LATER_OPERATIONAL_SALE_LOCATION_IDS={sale_locations}",
            f"OPERATIONAL_CLONE_REQUIRED_GROUP={EXPECTED_CLONE_GROUP}",
            "",
            "===== PROVENANCE RULE =====",
            "OPENING_BALANCE_PROVENANCE_SCOPE=opening_balances row only",
            "GENERAL_CONTACT_USAGE_IS_BALANCE_PROVENANCE=NO",
            "SALES_LOCATION_REALLOCATES_OPENING_BALANCE=NO",
            "CUSTOMER_PAYMENT_ROUTE_REALLOCATES_OPENING_BALANCE=NO",
            "",
            "===== CORRECTED POLICY =====",
            f"BALANCE_OWNER_GROUP={EXPECTED_OWNER_GROUP}",
            f"CANONICAL_88_G01_OPENING_BALANCE={EXPECTED_OPENING_BALANCE}",
            f"CLONE_88_G02_OPENING_BALANCE=0.00",
            f"POST_SPLIT_OPENING_BALANCE_SUM={post_split_sum}",
            "NO_DUPLICATION_CHECK=PASS",
            f"POLICY={POLICY.name}",
            f"POLICY_SHA256={policy_sha}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "GIT_PUSH=0",
            "A10E_RESULT=PASS",
            "NEXT_STAGE=A8C_FINANCIAL_POLICY_AMENDMENT_FREEZE",
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10E =====")
        print("A10E_RESULT=PASS")
        print(f"LEGACY_CONTACT_ID={LEGACY_CONTACT_ID}")
        print(f"OPENING_BALANCE={EXPECTED_OPENING_BALANCE}")
        print(f"BALANCE_OWNER_GROUP={EXPECTED_OWNER_GROUP}")
        print(f"CLONE_{EXPECTED_CLONE_GROUP}_OPENING_BALANCE=0.00")
        print("NO_DUPLICATION_CHECK=PASS")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"POLICY={POLICY.name}")
        print(f"POLICY_SHA256={policy_sha}")
        return 0

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A10E_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print("\nA10E_RESULT=INTERRUPTED", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A10E_RESULT=FAIL",
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
        print("===== PRIMEYACC COMPANY SPLIT A10E =====", flush=True)
        print("A10E_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SHA256={sha256_file(REPORT)}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

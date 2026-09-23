#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

MANIFEST = ROOT / "v2_company_split_transformation_manifest.json"
A10B_REPORT = ROOT / "v2_company_split_a10b_customer_payment_party_clone_gap.txt"
A10B_AMENDMENT = ROOT / "v2_company_split_a10b_party_clone_amendment.json"

REPORT = ROOT / "v2_company_split_a10c_party_clone_action_correction.txt"
CORRECTED_AMENDMENT = ROOT / "v2_company_split_a10c_party_clone_amendment_v2.json"

EXPECTED_MANIFEST_SHA256 = "42E39C884EE60EB097EE6BA30DB63628E75CCE1F084CF691EE04C3D9B79B981F"
EXPECTED_A10B_REPORT_SHA256 = "3C667A4B2813F31B147227EE4B74AD0FAAD3B0D2D2E6B5BDC68FC7CCD93EBF2B"
EXPECTED_A10B_AMENDMENT_SHA256 = "F4199657C78C72A5E6D21C7FAFA82D2D000A377238DF3DADCB6F7F0FC72A6DD3"
EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH_HASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

BASE_A7_USAGE_MASTER_CLONE_ESTIMATE = 43887
QUERY_TIMEOUT_MS = 60000


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def nkey(value: Any):
    s = clean(value)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


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
    if cp.returncode:
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


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A10C PAYMENT-DRIVEN BUSINESSPARTY CLONE ACTION CORRECTION",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY_CORRECTION_AUDIT",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A10C] 1/5 Validating frozen inputs and Git guard...", flush=True)

        required = [
            (MANIFEST, EXPECTED_MANIFEST_SHA256, "Manifest"),
            (A10B_REPORT, EXPECTED_A10B_REPORT_SHA256, "A10B report"),
            (A10B_AMENDMENT, EXPECTED_A10B_AMENDMENT_SHA256, "A10B amendment"),
        ]
        for path, expected, label in required:
            if not path.exists():
                raise RuntimeError(f"Missing {label}: {path.name}")
            actual = sha256_file(path)
            if actual != expected:
                raise RuntimeError(
                    f"{label} SHA mismatch expected={expected} actual={actual}"
                )

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin_main = git_text("rev-parse", "origin/main")
        tracked = git_text("status", "--short", "--untracked-files=no")
        stash = git_text("rev-parse", "stash@{0}")

        if branch != "main":
            raise RuntimeError(f"Expected main, got {branch}")
        if head != EXPECTED_HEAD or origin_main != EXPECTED_HEAD:
            raise RuntimeError(f"Git baseline drift head={head} origin={origin_main}")
        if tracked:
            raise RuntimeError(f"Tracked worktree not clean: {tracked}")
        if stash != EXPECTED_STASH_HASH:
            raise RuntimeError(
                f"V2-26C stash drift expected={EXPECTED_STASH_HASH} actual={stash}"
            )

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        amendment = json.loads(A10B_AMENDMENT.read_text(encoding="utf-8"))

        if amendment.get("base_manifest_sha256") != EXPECTED_MANIFEST_SHA256:
            raise RuntimeError("A10B amendment is not anchored to the frozen base manifest")

        print("[A10C] 2/5 Resolving retained source groups...", flush=True)

        retained_group_by_company = {}
        output_groups_by_company = {}

        for entry in manifest.get("companies", []):
            lcid = clean(entry.get("legacy_company_id"))
            mode = clean(entry.get("mode"))

            if mode == "SPLIT":
                retained = clean(entry.get("retained_source_group"))
                groups = {
                    clean(g.get("group_id"))
                    for g in entry.get("output_groups", [])
                }
                if retained not in groups:
                    raise RuntimeError(
                        f"Retained group missing from output groups company={lcid} retained={retained}"
                    )
                retained_group_by_company[lcid] = retained
                output_groups_by_company[lcid] = groups

            elif mode == "PARTIAL_INCLUDE":
                retained_group_by_company[lcid] = "SOURCE_COMPANY_SURVIVES"
                output_groups_by_company[lcid] = {"SOURCE_COMPANY_SURVIVES"}

        print("[A10C] 3/5 Reclassifying coverage groups vs actual clone groups...", flush=True)

        corrected_rows = []
        all_coverage_pairs = []
        all_clone_pairs = []
        source_coverage_pairs = []

        for row in amendment.get("rows", []):
            lcid = clean(row.get("legacy_company_id"))
            legacy_contact_id = clean(row.get("legacy_contact_id"))
            current_party_id = row.get("current_business_party_id_snapshot")
            additional_groups = [
                clean(x) for x in row.get("additional_target_groups", [])
            ]

            if lcid not in retained_group_by_company:
                raise RuntimeError(
                    f"Amendment company {lcid} has no retained group in manifest"
                )

            retained_group = retained_group_by_company[lcid]
            legal_groups = output_groups_by_company[lcid]

            unknown_groups = sorted(
                set(additional_groups) - legal_groups
            )
            if unknown_groups:
                raise RuntimeError(
                    f"Unknown amendment groups company={lcid}: {unknown_groups}"
                )

            source_coverage_groups = sorted(
                g for g in additional_groups
                if g == retained_group
            )
            clone_target_groups = sorted(
                g for g in additional_groups
                if g != retained_group
            )

            for gid in additional_groups:
                all_coverage_pairs.append((lcid, legacy_contact_id, gid))

            for gid in source_coverage_groups:
                source_coverage_pairs.append((lcid, legacy_contact_id, gid))

            for gid in clone_target_groups:
                all_clone_pairs.append((lcid, legacy_contact_id, gid))

            corrected_rows.append({
                "legacy_company_id": lcid,
                "legacy_contact_id": legacy_contact_id,
                "current_business_party_id_snapshot": current_party_id,
                "display_name_snapshot": clean(row.get("display_name_snapshot")),
                "code_snapshot": clean(row.get("code_snapshot")),
                "retained_source_group": retained_group,
                "payment_usage_coverage_groups": sorted(additional_groups),
                "source_group_coverage_no_clone": source_coverage_groups,
                "additional_clone_target_groups": clone_target_groups,
                "payment_reference_counts": row.get("payment_reference_counts", {}),
                "reason": clean(row.get("reason")),
            })

        coverage_count = len(all_coverage_pairs)
        source_coverage_count = len(source_coverage_pairs)
        actual_clone_count = len(all_clone_pairs)
        revised_estimate = BASE_A7_USAGE_MASTER_CLONE_ESTIMATE + actual_clone_count

        if coverage_count != int(amendment.get("additional_business_party_clone_actions", -1)):
            raise RuntimeError(
                "A10B action count does not equal total payment-usage coverage pairs"
            )

        print("[A10C] 4/5 Verifying current BusinessParty/legacy identity safety...", flush=True)

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
        party_ct = ContentType.objects.get_for_model(BusinessParty)

        identity_errors = []
        balance_errors = []

        for row in corrected_rows:
            lcid = row["legacy_company_id"]
            legacy_contact_id = row["legacy_contact_id"]
            party_id = int(row["current_business_party_id_snapshot"])

            maps = list(
                LegacyObjectMap.objects.filter(
                    source_system="mhamcloud_v1",
                    legacy_company_id=lcid,
                    source_table="contacts",
                    legacy_id=legacy_contact_id,
                    target_content_type=party_ct,
                    target_object_id=str(party_id),
                )
            )
            if len(maps) != 1:
                identity_errors.append(
                    f"company={lcid} contact={legacy_contact_id} party={party_id} maps={len(maps)}"
                )

            party = BusinessParty.objects.filter(pk=party_id).first()
            if party is None:
                identity_errors.append(
                    f"BusinessParty missing id={party_id}"
                )
                continue

            if party.opening_balance != 0:
                balance_errors.append(
                    f"company={lcid} contact={legacy_contact_id} "
                    f"party={party_id} opening_balance={party.opening_balance}"
                )

        safety_errors = []
        if identity_errors:
            safety_errors.extend(f"IDENTITY: {x}" for x in identity_errors)
        if balance_errors:
            safety_errors.extend(f"BALANCE: {x}" for x in balance_errors)

        corrected = {
            "schema": "primeyacc.company_split_customer_payment_party_clone_amendment.v2",
            "base_manifest_sha256": EXPECTED_MANIFEST_SHA256,
            "supersedes_a10b_amendment_sha256": EXPECTED_A10B_AMENDMENT_SHA256,
            "base_a7_usage_master_clone_estimate": BASE_A7_USAGE_MASTER_CLONE_ESTIMATE,
            "payment_usage_coverage_pair_count": coverage_count,
            "source_group_coverage_no_clone_count": source_coverage_count,
            "additional_business_party_clone_actions": actual_clone_count,
            "revised_usage_master_clone_estimate": revised_estimate,
            "identity_contract": (
                "LEGACY_CONTACT_IDS_AUTHORITATIVE; "
                "CURRENT_BUSINESS_PARTY_IDS_SNAPSHOT_ONLY"
            ),
            "clone_semantics": (
                "SOURCE SURVIVOR GROUP USES CANONICAL ORIGINAL BUSINESSPARTY; "
                "ONLY NON-SOURCE OUTPUT GROUPS REQUIRE CLONES"
            ),
            "rows": corrected_rows,
        }

        CORRECTED_AMENDMENT.write_text(
            json.dumps(
                corrected,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        corrected_sha = sha256_file(CORRECTED_AMENDMENT)

        print("[A10C] 5/5 Writing corrected closure report...", flush=True)

        clone_by_company = Counter(
            lcid for lcid, _contact, _gid in all_clone_pairs
        )
        clone_by_group = Counter(
            gid for _lcid, _contact, gid in all_clone_pairs
        )
        source_coverage_by_group = Counter(
            gid for _lcid, _contact, gid in source_coverage_pairs
        )

        lines.extend([
            "===== A10C CORRECTION SUMMARY =====",
            f"A10B_REPORTED_ADDITIONAL_ACTIONS={amendment.get('additional_business_party_clone_actions')}",
            f"PAYMENT_USAGE_COVERAGE_PAIR_COUNT={coverage_count}",
            f"SOURCE_GROUP_COVERAGE_NO_CLONE_COUNT={source_coverage_count}",
            f"ACTUAL_ADDITIONAL_BUSINESSPARTY_CLONE_ACTION_COUNT={actual_clone_count}",
            f"ACTUAL_CLONE_ACTIONS_BY_COMPANY={dict(sorted(clone_by_company.items(), key=lambda x: nkey(x[0])))}",
            f"ACTUAL_CLONE_ACTIONS_BY_GROUP={dict(sorted(clone_by_group.items()))}",
            f"SOURCE_GROUP_COVERAGE_BY_GROUP={dict(sorted(source_coverage_by_group.items()))}",
            f"BASE_A7_USAGE_MASTER_CLONE_ESTIMATE={BASE_A7_USAGE_MASTER_CLONE_ESTIMATE}",
            f"CORRECTED_REVISED_USAGE_MASTER_CLONE_ESTIMATE={revised_estimate}",
            f"IDENTITY_ERROR_COUNT={len(identity_errors)}",
            f"NONZERO_OPENING_BALANCE_COUNT={len(balance_errors)}",
            f"SAFETY_ERROR_COUNT={len(safety_errors)}",
            "",
            "CORRECTED_ROWS_BEGIN",
        ])

        for row in corrected_rows:
            lines.append(json.dumps(row, ensure_ascii=False, sort_keys=True))

        lines.append("CORRECTED_ROWS_END")

        if safety_errors:
            lines.append("SAFETY_ERRORS_BEGIN")
            lines.extend(safety_errors)
            lines.append("SAFETY_ERRORS_END")

        lines.extend([
            f"CORRECTED_AMENDMENT={CORRECTED_AMENDMENT.name}",
            f"CORRECTED_AMENDMENT_SIZE={CORRECTED_AMENDMENT.stat().st_size}",
            f"CORRECTED_AMENDMENT_SHA256={corrected_sha}",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            "GIT_PUSH=0",
            f"A10C_RESULT={'PASS' if not safety_errors else 'REVIEW_REQUIRED'}",
            (
                "NEXT_STAGE=A8B_MANIFEST_AMENDMENT_FREEZE"
                if not safety_errors
                else "NEXT_STAGE=A10C_REVIEW"
            ),
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10C =====")
        print(f"A10C_RESULT={'PASS' if not safety_errors else 'REVIEW_REQUIRED'}")
        print(f"PAYMENT_USAGE_COVERAGE_PAIR_COUNT={coverage_count}")
        print(f"SOURCE_GROUP_COVERAGE_NO_CLONE_COUNT={source_coverage_count}")
        print(f"ACTUAL_ADDITIONAL_BUSINESSPARTY_CLONE_ACTION_COUNT={actual_clone_count}")
        print(f"CORRECTED_REVISED_USAGE_MASTER_CLONE_ESTIMATE={revised_estimate}")
        print(f"NONZERO_OPENING_BALANCE_COUNT={len(balance_errors)}")
        print(f"SAFETY_ERROR_COUNT={len(safety_errors)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SIZE={REPORT.stat().st_size}")
        print(f"REPORT_SHA256={report_sha}")
        print(f"CORRECTED_AMENDMENT={CORRECTED_AMENDMENT.name}")
        print(f"CORRECTED_AMENDMENT_SHA256={corrected_sha}")

        return 0 if not safety_errors else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A10C_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA10C_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A10C_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A10C =====", flush=True)
        print("A10C_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

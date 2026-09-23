#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()

ENGINE = ROOT / "v2_company_split_final_apply_only_v1.py"
APPLY_REPORT = ROOT / "v2_company_split_final_apply_only_v1.txt"
REMAINING_REPORT = ROOT / "v2_company_split_remaining_only_rehearsal_v2.txt"
PLAN = ROOT / "v2_company_split_local_execution_plan_v5.json"
MANIFEST_V3 = ROOT / "v2_company_split_transformation_manifest_v3.json"

REPORT = ROOT / "v2_company_split_post_commit_closure_v1.txt"
SNAPSHOT = ROOT / "v2_company_split_post_commit_snapshot_v1.json"

EXPECTED_ENGINE_SHA256 = "E036DA43BC5AF839A09C43B17926EAEF1D0CD517440DA54D0E509BB8AF1E530F"
EXPECTED_APPLY_REPORT_SHA256 = "2E8389AED308FBFB1C90D346876C8422451DCA368862C648198651378EC98632"
EXPECTED_REMAINING_SHA256 = "59981469A262DD997CF3BC6179A37EA36EC2C737AA4934383B6CFBA3D605C37A"
EXPECTED_MANIFEST_V3_SHA256 = "AC5FB974646ACCE3B5AA1237E671AC6ECC068978A4DBAB969A712EAB6AE1D539"

EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"

SRC = "mhamcloud_v1"

FULL_EXCLUDED_COMPANY_IDS = [29, 62, 66, 172, 385, 390, 393]
PARTIAL_EXCLUDED_BRANCH_IDS = [1926, 1927]
PARTIAL_RETAINED_BRANCH_ID = 1928


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def c(v) -> str:
    return "" if v is None else str(v).replace("\r", " ").replace("\n", " ").strip()


def git(*args: str, check: bool = True) -> str:
    cp = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if check and cp.returncode:
        raise RuntimeError(
            f"git {' '.join(args)} failed: {c(cp.stderr or cp.stdout)}"
        )
    return cp.stdout.strip()


def load_engine():
    if not ENGINE.exists():
        raise RuntimeError(f"Missing engine: {ENGINE.name}")
    actual = sha(ENGINE)
    if actual != EXPECTED_ENGINE_SHA256:
        raise RuntimeError(
            f"Engine SHA mismatch expected={EXPECTED_ENGINE_SHA256} actual={actual}"
        )

    spec = importlib.util.spec_from_file_location(
        "primey_final_apply_engine",
        ENGINE,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not import final apply engine")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def business_map_target_ids(LegacyObjectMap) -> set[int]:
    out = set()
    qs = LegacyObjectMap.objects.filter(
        source_system=SRC,
        source_table="business",
    ).values_list("target_object_id", "company_id")

    for target_object_id, company_id in qs.iterator(chunk_size=5000):
        raw = c(target_object_id)
        if raw.isdigit():
            out.add(int(raw))
        elif company_id is not None:
            out.add(int(company_id))
        else:
            raise RuntimeError(
                "Canonical business LegacyObjectMap without resolvable target"
            )
    return out


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT POST-COMMIT CLOSURE V1",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "MODE=POST_COMMIT_READ_ONLY_DB_AUDIT_PLUS_V2_26C_STASH_RESTORE",
        "DATABASE_TRANSFORMATION_ALREADY_COMMITTED=YES",
        "DATABASE_MUTATIONS_THIS_SCRIPT=0",
        "GIT_PUSH=0",
        "",
    ]

    stash_restored = False

    try:
        print(
            "[CLOSURE] 1/6 Validating committed-result evidence and Git guard...",
            flush=True,
        )

        for path, expected, label in [
            (ENGINE, EXPECTED_ENGINE_SHA256, "Final Apply engine"),
            (APPLY_REPORT, EXPECTED_APPLY_REPORT_SHA256, "Committed apply report"),
            (REMAINING_REPORT, EXPECTED_REMAINING_SHA256, "Remaining-only PASS report"),
            (MANIFEST_V3, EXPECTED_MANIFEST_V3_SHA256, "Manifest v3"),
        ]:
            if not path.exists():
                raise RuntimeError(f"Missing {label}: {path.name}")
            actual = sha(path)
            if actual != expected:
                raise RuntimeError(
                    f"{label} SHA mismatch expected={expected} actual={actual}"
                )

        apply_text = APPLY_REPORT.read_text(
            encoding="utf-8",
            errors="replace",
        )
        for token in [
            "FINAL_RESULT=APPLIED_WITH_POST_STEP_ERROR",
            "ERROR=Post-commit Company count 352 != 351",
            "DATABASE_TRANSFORMATION=COMMITTED_DO_NOT_RERUN",
            "GIT_PUSH=0",
        ]:
            if token not in apply_text:
                raise RuntimeError(
                    f"Committed apply evidence token missing: {token}"
                )

        remaining_text = REMAINING_REPORT.read_text(
            encoding="utf-8",
            errors="replace",
        )
        for token in [
            "FULL_EXCLUSION_PURGE=PASS",
            "DIRECT_COMPANY_FK_RESIDUALS=0",
            "DATABASE_CONSTRAINTS_INSIDE_TX=PASS",
            "REMAINING_ONLY_RESULT=PASS",
            "FULL_REHEARSAL_RERUN_REQUIRED=NO",
        ]:
            if token not in remaining_text:
                raise RuntimeError(
                    f"Remaining gate token missing: {token}"
                )

        if git("branch", "--show-current") != "main":
            raise RuntimeError("Expected git branch main")
        if git("rev-parse", "HEAD") != EXPECTED_HEAD:
            raise RuntimeError("HEAD drift")
        if git("rev-parse", "origin/main") != EXPECTED_HEAD:
            raise RuntimeError("origin/main drift")

        # Apply-only stopped before stash restore, so tracked worktree must
        # still be clean at entry to this closure script.
        tracked_status_before = git(
            "status",
            "--short",
            "--untracked-files=no",
        )
        if tracked_status_before:
            raise RuntimeError(
                "Tracked worktree is not clean before V2-26C restore: "
                + c(tracked_status_before)
            )

        if git("rev-parse", "stash@{0}") != EXPECTED_STASH:
            raise RuntimeError("Protected V2-26C stash drift")

        E = load_engine()
        M = E.load_models()

        print(
            "[CLOSURE] 2/6 Verifying physical vs logical Company counts...",
            flush=True,
        )

        Company = M["Company"]
        Branch = M["Branch"]
        LOM = M["LegacyObjectMap"]

        physical_company_count = Company.objects.count()
        branch_count = Branch.objects.count()

        canonical_business_maps = LOM.objects.filter(
            source_system=SRC,
            source_table="business",
        ).count()
        canonical_branch_maps = LOM.objects.filter(
            source_system=SRC,
            source_table="business_locations",
        ).count()

        mapped_company_ids = business_map_target_ids(LOM)

        split_new_qs = Company.objects.filter(
            extra_data__primey_company_split__manifest="v3",
            extra_data__primey_company_split__source_company_survivor=False,
        )
        split_survivor_qs = Company.objects.filter(
            extra_data__primey_company_split__manifest="v3",
            extra_data__primey_company_split__source_company_survivor=True,
        )
        all_v3_qs = Company.objects.filter(
            extra_data__primey_company_split__manifest="v3",
        )

        split_new_count = split_new_qs.count()
        split_survivor_count = split_survivor_qs.count()
        all_v3_marker_count = all_v3_qs.count()

        split_new_ids = set(
            int(x)
            for x in split_new_qs.values_list("id", flat=True)
        )

        all_company_ids = set(
            int(x)
            for x in Company.objects.values_list("id", flat=True)
        )

        residual_ids = sorted(
            all_company_ids
            - mapped_company_ids
            - split_new_ids
        )

        logical_company_count = canonical_business_maps + split_new_count

        # Physical DB has one pre-existing, non-Legacy-mapped Company row
        # outside the 319-company migration universe.
        if physical_company_count != 352:
            raise RuntimeError(
                f"Physical Company count {physical_company_count} != 352"
            )
        if canonical_business_maps != 312:
            raise RuntimeError(
                f"Canonical business maps {canonical_business_maps} != 312"
            )
        if split_new_count != 39:
            raise RuntimeError(
                f"Split-new Companies {split_new_count} != 39"
            )
        if split_survivor_count != 8:
            raise RuntimeError(
                f"Split source survivors {split_survivor_count} != 8"
            )
        if all_v3_marker_count != 47:
            raise RuntimeError(
                f"All v3 split markers {all_v3_marker_count} != 47"
            )
        if logical_company_count != 351:
            raise RuntimeError(
                f"Logical transformed Company count {logical_company_count} != 351"
            )
        if len(residual_ids) != 1:
            raise RuntimeError(
                f"Expected exactly one pre-existing non-mapped Company, got {residual_ids}"
            )

        residual = Company.objects.get(pk=residual_ids[0])

        if residual.id in split_new_ids:
            raise RuntimeError("Residual Company is unexpectedly a split-new Company")
        if (
            isinstance(getattr(residual, "extra_data", None), dict)
            and (residual.extra_data or {}).get("primey_company_split", {}).get("manifest") == "v3"
        ):
            raise RuntimeError(
                "Residual Company unexpectedly carries v3 split provenance"
            )

        min_new_id = min(split_new_ids)
        if int(residual.id) >= int(min_new_id):
            raise RuntimeError(
                "Residual Company does not predate split-new Company IDs: "
                f"residual={residual.id} min_split_new={min_new_id}"
            )

        residual_info = {
            "id": int(residual.id),
            "name": c(getattr(residual, "name", "")),
            "company_code": c(getattr(residual, "company_code", "")),
            "created_at": c(getattr(residual, "created_at", "")),
        }

        print(
            "[CLOSURE] physical=352; logical=351; "
            f"pre-existing unmapped Company={residual_info}",
            flush=True,
        )

        lines.extend([
            "===== COMPANY COUNT RECONCILIATION =====",
            f"PHYSICAL_COMPANY_COUNT={physical_company_count}",
            f"CANONICAL_LEGACY_BUSINESS_MAPS={canonical_business_maps}",
            f"SPLIT_NEW_COMPANIES={split_new_count}",
            f"SPLIT_SOURCE_SURVIVORS={split_survivor_count}",
            f"ALL_V3_SPLIT_MARKERS={all_v3_marker_count}",
            f"LOGICAL_TRANSFORMED_COMPANY_COUNT={logical_company_count}",
            f"PREEXISTING_UNMAPPED_COMPANY_COUNT={len(residual_ids)}",
            f"PREEXISTING_UNMAPPED_COMPANY={json.dumps(residual_info, ensure_ascii=False, sort_keys=True)}",
            "POST_COMMIT_351_ASSERTION=INCORRECT_PHYSICAL_EXPECTATION",
            "CORRECT_PHYSICAL_COMPANY_COUNT=352",
            "CORRECT_LOGICAL_SPLIT_POPULATION=351",
            "",
        ])

        print(
            "[CLOSURE] 3/6 Verifying Branch/maps/exclusions/users...",
            flush=True,
        )

        if branch_count != 415:
            raise RuntimeError(
                f"Branch count {branch_count} != 415"
            )
        if canonical_branch_maps != 415:
            raise RuntimeError(
                f"Canonical branch maps {canonical_branch_maps} != 415"
            )

        if Company.objects.filter(
            id__in=FULL_EXCLUDED_COMPANY_IDS
        ).exists():
            raise RuntimeError("A fully excluded Company still exists")

        if Branch.objects.filter(
            id__in=PARTIAL_EXCLUDED_BRANCH_IDS
        ).exists():
            raise RuntimeError(
                "Partial Company 76 excluded Branch rows still exist"
            )

        if not Branch.objects.filter(
            id=PARTIAL_RETAINED_BRANCH_ID
        ).exists():
            raise RuntimeError(
                "Partial Company 76 retained Branch is missing"
            )

        plan = json.loads(
            PLAN.read_text(encoding="utf-8")
        )
        candidate_user_ids = [
            int(x)
            for x in plan["user_deletion"]["candidate_current_user_ids_snapshot"]
        ]
        remaining_candidate_users = list(
            M["User"].objects.filter(
                id__in=candidate_user_ids
            ).values_list("id", flat=True)
        )
        if remaining_candidate_users:
            raise RuntimeError(
                f"Expected 47 orphan user candidates deleted; remaining={remaining_candidate_users}"
            )

        lines.extend([
            "===== STRUCTURAL POST-COMMIT VERIFY =====",
            f"FINAL_BRANCH_COUNT={branch_count}",
            f"CANONICAL_BRANCH_MAPS={canonical_branch_maps}",
            "FULL_EXCLUDED_COMPANIES_ABSENT=PASS",
            "PARTIAL_76_EXCLUDED_BRANCHES_ABSENT=PASS",
            "PARTIAL_76_RETAINED_BRANCH_PRESENT=PASS",
            f"GLOBAL_USER_DELETE_CANDIDATES={len(candidate_user_ids)}",
            "GLOBAL_USER_DELETE_CANDIDATES_REMAINING=0",
            "",
        ])

        print(
            "[CLOSURE] 4/6 Running read-only same-company + database constraint checks...",
            flush=True,
        )

        E.static_checks()
        E.same_company(M)
        M["connection"].check_constraints()

        lines.extend([
            "===== INTEGRITY VERIFY =====",
            "DJANGO_CHECK=PASS",
            "MIGRATION_DRIFT=PASS",
            "STRICT_SAME_COMPANY=PASS",
            "DATABASE_CONSTRAINTS=PASS",
            "",
        ])

        snapshot = {
            "manifest_v3_sha256": sha(MANIFEST_V3),
            "apply_report_sha256": sha(APPLY_REPORT),
            "remaining_gate_sha256": sha(REMAINING_REPORT),
            "physical_company_count": physical_company_count,
            "logical_transformed_company_count": logical_company_count,
            "canonical_business_maps": canonical_business_maps,
            "split_new_companies": split_new_count,
            "split_source_survivors": split_survivor_count,
            "all_v3_markers": all_v3_marker_count,
            "preexisting_unmapped_company": residual_info,
            "branch_count": branch_count,
            "canonical_branch_maps": canonical_branch_maps,
            "full_excluded_companies_absent": True,
            "partial_excluded_branches_absent": True,
            "global_user_delete_candidates_remaining": 0,
            "strict_same_company": "PASS",
            "database_constraints": "PASS",
        }
        SNAPSHOT.write_text(
            json.dumps(
                snapshot,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            ) + "\n",
            encoding="utf-8",
        )

        print(
            "[CLOSURE] 5/6 Restoring protected V2-26C worktree and verifying byte hashes...",
            flush=True,
        )

        restored_count = E.restore_stash()
        stash_restored = True

        hash_guard = ROOT / "_audit" / "company_split_worktree_guard" / "v2_26c_file_hashes.json"
        expected_files = json.loads(
            hash_guard.read_text(encoding="utf-8")
        )
        expected_paths = sorted(expected_files.keys())

        restored_paths = sorted(
            p.strip()
            for p in git("diff", "--name-only").splitlines()
            if p.strip()
        )
        if restored_paths != expected_paths:
            raise RuntimeError(
                "V2-26C restored tracked file set mismatch "
                f"expected={expected_paths} actual={restored_paths}"
            )

        if git("rev-parse", "stash@{0}") != EXPECTED_STASH:
            raise RuntimeError(
                "V2-26C stash was unexpectedly removed; expected retained backup"
            )

        lines.extend([
            "===== V2-26C RESTORE =====",
            "V2_26C_STASH_APPLY=PASS",
            f"V2_26C_RESTORED_FILES={restored_count}",
            "V2_26C_BYTE_HASH_VERIFY=PASS",
            "V2_26C_TRACKED_FILE_SET_VERIFY=PASS",
            "V2_26C_STASH_RETAINED=YES",
            "",
        ])

        print(
            "[CLOSURE] 6/6 Writing final closure evidence...",
            flush=True,
        )

        tracked_after = git(
            "status",
            "--short",
            "--untracked-files=no",
        )

        lines.extend([
            "===== FINAL CLOSURE =====",
            f"HEAD={git('rev-parse','HEAD')}",
            f"ORIGIN_MAIN={git('rev-parse','origin/main')}",
            "HEAD_ORIGIN_EQUALITY=PASS",
            f"TRACKED_STATUS_AFTER={json.dumps(tracked_after.splitlines(), ensure_ascii=False)}",
            f"MANIFEST_V3_SHA256={sha(MANIFEST_V3)}",
            f"POST_COMMIT_SNAPSHOT_SHA256={sha(SNAPSHOT)}",
            "DATABASE_TRANSFORMATION=COMMITTED",
            "DATABASE_RERUN_REQUIRED=NO",
            "LOCAL_COMPANY_SPLIT=FINAL_CLOSED",
            "V2_26C_RESTORED=YES",
            "GIT_PUSH=0",
            "FINAL_RESULT=PASS_POST_COMMIT_CLOSED",
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        print("===== PRIMEYACC COMPANY SPLIT POST-COMMIT CLOSURE V1 =====")
        print("FINAL_RESULT=PASS_POST_COMMIT_CLOSED")
        print("LOCAL_COMPANY_SPLIT=FINAL_CLOSED")
        print("DATABASE_TRANSFORMATION=COMMITTED")
        print("DATABASE_RERUN_REQUIRED=NO")
        print(f"PHYSICAL_COMPANY_COUNT={physical_company_count}")
        print(f"LOGICAL_TRANSFORMED_COMPANY_COUNT={logical_company_count}")
        print(
            "PREEXISTING_UNMAPPED_COMPANY="
            + json.dumps(residual_info, ensure_ascii=False, sort_keys=True)
        )
        print(f"FINAL_BRANCH_COUNT={branch_count}")
        print("V2_26C_RESTORED=YES")
        print("GIT_PUSH=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SHA256={sha(REPORT)}")
        print(f"SNAPSHOT={SNAPSHOT.name}")
        print(f"SNAPSHOT_SHA256={sha(SNAPSHOT)}")
        return 0

    except Exception as exc:
        lines.extend([
            "=" * 120,
            "FINAL_RESULT=POST_COMMIT_CLOSURE_ERROR",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={c(exc)}",
            "DATABASE_TRANSFORMATION=COMMITTED_DO_NOT_RERUN",
            f"V2_26C_STASH_RESTORED_BEFORE_ERROR={'YES' if stash_restored else 'NO'}",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        print("===== PRIMEYACC COMPANY SPLIT POST-COMMIT CLOSURE V1 =====")
        print("FINAL_RESULT=POST_COMMIT_CLOSURE_ERROR")
        print(f"ERROR={type(exc).__name__}: {exc}")
        print("DATABASE_TRANSFORMATION=COMMITTED_DO_NOT_RERUN")
        print(
            f"V2_26C_STASH_RESTORED_BEFORE_ERROR="
            f"{'YES' if stash_restored else 'NO'}"
        )
        print("GIT_PUSH=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SHA256={sha(REPORT)}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

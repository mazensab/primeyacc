#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()

V1_REPORT = ROOT / "v2_company_split_post_commit_closure_v1.txt"
EXPECTED_V1_REPORT_SHA256 = "B642A508A86FF9BEB1560329D631E60C1477C7BBDDCA08F95F5DCD5BF745C4D6"

GUARD_ROOT = ROOT / "_audit" / "company_split_worktree_guard"
HASH_GUARD = GUARD_ROOT / "v2_26c_file_hashes.json"
SNAPSHOT_ROOT = GUARD_ROOT / "v2_26c_snapshot"
ATTEMPT_BACKUP_ROOT = GUARD_ROOT / "post_commit_restore_attempt_v1"

REPORT = ROOT / "v2_company_split_post_commit_closure_v2.txt"

EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def sha(path: Path) -> str:
    return sha_bytes(path.read_bytes())


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


def normalized_text_bytes(data: bytes) -> bytes | None:
    # Diagnostic only: determine whether a mismatch is line-ending-only.
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return None
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def current_tracked_changed_paths() -> list[str]:
    unstaged = {
        x.strip()
        for x in git("diff", "--name-only").splitlines()
        if x.strip()
    }
    staged = {
        x.strip()
        for x in git("diff", "--cached", "--name-only").splitlines()
        if x.strip()
    }
    return sorted(unstaged | staged)


def candidate_snapshot_from_row(row: dict, rel: str) -> list[Path]:
    out = []

    direct = SNAPSHOT_ROOT / rel
    out.append(direct)

    for key, value in row.items():
        if "snapshot" not in str(key).lower():
            continue
        if not isinstance(value, str) or not value.strip():
            continue
        raw = Path(value)
        if raw.is_absolute():
            out.append(raw)
        else:
            out.append(ROOT / raw)
            out.append(GUARD_ROOT / raw)
            out.append(SNAPSHOT_ROOT / raw)

    return out


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT POST-COMMIT CLOSURE V2",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "MODE=V2_26C_EXACT_BYTE_RESTORE_ONLY",
        "DATABASE_TRANSFORMATION_ALREADY_COMMITTED=YES",
        "DATABASE_MUTATIONS_THIS_SCRIPT=0",
        "TRANSFORMATION_RERUN=NO",
        "GIT_PUSH=0",
        "",
    ]

    repaired = False

    try:
        print(
            "[CLOSURE-V2] 1/5 Validating committed DB closure evidence...",
            flush=True,
        )

        if not V1_REPORT.exists():
            raise RuntimeError(f"Missing prior closure report: {V1_REPORT.name}")
        if sha(V1_REPORT) != EXPECTED_V1_REPORT_SHA256:
            raise RuntimeError(
                "Prior closure report SHA drift "
                f"expected={EXPECTED_V1_REPORT_SHA256} actual={sha(V1_REPORT)}"
            )

        v1 = V1_REPORT.read_text(encoding="utf-8", errors="replace")
        for token in [
            "PHYSICAL_COMPANY_COUNT=352",
            "CANONICAL_LEGACY_BUSINESS_MAPS=312",
            "SPLIT_NEW_COMPANIES=39",
            "SPLIT_SOURCE_SURVIVORS=8",
            "ALL_V3_SPLIT_MARKERS=47",
            "LOGICAL_TRANSFORMED_COMPANY_COUNT=351",
            "FINAL_BRANCH_COUNT=415",
            "CANONICAL_BRANCH_MAPS=415",
            "FULL_EXCLUDED_COMPANIES_ABSENT=PASS",
            "PARTIAL_76_EXCLUDED_BRANCHES_ABSENT=PASS",
            "GLOBAL_USER_DELETE_CANDIDATES_REMAINING=0",
            "DJANGO_CHECK=PASS",
            "MIGRATION_DRIFT=PASS",
            "STRICT_SAME_COMPANY=PASS",
            "DATABASE_CONSTRAINTS=PASS",
            "DATABASE_TRANSFORMATION=COMMITTED_DO_NOT_RERUN",
            "ERROR=V2-26C hash restore mismatch",
        ]:
            if token not in v1:
                raise RuntimeError(
                    f"Prior closure evidence token missing: {token}"
                )

        if git("branch", "--show-current") != "main":
            raise RuntimeError("Expected git branch main")
        if git("rev-parse", "HEAD") != EXPECTED_HEAD:
            raise RuntimeError("HEAD drift")
        if git("rev-parse", "origin/main") != EXPECTED_HEAD:
            raise RuntimeError("origin/main drift")
        if git("rev-parse", "stash@{0}") != EXPECTED_STASH:
            raise RuntimeError("Protected V2-26C stash drift")

        lines.extend([
            "===== REUSED COMMITTED DB EVIDENCE =====",
            f"V1_REPORT_SHA256={sha(V1_REPORT)}",
            "PHYSICAL_COMPANY_COUNT=352",
            "LOGICAL_TRANSFORMED_COMPANY_COUNT=351",
            "FINAL_BRANCH_COUNT=415",
            "STRICT_SAME_COMPANY=PASS",
            "DATABASE_CONSTRAINTS=PASS",
            "DATABASE_TRANSFORMATION=COMMITTED",
            "DATABASE_RERUN_REQUIRED=NO",
            "",
        ])

        print(
            "[CLOSURE-V2] 2/5 Locating exact A9 byte snapshots for the 10 V2-26C files...",
            flush=True,
        )

        if not HASH_GUARD.exists():
            raise RuntimeError(f"Missing hash guard: {HASH_GUARD}")
        if not SNAPSHOT_ROOT.exists():
            raise RuntimeError(f"Missing snapshot root: {SNAPSHOT_ROOT}")

        expected = json.loads(HASH_GUARD.read_text(encoding="utf-8"))
        expected_paths = sorted(expected.keys())

        if len(expected_paths) != 10:
            raise RuntimeError(
                f"Expected exactly 10 V2-26C guarded files, got {len(expected_paths)}"
            )

        # Safety: after the failed V1 restore attempt, only these guarded files
        # are allowed to be tracked modifications.
        changed_before = current_tracked_changed_paths()
        unexpected = sorted(set(changed_before) - set(expected_paths))
        if unexpected:
            raise RuntimeError(
                f"Unexpected tracked modifications before exact restore: {unexpected}"
            )

        # Build an exact-hash index of all saved A9 snapshot files.
        snapshot_hash_index: dict[str, list[Path]] = defaultdict(list)
        for p in SNAPSHOT_ROOT.rglob("*"):
            if p.is_file():
                snapshot_hash_index[sha(p)].append(p)

        resolved: dict[str, Path] = {}
        diagnostic = {}

        for rel in expected_paths:
            row = expected[rel]
            expected_sha = c(row.get("working_tree_sha256"))
            if len(expected_sha) != 64:
                raise RuntimeError(
                    f"Invalid expected working_tree_sha256 for {rel}: {expected_sha}"
                )

            candidates = []
            for p in candidate_snapshot_from_row(row, rel):
                if p.exists() and p.is_file():
                    candidates.append(p)

            # Exact SHA lookup is authoritative and handles flattened/mirrored
            # snapshot layouts without guessing their path convention.
            candidates.extend(snapshot_hash_index.get(expected_sha, []))

            exact = []
            seen = set()
            for p in candidates:
                key = str(p.resolve())
                if key in seen:
                    continue
                seen.add(key)
                if sha(p) == expected_sha:
                    exact.append(p)

            if not exact:
                raise RuntimeError(
                    f"No exact A9 snapshot found for {rel} expected_sha={expected_sha}"
                )

            resolved[rel] = exact[0]

            target = ROOT / rel
            current_sha = sha(target) if target.exists() else ""
            eol_only = False
            if target.exists() and current_sha != expected_sha:
                cur_norm = normalized_text_bytes(target.read_bytes())
                snap_norm = normalized_text_bytes(exact[0].read_bytes())
                eol_only = (
                    cur_norm is not None
                    and snap_norm is not None
                    and cur_norm == snap_norm
                )

            diagnostic[rel] = {
                "expected_sha256": expected_sha,
                "current_sha256_before": current_sha,
                "snapshot_path": str(exact[0].relative_to(ROOT))
                if exact[0].is_relative_to(ROOT)
                else str(exact[0]),
                "mismatch_before": current_sha != expected_sha,
                "line_endings_only_before": eol_only,
            }

        lines.extend([
            "===== SNAPSHOT RESOLUTION =====",
            f"GUARDED_FILE_COUNT={len(expected_paths)}",
            "A9_EXACT_SNAPSHOT_RESOLUTION=PASS",
            f"TRACKED_CHANGED_PATHS_BEFORE={json.dumps(changed_before, ensure_ascii=False)}",
            f"DIAGNOSTIC={json.dumps(diagnostic, ensure_ascii=False, sort_keys=True)}",
            "",
        ])

        print(
            "[CLOSURE-V2] 3/5 Restoring exact original bytes from A9 snapshots...",
            flush=True,
        )

        # Two-phase discipline: all snapshots were validated before this point.
        # Back up the current stash-applied variants, then write exact A9 bytes.
        if ATTEMPT_BACKUP_ROOT.exists():
            shutil.rmtree(ATTEMPT_BACKUP_ROOT)

        for rel in expected_paths:
            target = ROOT / rel
            snapshot = resolved[rel]

            if target.exists():
                backup = ATTEMPT_BACKUP_ROOT / rel
                backup.parent.mkdir(parents=True, exist_ok=True)
                backup.write_bytes(target.read_bytes())

            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(snapshot.read_bytes())

        repaired = True

        bad_after = []
        for rel in expected_paths:
            target = ROOT / rel
            expected_sha = c(expected[rel].get("working_tree_sha256"))
            actual_sha = sha(target) if target.exists() else ""
            if actual_sha != expected_sha:
                bad_after.append(
                    {
                        "path": rel,
                        "expected": expected_sha,
                        "actual": actual_sha,
                    }
                )

        if bad_after:
            raise RuntimeError(
                "Exact A9 byte restore still mismatched: "
                + json.dumps(bad_after, ensure_ascii=False)
            )

        print(
            "[CLOSURE-V2] exact byte SHA verification PASS for all 10 files",
            flush=True,
        )

        lines.extend([
            "===== EXACT BYTE RESTORE =====",
            "V2_26C_RESTORE_SOURCE=A9_BYTE_SNAPSHOTS",
            "GIT_STASH_REAPPLY=NO",
            "V2_26C_EXACT_BYTE_RESTORE=PASS",
            "V2_26C_BYTE_HASH_VERIFY=PASS",
            f"V2_26C_RESTORED_FILES={len(expected_paths)}",
            "",
        ])

        print(
            "[CLOSURE-V2] 4/5 Verifying tracked file set and retained stash...",
            flush=True,
        )

        changed_after = current_tracked_changed_paths()
        if changed_after != expected_paths:
            raise RuntimeError(
                "Restored tracked file set mismatch "
                f"expected={expected_paths} actual={changed_after}"
            )

        if git("rev-parse", "stash@{0}") != EXPECTED_STASH:
            raise RuntimeError(
                "Protected V2-26C stash is no longer retained"
            )

        lines.extend([
            "===== WORKTREE VERIFY =====",
            f"V2_26C_TRACKED_FILE_SET={json.dumps(changed_after, ensure_ascii=False)}",
            "V2_26C_TRACKED_FILE_SET_VERIFY=PASS",
            "V2_26C_STASH_RETAINED=YES",
            f"V2_26C_STASH_HASH={EXPECTED_STASH}",
            "",
        ])

        print(
            "[CLOSURE-V2] 5/5 Finalizing local closure evidence...",
            flush=True,
        )

        lines.extend([
            "===== FINAL CLOSURE =====",
            f"HEAD={git('rev-parse','HEAD')}",
            f"ORIGIN_MAIN={git('rev-parse','origin/main')}",
            "HEAD_ORIGIN_EQUALITY=PASS",
            "DATABASE_TRANSFORMATION=COMMITTED",
            "DATABASE_RERUN_REQUIRED=NO",
            "LOCAL_COMPANY_SPLIT=FINAL_CLOSED",
            "V2_26C_RESTORED=YES",
            "V2_26C_EXACT_BYTE_HASHES=PASS",
            "V2_26C_STASH_RETAINED=YES",
            "GIT_PUSH=0",
            "FINAL_RESULT=PASS_POST_COMMIT_CLOSED",
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        print("===== PRIMEYACC COMPANY SPLIT POST-COMMIT CLOSURE V2 =====")
        print("FINAL_RESULT=PASS_POST_COMMIT_CLOSED")
        print("LOCAL_COMPANY_SPLIT=FINAL_CLOSED")
        print("DATABASE_TRANSFORMATION=COMMITTED")
        print("DATABASE_RERUN_REQUIRED=NO")
        print("PHYSICAL_COMPANY_COUNT=352")
        print("LOGICAL_TRANSFORMED_COMPANY_COUNT=351")
        print("FINAL_BRANCH_COUNT=415")
        print("V2_26C_RESTORED=YES")
        print("V2_26C_EXACT_BYTE_HASHES=PASS")
        print("V2_26C_STASH_RETAINED=YES")
        print("GIT_PUSH=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SHA256={sha(REPORT)}")
        return 0

    except Exception as exc:
        lines.extend([
            "=" * 120,
            "FINAL_RESULT=POST_COMMIT_CLOSURE_V2_ERROR",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={c(exc)}",
            "DATABASE_TRANSFORMATION=COMMITTED_DO_NOT_RERUN",
            f"EXACT_SNAPSHOT_WRITE_STARTED={'YES' if repaired else 'NO'}",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        print("===== PRIMEYACC COMPANY SPLIT POST-COMMIT CLOSURE V2 =====")
        print("FINAL_RESULT=POST_COMMIT_CLOSURE_V2_ERROR")
        print(f"ERROR={type(exc).__name__}: {exc}")
        print("DATABASE_TRANSFORMATION=COMMITTED_DO_NOT_RERUN")
        print(
            f"EXACT_SNAPSHOT_WRITE_STARTED={'YES' if repaired else 'NO'}"
        )
        print("GIT_PUSH=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SHA256={sha(REPORT)}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

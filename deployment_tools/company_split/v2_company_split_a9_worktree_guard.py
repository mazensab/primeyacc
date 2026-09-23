#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()

A8_REPORT = ROOT / "v2_company_split_a8_transformation_blueprint_freeze.txt"
MANIFEST = ROOT / "v2_company_split_transformation_manifest.json"
REPORT = ROOT / "v2_company_split_a9_worktree_guard.txt"

EXPECTED_A8_SHA256 = "71A2FD0372670311F7B29B483EDCE727763943232466E9B06CA7F6CA7919A9C2"
EXPECTED_MANIFEST_SHA256 = "42E39C884EE60EB097EE6BA30DB63628E75CCE1F084CF691EE04C3D9B79B981F"

EXPECTED_TRACKED_DIRTY = {
    "api/company/sales/invoices/detail.py",
    "api/company/sales/invoices/list.py",
    "api/company/sales/returns/detail.py",
    "primey_frontend_v2/app/company/page.tsx",
    "primey_frontend_v2/components/layout/header/index.tsx",
    "primey_frontend_v2/components/layout/header/user-menu.tsx",
    "primey_frontend_v2/components/layout/sidebar/app-sidebar.tsx",
    "primey_frontend_v2/components/layout/sidebar/nav-main.tsx",
    "primey_frontend_v2/lib/excel-report.ts",
    "primey_frontend_v2/lib/print-report.ts",
}

GUARD_DIR = ROOT / "_audit" / "company_split_worktree_guard"
SNAPSHOT_DIR = GUARD_DIR / "v2_26c_snapshot"
COMBINED_PATCH = GUARD_DIR / "v2_26c_tracked_combined.patch"
UNSTAGED_PATCH = GUARD_DIR / "v2_26c_unstaged.patch"
STAGED_PATCH = GUARD_DIR / "v2_26c_staged.patch"
HASHES_JSON = GUARD_DIR / "v2_26c_file_hashes.json"

STASH_MESSAGE = "primeyacc-company-split-A9-v2-26c-guard"


def clean(value) -> str:
    if value is None:
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    cp = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if check and cp.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed rc={cp.returncode}: "
            f"{clean(cp.stderr or cp.stdout)}"
        )
    return cp


def git_text(*args: str) -> str:
    return run_git(*args).stdout.strip()


def write_patch(path: Path, *git_args: str) -> str:
    cp = subprocess.run(
        ["git", *git_args],
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    if cp.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(git_args)} failed rc={cp.returncode}: "
            f"{cp.stderr.decode('utf-8', errors='replace').strip()}"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(cp.stdout)
    return sha256_file(path)


def tracked_changed_paths() -> set[str]:
    out = git_text("diff", "--name-only", "HEAD", "--")
    return {line.strip().replace("\\", "/") for line in out.splitlines() if line.strip()}


def staged_paths() -> set[str]:
    out = git_text("diff", "--cached", "--name-only", "--")
    return {line.strip().replace("\\", "/") for line in out.splitlines() if line.strip()}


def unstaged_paths() -> set[str]:
    out = git_text("diff", "--name-only", "--")
    return {line.strip().replace("\\", "/") for line in out.splitlines() if line.strip()}


def main() -> int:
    generated_at = datetime.now(timezone.utc).isoformat()
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A9 WORKTREE GUARD & MUTATION GATE",
        "=" * 120,
        f"GENERATED_AT_UTC={generated_at}",
        f"ROOT={ROOT}",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[A9] 1/7 Validating A8 + manifest...", flush=True)

        if not A8_REPORT.exists():
            raise RuntimeError(f"Missing {A8_REPORT.name}")
        if not MANIFEST.exists():
            raise RuntimeError(f"Missing {MANIFEST.name}")

        a8_sha = sha256_file(A8_REPORT)
        manifest_sha = sha256_file(MANIFEST)

        if a8_sha != EXPECTED_A8_SHA256:
            raise RuntimeError(
                f"A8 SHA mismatch expected={EXPECTED_A8_SHA256} actual={a8_sha}"
            )
        if manifest_sha != EXPECTED_MANIFEST_SHA256:
            raise RuntimeError(
                f"Manifest SHA mismatch expected={EXPECTED_MANIFEST_SHA256} actual={manifest_sha}"
            )

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        expected_counts = manifest.get("expected_counts") or {}
        if expected_counts.get("post_transform_companies") != 351:
            raise RuntimeError("Manifest expected final company count changed")
        if expected_counts.get("post_transform_branches") != 415:
            raise RuntimeError("Manifest expected final branch count changed")

        lines.extend([
            "===== FROZEN TRANSFORMATION =====",
            f"A8_SHA256={a8_sha}",
            f"MANIFEST_SHA256={manifest_sha}",
            f"MANIFEST_SCHEMA={clean(manifest.get('schema'))}",
            "",
        ])

        print("[A9] 2/7 Validating Git baseline and exact dirty set...", flush=True)

        branch = git_text("branch", "--show-current")
        head = git_text("rev-parse", "HEAD")
        origin_main = git_text("rev-parse", "origin/main")
        changed = tracked_changed_paths()
        staged = staged_paths()
        unstaged = unstaged_paths()
        conflicts = {
            line.strip().replace("\\", "/")
            for line in git_text("diff", "--name-only", "--diff-filter=U", "--").splitlines()
            if line.strip()
        }

        lines.extend([
            "===== PRE-GUARD GIT STATE =====",
            f"BRANCH={branch}",
            f"HEAD={head}",
            f"ORIGIN_MAIN={origin_main}",
            f"HEAD_ORIGIN_EQUALITY={'PASS' if head == origin_main else 'FAIL'}",
            f"TRACKED_CHANGED_COUNT={len(changed)}",
            f"STAGED_COUNT={len(staged)}",
            f"UNSTAGED_COUNT={len(unstaged)}",
            f"CONFLICT_COUNT={len(conflicts)}",
            f"TRACKED_CHANGED={sorted(changed)}",
            f"STAGED={sorted(staged)}",
            f"UNSTAGED={sorted(unstaged)}",
            "",
        ])

        if branch != "main":
            raise RuntimeError(f"Expected branch main, got {branch}")
        if head != origin_main:
            raise RuntimeError(
                f"HEAD/origin/main mismatch head={head} origin={origin_main}"
            )
        if conflicts:
            raise RuntimeError(f"Merge conflicts present: {sorted(conflicts)}")
        if changed != EXPECTED_TRACKED_DIRTY:
            missing = sorted(EXPECTED_TRACKED_DIRTY - changed)
            extra = sorted(changed - EXPECTED_TRACKED_DIRTY)
            raise RuntimeError(
                "Tracked dirty set drifted from frozen A8 state. "
                f"missing={missing} extra={extra}"
            )

        print("[A9] 3/7 Creating byte-for-byte snapshots and patches...", flush=True)

        GUARD_DIR.mkdir(parents=True, exist_ok=True)

        if SNAPSHOT_DIR.exists():
            shutil.rmtree(SNAPSHOT_DIR)
        SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

        file_hashes = {}
        for rel in sorted(EXPECTED_TRACKED_DIRTY):
            src = ROOT / rel
            if not src.exists():
                raise RuntimeError(f"Expected dirty file missing: {rel}")

            dst = SNAPSHOT_DIR / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

            file_hashes[rel] = {
                "working_tree_sha256": sha256_file(src),
                "snapshot_sha256": sha256_file(dst),
            }

            if file_hashes[rel]["working_tree_sha256"] != file_hashes[rel]["snapshot_sha256"]:
                raise RuntimeError(f"Snapshot hash mismatch for {rel}")

        HASHES_JSON.write_text(
            json.dumps(file_hashes, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

        combined_patch_sha = write_patch(
            COMBINED_PATCH,
            "diff", "--binary", "HEAD", "--", *sorted(EXPECTED_TRACKED_DIRTY)
        )
        unstaged_patch_sha = write_patch(
            UNSTAGED_PATCH,
            "diff", "--binary", "--", *sorted(EXPECTED_TRACKED_DIRTY)
        )
        staged_patch_sha = write_patch(
            STAGED_PATCH,
            "diff", "--cached", "--binary", "--", *sorted(EXPECTED_TRACKED_DIRTY)
        )

        if COMBINED_PATCH.stat().st_size == 0:
            raise RuntimeError("Combined patch unexpectedly empty")

        lines.extend([
            "===== GUARD ARTIFACTS =====",
            f"SNAPSHOT_DIR={SNAPSHOT_DIR.relative_to(ROOT)}",
            f"SNAPSHOT_FILE_COUNT={len(file_hashes)}",
            f"HASHES_JSON={HASHES_JSON.relative_to(ROOT)}",
            f"HASHES_JSON_SHA256={sha256_file(HASHES_JSON)}",
            f"COMBINED_PATCH={COMBINED_PATCH.relative_to(ROOT)}",
            f"COMBINED_PATCH_SIZE={COMBINED_PATCH.stat().st_size}",
            f"COMBINED_PATCH_SHA256={combined_patch_sha}",
            f"UNSTAGED_PATCH_SIZE={UNSTAGED_PATCH.stat().st_size}",
            f"UNSTAGED_PATCH_SHA256={unstaged_patch_sha}",
            f"STAGED_PATCH_SIZE={STAGED_PATCH.stat().st_size}",
            f"STAGED_PATCH_SHA256={staged_patch_sha}",
            "",
        ])

        print("[A9] 4/7 Creating Git stash for exactly the frozen V2-26C files...", flush=True)

        pre_stash_top = git_text("rev-parse", "-q", "--verify", "refs/stash") if run_git(
            "rev-parse", "-q", "--verify", "refs/stash", check=False
        ).returncode == 0 else ""

        cp = run_git(
            "stash",
            "push",
            "-m",
            STASH_MESSAGE,
            "--",
            *sorted(EXPECTED_TRACKED_DIRTY),
        )

        stash_output = clean(cp.stdout)
        if "No local changes to save" in stash_output:
            raise RuntimeError("Git reported no local changes to save")

        stash_hash = git_text("rev-parse", "refs/stash")
        if not stash_hash:
            raise RuntimeError("Could not resolve refs/stash after stash push")
        if pre_stash_top and stash_hash == pre_stash_top:
            raise RuntimeError("refs/stash did not advance")

        stash_list_top = git_text("stash", "list", "-1", "--format=%gd|%H|%gs")
        stash_names = {
            line.strip().replace("\\", "/")
            for line in git_text(
                "stash", "show", "--name-only", "--format=", "stash@{0}"
            ).splitlines()
            if line.strip()
        }

        if stash_names != EXPECTED_TRACKED_DIRTY:
            raise RuntimeError(
                "Stash path set mismatch. "
                f"expected={sorted(EXPECTED_TRACKED_DIRTY)} actual={sorted(stash_names)}"
            )

        lines.extend([
            "===== STASH =====",
            f"STASH_MESSAGE={STASH_MESSAGE}",
            f"STASH_HASH={stash_hash}",
            f"STASH_TOP={stash_list_top}",
            f"STASH_PATH_COUNT={len(stash_names)}",
            f"STASH_PATHS={sorted(stash_names)}",
            "",
        ])

        print("[A9] 5/7 Verifying tracked worktree is clean...", flush=True)

        post_changed = tracked_changed_paths()
        post_status = git_text("status", "--short", "--untracked-files=no")

        if post_changed:
            raise RuntimeError(
                f"Tracked worktree still dirty after stash: {sorted(post_changed)}"
            )
        if post_status:
            raise RuntimeError(
                f"Tracked status not clean after stash: {post_status}"
            )

        # Untracked audit/manifest artifacts must remain available.
        if not MANIFEST.exists():
            raise RuntimeError("Manifest disappeared after stash")
        if sha256_file(MANIFEST) != EXPECTED_MANIFEST_SHA256:
            raise RuntimeError("Manifest SHA changed after stash")
        if not A8_REPORT.exists():
            raise RuntimeError("A8 report disappeared after stash")
        if sha256_file(A8_REPORT) != EXPECTED_A8_SHA256:
            raise RuntimeError("A8 SHA changed after stash")

        print("[A9] 6/7 Verifying recovery path...", flush=True)

        # Ensure stash can be inspected and guard snapshots still match.
        recovery_errors = []
        for rel, hashes in file_hashes.items():
            snap = SNAPSHOT_DIR / rel
            if not snap.exists():
                recovery_errors.append(f"snapshot_missing:{rel}")
            elif sha256_file(snap) != hashes["working_tree_sha256"]:
                recovery_errors.append(f"snapshot_hash_drift:{rel}")

        if recovery_errors:
            raise RuntimeError(
                f"Recovery artifact validation failed: {recovery_errors}"
            )

        lines.extend([
            "===== POST-GUARD GIT STATE =====",
            f"POST_HEAD={git_text('rev-parse','HEAD')}",
            f"POST_ORIGIN_MAIN={git_text('rev-parse','origin/main')}",
            "TRACKED_WORKTREE_CLEAN=PASS",
            f"MANIFEST_SHA256_POST={sha256_file(MANIFEST)}",
            f"A8_SHA256_POST={sha256_file(A8_REPORT)}",
            f"RECOVERY_ARTIFACT_ERRORS={len(recovery_errors)}",
            "",
        ])

        print("[A9] 7/7 Freezing mutation gate...", flush=True)

        lines.extend([
            "=" * 120,
            "A9 MUTATION GATE",
            "=" * 120,
            "WORKTREE_GUARD=PASS",
            "V2_26C_STASHED=YES",
            "V2_26C_RECOVERY_PATCH=PASS",
            "V2_26C_BYTE_SNAPSHOTS=PASS",
            "HEAD_ORIGIN_EQUALITY=PASS",
            "TRACKED_WORKTREE_CLEAN=PASS",
            "MANIFEST_FROZEN=PASS",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "MUTATION_READY=YES",
            "NEXT_STAGE=A10_MUTATION_PREFLIGHT_AND_EXECUTION_PLAN",
            "A9_RESULT=PASS",
            "=" * 120,
        ])

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report_sha = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A9 =====")
        print("A9_RESULT=PASS")
        print("TRACKED_WORKTREE_CLEAN=PASS")
        print("V2_26C_STASHED=YES")
        print(f"STASH_HASH={stash_hash}")
        print("MUTATION_READY=YES")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={report_sha}")
        return 0

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A9_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA9_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A9_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = sha256_file(REPORT)

        print("===== PRIMEYACC COMPANY SPLIT A9 =====", flush=True)
        print("A9_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_WRITES=0", flush=True)
        print("GIT_PUSH=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

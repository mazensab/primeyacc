#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()

ENGINE = ROOT / "v2_company_split_final_one_shot_v10.py"
REPORT = ROOT / "v2_company_split_remaining_only_rehearsal.txt"

EXPECTED_ENGINE_SHA256 = "5909D7ABA71079D2115233E76A9D589822C4375DD639584628B1486EB58A8D15"
EXPECTED_BASELINE_SHA256 = "9B47BF2F6CF89C8F1E6353E81BAEDB8109E3FE1527C96C22DBE06BF188E4B3E3"
EXPECTED_HEAD = "f6267f27e5313b0e01c317db8c1eaa13b8ac5d02"
EXPECTED_STASH = "d12fb09d7630750ce911c75875c956a4cdb724c3"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def git(*args: str) -> str:
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
            f"git {' '.join(args)} failed: {(cp.stderr or cp.stdout).strip()}"
        )
    return cp.stdout.strip()


def baseline_hash(data) -> str:
    return hashlib.sha256(
        json.dumps(data, sort_keys=True, default=str).encode()
    ).hexdigest().upper()


def load_engine():
    if not ENGINE.exists():
        raise RuntimeError(f"Missing engine: {ENGINE.name}")
    actual = sha(ENGINE)
    if actual != EXPECTED_ENGINE_SHA256:
        raise RuntimeError(
            f"Engine SHA mismatch expected={EXPECTED_ENGINE_SHA256} actual={actual}"
        )

    spec = importlib.util.spec_from_file_location(
        "primey_company_split_v10_engine",
        ENGINE,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not import V10 engine")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT REMAINING-ONLY REHEARSAL",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "SCOPE=FULL_EXCLUSION_PURGE_ONLY",
        "REUSES_PASSED_PHASES=YES",
        "DATABASE_PERMANENT_WRITES=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print("[REMAINING] 1/5 Validating frozen engine + exact baseline...", flush=True)

        if git("branch", "--show-current") != "main":
            raise RuntimeError("Expected git branch main")
        if git("rev-parse", "HEAD") != EXPECTED_HEAD:
            raise RuntimeError("HEAD drift")
        if git("rev-parse", "origin/main") != EXPECTED_HEAD:
            raise RuntimeError("origin/main drift")
        if git("status", "--short", "--untracked-files=no"):
            raise RuntimeError("Tracked worktree must be clean")
        if git("rev-parse", "stash@{0}") != EXPECTED_STASH:
            raise RuntimeError("Protected V2-26C stash drift")

        E = load_engine()

        print("[REMAINING] 2/5 Loading current baseline and exclusion scope...", flush=True)

        m2 = json.loads(E.M2.read_text(encoding="utf-8"))
        plan = json.loads(E.PLANF.read_text(encoding="utf-8"))
        M = E.load_models()
        C = E.context(M, m2, plan)
        before = E.baseline(M, C)
        before_hash = baseline_hash(before)

        print(f"[REMAINING] baseline={before_hash}", flush=True)

        if before_hash != EXPECTED_BASELINE_SHA256:
            raise RuntimeError(
                "Baseline drift after interrupted rehearsal "
                f"expected={EXPECTED_BASELINE_SHA256} actual={before_hash}"
            )

        full_company_ids = sorted(int(x) for x in C["fullc"])
        full_branch_ids = sorted(int(x) for x in C["fullb"])

        if len(full_company_ids) != 7:
            raise RuntimeError(
                f"Expected 7 full excluded companies, got {len(full_company_ids)}"
            )
        if len(full_branch_ids) != 33:
            raise RuntimeError(
                f"Expected 33 full excluded branches, got {len(full_branch_ids)}"
            )

        lines.extend([
            "===== INPUT GUARD =====",
            f"ENGINE={ENGINE.name}",
            f"ENGINE_SHA256={sha(ENGINE)}",
            f"BASELINE_SHA256={before_hash}",
            f"FULL_EXCLUDED_COMPANY_IDS={full_company_ids}",
            f"FULL_EXCLUDED_BRANCH_COUNT={len(full_branch_ids)}",
            "",
        ])

        print(
            "[REMAINING] 3/5 Running ONLY dependency-safe full-exclusion purge in rollback transaction...",
            flush=True,
        )

        with M["transaction"].atomic():
            conn = M["connection"]

            with conn.cursor() as cur:
                cur.execute("SET LOCAL statement_timeout = 0")
                cur.execute("SET LOCAL lock_timeout = '15s'")
                cur.execute(
                    "SELECT pg_advisory_xact_lock(%s)",
                    [E.LOCK],
                )

            list(
                M["Company"]
                .objects
                .select_for_update()
                .filter(id__in=full_company_ids)
                .values_list("id", flat=True)
            )

            result = E.purge_full(M, C)

            print("[REMAINING] purge engine returned; verifying excluded scope...", flush=True)

            if M["Company"].objects.filter(id__in=full_company_ids).exists():
                raise RuntimeError("Excluded Company rows remain after purge")

            if M["Branch"].objects.filter(id__in=full_branch_ids).exists():
                raise RuntimeError("Excluded Branch rows remain after purge")

            if M["LegacyObjectMap"].objects.filter(
                company_id__in=full_company_ids
            ).exists():
                raise RuntimeError(
                    "LegacyObjectMap rows remain for excluded Companies"
                )

            # No managed model may retain a direct Company FK to an excluded company.
            direct_company_fk_residuals = []
            for model in M["apps"].get_models():
                if (
                    not model._meta.managed
                    or model._meta.proxy
                    or model is M["Company"]
                ):
                    continue

                for field, target in E.fks(model):
                    if target is not M["Company"]:
                        continue

                    count = model._default_manager.filter(
                        **{f"{field.attname}__in": full_company_ids}
                    ).count()
                    if count:
                        direct_company_fk_residuals.append(
                            f"{E.mlabel(model)}.{field.name}={count}"
                        )

            if direct_company_fk_residuals:
                raise RuntimeError(
                    "Direct Company FK residuals after exclusion purge: "
                    + " | ".join(direct_company_fk_residuals)
                )

            print("[REMAINING] excluded-scope ownership verification PASS", flush=True)

            M["connection"].check_constraints()
            print("[REMAINING] database constraints PASS", flush=True)

            # This is a rehearsal only.
            M["transaction"].set_rollback(True)

        print("[REMAINING] 4/5 Verifying rollback restored exact baseline...", flush=True)

        after = E.baseline(M, C)
        after_hash = baseline_hash(after)

        if after != before or after_hash != EXPECTED_BASELINE_SHA256:
            raise RuntimeError(
                "Rollback baseline mismatch "
                f"before={before_hash} after={after_hash}"
            )

        print("[REMAINING] exact baseline restoration PASS", flush=True)

        lines.extend([
            "===== REMAINING-ONLY REHEARSAL =====",
            "FULL_EXCLUSION_PURGE=PASS",
            "EXCLUDED_COMPANIES_ABSENT_INSIDE_TX=PASS",
            "EXCLUDED_BRANCHES_ABSENT_INSIDE_TX=PASS",
            "LEGACY_MAP_EXCLUSION_CLEAN=PASS",
            "DIRECT_COMPANY_FK_RESIDUALS=0",
            "DATABASE_CONSTRAINTS_INSIDE_TX=PASS",
            "ROLLBACK=PASS",
            f"BASELINE_RESTORED_SHA256={after_hash}",
            f"PURGE_RESULT={json.dumps(result, ensure_ascii=False, sort_keys=True, default=str)}",
            "",
        ])

        print("[REMAINING] 5/5 Remaining-only gate complete.", flush=True)

        lines.extend([
            "REMAINING_ONLY_RESULT=PASS",
            "FULL_REHEARSAL_RERUN_REQUIRED=NO",
            "NEXT_STAGE=FINAL_APPLY_ONLY_WITH_IN_TRANSACTION_VERIFICATION",
            "DATABASE_PERMANENT_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")

        print("===== PRIMEYACC REMAINING-ONLY REHEARSAL =====")
        print("REMAINING_ONLY_RESULT=PASS")
        print("FULL_REHEARSAL_RERUN_REQUIRED=NO")
        print("NEXT_STAGE=FINAL_APPLY_ONLY_WITH_IN_TRANSACTION_VERIFICATION")
        print("DATABASE_PERMANENT_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"REPORT_SHA256={sha(REPORT)}")
        return 0

    except KeyboardInterrupt:
        lines.extend([
            "REMAINING_ONLY_RESULT=INTERRUPTED",
            "DATABASE_PERMANENT_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("REMAINING_ONLY_RESULT=INTERRUPTED", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "=" * 120,
            "REMAINING_ONLY_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={str(exc).replace(chr(10), ' ')}",
            "DATABASE_PERMANENT_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("===== PRIMEYACC REMAINING-ONLY REHEARSAL =====", flush=True)
        print("REMAINING_ONLY_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print("DATABASE_PERMANENT_WRITES=0", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"REPORT_SHA256={sha(REPORT)}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

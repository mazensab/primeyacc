#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()

ENGINE = ROOT / "v2_company_split_final_one_shot_v10.py"
REPORT = ROOT / "v2_company_split_remaining_only_rehearsal_v2.txt"

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


def purge_full_leaf_safe(E, M, C):
    from django.db.models.deletion import ProtectedError, RestrictedError

    ids = sorted(int(x) for x in C["fullc"])
    Company = M["Company"]
    LOM = M["LegacyObjectMap"]

    E.progress(
        f"[TX] full exclusions purge: LEAF_SAFE_DEPENDENCY_ENGINE start companies={len(ids)}"
    )

    # Fully excluded source maps must not survive the local purge.
    LOM.objects.filter(company_id__in=ids).delete()

    def company_fk_contracts(model):
        out = []
        for field, target in E.fks(model):
            if target is not Company:
                continue
            delete_fn = getattr(
                getattr(field, "remote_field", None),
                "on_delete",
                None,
            )
            delete_name = E.c(
                getattr(delete_fn, "__name__", str(delete_fn))
            )
            out.append((field, delete_name))
        return out

    def owned_company_ids(obj):
        owned = []
        reference_only = []
        for field, delete_name in company_fk_contracts(obj.__class__):
            value = getattr(obj, field.attname, None)
            if value is None:
                continue
            if delete_name in {"CASCADE", "PROTECT", "RESTRICT"}:
                owned.append(int(value))
            else:
                reference_only.append(
                    (field.name, delete_name, int(value))
                )
        return owned, reference_only

    def prove_same_company(obj, cid, seen=None, depth=0):
        if seen is None:
            seen = set()

        key = (obj.__class__, obj.pk)
        if key in seen or depth > 8:
            return False
        seen.add(key)

        owned, reference_only = owned_company_ids(obj)

        if owned:
            return all(x == cid for x in owned)

        # SET_NULL / SET_DEFAULT / DO_NOTHING Company reference does not
        # establish ownership of the object.
        if reference_only:
            return False

        # Detail models without company_id can prove ownership via a parent.
        for field, target in E.fks(obj.__class__):
            if target is Company:
                continue
            rel_id = getattr(obj, field.attname, None)
            if rel_id is None:
                continue
            try:
                parent = target._default_manager.filter(pk=rel_id).first()
            except Exception:
                parent = None
            if parent is None:
                continue
            if prove_same_company(parent, cid, seen, depth + 1):
                return True

        return False

    def flatten_restricted(value):
        if value is None:
            return []
        if isinstance(value, dict):
            rows = []
            for sub in value.values():
                rows.extend(flatten_restricted(sub))
            return rows
        if isinstance(value, (list, tuple, set, frozenset)):
            rows = []
            for sub in value:
                rows.extend(flatten_restricted(sub))
            return rows
        try:
            if not hasattr(value, "_meta"):
                return list(value)
        except Exception:
            pass
        return [value]

    # Unlike V10, the recursion identity includes the actual PK set.
    # Account -> Account with a smaller child PK set is therefore a normal
    # leaf-first descent, not a false cycle.
    active_signatures = []

    def safe_delete_queryset(model, qs, cid, reason):
        label = E.mlabel(model)

        while True:
            pks = list(
                qs.order_by("pk").values_list("pk", flat=True)[:2000]
            )
            if not pks:
                break

            normalized_pks = tuple(sorted(int(x) for x in pks))
            signature = (label, int(cid), normalized_pks)

            if signature in active_signatures:
                raise RuntimeError(
                    "TRUE_PROTECTED_DELETE_CYCLE "
                    f"company={cid} model={label} "
                    f"pk_count={len(normalized_pks)} "
                    f"pk_sample={list(normalized_pks[:20])}"
                )

            active_signatures.append(signature)
            try:
                batch_qs = model._default_manager.filter(pk__in=pks)

                try:
                    deleted_count, _detail = batch_qs.delete()
                    E.progress(
                        f"[TX] full exclusion company={cid} "
                        f"deleted {label} batch_objects={len(pks)} "
                        f"collector_deleted={deleted_count} reason={reason}"
                    )
                    continue

                except ProtectedError as exc:
                    protected = list(exc.protected_objects)
                    if not protected:
                        raise

                    grouped = defaultdict(list)
                    for obj in protected:
                        if not prove_same_company(obj, cid):
                            raise RuntimeError(
                                "CROSS_COMPANY_OR_UNPROVEN_PROTECTED_OBJECT "
                                f"company={cid} deleting={label} "
                                f"protected={E.mlabel(obj.__class__)}:{obj.pk}"
                            ) from exc
                        grouped[obj.__class__].append(int(obj.pk))

                    E.progress(
                        f"[TX] full exclusion company={cid} "
                        f"{label} blocked by PROTECT => "
                        f"{ {E.mlabel(k): len(v) for k, v in grouped.items()} }"
                    )

                    for child_model, child_pks in grouped.items():
                        unique_child_pks = sorted(set(child_pks))
                        child_label = E.mlabel(child_model)

                        # True self-cycle only when the exact same object set
                        # protects itself. A smaller same-model set is a normal
                        # hierarchy and must be deleted leaf-first.
                        if (
                            child_model is model
                            and tuple(unique_child_pks) == normalized_pks
                        ):
                            raise RuntimeError(
                                "TRUE_SELF_PROTECT_CYCLE "
                                f"company={cid} model={label} "
                                f"pk_count={len(unique_child_pks)} "
                                f"pk_sample={unique_child_pks[:20]}"
                            ) from exc

                        if child_model is model:
                            E.progress(
                                f"[TX] full exclusion company={cid} "
                                f"{label} self-PROTECT hierarchy: "
                                f"parent_set={len(normalized_pks)} "
                                f"child_set={len(unique_child_pks)} "
                                f"=> descending leaf-first"
                            )

                        safe_delete_queryset(
                            child_model,
                            child_model._default_manager.filter(
                                pk__in=unique_child_pks
                            ),
                            cid,
                            f"PROTECT_CHILD_OF:{label}",
                        )

                    # Retry the original parent batch after children are gone.
                    continue

                except RestrictedError as exc:
                    restricted = flatten_restricted(
                        getattr(exc, "restricted_objects", None)
                    )
                    if not restricted:
                        raise

                    grouped = defaultdict(list)
                    for obj in restricted:
                        if not hasattr(obj, "_meta"):
                            continue
                        if not prove_same_company(obj, cid):
                            raise RuntimeError(
                                "CROSS_COMPANY_OR_UNPROVEN_RESTRICTED_OBJECT "
                                f"company={cid} deleting={label} "
                                f"restricted={E.mlabel(obj.__class__)}:{obj.pk}"
                            ) from exc
                        grouped[obj.__class__].append(int(obj.pk))

                    if not grouped:
                        raise

                    E.progress(
                        f"[TX] full exclusion company={cid} "
                        f"{label} blocked by RESTRICT => "
                        f"{ {E.mlabel(k): len(v) for k, v in grouped.items()} }"
                    )

                    for child_model, child_pks in grouped.items():
                        unique_child_pks = sorted(set(child_pks))

                        if (
                            child_model is model
                            and tuple(unique_child_pks) == normalized_pks
                        ):
                            raise RuntimeError(
                                "TRUE_SELF_RESTRICT_CYCLE "
                                f"company={cid} model={label} "
                                f"pk_count={len(unique_child_pks)}"
                            ) from exc

                        safe_delete_queryset(
                            child_model,
                            child_model._default_manager.filter(
                                pk__in=unique_child_pks
                            ),
                            cid,
                            f"RESTRICT_CHILD_OF:{label}",
                        )

                    continue

            finally:
                active_signatures.pop()

    def owned_models_for_company(cid):
        rows = []
        do_nothing_blockers = []

        for model in M["apps"].get_models():
            if (
                not model._meta.managed
                or model._meta.proxy
                or model is Company
            ):
                continue

            for field, delete_name in company_fk_contracts(model):
                count = model._default_manager.filter(
                    **{field.attname: cid}
                ).count()

                if not count:
                    continue

                if delete_name in {"CASCADE", "PROTECT", "RESTRICT"}:
                    rows.append(
                        (model, field, delete_name, count)
                    )
                elif delete_name == "DO_NOTHING":
                    do_nothing_blockers.append(
                        f"{E.mlabel(model)}.{field.name}={count}"
                    )

        if do_nothing_blockers:
            raise RuntimeError(
                "FULL_EXCLUSION_DO_NOTHING_BLOCKERS "
                f"company={cid} blockers={do_nothing_blockers}"
            )

        rows.sort(
            key=lambda x: (
                0 if x[2] in {"PROTECT", "RESTRICT"} else 1,
                -x[3],
                E.mlabel(x[0]),
                x[1].name,
            )
        )
        return rows

    deleted_companies = 0
    per_company_summary = {}

    for index, cid in enumerate(ids, 1):
        E.progress(
            f"[TX] full exclusions purge: Company "
            f"{index}/{len(ids)} current_id={cid} dependency scan"
        )

        company = Company.objects.filter(pk=cid).first()
        if company is None:
            raise RuntimeError(
                f"Full excluded Company missing before purge current_id={cid}"
            )

        contracts = owned_models_for_company(cid)

        E.progress(
            f"[TX] full exclusion company={cid} "
            f"owned_company_contracts={len(contracts)}"
        )

        summary = defaultdict(int)

        for model, field, delete_name, _count in contracts:
            qs = model._default_manager.filter(
                **{field.attname: cid}
            )
            remaining = qs.count()

            if not remaining:
                continue

            E.progress(
                f"[TX] full exclusion company={cid} "
                f"purge {E.mlabel(model)}.{field.name} "
                f"on_delete={delete_name} rows={remaining}"
            )

            safe_delete_queryset(
                model,
                qs,
                cid,
                f"DIRECT_COMPANY_{delete_name}",
            )

            after = model._default_manager.filter(
                **{field.attname: cid}
            ).count()

            if after:
                raise RuntimeError(
                    "Full exclusion owned rows remain "
                    f"company={cid} model={E.mlabel(model)} "
                    f"field={field.name} rows={after}"
                )

            summary[
                f"{E.mlabel(model)}.{field.name}"
            ] += remaining

        E.progress(
            f"[TX] full exclusion company={cid} "
            "owned rows cleared; deleting Company row"
        )

        try:
            company.delete()
        except (ProtectedError, RestrictedError) as exc:
            if isinstance(exc, ProtectedError):
                objs = list(exc.protected_objects)
            else:
                objs = flatten_restricted(
                    getattr(exc, "restricted_objects", None)
                )

            sample = [
                f"{E.mlabel(o.__class__)}:{o.pk}"
                for o in objs[:30]
                if hasattr(o, "_meta")
            ]

            raise RuntimeError(
                "FULL_EXCLUSION_UNCOVERED_DEPENDENCY "
                f"company={cid} sample={sample}"
            ) from exc

        deleted_companies += 1
        per_company_summary[str(cid)] = dict(summary)

        E.progress(
            f"[TX] full exclusions purge: Company "
            f"{index}/{len(ids)} current_id={cid} PASS"
        )

    if deleted_companies != 7:
        raise RuntimeError(
            f"full company deletes {deleted_companies} != 7"
        )

    E.progress(
        f"[TX] full exclusions purge: done companies={deleted_companies}"
    )

    return {
        "deleted_company_count": deleted_companies,
        "per_company_owned_contracts": per_company_summary,
    }


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT REMAINING-ONLY REHEARSAL V2",
        "=" * 120,
        f"GENERATED_AT_UTC={datetime.now(timezone.utc).isoformat()}",
        f"ROOT={ROOT}",
        "SCOPE=FULL_EXCLUSION_PURGE_ONLY",
        "SELF_PROTECT_POLICY=LEAF_FIRST_BY_PK_SUBSET",
        "REUSES_PASSED_PHASES=YES",
        "DATABASE_PERMANENT_WRITES=0",
        "GIT_PUSH=0",
        "",
    ]

    try:
        print(
            "[REMAINING-V2] 1/5 Validating frozen engine + exact baseline...",
            flush=True,
        )

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

        print(
            "[REMAINING-V2] 2/5 Loading exclusion scope...",
            flush=True,
        )

        m2 = json.loads(E.M2.read_text(encoding="utf-8"))
        plan = json.loads(E.PLANF.read_text(encoding="utf-8"))
        M = E.load_models()
        C = E.context(M, m2, plan)

        before = E.baseline(M, C)
        before_hash = baseline_hash(before)

        print(
            f"[REMAINING-V2] baseline={before_hash}",
            flush=True,
        )

        if before_hash != EXPECTED_BASELINE_SHA256:
            raise RuntimeError(
                "Baseline drift "
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
            "[REMAINING-V2] 3/5 Running ONLY leaf-safe full-exclusion purge in rollback transaction...",
            flush=True,
        )

        with M["transaction"].atomic():
            with M["connection"].cursor() as cur:
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

            result = purge_full_leaf_safe(E, M, C)

            if M["Company"].objects.filter(
                id__in=full_company_ids
            ).exists():
                raise RuntimeError(
                    "Excluded Company rows remain after purge"
                )

            if M["Branch"].objects.filter(
                id__in=full_branch_ids
            ).exists():
                raise RuntimeError(
                    "Excluded Branch rows remain after purge"
                )

            if M["LegacyObjectMap"].objects.filter(
                company_id__in=full_company_ids
            ).exists():
                raise RuntimeError(
                    "LegacyObjectMap rows remain for excluded Companies"
                )

            residuals = []

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
                        **{
                            f"{field.attname}__in":
                            full_company_ids
                        }
                    ).count()

                    if count:
                        residuals.append(
                            f"{E.mlabel(model)}.{field.name}={count}"
                        )

            if residuals:
                raise RuntimeError(
                    "Direct Company FK residuals after purge: "
                    + " | ".join(residuals)
                )

            M["connection"].check_constraints()

            print(
                "[REMAINING-V2] exclusion + constraints verification PASS",
                flush=True,
            )

            M["transaction"].set_rollback(True)

        print(
            "[REMAINING-V2] 4/5 Verifying rollback restored exact baseline...",
            flush=True,
        )

        after = E.baseline(M, C)
        after_hash = baseline_hash(after)

        if after != before or after_hash != EXPECTED_BASELINE_SHA256:
            raise RuntimeError(
                "Rollback baseline mismatch "
                f"before={before_hash} after={after_hash}"
            )

        print(
            "[REMAINING-V2] exact baseline restoration PASS",
            flush=True,
        )

        lines.extend([
            "===== REMAINING-ONLY V2 =====",
            "SELF_REFERENTIAL_PROTECT=LEAF_FIRST_PASS",
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

        print(
            "[REMAINING-V2] 5/5 Remaining-only gate complete.",
            flush=True,
        )

        lines.extend([
            "REMAINING_ONLY_RESULT=PASS",
            "FULL_REHEARSAL_RERUN_REQUIRED=NO",
            "NEXT_STAGE=FINAL_APPLY_ONLY_WITH_IN_TRANSACTION_VERIFICATION",
            "DATABASE_PERMANENT_WRITES=0",
            "GIT_PUSH=0",
            "=" * 120,
        ])

        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        print(
            "===== PRIMEYACC REMAINING-ONLY REHEARSAL V2 ====="
        )
        print("REMAINING_ONLY_RESULT=PASS")
        print("FULL_REHEARSAL_RERUN_REQUIRED=NO")
        print(
            "NEXT_STAGE=FINAL_APPLY_ONLY_WITH_IN_TRANSACTION_VERIFICATION"
        )
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
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        print(
            "REMAINING_ONLY_RESULT=INTERRUPTED",
            flush=True,
        )
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
        REPORT.write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )

        print(
            "===== PRIMEYACC REMAINING-ONLY REHEARSAL V2 =====",
            flush=True,
        )
        print(
            "REMAINING_ONLY_RESULT=FAIL",
            flush=True,
        )
        print(
            f"ERROR={type(exc).__name__}: {exc}",
            flush=True,
        )
        print(
            "DATABASE_PERMANENT_WRITES=0",
            flush=True,
        )
        print(
            f"REPORT={REPORT.name}",
            flush=True,
        )
        print(
            f"REPORT_SHA256={sha(REPORT)}",
            flush=True,
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

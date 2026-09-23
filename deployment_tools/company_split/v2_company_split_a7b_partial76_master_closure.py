#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
DECISION_MAP = ROOT / "v2_company_split_decision_map.json"
A7_REPORT = ROOT / "v2_company_split_a7_master_clone_remap_audit.txt"
REPORT = ROOT / "v2_company_split_a7b_partial76_master_closure.txt"

SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
EXPECTED_A7_SHA256 = "CED410C22A5F128B4A039832F9D5839AD2ACAF3A203D7FB0C3D1F325BFBB99BB"
QUERY_TIMEOUT_MS = 60000

LEGACY_COMPANY_ID = "76"
EXPECTED_CURRENT_COMPANY_ID = 34
LEGACY_EXCLUDED_BRANCHES = {"90", "91"}
LEGACY_SURVIVING_BRANCHES = {"92"}
EXPECTED_CONFLICT_PARTY_ID = 778395


def clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).replace("\r", " ").replace("\n", " ").strip()


def yesno(v: Any) -> str:
    return "YES" if bool(v) else "NO"


def nkey(v: Any):
    s = clean(v)
    return (0, int(s)) if s.isdigit() else (1, s.casefold())


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


def model_label(model) -> str:
    return f"{model._meta.app_label}.{model.__name__}"


def direct_fk_fields(model):
    out = []
    for field in model._meta.get_fields():
        if not getattr(field, "concrete", False):
            continue
        if not (
            getattr(field, "many_to_one", False)
            or getattr(field, "one_to_one", False)
        ):
            continue
        remote = getattr(field, "remote_field", None)
        target = getattr(remote, "model", None) if remote else None
        if target is not None:
            out.append((field, target))
    return out


def relation_fields_to(model, target_model):
    return [
        field for field, target in direct_fk_fields(model)
        if target is target_model
    ]


def find_branch_paths(start_model, Branch, Company, max_depth=4):
    results = []
    seen = set()

    def walk(model, parts, depth, visited):
        if depth > max_depth:
            return

        state = (model, tuple(parts))
        if state in seen:
            return
        seen.add(state)

        for field, target in direct_fk_fields(model):
            if target in visited:
                continue

            if target is Branch:
                results.append(
                    ("__".join(parts + [f"{field.name}_id"]), depth)
                )
                continue

            if target is Company:
                continue

            label = model_label(target)
            if label.startswith("auth.") or label.startswith("contenttypes."):
                continue
            if label in {"accounts.CompanyMembership", "companies.Company"}:
                continue

            walk(
                target,
                parts + [field.name],
                depth + 1,
                visited | {target},
            )

    walk(start_model, [], 1, {start_model})
    best = {}
    for lookup, depth in results:
        if lookup not in best or depth < best[lookup]:
            best[lookup] = depth
    return sorted(best.items(), key=lambda x: (x[1], x[0]))


def set_readonly(connection):
    with connection.cursor() as cursor:
        cursor.execute("SET default_transaction_read_only = on")
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")


def reconnect_readonly(connection):
    connection.close()
    connection.connect()
    set_readonly(connection)


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A7B PARTIAL COMPANY 76 MASTER CLOSURE",
        "=" * 120,
        f"ROOT={ROOT}",
        "MODE=READ_ONLY",
        "DATABASE_WRITES=0",
        "SOURCE_NETWORK_CALLS=0",
        f"QUERY_TIMEOUT_MS={QUERY_TIMEOUT_MS}",
        "",
        "===== GIT / ENVIRONMENT =====",
        f"BRANCH={git('branch','--show-current')}",
        f"HEAD={git('rev-parse','HEAD')}",
        f"ORIGIN_MAIN={git('rev-parse','origin/main')}",
    ]

    tracked = git("status", "--short", "--untracked-files=no")
    lines.append(f"TRACKED_WORKTREE_CLEAN={'YES' if not tracked else 'NO'}")
    if tracked:
        lines.append("TRACKED_STATUS_BEGIN")
        lines.extend(tracked.splitlines())
        lines.append("TRACKED_STATUS_END")

    try:
        print("[A7B] 1/6 Validating frozen artifacts...", flush=True)

        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")
        decision_sha = hashlib.sha256(DECISION_MAP.read_bytes()).hexdigest().upper()
        if decision_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                f"Decision map SHA mismatch expected={EXPECTED_DECISION_SHA256} actual={decision_sha}"
            )

        if not A7_REPORT.exists():
            raise RuntimeError(f"Missing {A7_REPORT.name}")
        a7_sha = hashlib.sha256(A7_REPORT.read_bytes()).hexdigest().upper()
        if a7_sha != EXPECTED_A7_SHA256:
            raise RuntimeError(
                f"A7 SHA mismatch expected={EXPECTED_A7_SHA256} actual={a7_sha}"
            )

        decision = json.loads(DECISION_MAP.read_text(encoding="utf-8"))
        cfg = next(
            (
                row for row in decision.get("companies", [])
                if clean(row.get("legacy_company_id")) == LEGACY_COMPANY_ID
            ),
            None,
        )
        if not cfg or clean(cfg.get("mode")) != "PARTIAL_INCLUDE":
            raise RuntimeError("Legacy Company 76 PARTIAL_INCLUDE decision missing")

        include = {
            clean(row.get("legacy_branch_id"))
            for row in cfg.get("kept_branches", []) or []
        }
        exclude = {
            clean(row.get("legacy_branch_id"))
            for row in cfg.get("excluded_branches", []) or []
        }

        if include != LEGACY_SURVIVING_BRANCHES or exclude != LEGACY_EXCLUDED_BRANCHES:
            raise RuntimeError(
                f"Company 76 branch decision mismatch include={include} exclude={exclude}"
            )

        lines.extend([
            "",
            "===== FROZEN INPUTS =====",
            f"DECISION_MAP_SHA256={decision_sha}",
            f"A7_REPORT_SHA256={a7_sha}",
            f"LEGACY_COMPANY_ID={LEGACY_COMPANY_ID}",
            f"INCLUDE_BRANCHES={sorted(include, key=nkey)}",
            f"EXCLUDE_BRANCHES={sorted(exclude, key=nkey)}",
            f"EXPECTED_CONFLICT_PARTY_ID={EXPECTED_CONFLICT_PARTY_ID}",
        ])

        print("[A7B] 2/6 Loading Django/maps...", flush=True)

        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()

        import django
        django.setup()

        from django.apps import apps
        from django.contrib.contenttypes.models import ContentType
        from django.db import connection
        from django.db.models import Count, Q

        from business_controls.models import LegacyObjectMap
        from catalog.models import CatalogItem
        from companies.models import Branch, Company
        from parties.models import BusinessParty
        from treasury.models import CustomerPayment

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")
        set_readonly(connection)

        company_map = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table="business",
            legacy_id=LEGACY_COMPANY_ID,
        ).first()
        if company_map is None:
            raise RuntimeError("Company 76 LegacyObjectMap missing")

        raw_company_id = clean(company_map.target_object_id) or clean(company_map.company_id)
        if not raw_company_id.isdigit():
            raise RuntimeError("Company 76 current id missing")

        company_id = int(raw_company_id)
        if company_id != EXPECTED_CURRENT_COMPANY_ID:
            raise RuntimeError(
                f"Company 76 current id changed expected={EXPECTED_CURRENT_COMPANY_ID} actual={company_id}"
            )

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id=LEGACY_COMPANY_ID,
                legacy_id__in=include | exclude,
            )
        )

        branch_id_by_legacy = {}
        for row in branch_maps:
            raw = clean(row.target_object_id)
            if raw.isdigit():
                branch_id_by_legacy[clean(row.legacy_id)] = int(raw)

        if set(branch_id_by_legacy) != include | exclude:
            raise RuntimeError(
                f"Company 76 branch map mismatch {branch_id_by_legacy}"
            )

        surviving_branch_ids = {
            branch_id_by_legacy[x] for x in include
        }
        excluded_branch_ids = {
            branch_id_by_legacy[x] for x in exclude
        }
        all_branch_ids = surviving_branch_ids | excluded_branch_ids
        branches = Branch.objects.in_bulk(all_branch_ids)

        lines.extend([
            f"CURRENT_COMPANY_ID={company_id}",
            f"SURVIVING_CURRENT_BRANCH_IDS={sorted(surviving_branch_ids)}",
            f"EXCLUDED_CURRENT_BRANCH_IDS={sorted(excluded_branch_ids)}",
        ])

        print("[A7B] 3/6 Closing BusinessParty 778395...", flush=True)

        party = BusinessParty.objects.filter(
            pk=EXPECTED_CONFLICT_PARTY_ID,
            company_id=company_id,
        ).first()

        if party is None:
            raise RuntimeError(
                f"BusinessParty {EXPECTED_CONFLICT_PARTY_ID} missing from Company 76"
            )

        lines.extend([
            "",
            "=" * 120,
            "BUSINESS PARTY 778395 EXACT CLOSURE",
            "=" * 120,
            f"PARTY_ID={party.id}",
            f"PARTY_DISPLAY_NAME={clean(party.display_name)}",
            f"PARTY_CODE={clean(party.code)}",
            f"PARTY_TYPE={clean(party.party_type)}",
            f"PARTY_BRANCH_ID={party.branch_id}",
            f"PARTY_BRANCH_IS_NULL={yesno(party.branch_id is None)}",
        ])

        party_unknown_refs = []
        party_surviving_ref_rows = 0
        party_excluded_ref_rows = 0
        party_company_level_ref_rows = 0

        for model in sorted(apps.get_models(), key=model_label):
            if model._meta.proxy or not model._meta.managed:
                continue

            party_fields = relation_fields_to(model, BusinessParty)
            if not party_fields:
                continue

            company_fields = relation_fields_to(model, Company)
            if len(company_fields) != 1:
                continue

            company_field = company_fields[0]
            branch_paths = find_branch_paths(model, Branch, Company, 4)
            best_path = branch_paths[0][0] if branch_paths else None

            for party_field in party_fields:
                contract = f"{model_label(model)}.{party_field.name}"
                try:
                    base = model._default_manager.filter(
                        **{
                            f"{company_field.name}_id": company_id,
                            f"{party_field.name}_id": party.id,
                        }
                    )
                    total = base.count()
                    if total == 0:
                        continue

                    if best_path is None:
                        party_company_level_ref_rows += total
                        lines.append(
                            f"PARTY_REF {contract}"
                            f" | total={total}"
                            f" | classification=COMPANY_LEVEL_NO_BRANCH_PATH"
                        )
                        continue

                    surviving_count = base.filter(
                        **{f"{best_path}__in": surviving_branch_ids}
                    ).count()
                    excluded_count = base.filter(
                        **{f"{best_path}__in": excluded_branch_ids}
                    ).count()
                    null_count = base.filter(
                        **{f"{best_path}__isnull": True}
                    ).count()
                    other_count = total - surviving_count - excluded_count - null_count

                    party_surviving_ref_rows += surviving_count
                    party_excluded_ref_rows += excluded_count

                    lines.append(
                        f"PARTY_REF {contract}"
                        f" | total={total}"
                        f" | branch_path={best_path}"
                        f" | surviving={surviving_count}"
                        f" | excluded={excluded_count}"
                        f" | null_branch={null_count}"
                        f" | other={other_count}"
                    )

                    if other_count:
                        party_unknown_refs.append(
                            (contract, other_count)
                        )

                except Exception as exc:
                    party_unknown_refs.append(
                        (contract, f"QUERY_ERROR:{type(exc).__name__}:{clean(exc)}")
                    )
                    reconnect_readonly(connection)

        # CustomerPayment stores party ids as numeric fields, not FK.
        try:
            cp = CustomerPayment.objects.filter(company_id=company_id).filter(
                Q(customer_id=party.id) | Q(counterparty_id=party.id)
            )
            cp_total = cp.count()
            cp_surviving = cp.filter(
                sales_invoice__branch_id__in=surviving_branch_ids
            ).count()
            cp_excluded = cp.filter(
                sales_invoice__branch_id__in=excluded_branch_ids
            ).count()
            cp_null_invoice = cp.filter(sales_invoice_id__isnull=True).count()
            cp_other = cp_total - cp_surviving - cp_excluded - cp_null_invoice

            party_surviving_ref_rows += cp_surviving
            party_excluded_ref_rows += cp_excluded
            party_company_level_ref_rows += cp_null_invoice

            lines.append(
                "PARTY_REF treasury.CustomerPayment.customer_id/counterparty_id"
                f" | total={cp_total}"
                f" | surviving={cp_surviving}"
                f" | excluded={cp_excluded}"
                f" | no_sales_invoice={cp_null_invoice}"
                f" | other={cp_other}"
            )
            if cp_other:
                party_unknown_refs.append(
                    ("treasury.CustomerPayment.raw_party_id", cp_other)
                )
        except Exception as exc:
            party_unknown_refs.append(
                (
                    "treasury.CustomerPayment.raw_party_id",
                    f"QUERY_ERROR:{type(exc).__name__}:{clean(exc)}",
                )
            )
            reconnect_readonly(connection)

        party_ct = ContentType.objects.get_for_model(BusinessParty)
        party_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=LEGACY_COMPANY_ID,
                target_content_type=party_ct,
                target_object_id=str(party.id),
            ).order_by("source_table", "legacy_id")
        )

        lines.append(
            "PARTY_LEGACY_MAPS="
            + json.dumps(
                [
                    {
                        "source_table": clean(m.source_table),
                        "legacy_id": clean(m.legacy_id),
                        "source_reference": clean(m.source_reference),
                    }
                    for m in party_maps
                ],
                ensure_ascii=False,
                sort_keys=True,
            )
        )

        party_policy_pass = (
            party.branch_id is None
            and party_surviving_ref_rows > 0
            and party_excluded_ref_rows > 0
            and not party_unknown_refs
        )

        lines.extend([
            f"PARTY_SURVIVING_REF_ROW_TOTAL={party_surviving_ref_rows}",
            f"PARTY_EXCLUDED_REF_ROW_TOTAL={party_excluded_ref_rows}",
            f"PARTY_COMPANY_LEVEL_REF_ROW_TOTAL={party_company_level_ref_rows}",
            f"PARTY_UNKNOWN_REF_COUNT={len(party_unknown_refs)}",
            f"PARTY_CLOSURE_POLICY_PASS={yesno(party_policy_pass)}",
            "PARTY_FINAL_POLICY=KEEP canonical BusinessParty on surviving Company 76; delete only excluded-branch operational rows that reference it. Do not delete or clone the party, and do not invent a branch_id because the master itself is company-level (branch=NULL).",
        ])

        if party_unknown_refs:
            lines.append("PARTY_UNKNOWN_REFS_BEGIN")
            for row in party_unknown_refs:
                lines.append(clean(row))
            lines.append("PARTY_UNKNOWN_REFS_END")

        print("[A7B] 4/6 Classifying all 57 CatalogItems in Company 76...", flush=True)

        item_ct = ContentType.objects.get_for_model(CatalogItem)
        items = list(
            CatalogItem.objects.filter(company_id=company_id).order_by("id")
        )
        if len(items) != 57:
            raise RuntimeError(
                f"Expected 57 CatalogItems for Company 76 from A7, got {len(items)}"
            )

        item_usage = {
            int(item.id): {
                "surviving": 0,
                "excluded": 0,
                "company_level": 0,
                "unknown": 0,
                "contracts": [],
            }
            for item in items
        }

        for model in sorted(apps.get_models(), key=model_label):
            if model._meta.proxy or not model._meta.managed:
                continue

            item_fields = relation_fields_to(model, CatalogItem)
            if not item_fields:
                continue

            company_fields = relation_fields_to(model, Company)
            if len(company_fields) != 1:
                continue

            company_field = company_fields[0]
            branch_paths = find_branch_paths(model, Branch, Company, 4)
            best_path = branch_paths[0][0] if branch_paths else None

            for item_field in item_fields:
                contract = f"{model_label(model)}.{item_field.name}"

                try:
                    base = model._default_manager.filter(
                        **{
                            f"{company_field.name}_id": company_id,
                            f"{item_field.name}_id__in": list(item_usage),
                        }
                    )

                    if best_path is None:
                        rows = list(
                            base.values(f"{item_field.name}_id")
                            .annotate(n=Count("pk"))
                            .order_by()
                        )
                        for row in rows:
                            iid = int(row[f"{item_field.name}_id"])
                            n = int(row["n"])
                            item_usage[iid]["company_level"] += n
                            item_usage[iid]["contracts"].append(
                                f"{contract}:company_level:{n}"
                            )
                        continue

                    rows = list(
                        base.values(
                            f"{item_field.name}_id",
                            best_path,
                        )
                        .annotate(n=Count("pk"))
                        .order_by()
                    )

                    for row in rows:
                        iid = int(row[f"{item_field.name}_id"])
                        branch_id = row[best_path]
                        n = int(row["n"])

                        if branch_id is None:
                            item_usage[iid]["company_level"] += n
                            bucket = "company_level"
                        elif int(branch_id) in surviving_branch_ids:
                            item_usage[iid]["surviving"] += n
                            bucket = "surviving"
                        elif int(branch_id) in excluded_branch_ids:
                            item_usage[iid]["excluded"] += n
                            bucket = "excluded"
                        else:
                            item_usage[iid]["unknown"] += n
                            bucket = f"unknown_branch_{branch_id}"

                        item_usage[iid]["contracts"].append(
                            f"{contract}:{bucket}:{n}"
                        )

                except Exception as exc:
                    reconnect_readonly(connection)
                    raise RuntimeError(
                        f"CatalogItem contract failed {contract}: {type(exc).__name__}: {exc}"
                    )

        classes = defaultdict(list)

        for item in items:
            usage = item_usage[int(item.id)]
            surviving = usage["surviving"] > 0
            excluded = usage["excluded"] > 0
            company_level = usage["company_level"] > 0
            unknown = usage["unknown"] > 0

            if unknown:
                classification = "UNKNOWN_BRANCH_REFERENCE"
            elif surviving and excluded:
                classification = "SHARED_SURVIVING_AND_EXCLUDED_KEEP"
            elif surviving:
                classification = "SURVIVING_ONLY_KEEP"
            elif excluded and company_level:
                classification = "EXCLUDED_PLUS_COMPANY_LEVEL_KEEP_REVIEW"
            elif excluded:
                classification = "EXCLUDED_ONLY_PURGE_CANDIDATE"
            elif company_level:
                classification = "COMPANY_LEVEL_ONLY_KEEP"
            else:
                classification = "UNREFERENCED_KEEP_CONSERVATIVE"

            classes[classification].append(int(item.id))

        lines.extend([
            "",
            "=" * 120,
            "COMPANY 76 CATALOG ITEM CLASSIFICATION",
            "=" * 120,
        ])

        item_map_rows = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=LEGACY_COMPANY_ID,
                target_content_type=item_ct,
                target_object_id__in=[str(item.id) for item in items],
            ).order_by("target_object_id", "source_table", "legacy_id")
        )
        maps_by_item = defaultdict(list)
        for m in item_map_rows:
            if clean(m.target_object_id).isdigit():
                maps_by_item[int(m.target_object_id)].append(
                    {
                        "source_table": clean(m.source_table),
                        "legacy_id": clean(m.legacy_id),
                        "source_reference": clean(m.source_reference),
                    }
                )

        for classification in sorted(classes):
            ids = sorted(classes[classification])
            lines.append(
                f"{classification}_COUNT={len(ids)}"
            )
            lines.append(
                f"{classification}_IDS={ids}"
            )

            if classification in {
                "EXCLUDED_ONLY_PURGE_CANDIDATE",
                "EXCLUDED_PLUS_COMPANY_LEVEL_KEEP_REVIEW",
                "UNKNOWN_BRANCH_REFERENCE",
            }:
                for iid in ids:
                    item = next(x for x in items if int(x.id) == iid)
                    usage = item_usage[iid]
                    lines.append(
                        f"  ITEM id={iid}"
                        f" | name={clean(item.name)}"
                        f" | code={clean(item.code)}"
                        f" | sku={clean(item.sku)}"
                        f" | usage={usage}"
                        f" | legacy_maps={maps_by_item.get(iid, [])}"
                    )

        expected_shared = 44
        expected_excluded_only = 5

        shared_count = len(
            classes["SHARED_SURVIVING_AND_EXCLUDED_KEEP"]
        )
        surviving_only_count = len(
            classes["SURVIVING_ONLY_KEEP"]
        )
        excluded_only_count = len(
            classes["EXCLUDED_ONLY_PURGE_CANDIDATE"]
        )
        company_level_only_count = len(
            classes["COMPANY_LEVEL_ONLY_KEEP"]
        )
        unreferenced_count = len(
            classes["UNREFERENCED_KEEP_CONSERVATIVE"]
        )
        unknown_count = len(
            classes["UNKNOWN_BRANCH_REFERENCE"]
        )
        excluded_plus_company_level_count = len(
            classes["EXCLUDED_PLUS_COMPANY_LEVEL_KEEP_REVIEW"]
        )

        item_policy_pass = (
            shared_count == expected_shared
            and excluded_only_count == expected_excluded_only
            and unknown_count == 0
            and excluded_plus_company_level_count == 0
        )

        lines.extend([
            f"SHARED_EXPECTED={expected_shared}",
            f"EXCLUDED_ONLY_EXPECTED={expected_excluded_only}",
            f"ITEM_POLICY_PASS={yesno(item_policy_pass)}",
            "CATALOG_FINAL_POLICY=Keep shared/surviving/company-level/unreferenced CatalogItems on surviving Company 76. The five CatalogItems referenced only by excluded Branches 90/91 are purge candidates after excluded operational rows are deleted and FK safety is rechecked. Remove their canonical LegacyObjectMaps only as part of the same purge/exclusion manifest so production sync cannot recreate them blindly.",
        ])

        print("[A7B] 5/6 Freezing partial-company policy...", flush=True)

        result = (
            "PASS"
            if party_policy_pass and item_policy_pass
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "",
            "=" * 120,
            "A7B FINAL PARTIAL COMPANY 76 SUMMARY",
            "=" * 120,
            f"PARTY_ID={party.id}",
            f"PARTY_BRANCH_IS_NULL={yesno(party.branch_id is None)}",
            f"PARTY_SURVIVING_REF_ROW_TOTAL={party_surviving_ref_rows}",
            f"PARTY_EXCLUDED_REF_ROW_TOTAL={party_excluded_ref_rows}",
            f"PARTY_POLICY_PASS={yesno(party_policy_pass)}",
            f"CATALOG_TOTAL={len(items)}",
            f"CATALOG_SHARED_KEEP={shared_count}",
            f"CATALOG_SURVIVING_ONLY_KEEP={surviving_only_count}",
            f"CATALOG_EXCLUDED_ONLY_PURGE_CANDIDATE={excluded_only_count}",
            f"CATALOG_COMPANY_LEVEL_ONLY_KEEP={company_level_only_count}",
            f"CATALOG_UNREFERENCED_KEEP_CONSERVATIVE={unreferenced_count}",
            f"CATALOG_UNKNOWN_BRANCH_REFERENCE={unknown_count}",
            f"CATALOG_EXCLUDED_PLUS_COMPANY_LEVEL_REVIEW={excluded_plus_company_level_count}",
            f"CATALOG_POLICY_PASS={yesno(item_policy_pass)}",
            "",
            "FINAL_PARTIAL_76_POLICY:",
            "1) Company 76 survives as the same Company row with only Legacy Branch 92 / Current Branch 1928.",
            "2) Operational rows routed to Legacy Branches 90 and 91 are deleted; Branch rows 90/91 are deleted only after dependent rows are cleared.",
            "3) BusinessParty 778395 is shared historical master data needed by surviving Branch 92 and excluded history. Keep it on Company 76 with branch=NULL; deleting excluded operational rows removes only those references.",
            "4) Shared CatalogItems stay. Excluded-only CatalogItems may be purged only after all excluded operational references are removed and a final FK check returns zero.",
            "5) Company-level or unreferenced masters without branch provenance are retained conservatively; no ownership is invented.",
            "6) Future production migration must apply the same branch exclusion and explicit excluded-only CatalogItem legacy IDs from the frozen execution manifest, rather than re-importing them.",
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A7B_RESULT={result}",
            "=" * 120,
        ])

        print("[A7B] 6/6 Writing report...", flush=True)

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        print("===== PRIMEYACC COMPANY SPLIT A7B =====")
        print(f"A7B_RESULT={result}")
        print(f"PARTY_POLICY_PASS={yesno(party_policy_pass)}")
        print(f"CATALOG_SHARED_KEEP={shared_count}")
        print(f"CATALOG_EXCLUDED_ONLY_PURGE_CANDIDATE={excluded_only_count}")
        print(f"CATALOG_POLICY_PASS={yesno(item_policy_pass)}")
        print("DATABASE_WRITES=0")
        print(f"REPORT={REPORT.name}")
        print(f"SIZE={REPORT.stat().st_size}")
        print(f"SHA256={digest}")

        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A7B_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA7B_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A7B_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A7B =====", flush=True)
        print("A7B_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
DECISION_MAP = ROOT / "v2_company_split_decision_map.json"
REPORT = ROOT / "v2_company_split_a5b_targeted_closure_audit.txt"
CACHE_DIR = ROOT / "_audit" / "phase49j_general_apply" / "source_cache"
SOURCE_SYSTEM = "mhamcloud_v1"
EXPECTED_DECISION_SHA256 = "1A1240818B1CD2C24FFC2CB7A8BCB1C50DE2012F06E4EFA8F738492A5E3B39A7"
QUERY_TIMEOUT_MS = 60000


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
        raise RuntimeError("manage.py not found; run from project root")
    raw = manage.read_text(encoding="utf-8", errors="replace")
    m = re.search(
        r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]",
        raw,
    )
    if not m:
        raise RuntimeError("Cannot detect DJANGO_SETTINGS_MODULE")
    return m.group(1)


def progress(msg: str):
    print(msg, flush=True)


def role_name_map(payload: dict[str, Any]) -> dict[str, str]:
    out = {}
    for row in payload.get("roles", []) or []:
        if not isinstance(row, dict):
            continue
        rid = clean(row.get("id"))
        if not rid:
            continue
        out[rid] = clean(
            row.get("name")
            or row.get("display_name")
            or row.get("role")
            or row.get("guard_name")
        )
    return out


def permission_context(payload: dict[str, Any]):
    pdata = (payload.get("permissions") or {}).get("data") or {}
    permissions = {
        clean(row.get("id")): clean(row.get("name"))
        for row in pdata.get("permissions", [])
        if isinstance(row, dict) and row.get("id") is not None
    }
    role_permissions: dict[str, set[str]] = defaultdict(set)
    for row in pdata.get("role_permissions", []) or []:
        if isinstance(row, dict):
            role_permissions[clean(row.get("role_id"))].add(
                clean(row.get("permission_id"))
            )
    user_roles: dict[str, set[str]] = defaultdict(set)
    for row in pdata.get("user_roles", []) or []:
        if (
            isinstance(row, dict)
            and clean(row.get("model_type")) == r"App\User"
        ):
            user_roles[clean(row.get("model_id"))].add(clean(row.get("role_id")))
    direct_permissions: dict[str, set[str]] = defaultdict(set)
    for row in pdata.get("direct_permissions", []) or []:
        if (
            isinstance(row, dict)
            and clean(row.get("model_type")) == r"App\User"
        ):
            direct_permissions[clean(row.get("model_id"))].add(
                clean(row.get("permission_id"))
            )
    return permissions, role_permissions, user_roles, direct_permissions


def main() -> int:
    lines = [
        "=" * 120,
        "PRIMEYACC — COMPANY SPLIT A5B TARGETED CLOSURE AUDIT",
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
        progress("[A5B] 1/7 Validating frozen decision map...")
        if not DECISION_MAP.exists():
            raise RuntimeError(f"Missing {DECISION_MAP.name}")
        actual_sha = hashlib.sha256(DECISION_MAP.read_bytes()).hexdigest().upper()
        if actual_sha != EXPECTED_DECISION_SHA256:
            raise RuntimeError(
                f"Decision map SHA mismatch expected={EXPECTED_DECISION_SHA256} actual={actual_sha}"
            )
        decision = json.loads(DECISION_MAP.read_text(encoding="utf-8"))
        companies_cfg = decision.get("companies") or []
        cfg_by_legacy = {clean(x["legacy_company_id"]): x for x in companies_cfg}

        lines.extend([
            "",
            "===== FROZEN DECISION MAP =====",
            f"DECISION_MAP={DECISION_MAP.name}",
            f"DECISION_MAP_SHA256={actual_sha}",
            f"SCOPED_COMPANIES={len(companies_cfg)}",
        ])

        progress("[A5B] 2/7 Loading Django/maps...")
        os.environ["DJANGO_SETTINGS_MODULE"] = detect_settings()
        import django
        django.setup()

        from django.apps import apps
        from django.contrib.auth import get_user_model
        from django.db import connection
        from django.db.models import Count

        from accounts.models import (
            BranchAccessMode,
            CompanyMembership,
            CompanyMembershipBranchGrant,
            CompanyMembershipBranchPolicy,
        )
        from business_controls.models import LegacyObjectMap
        from companies.models import Branch, Company

        User = get_user_model()
        CustomerPayment = apps.get_model("treasury", "CustomerPayment")
        SupplierPayment = apps.get_model("treasury", "SupplierPayment")
        TreasuryAccount = apps.get_model("treasury", "TreasuryAccount")
        SalesInvoiceItem = apps.get_model("sales", "SalesInvoiceItem")

        if connection.vendor != "postgresql":
            raise RuntimeError(f"Expected PostgreSQL, got {connection.vendor}")

        with connection.cursor() as cursor:
            cursor.execute("SET default_transaction_read_only = on")
            cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")

        legacy_company_ids = set(cfg_by_legacy)

        company_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business",
                legacy_id__in=legacy_company_ids,
            )
        )
        company_id_by_legacy = {}
        for m in company_maps:
            raw = clean(m.target_object_id) or clean(m.company_id)
            if raw.isdigit():
                company_id_by_legacy[clean(m.legacy_id)] = int(raw)

        if set(company_id_by_legacy) != legacy_company_ids:
            raise RuntimeError("Company map scope mismatch")

        target_company_ids = sorted(company_id_by_legacy.values())
        companies = Company.objects.in_bulk(target_company_ids)

        branch_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="business_locations",
                legacy_company_id__in=legacy_company_ids,
            )
        )
        branch_id_by_pair = {}
        legacy_pair_by_branch = {}
        for m in branch_maps:
            raw = clean(m.target_object_id)
            if raw.isdigit():
                pair = (clean(m.legacy_company_id), clean(m.legacy_id))
                bid = int(raw)
                branch_id_by_pair[pair] = bid
                legacy_pair_by_branch[bid] = pair

        target_branch_ids = sorted(branch_id_by_pair.values())
        branches = Branch.objects.in_bulk(target_branch_ids)

        user_maps = list(
            LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table="users",
                legacy_company_id__in=legacy_company_ids,
            )
        )
        legacy_user_by_current_company = {}
        for m in user_maps:
            raw = clean(m.target_object_id)
            lcid = clean(m.legacy_company_id)
            if raw.isdigit() and lcid in company_id_by_legacy:
                legacy_user_by_current_company[
                    (int(raw), company_id_by_legacy[lcid])
                ] = clean(m.legacy_id)

        memberships = list(
            CompanyMembership.objects.filter(company_id__in=target_company_ids)
            .select_related("user", "company")
            .order_by("company_id", "id")
        )
        policies = {
            int(p.membership_id): p
            for p in CompanyMembershipBranchPolicy.objects.filter(
                membership_id__in=[m.id for m in memberships]
            ).select_related("default_branch", "last_active_branch")
        }
        grants_by_policy = defaultdict(list)
        for g in (
            CompanyMembershipBranchGrant.objects.filter(
                policy_id__in=[p.id for p in policies.values()]
            )
            .select_related("branch")
            .order_by("policy_id", "branch_id")
        ):
            grants_by_policy[int(g.policy_id)].append(g)

        memberships_by_company = defaultdict(list)
        for m in memberships:
            memberships_by_company[int(m.company_id)].append(m)

        progress("[A5B] 3/7 Closing the four A5 timeout queries...")
        timeout_errors = []

        lines.extend([
            "",
            "=" * 120,
            "TARGETED TIMEOUT CLOSURE",
            "=" * 120,
        ])

        customer_payment_company_total = 0
        customer_payment_branch_total = 0
        invoice_item_total = 0
        legacy_map_total = 0

        for lcid in sorted(legacy_company_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            company = companies.get(cid)
            name = clean(company.name if company else "")
            lines.append(
                f"COMPANY legacy_id={lcid} | current_id={cid} | name={name}"
            )

            try:
                cp_total = CustomerPayment.objects.filter(company_id=cid).count()
                customer_payment_company_total += cp_total
                rows = list(
                    CustomerPayment.objects.filter(company_id=cid)
                    .values("branch_id")
                    .annotate(n=Count("pk"))
                    .order_by("branch_id")
                )
                lines.append(f"  CUSTOMER_PAYMENT_COMPANY_COUNT={cp_total}")
                branch_sum = 0
                for row in rows:
                    bid = row["branch_id"]
                    n = int(row["n"])
                    if bid is not None:
                        branch_sum += n
                        customer_payment_branch_total += n
                    pair = legacy_pair_by_branch.get(int(bid)) if bid else None
                    lbid = pair[1] if pair else ""
                    bname = clean(branches.get(int(bid)).name) if bid and int(bid) in branches else ""
                    lines.append(
                        f"    CUSTOMER_PAYMENT branch_legacy={lbid or 'NULL/OUTSIDE'}"
                        f" | branch_current={bid}"
                        f" | branch_name={bname}"
                        f" | count={n}"
                    )
                lines.append(
                    f"  CUSTOMER_PAYMENT_BRANCH_NON_NULL_SUM={branch_sum}"
                )
            except Exception as exc:
                timeout_errors.append(
                    f"CustomerPayment company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )

            try:
                sii = SalesInvoiceItem.objects.filter(company_id=cid).count()
                invoice_item_total += sii
                lines.append(f"  SALES_INVOICE_ITEM_COMPANY_COUNT={sii}")
            except Exception as exc:
                timeout_errors.append(
                    f"SalesInvoiceItem company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )

            try:
                lom = LegacyObjectMap.objects.filter(company_id=cid).count()
                legacy_map_total += lom
                lines.append(f"  LEGACY_OBJECT_MAP_COMPANY_COUNT={lom}")
            except Exception as exc:
                timeout_errors.append(
                    f"LegacyObjectMap company={lcid}/{cid}: {type(exc).__name__}: {clean(exc)}"
                )

        progress("[A5B] 4/7 Auditing PROTECT blockers...")
        lines.extend([
            "",
            "=" * 120,
            "PROTECT BLOCKER DETAIL",
            "=" * 120,
        ])

        blocker_rows = 0
        blocker_companies = set()

        for lcid in sorted(legacy_company_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            mode = clean(cfg_by_legacy[lcid].get("mode"))

            supplier_rows = list(
                SupplierPayment.objects.filter(company_id=cid)
                .values("branch_id")
                .annotate(n=Count("pk"))
                .order_by("branch_id")
            )
            supplier_total = sum(int(x["n"]) for x in supplier_rows)

            treasury_rows = list(
                TreasuryAccount.objects.filter(company_id=cid).order_by("id")
            )
            treasury_total = len(treasury_rows)

            customer_total = CustomerPayment.objects.filter(company_id=cid).count()

            if supplier_total or treasury_total or customer_total:
                blocker_companies.add(lcid)

            blocker_rows += supplier_total + treasury_total + customer_total

            lines.append(
                f"COMPANY legacy_id={lcid} | current_id={cid} | mode={mode}"
                f" | supplier_payments={supplier_total}"
                f" | customer_payments={customer_total}"
                f" | treasury_accounts={treasury_total}"
            )

            for row in supplier_rows:
                bid = row["branch_id"]
                pair = legacy_pair_by_branch.get(int(bid)) if bid else None
                lbid = pair[1] if pair else ""
                lines.append(
                    f"  SUPPLIER_PAYMENT branch_legacy={lbid or 'NULL/OUTSIDE'}"
                    f" | branch_current={bid}"
                    f" | count={int(row['n'])}"
                )

            for account in treasury_rows:
                display = clean(
                    getattr(account, "name", "")
                    or getattr(account, "account_name", "")
                    or getattr(account, "code", "")
                )
                status = clean(
                    getattr(account, "status", "")
                    or ("ACTIVE" if getattr(account, "is_active", False) else "")
                )
                lines.append(
                    f"  TREASURY_ACCOUNT id={account.id}"
                    f" | display={display}"
                    f" | status={status}"
                )

        progress("[A5B] 5/7 Auditing unresolved users from legacy roles...")
        lines.extend([
            "",
            "=" * 120,
            "LEGACY_UNRESOLVED USER ROLE EVIDENCE",
            "=" * 120,
        ])

        unresolved_rows = []
        cache_errors = []

        for lcid in sorted(legacy_company_ids, key=nkey):
            cid = company_id_by_legacy[lcid]
            cfg = cfg_by_legacy[lcid]
            mode = clean(cfg.get("mode"))

            if mode not in {"SPLIT", "PARTIAL_INCLUDE"}:
                continue

            unresolved_memberships = [
                m for m in memberships_by_company.get(cid, [])
                if policies.get(int(m.id)) is not None
                and clean(policies[int(m.id)].mode) == clean(BranchAccessMode.LEGACY_UNRESOLVED)
            ]

            if not unresolved_memberships:
                continue

            cache_file = CACHE_DIR / f"company_{lcid}.json"
            try:
                data = json.loads(cache_file.read_text(encoding="utf-8-sig"))
                payload = data.get("payload") or {}
                roles = role_name_map(payload)
                permissions, role_permissions, user_roles, direct_permissions = permission_context(payload)
            except Exception as exc:
                cache_errors.append(
                    f"company={lcid}: {type(exc).__name__}: {clean(exc)}"
                )
                continue

            for m in unresolved_memberships:
                uid = int(m.user_id)
                legacy_uid = legacy_user_by_current_company.get((uid, cid), "")
                role_ids = sorted(user_roles.get(legacy_uid, set()), key=nkey)
                role_names = [roles.get(rid, "") for rid in role_ids]

                permission_ids = set(direct_permissions.get(legacy_uid, set()))
                role_permission_ids = set()
                for rid in role_ids:
                    role_permission_ids.update(role_permissions.get(rid, set()))
                permission_ids.update(role_permission_ids)

                permission_names = sorted(
                    {
                        permissions.get(pid, "")
                        for pid in permission_ids
                        if permissions.get(pid, "")
                    }
                )

                non_location = [
                    p for p in permission_names
                    if not p.startswith("location.")
                ]
                branch_related = [
                    p for p in permission_names
                    if p == "access_all_locations" or p.startswith("location.")
                ]

                unresolved_rows.append((lcid, int(m.id), uid, legacy_uid))
                lines.append(
                    f"UNRESOLVED company={lcid}"
                    f" | membership={m.id}"
                    f" | legacy_user={legacy_uid}"
                    f" | current_user={uid}"
                    f" | username={clean(m.user.username)}"
                    f" | current_membership_role={clean(m.role)}"
                    f" | primary={yesno(m.is_primary)}"
                )
                lines.append(
                    f"  LEGACY_ROLE_IDS={role_ids}"
                    f" | LEGACY_ROLE_NAMES={role_names}"
                )
                lines.append(
                    f"  BRANCH_PERMISSION_NAMES={branch_related}"
                )
                lines.append(
                    f"  NON_LOCATION_PERMISSION_COUNT={len(non_location)}"
                )
                lines.append(
                    f"  NON_LOCATION_PERMISSION_SAMPLE={non_location[:40]}"
                )

        progress("[A5B] 6/7 Building exact user-delete candidates and source-retention groups...")
        lines.extend([
            "",
            "=" * 120,
            "SOURCE COMPANY RETENTION GROUPS",
            "=" * 120,
        ])

        retention_errors = []
        for lcid in sorted(legacy_company_ids, key=nkey):
            cfg = cfg_by_legacy[lcid]
            mode = clean(cfg.get("mode"))
            if mode != "SPLIT":
                continue

            default_current_ids = []
            for group in cfg.get("output_groups") or []:
                for b in group.get("branches") or []:
                    lbid = clean(b.get("legacy_branch_id"))
                    bid = branch_id_by_pair.get((lcid, lbid))
                    branch = branches.get(bid) if bid else None
                    if branch is not None and bool(branch.is_default):
                        default_current_ids.append((clean(group.get("group_id")), lbid, bid))

            if len(default_current_ids) != 1:
                retention_errors.append(
                    f"company={lcid} default_branch_group_count={len(default_current_ids)} details={default_current_ids}"
                )
                lines.append(
                    f"COMPANY legacy_id={lcid} | RETAIN_SOURCE_GROUP=REVIEW_REQUIRED | defaults={default_current_ids}"
                )
            else:
                group_id, lbid, bid = default_current_ids[0]
                lines.append(
                    f"COMPANY legacy_id={lcid}"
                    f" | RETAIN_SOURCE_GROUP={group_id}"
                    f" | DEFAULT_BRANCH_LEGACY={lbid}"
                    f" | DEFAULT_BRANCH_CURRENT={bid}"
                    f" | RULE=KEEP_EXISTING_COMPANY_ROW_AND_ORIGINAL_SUBSCRIPTION"
                )

        lines.extend([
            "",
            "=" * 120,
            "EXACT USER DELETE CANDIDATES",
            "=" * 120,
        ])

        delete_membership_ids = set()
        keep_membership_ids = set()

        for lcid in sorted(legacy_company_ids, key=nkey):
            cfg = cfg_by_legacy[lcid]
            mode = clean(cfg.get("mode"))
            cid = company_id_by_legacy[lcid]

            if mode == "EXCLUDE":
                delete_membership_ids.update(
                    int(m.id) for m in memberships_by_company.get(cid, [])
                )
            elif mode == "PARTIAL_INCLUDE":
                keep_lbid = {
                    clean(x.get("legacy_branch_id"))
                    for x in cfg.get("kept_branches") or []
                }
                keep_bids = {
                    branch_id_by_pair[(lcid, lbid)]
                    for lbid in keep_lbid
                    if (lcid, lbid) in branch_id_by_pair
                }
                exclude_lbid = {
                    clean(x.get("legacy_branch_id"))
                    for x in cfg.get("excluded_branches") or []
                }
                exclude_bids = {
                    branch_id_by_pair[(lcid, lbid)]
                    for lbid in exclude_lbid
                    if (lcid, lbid) in branch_id_by_pair
                }

                for m in memberships_by_company.get(cid, []):
                    policy = policies.get(int(m.id))
                    if policy is None:
                        keep_membership_ids.add(int(m.id))
                        continue
                    mode_now = clean(policy.mode)
                    grants = {
                        int(g.branch_id)
                        for g in grants_by_policy.get(int(policy.id), [])
                    }
                    if mode_now == clean(BranchAccessMode.ALL):
                        keep_membership_ids.add(int(m.id))
                    elif mode_now == clean(BranchAccessMode.LEGACY_UNRESOLVED):
                        keep_membership_ids.add(int(m.id))
                    elif grants & keep_bids:
                        keep_membership_ids.add(int(m.id))
                    elif grants and grants <= exclude_bids:
                        delete_membership_ids.add(int(m.id))
                    else:
                        keep_membership_ids.add(int(m.id))

        membership_by_id = {int(m.id): m for m in memberships}
        delete_user_ids = {
            int(membership_by_id[mid].user_id)
            for mid in delete_membership_ids
            if mid in membership_by_id
        }
        keep_user_ids = {
            int(membership_by_id[mid].user_id)
            for mid in keep_membership_ids
            if mid in membership_by_id
        }

        candidate_user_ids = sorted(delete_user_ids - keep_user_ids)
        outside_membership_counts = {
            int(row["user_id"]): int(row["n"])
            for row in (
                CompanyMembership.objects.filter(user_id__in=candidate_user_ids)
                .exclude(id__in=delete_membership_ids)
                .values("user_id")
                .annotate(n=Count("pk"))
                .order_by()
            )
        }

        safe_delete_users = []
        blocked_delete_users = []

        for uid in candidate_user_ids:
            remaining = outside_membership_counts.get(uid, 0)
            if remaining == 0:
                safe_delete_users.append(uid)
            else:
                blocked_delete_users.append((uid, remaining))

            relevant_memberships = [
                membership_by_id[mid]
                for mid in delete_membership_ids
                if mid in membership_by_id
                and int(membership_by_id[mid].user_id) == uid
            ]
            origins = [
                clean(
                    next(
                        (
                            lcid for lcid, cid in company_id_by_legacy.items()
                            if cid == int(m.company_id)
                        ),
                        "",
                    )
                )
                for m in relevant_memberships
            ]
            lines.append(
                f"USER_DELETE_CANDIDATE current_user_id={uid}"
                f" | username={clean(relevant_memberships[0].user.username) if relevant_memberships else ''}"
                f" | source_legacy_companies={sorted(set(origins), key=nkey)}"
                f" | remaining_memberships_after_planned_removal={remaining}"
                f" | safe_to_delete_user_row_by_membership_scope={yesno(remaining == 0)}"
            )

        lines.extend([
            "",
            "=" * 120,
            "A5B FINAL CLOSURE SUMMARY",
            "=" * 120,
            f"DECISION_MAP_SHA256={actual_sha}",
            f"SCOPED_COMPANIES={len(legacy_company_ids)}",
            f"TARGETED_TIMEOUT_ERROR_COUNT={len(timeout_errors)}",
            f"CUSTOMER_PAYMENT_COMPANY_TOTAL={customer_payment_company_total}",
            f"CUSTOMER_PAYMENT_BRANCH_NON_NULL_TOTAL={customer_payment_branch_total}",
            f"SALES_INVOICE_ITEM_COMPANY_TOTAL={invoice_item_total}",
            f"LEGACY_OBJECT_MAP_COMPANY_TOTAL={legacy_map_total}",
            f"BLOCKER_COMPANY_COUNT={len(blocker_companies)}",
            f"BLOCKER_ROW_TOTAL={blocker_rows}",
            f"UNRESOLVED_SPLIT_OR_PARTIAL_COUNT={len(unresolved_rows)}",
            f"UNRESOLVED_CACHE_ERROR_COUNT={len(cache_errors)}",
            f"RETENTION_GROUP_ERROR_COUNT={len(retention_errors)}",
            f"PLANNED_DELETE_MEMBERSHIP_COUNT={len(delete_membership_ids)}",
            f"PLANNED_KEEP_MEMBERSHIP_COUNT={len(keep_membership_ids)}",
            f"USER_DELETE_CANDIDATE_COUNT={len(candidate_user_ids)}",
            f"SAFE_DELETE_USER_BY_MEMBERSHIP_SCOPE_COUNT={len(safe_delete_users)}",
            f"BLOCKED_DELETE_USER_COUNT={len(blocked_delete_users)}",
        ])

        if timeout_errors:
            lines.append("TARGETED_TIMEOUT_ERRORS_BEGIN")
            lines.extend(timeout_errors)
            lines.append("TARGETED_TIMEOUT_ERRORS_END")

        if cache_errors:
            lines.append("UNRESOLVED_CACHE_ERRORS_BEGIN")
            lines.extend(cache_errors)
            lines.append("UNRESOLVED_CACHE_ERRORS_END")

        if retention_errors:
            lines.append("RETENTION_GROUP_ERRORS_BEGIN")
            lines.extend(retention_errors)
            lines.append("RETENTION_GROUP_ERRORS_END")

        if blocked_delete_users:
            lines.append("BLOCKED_DELETE_USERS_BEGIN")
            for uid, remaining in blocked_delete_users:
                lines.append(f"user={uid}|remaining_memberships={remaining}")
            lines.append("BLOCKED_DELETE_USERS_END")

        result = (
            "PASS"
            if not timeout_errors
            and not cache_errors
            and not retention_errors
            and not blocked_delete_users
            else "REVIEW_REQUIRED"
        )

        lines.extend([
            "DATABASE_WRITES=0",
            "SOURCE_NETWORK_CALLS=0",
            f"A5B_RESULT={result}",
            "=" * 120,
        ])

        progress("[A5B] 7/7 Writing report...")
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()

        progress("===== PRIMEYACC COMPANY SPLIT A5B =====")
        progress(f"A5B_RESULT={result}")
        progress(f"TARGETED_TIMEOUT_ERROR_COUNT={len(timeout_errors)}")
        progress(f"UNRESOLVED_SPLIT_OR_PARTIAL_COUNT={len(unresolved_rows)}")
        progress(f"RETENTION_GROUP_ERROR_COUNT={len(retention_errors)}")
        progress(f"USER_DELETE_CANDIDATE_COUNT={len(candidate_user_ids)}")
        progress(f"SAFE_DELETE_USER_BY_MEMBERSHIP_SCOPE_COUNT={len(safe_delete_users)}")
        progress(f"BLOCKED_DELETE_USER_COUNT={len(blocked_delete_users)}")
        progress("DATABASE_WRITES=0")
        progress(f"REPORT={REPORT.name}")
        progress(f"SIZE={REPORT.stat().st_size}")
        progress(f"SHA256={digest}")
        return 0 if result == "PASS" else 2

    except KeyboardInterrupt:
        lines.extend([
            "",
            "A5B_RESULT=INTERRUPTED",
            "DATABASE_WRITES=0",
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nA5B_RESULT=INTERRUPTED", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        return 130

    except Exception as exc:
        lines.extend([
            "",
            "=" * 120,
            "A5B_RESULT=FAIL",
            f"ERROR_TYPE={type(exc).__name__}",
            f"ERROR={clean(exc)}",
            "DATABASE_WRITES=0",
            "=" * 120,
        ])
        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        digest = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
        print("===== PRIMEYACC COMPANY SPLIT A5B =====", flush=True)
        print("A5B_RESULT=FAIL", flush=True)
        print(f"ERROR={type(exc).__name__}: {exc}", flush=True)
        print(f"REPORT={REPORT.name}", flush=True)
        print(f"SIZE={REPORT.stat().st_size}", flush=True)
        print(f"SHA256={digest}", flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    SystemRole,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from business_controls.models import LegacyObjectMap, MigrationRun
from companies.models import Company


SOURCE_SYSTEM = "mhamcloud_v1"
SOURCE_USER_TABLE = "users"
MIGRATION_NAME = "company_identity_import"
APPLY_CONFIRMATION = "APPLY-MHAMCLOUD-IDENTITY"


class Command(BaseCommand):
    help = (
        "Safely migrate one MhamCloud V1 user identity into PrimeyAcc. "
        "Default mode is read-only dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument("--input", required=True)
        parser.add_argument("--legacy-company-id", required=True)
        parser.add_argument("--legacy-user-id", required=True)
        parser.add_argument("--report", default="")
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--confirm", default="")

    def handle(self, *args, **options):
        input_path = Path(options["input"]).resolve()
        company_id = str(options["legacy_company_id"]).strip()
        user_id = str(options["legacy_user_id"]).strip()
        report_raw = str(options.get("report") or "").strip()
        apply_mode = bool(options["apply"])
        confirmation = str(options.get("confirm") or "").strip()

        if not input_path.is_file():
            raise CommandError(f"Snapshot not found: {input_path}")

        if not company_id or not user_id:
            raise CommandError(
                "Legacy company/user IDs cannot be empty."
            )

        if apply_mode and confirmation != APPLY_CONFIRMATION:
            raise CommandError(
                "Apply blocked. Use both:\n"
                "  --apply\n"
                f"  --confirm {APPLY_CONFIRMATION}"
            )

        snapshot = self._load_snapshot(input_path)

        if snapshot.get("source_system") != SOURCE_SYSTEM:
            raise CommandError("Unexpected source_system.")

        if str(snapshot.get("legacy_company_id")) != company_id:
            raise CommandError("Legacy company ID mismatch.")

        user = self._find_user(snapshot, user_id)
        normalized = self._normalize(snapshot, user, company_id)

        checksum = self._checksum(
            {
                "user": user,
                "user_roles": normalized["source"]["user_roles"],
                "role_permissions": normalized["source"]["role_permissions"],
                "direct_permissions": normalized["source"]["direct_permissions"],
            }
        )

        company = Company.objects.filter(
            company_code=f"LEGACY-{company_id}"
        ).first()

        existing_map = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table=SOURCE_USER_TABLE,
            legacy_id=user_id,
        ).first()

        validation = self._validate(
            normalized=normalized,
            company=company,
            existing_map=existing_map,
        )

        report = {
            "source_system": SOURCE_SYSTEM,
            "mode": "APPLY" if apply_mode else "DRY_RUN",
            "input_file": str(input_path),
            "legacy_company_id": company_id,
            "legacy_user_id": user_id,
            "checksum": checksum,
            "validation": validation,
            "normalized": normalized,
            "target_company": {
                "id": company.pk if company else None,
                "company_code": company.company_code if company else None,
            },
            "result": {
                "status": "NOT_APPLIED",
                "user_id": None,
                "profile_id": None,
                "membership_id": None,
                "migration_run_id": None,
            },
        }

        report_path = (
            Path(report_raw).resolve()
            if report_raw
            else input_path.with_name(
                f"{input_path.stem}_identity_migration_report.json"
            )
        )

        self._write_report(report_path, report)
        self._print_summary(report)

        self.stdout.write(f"Report: {report_path}")

        if not validation["valid"]:
            raise CommandError(
                "Validation failed. Nothing was written."
            )

        if not apply_mode:
            self.stdout.write(
                self.style.SUCCESS(
                    "DRY-RUN COMPLETE - NO DATABASE WRITES PERFORMED."
                )
            )
            return

        result = self._apply(
            company=company,
            legacy_company_id=company_id,
            legacy_user_id=user_id,
            checksum=checksum,
            normalized=normalized,
            input_path=input_path,
        )

        report["result"] = result
        self._write_report(report_path, report)

        self.stdout.write(
            self.style.SUCCESS("APPLY COMPLETE.")
        )

    def _load_snapshot(self, path: Path) -> dict[str, Any]:
        try:
            with path.open("r", encoding="utf-8-sig") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(
                f"Unable to read snapshot: {exc}"
            ) from exc

        if not isinstance(data, dict):
            raise CommandError("Snapshot root must be an object.")

        security = data.get("security") or {}

        if security.get("password_exported") is not False:
            raise CommandError(
                "Snapshot security contract rejected: "
                "password_exported must be false."
            )

        return data

    def _find_user(
        self,
        snapshot: dict[str, Any],
        legacy_user_id: str,
    ) -> dict[str, Any]:
        users = snapshot.get("users") or []

        if not isinstance(users, list):
            raise CommandError("'users' must be an array.")

        matches = [
            item
            for item in users
            if isinstance(item, dict)
            and str(item.get("id")) == legacy_user_id
        ]

        if len(matches) != 1:
            raise CommandError(
                "Expected exactly one matching legacy user."
            )

        return matches[0]

    def _role_for_user(
        self,
        snapshot: dict[str, Any],
        legacy_user_id: str,
    ) -> tuple[str, str]:
        roles = [
            row
            for row in (snapshot.get("user_roles") or [])
            if isinstance(row, dict)
            and str(row.get("user_id")) == legacy_user_id
        ]

        legacy_role = (
            str(roles[0].get("role_name") or "").strip()
            if roles else ""
        )

        name = legacy_role.lower()

        mapping = (
            ("owner", CompanyRole.OWNER),
            ("admin", CompanyRole.ADMIN),
            ("manager", CompanyRole.MANAGER),
            ("accountant", CompanyRole.ACCOUNTANT),
            ("cashier", CompanyRole.CASHIER),
            ("sales", CompanyRole.SALES),
            ("inventory", CompanyRole.INVENTORY),
            ("hr", CompanyRole.HR),
        )

        for prefix, target in mapping:
            if name.startswith(prefix):
                return legacy_role, target

        return legacy_role, CompanyRole.EMPLOYEE

    def _normalize(
        self,
        snapshot: dict[str, Any],
        user: dict[str, Any],
        legacy_company_id: str,
    ) -> dict[str, Any]:
        legacy_user_id = str(user.get("id"))
        username = self._text(user.get("username"))

        name_parts = [
            self._text(user.get("surname")),
            self._text(user.get("first_name")),
            self._text(user.get("last_name")),
        ]
        display_name = " ".join(
            value for value in name_parts if value
        )

        legacy_role, target_role = self._role_for_user(
            snapshot,
            legacy_user_id,
        )

        active = (
            self._text(user.get("status")).lower() == "active"
            and self._bool(user.get("allow_login"))
            and user.get("deleted_at") is None
        )

        status = (
            MembershipStatus.ACTIVE
            if active
            else MembershipStatus.INACTIVE
        )

        role_ids = {
            str(row.get("role_id"))
            for row in (snapshot.get("user_roles") or [])
            if isinstance(row, dict)
            and str(row.get("user_id")) == legacy_user_id
        }

        role_permissions = [
            row
            for row in (snapshot.get("role_permissions") or [])
            if isinstance(row, dict)
            and str(row.get("role_id")) in role_ids
        ]

        direct_permissions = [
            row
            for row in (snapshot.get("direct_permissions") or [])
            if isinstance(row, dict)
            and str(row.get("user_id")) == legacy_user_id
        ]

        return {
            "legacy_user_id": legacy_user_id,
            "user": {
                "username": username,
                "first_name": self._text(user.get("first_name"))[:150],
                "last_name": self._text(user.get("last_name"))[:150],
                "email": self._email(user.get("email")),
                "is_active": active,
                "password_policy": "UNUSABLE_UNTIL_RESET",
            },
            "profile": {
                "display_name": display_name[:255],
                "phone": self._text(user.get("contact_no"))[:50],
                "mobile": self._text(
                    user.get("contact_number")
                )[:50],
                "whatsapp_number": "",
                "status": (
                    UserProfileStatus.ACTIVE
                    if active
                    else UserProfileStatus.INACTIVE
                ),
                "default_workspace": WorkspaceType.COMPANY,
                "system_role": SystemRole.NONE,
                "is_system_user": False,
                "language": self._text(
                    user.get("language")
                ) or "ar",
                "timezone": "Asia/Riyadh",
            },
            "membership": {
                "role": target_role,
                "status": status,
                "is_primary": True,
                "legacy_role": legacy_role,
            },
            "security": {
                "password_imported": False,
                "password_generated": False,
                "legacy_password_hash_used": False,
                "login_requires_password_setup": True,
            },
            "source": {
                "legacy_company_id": legacy_company_id,
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at"),
                "user_roles": [
                    row
                    for row in (snapshot.get("user_roles") or [])
                    if isinstance(row, dict)
                    and str(row.get("user_id")) == legacy_user_id
                ],
                "role_permissions": role_permissions,
                "direct_permissions": direct_permissions,
            },
        }

    def _validate(
        self,
        *,
        normalized: dict[str, Any],
        company: Company | None,
        existing_map: LegacyObjectMap | None,
    ) -> dict[str, Any]:
        User = get_user_model()
        errors: list[str] = []
        warnings: list[str] = []

        username = normalized["user"]["username"]

        if company is None:
            errors.append("Target migrated company does not exist.")

        if not username:
            errors.append("Legacy username is empty.")

        if existing_map:
            errors.append(
                "Legacy user is already mapped in LegacyObjectMap."
            )

        if username and User.objects.filter(
            username=username
        ).exists():
            errors.append(
                f"Target username already exists: {username}"
            )

        if normalized["source"]["direct_permissions"]:
            warnings.append(
                "Legacy direct permissions exist and are not "
                "individually imported in this phase."
            )

        if normalized["source"]["role_permissions"]:
            warnings.append(
                "Legacy role permissions exist; PrimeyAcc "
                "CompanyRole permissions remain authoritative."
            )

        return {
            "valid": not errors,
            "errors": errors,
            "warnings": warnings,
            "source_user_count": 1,
            "target_object_count": 3,
        }

    @transaction.atomic
    def _apply(
        self,
        *,
        company: Company,
        legacy_company_id: str,
        legacy_user_id: str,
        checksum: str,
        normalized: dict[str, Any],
        input_path: Path,
    ) -> dict[str, Any]:
        User = get_user_model()

        if LegacyObjectMap.objects.select_for_update().filter(
            source_system=SOURCE_SYSTEM,
            source_table=SOURCE_USER_TABLE,
            legacy_id=legacy_user_id,
        ).exists():
            raise CommandError(
                "Apply blocked: legacy user mapping already exists."
            )

        if User.objects.filter(
            username=normalized["user"]["username"]
        ).exists():
            raise CommandError(
                "Apply blocked: username already exists."
            )

        run = MigrationRun.objects.create(
            source_system=SOURCE_SYSTEM,
            migration_name=MIGRATION_NAME,
            status=MigrationRun.Status.DRY_RUN,
            company=company,
            source_count=1,
            source_snapshot={
                "input_file": str(input_path),
                "checksum": checksum,
                "legacy_company_id": legacy_company_id,
                "legacy_user_id": legacy_user_id,
            },
            metadata={
                "scope": [SOURCE_USER_TABLE],
                "apply_confirmation": APPLY_CONFIRMATION,
                "password_policy": "UNUSABLE_UNTIL_RESET",
            },
        )

        user_data = normalized["user"]

        user = User(
            username=user_data["username"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            email=user_data["email"],
            is_active=user_data["is_active"],
            is_staff=False,
            is_superuser=False,
        )
        user.set_unusable_password()
        user.save()

        profile_data = normalized["profile"]

        profile, _ = UserProfile.objects.get_or_create(
            user=user
        )
        profile.display_name = profile_data["display_name"]
        profile.phone = profile_data["phone"]
        profile.mobile = profile_data["mobile"]
        profile.whatsapp_number = profile_data["whatsapp_number"]
        profile.status = profile_data["status"]
        profile.default_workspace = profile_data["default_workspace"]
        profile.system_role = profile_data["system_role"]
        profile.default_company = company
        profile.is_system_user = profile_data["is_system_user"]
        profile.language = profile_data["language"]
        profile.timezone = profile_data["timezone"]
        profile.extra_data = {
            "migration": {
                "source_system": SOURCE_SYSTEM,
                "source_table": SOURCE_USER_TABLE,
                "legacy_id": legacy_user_id,
            }
        }
        profile.save()

        membership_data = normalized["membership"]

        membership = CompanyMembership.objects.create(
            user=user,
            company=company,
            role=membership_data["role"],
            status=membership_data["status"],
            is_primary=membership_data["is_primary"],
            joined_at=self._legacy_datetime(
                normalized["source"]["created_at"]
            ),
            extra_data={
                "migration": {
                    "source_system": SOURCE_SYSTEM,
                    "legacy_user_id": legacy_user_id,
                    "legacy_role": membership_data["legacy_role"],
                }
            },
        )

        content_type = ContentType.objects.get_for_model(User)

        LegacyObjectMap.objects.create(
            run=run,
            source_system=SOURCE_SYSTEM,
            source_table=SOURCE_USER_TABLE,
            legacy_id=legacy_user_id,
            legacy_company_id=legacy_company_id,
            company=company,
            target_content_type=content_type,
            target_object_id=str(user.pk),
            checksum=checksum,
            source_reference=user.username,
            metadata={
                "profile_id": profile.pk,
                "membership_id": membership.pk,
                "role": membership.role,
                "password_policy": "UNUSABLE_UNTIL_RESET",
            },
        )

        mapped = LegacyObjectMap.objects.filter(run=run).count()

        reconciliation = {
            "expected_source_mappings": 1,
            "mapped_source_objects": mapped,
            "difference": 1 - mapped,
            "users_created": 1,
            "profiles_created": 1,
            "memberships_created": 1,
            "target_objects_created": 3,
        }

        if reconciliation["difference"] != 0:
            raise CommandError("Apply reconciliation failed.")

        run.processed_count = 1
        run.created_count = 3
        run.failed_count = 0
        run.reconciliation = reconciliation
        run.status = MigrationRun.Status.APPLIED
        run.completed_at = timezone.now()
        run.save(
            update_fields=[
                "processed_count",
                "created_count",
                "failed_count",
                "reconciliation",
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        return {
            "status": "APPLIED",
            "user_id": user.pk,
            "profile_id": profile.pk,
            "membership_id": membership.pk,
            "migration_run_id": run.pk,
            "reconciliation": reconciliation,
        }

    def _legacy_datetime(self, value: Any):
        if not value:
            return timezone.now()

        parsed = parse_datetime(str(value))

        if parsed is None:
            return timezone.now()

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(
                parsed,
                timezone.get_current_timezone(),
            )

        return parsed

    def _write_report(
        self,
        path: Path,
        report: dict[str, Any],
    ) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(path.suffix + ".tmp")

        with temp.open("w", encoding="utf-8") as fh:
            json.dump(
                report,
                fh,
                ensure_ascii=False,
                indent=2,
                default=str,
            )

        temp.replace(path)

    def _print_summary(self, report: dict[str, Any]) -> None:
        v = report["validation"]
        n = report["normalized"]

        self.stdout.write("=" * 72)
        self.stdout.write("MHAMCLOUD V1 -> PRIMEYACC IDENTITY MIGRATION")
        self.stdout.write("=" * 72)
        self.stdout.write(f"Mode: {report['mode']}")
        self.stdout.write(
            f"Legacy user ID: {report['legacy_user_id']}"
        )
        self.stdout.write(
            f"Username: {n['user']['username']}"
        )
        self.stdout.write(
            f"Display name: {n['profile']['display_name']}"
        )
        self.stdout.write(
            f"Role: {n['membership']['role']}"
        )
        self.stdout.write(
            f"Validation: {'PASS' if v['valid'] else 'FAIL'}"
        )

        for warning in v["warnings"]:
            self.stdout.write(
                self.style.WARNING(f"WARNING: {warning}")
            )

        for error in v["errors"]:
            self.stdout.write(
                self.style.ERROR(f"ERROR: {error}")
            )

        self.stdout.write("=" * 72)

    def _checksum(self, value: Any) -> str:
        payload = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _text(self, value: Any) -> str:
        return "" if value is None else str(value).strip()

    def _email(self, value: Any) -> str:
        value = self._text(value)
        return value[:254] if "@" in value else ""

    def _bool(self, value: Any) -> bool:
        if isinstance(value, bool):
            return value

        return str(value).strip().lower() in {
            "1",
            "true",
            "yes",
            "active",
        }

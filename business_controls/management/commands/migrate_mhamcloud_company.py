from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from business_controls.models import LegacyObjectMap, MigrationRun
from companies.models import (
    Branch,
    BranchStatus,
    BranchType,
    Company,
    CompanyActivityProfile,
    CompanySettings,
    CompanyStatus,
)


SOURCE_SYSTEM = "mhamcloud_v1"
SOURCE_COMPANY_TABLE = "business"
SOURCE_BRANCH_TABLE = "business_locations"

APPLY_CONFIRMATION = "APPLY-MHAMCLOUD-COMPANY"


class Command(BaseCommand):
    help = (
        "Safely migrate one MhamCloud V1 company snapshot into PrimeyAcc. "
        "Default mode is read-only dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            required=True,
            help="Path to the company snapshot JSON file.",
        )
        parser.add_argument(
            "--legacy-company-id",
            required=True,
            help="Legacy MhamCloud business.id to process.",
        )
        parser.add_argument(
            "--report",
            default="",
            help="Optional path for JSON migration report.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually create Company/Branch records.",
        )
        parser.add_argument(
            "--confirm",
            default="",
            help=(
                "Required with --apply. "
                f"Must equal {APPLY_CONFIRMATION}."
            ),
        )

    def handle(self, *args, **options):
        input_path = Path(options["input"]).resolve()
        legacy_company_id = str(options["legacy_company_id"]).strip()
        report_path_raw = str(options.get("report") or "").strip()
        apply_mode = bool(options["apply"])
        confirmation = str(options.get("confirm") or "").strip()

        if not input_path.exists():
            raise CommandError(
                f"Input snapshot not found: {input_path}"
            )

        if not input_path.is_file():
            raise CommandError(
                f"Input path is not a file: {input_path}"
            )

        if not legacy_company_id:
            raise CommandError(
                "--legacy-company-id cannot be empty."
            )

        if apply_mode and confirmation != APPLY_CONFIRMATION:
            raise CommandError(
                "Apply blocked. Use both:\n"
                "  --apply\n"
                f"  --confirm {APPLY_CONFIRMATION}"
            )

        snapshot = self._load_snapshot(input_path)

        business = snapshot.get("business")

        if not isinstance(business, dict):
            raise CommandError(
                "Snapshot must contain a 'business' JSON object."
            )

        snapshot_legacy_id = str(
            business.get("id", "")
        ).strip()

        if snapshot_legacy_id != legacy_company_id:
            raise CommandError(
                "Legacy company ID mismatch: "
                f"argument={legacy_company_id}, "
                f"snapshot={snapshot_legacy_id or '<empty>'}"
            )

        branches = snapshot.get("business_locations", [])

        if branches is None:
            branches = []

        if not isinstance(branches, list):
            raise CommandError(
                "'business_locations' must be a JSON array."
            )

        normalized = self._normalize(
            business=business,
            branches=branches,
            currency=snapshot.get("currency"),
        )

        checksum = self._checksum(
            {
                "business": business,
                "business_locations": branches,
            }
        )

        existing_map = LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table=SOURCE_COMPANY_TABLE,
            legacy_id=legacy_company_id,
        ).select_related(
            "target_content_type",
            "company",
        ).first()

        validation = self._validate(
            normalized=normalized,
            legacy_company_id=legacy_company_id,
            existing_map=existing_map,
        )

        report = {
            "source_system": SOURCE_SYSTEM,
            "mode": "APPLY" if apply_mode else "DRY_RUN",
            "input_file": str(input_path),
            "legacy_company_id": legacy_company_id,
            "checksum": checksum,
            "validation": validation,
            "normalized": normalized,
            "existing_mapping": self._mapping_snapshot(
                existing_map
            ),
            "result": {
                "status": "NOT_APPLIED",
                "company_id": None,
                "branch_ids": [],
                "migration_run_id": None,
            },
        }

        self._print_summary(report)

        if report_path_raw:
            report_path = Path(report_path_raw).resolve()
        else:
            report_path = input_path.with_name(
                f"{input_path.stem}_migration_report.json"
            )

        self._write_report(
            report_path=report_path,
            report=report,
        )

        self.stdout.write(
            f"Report: {report_path}"
        )

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

        apply_result = self._apply(
            legacy_company_id=legacy_company_id,
            checksum=checksum,
            normalized=normalized,
            input_path=input_path,
        )

        report["result"] = apply_result

        self._write_report(
            report_path=report_path,
            report=report,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "APPLY COMPLETE."
            )
        )

    def _load_snapshot(
        self,
        path: Path,
    ) -> dict[str, Any]:
        try:
            with path.open(
                "r",
                encoding="utf-8-sig",
            ) as fh:
                data = json.load(fh)
        except json.JSONDecodeError as exc:
            raise CommandError(
                f"Invalid JSON snapshot: {exc}"
            ) from exc
        except OSError as exc:
            raise CommandError(
                f"Unable to read snapshot: {exc}"
            ) from exc

        if not isinstance(data, dict):
            raise CommandError(
                "Snapshot JSON root must be an object."
            )

        return data

    def _normalize(
        self,
        *,
        business: dict[str, Any],
        branches: list[dict[str, Any]],
        currency: Any = None,
    ) -> dict[str, Any]:
        name = self._text(
            business.get("name")
        )

        company = {
            "legacy_id": self._text(
                business.get("id")
            ),
            "name": name,
            "company_code": (
                f"LEGACY-{self._text(business.get('id'))}"
            ),
            "email": self._email(
                business.get("email")
            ),
            "phone": self._text(
                business.get("mobile")
                or business.get("phone")
                or business.get("contact_number")
            ),
            "currency_code": self._currency_code(
                business,
                currency,
            ),
            "vat_percentage": self._vat_percentage(
                business
            ),
            "vat_enabled": (
                self._vat_percentage(business) > 0
            ),
            "status": CompanyStatus.ACTIVE,
            "activity_profile": (
                CompanyActivityProfile.GENERAL
            ),
            "country": "Saudi Arabia",
        }

        normalized_branches = []

        for raw in branches:
            if not isinstance(raw, dict):
                continue

            legacy_branch_id = self._text(
                raw.get("id")
            )

            if not legacy_branch_id:
                continue

            branch_name = (
                self._text(raw.get("name"))
                or f"Legacy Branch {legacy_branch_id}"
            )

            normalized_branches.append(
                {
                    "legacy_id": legacy_branch_id,
                    "name": branch_name,
                    "branch_code": (
                        f"LEGACY-BR-{legacy_branch_id}"
                    ),
                    "branch_type": BranchType.BRANCH,
                    "status": (
                        BranchStatus.ACTIVE
                        if self._legacy_branch_active(raw)
                        else BranchStatus.INACTIVE
                    ),
                    "is_default": False,
                    "email": self._email(
                        raw.get("email")
                    ),
                    "phone": self._text(
                        raw.get("mobile")
                        or raw.get("phone")
                        or raw.get("contact_number")
                    ),
                    "city": self._text(
                        raw.get("city")
                    ),
                    "region": self._text(
                        raw.get("state")
                        or raw.get("region")
                    ),
                    "country": self._text(
                        raw.get("country")
                    )
                    or "Saudi Arabia",
                    "address": self._text(
                        raw.get("landmark")
                        or raw.get("address")
                    ),
                }
            )

        if normalized_branches:
            normalized_branches[0][
                "is_default"
            ] = True

        settings = {
            "timezone_name": (
                self._text(
                    business.get("time_zone")
                )
                or "Asia/Riyadh"
            ),
            "fiscal_year_start_month": (
                int(business.get("fy_start_month") or 1)
            ),
            "fiscal_year_start_day": 1,
            "default_vat_percentage": (
                company["vat_percentage"]
            ),
        }

        return {
            "company": company,
            "company_settings": settings,
            "branches": normalized_branches,
        }

    def _validate(
        self,
        *,
        normalized: dict[str, Any],
        legacy_company_id: str,
        existing_map: LegacyObjectMap | None,
    ) -> dict[str, Any]:
        errors: list[str] = []
        warnings: list[str] = []

        company_data = normalized["company"]
        branches = normalized["branches"]

        if not company_data["name"]:
            errors.append(
                "Legacy business name is empty."
            )

        if existing_map:
            errors.append(
                "Legacy business is already mapped in "
                "LegacyObjectMap."
            )

        company_code = company_data[
            "company_code"
        ]

        if Company.objects.filter(
            company_code=company_code
        ).exists():
            errors.append(
                f"Target company_code already exists: "
                f"{company_code}"
            )

        seen_branch_codes: set[str] = set()
        seen_legacy_ids: set[str] = set()

        for branch in branches:
            branch_code = branch[
                "branch_code"
            ]
            branch_legacy_id = branch[
                "legacy_id"
            ]

            if branch_code in seen_branch_codes:
                errors.append(
                    "Duplicate branch code in snapshot: "
                    f"{branch_code}"
                )

            if branch_legacy_id in seen_legacy_ids:
                errors.append(
                    "Duplicate legacy branch ID in snapshot: "
                    f"{branch_legacy_id}"
                )

            seen_branch_codes.add(branch_code)
            seen_legacy_ids.add(
                branch_legacy_id
            )

            mapped = LegacyObjectMap.objects.filter(
                source_system=SOURCE_SYSTEM,
                source_table=SOURCE_BRANCH_TABLE,
                legacy_id=branch_legacy_id,
            ).exists()

            if mapped:
                errors.append(
                    "Legacy branch is already mapped: "
                    f"{branch_legacy_id}"
                )

        if not branches:
            warnings.append(
                "No business_locations were supplied."
            )

        if len(
            [
                branch
                for branch in branches
                if branch["is_default"]
            ]
        ) > 1:
            errors.append(
                "More than one default branch detected."
            )

        return {
            "valid": not errors,
            "errors": errors,
            "warnings": warnings,
            "company_count": 1,
            "branch_count": len(branches),
            "legacy_company_id": legacy_company_id,
        }

    @transaction.atomic
    def _apply(
        self,
        *,
        legacy_company_id: str,
        checksum: str,
        normalized: dict[str, Any],
        input_path: Path,
    ) -> dict[str, Any]:
        existing_map = (
            LegacyObjectMap.objects
            .select_for_update()
            .filter(
                source_system=SOURCE_SYSTEM,
                source_table=SOURCE_COMPANY_TABLE,
                legacy_id=legacy_company_id,
            )
            .first()
        )

        if existing_map:
            raise CommandError(
                "Apply blocked: company mapping "
                "already exists."
            )

        company_data = normalized["company"]
        branches_data = normalized["branches"]

        if Company.objects.filter(
            company_code=company_data[
                "company_code"
            ]
        ).exists():
            raise CommandError(
                "Apply blocked: target company_code "
                "already exists."
            )

        run = MigrationRun.objects.create(
            source_system=SOURCE_SYSTEM,
            migration_name="company_branch_import",
            status=MigrationRun.Status.DRY_RUN,
            source_count=(
                1 + len(branches_data)
            ),
            source_snapshot={
                "input_file": str(input_path),
                "checksum": checksum,
                "legacy_company_id": (
                    legacy_company_id
                ),
            },
            metadata={
                "scope": [
                    SOURCE_COMPANY_TABLE,
                    SOURCE_BRANCH_TABLE,
                ],
                "apply_confirmation": (
                    APPLY_CONFIRMATION
                ),
            },
        )

        company = Company.objects.create(
            name=company_data["name"],
            company_code=company_data[
                "company_code"
            ],
            activity_profile=company_data[
                "activity_profile"
            ],
            status=company_data["status"],
            is_active=True,
            email=company_data["email"],
            phone=company_data["phone"],
            country=company_data["country"],
            currency_code=company_data[
                "currency_code"
            ],
            vat_percentage=company_data[
                "vat_percentage"
            ],
            extra_data={
                "migration": {
                    "source_system": (
                        SOURCE_SYSTEM
                    ),
                    "source_table": (
                        SOURCE_COMPANY_TABLE
                    ),
                    "legacy_id": (
                        legacy_company_id
                    ),
                }
            },
        )

        CompanySettings.objects.get_or_create(
            company=company,
            defaults={
                "timezone_name": "Asia/Riyadh",
                "fiscal_year_start_month": 1,
                "fiscal_year_start_day": 1,
                "enable_vat": company_data[
                    "vat_enabled"
                ],
                "default_vat_percentage": company_data[
                    "vat_percentage"
                ],
            },
        )

        company_content_type = (
            ContentType.objects.get_for_model(
                Company
            )
        )

        LegacyObjectMap.objects.create(
            run=run,
            source_system=SOURCE_SYSTEM,
            source_table=SOURCE_COMPANY_TABLE,
            legacy_id=legacy_company_id,
            legacy_company_id=legacy_company_id,
            company=company,
            target_content_type=(
                company_content_type
            ),
            target_object_id=str(
                company.pk
            ),
            checksum=checksum,
            source_reference=company_data[
                "name"
            ],
            metadata={
                "company_code": (
                    company.company_code
                ),
            },
        )

        branch_content_type = (
            ContentType.objects.get_for_model(
                Branch
            )
        )

        created_branch_ids: list[int] = []

        for branch_data in branches_data:
            branch = Branch.objects.create(
                company=company,
                name=branch_data["name"],
                branch_code=branch_data[
                    "branch_code"
                ],
                branch_type=branch_data[
                    "branch_type"
                ],
                status=branch_data["status"],
                is_default=branch_data[
                    "is_default"
                ],
                email=branch_data["email"],
                phone=branch_data["phone"],
                city=branch_data["city"],
                region=branch_data["region"],
                country=branch_data[
                    "country"
                ],
                address=branch_data[
                    "address"
                ],
                extra_data={
                    "migration": {
                        "source_system": (
                            SOURCE_SYSTEM
                        ),
                        "source_table": (
                            SOURCE_BRANCH_TABLE
                        ),
                        "legacy_id": (
                            branch_data[
                                "legacy_id"
                            ]
                        ),
                    }
                },
            )

            created_branch_ids.append(
                branch.pk
            )

            LegacyObjectMap.objects.create(
                run=run,
                source_system=SOURCE_SYSTEM,
                source_table=SOURCE_BRANCH_TABLE,
                legacy_id=branch_data[
                    "legacy_id"
                ],
                legacy_company_id=(
                    legacy_company_id
                ),
                company=company,
                target_content_type=(
                    branch_content_type
                ),
                target_object_id=str(
                    branch.pk
                ),
                source_reference=branch.name,
                metadata={
                    "branch_code": (
                        branch.branch_code
                    ),
                },
            )

        expected = 1 + len(
            branches_data
        )

        mapped = LegacyObjectMap.objects.filter(
            run=run
        ).count()

        reconciliation = {
            "expected_objects": expected,
            "mapped_objects": mapped,
            "difference": expected - mapped,
            "company_created": 1,
            "branches_created": len(
                created_branch_ids
            ),
        }

        if reconciliation[
            "difference"
        ] != 0:
            raise CommandError(
                "Apply reconciliation failed."
            )

        run.processed_count = expected
        run.created_count = expected
        run.failed_count = 0
        run.company = company
        run.reconciliation = reconciliation
        run.status = MigrationRun.Status.APPLIED
        from django.utils import timezone
        run.completed_at = timezone.now()
        run.save(
            update_fields=[
                "processed_count",
                "created_count",
                "failed_count",
                "company",
                "reconciliation",
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        return {
            "status": "APPLIED",
            "company_id": company.pk,
            "branch_ids": (
                created_branch_ids
            ),
            "migration_run_id": run.pk,
            "reconciliation": reconciliation,
        }

    def _mapping_snapshot(
        self,
        mapping: LegacyObjectMap | None,
    ) -> dict[str, Any] | None:
        if not mapping:
            return None

        return {
            "id": mapping.pk,
            "source_system": (
                mapping.source_system
            ),
            "source_table": (
                mapping.source_table
            ),
            "legacy_id": (
                mapping.legacy_id
            ),
            "target_content_type": (
                mapping.target_content_type_id
            ),
            "target_object_id": (
                mapping.target_object_id
            ),
            "company_id": (
                mapping.company_id
            ),
            "checksum": mapping.checksum,
        }

    def _write_report(
        self,
        *,
        report_path: Path,
        report: dict[str, Any],
    ) -> None:
        report_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temp = report_path.with_suffix(
            report_path.suffix + ".tmp"
        )

        with temp.open(
            "w",
            encoding="utf-8",
        ) as fh:
            json.dump(
                report,
                fh,
                ensure_ascii=False,
                indent=2,
                default=str,
            )

        temp.replace(report_path)

    def _print_summary(
        self,
        report: dict[str, Any],
    ) -> None:
        validation = report[
            "validation"
        ]
        normalized = report[
            "normalized"
        ]

        self.stdout.write(
            "=" * 72
        )
        self.stdout.write(
            "MHAMCLOUD V1 -> PRIMEYACC COMPANY MIGRATION"
        )
        self.stdout.write(
            "=" * 72
        )
        self.stdout.write(
            f"Mode: {report['mode']}"
        )
        self.stdout.write(
            "Legacy company ID: "
            f"{report['legacy_company_id']}"
        )
        self.stdout.write(
            "Company: "
            f"{normalized['company']['name']}"
        )
        self.stdout.write(
            "Branches: "
            f"{len(normalized['branches'])}"
        )
        self.stdout.write(
            "Checksum: "
            f"{report['checksum']}"
        )
        self.stdout.write(
            "Validation: "
            f"{'PASS' if validation['valid'] else 'FAIL'}"
        )

        for warning in validation[
            "warnings"
        ]:
            self.stdout.write(
                self.style.WARNING(
                    f"WARNING: {warning}"
                )
            )

        for error in validation[
            "errors"
        ]:
            self.stdout.write(
                self.style.ERROR(
                    f"ERROR: {error}"
                )
            )

        self.stdout.write(
            "=" * 72
        )

    def _checksum(
        self,
        value: Any,
    ) -> str:
        payload = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")

        return hashlib.sha256(
            payload
        ).hexdigest()

    def _text(
        self,
        value: Any,
    ) -> str:
        if value is None:
            return ""
        return str(value).strip()

    def _email(
        self,
        value: Any,
    ) -> str:
        value = self._text(value)
        if "@" not in value:
            return ""
        return value[:254]

    def _currency_code(
        self,
        business: dict[str, Any],
        currency: Any = None,
    ) -> str:
        code = ""

        if isinstance(currency, dict):
            code = self._text(
                currency.get("code")
                or currency.get("currency_code")
            ).upper()

        if not code:
            code = self._text(
                business.get("currency_code")
                or business.get("currency")
            ).upper()

        aliases = {
            "ر.س": "SAR",
            "ر س": "SAR",
            "ريال": "SAR",
            "ريال سعودي": "SAR",
            "SAUDI RIYAL": "SAR",
            "SAUDI ARABIAN RIYAL": "SAR",
            "SAR": "SAR",
        }

        if code in aliases:
            return aliases[code]

        if len(code) == 3 and code.isalpha():
            return code

        return "SAR"

    def _vat_percentage(
        self,
        business: dict[str, Any],
    ):
        from decimal import Decimal, InvalidOperation

        raw = (
            business.get("vat_percentage")
            or business.get("tax_percentage")
        )

        if raw in (None, ""):
            return Decimal("0.00")

        try:
            value = Decimal(str(raw))
        except (
            InvalidOperation,
            TypeError,
            ValueError,
        ):
            return Decimal("0.00")

        if value < 0 or value > 100:
            return Decimal("0.00")

        return value.quantize(
            Decimal("0.01")
        )

    def _legacy_branch_active(
        self,
        branch: dict[str, Any],
    ) -> bool:
        raw = branch.get("is_active")

        if raw is None:
            return True

        if isinstance(raw, bool):
            return raw

        return str(raw).strip().lower() not in {
            "0",
            "false",
            "no",
            "inactive",
            "closed",
        }
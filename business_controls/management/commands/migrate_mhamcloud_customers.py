from __future__ import annotations

import hashlib
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from business_controls.models import (
    LegacyObjectMap,
    MigrationRun,
)
from companies.models import Company
from parties.models import (
    BusinessParty,
    BusinessPartyKind,
    BusinessPartyStatus,
    BusinessPartyType,
)


SOURCE_SYSTEM = "mhamcloud_v1"
SOURCE_TABLE = "contacts"

MIGRATION_NAME = "customer_master_import"

APPLY_CONFIRMATION = "APPLY-MHAMCLOUD-CUSTOMERS"

CANONICAL_WALK_IN_CODE = "CO0001"

# "عميل نقدي"
CANONICAL_WALK_IN_NAME = (
    "\u0639\u0645\u064a\u0644 "
    "\u0646\u0642\u062f\u064a"
)


class Command(BaseCommand):
    help = (
        "Safely migrate MhamCloud V1 customer master records "
        "into PrimeyAcc BusinessParty. "
        "Default mode is read-only dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            required=True,
            help=(
                "Path to MhamCloud customer snapshot JSON."
            ),
        )

        parser.add_argument(
            "--legacy-company-id",
            required=True,
            help=(
                "Legacy MhamCloud business.id."
            ),
        )

        parser.add_argument(
            "--report",
            default="",
            help=(
                "Optional JSON migration report path."
            ),
        )

        parser.add_argument(
            "--apply",
            action="store_true",
            help=(
                "Actually create target records."
            ),
        )

        parser.add_argument(
            "--confirm",
            default="",
            help=(
                "Required with --apply. Must equal "
                f"{APPLY_CONFIRMATION}."
            ),
        )

    def handle(self, *args, **options):
        input_path = Path(
            options["input"]
        ).resolve()

        legacy_company_id = str(
            options["legacy_company_id"]
        ).strip()

        report_raw = str(
            options.get("report") or ""
        ).strip()

        apply_mode = bool(
            options["apply"]
        )

        confirmation = str(
            options.get("confirm") or ""
        ).strip()

        if not input_path.is_file():
            raise CommandError(
                f"Snapshot not found: {input_path}"
            )

        if not legacy_company_id:
            raise CommandError(
                "--legacy-company-id cannot be empty."
            )

        if (
            apply_mode
            and confirmation != APPLY_CONFIRMATION
        ):
            raise CommandError(
                "Apply blocked. Use both:\n"
                "  --apply\n"
                f"  --confirm {APPLY_CONFIRMATION}"
            )

        snapshot = self._load_snapshot(
            input_path
        )

        self._validate_snapshot_contract(
            snapshot=snapshot,
            legacy_company_id=(
                legacy_company_id
            ),
        )

        source_contacts = self._source_contacts(
            snapshot=snapshot,
            legacy_company_id=(
                legacy_company_id
            ),
        )

        normalized = self._normalize(
            contacts=source_contacts,
            legacy_company_id=(
                legacy_company_id
            ),
        )

        checksum = self._checksum(
            {
                "legacy_company_id": (
                    legacy_company_id
                ),
                "contacts": (
                    source_contacts
                ),
            }
        )

        company = Company.objects.filter(
            company_code=(
                f"LEGACY-{legacy_company_id}"
            )
        ).first()

        validation = self._validate(
            company=company,
            normalized=normalized,
        )

        report = {
            "source_system": SOURCE_SYSTEM,
            "migration_name": MIGRATION_NAME,
            "mode": (
                "APPLY"
                if apply_mode
                else "DRY_RUN"
            ),
            "input_file": str(
                input_path
            ),
            "legacy_company_id": (
                legacy_company_id
            ),
            "checksum": checksum,
            "source": {
                "contact_count": len(
                    source_contacts
                ),
                "legacy_ids": [
                    item["legacy_id"]
                    for item
                    in normalized[
                        "source_mappings"
                    ]
                ],
            },
            "normalized": normalized,
            "validation": validation,
            "result": {
                "status": "NOT_APPLIED",
                "party_id": None,
                "legacy_map_ids": [],
                "migration_run_id": None,
            },
        }

        report_path = (
            Path(report_raw).resolve()
            if report_raw
            else input_path.with_name(
                (
                    f"{input_path.stem}"
                    "_customer_migration_report.json"
                )
            )
        )

        self._write_report(
            path=report_path,
            report=report,
        )

        self._print_summary(
            report
        )

        self.stdout.write(
            f"Report: {report_path}"
        )

        if not validation["valid"]:
            raise CommandError(
                "Validation failed. "
                "Nothing was written."
            )

        if not apply_mode:
            self.stdout.write(
                self.style.SUCCESS(
                    "DRY-RUN COMPLETE - "
                    "NO DATABASE WRITES PERFORMED."
                )
            )
            return

        result = self._apply(
            company=company,
            legacy_company_id=(
                legacy_company_id
            ),
            checksum=checksum,
            normalized=normalized,
            input_path=input_path,
        )

        report["result"] = result

        self._write_report(
            path=report_path,
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

        except (
            OSError,
            json.JSONDecodeError,
        ) as exc:
            raise CommandError(
                "Unable to read customer "
                f"snapshot: {exc}"
            ) from exc

        if not isinstance(
            data,
            dict,
        ):
            raise CommandError(
                "Snapshot root must be "
                "a JSON object."
            )

        return data

    def _validate_snapshot_contract(
        self,
        *,
        snapshot: dict[str, Any],
        legacy_company_id: str,
    ) -> None:
        source_system = self._text(
            snapshot.get(
                "source_system"
            )
        )

        if source_system != SOURCE_SYSTEM:
            raise CommandError(
                "Unexpected source_system: "
                f"{source_system or '<empty>'}"
            )

        snapshot_company_id = self._text(
            snapshot.get(
                "legacy_company_id"
            )
        )

        if (
            snapshot_company_id
            != legacy_company_id
        ):
            raise CommandError(
                "Legacy company ID mismatch: "
                f"argument={legacy_company_id}, "
                f"snapshot="
                f"{snapshot_company_id}"
            )

        source_table = self._text(
            snapshot.get("table")
        )

        if source_table != SOURCE_TABLE:
            raise CommandError(
                "Unexpected source table: "
                f"{source_table or '<empty>'}"
            )

        status = self._text(
            snapshot.get("status")
        ).upper()

        if status != "COMPLETE":
            raise CommandError(
                "Snapshot is not COMPLETE."
            )

        security = (
            snapshot.get("security")
            or {}
        )

        if not isinstance(
            security,
            dict,
        ):
            raise CommandError(
                "Invalid snapshot security "
                "contract."
            )

        if (
            security.get(
                "database_writes"
            )
            is not False
        ):
            raise CommandError(
                "Snapshot security contract "
                "rejected: database_writes "
                "must be false."
            )

        samples = snapshot.get(
            "samples"
        )

        if not isinstance(
            samples,
            dict,
        ):
            raise CommandError(
                "'samples' must be an object."
            )

        customers = samples.get(
            "customers"
        )

        if not isinstance(
            customers,
            list,
        ):
            raise CommandError(
                "'samples.customers' "
                "must be an array."
            )

        summary = (
            snapshot.get("summary")
            or {}
        )

        if not isinstance(
            summary,
            dict,
        ):
            raise CommandError(
                "'summary' must be an object."
            )

        total_contacts = summary.get(
            "total_contacts"
        )

        try:
            total_contacts = int(
                total_contacts
            )
        except (
            TypeError,
            ValueError,
        ) as exc:
            raise CommandError(
                "summary.total_contacts "
                "must be numeric."
            ) from exc

        if (
            total_contacts
            != len(customers)
        ):
            raise CommandError(
                "Snapshot is incomplete for "
                "this migration: "
                "summary.total_contacts="
                f"{total_contacts}, "
                "samples.customers="
                f"{len(customers)}."
            )

        type_counts = (
            summary.get(
                "type_counts"
            )
            or []
        )

        if not isinstance(
            type_counts,
            list,
        ):
            raise CommandError(
                "summary.type_counts "
                "must be an array."
            )

        non_customer_count = 0
        customer_count = 0

        for row in type_counts:
            if not isinstance(
                row,
                dict,
            ):
                continue

            row_type = self._text(
                row.get("type")
            ).lower()

            try:
                row_count = int(
                    row.get("total")
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                row_count = 0

            if row_type == "customer":
                customer_count += (
                    row_count
                )
            else:
                non_customer_count += (
                    row_count
                )

        if non_customer_count:
            raise CommandError(
                "Snapshot contains "
                "non-customer contacts. "
                "This command only handles "
                "customer master records."
            )

        if (
            customer_count
            != len(customers)
        ):
            raise CommandError(
                "Customer count mismatch "
                "between summary and samples."
            )

    def _source_contacts(
        self,
        *,
        snapshot: dict[str, Any],
        legacy_company_id: str,
    ) -> list[dict[str, Any]]:
        customers = (
            snapshot[
                "samples"
            ]["customers"]
        )

        result: list[
            dict[str, Any]
        ] = []

        seen_ids: set[str] = set()

        for raw in customers:
            if not isinstance(
                raw,
                dict,
            ):
                raise CommandError(
                    "Customer snapshot contains "
                    "a non-object row."
                )

            legacy_id = self._text(
                raw.get("id")
            )

            if not legacy_id:
                raise CommandError(
                    "Customer row has "
                    "empty legacy id."
                )

            if legacy_id in seen_ids:
                raise CommandError(
                    "Duplicate legacy "
                    f"contact ID: {legacy_id}"
                )

            seen_ids.add(
                legacy_id
            )

            business_id = self._text(
                raw.get(
                    "business_id"
                )
            )

            if (
                business_id
                != legacy_company_id
            ):
                raise CommandError(
                    "Customer belongs to "
                    "unexpected business: "
                    f"contact={legacy_id}, "
                    f"business={business_id}"
                )

            source_type = self._text(
                raw.get("type")
            ).lower()

            if source_type != "customer":
                raise CommandError(
                    "Unsupported contact type: "
                    f"{source_type}"
                )

            if (
                raw.get("deleted_at")
                is not None
            ):
                raise CommandError(
                    "Soft-deleted customer "
                    "encountered. "
                    "Migration policy must "
                    "be reviewed first."
                )

            result.append(
                raw
            )

        result.sort(
            key=lambda row: (
                int(row.get("id"))
                if str(
                    row.get("id")
                ).isdigit()
                else str(
                    row.get("id")
                )
            )
        )

        return result

    def _normalize(
        self,
        *,
        contacts: list[
            dict[str, Any]
        ],
        legacy_company_id: str,
    ) -> dict[str, Any]:
        if not contacts:
            raise CommandError(
                "No customers found "
                "in snapshot."
            )

        walk_in_contacts = []

        other_contacts = []

        for raw in contacts:
            display_name = (
                self._display_name(raw)
            )

            if (
                self._normalize_name(
                    display_name
                )
                == self._normalize_name(
                    CANONICAL_WALK_IN_NAME
                )
            ):
                walk_in_contacts.append(
                    raw
                )
            else:
                other_contacts.append(
                    raw
                )

        if other_contacts:
            ids = [
                self._text(
                    row.get("id")
                )
                for row
                in other_contacts
            ]

            raise CommandError(
                "Snapshot contains regular "
                "customers in addition to "
                "the canonical walk-in "
                "customer. "
                "This pilot command is "
                "intentionally restricted "
                "to the verified company "
                "645 walk-in consolidation. "
                f"Other legacy IDs: {ids}"
            )

        if not walk_in_contacts:
            raise CommandError(
                "Canonical walk-in customer "
                "was not found."
            )

        source_mappings = []

        for raw in (
            walk_in_contacts
        ):
            legacy_id = self._text(
                raw.get("id")
            )

            legacy_code = self._text(
                raw.get("contact_id")
            )

            source_mappings.append(
                {
                    "legacy_id": (
                        legacy_id
                    ),
                    "legacy_code": (
                        legacy_code
                    ),
                    "legacy_name": (
                        self._display_name(
                            raw
                        )
                    ),
                    "legacy_status": (
                        self._text(
                            raw.get(
                                "contact_status"
                            )
                        )
                    ),
                    "legacy_is_default": (
                        self._bool(
                            raw.get(
                                "is_default"
                            )
                        )
                    ),
                    "legacy_created_at": (
                        raw.get(
                            "created_at"
                        )
                    ),
                    "legacy_updated_at": (
                        raw.get(
                            "updated_at"
                        )
                    ),
                    "source_checksum": (
                        self._checksum(
                            raw
                        )
                    ),
                }
            )

        canonical_source = (
            self._canonical_source(
                walk_in_contacts
            )
        )

        canonical_source_id = (
            self._text(
                canonical_source.get(
                    "id"
                )
            )
        )

        canonical_source_code = (
            self._text(
                canonical_source.get(
                    "contact_id"
                )
            )
        )

        party = {
            "company_code": (
                f"LEGACY-"
                f"{legacy_company_id}"
            ),
            "branch": None,
            "party_type": (
                BusinessPartyType.CUSTOMER
            ),
            "party_kind": (
                BusinessPartyKind.INDIVIDUAL
            ),
            "status": (
                BusinessPartyStatus.ACTIVE
            ),
            "code": (
                CANONICAL_WALK_IN_CODE
            ),
            "display_name": (
                CANONICAL_WALK_IN_NAME
            ),
            "legal_name": "",
            "contact_person": "",
            "phone": "",
            "mobile": "",
            "whatsapp_number": "",
            "email": "",
            "website": "",
            "commercial_registration": "",
            "vat_number": "",
            "national_id": "",
            "country": "Saudi Arabia",
            "city": "",
            "district": "",
            "street": "",
            "building_number": "",
            "additional_number": "",
            "postal_code": "",
            "short_address": "",
            "address_line": "",
            "credit_limit": "0.00",
            "opening_balance": "0.00",
            "opening_balance_date": None,
            "payment_terms_days": 0,
            "tax_exempt": False,
            "notes": "",
            "canonical_walk_in": True,
            "canonical_source_legacy_id": (
                canonical_source_id
            ),
            "canonical_source_legacy_code": (
                canonical_source_code
            ),
        }

        return {
            "party": party,
            "source_mappings": (
                source_mappings
            ),
            "reconciliation_contract": {
                "source_contacts": len(
                    source_mappings
                ),
                "target_parties": 1,
                "legacy_maps": len(
                    source_mappings
                ),
            },
        }

    def _canonical_source(
        self,
        contacts: list[
            dict[str, Any]
        ],
    ) -> dict[str, Any]:
        exact = [
            row
            for row in contacts
            if self._text(
                row.get("contact_id")
            ).upper()
            == CANONICAL_WALK_IN_CODE
        ]

        if len(exact) == 1:
            return exact[0]

        if len(exact) > 1:
            raise CommandError(
                "Multiple legacy contacts "
                "use canonical code "
                f"{CANONICAL_WALK_IN_CODE}."
            )

        default_rows = [
            row
            for row in contacts
            if self._bool(
                row.get("is_default")
            )
        ]

        if len(default_rows) == 1:
            return default_rows[0]

        raise CommandError(
            "Unable to determine canonical "
            "walk-in legacy contact. "
            "Expected exactly one CO0001 "
            "or one default contact."
        )

    def _validate(
        self,
        *,
        company: Company | None,
        normalized: dict[str, Any],
    ) -> dict[str, Any]:
        errors: list[str] = []
        warnings: list[str] = []

        mappings = normalized[
            "source_mappings"
        ]

        if company is None:
            errors.append(
                "Target migrated company "
                "does not exist."
            )

        if len(mappings) < 1:
            errors.append(
                "No source contacts "
                "were normalized."
            )

        legacy_ids = [
            item["legacy_id"]
            for item
            in mappings
        ]

        duplicate_ids = (
            len(legacy_ids)
            != len(set(legacy_ids))
        )

        if duplicate_ids:
            errors.append(
                "Duplicate normalized "
                "legacy IDs detected."
            )

        existing_maps = (
            LegacyObjectMap.objects
            .filter(
                source_system=(
                    SOURCE_SYSTEM
                ),
                source_table=(
                    SOURCE_TABLE
                ),
                legacy_id__in=(
                    legacy_ids
                ),
            )
        )

        for mapping in existing_maps:
            errors.append(
                "Legacy contact is already "
                "mapped: "
                f"{mapping.legacy_id}"
            )

        if (
            company is not None
            and BusinessParty.objects.filter(
                company=company,
                code=(
                    CANONICAL_WALK_IN_CODE
                ),
            ).exists()
        ):
            errors.append(
                "Target canonical walk-in "
                "customer already exists: "
                f"{CANONICAL_WALK_IN_CODE}"
            )

        for item in mappings:
            if (
                not item[
                    "legacy_code"
                ]
            ):
                warnings.append(
                    "Legacy contact has "
                    "no contact_id: "
                    f"{item['legacy_id']}"
                )

        return {
            "valid": not errors,
            "errors": errors,
            "warnings": warnings,
            "source_contact_count": len(
                mappings
            ),
            "target_party_count": 1,
            "expected_map_count": len(
                mappings
            ),
        }

    @transaction.atomic
    def _apply(
        self,
        *,
        company: Company,
        legacy_company_id: str,
        checksum: str,
        normalized: dict[str, Any],
        input_path: Path,
    ) -> dict[str, Any]:
        mappings = normalized[
            "source_mappings"
        ]

        legacy_ids = [
            item["legacy_id"]
            for item
            in mappings
        ]

        locked_maps = (
            LegacyObjectMap.objects
            .select_for_update()
            .filter(
                source_system=(
                    SOURCE_SYSTEM
                ),
                source_table=(
                    SOURCE_TABLE
                ),
                legacy_id__in=(
                    legacy_ids
                ),
            )
        )

        if locked_maps.exists():
            raise CommandError(
                "Apply blocked: one or "
                "more legacy contact "
                "mappings already exist."
            )

        if (
            BusinessParty.objects
            .select_for_update()
            .filter(
                company=company,
                code=(
                    CANONICAL_WALK_IN_CODE
                ),
            )
            .exists()
        ):
            raise CommandError(
                "Apply blocked: canonical "
                "walk-in customer already "
                "exists."
            )

        run = MigrationRun.objects.create(
            source_system=SOURCE_SYSTEM,
            migration_name=MIGRATION_NAME,
            status=(
                MigrationRun.Status.DRY_RUN
            ),
            company=company,
            source_count=len(
                mappings
            ),
            source_snapshot={
                "input_file": str(
                    input_path
                ),
                "checksum": checksum,
                "legacy_company_id": (
                    legacy_company_id
                ),
                "legacy_ids": (
                    legacy_ids
                ),
            },
            metadata={
                "scope": [
                    SOURCE_TABLE
                ],
                "apply_confirmation": (
                    APPLY_CONFIRMATION
                ),
                "policy": (
                    "collapse_walk_in_"
                    "customers_to_CO0001"
                ),
            },
        )

        party_data = normalized[
            "party"
        ]

        party = (
            BusinessParty.objects
            .create(
                company=company,
                branch=None,
                party_type=(
                    party_data[
                        "party_type"
                    ]
                ),
                party_kind=(
                    party_data[
                        "party_kind"
                    ]
                ),
                status=(
                    party_data[
                        "status"
                    ]
                ),
                code=(
                    party_data[
                        "code"
                    ]
                ),
                display_name=(
                    party_data[
                        "display_name"
                    ]
                ),
                legal_name="",
                contact_person="",
                phone="",
                mobile="",
                whatsapp_number="",
                email="",
                website="",
                commercial_registration="",
                vat_number="",
                national_id="",
                country="Saudi Arabia",
                city="",
                district="",
                street="",
                building_number="",
                additional_number="",
                postal_code="",
                short_address="",
                address_line="",
                credit_limit=Decimal(
                    "0.00"
                ),
                opening_balance=Decimal(
                    "0.00"
                ),
                opening_balance_date=None,
                payment_terms_days=0,
                tax_exempt=False,
                extra_data={
                    "migration": {
                        "source_system": (
                            SOURCE_SYSTEM
                        ),
                        "source_table": (
                            SOURCE_TABLE
                        ),
                        "legacy_company_id": (
                            legacy_company_id
                        ),
                        "canonical_walk_in": (
                            True
                        ),
                        "canonical_code": (
                            CANONICAL_WALK_IN_CODE
                        ),
                        "canonical_source_legacy_id": (
                            party_data[
                                "canonical_source_legacy_id"
                            ]
                        ),
                        "collapsed_legacy_ids": (
                            legacy_ids
                        ),
                        "collapsed_legacy_codes": [
                            item[
                                "legacy_code"
                            ]
                            for item
                            in mappings
                        ],
                    }
                },
                notes="",
            )
        )

        content_type = (
            ContentType.objects
            .get_for_model(
                BusinessParty
            )
        )

        created_map_ids: list[
            int
        ] = []

        for item in mappings:
            source_reference = (
                item[
                    "legacy_code"
                ]
                or item[
                    "legacy_id"
                ]
            )

            mapping = (
                LegacyObjectMap.objects
                .create(
                    run=run,
                    source_system=(
                        SOURCE_SYSTEM
                    ),
                    source_table=(
                        SOURCE_TABLE
                    ),
                    legacy_id=(
                        item[
                            "legacy_id"
                        ]
                    ),
                    legacy_company_id=(
                        legacy_company_id
                    ),
                    company=company,
                    target_content_type=(
                        content_type
                    ),
                    target_object_id=str(
                        party.pk
                    ),
                    checksum=(
                        item[
                            "source_checksum"
                        ]
                    ),
                    source_reference=(
                        source_reference
                    )[:255],
                    metadata={
                        "legacy_contact_code": (
                            item[
                                "legacy_code"
                            ]
                        ),
                        "legacy_name": (
                            item[
                                "legacy_name"
                            ]
                        ),
                        "legacy_status": (
                            item[
                                "legacy_status"
                            ]
                        ),
                        "legacy_is_default": (
                            item[
                                "legacy_is_default"
                            ]
                        ),
                        "canonical_party_code": (
                            CANONICAL_WALK_IN_CODE
                        ),
                        "canonical_party_id": (
                            party.pk
                        ),
                        "collapsed_as_walk_in_customer": (
                            True
                        ),
                        "legacy_created_at": (
                            item[
                                "legacy_created_at"
                            ]
                        ),
                        "legacy_updated_at": (
                            item[
                                "legacy_updated_at"
                            ]
                        ),
                    },
                )
            )

            created_map_ids.append(
                mapping.pk
            )

        mapped_count = (
            LegacyObjectMap.objects
            .filter(
                run=run
            )
            .count()
        )

        expected_maps = len(
            mappings
        )

        reconciliation = {
            "source_contacts": (
                expected_maps
            ),
            "business_parties_created": 1,
            "legacy_maps_created": (
                mapped_count
            ),
            "expected_legacy_maps": (
                expected_maps
            ),
            "mapping_difference": (
                expected_maps
                - mapped_count
            ),
            "canonical_party_code": (
                CANONICAL_WALK_IN_CODE
            ),
            "canonical_party_id": (
                party.pk
            ),
        }

        if (
            reconciliation[
                "mapping_difference"
            ]
            != 0
        ):
            raise CommandError(
                "Apply reconciliation failed."
            )

        run.processed_count = (
            expected_maps
        )

        run.created_count = 1

        run.updated_count = 0
        run.skipped_count = 0
        run.failed_count = 0

        run.reconciliation = (
            reconciliation
        )

        run.status = (
            MigrationRun.Status.APPLIED
        )

        run.completed_at = (
            timezone.now()
        )

        run.save(
            update_fields=[
                "processed_count",
                "created_count",
                "updated_count",
                "skipped_count",
                "failed_count",
                "reconciliation",
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        return {
            "status": "APPLIED",
            "party_id": party.pk,
            "party_code": party.code,
            "legacy_map_ids": (
                created_map_ids
            ),
            "migration_run_id": (
                run.pk
            ),
            "reconciliation": (
                reconciliation
            ),
        }

    def _display_name(
        self,
        row: dict[str, Any],
    ) -> str:
        business_name = self._text(
            row.get(
                "supplier_business_name"
            )
        )

        if business_name:
            return business_name

        direct_name = self._text(
            row.get("name")
        )

        if direct_name:
            return direct_name

        name_parts = [
            self._text(
                row.get(
                    "first_name"
                )
            ),
            self._text(
                row.get(
                    "middle_name"
                )
            ),
            self._text(
                row.get(
                    "last_name"
                )
            ),
        ]

        return " ".join(
            value
            for value in name_parts
            if value
        )

    def _normalize_name(
        self,
        value: Any,
    ) -> str:
        return " ".join(
            self._text(
                value
            ).split()
        ).casefold()

    def _decimal(
        self,
        value: Any,
        *,
        default: str = "0.00",
    ) -> Decimal:
        if value in (
            None,
            "",
        ):
            return Decimal(
                default
            )

        try:
            return Decimal(
                str(value)
            )
        except (
            InvalidOperation,
            TypeError,
            ValueError,
        ):
            return Decimal(
                default
            )

    def _bool(
        self,
        value: Any,
    ) -> bool:
        if isinstance(
            value,
            bool,
        ):
            return value

        return (
            self._text(
                value
            ).lower()
            in {
                "1",
                "true",
                "yes",
                "active",
            }
        )

    def _text(
        self,
        value: Any,
    ) -> str:
        if value is None:
            return ""

        return str(
            value
        ).strip()

    def _checksum(
        self,
        value: Any,
    ) -> str:
        payload = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(
                ",",
                ":",
            ),
            default=str,
        ).encode(
            "utf-8"
        )

        return hashlib.sha256(
            payload
        ).hexdigest()

    def _write_report(
        self,
        *,
        path: Path,
        report: dict[str, Any],
    ) -> None:
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temp = path.with_suffix(
            path.suffix + ".tmp"
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

        temp.replace(
            path
        )

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

        party = normalized[
            "party"
        ]

        self.stdout.write(
            "=" * 72
        )

        self.stdout.write(
            "MHAMCLOUD V1 -> "
            "PRIMEYACC CUSTOMER "
            "MASTER MIGRATION"
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
            "Source contacts: "
            f"{validation['source_contact_count']}"
        )

        self.stdout.write(
            "Target parties: "
            f"{validation['target_party_count']}"
        )

        self.stdout.write(
            "Expected legacy maps: "
            f"{validation['expected_map_count']}"
        )

        self.stdout.write(
            "Canonical customer: "
            f"{party['code']} | "
            f"{party['display_name']}"
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
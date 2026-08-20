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

from business_controls.models import LegacyObjectMap, MigrationRun
from catalog.models import (
    CatalogItem,
    CatalogItemStatus,
    CatalogItemTrackingMethod,
    CatalogItemType,
)
from companies.models import Company


SOURCE_SYSTEM = "mhamcloud_v1"
MIGRATION_NAME = "product_master_import"
PRODUCT_TABLE = "products"
VARIATION_TABLE = "variations"

APPLY_CONFIRMATION = "APPLY-MHAMCLOUD-PRODUCTS"


class Command(BaseCommand):
    help = (
        "Migrate verified MhamCloud V1 products and their "
        "single legacy variations into CatalogItem. "
        "Default mode is read-only dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            required=True,
        )

        parser.add_argument(
            "--legacy-company-id",
            required=True,
        )

        parser.add_argument(
            "--report",
            default="",
        )

        parser.add_argument(
            "--apply",
            action="store_true",
        )

        parser.add_argument(
            "--confirm",
            default="",
        )

    def handle(self, *args, **options):
        input_path = Path(
            options["input"]
        ).resolve()

        company_id = str(
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

        if (
            apply_mode
            and confirmation != APPLY_CONFIRMATION
        ):
            raise CommandError(
                "Apply blocked. Use both:\n"
                "  --apply\n"
                f"  --confirm {APPLY_CONFIRMATION}"
            )

        snapshot = self._load(
            input_path
        )

        self._validate_snapshot(
            snapshot=snapshot,
            company_id=company_id,
        )

        normalized = self._normalize(
            snapshot=snapshot,
            company_id=company_id,
        )

        checksum = self._checksum(
            {
                "products": snapshot.get(
                    "products",
                    [],
                ),
                "variations": snapshot.get(
                    "variations",
                    [],
                ),
                "legacy_company_id": company_id,
            }
        )

        company = Company.objects.filter(
            company_code=f"LEGACY-{company_id}"
        ).first()

        validation = self._validate_target(
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
            "legacy_company_id": company_id,
            "checksum": checksum,
            "normalized": normalized,
            "validation": validation,
            "result": {
                "status": "NOT_APPLIED",
                "catalog_item_ids": [],
                "product_map_ids": [],
                "variation_map_ids": [],
                "migration_run_id": None,
            },
        }

        report_path = (
            Path(report_raw).resolve()
            if report_raw
            else input_path.with_name(
                input_path.stem
                + "_product_migration_report.json"
            )
        )

        self._write_report(
            report_path,
            report,
        )

        self._print_summary(
            report
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
                    "DRY-RUN COMPLETE - "
                    "NO DATABASE WRITES PERFORMED."
                )
            )
            return

        result = self._apply(
            company=company,
            company_id=company_id,
            checksum=checksum,
            normalized=normalized,
            input_path=input_path,
        )

        report["result"] = result

        self._write_report(
            report_path,
            report,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "APPLY COMPLETE."
            )
        )

    def _load(
        self,
        path: Path,
    ) -> dict[str, Any]:
        try:
            return json.loads(
                path.read_text(
                    encoding="utf-8-sig"
                )
            )
        except Exception as exc:
            raise CommandError(
                f"Unable to load snapshot: {exc}"
            ) from exc

    def _validate_snapshot(
        self,
        *,
        snapshot: dict[str, Any],
        company_id: str,
    ) -> None:
        if (
            str(
                snapshot.get(
                    "source_system"
                )
            )
            != SOURCE_SYSTEM
        ):
            raise CommandError(
                "Unexpected source_system."
            )

        if (
            str(
                snapshot.get(
                    "legacy_company_id"
                )
            )
            != company_id
        ):
            raise CommandError(
                "Legacy company ID mismatch."
            )

        products = snapshot.get(
            "products"
        )

        variations = snapshot.get(
            "variations"
        )

        if not isinstance(
            products,
            list,
        ):
            raise CommandError(
                "products must be an array."
            )

        if not isinstance(
            variations,
            list,
        ):
            raise CommandError(
                "variations must be an array."
            )

        counts = (
            snapshot.get("counts")
            or {}
        )

        if int(
            counts.get("products")
            or 0
        ) != len(products):
            raise CommandError(
                "Product count mismatch."
            )

        if int(
            counts.get("variations")
            or 0
        ) != len(variations):
            raise CommandError(
                "Variation count mismatch."
            )

    def _normalize(
        self,
        *,
        snapshot: dict[str, Any],
        company_id: str,
    ) -> list[dict[str, Any]]:
        products = snapshot["products"]
        variations = snapshot["variations"]

        by_product: dict[
            str,
            list[dict[str, Any]]
        ] = {}

        for variation in variations:
            product_id = self._text(
                variation.get(
                    "product_id"
                )
            )

            by_product.setdefault(
                product_id,
                [],
            ).append(
                variation
            )

        normalized = []

        for product in products:
            legacy_product_id = self._text(
                product.get("id")
            )

            if (
                self._text(
                    product.get(
                        "business_id"
                    )
                )
                != company_id
            ):
                raise CommandError(
                    "Product belongs to "
                    "unexpected company: "
                    f"{legacy_product_id}"
                )

            linked = by_product.get(
                legacy_product_id,
                [],
            )

            if len(linked) != 1:
                raise CommandError(
                    "Pilot migration requires "
                    "exactly one variation per product: "
                    f"product={legacy_product_id}, "
                    f"variations={len(linked)}"
                )

            variation = linked[0]

            if self._bool(
                product.get(
                    "enable_stock"
                )
            ):
                raise CommandError(
                    "Stock-enabled product found. "
                    "Inventory reconstruction must "
                    "be handled separately: "
                    f"{legacy_product_id}"
                )

            if self._bool(
                product.get(
                    "is_inactive"
                )
            ):
                status = (
                    CatalogItemStatus.INACTIVE
                )
            else:
                status = (
                    CatalogItemStatus.ACTIVE
                )

            name = self._text(
                product.get("name")
            )

            sku = self._text(
                product.get("sku")
            )

            if not name:
                raise CommandError(
                    "Product name is empty: "
                    f"{legacy_product_id}"
                )

            if not sku:
                sku = (
                    f"LEGACY-PROD-"
                    f"{legacy_product_id}"
                )

            tax_type = self._text(
                product.get("tax_type")
            ).lower()

            taxable = bool(
                product.get("tax")
            )

            tax_rate = (
                Decimal("15.00")
                if taxable
                else Decimal("0.00")
            )

            sale_price = self._decimal(
                variation.get(
                    "default_sell_price"
                )
            )

            purchase_price = self._decimal(
                variation.get(
                    "default_purchase_price"
                )
            )

            gross_sale_price = self._decimal(
                variation.get(
                    "sell_price_inc_tax"
                )
            )

            gross_purchase_price = self._decimal(
                variation.get(
                    "dpp_inc_tax"
                )
            )

            normalized.append(
                {
                    "legacy_product_id": (
                        legacy_product_id
                    ),
                    "legacy_variation_id": (
                        self._text(
                            variation.get(
                                "id"
                            )
                        )
                    ),
                    "item": {
                        "code": sku,
                        "sku": sku,
                        "name": name,
                        "name_ar": name,
                        "name_en": "",
                        "item_type": (
                            CatalogItemType.PRODUCT
                        ),
                        "status": status,
                        "sale_price": str(
                            sale_price
                        ),
                        "purchase_price": str(
                            purchase_price
                        ),
                        "cost_price": str(
                            purchase_price
                        ),
                        "is_sellable": True,
                        "is_purchasable": True,
                        "track_inventory": False,
                        "inventory_tracking_method": (
                            CatalogItemTrackingMethod.NONE
                        ),
                        "track_expiry_dates": False,
                        "taxable": taxable,
                        "tax_rate": str(
                            tax_rate
                        ),
                    },
                    "legacy": {
                        "product": product,
                        "variation": variation,
                        "tax_type": tax_type,
                        "gross_sale_price": str(
                            gross_sale_price
                        ),
                        "gross_purchase_price": str(
                            gross_purchase_price
                        ),
                    },
                    "product_checksum": (
                        self._checksum(
                            product
                        )
                    ),
                    "variation_checksum": (
                        self._checksum(
                            variation
                        )
                    ),
                }
            )

        normalized.sort(
            key=lambda row: (
                int(
                    row[
                        "legacy_product_id"
                    ]
                )
                if row[
                    "legacy_product_id"
                ].isdigit()
                else row[
                    "legacy_product_id"
                ]
            )
        )

        return normalized

    def _validate_target(
        self,
        *,
        company,
        normalized,
    ) -> dict[str, Any]:
        errors = []
        warnings = []

        if company is None:
            errors.append(
                "Target company does not exist."
            )

        product_ids = [
            row["legacy_product_id"]
            for row in normalized
        ]

        variation_ids = [
            row["legacy_variation_id"]
            for row in normalized
        ]

        if LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table=PRODUCT_TABLE,
            legacy_id__in=product_ids,
        ).exists():
            errors.append(
                "One or more legacy products "
                "are already mapped."
            )

        if LegacyObjectMap.objects.filter(
            source_system=SOURCE_SYSTEM,
            source_table=VARIATION_TABLE,
            legacy_id__in=variation_ids,
        ).exists():
            errors.append(
                "One or more legacy variations "
                "are already mapped."
            )

        if company is not None:
            for row in normalized:
                item = row["item"]

                if CatalogItem.objects.filter(
                    company=company,
                    code=item["code"],
                ).exists():
                    errors.append(
                        "Target CatalogItem code "
                        "already exists: "
                        f"{item['code']}"
                    )

                if CatalogItem.objects.filter(
                    company=company,
                    sku=item["sku"],
                ).exists():
                    errors.append(
                        "Target CatalogItem SKU "
                        "already exists: "
                        f"{item['sku']}"
                    )

                if CatalogItem.objects.filter(
                    company=company,
                    name=item["name"],
                ).exists():
                    errors.append(
                        "Target CatalogItem name "
                        "already exists: "
                        f"{item['name']}"
                    )

        return {
            "valid": not errors,
            "errors": errors,
            "warnings": warnings,
            "source_products": len(
                normalized
            ),
            "source_variations": len(
                normalized
            ),
            "target_items": len(
                normalized
            ),
            "expected_maps": (
                len(normalized) * 2
            ),
        }

    @transaction.atomic
    def _apply(
        self,
        *,
        company,
        company_id,
        checksum,
        normalized,
        input_path,
    ):
        product_ids = [
            row["legacy_product_id"]
            for row in normalized
        ]

        variation_ids = [
            row["legacy_variation_id"]
            for row in normalized
        ]

        if LegacyObjectMap.objects.select_for_update().filter(
            source_system=SOURCE_SYSTEM,
            source_table=PRODUCT_TABLE,
            legacy_id__in=product_ids,
        ).exists():
            raise CommandError(
                "Apply blocked: product map exists."
            )

        if LegacyObjectMap.objects.select_for_update().filter(
            source_system=SOURCE_SYSTEM,
            source_table=VARIATION_TABLE,
            legacy_id__in=variation_ids,
        ).exists():
            raise CommandError(
                "Apply blocked: variation map exists."
            )

        run = MigrationRun.objects.create(
            source_system=SOURCE_SYSTEM,
            migration_name=MIGRATION_NAME,
            status=MigrationRun.Status.DRY_RUN,
            company=company,
            source_count=len(
                normalized
            ),
            source_snapshot={
                "input_file": str(
                    input_path
                ),
                "checksum": checksum,
                "legacy_company_id": (
                    company_id
                ),
                "product_ids": product_ids,
                "variation_ids": (
                    variation_ids
                ),
            },
            metadata={
                "scope": [
                    PRODUCT_TABLE,
                    VARIATION_TABLE,
                ],
                "policy": (
                    "one_product_and_single_"
                    "variation_to_catalog_item"
                ),
                "stock_policy": (
                    "stock_enabled_products_blocked"
                ),
            },
        )

        content_type = (
            ContentType.objects
            .get_for_model(
                CatalogItem
            )
        )

        item_ids = []
        product_map_ids = []
        variation_map_ids = []

        for row in normalized:
            data = row["item"]

            item = CatalogItem.objects.create(
                company=company,
                category=None,
                unit=None,
                item_type=data["item_type"],
                status=data["status"],
                code=data["code"],
                sku=data["sku"],
                barcode="",
                name=data["name"],
                name_ar=data["name_ar"],
                name_en=data["name_en"],
                description="",
                sale_price=Decimal(
                    data["sale_price"]
                ),
                purchase_price=Decimal(
                    data["purchase_price"]
                ),
                cost_price=Decimal(
                    data["cost_price"]
                ),
                is_sellable=True,
                is_purchasable=True,
                track_inventory=False,
                inventory_tracking_method=(
                    CatalogItemTrackingMethod.NONE
                ),
                track_expiry_dates=False,
                taxable=data["taxable"],
                tax_rate=Decimal(
                    data["tax_rate"]
                ),
                sort_order=0,
                notes="",
                extra_data={
                    "migration": {
                        "source_system": (
                            SOURCE_SYSTEM
                        ),
                        "legacy_product_id": (
                            row[
                                "legacy_product_id"
                            ]
                        ),
                        "legacy_variation_id": (
                            row[
                                "legacy_variation_id"
                            ]
                        ),
                        "legacy_tax_type": (
                            row[
                                "legacy"
                            ]["tax_type"]
                        ),
                        "legacy_gross_sale_price": (
                            row[
                                "legacy"
                            ][
                                "gross_sale_price"
                            ]
                        ),
                        "legacy_gross_purchase_price": (
                            row[
                                "legacy"
                            ][
                                "gross_purchase_price"
                            ]
                        ),
                    }
                },
            )

            item_ids.append(
                item.pk
            )

            product_map = LegacyObjectMap.objects.create(
                run=run,
                source_system=SOURCE_SYSTEM,
                source_table=PRODUCT_TABLE,
                legacy_id=row[
                    "legacy_product_id"
                ],
                legacy_company_id=company_id,
                company=company,
                target_content_type=content_type,
                target_object_id=str(
                    item.pk
                ),
                checksum=row[
                    "product_checksum"
                ],
                source_reference=data[
                    "sku"
                ][:255],
                metadata={
                    "target_catalog_item_id": (
                        item.pk
                    ),
                    "target_code": item.code,
                    "target_sku": item.sku,
                },
            )

            product_map_ids.append(
                product_map.pk
            )

            variation_map = LegacyObjectMap.objects.create(
                run=run,
                source_system=SOURCE_SYSTEM,
                source_table=VARIATION_TABLE,
                legacy_id=row[
                    "legacy_variation_id"
                ],
                legacy_company_id=company_id,
                company=company,
                target_content_type=content_type,
                target_object_id=str(
                    item.pk
                ),
                checksum=row[
                    "variation_checksum"
                ],
                source_reference=row[
                    "legacy_variation_id"
                ][:255],
                metadata={
                    "collapsed_into_catalog_item": True,
                    "legacy_product_id": row[
                        "legacy_product_id"
                    ],
                    "target_catalog_item_id": (
                        item.pk
                    ),
                },
            )

            variation_map_ids.append(
                variation_map.pk
            )

        expected_maps = (
            len(normalized) * 2
        )

        actual_maps = LegacyObjectMap.objects.filter(
            run=run
        ).count()

        if actual_maps != expected_maps:
            raise CommandError(
                "Product migration reconciliation failed."
            )

        run.processed_count = len(
            normalized
        )

        run.created_count = len(
            normalized
        )

        run.updated_count = 0
        run.skipped_count = 0
        run.failed_count = 0

        run.reconciliation = {
            "source_products": len(
                normalized
            ),
            "source_variations": len(
                normalized
            ),
            "catalog_items_created": len(
                item_ids
            ),
            "legacy_maps_created": (
                actual_maps
            ),
            "expected_legacy_maps": (
                expected_maps
            ),
        }

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
            "catalog_item_ids": item_ids,
            "product_map_ids": product_map_ids,
            "variation_map_ids": variation_map_ids,
            "migration_run_id": run.pk,
        }

    def _decimal(
        self,
        value,
    ) -> Decimal:
        if value in (
            None,
            "",
        ):
            return Decimal(
                "0.00"
            )

        try:
            return Decimal(
                str(value)
            )
        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ) as exc:
            raise CommandError(
                f"Invalid decimal value: {value}"
            ) from exc

    def _bool(
        self,
        value,
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
            }
        )

    def _text(
        self,
        value,
    ) -> str:
        if value is None:
            return ""

        return str(
            value
        ).strip()

    def _checksum(
        self,
        value,
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

    def _write_report(
        self,
        path,
        report,
    ):
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temp = path.with_suffix(
            path.suffix + ".tmp"
        )

        temp.write_text(
            json.dumps(
                report,
                ensure_ascii=False,
                indent=2,
                default=str,
            )
            + "\n",
            encoding="utf-8",
        )

        temp.replace(
            path
        )

    def _print_summary(
        self,
        report,
    ):
        validation = report[
            "validation"
        ]

        self.stdout.write(
            "=" * 72
        )

        self.stdout.write(
            "MHAMCLOUD V1 -> "
            "PRIMEYACC PRODUCT MASTER MIGRATION"
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
            "Source products: "
            f"{validation['source_products']}"
        )

        self.stdout.write(
            "Source variations: "
            f"{validation['source_variations']}"
        )

        self.stdout.write(
            "Target CatalogItems: "
            f"{validation['target_items']}"
        )

        self.stdout.write(
            "Expected Legacy Maps: "
            f"{validation['expected_maps']}"
        )

        self.stdout.write(
            "Validation: "
            + (
                "PASS"
                if validation["valid"]
                else "FAIL"
            )
        )

        for warning in validation[
            "warnings"
        ]:
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: "
                    + warning
                )
            )

        for error in validation[
            "errors"
        ]:
            self.stdout.write(
                self.style.ERROR(
                    "ERROR: "
                    + error
                )
            )

        self.stdout.write(
            "=" * 72
        )
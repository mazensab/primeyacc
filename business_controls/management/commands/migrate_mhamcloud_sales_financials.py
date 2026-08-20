from __future__ import annotations

import hashlib
import json
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction
from django.utils import timezone

from business_controls.models import LegacyObjectMap, MigrationRun
from catalog.models import CatalogItem
from companies.models import Branch, Company
from parties.models import BusinessParty
from sales.models import (
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoicePaymentStatus,
    SalesInvoiceSource,
    SalesInvoiceStatus,
)
from sales.services import (
    create_sales_invoice,
    create_sales_invoice_item,
    issue_sales_invoice,
)
from treasury.models import (
    CustomerPayment,
    PaymentCounterpartyType,
    PaymentMethod,
    PaymentStatus,
    TreasuryAccount,
)
from treasury.services import (
    create_customer_payment,
    create_treasury_account,
)


SOURCE_SYSTEM = "mhamcloud_v1"
MIGRATION_NAME = "sales_financial_import"

LEGACY_ALIAS = "legacy"

SOURCE_COMPANY_TABLE = "business"
SOURCE_BRANCH_TABLE = "business_locations"
SOURCE_CONTACT_TABLE = "contacts"
SOURCE_PRODUCT_TABLE = "products"
SOURCE_VARIATION_TABLE = "variations"
SOURCE_ACCOUNT_TABLE = "accounts"
SOURCE_TRANSACTION_TABLE = "transactions"
SOURCE_LINE_TABLE = "transaction_sell_lines"
SOURCE_PAYMENT_TABLE = "transaction_payments"

APPLY_CONFIRMATION = "APPLY-MHAMCLOUD-SALES-FINANCIALS"

EXPECTED_COMPANY_ID = "645"
EXPECTED_BRANCH_ID = "824"
EXPECTED_CUSTOMER_ID = "129112"
EXPECTED_ACCOUNT_ID = "1450"

ZERO_TRANSACTION_ID = "3474014"
ZERO_LINE_ID = "5165781"
ZERO_PAYMENT_IDS = {"3449166", "3451165"}

EXPECTED_POSITIVE_TRANSACTION_IDS = {
    "3477597",
    "3478155",
    "3478189",
    "3480161",
    "3480650",
}

EXPECTED_LINE_IDS = {
    "5171316",
    "5172159",
    "5172204",
    "5175254",
    "5176022",
}

EXPECTED_PAYMENT_IDS = {
    "3452763",
    "3453326",
    "3453360",
    "3455326",
    "3455800",
}

EXPECTED_VARIATION_IDS = {
    "1374335",
    "1374336",
    "1374337",
}

EXPECTED_POSITIVE_TOTAL = Decimal("2200.00")
EXPECTED_PAYMENT_TOTAL = Decimal("2200.00")

MONEY = Decimal("0.01")
VAT_RATE = Decimal("15.00")


def money(value: Any) -> Decimal:
    return Decimal(str(value or "0")).quantize(
        MONEY,
        rounding=ROUND_HALF_UP,
    )


def text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


class Command(BaseCommand):
    help = (
        "Safely migrate verified MhamCloud V1 sales invoices, "
        "payments and legacy cash account into PrimeyAcc. "
        "Default mode is read-only dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--legacy-company-id",
            required=True,
            help="Legacy MhamCloud business.id.",
        )
        parser.add_argument(
            "--report",
            default="",
            help="Optional JSON migration report path.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually migrate the verified financial batch.",
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
        legacy_company_id = text(
            options["legacy_company_id"]
        )
        report_raw = text(
            options.get("report")
        )
        apply_mode = bool(
            options.get("apply")
        )
        confirmation = text(
            options.get("confirm")
        )

        if legacy_company_id != EXPECTED_COMPANY_ID:
            raise CommandError(
                "This verified Batch 10 command is intentionally "
                f"restricted to legacy company {EXPECTED_COMPANY_ID}."
            )

        if apply_mode and confirmation != APPLY_CONFIRMATION:
            raise CommandError(
                "Apply blocked. Use both:\n"
                "  --apply\n"
                f"  --confirm {APPLY_CONFIRMATION}"
            )

        self._ensure_legacy_connection()

        source = self._read_source(
            legacy_company_id=legacy_company_id
        )

        checksum = self._checksum(source)

        target = self._resolve_target(
            legacy_company_id=legacy_company_id
        )

        validation = self._validate(
            source=source,
            target=target,
            legacy_company_id=legacy_company_id,
        )

        report = {
            "source_system": SOURCE_SYSTEM,
            "migration_name": MIGRATION_NAME,
            "mode": (
                "APPLY"
                if apply_mode
                else "DRY_RUN"
            ),
            "legacy_company_id": legacy_company_id,
            "checksum": checksum,
            "source": self._json_safe(source),
            "target": {
                "company_id": (
                    target["company"].pk
                    if target.get("company")
                    else None
                ),
                "branch_id": (
                    target["branch"].pk
                    if target.get("branch")
                    else None
                ),
                "customer_id": (
                    target["customer"].pk
                    if target.get("customer")
                    else None
                ),
                "variation_targets": {
                    key: value.pk
                    for key, value
                    in target.get(
                        "variation_targets",
                        {}
                    ).items()
                },
            },
            "validation": validation,
            "result": {
                "status": "NOT_APPLIED",
                "migration_run_id": None,
                "treasury_account_id": None,
                "invoice_ids": [],
                "invoice_item_ids": [],
                "customer_payment_ids": [],
                "legacy_map_ids": [],
                "reconciliation": {},
            },
        }

        report_path = (
            Path(report_raw).resolve()
            if report_raw
            else Path(
                "_audit/migration_snapshots/"
                "mhamcloud_company_645_"
                "sales_financials_report.json"
            ).resolve()
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
            source=source,
            target=target,
            legacy_company_id=legacy_company_id,
            checksum=checksum,
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

    # ============================================================
    # Legacy source
    # ============================================================

    def _ensure_legacy_connection(self) -> None:
        """
        Configure the local read-only migration source connection at runtime.

        The project's normal ``default`` database remains PostgreSQL.
        This command adds a second Django database alias named ``legacy``
        that points only to the local MhamCloud V1 MariaDB database.

        No project settings file is modified by this runtime configuration.
        """

        default_connection = connections["default"]

        if default_connection.vendor != "postgresql":
            raise CommandError(
                "Safety stop: Django default database must remain "
                f"PostgreSQL, found '{default_connection.vendor}'."
            )

        if LEGACY_ALIAS not in connections.databases:
            connections.databases[LEGACY_ALIAS] = {
                "ENGINE": "django.db.backends.mysql",
                "NAME": "mhamcloud_legacy",
                "USER": "root",
                "PASSWORD": "root",
                "HOST": "127.0.0.1",
                "PORT": "3306",
                "OPTIONS": {
                    "charset": "utf8mb4",
                },
                "CONN_MAX_AGE": 0,
                "CONN_HEALTH_CHECKS": False,
                "AUTOCOMMIT": True,
                "ATOMIC_REQUESTS": False,
                "TIME_ZONE": None,
                "TEST": {
                    "CHARSET": None,
                    "COLLATION": None,
                    "MIGRATE": True,
                    "MIRROR": None,
                    "NAME": None,
                },
            }

        legacy_connection = connections[LEGACY_ALIAS]

        try:
            with legacy_connection.cursor() as cursor:
                cursor.execute(
                    "SELECT DATABASE(), @@version"
                )
                database_name, server_version = cursor.fetchone()

        except Exception as exc:
            raise CommandError(
                "Unable to connect to local legacy MariaDB database "
                "'mhamcloud_legacy'."
            ) from exc

        if str(database_name) != "mhamcloud_legacy":
            raise CommandError(
                "Safety stop: unexpected legacy database name: "
                f"{database_name!r}."
            )

        self.stdout.write(
            "DATABASE_DEFAULT_VENDOR=postgresql"
        )
        self.stdout.write(
            "LEGACY_DATABASE=mhamcloud_legacy"
        )
        self.stdout.write(
            "LEGACY_VENDOR=mysql"
        )
        self.stdout.write(
            "LEGACY_CONNECTION=PASS"
        )

    def _fetchall(
        self,
        sql: str,
        params: list[Any] | tuple[Any, ...],
    ) -> list[dict[str, Any]]:
        connection = connections[LEGACY_ALIAS]

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [
                column[0]
                for column in cursor.description
            ]
            return [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]

    def _read_source(
        self,
        *,
        legacy_company_id: str,
    ) -> dict[str, Any]:
        transactions = self._fetchall(
            """
            SELECT
                id,
                invoice_no,
                transaction_date,
                status,
                payment_status,
                contact_id,
                location_id,
                total_before_tax,
                tax_amount,
                final_total,
                created_by,
                created_at,
                updated_at
            FROM transactions
            WHERE business_id = %s
              AND type = 'sell'
            ORDER BY id
            """,
            [legacy_company_id],
        )

        transaction_ids = [
            row["id"]
            for row in transactions
        ]

        if not transaction_ids:
            raise CommandError(
                "No legacy sales transactions found."
            )

        placeholders = ",".join(
            ["%s"] * len(transaction_ids)
        )

        lines = self._fetchall(
            f"""
            SELECT
                id,
                transaction_id,
                product_id,
                variation_id,
                quantity,
                quantity_returned,
                unit_price_before_discount,
                unit_price,
                line_discount_type,
                line_discount_amount,
                unit_price_inc_tax,
                item_tax,
                tax_id,
                sell_line_note,
                created_at,
                updated_at
            FROM transaction_sell_lines
            WHERE transaction_id IN ({placeholders})
            ORDER BY transaction_id, id
            """,
            transaction_ids,
        )

        payments = self._fetchall(
            f"""
            SELECT
                id,
                transaction_id,
                amount,
                method,
                is_return,
                payment_for,
                payment_ref_no,
                account_id,
                paid_on,
                created_by,
                note,
                created_at,
                updated_at
            FROM transaction_payments
            WHERE transaction_id IN ({placeholders})
            ORDER BY transaction_id, id
            """,
            transaction_ids,
        )

        accounts = self._fetchall(
            """
            SELECT
                id,
                business_id,
                name,
                account_number,
                account_type_id,
                is_closed,
                created_at,
                updated_at
            FROM accounts
            WHERE id = %s
              AND business_id = %s
            """,
            [
                EXPECTED_ACCOUNT_ID,
                legacy_company_id,
            ],
        )

        return {
            "transactions": transactions,
            "lines": lines,
            "payments": payments,
            "accounts": accounts,
        }

    # ============================================================
    # Target mappings
    # ============================================================

    def _get_map(
        self,
        *,
        source_table: str,
        legacy_id: str,
    ) -> LegacyObjectMap | None:
        return (
            LegacyObjectMap.objects
            .select_related(
                "target_content_type",
                "company",
            )
            .filter(
                source_system=SOURCE_SYSTEM,
                source_table=source_table,
                legacy_id=str(legacy_id),
            )
            .first()
        )

    def _mapped_object(
        self,
        *,
        source_table: str,
        legacy_id: str,
        model,
    ):
        mapping = self._get_map(
            source_table=source_table,
            legacy_id=legacy_id,
        )

        if not mapping:
            return None

        if not mapping.target_object_id:
            return None

        try:
            return model.objects.get(
                pk=int(
                    mapping.target_object_id
                )
            )
        except (
            model.DoesNotExist,
            TypeError,
            ValueError,
        ):
            return None

    def _resolve_target(
        self,
        *,
        legacy_company_id: str,
    ) -> dict[str, Any]:
        company = self._mapped_object(
            source_table=SOURCE_COMPANY_TABLE,
            legacy_id=legacy_company_id,
            model=Company,
        )

        branch = self._mapped_object(
            source_table=SOURCE_BRANCH_TABLE,
            legacy_id=EXPECTED_BRANCH_ID,
            model=Branch,
        )

        customer = self._mapped_object(
            source_table=SOURCE_CONTACT_TABLE,
            legacy_id=EXPECTED_CUSTOMER_ID,
            model=BusinessParty,
        )

        variation_targets = {}

        for variation_id in (
            EXPECTED_VARIATION_IDS
        ):
            item = self._mapped_object(
                source_table=SOURCE_VARIATION_TABLE,
                legacy_id=variation_id,
                model=CatalogItem,
            )

            if item:
                variation_targets[
                    variation_id
                ] = item

        return {
            "company": company,
            "branch": branch,
            "customer": customer,
            "variation_targets": variation_targets,
        }

    # ============================================================
    # Validation
    # ============================================================

    def _validate(
        self,
        *,
        source: dict[str, Any],
        target: dict[str, Any],
        legacy_company_id: str,
    ) -> dict[str, Any]:
        errors: list[str] = []
        warnings: list[str] = []

        company = target.get("company")
        branch = target.get("branch")
        customer = target.get("customer")
        variation_targets = target.get(
            "variation_targets",
            {},
        )

        if not company:
            errors.append(
                "Mapped target company was not found."
            )

        if not branch:
            errors.append(
                "Mapped legacy branch 824 was not found."
            )

        if not customer:
            errors.append(
                "Mapped legacy customer 129112 was not found."
            )

        if company and branch:
            if branch.company_id != company.id:
                errors.append(
                    "Mapped branch belongs to another company."
                )

        if company and customer:
            if customer.company_id != company.id:
                errors.append(
                    "Mapped customer belongs to another company."
                )

        if (
            set(variation_targets.keys())
            != EXPECTED_VARIATION_IDS
        ):
            errors.append(
                "One or more expected variation mappings "
                "are missing."
            )

        if company:
            for item in variation_targets.values():
                if item.company_id != company.id:
                    errors.append(
                        "Mapped catalog item belongs to "
                        "another company."
                    )

        transactions = source["transactions"]
        lines = source["lines"]
        payments = source["payments"]
        accounts = source["accounts"]

        transaction_ids = {
            text(row["id"])
            for row in transactions
        }

        expected_all_transactions = (
            EXPECTED_POSITIVE_TRANSACTION_IDS
            | {ZERO_TRANSACTION_ID}
        )

        if transaction_ids != expected_all_transactions:
            errors.append(
                "Legacy sales drift detected. "
                f"Expected transaction IDs "
                f"{sorted(expected_all_transactions)}, "
                f"found {sorted(transaction_ids)}."
            )

        positive_transactions = [
            row
            for row in transactions
            if text(row["id"])
            in EXPECTED_POSITIVE_TRANSACTION_IDS
        ]

        zero_transactions = [
            row
            for row in transactions
            if text(row["id"])
            == ZERO_TRANSACTION_ID
        ]

        if len(positive_transactions) != 5:
            errors.append(
                "Expected exactly 5 positive legacy invoices."
            )

        if len(zero_transactions) != 1:
            errors.append(
                "Expected exactly one zero-net legacy exception."
            )

        positive_total = sum(
            (
                money(row["final_total"])
                for row
                in positive_transactions
            ),
            Decimal("0.00"),
        )

        if positive_total != EXPECTED_POSITIVE_TOTAL:
            errors.append(
                "Positive legacy invoice total drift: "
                f"{positive_total} != "
                f"{EXPECTED_POSITIVE_TOTAL}."
            )

        for row in positive_transactions:
            if text(row["status"]).lower() != "final":
                errors.append(
                    "Positive legacy invoice is not final: "
                    f"{row['id']}."
                )

            if text(
                row["payment_status"]
            ).lower() != "paid":
                errors.append(
                    "Positive legacy invoice is not paid: "
                    f"{row['id']}."
                )

            if text(row["contact_id"]) != EXPECTED_CUSTOMER_ID:
                errors.append(
                    "Unexpected invoice customer: "
                    f"{row['id']}."
                )

            if text(row["location_id"]) != EXPECTED_BRANCH_ID:
                errors.append(
                    "Unexpected invoice branch: "
                    f"{row['id']}."
                )

        positive_lines = [
            row
            for row in lines
            if text(row["transaction_id"])
            in EXPECTED_POSITIVE_TRANSACTION_IDS
        ]

        zero_lines = [
            row
            for row in lines
            if text(row["transaction_id"])
            == ZERO_TRANSACTION_ID
        ]

        if {
            text(row["id"])
            for row in positive_lines
        } != EXPECTED_LINE_IDS:
            errors.append(
                "Positive legacy sales line IDs changed."
            )

        if len(positive_lines) != 5:
            errors.append(
                "Expected exactly one positive line "
                "for each positive invoice."
            )

        if {
            text(row["id"])
            for row in zero_lines
        } != {ZERO_LINE_ID}:
            errors.append(
                "Zero-net legacy line contract changed."
            )

        for row in positive_lines:
            if money(row["quantity"]) <= 0:
                errors.append(
                    "Positive legacy line has "
                    "non-positive quantity: "
                    f"{row['id']}."
                )

            variation_id = text(
                row["variation_id"]
            )

            if variation_id not in EXPECTED_VARIATION_IDS:
                errors.append(
                    "Unexpected legacy variation on line "
                    f"{row['id']}: {variation_id}."
                )

        positive_payments = [
            row
            for row in payments
            if (
                text(row["transaction_id"])
                in EXPECTED_POSITIVE_TRANSACTION_IDS
                and not bool(row["is_return"])
            )
        ]

        zero_payments = [
            row
            for row in payments
            if text(row["transaction_id"])
            == ZERO_TRANSACTION_ID
        ]

        if {
            text(row["id"])
            for row in positive_payments
        } != EXPECTED_PAYMENT_IDS:
            errors.append(
                "Positive legacy payment IDs changed."
            )

        if len(positive_payments) != 5:
            errors.append(
                "Expected exactly 5 positive payments."
            )

        payment_total = sum(
            (
                money(row["amount"])
                for row
                in positive_payments
            ),
            Decimal("0.00"),
        )

        if payment_total != EXPECTED_PAYMENT_TOTAL:
            errors.append(
                "Positive legacy payment total drift: "
                f"{payment_total} != "
                f"{EXPECTED_PAYMENT_TOTAL}."
            )

        if {
            text(row["id"])
            for row in zero_payments
        } != ZERO_PAYMENT_IDS:
            errors.append(
                "Zero-net exception payment contract changed."
            )

        for row in positive_payments:
            if text(row["method"]).lower() != "cash":
                errors.append(
                    "Unsupported payment method in verified "
                    f"batch: {row['id']}."
                )

            if text(row["account_id"]) != EXPECTED_ACCOUNT_ID:
                errors.append(
                    "Unexpected legacy cash account on payment "
                    f"{row['id']}."
                )

        if len(accounts) != 1:
            errors.append(
                "Expected legacy account 1450 exactly once."
            )
        elif text(
            accounts[0]["business_id"]
        ) != legacy_company_id:
            errors.append(
                "Legacy cash account belongs to "
                "another company."
            )

        # Historical per-line reconciliation.
        for transaction_row in positive_transactions:
            transaction_id = text(
                transaction_row["id"]
            )

            transaction_lines = [
                row
                for row in positive_lines
                if text(row["transaction_id"])
                == transaction_id
            ]

            transaction_payments = [
                row
                for row in positive_payments
                if text(row["transaction_id"])
                == transaction_id
            ]

            if len(transaction_lines) != 1:
                errors.append(
                    "Expected exactly one line for transaction "
                    f"{transaction_id}."
                )
                continue

            if len(transaction_payments) != 1:
                errors.append(
                    "Expected exactly one payment for "
                    f"transaction {transaction_id}."
                )
                continue

            line = transaction_lines[0]
            payment = transaction_payments[0]

            qty = Decimal(
                str(line["quantity"])
            )

            source_subtotal = money(
                qty * Decimal(
                    str(line["unit_price"])
                )
            )

            source_tax = money(
                qty * Decimal(
                    str(line["item_tax"])
                )
            )

            source_total = money(
                qty * Decimal(
                    str(line["unit_price_inc_tax"])
                )
            )

            invoice_total = money(
                transaction_row["final_total"]
            )

            if source_total != invoice_total:
                errors.append(
                    "Legacy line/header reconciliation failed "
                    f"for transaction {transaction_id}: "
                    f"{source_total} != {invoice_total}."
                )

            if money(payment["amount"]) != invoice_total:
                errors.append(
                    "Legacy payment/header reconciliation "
                    f"failed for transaction {transaction_id}."
                )

            if (
                source_subtotal
                + source_tax
                != source_total
            ):
                errors.append(
                    "Legacy subtotal/tax/total reconciliation "
                    f"failed for transaction {transaction_id}."
                )

        # Target must not already contain this batch.
        target_source_ids = {
            SOURCE_ACCOUNT_TABLE: {
                EXPECTED_ACCOUNT_ID
            },
            SOURCE_TRANSACTION_TABLE: (
                expected_all_transactions
            ),
            SOURCE_LINE_TABLE: (
                EXPECTED_LINE_IDS
                | {ZERO_LINE_ID}
            ),
            SOURCE_PAYMENT_TABLE: (
                EXPECTED_PAYMENT_IDS
                | ZERO_PAYMENT_IDS
            ),
        }

        for table_name, ids in (
            target_source_ids.items()
        ):
            existing = (
                LegacyObjectMap.objects
                .filter(
                    source_system=SOURCE_SYSTEM,
                    source_table=table_name,
                    legacy_id__in=list(ids),
                )
                .values_list(
                    "legacy_id",
                    flat=True,
                )
            )

            existing_ids = list(existing)

            if existing_ids:
                errors.append(
                    "Batch already has legacy mappings "
                    f"for {table_name}: "
                    f"{existing_ids}."
                )

        if company:
            expected_invoice_numbers = [
                text(row["invoice_no"])
                for row in positive_transactions
            ]

            collisions = list(
                SalesInvoice.objects
                .filter(
                    company=company,
                    invoice_number__in=(
                        expected_invoice_numbers
                    ),
                )
                .values_list(
                    "invoice_number",
                    flat=True,
                )
            )

            if collisions:
                errors.append(
                    "Target invoice numbers already exist: "
                    f"{collisions}."
                )

            payment_numbers = [
                text(
                    row["payment_ref_no"]
                )
                for row in positive_payments
            ]

            payment_collisions = list(
                CustomerPayment.objects
                .filter(
                    company=company,
                    payment_number__in=(
                        payment_numbers
                    ),
                )
                .values_list(
                    "payment_number",
                    flat=True,
                )
            )

            if payment_collisions:
                errors.append(
                    "Target payment numbers already exist: "
                    f"{payment_collisions}."
                )

            if TreasuryAccount.objects.filter(
                company=company,
                code="LEGACY-CASH-1450",
            ).exists():
                errors.append(
                    "Target legacy cash account already exists."
                )

        return {
            "valid": not errors,
            "errors": errors,
            "warnings": warnings,
            "positive_invoice_count": len(
                positive_transactions
            ),
            "positive_invoice_total": str(
                positive_total
            ),
            "positive_payment_count": len(
                positive_payments
            ),
            "positive_payment_total": str(
                payment_total
            ),
            "zero_net_transaction": (
                ZERO_TRANSACTION_ID
            ),
            "expected_source_objects": 20,
            "expected_created_targets": 16,
            "expected_skipped_sources": 4,
        }

    # ============================================================
    # Apply
    # ============================================================

    @transaction.atomic
    def _apply(
        self,
        *,
        source: dict[str, Any],
        target: dict[str, Any],
        legacy_company_id: str,
        checksum: str,
    ) -> dict[str, Any]:
        company = target["company"]
        branch = target["branch"]
        customer = target["customer"]
        variation_targets = target[
            "variation_targets"
        ]

        # Re-check mapping safety under lock.
        all_batch_keys = {
            SOURCE_ACCOUNT_TABLE: {
                EXPECTED_ACCOUNT_ID
            },
            SOURCE_TRANSACTION_TABLE: (
                EXPECTED_POSITIVE_TRANSACTION_IDS
                | {ZERO_TRANSACTION_ID}
            ),
            SOURCE_LINE_TABLE: (
                EXPECTED_LINE_IDS
                | {ZERO_LINE_ID}
            ),
            SOURCE_PAYMENT_TABLE: (
                EXPECTED_PAYMENT_IDS
                | ZERO_PAYMENT_IDS
            ),
        }

        for table_name, ids in (
            all_batch_keys.items()
        ):
            if (
                LegacyObjectMap.objects
                .select_for_update()
                .filter(
                    source_system=SOURCE_SYSTEM,
                    source_table=table_name,
                    legacy_id__in=list(ids),
                )
                .exists()
            ):
                raise CommandError(
                    "Apply blocked: legacy mapping appeared "
                    f"for {table_name}."
                )

        run = MigrationRun.objects.create(
            source_system=SOURCE_SYSTEM,
            migration_name=MIGRATION_NAME,
            status=MigrationRun.Status.DRY_RUN,
            company=company,
            source_count=20,
            source_snapshot={
                "checksum": checksum,
                "legacy_company_id": (
                    legacy_company_id
                ),
                "positive_transaction_ids": (
                    sorted(
                        EXPECTED_POSITIVE_TRANSACTION_IDS
                    )
                ),
                "zero_net_transaction_id": (
                    ZERO_TRANSACTION_ID
                ),
            },
            metadata={
                "scope": [
                    SOURCE_ACCOUNT_TABLE,
                    SOURCE_TRANSACTION_TABLE,
                    SOURCE_LINE_TABLE,
                    SOURCE_PAYMENT_TABLE,
                ],
                "apply_confirmation": (
                    APPLY_CONFIRMATION
                ),
                "policy": (
                    "verified_financial_batch_10"
                ),
                "historical_rounding_policy": (
                    "preserve_legacy_line_amounts"
                ),
                "zero_net_policy": (
                    "map_as_skipped_without_target"
                ),
            },
        )

        map_ids: list[int] = []
        invoice_ids: list[int] = []
        item_ids: list[int] = []
        payment_ids: list[int] = []

        # --------------------------------------------------------
        # 1. Cash treasury account
        # --------------------------------------------------------

        treasury_account = (
            create_treasury_account(
                company=company,
                user=None,
                name="Legacy Cash 001",
                code="LEGACY-CASH-1450",
                account_type=(
                    TreasuryAccount.AccountType.CASH
                ),
                currency="SAR",
                opening_balance=Decimal("0.00"),
                is_default=True,
                notes=(
                    "Migrated from MhamCloud V1 "
                    "legacy account 1450."
                ),
            )
        )

        account_map = self._create_map(
            run=run,
            company=company,
            source_table=SOURCE_ACCOUNT_TABLE,
            legacy_id=EXPECTED_ACCOUNT_ID,
            target=treasury_account,
            source_reference=(
                "Legacy cash account 1450 / 001"
            ),
            metadata={
                "legacy_account_number": "001",
                "opening_balance_policy": "ZERO",
            },
        )

        map_ids.append(account_map.pk)

        # --------------------------------------------------------
        # 2. Positive invoices + lines + payments
        # --------------------------------------------------------

        transactions_by_id = {
            text(row["id"]): row
            for row in source["transactions"]
        }

        lines_by_transaction = {
            text(row["transaction_id"]): row
            for row in source["lines"]
            if text(row["transaction_id"])
            in EXPECTED_POSITIVE_TRANSACTION_IDS
        }

        payments_by_transaction = {
            text(row["transaction_id"]): row
            for row in source["payments"]
            if (
                text(row["transaction_id"])
                in EXPECTED_POSITIVE_TRANSACTION_IDS
                and not bool(row["is_return"])
            )
        }

        for transaction_id in sorted(
            EXPECTED_POSITIVE_TRANSACTION_IDS,
            key=int,
        ):
            legacy_invoice = transactions_by_id[
                transaction_id
            ]
            legacy_line = lines_by_transaction[
                transaction_id
            ]
            legacy_payment = payments_by_transaction[
                transaction_id
            ]

            variation_id = text(
                legacy_line["variation_id"]
            )

            catalog_item = (
                variation_targets[
                    variation_id
                ]
            )

            invoice_date = self._as_date(
                legacy_invoice[
                    "transaction_date"
                ]
            )

            invoice = create_sales_invoice(
                company=company,
                user=None,
                branch_id=branch.pk,
                customer_id=customer.pk,
                invoice_date=invoice_date,
                due_date=None,
                source=SalesInvoiceSource.IMPORT,
                public_notes="",
                internal_notes=(
                    "Migrated from MhamCloud V1. "
                    f"Legacy transaction {transaction_id}."
                ),
                items=[],
                extra_data={
                    "migration": {
                        "source_system": (
                            SOURCE_SYSTEM
                        ),
                        "source_table": (
                            SOURCE_TRANSACTION_TABLE
                        ),
                        "legacy_id": (
                            transaction_id
                        ),
                        "legacy_invoice_no": (
                            text(
                                legacy_invoice[
                                    "invoice_no"
                                ]
                            )
                        ),
                        "legacy_created_by": (
                            text(
                                legacy_invoice[
                                    "created_by"
                                ]
                            )
                        ),
                        "legacy_created_at": (
                            self._json_value(
                                legacy_invoice[
                                    "created_at"
                                ]
                            )
                        ),
                        "legacy_updated_at": (
                            self._json_value(
                                legacy_invoice[
                                    "updated_at"
                                ]
                            )
                        ),
                    }
                },
            )

            legacy_invoice_no = text(
                legacy_invoice[
                    "invoice_no"
                ]
            )

            if SalesInvoice.objects.filter(
                company=company,
                invoice_number=legacy_invoice_no,
            ).exclude(
                pk=invoice.pk
            ).exists():
                raise CommandError(
                    "Invoice number collision during apply: "
                    f"{legacy_invoice_no}."
                )

            invoice.invoice_number = (
                legacy_invoice_no
            )
            invoice.full_clean()
            invoice.save(
                update_fields=[
                    "invoice_number",
                    "updated_at",
                ]
            )

            qty = Decimal(
                str(
                    legacy_line[
                        "quantity"
                    ]
                )
            )

            legacy_unit_price = Decimal(
                str(
                    legacy_line[
                        "unit_price"
                    ]
                )
            )

            line_subtotal = money(
                qty * legacy_unit_price
            )

            line_tax = money(
                qty
                * Decimal(
                    str(
                        legacy_line[
                            "item_tax"
                        ]
                    )
                )
            )

            line_total = money(
                qty
                * Decimal(
                    str(
                        legacy_line[
                            "unit_price_inc_tax"
                        ]
                    )
                )
            )

            item = create_sales_invoice_item(
                invoice=invoice,
                company=company,
                payload={
                    "catalog_item_id": (
                        catalog_item.pk
                    ),
                    "quantity": qty,
                    "unit_price": (
                        money(
                            legacy_unit_price
                        )
                    ),
                    "discount_amount": (
                        Decimal("0.00")
                    ),
                    "taxable": True,
                    "tax_rate": VAT_RATE,
                    "item_name": (
                        getattr(
                            catalog_item,
                            "name",
                            "",
                        )
                        or getattr(
                            catalog_item,
                            "name_ar",
                            "",
                        )
                    ),
                    "description": (
                        text(
                            legacy_line.get(
                                "sell_line_note"
                            )
                        )
                    ),
                },
                line_number=1,
            )

            # IMPORTANT:
            # Historical MhamCloud used per-unit inclusive-tax
            # rounding. Preserve source monetary truth without
            # changing the normal SalesInvoiceItem model rules.
            item_metadata = dict(
                item.extra_data or {}
            )
            item_metadata[
                "migration"
            ] = {
                "source_system": (
                    SOURCE_SYSTEM
                ),
                "source_table": (
                    SOURCE_LINE_TABLE
                ),
                "legacy_id": (
                    text(
                        legacy_line[
                            "id"
                        ]
                    )
                ),
                "legacy_transaction_id": (
                    transaction_id
                ),
                "legacy_product_id": (
                    text(
                        legacy_line[
                            "product_id"
                        ]
                    )
                ),
                "legacy_variation_id": (
                    variation_id
                ),
                "legacy_unit_price": (
                    str(
                        legacy_line[
                            "unit_price"
                        ]
                    )
                ),
                "legacy_unit_price_inc_tax": (
                    str(
                        legacy_line[
                            "unit_price_inc_tax"
                        ]
                    )
                ),
                "legacy_item_tax_per_unit": (
                    str(
                        legacy_line[
                            "item_tax"
                        ]
                    )
                ),
                "historical_rounding_override": (
                    True
                ),
            }

            (
                SalesInvoiceItem.objects
                .filter(pk=item.pk)
                .update(
                    line_subtotal=(
                        line_subtotal
                    ),
                    discount_amount=(
                        Decimal("0.00")
                    ),
                    taxable=True,
                    tax_rate=VAT_RATE,
                    taxable_amount=(
                        line_subtotal
                    ),
                    tax_amount=line_tax,
                    line_total=line_total,
                    extra_data=item_metadata,
                )
            )

            item.refresh_from_db()

            invoice.recalculate_totals(
                save=True
            )
            invoice.refresh_from_db()

            expected_total = money(
                legacy_invoice[
                    "final_total"
                ]
            )

            if invoice.total_amount != expected_total:
                raise CommandError(
                    "Historical invoice reconciliation "
                    f"failed for {legacy_invoice_no}: "
                    f"target={invoice.total_amount}, "
                    f"legacy={expected_total}."
                )

            if (
                invoice.subtotal
                + invoice.tax_amount
                - invoice.discount_amount
                != invoice.total_amount
            ):
                raise CommandError(
                    "Invoice subtotal/tax reconciliation "
                    f"failed for {legacy_invoice_no}."
                )

            invoice = issue_sales_invoice(
                company=company,
                invoice=invoice,
                user=None,
            )

            invoice.refresh_from_db()

            if invoice.status != SalesInvoiceStatus.ISSUED:
                raise CommandError(
                    "Invoice did not reach ISSUED: "
                    f"{legacy_invoice_no}."
                )

            invoice_map = self._create_map(
                run=run,
                company=company,
                source_table=(
                    SOURCE_TRANSACTION_TABLE
                ),
                legacy_id=transaction_id,
                target=invoice,
                source_reference=(
                    legacy_invoice_no
                ),
                checksum=self._checksum(
                    legacy_invoice
                ),
                metadata={
                    "legacy_contact_id": (
                        EXPECTED_CUSTOMER_ID
                    ),
                    "legacy_location_id": (
                        EXPECTED_BRANCH_ID
                    ),
                    "legacy_final_total": (
                        str(
                            legacy_invoice[
                                "final_total"
                            ]
                        )
                    ),
                },
            )

            line_map = self._create_map(
                run=run,
                company=company,
                source_table=SOURCE_LINE_TABLE,
                legacy_id=text(
                    legacy_line["id"]
                ),
                target=item,
                source_reference=(
                    text(
                        legacy_line["id"]
                    )
                ),
                checksum=self._checksum(
                    legacy_line
                ),
                metadata={
                    "legacy_transaction_id": (
                        transaction_id
                    ),
                    "legacy_variation_id": (
                        variation_id
                    ),
                    "historical_rounding_override": (
                        True
                    ),
                },
            )

            payment_date = self._as_date(
                legacy_payment[
                    "paid_on"
                ]
            )

            customer_name = (
                getattr(
                    customer,
                    "display_name",
                    "",
                )
                or getattr(
                    customer,
                    "legal_name",
                    "",
                )
                or "Legacy Customer"
            )

            customer_phone = (
                getattr(
                    customer,
                    "mobile",
                    "",
                )
                or getattr(
                    customer,
                    "phone",
                    "",
                )
                or ""
            )

            payment_number = text(
                legacy_payment[
                    "payment_ref_no"
                ]
            )

            payment = create_customer_payment(
                company=company,
                treasury_account=(
                    treasury_account
                ),
                user=None,
                amount=money(
                    legacy_payment[
                        "amount"
                    ]
                ),
                payment_method=(
                    PaymentMethod.CASH
                ),
                payment_date=payment_date,
                customer_id=customer.pk,
                customer_name=customer_name,
                customer_phone=customer_phone,
                counterparty_type=(
                    PaymentCounterpartyType.CUSTOMER
                ),
                counterparty_id=customer.pk,
                counterparty_name=(
                    customer_name
                ),
                counterparty_phone=(
                    customer_phone
                ),
                sales_invoice=invoice,
                currency="SAR",
                payment_number=(
                    payment_number
                ),
                reference=(
                    "LEGACY-TP-"
                    f"{legacy_payment['id']}"
                ),
                description=(
                    "Migrated legacy customer payment "
                    f"{payment_number}"
                ),
                notes=(
                    "MhamCloud V1 legacy payment "
                    f"{legacy_payment['id']} for "
                    f"{legacy_invoice_no}."
                ),
                status=(
                    PaymentStatus.CONFIRMED
                ),
            )

            payment.refresh_from_db()
            invoice.refresh_from_db()
            treasury_account.refresh_from_db()

            if (
                payment.status
                != PaymentStatus.CONFIRMED
            ):
                raise CommandError(
                    "Customer payment did not confirm: "
                    f"{payment_number}."
                )

            if (
                payment.treasury_transaction_id
                is None
            ):
                raise CommandError(
                    "Confirmed payment has no "
                    "treasury transaction: "
                    f"{payment_number}."
                )

            if (
                payment.accounting_entry_id
                is None
                or not payment.is_accounting_posted
            ):
                raise CommandError(
                    "Confirmed payment has no posted "
                    "accounting entry: "
                    f"{payment_number}."
                )

            if (
                invoice.payment_status
                != SalesInvoicePaymentStatus.PAID
                or invoice.balance_due
                != Decimal("0.00")
                or invoice.paid_amount
                != invoice.total_amount
            ):
                raise CommandError(
                    "Invoice payment allocation "
                    f"failed for {legacy_invoice_no}."
                )

            payment_map = self._create_map(
                run=run,
                company=company,
                source_table=SOURCE_PAYMENT_TABLE,
                legacy_id=text(
                    legacy_payment["id"]
                ),
                target=payment,
                source_reference=(
                    payment_number
                ),
                checksum=self._checksum(
                    legacy_payment
                ),
                metadata={
                    "legacy_transaction_id": (
                        transaction_id
                    ),
                    "legacy_account_id": (
                        EXPECTED_ACCOUNT_ID
                    ),
                    "legacy_method": (
                        text(
                            legacy_payment[
                                "method"
                            ]
                        )
                    ),
                    "legacy_paid_on": (
                        self._json_value(
                            legacy_payment[
                                "paid_on"
                            ]
                        )
                    ),
                },
            )

            invoice_ids.append(
                invoice.pk
            )
            item_ids.append(
                item.pk
            )
            payment_ids.append(
                payment.pk
            )

            map_ids.extend(
                [
                    invoice_map.pk,
                    line_map.pk,
                    payment_map.pk,
                ]
            )

        # --------------------------------------------------------
        # 3. Zero-net legacy exception
        # --------------------------------------------------------

        zero_transaction = next(
            row
            for row in source["transactions"]
            if text(row["id"])
            == ZERO_TRANSACTION_ID
        )

        zero_line = next(
            row
            for row in source["lines"]
            if text(row["id"])
            == ZERO_LINE_ID
        )

        zero_payments = [
            row
            for row in source["payments"]
            if text(row["id"])
            in ZERO_PAYMENT_IDS
        ]

        skip_objects = [
            (
                SOURCE_TRANSACTION_TABLE,
                ZERO_TRANSACTION_ID,
                text(
                    zero_transaction[
                        "invoice_no"
                    ]
                ),
                zero_transaction,
                {
                    "object_type": "zero_net_invoice",
                    "legacy_final_total": "0.0000",
                },
            ),
            (
                SOURCE_LINE_TABLE,
                ZERO_LINE_ID,
                ZERO_LINE_ID,
                zero_line,
                {
                    "object_type": "zero_quantity_line",
                },
            ),
        ]

        for row in zero_payments:
            skip_objects.append(
                (
                    SOURCE_PAYMENT_TABLE,
                    text(row["id"]),
                    text(
                        row[
                            "payment_ref_no"
                        ]
                    )
                    or text(row["id"]),
                    row,
                    {
                        "object_type": (
                            "zero_net_payment_component"
                        ),
                        "is_return": bool(
                            row["is_return"]
                        ),
                        "amount": str(
                            row["amount"]
                        ),
                    },
                )
            )

        for (
            source_table,
            legacy_id,
            source_reference,
            row,
            extra_metadata,
        ) in skip_objects:
            mapping = (
                LegacyObjectMap.objects
                .create(
                    run=run,
                    source_system=SOURCE_SYSTEM,
                    source_table=source_table,
                    legacy_id=legacy_id,
                    legacy_company_id=(
                        legacy_company_id
                    ),
                    company=company,
                    target_content_type=None,
                    target_object_id="",
                    checksum=self._checksum(
                        row
                    ),
                    source_reference=(
                        source_reference
                    ),
                    metadata={
                        "migration_policy": (
                            "zero_net_legacy_"
                            "exception_skipped"
                        ),
                        "target_created": False,
                        **extra_metadata,
                    },
                )
            )

            map_ids.append(
                mapping.pk
            )

        # --------------------------------------------------------
        # 4. Final reconciliation
        # --------------------------------------------------------

        migrated_invoices = (
            SalesInvoice.objects
            .filter(
                pk__in=invoice_ids,
                company=company,
            )
        )

        migrated_payments = (
            CustomerPayment.objects
            .filter(
                pk__in=payment_ids,
                company=company,
            )
        )

        invoice_total = sum(
            (
                invoice.total_amount
                for invoice
                in migrated_invoices
            ),
            Decimal("0.00"),
        )

        payment_total = sum(
            (
                payment.amount
                for payment
                in migrated_payments
            ),
            Decimal("0.00"),
        )

        paid_count = (
            migrated_invoices
            .filter(
                payment_status=(
                    SalesInvoicePaymentStatus.PAID
                ),
                balance_due=Decimal("0.00"),
            )
            .count()
        )

        confirmed_payment_count = (
            migrated_payments
            .filter(
                status=PaymentStatus.CONFIRMED,
                is_accounting_posted=True,
            )
            .count()
        )

        treasury_account.refresh_from_db()

        mapped_count = (
            LegacyObjectMap.objects
            .filter(run=run)
            .count()
        )

        reconciliation = {
            "expected_source_objects": 20,
            "mapped_source_objects": (
                mapped_count
            ),
            "created_target_business_objects": 16,
            "skipped_zero_net_sources": 4,
            "treasury_accounts_created": 1,
            "sales_invoices_created": (
                len(invoice_ids)
            ),
            "sales_invoice_items_created": (
                len(item_ids)
            ),
            "customer_payments_created": (
                len(payment_ids)
            ),
            "paid_invoice_count": (
                paid_count
            ),
            "confirmed_payment_count": (
                confirmed_payment_count
            ),
            "invoice_total": str(
                money(invoice_total)
            ),
            "payment_total": str(
                money(payment_total)
            ),
            "treasury_balance": str(
                money(
                    treasury_account.current_balance
                )
            ),
            "difference_invoice_payment": str(
                money(
                    invoice_total
                    - payment_total
                )
            ),
        }

        if mapped_count != 20:
            raise CommandError(
                "Final reconciliation failed: "
                f"expected 20 mappings, got "
                f"{mapped_count}."
            )

        if len(invoice_ids) != 5:
            raise CommandError(
                "Final reconciliation failed: "
                "invoice count is not 5."
            )

        if len(item_ids) != 5:
            raise CommandError(
                "Final reconciliation failed: "
                "invoice item count is not 5."
            )

        if len(payment_ids) != 5:
            raise CommandError(
                "Final reconciliation failed: "
                "customer payment count is not 5."
            )

        if paid_count != 5:
            raise CommandError(
                "Final reconciliation failed: "
                "not all invoices are paid."
            )

        if confirmed_payment_count != 5:
            raise CommandError(
                "Final reconciliation failed: "
                "not all payments are confirmed/posted."
            )

        if money(
            invoice_total
        ) != EXPECTED_POSITIVE_TOTAL:
            raise CommandError(
                "Final invoice total mismatch."
            )

        if money(
            payment_total
        ) != EXPECTED_PAYMENT_TOTAL:
            raise CommandError(
                "Final payment total mismatch."
            )

        if money(
            treasury_account.current_balance
        ) != EXPECTED_PAYMENT_TOTAL:
            raise CommandError(
                "Final treasury balance mismatch."
            )

        run.processed_count = 20
        run.created_count = 16
        run.updated_count = 0
        run.skipped_count = 4
        run.failed_count = 0
        run.reconciliation = reconciliation
        run.status = (
            MigrationRun.Status.APPLIED
        )
        run.completed_at = timezone.now()

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
            "migration_run_id": run.pk,
            "treasury_account_id": (
                treasury_account.pk
            ),
            "invoice_ids": invoice_ids,
            "invoice_item_ids": item_ids,
            "customer_payment_ids": (
                payment_ids
            ),
            "legacy_map_ids": map_ids,
            "reconciliation": reconciliation,
        }

    # ============================================================
    # Helpers
    # ============================================================

    def _create_map(
        self,
        *,
        run: MigrationRun,
        company: Company,
        source_table: str,
        legacy_id: str,
        target,
        source_reference: str = "",
        checksum: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> LegacyObjectMap:
        content_type = (
            ContentType.objects
            .get_for_model(
                target.__class__
            )
        )

        return (
            LegacyObjectMap.objects
            .create(
                run=run,
                source_system=SOURCE_SYSTEM,
                source_table=source_table,
                legacy_id=str(
                    legacy_id
                ),
                legacy_company_id=(
                    EXPECTED_COMPANY_ID
                ),
                company=company,
                target_content_type=(
                    content_type
                ),
                target_object_id=str(
                    target.pk
                ),
                checksum=checksum,
                source_reference=(
                    source_reference
                ),
                metadata=(
                    metadata or {}
                ),
            )
        )

    def _as_date(
        self,
        value: Any,
    ):
        if value is None:
            raise CommandError(
                "Legacy date is empty."
            )

        if hasattr(
            value,
            "date",
        ):
            return value.date()

        raw = text(value)

        if not raw:
            raise CommandError(
                "Legacy date is empty."
            )

        try:
            return datetime.fromisoformat(
                raw.replace(
                    "Z",
                    "+00:00",
                )
            ).date()
        except ValueError:
            try:
                return datetime.strptime(
                    raw[:10],
                    "%Y-%m-%d",
                ).date()
            except ValueError as exc:
                raise CommandError(
                    f"Invalid legacy date: {raw}"
                ) from exc

    def _checksum(
        self,
        value: Any,
    ) -> str:
        payload = json.dumps(
            self._json_safe(value),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")

        return hashlib.sha256(
            payload
        ).hexdigest()

    def _json_value(
        self,
        value: Any,
    ) -> Any:
        if isinstance(
            value,
            Decimal,
        ):
            return str(value)

        if isinstance(
            value,
            datetime,
        ):
            return value.isoformat()

        if hasattr(
            value,
            "isoformat",
        ):
            try:
                return value.isoformat()
            except Exception:
                pass

        return value

    def _json_safe(
        self,
        value: Any,
    ) -> Any:
        if isinstance(
            value,
            dict,
        ):
            return {
                str(key): self._json_safe(
                    item
                )
                for key, item
                in value.items()
            }

        if isinstance(
            value,
            (list, tuple),
        ):
            return [
                self._json_safe(item)
                for item in value
            ]

        return self._json_value(
            value
        )

    def _write_report(
        self,
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

        temp.write_text(
            json.dumps(
                report,
                ensure_ascii=False,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        temp.replace(path)

    def _print_summary(
        self,
        report: dict[str, Any],
    ) -> None:
        validation = report[
            "validation"
        ]

        self.stdout.write(
            "=" * 76
        )
        self.stdout.write(
            "MHAMCLOUD V1 -> PRIMEYACC "
            "SALES FINANCIAL MIGRATION | BATCH 10"
        )
        self.stdout.write(
            "=" * 76
        )

        self.stdout.write(
            f"Mode: {report['mode']}"
        )

        self.stdout.write(
            "Legacy company ID: "
            f"{report['legacy_company_id']}"
        )

        self.stdout.write(
            "Positive invoices: "
            f"{validation['positive_invoice_count']}"
        )

        self.stdout.write(
            "Positive invoice total: "
            f"{validation['positive_invoice_total']}"
        )

        self.stdout.write(
            "Positive payments: "
            f"{validation['positive_payment_count']}"
        )

        self.stdout.write(
            "Positive payment total: "
            f"{validation['positive_payment_total']}"
        )

        self.stdout.write(
            "Zero-net legacy transaction: "
            f"{validation['zero_net_transaction']}"
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
            "=" * 76
        )
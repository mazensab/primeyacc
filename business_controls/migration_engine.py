from __future__ import annotations

import hashlib
import json
from contextlib import contextmanager
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Callable, Iterable, Iterator, Mapping, Sequence, TypeVar

from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import connections, transaction
from django.utils import timezone

from business_controls.models import LegacyObjectMap, MigrationRun


SOURCE_SYSTEM_MHAMCLOUD_V1 = "mhamcloud_v1"
MONEY = Decimal("0.01")
MAX_PAGE_SIZE = 1000

T = TypeVar("T")


class MigrationSafetyError(RuntimeError):
    """Raised when a migration safety or reconciliation invariant is violated."""


@dataclass(frozen=True)
class SourceObjectKey:
    source_table: str
    legacy_id: str
    legacy_company_id: str

    def normalized(self) -> "SourceObjectKey":
        return SourceObjectKey(
            source_table=clean_text(self.source_table, 120),
            legacy_id=clean_text(self.legacy_id, 160),
            legacy_company_id=clean_text(self.legacy_company_id, 160),
        )

    def validate(self) -> "SourceObjectKey":
        key = self.normalized()
        if not key.source_table:
            raise MigrationSafetyError("source_table is required.")
        if not key.legacy_id:
            raise MigrationSafetyError("legacy_id is required.")
        if not key.legacy_company_id:
            raise MigrationSafetyError("legacy_company_id is required.")
        return key


@dataclass(frozen=True)
class FinancialLine:
    quantity: Decimal
    unit_price_exclusive: Decimal
    unit_tax: Decimal
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal


@dataclass(frozen=True)
class ReconciliationResult:
    expected: int
    actual: int

    @property
    def difference(self) -> int:
        return self.expected - self.actual

    @property
    def matched(self) -> bool:
        return self.difference == 0

    def require_match(self, label: str) -> "ReconciliationResult":
        if not self.matched:
            raise MigrationSafetyError(
                f"{label} reconciliation failed: expected={self.expected}, "
                f"actual={self.actual}, difference={self.difference}."
            )
        return self


def clean_text(value: Any, max_length: int = 255) -> str:
    if value is None:
        return ""
    return str(value).strip()[:max_length]


def money(value: Any) -> Decimal:
    if value in (None, ""):
        value = "0"
    return Decimal(str(value)).quantize(MONEY, rounding=ROUND_HALF_UP)


def canonical_checksum(value: Any) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def assert_default_database_is_postgresql(alias: str = "default") -> None:
    vendor = connections[alias].vendor
    if vendor != "postgresql":
        raise MigrationSafetyError(
            f"Safety stop: database alias {alias!r} must be PostgreSQL, "
            f"found {vendor!r}."
        )


def assert_company_scope(company: Any, legacy_company_id: str) -> None:
    if company is None:
        raise MigrationSafetyError("Target company is required.")
    legacy_company_id = clean_text(legacy_company_id, 160)
    if not legacy_company_id:
        raise MigrationSafetyError("legacy_company_id is required.")

    expected_code = f"LEGACY-{legacy_company_id}"
    actual_code = clean_text(getattr(company, "company_code", ""), 160)
    if actual_code != expected_code:
        raise MigrationSafetyError(
            "Target company scope mismatch: "
            f"expected company_code={expected_code!r}, actual={actual_code!r}."
        )


def source_mapping_queryset(
    *,
    key: SourceObjectKey,
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
):
    key = key.validate()
    return LegacyObjectMap.objects.filter(
        source_system=clean_text(source_system, 80),
        source_table=key.source_table,
        legacy_id=key.legacy_id,
        legacy_company_id=key.legacy_company_id,
    )


def get_source_mapping(
    *,
    key: SourceObjectKey,
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
) -> LegacyObjectMap | None:
    return source_mapping_queryset(
        key=key,
        source_system=source_system,
    ).select_related("company", "target_content_type", "run").first()


def assert_source_unmapped(
    *,
    key: SourceObjectKey,
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
    for_update: bool = False,
) -> None:
    qs = source_mapping_queryset(key=key, source_system=source_system)
    if for_update:
        # Do not select_related() here. PostgreSQL rejects FOR UPDATE on the
        # nullable side of OUTER JOINs (the Phase 49G issue we already fixed).
        qs = qs.select_for_update()
    if qs.exists():
        normalized = key.validate()
        raise MigrationSafetyError(
            "Legacy object is already mapped: "
            f"{source_system}:{normalized.source_table}:{normalized.legacy_id} "
            f"(company={normalized.legacy_company_id})."
        )


def create_legacy_mapping(
    *,
    run: MigrationRun,
    company: Any,
    key: SourceObjectKey,
    target: Any | None,
    source_reference: str = "",
    checksum: str = "",
    metadata: Mapping[str, Any] | None = None,
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
) -> LegacyObjectMap:
    key = key.validate()
    assert_company_scope(company, key.legacy_company_id)

    if run.company_id not in (None, company.pk):
        raise MigrationSafetyError("MigrationRun belongs to another company.")

    assert_source_unmapped(
        key=key,
        source_system=source_system,
        for_update=True,
    )

    content_type = None
    target_object_id = ""
    if target is not None:
        if hasattr(target, "company_id") and getattr(target, "company_id") not in (
            None,
            company.pk,
        ):
            raise MigrationSafetyError("Target object belongs to another company.")
        content_type = ContentType.objects.get_for_model(target.__class__)
        target_object_id = str(target.pk)

    return LegacyObjectMap.objects.create(
        run=run,
        source_system=clean_text(source_system, 80),
        source_table=key.source_table,
        legacy_id=key.legacy_id,
        legacy_company_id=key.legacy_company_id,
        company=company,
        target_content_type=content_type,
        target_object_id=target_object_id,
        checksum=clean_text(checksum, 128),
        source_reference=clean_text(source_reference, 255),
        metadata=dict(metadata or {}),
    )


def start_migration_run(
    *,
    migration_name: str,
    legacy_company_id: str,
    company: Any | None = None,
    source_count: int = 0,
    source_snapshot: Mapping[str, Any] | None = None,
    metadata: Mapping[str, Any] | None = None,
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
) -> MigrationRun:
    migration_name = clean_text(migration_name, 160)
    legacy_company_id = clean_text(legacy_company_id, 160)
    if not migration_name:
        raise MigrationSafetyError("migration_name is required.")
    if not legacy_company_id:
        raise MigrationSafetyError("legacy_company_id is required.")
    if source_count < 0:
        raise MigrationSafetyError("source_count cannot be negative.")

    if company is not None:
        assert_company_scope(company, legacy_company_id)

    snapshot = dict(source_snapshot or {})
    snapshot.setdefault("legacy_company_id", legacy_company_id)

    return MigrationRun.objects.create(
        source_system=clean_text(source_system, 80),
        migration_name=migration_name,
        status=MigrationRun.Status.DRY_RUN,
        company=company,
        source_count=source_count,
        source_snapshot=snapshot,
        metadata=dict(metadata or {}),
    )


def finalize_migration_run(
    *,
    run: MigrationRun,
    processed_count: int,
    created_count: int,
    updated_count: int = 0,
    skipped_count: int = 0,
    failed_count: int = 0,
    expected_mapping_count: int | None = None,
    reconciliation: Mapping[str, Any] | None = None,
) -> MigrationRun:
    counters = {
        "processed_count": processed_count,
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "failed_count": failed_count,
    }
    if any(value < 0 for value in counters.values()):
        raise MigrationSafetyError("Migration counters cannot be negative.")
    if failed_count:
        raise MigrationSafetyError(
            "Cannot mark migration APPLIED while failed_count is non-zero."
        )
    if processed_count != created_count + updated_count + skipped_count:
        raise MigrationSafetyError(
            "Processed count must equal created + updated + skipped."
        )

    result = dict(reconciliation or {})
    if expected_mapping_count is not None:
        actual_mapping_count = LegacyObjectMap.objects.filter(run=run).count()
        ReconciliationResult(
            expected=expected_mapping_count,
            actual=actual_mapping_count,
        ).require_match("LegacyObjectMap")
        result.setdefault("expected_mapping_count", expected_mapping_count)
        result.setdefault("actual_mapping_count", actual_mapping_count)

    run.processed_count = processed_count
    run.created_count = created_count
    run.updated_count = updated_count
    run.skipped_count = skipped_count
    run.failed_count = failed_count
    run.reconciliation = result
    run.status = MigrationRun.Status.APPLIED
    run.completed_at = timezone.now()
    run.error_message = ""
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
            "error_message",
            "updated_at",
        ]
    )
    return run


@contextmanager
def atomic_migration_scope(*, company: Any | None = None):
    """
    Atomic Primey write boundary.

    When a company is supplied, lock only the Company base row. This prevents
    concurrent migration applies for the same company without joining nullable
    relations into SELECT ... FOR UPDATE.
    """
    with transaction.atomic():
        locked_company = company
        if company is not None:
            company_model = company.__class__
            locked_company = company_model.objects.select_for_update().get(pk=company.pk)
        yield locked_company


def build_financial_line(
    *,
    quantity: Any,
    unit_price_exclusive: Any,
    unit_tax: Any,
    expected_total: Any | None = None,
) -> FinancialLine:
    """
    Build source monetary truth from EXCLUSIVE price + tax.

    Never pass MhamCloud unit_price_inc_tax / purchase_price_inc_tax as
    unit_price_exclusive. Phase 49G proved that doing so double-counts tax.
    """
    qty = Decimal(str(quantity or "0"))
    if qty < 0:
        raise MigrationSafetyError("Quantity cannot be negative.")

    exclusive = money(unit_price_exclusive)
    tax_per_unit = money(unit_tax)
    subtotal = money(qty * exclusive)
    tax_total = money(qty * tax_per_unit)
    total = money(subtotal + tax_total)

    if expected_total is not None and total != money(expected_total):
        raise MigrationSafetyError(
            "Source financial line reconciliation failed: "
            f"subtotal={subtotal}, tax={tax_total}, total={total}, "
            f"expected={money(expected_total)}."
        )

    return FinancialLine(
        quantity=qty,
        unit_price_exclusive=exclusive,
        unit_tax=tax_per_unit,
        subtotal=subtotal,
        tax_total=tax_total,
        total=total,
    )


def reconcile_count(*, expected: int, actual: int, label: str) -> ReconciliationResult:
    return ReconciliationResult(
        expected=int(expected),
        actual=int(actual),
    ).require_match(label)


def iter_cursor_pages(
    fetch_page: Callable[[int, int], Sequence[T]],
    *,
    limit: int = MAX_PAGE_SIZE,
    get_id: Callable[[T], Any] = lambda row: row["id"],  # type: ignore[index]
) -> Iterator[T]:
    """
    Exhaust a source cursor safely using id ASC / after_id.

    Guarantees:
    - 1 <= limit <= 1000
    - IDs must be strictly increasing across and within pages
    - repeated/non-advancing cursors are rejected
    - final short/empty page terminates the iterator
    """
    if not 1 <= int(limit) <= MAX_PAGE_SIZE:
        raise MigrationSafetyError(
            f"Cursor limit must be between 1 and {MAX_PAGE_SIZE}."
        )

    after_id = 0
    previous_id = 0

    while True:
        rows = list(fetch_page(after_id, int(limit)))
        if len(rows) > int(limit):
            raise MigrationSafetyError(
                f"Source returned {len(rows)} rows for limit={limit}."
            )
        if not rows:
            break

        for row in rows:
            try:
                row_id = int(get_id(row))
            except (TypeError, ValueError) as exc:
                raise MigrationSafetyError("Cursor row id must be an integer.") from exc

            if row_id <= previous_id:
                raise MigrationSafetyError(
                    "Source cursor is not strictly increasing: "
                    f"previous_id={previous_id}, current_id={row_id}."
                )
            previous_id = row_id
            yield row

        next_after_id = previous_id
        if next_after_id <= after_id:
            raise MigrationSafetyError(
                "Source cursor did not advance."
            )
        after_id = next_after_id

        if len(rows) < int(limit):
            break


def mapped_source_ids(
    *,
    legacy_company_id: str,
    source_table: str,
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
) -> set[str]:
    return set(
        LegacyObjectMap.objects.filter(
            source_system=clean_text(source_system, 80),
            legacy_company_id=clean_text(legacy_company_id, 160),
            source_table=clean_text(source_table, 120),
        ).values_list("legacy_id", flat=True)
    )


def assert_exact_mapping_set(
    *,
    legacy_company_id: str,
    source_table: str,
    expected_legacy_ids: Iterable[Any],
    source_system: str = SOURCE_SYSTEM_MHAMCLOUD_V1,
) -> None:
    expected = {clean_text(value, 160) for value in expected_legacy_ids}
    actual = mapped_source_ids(
        legacy_company_id=legacy_company_id,
        source_table=source_table,
        source_system=source_system,
    )
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing or extra:
        raise MigrationSafetyError(
            f"Mapping set mismatch for {source_table}: missing={missing}, extra={extra}."
        )

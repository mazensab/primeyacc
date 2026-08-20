# ============================================================
# 📂 business_controls/models.py
# 🧠 Mhamcloud | Production Business Controls Models V1.0
# ------------------------------------------------------------
# ✅ Business audit event ledger
# ✅ Company-scoped idempotency keys
# ✅ Company-scoped reference sequences
# ✅ Duplicate protection foundation
# ✅ Production-grade traceability foundation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نكرر منطق التطبيقات السابقة
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - كل سجل رقابي مربوط بالشركة الحالية
# - السجلات الرقابية لا تعدل العمليات الأصلية
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.db import models, transaction
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone


class BusinessAuditEvent(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="business_audit_events",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="business_audit_events",
    )

    event_type = models.CharField(max_length=80)
    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO,
    )

    source_app = models.CharField(max_length=80, blank=True)
    source_model = models.CharField(max_length=120, blank=True)
    object_id = models.CharField(max_length=80, blank=True)
    object_reference = models.CharField(max_length=120, blank=True)
    action = models.CharField(max_length=80, blank=True)

    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    request_id = models.CharField(max_length=120, blank=True)
    idempotency_key = models.CharField(max_length=160, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["company", "event_type"]),
            models.Index(fields=["company", "source_app", "source_model"]),
            models.Index(fields=["company", "object_reference"]),
            models.Index(fields=["company", "idempotency_key"]),
        ]

    def __str__(self) -> str:
        return f"{self.company_id} | {self.event_type} | {self.created_at:%Y-%m-%d %H:%M:%S}"


class BusinessIdempotencyKey(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", "Started"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="business_idempotency_keys",
    )

    key = models.CharField(max_length=160)
    scope = models.CharField(max_length=120)
    operation = models.CharField(max_length=120)

    request_hash = models.CharField(max_length=128, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.STARTED,
    )

    response_snapshot = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)

    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        unique_together = [("company", "scope", "key")]
        indexes = [
            models.Index(fields=["company", "scope", "key"]),
            models.Index(fields=["company", "operation"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.company_id} | {self.scope} | {self.key}"

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and self.expires_at <= timezone.now())

    def mark_succeeded(self, response_snapshot: dict | None = None) -> None:
        self.status = self.Status.SUCCEEDED
        self.response_snapshot = response_snapshot or {}
        self.error_message = ""
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "response_snapshot",
                "error_message",
                "completed_at",
                "updated_at",
            ]
        )

    def mark_failed(self, error_message: str = "") -> None:
        self.status = self.Status.FAILED
        self.error_message = error_message[:4000]
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "error_message",
                "completed_at",
                "updated_at",
            ]
        )


class BusinessReferenceSequence(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="business_reference_sequences",
    )

    scope = models.CharField(max_length=120)
    prefix = models.CharField(max_length=40)
    current_number = models.PositiveBigIntegerField(default=0)
    padding = models.PositiveSmallIntegerField(default=6)
    is_active = models.BooleanField(default=True)

    description = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scope", "prefix"]
        unique_together = [("company", "scope", "prefix")]
        indexes = [
            models.Index(fields=["company", "scope"]),
            models.Index(fields=["company", "prefix"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.company_id} | {self.scope} | {self.prefix}"

    def next_preview(self) -> str:
        next_number = self.current_number + 1
        return f"{self.prefix}{str(next_number).zfill(self.padding)}"

    def reserve_next(self) -> str:
        with transaction.atomic():
            locked = (
                BusinessReferenceSequence.objects.select_for_update()
                .get(pk=self.pk)
            )
            locked.current_number += 1
            locked.save(update_fields=["current_number", "updated_at"])
            return f"{locked.prefix}{str(locked.current_number).zfill(locked.padding)}"
# ===== PRIMEYACC LEGACY MIGRATION FOUNDATION V1 =====
# ---------------------------------------------------------------------
# Historical migration control layer.
#
# Rules:
# - This layer does not alter operational source records.
# - Every migration execution has a durable run record.
# - Every legacy object can be mapped deterministically to its target.
# - Re-running imports must not silently duplicate migrated objects.
# - source_system + source_table + legacy_id is the legacy identity.
# - target_content_type + target_object_id identifies the new object.
# - checksum can be used to detect legacy-source changes between runs.
# ---------------------------------------------------------------------


class MigrationRun(models.Model):
    class Status(models.TextChoices):
        DRY_RUN = "dry_run", "Dry Run"
        VALIDATED = "validated", "Validated"
        APPLIED = "applied", "Applied"
        FAILED = "failed", "Failed"

    source_system = models.CharField(
        max_length=80,
        db_index=True,
    )
    migration_name = models.CharField(
        max_length=160,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRY_RUN,
    )

    # Optional scope. A global migration/discovery run may not belong
    # to a single company yet.
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legacy_migration_runs",
    )

    started_at = models.DateTimeField(
        default=timezone.now,
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    source_count = models.PositiveBigIntegerField(default=0)
    processed_count = models.PositiveBigIntegerField(default=0)
    created_count = models.PositiveBigIntegerField(default=0)
    updated_count = models.PositiveBigIntegerField(default=0)
    skipped_count = models.PositiveBigIntegerField(default=0)
    failed_count = models.PositiveBigIntegerField(default=0)

    source_snapshot = models.JSONField(
        default=dict,
        blank=True,
    )
    reconciliation = models.JSONField(
        default=dict,
        blank=True,
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at", "-id"]
        indexes = [
            models.Index(
                fields=["source_system", "status"],
                name="bc_mrun_source_status_idx",
            ),
            models.Index(
                fields=["company", "status"],
                name="bc_mrun_company_status_idx",
            ),
            models.Index(
                fields=["migration_name", "started_at"],
                name="bc_mrun_name_start_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.source_system} | "
            f"{self.migration_name} | "
            f"{self.status}"
        )

    def mark_validated(self, reconciliation: dict | None = None) -> None:
        self.status = self.Status.VALIDATED
        self.reconciliation = reconciliation or {}
        self.error_message = ""
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "reconciliation",
                "error_message",
                "completed_at",
                "updated_at",
            ]
        )

    def mark_applied(self, reconciliation: dict | None = None) -> None:
        self.status = self.Status.APPLIED
        self.reconciliation = reconciliation or {}
        self.error_message = ""
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "reconciliation",
                "error_message",
                "completed_at",
                "updated_at",
            ]
        )

    def mark_failed(self, error_message: str) -> None:
        self.status = self.Status.FAILED
        self.error_message = (error_message or "")[:10000]
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "error_message",
                "completed_at",
                "updated_at",
            ]
        )


class LegacyObjectMap(models.Model):
    run = models.ForeignKey(
        MigrationRun,
        on_delete=models.PROTECT,
        related_name="object_maps",
    )

    source_system = models.CharField(
        max_length=80,
    )
    source_table = models.CharField(
        max_length=120,
    )
    legacy_id = models.CharField(
        max_length=160,
    )

    # Legacy company identity is deliberately stored independently
    # from the new Company FK. This allows company migration itself
    # to be mapped before a target company exists.
    legacy_company_id = models.CharField(
        max_length=160,
        blank=True,
    )

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legacy_object_maps",
    )

    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    target_object_id = models.CharField(
        max_length=160,
        blank=True,
    )
    target_object = GenericForeignKey(
        "target_content_type",
        "target_object_id",
    )

    checksum = models.CharField(
        max_length=128,
        blank=True,
    )

    source_reference = models.CharField(
        max_length=255,
        blank=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    migrated_at = models.DateTimeField(
        default=timezone.now,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "source_system",
            "source_table",
            "legacy_id",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "source_system",
                    "source_table",
                    "legacy_id",
                ],
                name="bc_legacy_source_object_uniq",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "source_system",
                    "source_table",
                    "legacy_id",
                ],
                name="bc_legacy_lookup_idx",
            ),
            models.Index(
                fields=[
                    "source_system",
                    "legacy_company_id",
                ],
                name="bc_legacy_company_idx",
            ),
            models.Index(
                fields=[
                    "target_content_type",
                    "target_object_id",
                ],
                name="bc_legacy_target_idx",
            ),
            models.Index(
                fields=["company", "source_table"],
                name="bc_legacy_scope_idx",
            ),
            models.Index(
                fields=["run", "source_table"],
                name="bc_legacy_run_table_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.source_system}:"
            f"{self.source_table}:"
            f"{self.legacy_id}"
        )

    @property
    def has_target(self) -> bool:
        return bool(
            self.target_content_type_id
            and self.target_object_id
        )

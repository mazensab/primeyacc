# ============================================================
# 📂 business_controls/tests.py
# 🧠 Mhamcloud | Business Controls Tests V1.0
# ------------------------------------------------------------
# ✅ Audit event service test
# ✅ Idempotency duplicate protection test
# ✅ Reference sequence reservation test
# ✅ Summary builder test
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الاختبارات لا تعتمد على بيانات خارجية
# - إنشاء Company يتم بمرونة حسب الحقول المطلوبة الحالية
# ============================================================

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import models
from django.test import TestCase

from business_controls.models import (
    BusinessAuditEvent,
    BusinessIdempotencyKey,
    BusinessReferenceSequence,
)
from business_controls.services import (
    build_business_controls_summary,
    complete_idempotency_key,
    log_business_event,
    register_idempotency_key,
    reserve_business_reference,
)
from companies.models import Company


def create_test_company(name: str = "Phase 26 Test Company") -> Company:
    payload = {}

    for field in Company._meta.fields:
        if field.primary_key or field.auto_created:
            continue
        if field.has_default() or field.null or field.blank:
            continue

        if isinstance(field, models.CharField):
            value = name if field.name in {"name", "company_name", "title"} else f"test-{field.name}"
            payload[field.name] = value[: field.max_length]
        elif isinstance(field, models.TextField):
            payload[field.name] = f"test-{field.name}"
        elif isinstance(field, models.EmailField):
            payload[field.name] = "phase26@example.com"
        elif isinstance(field, models.BooleanField):
            payload[field.name] = True
        elif isinstance(field, (models.IntegerField, models.PositiveIntegerField, models.PositiveSmallIntegerField)):
            payload[field.name] = 1
        elif isinstance(field, models.DecimalField):
            payload[field.name] = "1.00"
        elif isinstance(field, models.DateField):
            from django.utils import timezone

            payload[field.name] = timezone.localdate()
        elif isinstance(field, models.DateTimeField):
            from django.utils import timezone

            payload[field.name] = timezone.now()

    return Company.objects.create(**payload)


class BusinessControlsServiceTests(TestCase):
    def setUp(self):
        self.company = create_test_company()
        self.user = get_user_model().objects.create_user(
            username="phase26-user",
            email="phase26@example.com",
            password="SafePass12345!",
        )

    def test_log_business_event_creates_company_scoped_event(self):
        event = log_business_event(
            company=self.company,
            actor=self.user,
            event_type="sales_invoice_issued",
            source_app="sales",
            source_model="SalesInvoice",
            object_id="15",
            object_reference="INV-000015",
            action="issue",
            message="Invoice issued.",
            metadata={"phase": 26},
        )

        self.assertEqual(BusinessAuditEvent.objects.count(), 1)
        self.assertEqual(event.company, self.company)
        self.assertEqual(event.actor, self.user)
        self.assertEqual(event.metadata["phase"], 26)

    def test_idempotency_key_prevents_duplicate_creation(self):
        first, first_created = register_idempotency_key(
            company=self.company,
            key="req-001",
            scope="payments",
            operation="confirm_payment",
        )
        second, second_created = register_idempotency_key(
            company=self.company,
            key="req-001",
            scope="payments",
            operation="confirm_payment",
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first.id, second.id)
        self.assertEqual(BusinessIdempotencyKey.objects.count(), 1)

        complete_idempotency_key(
            record=first,
            response_snapshot={"ok": True, "payment_id": 10},
        )
        first.refresh_from_db()
        self.assertEqual(first.status, BusinessIdempotencyKey.Status.SUCCEEDED)
        self.assertEqual(first.response_snapshot["payment_id"], 10)

    def test_reference_sequence_reserves_incremental_references(self):
        first = reserve_business_reference(
            company=self.company,
            scope="sales_invoice",
            prefix="INV-",
            padding=5,
        )
        second = reserve_business_reference(
            company=self.company,
            scope="sales_invoice",
            prefix="INV-",
            padding=5,
        )

        self.assertEqual(first, "INV-00001")
        self.assertEqual(second, "INV-00002")

        sequence = BusinessReferenceSequence.objects.get(
            company=self.company,
            scope="sales_invoice",
            prefix="INV-",
        )
        self.assertEqual(sequence.current_number, 2)
        self.assertEqual(sequence.next_preview(), "INV-00003")

    def test_business_controls_summary(self):
        log_business_event(
            company=self.company,
            actor=self.user,
            event_type="inventory_stock_adjusted",
            severity=BusinessAuditEvent.Severity.WARNING,
            source_app="inventory",
        )
        register_idempotency_key(
            company=self.company,
            key="stock-adjustment-001",
            scope="inventory",
            operation="post_adjustment",
        )
        reserve_business_reference(
            company=self.company,
            scope="inventory_adjustment",
            prefix="ADJ-",
            padding=4,
        )

        summary = build_business_controls_summary(company=self.company)

        self.assertEqual(summary["audit_events"]["total"], 1)
        self.assertEqual(summary["audit_events"]["by_severity"]["warning"], 1)
        self.assertEqual(summary["idempotency"]["total"], 1)
        self.assertEqual(summary["references"]["total_sequences"], 1)


from business_controls.integrations import (
    business_object_snapshot,
    resolve_object_reference,
    safe_complete_idempotency_key,
    safe_log_business_event,
    safe_register_idempotency_key,
)


class BusinessControlsSafeIntegrationTests(TestCase):
    def setUp(self):
        self.company = create_test_company("Phase 26 Safe Integration Company")
        self.user = get_user_model().objects.create_user(
            username="phase26-safe-user",
            email="phase26-safe@example.com",
            password="SafePass12345!",
        )

    def test_safe_audit_wrapper_creates_event_with_snapshot(self):
        class DummyObject:
            id = 77
            company = self.company
            status = "POSTED"
            invoice_number = "INV-77"

        obj = DummyObject()

        event = safe_log_business_event(
            obj=obj,
            actor=self.user,
            event_type="phase26_safe_audit",
            action="post",
            source_app="business_controls",
            message="Safe audit wrapper test.",
        )

        self.assertIsNotNone(event)
        self.assertEqual(event.company, self.company)
        self.assertEqual(event.object_reference, "INV-77")
        self.assertEqual(event.metadata["object_snapshot"]["status"], "POSTED")
        self.assertEqual(resolve_object_reference(obj), "INV-77")
        self.assertEqual(business_object_snapshot(obj)["invoice_number"], "INV-77")

    def test_safe_idempotency_wrapper_lifecycle(self):
        record, created = safe_register_idempotency_key(
            company=self.company,
            key="phase26-safe-key",
            scope="phase26",
            operation="safe_integration",
        )

        self.assertIsNotNone(record)
        self.assertTrue(created)

        duplicate, duplicate_created = safe_register_idempotency_key(
            company=self.company,
            key="phase26-safe-key",
            scope="phase26",
            operation="safe_integration",
        )

        self.assertEqual(record.id, duplicate.id)
        self.assertFalse(duplicate_created)

        safe_complete_idempotency_key(
            record=record,
            response_snapshot={"ok": True},
        )

        record.refresh_from_db()
        self.assertEqual(record.status, BusinessIdempotencyKey.Status.SUCCEEDED)
        self.assertEqual(record.response_snapshot["ok"], True)

    def test_safe_audit_wrapper_without_company_is_non_breaking(self):
        event = safe_log_business_event(
            company=None,
            obj=None,
            actor=self.user,
            event_type="phase26_missing_company",
            action="test",
            source_app="business_controls",
        )
        self.assertIsNone(event)

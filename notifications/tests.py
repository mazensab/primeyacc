# ============================================================
# 📂 notifications/tests.py
# 🧠 Mhamcloud | Company Notifications Tests V1.4
# ------------------------------------------------------------
# ✅ CompanyNotification model tests
# ✅ Tenant isolation service tests
# ✅ Recipient membership validation tests
# ✅ Read/unread helpers tests
# ✅ Company-wide notification tests
# ✅ Notifications Company APIs tests
# ✅ Compatible with current Company model fields
# ✅ Uses unique company_code for each test company
# ============================================================

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from companies.models import Company
from notifications.models import (
    CompanyNotification,
    NotificationChannel,
    NotificationPriority,
    NotificationType,
)
from notifications.services import (
    create_company_wide_notification,
    create_notification,
    get_company_notifications_queryset,
    get_notification_for_company,
    get_unread_notifications_count,
    mark_all_notifications_as_read,
    mark_notification_as_read,
    user_belongs_to_company,
)

User = get_user_model()


class CompanyNotificationsFoundationTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="Notify Test Company",
            company_code="NOTIFY-001",
            is_active=True,
        )

        self.other_company = Company.objects.create(
            name="Other Notify Company",
            company_code="NOTIFY-002",
            is_active=True,
        )

        self.user = User.objects.create_user(
            username="notify_user",
            email="notify_user@example.com",
            password="StrongPass123!",
        )

        self.other_user = User.objects.create_user(
            username="other_notify_user",
            email="other_notify_user@example.com",
            password="StrongPass123!",
        )

        self.outside_user = User.objects.create_user(
            username="outside_notify_user",
            email="outside_notify_user@example.com",
            password="StrongPass123!",
        )

        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        CompanyMembership.objects.create(
            user=self.other_user,
            company=self.other_company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

    def test_user_belongs_to_company_returns_true_for_active_membership(self):
        self.assertTrue(
            user_belongs_to_company(
                user=self.user,
                company=self.company,
            )
        )

    def test_user_belongs_to_company_returns_false_for_outside_user(self):
        self.assertFalse(
            user_belongs_to_company(
                user=self.outside_user,
                company=self.company,
            )
        )

    def test_create_notification_for_company_recipient(self):
        notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="Invoice issued",
            message="Sales invoice has been issued.",
            notification_type=NotificationType.SUCCESS,
            channel=NotificationChannel.IN_APP,
            priority=NotificationPriority.NORMAL,
            source_type="sales_invoice",
            source_id=1,
            action_url="/company/sales/invoices/1",
            metadata={"invoice_number": "INV-001"},
            created_by=self.user,
        )

        self.assertEqual(notification.company, self.company)
        self.assertEqual(notification.recipient, self.user)
        self.assertEqual(notification.title, "Invoice issued")
        self.assertEqual(notification.notification_type, NotificationType.SUCCESS)
        self.assertEqual(notification.channel, NotificationChannel.IN_APP)
        self.assertEqual(notification.priority, NotificationPriority.NORMAL)
        self.assertEqual(notification.source_type, "sales_invoice")
        self.assertEqual(notification.source_id, "1")
        self.assertFalse(notification.is_read)

    def test_create_notification_rejects_outside_recipient(self):
        with self.assertRaises(ValueError):
            create_notification(
                company=self.company,
                recipient=self.outside_user,
                title="Invalid recipient",
                message="This should fail.",
            )

    def test_create_notification_requires_title(self):
        with self.assertRaises(ValueError):
            create_notification(
                company=self.company,
                recipient=self.user,
                title="",
                message="Message exists.",
            )

    def test_create_notification_requires_message(self):
        with self.assertRaises(ValueError):
            create_notification(
                company=self.company,
                recipient=self.user,
                title="Title exists",
                message="",
            )

    def test_create_company_wide_notification(self):
        notification = create_company_wide_notification(
            company=self.company,
            title="System notice",
            message="Company-wide notification.",
            notification_type=NotificationType.INFO,
        )

        self.assertEqual(notification.company, self.company)
        self.assertIsNone(notification.recipient)
        self.assertEqual(notification.title, "System notice")

    def test_queryset_is_tenant_isolated_by_company(self):
        create_notification(
            company=self.company,
            recipient=self.user,
            title="Company notification",
            message="Visible to company user.",
        )

        create_notification(
            company=self.other_company,
            recipient=self.other_user,
            title="Other company notification",
            message="Must not leak.",
        )

        notifications = get_company_notifications_queryset(
            company=self.company,
            user=self.user,
        )

        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.first().company, self.company)

    def test_queryset_includes_company_wide_notifications(self):
        user_notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="User notification",
            message="Private user notification.",
        )

        company_notification = create_company_wide_notification(
            company=self.company,
            title="Company notification",
            message="Company-wide notification.",
        )

        notifications = get_company_notifications_queryset(
            company=self.company,
            user=self.user,
            include_company_wide=True,
        )

        self.assertEqual(notifications.count(), 2)
        self.assertIn(user_notification, list(notifications))
        self.assertIn(company_notification, list(notifications))

    def test_queryset_can_exclude_company_wide_notifications(self):
        create_notification(
            company=self.company,
            recipient=self.user,
            title="User notification",
            message="Private user notification.",
        )

        create_company_wide_notification(
            company=self.company,
            title="Company notification",
            message="Company-wide notification.",
        )

        notifications = get_company_notifications_queryset(
            company=self.company,
            user=self.user,
            include_company_wide=False,
        )

        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.first().recipient, self.user)

    def test_get_notification_for_company_returns_only_scoped_notification(self):
        notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="Scoped notification",
            message="Visible notification.",
        )

        result = get_notification_for_company(
            company=self.company,
            notification_id=notification.id,
            user=self.user,
        )

        self.assertEqual(result, notification)

        leaked = get_notification_for_company(
            company=self.other_company,
            notification_id=notification.id,
            user=self.other_user,
        )

        self.assertIsNone(leaked)

    def test_mark_notification_as_read(self):
        notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="Unread notification",
            message="Will be read.",
        )

        updated = mark_notification_as_read(
            company=self.company,
            notification_id=notification.id,
            user=self.user,
        )

        self.assertTrue(updated.is_read)
        self.assertIsNotNone(updated.read_at)

    def test_mark_notification_as_read_rejects_wrong_company(self):
        notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="Private notification",
            message="Wrong company cannot read it.",
        )

        with self.assertRaises(ValueError):
            mark_notification_as_read(
                company=self.other_company,
                notification_id=notification.id,
                user=self.other_user,
            )

    def test_mark_all_notifications_as_read(self):
        create_notification(
            company=self.company,
            recipient=self.user,
            title="First",
            message="First unread.",
        )

        create_notification(
            company=self.company,
            recipient=self.user,
            title="Second",
            message="Second unread.",
        )

        self.assertEqual(
            get_unread_notifications_count(
                company=self.company,
                user=self.user,
            ),
            2,
        )

        updated_count = mark_all_notifications_as_read(
            company=self.company,
            user=self.user,
        )

        self.assertEqual(updated_count, 2)
        self.assertEqual(
            get_unread_notifications_count(
                company=self.company,
                user=self.user,
            ),
            0,
        )

    def test_model_mark_as_unread(self):
        notification = CompanyNotification.objects.create(
            company=self.company,
            recipient=self.user,
            title="Read notification",
            message="Will become unread.",
            is_read=True,
        )

        notification.mark_as_unread()
        notification.refresh_from_db()

        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)


class CompanyNotificationsAPITests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="Notifications API Company",
            company_code="NOTIFY-API-001",
            is_active=True,
        )

        self.other_company = Company.objects.create(
            name="Other Notifications API Company",
            company_code="NOTIFY-API-002",
            is_active=True,
        )

        self.user = User.objects.create_user(
            username="notify_api_user",
            email="notify_api_user@example.com",
            password="StrongPass123!",
        )

        self.other_user = User.objects.create_user(
            username="notify_api_other_user",
            email="notify_api_other_user@example.com",
            password="StrongPass123!",
        )

        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        CompanyMembership.objects.create(
            user=self.other_user,
            company=self.other_company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_notifications_list_returns_current_company_notifications(self):
        create_notification(
            company=self.company,
            recipient=self.user,
            title="Visible notification",
            message="This notification is visible.",
        )

        create_notification(
            company=self.other_company,
            recipient=self.other_user,
            title="Hidden notification",
            message="This notification must not leak.",
        )

        response = self.client.get("/api/company/notifications/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["title"],
            "Visible notification",
        )

    def test_notifications_detail_returns_scoped_notification(self):
        notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="Detail notification",
            message="Notification detail.",
        )

        response = self.client.get(
            f"/api/company/notifications/{notification.id}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["notification"]["title"],
            "Detail notification",
        )

    def test_notifications_detail_blocks_other_company_notification(self):
        notification = create_notification(
            company=self.other_company,
            recipient=self.other_user,
            title="Other company notification",
            message="Must not be visible.",
        )

        response = self.client.get(
            f"/api/company/notifications/{notification.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])

    def test_unread_count_endpoint(self):
        create_notification(
            company=self.company,
            recipient=self.user,
            title="Unread one",
            message="Unread message.",
        )

        create_company_wide_notification(
            company=self.company,
            title="Company-wide unread",
            message="Company-wide unread message.",
        )

        response = self.client.get(
            "/api/company/notifications/unread-count/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["unread_count"], 2)

    def test_mark_notification_as_read_endpoint(self):
        notification = create_notification(
            company=self.company,
            recipient=self.user,
            title="Read endpoint",
            message="Will be marked as read.",
        )

        response = self.client.post(
            f"/api/company/notifications/{notification.id}/read/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])

        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_all_notifications_as_read_endpoint(self):
        create_notification(
            company=self.company,
            recipient=self.user,
            title="First unread",
            message="First unread message.",
        )

        create_company_wide_notification(
            company=self.company,
            title="Second unread",
            message="Second unread message.",
        )

        response = self.client.post(
            "/api/company/notifications/mark-all-read/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["updated_count"], 2)
        self.assertEqual(response.data["unread_count"], 0)
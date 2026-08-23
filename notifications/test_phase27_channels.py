from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
)
from companies.models import Company
from notifications.models import (
    NotificationDeliveryStatus,
)
from notifications.services import (
    create_or_get_notification_event,
    deliver_notification_email,
    deliver_notification_whatsapp,
)


User = get_user_model()


class Phase27ChannelDeliveryTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="Phase 27C Company",
            company_code="PH27-C-001",
            is_active=True,
        )

        self.user = User.objects.create_user(
            username="phase27c_user",
            email="phase27c@example.com",
            password="StrongPass123!",
        )

        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

    def event(self, suffix: str):
        return create_or_get_notification_event(
            company=self.company,
            event_type="subscription.activated",
            event_key=f"phase27c:{suffix}",
            title="Subscription activated",
            message="Your subscription is active.",
            action_url="/company/subscription",
        )[0]

    @override_settings(
        EMAIL_BACKEND=(
            "django.core.mail.backends.locmem.EmailBackend"
        ),
        DEFAULT_FROM_EMAIL="no-reply@mhamcloud.test",
    )
    def test_email_delivery_marks_sent_and_is_idempotent(self):
        event = self.event("email-sent")

        first, created = deliver_notification_email(
            event=event,
            recipient=self.user,
        )

        self.assertTrue(created)
        self.assertEqual(
            first.status,
            NotificationDeliveryStatus.SENT,
        )
        self.assertEqual(len(mail.outbox), 1)

        second, created_again = deliver_notification_email(
            event=event,
            recipient=self.user,
        )

        self.assertFalse(created_again)
        self.assertEqual(first.id, second.id)
        self.assertEqual(len(mail.outbox), 1)

    def test_email_without_address_is_skipped(self):
        self.user.email = ""
        self.user.save(update_fields=["email"])

        event = self.event("email-missing")

        delivery, _ = deliver_notification_email(
            event=event,
            recipient=self.user,
        )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SKIPPED,
        )

    @patch(
        "whatsapp.services.send_company_whatsapp_message"
    )
    def test_whatsapp_delivery_marks_sent(
        self,
        mocked_send,
    ):
        mocked_send.return_value = {
            "success": True,
            "message": "sent",
            "result": {
                "message_id": "wa-provider-1",
            },
            "message_log": {
                "id": 91,
                "provider": "CUSTOM",
                "provider_message_id": "wa-provider-1",
            },
        }

        event = self.event("wa-sent")

        delivery, created = deliver_notification_whatsapp(
            event=event,
            recipient=self.user,
            destination="+966500000001",
        )

        self.assertTrue(created)
        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SENT,
        )
        self.assertEqual(
            delivery.provider_reference,
            "wa-provider-1",
        )

    @patch(
        "whatsapp.services.send_company_whatsapp_message"
    )
    def test_whatsapp_failure_does_not_raise_by_default(
        self,
        mocked_send,
    ):
        mocked_send.return_value = {
            "success": False,
            "message": "gateway offline",
            "result": {
                "error_message": "gateway offline",
            },
            "message_log": {
                "id": 92,
                "provider": "CUSTOM",
            },
        }

        event = self.event("wa-failed")

        delivery, _ = deliver_notification_whatsapp(
            event=event,
            recipient=self.user,
            destination="+966500000002",
        )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.FAILED,
        )
        self.assertIn(
            "gateway offline",
            delivery.error_message,
        )

    @patch(
        "whatsapp.services.send_company_whatsapp_message"
    )
    def test_whatsapp_sent_delivery_is_not_resent(
        self,
        mocked_send,
    ):
        mocked_send.return_value = {
            "success": True,
            "message": "sent",
            "result": {
                "message_id": "wa-provider-2",
            },
            "message_log": {
                "id": 93,
                "provider": "CUSTOM",
                "provider_message_id": "wa-provider-2",
            },
        }

        event = self.event("wa-idempotent")

        first, _ = deliver_notification_whatsapp(
            event=event,
            recipient=self.user,
            destination="+966500000003",
        )

        second, created_again = (
            deliver_notification_whatsapp(
                event=event,
                recipient=self.user,
                destination="+966500000003",
            )
        )

        self.assertFalse(created_again)
        self.assertEqual(first.id, second.id)
        self.assertEqual(
            mocked_send.call_count,
            1,
        )

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
)
from companies.models import Company
from notifications.models import (
    CompanyNotification,
    NotificationChannel,
    NotificationDelivery,
    NotificationDeliveryStatus,
    NotificationEvent,
)
from notifications.services import (
    create_or_get_notification_delivery,
    create_or_get_notification_event,
    deliver_notification_in_app,
)


User = get_user_model()


class Phase27NotificationEventDeliveryTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="Phase 27 Company",
            company_code="PH27-NOTIFY-001",
            is_active=True,
        )

        self.other_company = Company.objects.create(
            name="Phase 27 Other Company",
            company_code="PH27-NOTIFY-002",
            is_active=True,
        )

        self.user = User.objects.create_user(
            username="phase27_notify_user",
            email="phase27-notify@example.com",
            password="StrongPass123!",
        )

        self.other_user = User.objects.create_user(
            username="phase27_notify_other_user",
            email="phase27-notify-other@example.com",
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

    def test_event_creation_is_idempotent(self):
        first, first_created = (
            create_or_get_notification_event(
                company=self.company,
                event_type="payment.confirmed",
                event_key="payment:1:confirmed",
                source_type="platform_payment",
                source_id="1",
                title="Payment confirmed",
                message="Payment succeeded.",
            )
        )

        second, second_created = (
            create_or_get_notification_event(
                company=self.company,
                event_type="payment.confirmed",
                event_key="payment:1:confirmed",
                source_type="platform_payment",
                source_id="1",
            )
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first.id, second.id)
        self.assertEqual(
            NotificationEvent.objects.count(),
            1,
        )

    def test_same_event_key_is_isolated_per_company(self):
        first, first_created = (
            create_or_get_notification_event(
                company=self.company,
                event_type="payment.confirmed",
                event_key="payment:2:confirmed",
            )
        )

        second, second_created = (
            create_or_get_notification_event(
                company=self.other_company,
                event_type="payment.confirmed",
                event_key="payment:2:confirmed",
            )
        )

        self.assertTrue(first_created)
        self.assertTrue(second_created)
        self.assertNotEqual(
            first.id,
            second.id,
        )
        self.assertEqual(
            NotificationEvent.objects.filter(
                event_key="payment:2:confirmed",
            ).count(),
            2,
        )

    def test_delivery_rejects_recipient_from_other_company(self):
        event, _ = create_or_get_notification_event(
            company=self.company,
            event_type="subscription.activated",
            event_key="subscription:10:activated",
        )

        with self.assertRaises(ValueError):
            create_or_get_notification_delivery(
                event=event,
                channel=NotificationChannel.IN_APP,
                recipient=self.other_user,
                destination=str(self.other_user.id),
            )

    def test_company_wide_delivery_is_idempotent_with_null_recipient(self):
        event, _ = create_or_get_notification_event(
            company=self.company,
            event_type="subscription.expired",
            event_key="subscription:21:expired",
        )

        first, first_created = (
            create_or_get_notification_delivery(
                event=event,
                channel=NotificationChannel.IN_APP,
                recipient=None,
                destination="COMPANY",
            )
        )

        second, second_created = (
            create_or_get_notification_delivery(
                event=event,
                channel=NotificationChannel.IN_APP,
                recipient=None,
                destination="COMPANY",
            )
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(
            first.id,
            second.id,
        )
        self.assertEqual(
            NotificationDelivery.objects.filter(
                event=event,
                channel=NotificationChannel.IN_APP,
                recipient__isnull=True,
                destination="COMPANY",
            ).count(),
            1,
        )

    def test_delivery_is_idempotent_per_target(self):
        event, _ = create_or_get_notification_event(
            company=self.company,
            event_type="subscription.activated",
            event_key="subscription:11:activated",
        )

        first, first_created = (
            create_or_get_notification_delivery(
                event=event,
                channel=NotificationChannel.EMAIL,
                recipient=self.user,
                destination=self.user.email,
            )
        )

        second, second_created = (
            create_or_get_notification_delivery(
                event=event,
                channel=NotificationChannel.EMAIL,
                recipient=self.user,
                destination=self.user.email,
            )
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first.id, second.id)
        self.assertEqual(
            NotificationDelivery.objects.count(),
            1,
        )

    def test_in_app_delivery_preserves_existing_notification_contract(self):
        event, _ = create_or_get_notification_event(
            company=self.company,
            event_type="onboarding.ready",
            event_key="onboarding:1:ready",
            source_type="company_onboarding",
            source_id="1",
            title="Company ready",
            message="Your company workspace is ready.",
            action_url="/company",
        )

        notification, delivery, created = (
            deliver_notification_in_app(
                event=event,
                recipient=self.user,
            )
        )

        self.assertTrue(created)

        self.assertEqual(
            notification.company_id,
            self.company.id,
        )
        self.assertEqual(
            notification.recipient_id,
            self.user.id,
        )
        self.assertEqual(
            notification.channel,
            NotificationChannel.IN_APP,
        )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SENT,
        )

        self.assertEqual(
            delivery.provider,
            "IN_APP",
        )

        self.assertEqual(
            delivery.metadata[
                "company_notification_id"
            ],
            notification.id,
        )

        second_notification, second_delivery, second_created = (
            deliver_notification_in_app(
                event=event,
                recipient=self.user,
            )
        )

        self.assertFalse(second_created)
        self.assertEqual(
            second_notification.id,
            notification.id,
        )
        self.assertEqual(
            second_delivery.id,
            delivery.id,
        )

        self.assertEqual(
            CompanyNotification.objects.filter(
                company=self.company,
                recipient=self.user,
            ).count(),
            1,
        )

    def test_read_state_is_separate_from_delivery_state(self):
        event, _ = create_or_get_notification_event(
            company=self.company,
            event_type="subscription.expiring_soon",
            event_key="subscription:20:expiring:7",
            title="Subscription expiring",
            message="Renew soon.",
        )

        notification, delivery, _ = (
            deliver_notification_in_app(
                event=event,
                recipient=self.user,
            )
        )

        notification.mark_as_read()
        delivery.refresh_from_db()

        self.assertTrue(notification.is_read)

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SENT,
        )



class Phase27ExternalDeliveryAdapterTests(TestCase):
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

    def test_email_delivery_sends_and_is_idempotent(self):
        from django.core import mail
        from django.test import override_settings

        from notifications.services import (
            deliver_notification_email,
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type="payment.confirmed",
                event_key=(
                    "payment:email:"
                    "confirmed"
                ),
                title="Payment confirmed",
                message=(
                    "Your payment was "
                    "confirmed."
                ),
            )
        )

        with override_settings(
            EMAIL_BACKEND=(
                "django.core.mail.backends."
                "locmem.EmailBackend"
            ),
            DEFAULT_FROM_EMAIL=(
                "no-reply@mhamcloud.test"
            ),
        ):
            delivery, created = (
                deliver_notification_email(
                    event=event,
                    recipient=self.user,
                )
            )

            self.assertTrue(
                created
            )

            self.assertEqual(
                delivery.status,
                NotificationDeliveryStatus.SENT,
            )

            self.assertEqual(
                delivery.provider,
                "django.core.mail.backends.locmem.EmailBackend",
            )

            self.assertEqual(
                delivery.attempt_count,
                1,
            )

            self.assertEqual(
                len(mail.outbox),
                1,
            )

            self.assertEqual(
                mail.outbox[0].to,
                [self.user.email],
            )

            second, second_created = (
                deliver_notification_email(
                    event=event,
                    recipient=self.user,
                )
            )

            self.assertFalse(
                second_created
            )

            self.assertEqual(
                second.id,
                delivery.id,
            )

            self.assertEqual(
                second.attempt_count,
                1,
            )

            self.assertEqual(
                len(mail.outbox),
                1,
            )

    def test_email_without_destination_is_skipped(self):
        from notifications.services import (
            deliver_notification_email,
        )

        self.user.email = ""
        self.user.save(
            update_fields=["email"]
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type=(
                    "subscription."
                    "expiring_soon"
                ),
                event_key=(
                    "subscription:"
                    "email:missing"
                ),
                title="Subscription",
                message="Renew soon.",
            )
        )

        delivery, _ = (
            deliver_notification_email(
                event=event,
                recipient=self.user,
            )
        )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SKIPPED,
        )

        self.assertEqual(
            delivery.attempt_count,
            0,
        )

    def test_email_failure_is_recorded_without_raising(self):
        from unittest.mock import patch

        from notifications.services import (
            deliver_notification_email,
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type="payment.failed",
                event_key=(
                    "payment:email:"
                    "backend-failure"
                ),
                title="Payment failed",
                message="Payment failed.",
            )
        )

        with patch(
            "django.core.mail.message.EmailMessage.send",
            side_effect=RuntimeError(
                "SMTP unavailable"
            ),
        ):
            delivery, _ = (
                deliver_notification_email(
                    event=event,
                    recipient=self.user,
                    fail_silently=True,
                )
            )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.FAILED,
        )

        self.assertEqual(
            delivery.attempt_count,
            1,
        )

        self.assertIn(
            "SMTP unavailable",
            delivery.error_message,
        )

    def test_whatsapp_delivery_uses_company_gateway_adapter(self):
        from unittest.mock import patch

        from notifications.services import (
            deliver_notification_whatsapp,
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type=(
                    "subscription.activated"
                ),
                event_key=(
                    "subscription:"
                    "whatsapp:activated"
                ),
                title="Subscription active",
                message=(
                    "Your subscription "
                    "is now active."
                ),
            )
        )

        mock_result = {
            "success": True,
            "message": "Sent",
            "result": {
                "success": True,
            },
            "connection": {},
            "message_log": {
                "id": 101,
                "provider_message_id": (
                    "wa-msg-101"
                ),
            },
        }

        with patch(
            "whatsapp.services."
            "send_company_whatsapp_message",
            return_value=mock_result,
        ) as mocked:
            delivery, created = (
                deliver_notification_whatsapp(
                    event=event,
                    recipient=self.user,
                    destination="0500000000",
                )
            )

        self.assertTrue(
            created
        )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SENT,
        )

        self.assertEqual(
            delivery.provider,
            "WHATSAPP_GATEWAY",
        )

        self.assertEqual(
            delivery.provider_reference,
            "wa-msg-101",
        )

        self.assertEqual(
            delivery.attempt_count,
            1,
        )

        mocked.assert_called_once()

    def test_whatsapp_failure_is_recorded_without_raising(self):
        from unittest.mock import patch

        from notifications.services import (
            deliver_notification_whatsapp,
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type=(
                    "subscription.expired"
                ),
                event_key=(
                    "subscription:"
                    "whatsapp:failed"
                ),
                title="Subscription expired",
                message=(
                    "Your subscription "
                    "has expired."
                ),
            )
        )

        mock_result = {
            "success": False,
            "message": (
                "Gateway disconnected"
            ),
            "result": {
                "success": False,
                "error_message": (
                    "Gateway disconnected"
                ),
            },
            "connection": {},
            "message_log": {
                "id": 102,
            },
        }

        with patch(
            "whatsapp.services."
            "send_company_whatsapp_message",
            return_value=mock_result,
        ):
            delivery, _ = (
                deliver_notification_whatsapp(
                    event=event,
                    recipient=self.user,
                    destination="0500000000",
                    fail_silently=True,
                )
            )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.FAILED,
        )

        self.assertEqual(
            delivery.attempt_count,
            1,
        )

        self.assertIn(
            "Gateway disconnected",
            delivery.error_message,
        )

    def test_whatsapp_without_phone_is_skipped(self):
        from notifications.services import (
            deliver_notification_whatsapp,
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type=(
                    "subscription.renewed"
                ),
                event_key=(
                    "subscription:"
                    "whatsapp:no-phone"
                ),
                title="Renewed",
                message="Subscription renewed.",
            )
        )

        delivery, _ = (
            deliver_notification_whatsapp(
                event=event,
                recipient=self.user,
            )
        )

        self.assertEqual(
            delivery.status,
            NotificationDeliveryStatus.SKIPPED,
        )

        self.assertEqual(
            delivery.attempt_count,
            0,
        )

    def test_multi_channel_failure_does_not_block_in_app(self):
        from unittest.mock import patch

        from notifications.services import (
            deliver_notification_event,
        )

        event, _ = (
            create_or_get_notification_event(
                company=self.company,
                event_type=(
                    "payment.confirmed"
                ),
                event_key=(
                    "payment:"
                    "multichannel:1"
                ),
                title="Payment confirmed",
                message="Payment confirmed.",
            )
        )

        with patch(
            "django.core.mail.message.EmailMessage.send",
            side_effect=RuntimeError(
                "SMTP failure"
            ),
        ):
            result = (
                deliver_notification_event(
                    event=event,
                    recipient=self.user,
                    channels=(
                        NotificationChannel.IN_APP,
                        NotificationChannel.EMAIL,
                    ),
                )
            )

        self.assertTrue(
            result[
                NotificationChannel.IN_APP
            ]["success"]
        )

        self.assertFalse(
            result[
                NotificationChannel.EMAIL
            ]["success"]
        )

        self.assertEqual(
            CompanyNotification.objects.filter(
                company=self.company,
                recipient=self.user,
            ).count(),
            1,
        )

from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase,override_settings
from accounts.models import CompanyMembership,CompanyRole,MembershipStatus
from companies.models import Company
from notifications.models import CompanyNotification,NotificationChannel,NotificationDeliveryStatus
from notifications.services import create_or_get_notification_event,deliver_notification_event,resolve_notification_event_template_content
from whatsapp.services import SYSTEM_WHATSAPP_READY_TEMPLATES,seed_system_whatsapp_ready_templates
User=get_user_model()
class V224FinalRuntimeTemplateTests(TestCase):
    def setUp(self):
        seed_system_whatsapp_ready_templates()
        self.company=Company.objects.create(name="V2 24 Final Company",company_code="V224-FINAL-001",is_active=True)
        self.user=User.objects.create_user(username="v224-final-owner",email="v224-final@example.com",password="StrongPass123!")
        CompanyMembership.objects.create(user=self.user,company=self.company,role=CompanyRole.OWNER,status=MembershipStatus.ACTIVE,is_primary=True)
    def event(self,complete=True,suffix="1"):
        p={"company_name":self.company.name,"owner_name":"V2 Owner","login_url":"/login"}
        if not complete:p.pop("login_url")
        return create_or_get_notification_event(company=self.company,event_type="company.created",event_key=f"v224-final:{suffix}",title="Legacy title",message="Legacy message",payload=p)[0]
    def test_catalog_44_unique(self):
        self.assertEqual(len(SYSTEM_WHATSAPP_READY_TEMPLATES),44)
        self.assertEqual(len({x["code"] for x in SYSTEM_WHATSAPP_READY_TEMPLATES}),44)
        self.assertEqual(len({(x.get("metadata") or {}).get("event") for x in SYSTEM_WHATSAPP_READY_TEMPLATES}),44)
    def test_render(self):
        c=resolve_notification_event_template_content(event=self.event(),recipient=self.user)
        self.assertEqual(c["template_code"],"SYSTEM_COMPANY_CREATED");self.assertTrue(c["template_rendered"]);self.assertIn(self.company.name,c["message"]);self.assertNotIn("{{",c["message"])
    def test_fallback(self):
        c=resolve_notification_event_template_content(event=self.event(False,"fallback"),recipient=self.user)
        self.assertTrue(c["template_fallback"]);self.assertIn("login_url",c["missing_variables"]);self.assertEqual(c["message"],"Legacy message")
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",DEFAULT_FROM_EMAIL="no-reply@primey.test")
    @patch("whatsapp.services.send_company_whatsapp_message")
    def test_channels_and_idempotency(self,m):
        m.return_value={"success":True,"message":"sent","result":{"message_id":"wa1"},"message_log":{"id":2401,"provider":"CUSTOM","provider_message_id":"wa1"}}
        e=self.event(True,"channels");kw={"event":e,"recipient":self.user,"channels":(NotificationChannel.IN_APP,NotificationChannel.EMAIL,NotificationChannel.WHATSAPP),"email_destination":self.user.email,"whatsapp_destination":"+966500000001"}
        a=deliver_notification_event(**kw)
        for ch in kw["channels"]:
            self.assertTrue(a[ch]["success"]);self.assertEqual(a[ch]["delivery"]["metadata"]["template_code"],"SYSTEM_COMPANY_CREATED");self.assertTrue(a[ch]["delivery"]["metadata"]["template_rendered"])
        n=CompanyNotification.objects.get(company=self.company,recipient=self.user);self.assertIn(self.company.name,n.message)
        self.assertEqual(len(mail.outbox),1);self.assertIn(self.company.name,mail.outbox[0].body);self.assertIn(self.company.name,m.call_args.kwargs["message_body"])
        b=deliver_notification_event(**kw);self.assertEqual(len(mail.outbox),1);self.assertEqual(m.call_count,1);self.assertEqual(CompanyNotification.objects.filter(company=self.company,recipient=self.user).count(),1)
        for ch in kw["channels"]:self.assertEqual(b[ch]["delivery"]["status"],NotificationDeliveryStatus.SENT)

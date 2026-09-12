from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from accounts.models import SystemRole,UserProfile,UserProfileStatus
User=get_user_model()
class SystemDashboardAPITests(TestCase):
 def setUp(self):
  self.user=User.objects.create_user(username="v2-dashboard-admin",password="StrongPass123!")
  UserProfile.objects.update_or_create(user=self.user,defaults={"display_name":"V2 Dashboard Admin","status":UserProfileStatus.ACTIVE,"is_system_user":True,"system_role":SystemRole.SUPER_ADMIN})
 def test_auth(self):
  self.assertIn(self.client.get("/api/system/dashboard/overview/").status_code,{302,401})
 def test_permission(self):
  self.client.force_login(self.user)
  with patch("api.system.dashboard.views.user_has_system_permission",return_value=False): r=self.client.get("/api/system/dashboard/overview/")
  self.assertEqual(r.status_code,403); self.assertEqual(r.json()["code"],"SYSTEM_DASHBOARD_VIEW_PERMISSION_REQUIRED")
 def test_contract(self):
  self.client.force_login(self.user)
  with patch("api.system.dashboard.views.user_has_system_permission",return_value=True): r=self.client.get("/api/system/dashboard/overview/?limit=5")
  self.assertEqual(r.status_code,200); d=r.json()["data"]; self.assertEqual(d["currency_code"],"SAR"); self.assertTrue(d["meta"]["read_only"])
  for k in ("companies","users","subscriptions","revenue","payments"): self.assertIn(k,d["summary"])
  for k in ("companies","subscriptions","expired_subscriptions","expiring_subscriptions","users","payments"): self.assertIn(k,d["latest"])
 def test_date_filters(self):
  self.client.force_login(self.user)
  with patch("api.system.dashboard.views.user_has_system_permission",return_value=True): r=self.client.get("/api/system/dashboard/overview/",{"date_from":"2026-01-01","date_to":"2026-12-31"})
  self.assertEqual(r.status_code,200); self.assertEqual(r.json()["data"]["filters"]["date_from"],"2026-01-01")
 def test_invalid_range(self):
  self.client.force_login(self.user)
  with patch("api.system.dashboard.views.user_has_system_permission",return_value=True): r=self.client.get("/api/system/dashboard/overview/",{"date_from":"2026-12-31","date_to":"2026-01-01"})
  self.assertEqual(r.status_code,400); self.assertEqual(r.json()["code"],"INVALID_REPORT_DATE_RANGE")

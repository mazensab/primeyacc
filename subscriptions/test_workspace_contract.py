from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from companies.models import ActivityProfile,Branch,Company
from subscriptions.models import CompanySubscription,SubscriptionPlan
from subscriptions.workspace import resolve_effective_workspace

class EffectiveWorkspaceContractTests(TestCase):
    def setUp(self):
        self.company=Company.objects.create(name="V2-25G Company",company_code="V2-25G-COMPANY",activity_profile="GENERAL")
        self.branch=Branch.objects.create(company=self.company,name="Main",branch_code="MAIN",is_default=True)
        self.plan=SubscriptionPlan.objects.create(name="V2-25G All",code=SubscriptionPlan.PlanCode.CUSTOM,slug="v2-25g-all",features=["all"],max_users=5,max_branches=3,max_warehouses=2,max_pos=2)
        CompanySubscription.objects.create(company=self.company,plan=self.plan,status=CompanySubscription.Status.ACTIVE,start_date=timezone.localdate(),end_date=timezone.localdate()+timedelta(days=30))
    def test_legacy_commerce_compatibility(self):
        for legacy in ("GENERAL","RETAIL","WHOLESALE"):
            self.company.activity_profile=legacy; self.company.activity_profile_ref=None; self.company.save(update_fields=["activity_profile","activity_profile_ref"])
            self.assertEqual(self.company.effective_activity_code,"COMMERCE")
    def test_branch_inherits_company_activity(self):
        c=resolve_effective_workspace(company=self.company,branch=self.branch)
        self.assertEqual(c.activity_code,"COMMERCE"); self.assertTrue(c.branch_inherits_company_activity); self.assertNotIn("restaurant",c.effective_modules)
    def test_branch_override_intersects_plan(self):
        p, _ = ActivityProfile.objects.get_or_create(
            code="RESTAURANT", company=None,
            defaults={"name": "Restaurant", "name_ar": "Restaurant", "name_en": "Restaurant", "is_active": True, "is_system": True},
        )
        self.branch.activity_profile = p
        self.branch.save(update_fields=["activity_profile", "updated_at"])
        w = resolve_effective_workspace(company=self.company, branch=self.branch)
        self.assertEqual(w.activity_code, "RESTAURANT")
        self.assertIn("restaurant", w.effective_modules)

from django.test import SimpleTestCase
from integrations.mham_legacy.scan_planner import SourceContractError, build_scan_plan, group_subscriptions

class MhamScanPlannerTests(SimpleTestCase):
    def test_group_subscriptions(self):
        g=group_subscriptions([{"id":1,"business_id":2},{"id":2,"business_id":2},{"id":3,"business_id":654}])
        self.assertEqual(len(g["2"]),2); self.assertEqual(len(g["654"]),1)

    def test_subscription_without_business_id_fails_closed(self):
        with self.assertRaisesRegex(SourceContractError,"no business_id"):
            group_subscriptions([{"id":1}])

    def test_scan_summary_existing_new_ineligible(self):
        s=build_scan_plan(
            [{"id":2,"name":"Existing"},{"id":654,"name":"New"},{"id":700,"name":"Old"}],
            [
                {"id":1,"business_id":2,"status":"active","end_date":"2026-01-01"},
                {"id":2,"business_id":654,"status":"expired","end_date":"2026-01-01"},
                {"id":3,"business_id":700,"status":"expired","end_date":"2024-01-01"},
            ],
            {"2"},
        )
        self.assertEqual((s.discovered,s.eligible,s.existing,s.new,s.ineligible),(3,2,1,1,1))

    def test_future_company_is_new_not_capped_by_319(self):
        s=build_scan_plan(
            [{"id":9999,"name":"Future"}],
            [{"id":99,"business_id":9999,"status":"active","end_date":"2030-01-01"}],
            set(),
        )
        self.assertEqual((s.discovered,s.eligible,s.new),(1,1,1))

    def test_no_subscription_company_is_ineligible(self):
        s=build_scan_plan([{"id":654,"name":"No sub"}],[],set())
        self.assertEqual((s.eligible,s.ineligible),(0,1))

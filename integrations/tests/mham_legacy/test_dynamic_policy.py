from django.test import SimpleTestCase
from integrations.mham_legacy.dynamic_policy import (
    ELIGIBILITY_CUTOFF,
    SourceContractError,
    classify_discovered_companies,
    evaluate_subscriptions,
)

class MhamDynamicPolicyTests(SimpleTestCase):
    def test_active_subscription_is_eligible(self):
        d=evaluate_subscriptions("654",[{"id":1,"business_id":654,"status":"approved","end_date":"2024-01-01"}])
        self.assertTrue(d.eligible); self.assertEqual(d.reason,"ACTIVE_SUBSCRIPTION")

    def test_latest_end_on_cutoff_is_eligible(self):
        d=evaluate_subscriptions("654",[{"id":1,"business_id":654,"status":"expired","end_date":"2025-01-01"}])
        self.assertTrue(d.eligible); self.assertEqual(d.reason,"LATEST_END_ON_OR_AFTER_CUTOFF")

    def test_latest_end_after_cutoff_is_eligible(self):
        d=evaluate_subscriptions("654",[{"id":1,"business_id":654,"status":"expired","end_date":"2026-01-01"}])
        self.assertTrue(d.eligible)

    def test_latest_end_before_cutoff_is_ineligible(self):
        d=evaluate_subscriptions("654",[{"id":1,"business_id":654,"status":"expired","end_date":"2024-12-31"}])
        self.assertFalse(d.eligible); self.assertEqual(d.reason,"LATEST_END_BEFORE_CUTOFF")

    def test_latest_subscription_is_selected(self):
        d=evaluate_subscriptions("654",[
            {"id":1,"business_id":654,"status":"expired","end_date":"2024-01-01"},
            {"id":2,"business_id":654,"status":"expired","end_date":"2026-02-01"},
        ])
        self.assertEqual(d.selected_subscription_id,"2")

    def test_no_subscription_is_ineligible(self):
        d=evaluate_subscriptions("654",[])
        self.assertFalse(d.eligible); self.assertEqual(d.reason,"NO_SUBSCRIPTION")

    def test_cross_company_subscription_fails_closed(self):
        with self.assertRaisesRegex(SourceContractError,"Cross-company subscription"):
            evaluate_subscriptions("654",[{"business_id":999,"status":"active"}])

    def test_invalid_date_fails_closed(self):
        with self.assertRaisesRegex(SourceContractError,"Invalid subscription date"):
            evaluate_subscriptions("654",[{"business_id":654,"status":"expired","end_date":"bad-date"}])

    def test_dynamic_classification_existing_new_and_ineligible(self):
        rows=[{"id":2,"name":"Existing"},{"id":654,"name":"New"},{"id":700,"name":"Old"}]
        subs={
            "2":[{"business_id":2,"status":"active","end_date":"2026-01-01"}],
            "654":[{"business_id":654,"status":"expired","end_date":"2026-01-01"}],
            "700":[{"business_id":700,"status":"expired","end_date":"2024-01-01"}],
        }
        r=classify_discovered_companies(rows,subs,{"2"})
        self.assertEqual([(x.business_id,x.target_state) for x in r],[("2","EXISTING"),("654","NEW"),("700","INELIGIBLE")])

    def test_new_id_is_not_limited_by_historical_319_baseline(self):
        r=classify_discovered_companies(
            [{"id":9999,"name":"Future"}],
            {"9999":[{"business_id":9999,"status":"active","end_date":"2030-01-01"}]},
            set(),
        )
        self.assertEqual(r[0].target_state,"NEW")

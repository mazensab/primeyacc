from django.test import SimpleTestCase
from integrations.mham_legacy import sync_engine as se
class PostCutoverWriterContractTests(SimpleTestCase):
    def test_order_and_supported_domains(self):
        self.assertEqual(se.POST_CUTOVER_WRITER_DOMAINS,("sales","sale_returns","payments"))
    def test_grouping(self):
        plan={"unresolved":[],"ignored":False,"routes":[
            {"domain":"payments","legacy_id":"3","target_company_id":1,"reason":"PARENT_TRANSACTION"},
            {"domain":"sales","legacy_id":"1","target_company_id":1,"reason":"BRANCH"},
            {"domain":"sale_returns","legacy_id":"2","target_company_id":1,"reason":"PARENT_TRANSACTION"},
            {"domain":"sales","legacy_id":"x","target_company_id":None,"reason":"EXPECTED_EXCLUDED"},
        ]}
        groups,excluded=se._pc_assert_writer_plan(business_id="88",plan=plan)
        self.assertEqual([x["legacy_id"] for x in groups["sales"]],["1"])
        self.assertEqual([x["legacy_id"] for x in groups["sale_returns"]],["2"])
        self.assertEqual([x["legacy_id"] for x in groups["payments"]],["3"])
        self.assertEqual(excluded,1)
    def test_unsupported_fails_closed(self):
        with self.assertRaises(se.MhamSyncError):
            se._pc_assert_writer_plan(business_id="88",plan={"unresolved":[],"ignored":False,"routes":[{"domain":"purchases","legacy_id":"1","target_company_id":1,"reason":"BRANCH"}]})

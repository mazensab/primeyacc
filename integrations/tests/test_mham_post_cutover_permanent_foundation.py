from django.test import SimpleTestCase
from integrations.mham_legacy import sync_engine as se
class PostCutoverPermanentFoundationTests(SimpleTestCase):
    def test_identity(self):
        x=se._pc_operation_identity(business_id="88",legacy_id="123",domain="sales",payload={"id":123})
        self.assertEqual(x["legacy_company_id"],"88");self.assertEqual(x["legacy_id"],"123");self.assertTrue(x["post_cutover"])
    def test_unresolved_fails(self):
        with self.assertRaises(se.MhamSyncError): se.apply_post_cutover_delta_foundation(business_id="88",live={},plan={"unresolved":[{}],"routes":[],"ignored":False})
    def test_missing_target_fails(self):
        with self.assertRaises(se.MhamSyncError): se.apply_post_cutover_delta_foundation(business_id="88",live={},plan={"unresolved":[],"ignored":False,"routes":[{"domain":"sales","legacy_id":"1","target_company_id":None,"reason":"BRANCH"}]})
    def test_excluded_allowed_and_disabled(self):
        r=se.apply_post_cutover_delta_foundation(business_id="76",live={},plan={"unresolved":[],"ignored":False,"routes":[{"domain":"sales","legacy_id":"1","target_company_id":None,"reason":"EXPECTED_EXCLUDED"}]})
        self.assertEqual(r["status"],"FOUNDATION_ONLY");self.assertFalse(r["permanent_apply_enabled"])

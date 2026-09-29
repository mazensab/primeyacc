from django.test import SimpleTestCase
from unittest.mock import patch
from integrations.mham_legacy import sync_engine as se

class MhamPostCutoverDispatchTests(SimpleTestCase):
    @patch.object(se,"decision_for")
    @patch.object(se,"sync_post_cutover_business_ids")
    @patch.object(se,"sync_business_ids")
    def test_mixed_dispatch(self,legacy,post,decision):
        decision.side_effect=lambda bid: object() if bid=="88" else None
        legacy.return_value={"started_at_utc":"2026-01-01T00:00:00+00:00","changed_business_ids":[],"failures":{},"results":[{"business_id":"10","status":"UNCHANGED"}]}
        post.return_value={"started_at_utc":"2026-01-01T00:00:01+00:00","changed_business_ids":["88"],"failures":{},"results":[{"business_id":"88","status":"POST_CUTOVER_APPLIED"}]}
        with patch("pathlib.Path.write_text", return_value=None):
            r=se.run_management_sync(business_ids=["88","10"],scan_only=False)
        legacy.assert_called_once_with(["10"],scan_only=False)
        post.assert_called_once_with(["88"],scan_only=False)
        self.assertEqual(r["failure_count"],0)
        self.assertEqual(r["mode"],"POST_CUTOVER_DISPATCH")
        self.assertEqual(r["changed_business_ids"],["88"])

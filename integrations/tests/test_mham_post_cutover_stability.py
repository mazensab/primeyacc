from unittest.mock import Mock
from django.test import SimpleTestCase
from integrations.mham_legacy import sync_engine as se
class StablePostCutoverSourceTests(SimpleTestCase):
 def test_first_pass(self):
  v=Mock();v.collect_source.return_value={"x":1};old=se.build_post_cutover_delta_plan
  try:
   se.build_post_cutover_delta_plan=lambda **kw:{"unresolved":[]}
   live,plan,n=se.collect_stable_post_cutover_source(business_id="88",company_row={},token="x",v13=v);self.assertEqual(n,1);self.assertEqual(v.collect_source.call_count,1)
  finally:se.build_post_cutover_delta_plan=old
 def test_retry_then_pass(self):
  v=Mock();v.collect_source.side_effect=[{"n":1},{"n":2}];calls=[{"unresolved":[{"x":1}]},{"unresolved":[]}];old=se.build_post_cutover_delta_plan
  try:
   se.build_post_cutover_delta_plan=lambda **kw:calls.pop(0)
   live,plan,n=se.collect_stable_post_cutover_source(business_id="188",company_row={},token="x",v13=v);self.assertEqual(n,2);self.assertEqual(live,{"n":2})
  finally:se.build_post_cutover_delta_plan=old
 def test_persistent_fails_closed(self):
  v=Mock();v.collect_source.return_value={"n":1};old=se.build_post_cutover_delta_plan
  try:
   se.build_post_cutover_delta_plan=lambda **kw:{"unresolved":[{"domain":"payments"}]}
   with self.assertRaises(se.MhamSyncError):se.collect_stable_post_cutover_source(business_id="188",company_row={},token="x",v13=v,max_attempts=2)
   self.assertEqual(v.collect_source.call_count,2)
  finally:se.build_post_cutover_delta_plan=old

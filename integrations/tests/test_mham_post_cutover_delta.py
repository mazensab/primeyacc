from django.test import SimpleTestCase
from integrations.mham_legacy.topology import decision_for
from integrations.mham_legacy.sync_engine import POST_CUTOVER_KEEP_NULL_PAYMENTS
class PostCutoverDeltaContractTests(SimpleTestCase):
 def test_partial(self):
  d=decision_for("76");self.assertEqual(d.kept_branch_ids,frozenset({"92"}));self.assertEqual(d.excluded_branch_ids,frozenset({"90","91"}))
 def test_split(self):
  d=decision_for("88");self.assertEqual(d.split_branch_to_group["106"],"88-G01");self.assertEqual(d.split_branch_to_group["752"],"88-G01")
 def test_keep_null(self):self.assertEqual(len(POST_CUTOVER_KEEP_NULL_PAYMENTS),5)

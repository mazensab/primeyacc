from types import SimpleNamespace
from django.test import SimpleTestCase
from integrations.mham_legacy import sync_engine as se
class MasterIdentityTests(SimpleTestCase):
 def test_contact_identity(self):
  o=SimpleNamespace(extra_data={"migration":{"legacy_id":"123"}})
  self.assertTrue(se._pc_master_matches_legacy(o,legacy_id="123",kind="contact"))
  self.assertFalse(se._pc_master_matches_legacy(o,legacy_id="124",kind="contact"))
 def test_item_product_identity(self):
  o=SimpleNamespace(extra_data={"migration":{"legacy_id":"55","legacy_variation_ids":["91","92"]}})
  self.assertTrue(se._pc_master_matches_legacy(o,legacy_id="55",kind="item"))
  self.assertTrue(se._pc_master_matches_legacy(o,legacy_id="92",kind="item"))
 def test_unknown_kind_fails_closed(self):
  o=SimpleNamespace(extra_data={"migration":{"legacy_id":"1"}})
  self.assertFalse(se._pc_master_matches_legacy(o,legacy_id="1",kind="other"))

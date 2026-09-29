from django.test import SimpleTestCase
from integrations.mham_legacy.topology import MhamTopologyError, assert_legacy_apply_allowed, decision_for, topology_summary

class MhamTopologyFoundationTests(SimpleTestCase):
    def test_contract(self):
        self.assertEqual(topology_summary(), {"EXCLUDE":7,"PARTIAL_INCLUDE":1,"SPLIT":8,"SPLIT_GROUPS":47})
    def test_partial_76(self):
        d=decision_for("76")
        self.assertEqual(d.mode,"PARTIAL_INCLUDE")
        self.assertEqual(d.kept_branch_ids,frozenset({"92"}))
    def test_split_188(self):
        d=decision_for("188")
        m=d.split_branch_to_group
        self.assertEqual(len(set(m.values())),6)
        self.assertEqual(m["215"],"188-G01")
        self.assertEqual(m["219"],"188-G05")
    def test_affected_apply_fails_closed(self):
        for bid in ("75","76","88","188","556"):
            with self.assertRaises(MhamTopologyError):
                assert_legacy_apply_allowed(bid,scan_only=False)
    def test_scan_only_allowed(self):
        for bid in ("75","76","88","188","556"):
            assert_legacy_apply_allowed(bid,scan_only=True)
    def test_normal_allowed(self):
        assert_legacy_apply_allowed("1",scan_only=False)

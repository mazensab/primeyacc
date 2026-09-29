from django.test import SimpleTestCase
from integrations.mham_legacy import sync_engine as se

class MasterMaterializerContractTests(SimpleTestCase):
    def test_function_present(self):
        self.assertTrue(callable(se.materialize_post_cutover_master))
    def test_stability_still_present(self):
        self.assertTrue(callable(se.collect_stable_post_cutover_source))
    def test_resolver_still_present(self):
        self.assertTrue(callable(se.resolve_post_cutover_master))

from unittest import TestCase
from integrations.mham_legacy.live_source import LiveSourceError, PrimeyMigrationLiveAdapter

class ObjectDomainAdapterTests(TestCase):
    def adapter(self,payload):
        a=object.__new__(PrimeyMigrationLiveAdapter)
        a._get=lambda path: payload
        return a
    def test_company_object_direct(self):
        self.assertEqual(self.adapter({"id":52,"name":"X"}).company_domain("52","company"),{"id":52,"name":"X"})
    def test_catalog_object_wrapped_data(self):
        self.assertEqual(self.adapter({"data":{"products":[]}}).company_domain("52","catalog"),{"products":[]})
    def test_permissions_object_wrapped_data(self):
        self.assertEqual(self.adapter({"data":{"roles":[]}}).company_domain("52","permissions"),{"roles":[]})
    def test_array_domain_keeps_page_parser(self):
        self.assertEqual(self.adapter({"data":[{"id":1}],"meta":{"current_page":1,"last_page":1}}).company_domain("52","branches"),[{"id":1}])
    def test_unknown_domain_fails_closed(self):
        a=object.__new__(PrimeyMigrationLiveAdapter);a._get=lambda path:self.fail("must not GET")
        with self.assertRaises(LiveSourceError):a.company_domain("52","unknown_domain")
    def test_object_domain_rejects_array(self):
        with self.assertRaises(LiveSourceError):self.adapter({"data":[{"id":1}]}).company_domain("52","catalog")

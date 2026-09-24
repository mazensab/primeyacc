from __future__ import annotations

from types import SimpleNamespace
from unittest import TestCase

from integrations.mham_legacy.live_source import (
    COMPANIES,
    PLATFORM_MANIFEST,
    MhamLiveSourceError,
    PrimeyMigrationLiveAdapter,
    company_endpoint,
)


class FakeClient:
    def __init__(self, payloads):
        self.payloads = payloads
        self.calls = []

    def get_json(self, path):
        self.calls.append(("GET", path))
        if path not in self.payloads:
            raise AssertionError(f"Unexpected path: {path}")
        return SimpleNamespace(status_code=200, data=self.payloads[path])


class PrimeyMigrationAdapterTests(TestCase):
    def test_exact_contract_paths(self):
        self.assertEqual(PLATFORM_MANIFEST, "primey-migration/platform/manifest")
        self.assertEqual(COMPANIES, "primey-migration/companies")
        self.assertEqual(
            company_endpoint("11", "subscriptions"),
            "primey-migration/companies/11/subscriptions",
        )

    def test_manifest_companies_subscriptions_get_only(self):
        client = FakeClient({
            PLATFORM_MANIFEST: {"version": "test"},
            f"{COMPANIES}?limit=1000": [{"id": 11, "name": "A"}],
            "primey-migration/companies/11/subscriptions?limit=1000": [
                {"id": 1, "business_id": 11}
            ],
        })
        adapter = PrimeyMigrationLiveAdapter(client)
        self.assertEqual(adapter.manifest()["version"], "test")
        self.assertEqual(adapter.companies()[0]["id"], 11)
        self.assertEqual(adapter.subscriptions("11")[0]["business_id"], 11)
        self.assertTrue(client.calls)
        self.assertTrue(all(method == "GET" for method, _ in client.calls))

    def test_future_company_is_discovered(self):
        client = FakeClient({
            f"{COMPANIES}?limit=1000": [
                {"id": 319, "name": "Historical"},
                {"id": 9999, "name": "Future"},
            ]
        })
        ids = {str(x["id"]) for x in PrimeyMigrationLiveAdapter(client).companies()}
        self.assertEqual(ids, {"319", "9999"})

    def test_duplicate_company_fails_closed(self):
        client = FakeClient({
            f"{COMPANIES}?limit=1000": [{"id": 11}, {"business_id": "11"}]
        })
        with self.assertRaises(MhamLiveSourceError):
            PrimeyMigrationLiveAdapter(client).companies()

    def test_invalid_domain_fails_closed(self):
        with self.assertRaises(MhamLiveSourceError):
            company_endpoint("11", "../users")

    def test_adapter_has_no_write_methods(self):
        adapter = PrimeyMigrationLiveAdapter(FakeClient({}))
        for name in ("post", "put", "patch", "delete", "post_json", "put_json", "patch_json", "delete_json"):
            self.assertFalse(hasattr(adapter, name), name)

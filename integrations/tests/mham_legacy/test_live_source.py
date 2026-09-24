from dataclasses import dataclass
from django.test import SimpleTestCase

from integrations.mham_legacy.live_source import LiveSourceError, MhamLiveSource, parse_page


@dataclass
class FakeResponse:
    data: object


class FakeClient:
    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    def get_json(self, path, *, params=None):
        self.calls.append((path, dict(params or {})))
        page = int((params or {}).get("page", 1))
        return FakeResponse(self.pages[page])


class MhamLiveSourceTests(SimpleTestCase):
    def test_parse_plain_array(self):
        p=parse_page([{"id":1}])
        self.assertEqual(p.current_page,1); self.assertEqual(p.last_page,1)

    def test_parse_data_array_with_meta(self):
        p=parse_page({"data":[{"id":1}],"meta":{"current_page":2,"last_page":3}})
        self.assertEqual((p.current_page,p.last_page),(2,3))

    def test_parse_laravel_nested_page(self):
        p=parse_page({"data":{"data":[{"id":1}],"current_page":1,"last_page":2}})
        self.assertEqual((p.current_page,p.last_page),(1,2))

    def test_unknown_shape_fails_closed(self):
        with self.assertRaisesRegex(LiveSourceError,"Unsupported"):
            parse_page({"companies":[{"id":1}]})

    def test_non_object_row_fails_closed(self):
        with self.assertRaisesRegex(LiveSourceError,"non-object"):
            parse_page({"data":["bad"]})

    def test_fetch_all_pages_uses_get_json_only(self):
        client=FakeClient({
            1:{"data":{"data":[{"id":2,"name":"A"}],"current_page":1,"last_page":2}},
            2:{"data":{"data":[{"id":654,"name":"B"}],"current_page":2,"last_page":2}},
        })
        source=MhamLiveSource(client)
        rows=source.fetch_all("/companies")
        self.assertEqual([r["id"] for r in rows],[2,654])
        self.assertEqual(client.calls,[("/companies",{"page":1}),("/companies",{"page":2})])

    def test_discovery_includes_future_company(self):
        client=FakeClient({1:[{"id":2,"name":"Existing"},{"id":9999,"name":"Future"}]})
        companies=MhamLiveSource(client).discover_companies()
        self.assertEqual([c.business_id for c in companies],["2","9999"])

    def test_duplicate_company_identity_fails_closed(self):
        client=FakeClient({1:[{"id":654},{"business_id":"654"}]})
        with self.assertRaisesRegex(Exception,"Duplicate source company"):
            MhamLiveSource(client).discover_companies()

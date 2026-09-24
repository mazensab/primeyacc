from copy import deepcopy
from django.test import SimpleTestCase
from integrations.mham_legacy.source_contract import SNAPSHOT_DOMAINS, SourceContractError, cache_wrapper, discover_companies, source_checksum, validate_cache_wrapper, validate_snapshot

def valid_snapshot():
    p = {d: [] for d in SNAPSHOT_DOMAINS}
    p["company"] = {"id": 654, "name": "New Legacy Company"}
    p["catalog"] = {"categories":[],"product_variations":[],"products":[],"tax_rates":[],"units":[],"variations":[]}
    p["permissions"] = {"data":[],"meta":{}}
    p["branches"] = [{"id":9001,"business_id":654,"name":"Main"}]
    return p

class MhamSourceContractTests(SimpleTestCase):
    def test_exact_historical_18_domains(self):
        self.assertEqual(len(SNAPSHOT_DOMAINS), 18)
    def test_accepts_contract(self):
        self.assertEqual(validate_snapshot(valid_snapshot())["company"]["id"], 654)
    def test_missing_domain_fails_closed(self):
        p=valid_snapshot(); p.pop("payments")
        with self.assertRaisesRegex(SourceContractError,"missing required domains"): validate_snapshot(p)
    def test_unknown_domain_fails_closed(self):
        p=valid_snapshot(); p["future_unknown"]=[]
        with self.assertRaisesRegex(SourceContractError,"unknown domains"): validate_snapshot(p)
    def test_cross_company_branch_blocked(self):
        p=valid_snapshot(); p["branches"][0]["business_id"]=999
        with self.assertRaisesRegex(SourceContractError,"Cross-company branch"): validate_snapshot(p)
    def test_checksum_mapping_order_stable(self):
        a=valid_snapshot(); b=deepcopy(a); b["company"]={"name":b["company"]["name"],"id":b["company"]["id"]}
        self.assertEqual(source_checksum(a),source_checksum(b))
    def test_dynamic_discovery_supports_new_ids(self):
        rows=discover_companies([{"id":654,"name":"C"},{"id":2,"name":"A"},{"id":320,"name":"B"}])
        self.assertEqual([x.business_id for x in rows],["2","320","654"])
    def test_duplicate_identity_blocked(self):
        with self.assertRaisesRegex(SourceContractError,"Duplicate source company"):
            discover_companies([{"id":654},{"business_id":"654"}])
    def test_cache_wrapper_historical_shape(self):
        w=cache_wrapper("654",valid_snapshot(),cached_at_utc="2026-09-24T00:00:00+00:00")
        self.assertEqual(set(w),{"business_id","cached_at_utc","payload","source_checksum"})
        validate_cache_wrapper(w)
    def test_cache_tamper_detected(self):
        w=cache_wrapper("654",valid_snapshot(),cached_at_utc="2026-09-24T00:00:00+00:00")
        w["payload"]["company"]["name"]="Changed"
        with self.assertRaisesRegex(SourceContractError,"checksum"): validate_cache_wrapper(w)

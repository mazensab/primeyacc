from __future__ import annotations
import hashlib, json
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable, Mapping

SOURCE_SYSTEM = "mhamcloud_v1"
SNAPSHOT_DOMAINS = ("branches","catalog","categories","company","contacts","opening_balances","opening_stock","payments","permissions","purchase_returns","purchases","roles","sale_returns","sales","subscriptions","tax_rates","units","users")
SNAPSHOT_DOMAIN_SET = frozenset(SNAPSHOT_DOMAINS)

class SourceContractError(ValueError):
    pass

def text(value: Any) -> str:
    return "" if value is None else str(value).strip()

def source_business_id(row: Mapping[str, Any]) -> str:
    return text(row.get("id") or row.get("business_id"))

def _json_default(value: Any) -> str:
    if isinstance(value, (date, datetime)): return value.isoformat()
    if isinstance(value, Decimal): return str(value)
    raise TypeError(f"Unsupported source value type: {type(value).__name__}")

def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=_json_default).encode("utf-8")

def source_checksum(payload: Mapping[str, Any]) -> str:
    return hashlib.sha256(canonical_json_bytes(payload)).hexdigest()

def validate_snapshot(payload: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        raise SourceContractError("Snapshot payload must be an object.")
    keys = set(payload)
    missing = sorted(SNAPSHOT_DOMAIN_SET - keys)
    extra = sorted(keys - SNAPSHOT_DOMAIN_SET)
    if missing: raise SourceContractError("Snapshot missing required domains: " + ",".join(missing))
    if extra: raise SourceContractError("Snapshot contains unknown domains: " + ",".join(extra))
    company = payload.get("company")
    if not isinstance(company, Mapping): raise SourceContractError("Snapshot company must be an object.")
    business_id = source_business_id(company)
    if not business_id: raise SourceContractError("Snapshot company has no stable legacy business id.")
    for domain in SNAPSHOT_DOMAINS:
        value = payload[domain]
        if domain in {"company","catalog","permissions"}:
            if not isinstance(value, Mapping): raise SourceContractError(f"Snapshot {domain} must be an object.")
        elif not isinstance(value, list):
            raise SourceContractError(f"Snapshot {domain} must be an array.")
    for branch in payload["branches"]:
        if not isinstance(branch, Mapping): raise SourceContractError("Every branch row must be an object.")
        branch_business = text(branch.get("business_id"))
        if branch_business and branch_business != business_id:
            raise SourceContractError(f"Cross-company branch row detected: {branch_business} != {business_id}")
    return dict(payload)

@dataclass(frozen=True, slots=True)
class SourceCompany:
    business_id: str
    name: str
    raw: Mapping[str, Any]

def discover_companies(rows: Iterable[Mapping[str, Any]]) -> list[SourceCompany]:
    found = {}
    for row in rows:
        if not isinstance(row, Mapping): raise SourceContractError("Company discovery row must be an object.")
        bid = source_business_id(row)
        if not bid: raise SourceContractError("Company discovery row has no id.")
        if bid in found: raise SourceContractError(f"Duplicate source company id during discovery: {bid}")
        found[bid] = SourceCompany(bid, text(row.get("name")), row)
    def key(c):
        return (0, int(c.business_id)) if c.business_id.isdigit() else (1, c.business_id)
    return sorted(found.values(), key=key)

def cache_wrapper(business_id: str, payload: Mapping[str, Any], *, cached_at_utc: str) -> dict[str, Any]:
    normalized = validate_snapshot(payload)
    bid = source_business_id(normalized["company"])
    if text(business_id) != bid: raise SourceContractError(f"Wrapper business id mismatch: {business_id} != {bid}")
    return {"business_id": bid, "cached_at_utc": text(cached_at_utc), "payload": normalized, "source_checksum": source_checksum(normalized)}

def validate_cache_wrapper(wrapper: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(wrapper, Mapping): raise SourceContractError("Cache wrapper must be an object.")
    expected = {"business_id","cached_at_utc","payload","source_checksum"}
    if set(wrapper) != expected:
        raise SourceContractError(f"Cache wrapper shape mismatch missing={sorted(expected-set(wrapper))} extra={sorted(set(wrapper)-expected)}")
    payload = validate_snapshot(wrapper["payload"])
    bid = text(wrapper["business_id"])
    if bid != source_business_id(payload["company"]): raise SourceContractError("Cache business id mismatch.")
    if text(wrapper["source_checksum"]) != source_checksum(payload): raise SourceContractError("Cache source checksum does not match canonical payload checksum.")
    return dict(wrapper)

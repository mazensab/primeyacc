from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from .source_contract import SourceCompany, SourceContractError, discover_companies


class JsonResponseLike(Protocol):
    data: Any


class ReadOnlyJsonClient(Protocol):
    def get_json(self, path: str, *, params: Mapping[str, Any] | None = None) -> JsonResponseLike: ...


class LiveSourceError(SourceContractError):
    pass

# Compatibility alias for the B4D adapter contract.
MhamLiveSourceError = LiveSourceError


@dataclass(frozen=True, slots=True)
class PageResult:
    rows: list[Mapping[str, Any]]
    current_page: int
    last_page: int


def _positive_int(value: Any, *, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def parse_page(payload: Any) -> PageResult:
    """
    Accept the response shapes observed/expected from the read-only legacy API:
    - [...]
    - {"data": [...]}
    - {"data": {"data": [...], "current_page": N, "last_page": N}}
    - {"data": [...], "meta": {"current_page": N, "last_page": N}}
    Unknown shapes fail closed.
    """
    if isinstance(payload, list):
        rows = payload
        current = last = 1
    elif isinstance(payload, Mapping):
        outer = payload
        data = outer.get("data")

        if isinstance(data, list):
            rows = data
            meta = outer.get("meta") if isinstance(outer.get("meta"), Mapping) else outer
            current = _positive_int(meta.get("current_page"), default=1)
            last = _positive_int(meta.get("last_page"), default=current)
        elif isinstance(data, Mapping) and isinstance(data.get("data"), list):
            rows = data["data"]
            current = _positive_int(data.get("current_page"), default=1)
            last = _positive_int(data.get("last_page"), default=current)
        else:
            raise LiveSourceError("Unsupported legacy API page shape.")
    else:
        raise LiveSourceError("Legacy API page must be an array or object.")

    if current > last:
        raise LiveSourceError(f"Invalid pagination: current_page={current} last_page={last}.")

    normalized = []
    for row in rows:
        if not isinstance(row, Mapping):
            raise LiveSourceError("Legacy API page contains a non-object row.")
        normalized.append(row)

    return PageResult(normalized, current, last)


class MhamLiveSource:
    """
    Read-only live discovery facade.

    It intentionally uses only client.get_json(); the underlying MhamLegacyClient
    already enforces HTTPS/same-host and rejects all provider write verbs.
    """

    def __init__(self, client: ReadOnlyJsonClient):
        self.client = client

    def fetch_all(self, path: str, *, base_params: Mapping[str, Any] | None = None) -> list[Mapping[str, Any]]:
        params = dict(base_params or {})
        page_number = 1
        all_rows: list[Mapping[str, Any]] = []

        while True:
            page_params = dict(params)
            page_params["page"] = page_number
            response = self.client.get_json(path, params=page_params)
            page = parse_page(response.data)
            all_rows.extend(page.rows)

            if page.current_page >= page.last_page:
                break

            expected_next = page.current_page + 1
            if expected_next <= page_number:
                raise LiveSourceError("Legacy API pagination did not advance.")
            page_number = expected_next

        return all_rows

    def discover_companies(self) -> list[SourceCompany]:
        return discover_companies(self.fetch_all("/companies"))

# ---- B4D Primey Migration adapter; B4A API above is preserved verbatim. ----
from urllib.parse import urlencode
from integrations.mham_legacy.client import MhamLegacyClient

PRIMEY_MIGRATION_PREFIX = "primey-migration"
PLATFORM_MANIFEST = f"{PRIMEY_MIGRATION_PREFIX}/platform/manifest"
COMPANIES = f"{PRIMEY_MIGRATION_PREFIX}/companies"

def _pm_text(value):
    return "" if value is None else str(value).strip()

def _pm_query(path, **params):
    clean={k:v for k,v in params.items() if v is not None}
    return path if not clean else f"{path}?{urlencode(clean)}"

def company_endpoint(business_id, domain):
    bid=_pm_text(business_id); dom=_pm_text(domain).strip("/")
    if not bid: raise LiveSourceError("business_id is required.")
    if not dom or "/" in dom or ".." in dom: raise LiveSourceError("Invalid company domain.")
    return f"{PRIMEY_MIGRATION_PREFIX}/companies/{bid}/{dom}"

class PrimeyMigrationLiveAdapter:
    def __init__(self, client):
        self.client=client
    @classmethod
    def from_environment(cls):
        import os
        if not os.environ.get("MHAM_LEGACY_API_TOKEN", "").strip():
            from integrations.mham_legacy.oauth import prepare_runtime_environment
            prepare_runtime_environment()
        return cls(MhamLegacyClient.from_environment())
    def _get(self,path):
        response=self.client.get_json(path)
        status=getattr(response,"status_code",None)
        if status is not None and not (200 <= int(status) < 300):
            raise LiveSourceError(f"Source GET failed with HTTP {status}: {path}")
        return getattr(response,"data",response)
    def manifest(self):
        payload=self._get(PLATFORM_MANIFEST)
        if not isinstance(payload, Mapping): raise LiveSourceError("Platform manifest must be an object.")
        return payload
    def companies(self, *, limit=1000):
        rows=parse_page(self._get(_pm_query(COMPANIES,limit=limit))).rows
        seen=set()
        for row in rows:
            bid=_pm_text(row.get("id") or row.get("business_id"))
            if not bid: raise LiveSourceError("Company row has no stable business identity.")
            if bid in seen: raise LiveSourceError(f"Duplicate company identity: {bid}")
            seen.add(bid)
        return rows
    def company_domain(self,business_id,domain,*,limit=1000):
        return parse_page(self._get(_pm_query(company_endpoint(business_id,domain),limit=limit))).rows
    def subscriptions(self,business_id,*,limit=1000):
        return self.company_domain(business_id,"subscriptions",limit=limit)

from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from .dynamic_policy import CompanyClassification, classify_discovered_companies
from .source_contract import SourceContractError, source_business_id, text


@dataclass(frozen=True, slots=True)
class ScanSummary:
    discovered: int
    eligible: int
    existing: int
    new: int
    ineligible: int
    rows: tuple[CompanyClassification, ...]


def group_subscriptions(rows: Iterable[Mapping[str, Any]]) -> dict[str, list[Mapping[str, Any]]]:
    grouped: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for row in rows:
        if not isinstance(row, Mapping):
            raise SourceContractError("Subscription scan row must be an object.")
        bid=text(row.get("business_id"))
        if not bid:
            raise SourceContractError("Subscription scan row has no business_id.")
        grouped[bid].append(row)
    return dict(grouped)


def build_scan_plan(
    company_rows: Iterable[Mapping[str, Any]],
    subscription_rows: Iterable[Mapping[str, Any]],
    existing_business_ids: Iterable[str],
) -> ScanSummary:
    companies=list(company_rows)
    grouped=group_subscriptions(subscription_rows)
    rows=tuple(classify_discovered_companies(companies,grouped,existing_business_ids))
    eligible=sum(1 for row in rows if row.eligibility.eligible)
    existing=sum(1 for row in rows if row.target_state=="EXISTING")
    new=sum(1 for row in rows if row.target_state=="NEW")
    ineligible=sum(1 for row in rows if row.target_state=="INELIGIBLE")
    if eligible != existing + new:
        raise SourceContractError("Scan classification invariant failed.")
    return ScanSummary(len(rows),eligible,existing,new,ineligible,rows)

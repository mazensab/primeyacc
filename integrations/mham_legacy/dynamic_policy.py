from __future__ import annotations
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Iterable, Mapping

from .source_contract import SourceCompany, SourceContractError, discover_companies, text

ELIGIBILITY_CUTOFF = date(2025, 1, 1)
ACTIVE_STATUSES = frozenset({"approved", "active"})

@dataclass(frozen=True, slots=True)
class EligibilityDecision:
    business_id: str
    eligible: bool
    reason: str
    selected_subscription_id: str = ""
    selected_end_date: date | None = None

@dataclass(frozen=True, slots=True)
class CompanyClassification:
    business_id: str
    name: str
    eligibility: EligibilityDecision
    target_state: str  # EXISTING | NEW | INELIGIBLE

def _as_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raw = text(value)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError as exc:
        raise SourceContractError(f"Invalid subscription date: {raw}") from exc

def evaluate_subscriptions(business_id: str, rows: Iterable[Mapping[str, Any]]) -> EligibilityDecision:
    bid = text(business_id)
    if not bid:
        raise SourceContractError("Eligibility requires a business id.")

    candidates = []
    for row in rows:
        if not isinstance(row, Mapping):
            raise SourceContractError("Subscription row must be an object.")
        row_bid = text(row.get("business_id"))
        if row_bid and row_bid != bid:
            raise SourceContractError(f"Cross-company subscription row: {row_bid} != {bid}")
        end_date = _as_date(row.get("end_date"))
        status = text(row.get("status")).lower()
        sid = text(row.get("id"))
        candidates.append((end_date, status, sid))

    if not candidates:
        return EligibilityDecision(bid, False, "NO_SUBSCRIPTION")

    # Historical Phase49 rule: active OR latest subscription ending on/after 2025-01-01.
    active = [row for row in candidates if row[1] in ACTIVE_STATUSES]
    if active:
        selected = max(active, key=lambda x: (x[0] or date.max, x[2]))
        return EligibilityDecision(bid, True, "ACTIVE_SUBSCRIPTION", selected[2], selected[0])

    dated = [row for row in candidates if row[0] is not None]
    if not dated:
        return EligibilityDecision(bid, False, "NO_DATED_SUBSCRIPTION")

    latest = max(dated, key=lambda x: (x[0], x[2]))
    if latest[0] >= ELIGIBILITY_CUTOFF:
        return EligibilityDecision(bid, True, "LATEST_END_ON_OR_AFTER_CUTOFF", latest[2], latest[0])

    return EligibilityDecision(bid, False, "LATEST_END_BEFORE_CUTOFF", latest[2], latest[0])

def classify_discovered_companies(
    company_rows: Iterable[Mapping[str, Any]],
    subscriptions_by_business: Mapping[str, Iterable[Mapping[str, Any]]],
    existing_business_ids: Iterable[str],
) -> list[CompanyClassification]:
    existing = {text(x) for x in existing_business_ids if text(x)}
    discovered = discover_companies(company_rows)
    result = []

    for company in discovered:
        decision = evaluate_subscriptions(
            company.business_id,
            subscriptions_by_business.get(company.business_id, ()),
        )
        if not decision.eligible:
            state = "INELIGIBLE"
        elif company.business_id in existing:
            state = "EXISTING"
        else:
            state = "NEW"
        result.append(CompanyClassification(company.business_id, company.name, decision, state))

    return result

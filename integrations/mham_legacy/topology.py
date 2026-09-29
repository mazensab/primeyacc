from __future__ import annotations
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path.cwd()
DECISION_FILE = ROOT / "deployment_tools" / "company_split" / "v2_company_split_decision_map.json"
SOURCE_SYSTEM = "mhamcloud_v1"

class MhamTopologyError(RuntimeError):
    pass

@dataclass(frozen=True, slots=True)
class SourceDecision:
    business_id: str
    mode: str
    raw: dict[str, Any]

    @property
    def kept_branch_ids(self) -> frozenset[str]:
        return frozenset(str(x.get("legacy_branch_id")).strip() for x in self.raw.get("kept_branches", []) if isinstance(x, dict) and str(x.get("legacy_branch_id") or "").strip())

    @property
    def excluded_branch_ids(self) -> frozenset[str]:
        return frozenset(str(x.get("legacy_branch_id")).strip() for x in self.raw.get("excluded_branches", []) if isinstance(x, dict) and str(x.get("legacy_branch_id") or "").strip())

    @property
    def split_branch_to_group(self) -> dict[str, str]:
        result: dict[str, str] = {}
        for group in self.raw.get("output_groups", []):
            gid = str(group.get("group_id") or "").strip()
            if not gid:
                raise MhamTopologyError(f"Split group without group_id for {self.business_id}")
            for branch in group.get("branches", []):
                bid = str(branch.get("legacy_branch_id") or "").strip()
                if not bid or bid in result:
                    raise MhamTopologyError(f"Invalid/duplicate split branch {bid} for {self.business_id}")
                result[bid] = gid
        return result

@lru_cache(maxsize=1)
def decision_map() -> dict[str, SourceDecision]:
    if not DECISION_FILE.is_file():
        raise MhamTopologyError(f"Decision map missing: {DECISION_FILE}")
    root=json.loads(DECISION_FILE.read_text(encoding="utf-8-sig"))
    if root.get("schema") != "primeyacc.company_split_decision_map.v1" or root.get("source_system") != SOURCE_SYSTEM:
        raise MhamTopologyError("Decision-map contract mismatch.")
    out: dict[str, SourceDecision] = {}
    for row in root.get("companies", []):
        if not isinstance(row, dict):
            continue
        bid=str(row.get("legacy_company_id") or "").strip()
        mode=str(row.get("mode") or "").strip().upper()
        if not bid:
            continue
        if mode not in {"EXCLUDE","PARTIAL_INCLUDE","SPLIT"} or bid in out:
            raise MhamTopologyError(f"Invalid decision for {bid}")
        out[bid]=SourceDecision(bid,mode,row)
    return out

def decision_for(business_id: str) -> SourceDecision | None:
    return decision_map().get(str(business_id).strip())

def assert_legacy_apply_allowed(business_id: str, *, scan_only: bool) -> None:
    d=decision_for(business_id)
    if d is None or scan_only:
        return
    raise MhamTopologyError(f"POST_CUTOVER_SPLIT_AWARE_APPLY_REQUIRED business_id={d.business_id} mode={d.mode}")

def topology_summary() -> dict[str, int]:
    out={"EXCLUDE":0,"PARTIAL_INCLUDE":0,"SPLIT":0,"SPLIT_GROUPS":0}
    for d in decision_map().values():
        out[d.mode]+=1
        if d.mode=="SPLIT":
            out["SPLIT_GROUPS"]+=len(d.raw.get("output_groups",[]))
    return out

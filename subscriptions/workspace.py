from __future__ import annotations
from dataclasses import dataclass
from typing import Any
from companies.models import BusinessActivityCode
from subscriptions.access_policy import SubscriptionWorkspaceAccess, evaluate_subscription_access

CORE_MODULES=frozenset({"general_accounting","sales_pos","purchases_suppliers","inventory_warehouses","hr","whatsapp_communications","advanced_reports"})
ACTIVITY_MODULES={
    BusinessActivityCode.COMMERCE:CORE_MODULES,
    BusinessActivityCode.RESTAURANT:CORE_MODULES|{"restaurant"},
    BusinessActivityCode.SERVICES:CORE_MODULES|{"services"},
    BusinessActivityCode.MANUFACTURING:CORE_MODULES|{"manufacturing"},
    BusinessActivityCode.JEWELRY:CORE_MODULES|{"jewelry"},
    BusinessActivityCode.CONTRACTING:CORE_MODULES|{"contracting"},
}

@dataclass(frozen=True)
class EffectiveWorkspaceContract:
    activity_code:str
    branch_id:int|None
    branch_inherits_company_activity:bool
    subscription_access:str
    subscription_reason:str
    plan_id:int|None
    plan_features:tuple[str,...]
    activity_modules:tuple[str,...]
    effective_modules:tuple[str,...]
    unrestricted_plan:bool
    can_use_workspace:bool
    limits:dict[str,int]
    def as_dict(self)->dict[str,Any]:
        return {
            "activity_code":self.activity_code,"branch_id":self.branch_id,
            "branch_inherits_company_activity":self.branch_inherits_company_activity,
            "subscription_access":self.subscription_access,"subscription_reason":self.subscription_reason,
            "plan_id":self.plan_id,"plan_features":list(self.plan_features),
            "activity_modules":list(self.activity_modules),"effective_modules":list(self.effective_modules),
            "unrestricted_plan":self.unrestricted_plan,"can_use_workspace":self.can_use_workspace,
            "limits":dict(self.limits),
        }

def resolve_effective_workspace(*,company,branch=None):
    policy=evaluate_subscription_access(company)
    activity=branch.effective_activity_code if branch is not None else company.effective_activity_code
    activity_modules=frozenset(ACTIVITY_MODULES.get(activity,CORE_MODULES))
    plan=None
    if getattr(policy,"subscription_id",None):
        from subscriptions.models import CompanySubscription
        sub=CompanySubscription.objects.select_related("plan").filter(company=company,pk=policy.subscription_id).first()
        plan=sub.plan if sub else None
    pf=frozenset(str(x).strip().lower() for x in getattr(plan,"features",[]) if str(x).strip()) if isinstance(getattr(plan,"features",[]),list) else frozenset()
    unrestricted="all" in pf
    effective=activity_modules if unrestricted else activity_modules.intersection(pf)
    allowed=bool(policy.access==SubscriptionWorkspaceAccess.FULL and policy.can_use_workspace)
    if not allowed: effective=frozenset()
    return EffectiveWorkspaceContract(
        activity,getattr(branch,"id",None),bool(branch is None or getattr(branch,"activity_profile_id",None) is None),
        policy.access,policy.reason,getattr(plan,"id",None),tuple(sorted(pf)),tuple(sorted(activity_modules)),
        tuple(sorted(effective)),unrestricted,allowed,
        {"max_users":int(getattr(plan,"max_users",0) or 0),"max_branches":int(getattr(plan,"max_branches",0) or 0),
         "max_warehouses":int(getattr(plan,"max_warehouses",0) or 0),"max_pos":int(getattr(plan,"max_pos",0) or 0)}
    )

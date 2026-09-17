from __future__ import annotations
from django.core.exceptions import ValidationError
from django.db import transaction
from accounts.models import BranchAccessMode, CompanyMembershipBranchGrant, CompanyMembershipBranchPolicy
from companies.models import Branch

class BranchAccessDenied(Exception):
    pass

def get_policy(membership):
    if membership is None:
        return None
    try:
        return membership.branch_policy
    except CompanyMembershipBranchPolicy.DoesNotExist:
        return None

def accessible_branches(membership):
    qs = Branch.objects.none()
    if membership is None or not membership.is_active_membership:
        return qs
    policy = get_policy(membership)
    if policy is None or policy.mode == BranchAccessMode.LEGACY_UNRESOLVED:
        return qs
    base = Branch.objects.filter(company_id=membership.company_id, is_active=True)
    if policy.mode == BranchAccessMode.ALL:
        return base.order_by("-is_default", "id")
    return base.filter(membership_access_grants__policy=policy).distinct().order_by("-is_default", "id")

def resolve_branch(membership, branch_id=None, *, required=False):
    if membership is None or not membership.is_active_membership:
        if required: raise BranchAccessDenied("Active company membership is required.")
        return None
    policy = get_policy(membership)
    if policy is None or policy.mode == BranchAccessMode.LEGACY_UNRESOLVED:
        if required: raise BranchAccessDenied("Branch access is unresolved.")
        return None
    if branch_id not in (None, "", 0, "0"):
        try:
            branch = Branch.resolve_assignable_for_company(company=membership.company, branch_id=branch_id, required=True, field_name="branch_id")
        except ValidationError as exc:
            raise BranchAccessDenied(str(exc)) from exc
        if not policy.branch_is_explicitly_allowed(branch):
            raise BranchAccessDenied("Branch is not authorized for this membership.")
        return branch
    for candidate in (policy.last_active_branch, policy.default_branch):
        if candidate is not None and policy.branch_is_explicitly_allowed(candidate):
            return candidate
    branch = accessible_branches(membership).first()
    if branch is None and required: raise BranchAccessDenied("No active authorized branch is available.")
    return branch

def has_branch_permission(membership, permission, *, branch_id=None):
    if membership is None or not membership.has_company_permission(permission):
        return False
    try: branch = resolve_branch(membership, branch_id, required=True)
    except BranchAccessDenied: return False
    policy = get_policy(membership)
    if policy.mode == BranchAccessMode.ALL: return True
    if policy.mode != BranchAccessMode.RESTRICTED: return False
    grant = policy.branch_grants.filter(branch_id=branch.id).first()
    return bool(grant and (not grant.permissions or permission in grant.permissions))

@transaction.atomic
def configure_branch_access(membership, *, mode, branch_ids=(), default_branch_id=None, permissions_by_branch=None):
    if not membership.is_active_membership: raise ValidationError({"membership":"Active membership is required."})
    if mode not in BranchAccessMode.values: raise ValidationError({"mode":"Invalid branch access mode."})
    ids = {int(x) for x in branch_ids}
    permissions_by_branch = permissions_by_branch or {}
    if mode == BranchAccessMode.RESTRICTED and not ids: raise ValidationError({"branch_ids":"Restricted access requires at least one branch."})
    if mode != BranchAccessMode.RESTRICTED and ids: raise ValidationError({"branch_ids":"Explicit grants require RESTRICTED mode."})
    branches = {bid: Branch.resolve_assignable_for_company(company=membership.company, branch_id=bid, required=True, field_name="branch_ids") for bid in sorted(ids)}
    default = None
    if default_branch_id not in (None,"",0,"0"):
        default = Branch.resolve_assignable_for_company(company=membership.company, branch_id=default_branch_id, required=True, field_name="default_branch_id")
        if mode == BranchAccessMode.RESTRICTED and default.id not in ids: raise ValidationError({"default_branch_id":"Default branch must be granted."})
    policy,_ = CompanyMembershipBranchPolicy.objects.select_for_update().get_or_create(membership=membership)
    policy.mode, policy.default_branch = mode, default
    if policy.last_active_branch_id and (mode == BranchAccessMode.LEGACY_UNRESOLVED or (mode == BranchAccessMode.RESTRICTED and policy.last_active_branch_id not in ids)):
        policy.last_active_branch = None
    policy.save()
    policy.branch_grants.all().delete()
    if mode == BranchAccessMode.RESTRICTED:
        for bid, branch in branches.items():
            CompanyMembershipBranchGrant.objects.create(policy=policy, branch=branch, permissions=permissions_by_branch.get(bid, []))
    return policy

@transaction.atomic
def set_last_active_branch(membership, branch_id):
    branch = resolve_branch(membership, branch_id, required=True)
    policy = get_policy(membership)
    policy.last_active_branch = branch
    policy.save(update_fields=["last_active_branch","updated_at"])
    return branch

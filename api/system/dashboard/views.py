from __future__ import annotations
from datetime import timedelta
from typing import Any
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET
from accounts.models import SystemRole, UserProfile, UserProfileStatus
from api.permissions import user_has_system_permission
from api.system.platform_reports.views import _build_report, _report_filters
from billing.models import PlatformSubscriptionPayment
from companies.models import Company, CompanyStatus
from subscriptions.models import CompanySubscription

DASHBOARD_PERMISSION = "system.dashboard.view"
DEFAULT_LIMIT = 6
MAX_LIMIT = 20

def _iso(v: Any): return v.isoformat() if v else None
def _money(v: Any): return f"{v:.2f}" if v is not None else "0.00"
def _limit(r):
    try: v=int(r.GET.get("limit", DEFAULT_LIMIT))
    except (TypeError,ValueError): return DEFAULT_LIMIT
    return min(max(v,1),MAX_LIMIT)
def _company_name(c): return getattr(c,"display_name",None) or getattr(c,"name","")
def _company_payload(c):
    return {"id":c.id,"name":_company_name(c),"company_code":getattr(c,"company_code",""),"status":getattr(c,"status",""),"is_active":getattr(c,"is_active",True),"email":getattr(c,"email",""),"city":getattr(c,"city",""),"region":getattr(c,"region",""),"created_at":_iso(getattr(c,"created_at",None))}
def _subscription_payload(s):
    return {"id":s.id,"company":{"id":s.company_id,"name":_company_name(s.company),"company_code":getattr(s.company,"company_code","")},"plan":{"id":s.plan_id,"name":s.plan.name,"code":s.plan.code,"slug":s.plan.slug},"status":s.status,"action":s.action,"billing_cycle":s.billing_cycle,"start_date":_iso(s.start_date),"end_date":_iso(s.end_date),"days_remaining":s.days_remaining,"is_current":s.is_current,"is_expired_by_date":s.is_expired_by_date,"is_in_grace":s.is_in_active_grace,"grace_days_remaining":s.grace_days_remaining,"grace_expires_at":_iso(s.active_grace_expires_at),"auto_renew":s.auto_renew,"total_amount":_money(s.total_amount),"currency_code":"SAR","paid_at":_iso(s.paid_at),"activated_at":_iso(s.activated_at),"created_at":_iso(s.created_at),"updated_at":_iso(s.updated_at)}
def _user_payload(p):
    u=p.user; n=u.get_full_name().strip()
    return {"id":u.id,"profile_id":p.id,"username":u.get_username(),"email":u.email or "","name":p.display_name or n or u.get_username(),"status":p.status,"is_active":u.is_active,"is_system_user":p.is_system_user,"can_access_system":p.can_access_system,"system_role":p.system_role,"last_seen_at":_iso(p.last_seen_at),"created_at":_iso(p.created_at)}
def _payment_payload(p):
    plan=getattr(p.subscription,"plan",None)
    return {"id":p.id,"payment_reference":p.payment_reference,"status":p.status,"gateway":p.gateway,"payment_method":p.payment_method,"amount":_money(p.amount),"currency_code":p.currency_code or "SAR","transaction_reference":p.transaction_reference,"billing_reference":p.billing_reference,"company":{"id":p.company_id,"name":_company_name(p.company),"company_code":getattr(p.company,"company_code","")},"subscription":{"id":p.subscription_id,"status":p.subscription.status,"plan":{"id":plan.id,"name":plan.name,"slug":plan.slug} if plan else None},"initiated_at":_iso(p.initiated_at),"paid_at":_iso(p.paid_at),"failed_at":_iso(p.failed_at),"created_at":_iso(p.created_at)}
def _company_stats():
    x=Company.objects.aggregate(total=Count("id"),active=Count("id",filter=Q(is_active=True)),inactive=Count("id",filter=Q(is_active=False)),trial=Count("id",filter=Q(status=CompanyStatus.TRIAL)),status_active=Count("id",filter=Q(status=CompanyStatus.ACTIVE)),suspended=Count("id",filter=Q(status=CompanyStatus.SUSPENDED)),expired=Count("id",filter=Q(status=CompanyStatus.EXPIRED)),cancelled=Count("id",filter=Q(status=CompanyStatus.CANCELLED)))
    return {k:int(v or 0) for k,v in x.items()}
def _user_stats():
    x=UserProfile.objects.aggregate(total=Count("id"),active=Count("id",filter=Q(status=UserProfileStatus.ACTIVE)),suspended=Count("id",filter=Q(status=UserProfileStatus.SUSPENDED)),system_users=Count("id",filter=Q(is_system_user=True)),active_system_users=Count("id",filter=Q(status=UserProfileStatus.ACTIVE,is_system_user=True)&~Q(system_role=SystemRole.NONE)))
    return {k:int(v or 0) for k,v in x.items()}

@login_required
@require_GET
def system_dashboard_overview(request: HttpRequest):
    if not user_has_system_permission(request.user,DASHBOARD_PERMISSION):
        return JsonResponse({"ok":False,"code":"SYSTEM_DASHBOARD_VIEW_PERMISSION_REQUIRED","message":"You are not authorized to view the system dashboard."},status=403)
    filters=_report_filters(request)
    if isinstance(filters,JsonResponse): return filters
    limit=_limit(request); today=timezone.localdate(); upper=today+timedelta(days=30)
    base=CompanySubscription.objects.select_related("company","plan")
    latest_companies=Company.objects.order_by("-created_at","-id")[:limit]
    latest_subscriptions=base.order_by("-created_at","-id")[:limit]
    expired=base.filter(status=CompanySubscription.Status.EXPIRED).order_by("-end_date","-updated_at","-id")[:limit]
    expiring=base.filter(status__in=[CompanySubscription.Status.ACTIVE,CompanySubscription.Status.TRIAL],end_date__gte=today,end_date__lte=upper).order_by("end_date","id")[:limit]
    users=UserProfile.objects.select_related("user").order_by("-created_at","-id")[:limit]
    payments=PlatformSubscriptionPayment.objects.select_related("company","subscription","subscription__plan").order_by("-created_at","-id")[:limit]
    f=_build_report(filters)
    alerts={"subscriptions_expiring_7_days":f["subscriptions"]["upcoming_renewals"]["next_7_days"],"subscriptions_expiring_30_days":f["subscriptions"]["upcoming_renewals"]["next_30_days"],"active_grace":f["subscriptions"]["upcoming_renewals"]["active_grace"],"pending_payments":f["payments"]["status"]["pending"],"processing_payments":f["payments"]["status"]["processing"],"failed_payments":f["payments"]["status"]["failed"],"open_receivables":f["billing_documents"]["open_receivables"],"reconciliation_discrepancies":f["reconciliation"]["discrepancy"],"reconciliation_errors":f["reconciliation"]["error"]}
    return JsonResponse({"ok":True,"data":{"generated_at":timezone.now().isoformat(),"currency_code":"SAR","filters":f["filters"],"summary":{"companies":_company_stats(),"users":_user_stats(),"subscriptions":f["subscriptions"],"revenue":f["revenue"],"payments":f["payments"],"billing_documents":f["billing_documents"],"refunds":f["refunds"],"adjustments":f["adjustments"],"reconciliation":f["reconciliation"]},"alerts":alerts,"latest":{"companies":[_company_payload(x) for x in latest_companies],"subscriptions":[_subscription_payload(x) for x in latest_subscriptions],"expired_subscriptions":[_subscription_payload(x) for x in expired],"expiring_subscriptions":[_subscription_payload(x) for x in expiring],"users":[_user_payload(x) for x in users],"payments":[_payment_payload(x) for x in payments]},"meta":{"limit":limit,"read_only":True,"financial_source":"platform_reports","currency_code":"SAR"}}})
system_dashboard_overview.required_system_permissions=[DASHBOARD_PERMISSION]

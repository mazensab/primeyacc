from pathlib import Path
import subprocess,sys,hashlib,json
R=Path.cwd();OUT=R/"v2_26_b2c_company11_pilot_discovery.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=45):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return p.returncode,p.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C COMPANY 11 PILOT =====",flush=True)
if not PAGE.exists() or sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: B2B page mismatch")
print("GUARDS=PASS",flush=True)
probe=r"""
import os,json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Company,Branch
from accounts.models import CompanyMembership
from subscriptions.models import CompanySubscription
from billing.models import PlatformSubscriptionPayment,PlatformBillingDocument
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
c=Company.objects.select_related('owner').get(pk=11)
print('COMPANY='+json.dumps({'id':c.id,'code':c.company_code,'name':c.name,'owner_id':c.owner_id,'cr':c.commercial_registration,'tax':c.tax_number,'email':c.email,'phone':c.phone,'mobile':c.mobile,'city':c.city,'address':c.address},ensure_ascii=False),flush=True)
bs=list(Branch.objects.filter(company=c).values('id','branch_code','name','is_default','email','phone','mobile','city','district','region','national_address_line'))
print('BRANCHES='+json.dumps(bs,ensure_ascii=False),flush=True)
ms=list(CompanyMembership.objects.filter(company=c).select_related('user').values('id','user_id','user__username','user__email','role','status','is_primary'))
print('MEMBERSHIPS='+json.dumps(ms,ensure_ascii=False),flush=True)
subs=list(CompanySubscription.objects.filter(company=c).select_related('plan').values('id','plan_id','plan__name','status','billing_cycle','start_date','end_date','price','total_amount','billing_reference','created_by_id'))
for x in subs:
 for k,v in list(x.items()):
  if hasattr(v,'isoformat'):x[k]=v.isoformat()
  elif v is not None and not isinstance(v,(str,int,float,bool)):x[k]=str(v)
print('SUBSCRIPTIONS='+json.dumps(subs,ensure_ascii=False),flush=True)
pays=list(PlatformSubscriptionPayment.objects.filter(company=c).values('id','subscription_id','status','gateway','payment_method','gateway_payment_id','transaction_reference','billing_reference','amount','currency_code','paid_at','created_by_id','invoice_id','receipt_id'))
for x in pays:
 for k,v in list(x.items()):
  if hasattr(v,'isoformat'):x[k]=v.isoformat()
  elif v is not None and not isinstance(v,(str,int,float,bool)):x[k]=str(v)
print('PAYMENTS='+json.dumps(pays,ensure_ascii=False),flush=True)
docs=list(PlatformBillingDocument.objects.filter(company=c).values('id','document_type','document_number','subscription_id','payment_method','transaction_reference','billing_reference','total_amount','created_by_id'))
for x in docs:
 for k,v in list(x.items()):
  if v is not None and not isinstance(v,(str,int,float,bool)):x[k]=str(v)
print('DOCUMENTS='+json.dumps(docs,ensure_ascii=False),flush=True)
# Only company 11 mappings; no global scan.
maps=list(LegacyObjectMap.objects.filter(company_id=11,source_system='mhamcloud_v1').values('id','source_table','legacy_id','legacy_company_id','target_object_id','metadata').order_by('id'))
print('MAP_COUNT='+str(len(maps)),flush=True)
relevant=[x for x in maps if x['source_table'] in ('business','business_locations','branches','locations','subscriptions','users')]
print('RELEVANT_MAPS='+json.dumps(relevant,ensure_ascii=False,default=str),flush=True)
legacy_company='652'
path=SOURCE_CACHE_DIR/f'company_{legacy_company}.json'
root=json.loads(path.read_text(encoding='utf-8-sig'));src=root.get('payload',{})
company=src.get('company',{});branches=src.get('branches',[]);users=src.get('users',[]);subscriptions=src.get('subscriptions',[])
bl1=next((b for b in branches if str(b.get('location_id') or '').upper()=='BL0001'),{})
owner=next((u for u in users if str(u.get('id'))==str(company.get('owner_id'))),{})
print('LEGACY_COMPANY='+json.dumps(company,ensure_ascii=False),flush=True)
print('LEGACY_BL1='+json.dumps(bl1,ensure_ascii=False),flush=True)
print('LEGACY_OWNER='+json.dumps(owner,ensure_ascii=False),flush=True)
print('LEGACY_SUBSCRIPTIONS='+json.dumps(subscriptions,ensure_ascii=False),flush=True)
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],45)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO",flush=True);sys.exit(2)
if rc:print(data,flush=True);sys.exit("PILOT PROBE FAILED")
OUT.write_text("===== PRIMEYACC V2-26 B2C COMPANY 11 PILOT DISCOVERY =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT=PASS\n",encoding="utf8")
print(f"REPORT={OUT.name}",flush=True);print(f"SIZE={OUT.stat().st_size}",flush=True);print(f"SHA256={sha(OUT)}",flush=True);print("MUTATION_PERFORMED=NO",flush=True);print("RESULT=PASS",flush=True)

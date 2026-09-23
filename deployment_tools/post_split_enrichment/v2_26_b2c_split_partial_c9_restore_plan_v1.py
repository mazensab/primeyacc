from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_split_partial_c9_restore_plan_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C SPLIT/PARTIAL C9 RESTORE PLAN V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections,re
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Branch
from subscriptions.models import CompanySubscription
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
groups={'76':[92],'88':[106,752,107,751,108,753,735,739],'174':[197,207,208,209,210],'195':[227,228,229,230,231,232,416]}
stats=collections.Counter();plans=[]
for legacy,bids in groups.items():
 company_ids=sorted(set(Branch.objects.filter(branch_code__in=[f'LEGACY-BR-{x}' for x in bids]).values_list('company_id',flat=True)))
 # Proven split propagation: current cloned subscriptions explicitly tagged PRIMEY_SPLIT.
 clone_targets=collections.defaultdict(list)
 for s in CompanySubscription.objects.filter(company_id__in=company_ids).values('id','company_id','billing_reference','notes'):
  m=re.search(r'\[PRIMEY_SPLIT ([^\]]+)\]',s.get('notes') or '')
  if m:clone_targets[s['billing_reference']].append({'company_id':s['company_id'],'subscription_id':s['id'],'marker':m.group(1)})
 # Original company is the one retaining the legacy company code/business map.
 bmap=LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table='business',legacy_id=legacy).values('company_id','run_id').first()
 if not bmap:continue
 original=bmap['company_id'];cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 payload=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 mapped=set(LegacyObjectMap.objects.filter(company_id=original,source_system='mhamcloud_v1',source_table='subscriptions').values_list('legacy_id',flat=True))
 candidates=[x for x in (payload.get('subscriptions') or []) if str(x.get('id')) not in mapped and str(x.get('status') or '').lower()=='approved' and x.get('start_date') and x.get('end_date')]
 for sub in candidates:
  sid=str(sub['id'])
  # History contract: historical source subscription belongs to original lineage.
  # Propagate to split companies only if there is explicit evidence that historical rows were cloned there.
  historical_clones=[]
  for cid in company_ids:
   if cid==original:continue
   hits=list(CompanySubscription.objects.filter(company_id=cid,start_date=sub['start_date'],end_date=sub['end_date']).values_list('id',flat=True))
   if hits:historical_clones.append({'company_id':cid,'existing_ids':hits})
  action='RESTORE_ORIGINAL_ONLY'
  if historical_clones:action='REVIEW_EXISTING_HISTORICAL_CLONES'
  stats[action]+=1
  plans.append({'legacy_company_id':legacy,'legacy_subscription_id':sid,'original_company_id':original,'all_split_company_ids':company_ids,'start_date':sub['start_date'],'end_date':sub['end_date'],'package_id':sub.get('package_id'),'paid_via':sub.get('paid_via'),'transaction_reference':sub.get('payment_transaction_id'),'existing_historical_clones':historical_clones,'current_split_clone_evidence':clone_targets,'proposed_action':action})
print('STATS='+json.dumps(dict(stats),ensure_ascii=False))
print('PLAN_BEGIN')
for x in plans:print(json.dumps(x,ensure_ascii=False,default=str))
print('PLAN_END')
assert len(plans)==7,len(plans)
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C SPLIT/PARTIAL C9 RESTORE PLAN V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

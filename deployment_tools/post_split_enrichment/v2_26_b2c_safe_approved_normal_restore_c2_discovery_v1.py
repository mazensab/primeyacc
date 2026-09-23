from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_safe_approved_normal_restore_c2_discovery_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C SAFE APPROVED NORMAL RESTORE C2 DISCOVERY V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from subscriptions.models import CompanySubscription,SubscriptionPlan
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
excluded={'473','431','307','429','119','75'}
partial={'76'}
split={'478','88','195','556','174','290','299'}
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions']).values('company_id','source_table','legacy_id','target_object_id','metadata').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
stats=collections.Counter();rows=[]
model_fields={f.name for f in CompanySubscription._meta.fields}
plan_fields={f.name for f in SubscriptionPlan._meta.fields}
print('COMPANY_SUBSCRIPTION_FIELDS='+json.dumps(sorted(model_fields)))
print('SUBSCRIPTION_PLAN_FIELDS='+json.dumps(sorted(plan_fields)))
for cid,g in sorted(byc.items()):
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id'])
 if legacy in excluded or legacy in partial or legacy in split:continue
 cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:p=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 mapped={str(x['legacy_id']) for x in g.get('subscriptions',[])}
 for sub in (p.get('subscriptions') or []):
  sid=str(sub.get('id') or '')
  if sid in mapped:continue
  if str(sub.get('status') or '').lower()!='approved' or not sub.get('start_date') or not sub.get('end_date'):continue
  stats['candidates']+=1
  try:pd=json.loads(sub.get('package_details') or '{}') if isinstance(sub.get('package_details'),str) else (sub.get('package_details') or {})
  except Exception:pd={}
  package_id=sub.get('package_id')
  # Find existing plan by legacy package identity in plan metadata/code/name; discovery only.
  plan_matches=[]
  for plan in SubscriptionPlan.objects.all().only(*[x for x in ['id','code','name','metadata'] if x in plan_fields]):
   blob=json.dumps({k:getattr(plan,k,None) for k in ['code','name','metadata'] if k in plan_fields},ensure_ascii=False,default=str)
   if package_id is not None and str(package_id) in blob:plan_matches.append(plan.id)
  # Detect an existing equivalent subscription by company/date/amount to avoid duplicate creation.
  q=CompanySubscription.objects.filter(company_id=cid)
  if 'start_date' in model_fields:q=q.filter(start_date=sub.get('start_date'))
  if 'end_date' in model_fields:q=q.filter(end_date=sub.get('end_date'))
  equiv=list(q.values_list('id',flat=True)[:5])
  if equiv:stats['equivalent_existing_subscription']+=1
  if len(plan_matches)==1:stats['unique_plan_match']+=1
  elif len(plan_matches)==0:stats['no_plan_match']+=1
  else:stats['ambiguous_plan_match']+=1
  rows.append({'company_id':cid,'legacy_company_id':legacy,'legacy_subscription_id':sid,'package_id':package_id,'package_name':pd.get('name') if isinstance(pd,dict) else None,'start_date':sub.get('start_date'),'end_date':sub.get('end_date'),'price':sub.get('price'),'paid_via':sub.get('paid_via'),'transaction_reference':sub.get('payment_transaction_id'),'plan_matches':plan_matches,'equivalent_existing_ids':equiv})
print('STATS='+json.dumps(dict(sorted(stats.items())),ensure_ascii=False))
print('ROWS_BEGIN')
for x in rows:print(json.dumps(x,ensure_ascii=False))
print('ROWS_END')
assert stats['candidates']==166,stats
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C SAFE APPROVED NORMAL RESTORE C2 DISCOVERY V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

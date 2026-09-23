from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_legacy_package_plan_contract_c3_discovery_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C LEGACY PACKAGE PLAN CONTRACT C3 DISCOVERY V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from subscriptions.models import CompanySubscription,SubscriptionPlan
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
plans=list(SubscriptionPlan.objects.order_by('id').values())
print('PLANS_BEGIN')
for x in plans:print(json.dumps(x,ensure_ascii=False,default=str))
print('PLANS_END')
# Infer package->plan only from already-mapped subscriptions (historical truth already accepted in Primey).
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions']).values('company_id','source_table','legacy_id','target_object_id','metadata').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
pair=collections.defaultdict(collections.Counter); samples=collections.defaultdict(list)
for cid,g in byc.items():
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:p=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 src={str(x.get('id')):x for x in (p.get('subscriptions') or [])}
 for m in g.get('subscriptions',[]):
  sid=str(m['legacy_id']);sub=src.get(sid)
  if not sub:continue
  tid=str(m.get('target_object_id') or '')
  if not tid.isdigit():continue
  cs=CompanySubscription.objects.filter(pk=int(tid),company_id=cid).values('id','plan_id','start_date','end_date','status','price','total_amount').first()
  if not cs:continue
  pkg=str(sub.get('package_id') or '')
  if not pkg:continue
  pair[pkg][cs['plan_id']]+=1
  if len(samples[pkg])<8:samples[pkg].append({'company_id':cid,'legacy_subscription_id':sid,'primey_subscription_id':cs['id'],'package_id':pkg,'plan_id':cs['plan_id'],'legacy_status':sub.get('status'),'primey_status':cs['status'],'legacy_start':sub.get('start_date'),'primey_start':str(cs['start_date']),'legacy_end':sub.get('end_date'),'primey_end':str(cs['end_date']),'primey_price':str(cs['price']),'primey_total':str(cs['total_amount'])})
print('PACKAGE_PLAN_COUNTS_BEGIN')
for pkg,c in sorted(pair.items(),key=lambda x:int(x[0]) if x[0].isdigit() else 999999):
 print(json.dumps({'package_id':pkg,'plan_counts':dict(c),'unambiguous_from_existing':len(c)==1,'samples':samples[pkg]},ensure_ascii=False))
print('PACKAGE_PLAN_COUNTS_END')
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C LEGACY PACKAGE PLAN CONTRACT C3 DISCOVERY V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

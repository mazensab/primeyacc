from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_safe_restore_c4_exact_plan_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C SAFE RESTORE C4 EXACT PLAN V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections,decimal
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from subscriptions.models import CompanySubscription,SubscriptionPlan
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
excluded={'473','431','307','429','119','75'};partial={'76'};split={'478','88','195','556','174','290','299'}
# Proven package->plan contract from existing mapped subscriptions / explicit legacy plan slug.
contract={}
for p in SubscriptionPlan.objects.filter(slug__startswith='legacy-mhamcloud-package-').values('id','slug'):
 try:contract[str(int(p['slug'].rsplit('-',1)[1]))]=p['id']
 except Exception:pass
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions']).values('company_id','source_table','legacy_id','target_object_id').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
# Derive historical package price from approved mapped subscriptions, preferring nonzero modal value.
price_votes=collections.defaultdict(collections.Counter)
for cid,g in byc.items():
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:payload=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 src={str(x.get('id')):x for x in (payload.get('subscriptions') or [])}
 for m in g.get('subscriptions',[]):
  sub=src.get(str(m['legacy_id']))
  if not sub or str(sub.get('status') or '').lower()!='approved':continue
  tid=str(m.get('target_object_id') or '')
  if not tid.isdigit():continue
  cs=CompanySubscription.objects.filter(pk=int(tid),company_id=cid).values('price','total_amount').first()
  if not cs:continue
  val=cs['total_amount'] if cs['total_amount'] is not None else cs['price']
  if val is not None and decimal.Decimal(str(val))>0:price_votes[str(sub.get('package_id'))][str(val)]+=1
price_contract={pkg:v.most_common(1)[0][0] for pkg,v in price_votes.items() if v}
stats=collections.Counter();rows=[]
for cid,g in sorted(byc.items()):
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id'])
 if legacy in excluded or legacy in partial or legacy in split:continue
 cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:payload=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 mapped={str(x['legacy_id']) for x in g.get('subscriptions',[])}
 for sub in (payload.get('subscriptions') or []):
  sid=str(sub.get('id') or '')
  if sid in mapped or str(sub.get('status') or '').lower()!='approved' or not sub.get('start_date') or not sub.get('end_date'):continue
  stats['candidates']+=1
  pkg=str(sub.get('package_id') or '');plan_id=contract.get(pkg);price=price_contract.get(pkg)
  if plan_id:stats['with_plan_contract']+=1
  else:stats['blocked_no_plan_contract']+=1
  if price:stats['with_price_contract']+=1
  else:stats['blocked_no_price_contract']+=1
  dup=CompanySubscription.objects.filter(company_id=cid,start_date=sub.get('start_date'),end_date=sub.get('end_date')).exists()
  if dup:stats['blocked_equivalent_existing']+=1
  safe=bool(plan_id and price and not dup)
  if safe:stats['safe_to_restore']+=1
  rows.append({'company_id':cid,'legacy_company_id':legacy,'legacy_subscription_id':sid,'package_id':pkg,'plan_id':plan_id,'historical_price':price,'start_date':sub.get('start_date'),'end_date':sub.get('end_date'),'paid_via':sub.get('paid_via'),'transaction_reference':sub.get('payment_transaction_id'),'safe_to_restore':safe})
print('PACKAGE_PLAN_CONTRACT='+json.dumps(contract,ensure_ascii=False,sort_keys=True))
print('PACKAGE_PRICE_CONTRACT='+json.dumps(price_contract,ensure_ascii=False,sort_keys=True))
print('STATS='+json.dumps(dict(sorted(stats.items())),ensure_ascii=False))
print('ROWS_BEGIN')
for x in rows:print(json.dumps(x,ensure_ascii=False))
print('ROWS_END')
assert stats['candidates']==166,stats
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C SAFE RESTORE C4 EXACT PLAN V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

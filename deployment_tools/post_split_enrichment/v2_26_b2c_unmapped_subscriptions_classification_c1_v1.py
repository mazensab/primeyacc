from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_unmapped_subscriptions_classification_c1_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C UNMAPPED SUBSCRIPTIONS CLASSIFICATION C1 V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions']).values('company_id','source_table','legacy_id').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
# Approved split/exclusion decision map from project contract.
excluded_legacy={'473','431','307','429','119','75'}
partial={'76':{'keep_branch_legacy':'92'}}
split={'478':[578,579,580,581,582,583,584,585,717,718],'88':[[106,752],[107,751],[108,753],[735,739]],'195':[227,228,229,230,231,232,416],'556':[676,677,678,706,778,779,781],'174':[197,207,208,209,210],'290':[353,354,355,356,357],'299':[367,368,369]}
stats=collections.Counter();rows=[]
for cid,g in sorted(byc.items()):
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:p=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 mapped={str(x['legacy_id']) for x in g.get('subscriptions',[])}
 for sub in (p.get('subscriptions') or []):
  sid=str(sub.get('id') or '')
  if sid in mapped:continue
  status=str(sub.get('status') or '').strip().lower()
  start=sub.get('start_date');end=sub.get('end_date')
  if status=='approved' and start and end: cls='APPROVED_HISTORICAL_CANDIDATE'
  elif status=='declined': cls='DECLINED_ATTEMPT'
  elif status=='waiting': cls='WAITING_ATTEMPT'
  else: cls='OTHER_REVIEW'
  stats[cls]+=1
  risk='NORMAL'
  if legacy in excluded_legacy:risk='EXCLUDED_COMPANY'
  elif legacy in split:risk='SPLIT_COMPANY_REQUIRES_PARTITION'
  elif legacy in partial:risk='PARTIAL_COMPANY_REQUIRES_BRANCH_RULE'
  stats['RISK_'+risk]+=1
  if cls=='APPROVED_HISTORICAL_CANDIDATE' and risk=='NORMAL':stats['SAFE_APPROVED_NORMAL_CANDIDATE']+=1
  rows.append({'current_company_id':cid,'legacy_company_id':legacy,'legacy_subscription_id':sid,'classification':cls,'decision_risk':risk,'start_date':start,'end_date':end,'paid_via':sub.get('paid_via'),'transaction_reference':sub.get('payment_transaction_id'),'created_id':sub.get('created_id')})
print('STATS='+json.dumps(dict(sorted(stats.items())),ensure_ascii=False))
print('ROWS_BEGIN')
for x in rows:print(json.dumps(x,ensure_ascii=False))
print('ROWS_END')
assert len(rows)==272,len(rows)
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C UNMAPPED SUBSCRIPTIONS CLASSIFICATION C1 V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

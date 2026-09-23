from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_created_by_and_unmapped_subscription_audit_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C CREATED-BY + UNMAPPED SUBSCRIPTION AUDIT V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions','users']).values('company_id','source_table','legacy_id','target_object_id','metadata').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
stats=collections.Counter(); creators=collections.Counter(); unmapped=[]
for cid,g in sorted(byc.items()):
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:p=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 srcsubs={str(x.get('id')):x for x in (p.get('subscriptions') or [])}
 mapped={str(x['legacy_id']) for x in g.get('subscriptions',[])}
 # Build every factual user display candidate available in this cache.
 users=p.get('users') or []
 user_by_id={str(u.get('id')):u for u in users if u.get('id') is not None}
 for sid in mapped:
  sub=srcsubs.get(sid)
  if not sub:continue
  created=str(sub.get('created_id') or '')
  if not created:stats['mapped_without_created_id']+=1;continue
  u=user_by_id.get(created)
  if u:
   name=(' '.join(str(u.get(k) or '').strip() for k in ('first_name','last_name')).strip() or str(u.get('username') or '').strip() or str(u.get('email') or '').strip())
   if name:stats['mapped_creator_resolvable_in_company_cache']+=1;creators[created]+=1
   else:stats['mapped_creator_user_without_display']+=1
  else:stats['mapped_creator_not_in_company_cache']+=1
 for sid,sub in srcsubs.items():
  if sid in mapped:continue
  stats['unmapped_subscription_rows']+=1
  unmapped.append({'current_company_id':cid,'legacy_company_id':legacy,'legacy_subscription_id':sid,'start_date':sub.get('start_date'),'end_date':sub.get('end_date'),'status':sub.get('status'),'paid_via':sub.get('paid_via'),'created_id':sub.get('created_id')})
print('STATS='+json.dumps(dict(sorted(stats.items())),ensure_ascii=False))
print('TOP_RESOLVABLE_CREATORS='+json.dumps(creators.most_common(30),ensure_ascii=False))
print('UNMAPPED_BEGIN')
for x in unmapped:print(json.dumps(x,ensure_ascii=False))
print('UNMAPPED_END')
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C CREATED-BY + UNMAPPED SUBSCRIPTION AUDIT V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

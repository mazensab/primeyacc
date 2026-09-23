from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_created_by_safe_apply_b_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C CREATED-BY SAFE APPLY B V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from django.db import transaction
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions']).values('id','company_id','source_table','legacy_id','metadata').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
stats=collections.Counter();details=[]
with transaction.atomic():
 for cid,g in sorted(byc.items()):
  bm=g.get('business',[])
  if not bm:continue
  legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
  if not cache.exists():continue
  try:p=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
  except Exception:continue
  users={str(u.get('id')):u for u in (p.get('users') or []) if u.get('id') is not None}
  subs={str(s.get('id')):s for s in (p.get('subscriptions') or [])}
  for raw in g.get('subscriptions',[]):
   sid=str(raw['legacy_id']);sub=subs.get(sid)
   if not sub:continue
   creator_id=str(sub.get('created_id') or '')
   if not creator_id:stats['no_created_id']+=1;continue
   u=users.get(creator_id)
   if not u:
    stats['unresolved_not_in_company_cache']+=1;continue
   name=(' '.join(str(u.get(k) or '').strip() for k in ('first_name','last_name')).strip() or str(u.get('username') or '').strip() or str(u.get('email') or '').strip())
   if not name:
    stats['unresolved_empty_display']+=1;continue
   m=LegacyObjectMap.objects.select_for_update().get(pk=raw['id'])
   md=dict(m.metadata or {});ls=dict(md.get('legacy_subscription') or {})
   existing=str(ls.get('created_by_name') or '').strip()
   # Never overwrite an already-proven human-readable name (e.g. Company11 mazen).
   if existing and not existing.isdigit():
    stats['preserved_existing_display']+=1;continue
   ls['created_by_name']=name
   ls['created_by_email']=str(u.get('email') or '')
   ls['created_by_name_source']='MHAMCLOUD_COMPANY_CACHE_USER_MATCH'
   md['legacy_subscription']=ls;m.metadata=md;m.save(update_fields=['metadata','updated_at'])
   stats['created_by_names_applied']+=1
   details.append({'company_id':cid,'legacy_subscription_id':sid,'created_id':creator_id,'created_by_name':name})
print('STATS='+json.dumps(dict(sorted(stats.items())),ensure_ascii=False))
print('APPLIED_BEGIN')
for x in details:print(json.dumps(x,ensure_ascii=False))
print('APPLIED_END')
assert stats['created_by_names_applied']<=119,stats
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT");sys.exit(2)
if rc:OUT.write_text(data+"\nRESULT=FAIL\n",encoding="utf8");print(data);print("RESULT=FAIL");sys.exit(rc)
checks=[]
for n,cmd in [("DJANGO_CHECK",[str(R/"venv/Scripts/python.exe"),"manage.py","check"]),("MIGRATION_DRIFT",[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"])]:
 r,o=run(cmd,180);checks.append((n,r,o))
 if r:print(n+"=FAIL");sys.exit(r)
report="===== PRIMEYACC V2-26 B2C CREATED-BY SAFE APPLY B V1 =====\n"+data+"\n"
for n,r,o in checks:report+=f"\n===== {n} =====\n{o}\n{n}=PASS\n"
report+="\nUNRESOLVED_CREATOR_GUESSED=NO\nUNMAPPED_SUBSCRIPTIONS_CREATED=NO\nSPLIT_STRUCTURE_CHANGED=NO\nRESULT=PASS\n"
OUT.write_text(report,encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("UNRESOLVED_CREATOR_GUESSED=NO");print("UNMAPPED_SUBSCRIPTIONS_CREATED=NO");print("SPLIT_STRUCTURE_CHANGED=NO");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")

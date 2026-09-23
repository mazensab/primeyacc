from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_split_partial_c10_restore_apply_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C SPLIT/PARTIAL C10 RESTORE APPLY V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections,decimal,hashlib
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from subscriptions.models import CompanySubscription,SubscriptionPlan
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
targets={'76':34,'88':45,'174':91,'195':99}
expected={'76':['107'],'88':['119','472'],'174':['207','469'],'195':['362','434']}
contract={}
for p in SubscriptionPlan.objects.filter(slug__startswith='legacy-mhamcloud-package-').values('id','slug'):
 try:contract[str(int(p['slug'].rsplit('-',1)[1]))]=p['id']
 except Exception:pass
# Price contract from already migrated approved subscriptions.
price_votes=collections.defaultdict(collections.Counter)
allmaps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','subscriptions']).values('company_id','source_table','legacy_id','target_object_id').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in allmaps:byc[m['company_id']][m['source_table']].append(m)
for cid,g in byc.items():
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():continue
 try:payload=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:continue
 src={str(x.get('id')):x for x in (payload.get('subscriptions') or [])}
 for m in g.get('subscriptions',[]):
  sub=src.get(str(m['legacy_id']));tid=str(m.get('target_object_id') or '')
  if not sub or str(sub.get('status') or '').lower()!='approved' or not tid.isdigit():continue
  cs=CompanySubscription.objects.filter(pk=int(tid),company_id=cid).values('price','total_amount').first()
  if not cs:continue
  val=cs['total_amount'] if cs['total_amount'] is not None else cs['price']
  if val is not None and decimal.Decimal(str(val))>0:price_votes[str(sub.get('package_id'))][str(val)]+=1
prices={k:v.most_common(1)[0][0] for k,v in price_votes.items() if v}
ct=ContentType.objects.get_for_model(CompanySubscription);stats=collections.Counter();rows=[]
with transaction.atomic():
 for legacy,cid in targets.items():
  bmap=LegacyObjectMap.objects.filter(company_id=cid,source_system='mhamcloud_v1',source_table='business',legacy_id=legacy).values('run_id').first()
  if not bmap:raise RuntimeError(f'business map missing legacy={legacy}')
  payload=json.loads((SOURCE_CACHE_DIR/f'company_{legacy}.json').read_text(encoding='utf-8-sig')).get('payload',{})
  src={str(x.get('id')):x for x in (payload.get('subscriptions') or [])}
  users={str(u.get('id')):u for u in (payload.get('users') or []) if u.get('id') is not None}
  for sid in expected[legacy]:
   sub=src.get(sid)
   if not sub or str(sub.get('status') or '').lower()!='approved':raise RuntimeError(f'source guard {legacy}/{sid}')
   if LegacyObjectMap.objects.filter(company_id=cid,source_system='mhamcloud_v1',source_table='subscriptions',legacy_id=sid).exists():raise RuntimeError(f'already mapped {legacy}/{sid}')
   if CompanySubscription.objects.filter(company_id=cid,start_date=sub['start_date'],end_date=sub['end_date']).exists():raise RuntimeError(f'equivalent exists {legacy}/{sid}')
   pkg=str(sub.get('package_id') or '');plan_id=contract.get(pkg);price=prices.get(pkg)
   if not plan_id or not price:raise RuntimeError(f'contract missing {legacy}/{sid}/pkg={pkg}')
   ref=str(sub.get('payment_transaction_id') or '').strip() or f'LEGACY-SUB-{sid}'
   notes=f"Migrated from MhamCloud; legacy_subscription_id={sid}; legacy_package_id={pkg}; legacy_status=approved; paid_via={sub.get('paid_via') or ''}; migration_current=False"
   cs=CompanySubscription.objects.create(company_id=cid,plan_id=plan_id,status='EXPIRED',action='MANUAL',billing_cycle='YEARLY',start_date=sub['start_date'],end_date=sub['end_date'],price=price,discount_amount='0.00',tax_amount='0.00',total_amount=price,auto_renew=False,billing_reference=ref,notes=notes)
   creator_id=str(sub.get('created_id') or '');u=users.get(creator_id);creator_name=''
   if u:creator_name=(' '.join(str(u.get(k) or '').strip() for k in ('first_name','last_name')).strip() or str(u.get('username') or '').strip() or str(u.get('email') or '').strip())
   try:pd=json.loads(sub.get('package_details') or '{}') if isinstance(sub.get('package_details'),str) else (sub.get('package_details') or {})
   except Exception:pd={}
   ls={k:sub.get(k) for k in ('id','package_id','start_date','trial_end_date','end_date','price','status','paid_via','payment_transaction_id','created_id','created_at') if k in sub}
   if isinstance(pd,dict) and pd.get('name'):ls['package_name']=pd.get('name')
   if creator_name:ls.update({'created_by_name':creator_name,'created_by_email':str(u.get('email') or ''),'created_by_name_source':'MHAMCLOUD_COMPANY_CACHE_USER_MATCH'})
   md={'source_identity':{'legacy_company_id':legacy,'legacy_subscription_id':sid},'legacy_package_id':int(pkg) if pkg.isdigit() else pkg,'migration_current':False,'legacy_subscription':ls,'legacy_payment_semantics':{'status':'approved','paid_via':str(sub.get('paid_via') or ''),'created_at':sub.get('created_at'),'created_id':sub.get('created_id'),'source_system':'mhamcloud_v1','transaction_reference':str(sub.get('payment_transaction_id') or '')}}
   checksum=hashlib.sha256(json.dumps(sub,sort_keys=True,ensure_ascii=False,default=str).encode()).hexdigest()
   LegacyObjectMap.objects.create(run_id=bmap['run_id'],source_system='mhamcloud_v1',source_table='subscriptions',legacy_id=sid,legacy_company_id=legacy,company_id=cid,target_content_type=ct,target_object_id=str(cs.id),checksum=checksum,source_reference=f'LEGACY-SUB-{sid}',metadata=md)
   stats['restored']+=1
   if sub.get('payment_transaction_id'):stats['transaction_refs_preserved']+=1
   if creator_name:stats['creator_names_resolved']+=1
   rows.append({'legacy_company_id':legacy,'legacy_subscription_id':sid,'company_id':cid,'subscription_id':cs.id,'plan_id':plan_id,'price':price})
 assert stats['restored']==7,stats
print('STATS='+json.dumps(dict(stats),ensure_ascii=False))
print('RESTORED_BEGIN')
for x in rows:print(json.dumps(x,ensure_ascii=False))
print('RESTORED_END')
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT");sys.exit(2)
if rc:OUT.write_text("===== C10 APPLY FAILED =====\n"+data+"\nRESULT=FAIL\n",encoding="utf8");print(data);print("RESULT=FAIL");sys.exit(rc)
checks=[]
for n,cmd in [("DJANGO_CHECK",[str(R/"venv/Scripts/python.exe"),"manage.py","check"]),("MIGRATION_DRIFT",[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"])]:
 r,o=run(cmd,180);checks.append((n,r,o))
 if r:print(n+"=FAIL");sys.exit(r)
report="===== PRIMEYACC V2-26 B2C SPLIT/PARTIAL C10 RESTORE APPLY V1 =====\n"+data+"\n"
for n,r,o in checks:report+=f"\n===== {n} =====\n{o}\n{n}=PASS\n"
report+="\nRESTORED_ORIGINAL_ONLY=7\nSPLIT_CLONES_CREATED=0\nDECLINED_RESTORED=0\nWAITING_RESTORED=0\nRESULT=PASS\n"
OUT.write_text(report,encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("RESTORED_ORIGINAL_ONLY=7");print("SPLIT_CLONES_CREATED=0");print("DECLINED_RESTORED=0");print("WAITING_RESTORED=0");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")

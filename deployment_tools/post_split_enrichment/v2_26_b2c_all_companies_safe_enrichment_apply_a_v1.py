from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_all_companies_safe_enrichment_apply_a_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C ALL COMPANIES SAFE ENRICHMENT APPLY A V1 =====",flush=True)
if not PAGE.exists() or sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail V4 baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from django.db import transaction
from companies.models import Company
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','business_locations','subscriptions']).values('id','company_id','source_table','legacy_id','metadata').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
stats=collections.Counter();details=[]
with transaction.atomic():
 for c in Company.objects.select_for_update().order_by('id'):
  g=byc.get(c.id,{})
  bm=g.get('business',[])
  if not bm:stats['skipped_no_legacy_business_map']+=1;continue
  legacy=str(bm[0]['legacy_id']);cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
  if not cache.exists():stats['skipped_cache_missing']+=1;continue
  try:payload=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
  except Exception:stats['skipped_cache_error']+=1;continue
  loc1=next((x for x in (payload.get('branches') or []) if str(x.get('location_id') or '').strip().upper()=='BL0001'),None)
  if not loc1:
   stats['skipped_no_bl0001']+=1;details.append({'company_id':c.id,'legacy':legacy,'result':'SKIP_NO_BL0001'});continue
  changed=[]
  for field,keys in {'phone':['mobile','phone'],'email':['email'],'city':['city'],'region':['state','region'],'country':['country'],'postal_code':['zip_code','postal_code'],'address':['landmark','address']}.items():
   if not hasattr(c,field) or str(getattr(c,field) or '').strip():continue
   val=next((str(loc1.get(k) or '').strip() for k in keys if str(loc1.get(k) or '').strip()),'')
   if val:setattr(c,field,val);changed.append(field);stats['company_fields_filled']+=1
  if changed:
   c.full_clean();c.save();stats['companies_updated']+=1
  srcsubs={str(x.get('id')):x for x in (payload.get('subscriptions') or [])};enriched=0
  for raw in g.get('subscriptions',[]):
   sid=str(raw['legacy_id']);sub=srcsubs.get(sid)
   if not sub:stats['mapped_subscription_missing_source']+=1;continue
   m=LegacyObjectMap.objects.select_for_update().get(pk=raw['id']);md=dict(m.metadata or {});before=json.dumps(md,sort_keys=True,ensure_ascii=False,default=str)
   ls=dict(md.get('legacy_subscription') or {})
   for key in ('id','package_id','start_date','trial_end_date','end_date','price','status','paid_via','payment_transaction_id','created_id','created_at'):
    if key in sub:ls[key]=sub.get(key)
   try:pd=json.loads(sub.get('package_details') or '{}') if isinstance(sub.get('package_details'),str) else (sub.get('package_details') or {})
   except Exception:pd={}
   if isinstance(pd,dict) and pd.get('name'):ls['package_name']=pd.get('name')
   md['legacy_subscription']=ls
   md['legacy_payment_semantics']={'paid_via':str(sub.get('paid_via') or ''),'transaction_reference':str(sub.get('payment_transaction_id') or ''),'status':str(sub.get('status') or ''),'created_id':sub.get('created_id'),'created_at':sub.get('created_at'),'source_system':'mhamcloud_v1'}
   md['source_identity']={'legacy_company_id':legacy,'legacy_subscription_id':sid}
   after=json.dumps(md,sort_keys=True,ensure_ascii=False,default=str)
   if after!=before:m.metadata=md;m.save(update_fields=['metadata','updated_at']);enriched+=1;stats['subscription_maps_updated']+=1
   else:stats['subscription_maps_unchanged']+=1
   if sub.get('payment_transaction_id'):stats['subscription_refs_preserved']+=1
   if sub.get('created_id'):stats['subscription_created_ids_preserved']+=1
  stats['companies_processed']+=1
  details.append({'company_id':c.id,'legacy':legacy,'company_fields_filled':changed,'subscription_maps':len(g.get('subscriptions',[])),'subscription_maps_updated':enriched})
print('STATS='+json.dumps(dict(sorted(stats.items())),ensure_ascii=False))
print('DETAILS_BEGIN')
for x in details:print(json.dumps(x,ensure_ascii=False))
print('DETAILS_END')
assert stats['skipped_no_bl0001']==1,stats
assert stats['companies_processed']==311,stats
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT");sys.exit(2)
if rc:
 OUT.write_text("===== APPLY FAILED =====\n"+data+"\nRESULT=FAIL\n",encoding="utf8");print(data);print("RESULT=FAIL");sys.exit(rc)
checks=[]
for name,cmd in [("DJANGO_CHECK",[str(R/"venv/Scripts/python.exe"),"manage.py","check"]),("MIGRATION_DRIFT",[str(R/"venv/Scripts/python.exe"),"manage.py","makemigrations","--check","--dry-run"])]:
 rc2,o=run(cmd,180);checks.append((name,rc2,o))
 if rc2:OUT.write_text(data+"\n"+name+"=FAIL\n"+o+"\nRESULT=FAIL_AFTER_APPLY\n",encoding="utf8");print(name+"=FAIL");sys.exit(rc2)
report="===== PRIMEYACC V2-26 B2C ALL COMPANIES SAFE ENRICHMENT APPLY A V1 =====\n"+data+"\n"
for n,rc2,o in checks:report+=f"\n===== {n} =====\n{o}\n{n}=PASS\n"
report+="\nCR_VAT_FABRICATED=NO\nUNMAPPED_SUBSCRIPTIONS_CREATED=NO\nSPLIT_STRUCTURE_CHANGED=NO\nEXISTING_COMPANY_VALUES_OVERWRITTEN=NO\nRESULT=PASS\n"
OUT.write_text(report,encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("CR_VAT_FABRICATED=NO");print("UNMAPPED_SUBSCRIPTIONS_CREATED=NO");print("SPLIT_STRUCTURE_CHANGED=NO");print("EXISTING_COMPANY_VALUES_OVERWRITTEN=NO");print("DJANGO_CHECK=PASS");print("MIGRATION_DRIFT=PASS");print("RESULT=PASS")

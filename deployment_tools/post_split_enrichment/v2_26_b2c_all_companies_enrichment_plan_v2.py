from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_all_companies_enrichment_plan_v2.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=180):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C ALL COMPANIES EXACT PLAN V2 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail V4 baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Company,Branch
from subscriptions.models import CompanySubscription
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','business_locations','subscriptions','users']).values('company_id','source_table','legacy_id','target_object_id','metadata').iterator(chunk_size=2000))
byc=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:byc[m['company_id']][m['source_table']].append(m)
cnt=collections.Counter(); rows=[]
for c in Company.objects.order_by('id'):
 g=byc.get(c.id,{})
 bm=g.get('business',[])
 if not bm:continue
 legacy=str(bm[0]['legacy_id']); cache=SOURCE_CACHE_DIR/f'company_{legacy}.json'
 if not cache.exists():cnt['blocked_cache_missing']+=1;continue
 try:p=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception:cnt['blocked_cache_error']+=1;continue
 branches=p.get('branches') or []; loc1=next((x for x in branches if str(x.get('location_id') or '').upper()=='BL0001'),None)
 if not loc1:cnt['blocked_no_bl0001']+=1;rows.append({'company_id':c.id,'legacy':legacy,'action':'BLOCK_NO_BL0001'});continue
 # IMPORTANT: cache does not carry legal CR/VAT for most companies. Never fabricate.
 cr=loc1.get('commercial_registration') or loc1.get('business_registration') or loc1.get('cr_number')
 tax=loc1.get('tax_number') or loc1.get('tax_no') or loc1.get('vat_number')
 if cr and not c.commercial_registration:cnt['fillable_cr']+=1
 if tax and not c.tax_number:cnt['fillable_tax']+=1
 # Contact/address fields proven in BL0001.
 fill={}
 for cf,keys in {
  'phone':['mobile','phone'],'email':['email'],'city':['city'],'region':['state','region'],
  'country':['country'],'postal_code':['zip_code','postal_code'],'address':['landmark','address']
 }.items():
  if str(getattr(c,cf,'') or '').strip():continue
  val=next((str(loc1.get(k) or '').strip() for k in keys if str(loc1.get(k) or '').strip()),'')
  if val:fill[cf]=val
 if fill:cnt['companies_contact_address_fillable']+=1
 # Only enrich subscription rows already mapped into this current company. This preserves post-split partition.
 srcsubs={str(x.get('id')):x for x in (p.get('subscriptions') or [])}
 mapped=g.get('subscriptions',[])
 valid=[]
 for m in mapped:
  sid=str(m['legacy_id']); sub=srcsubs.get(sid)
  if not sub:cnt['mapped_subscription_missing_source']+=1;continue
  valid.append((m,sub));cnt['subscription_metadata_enrichable']+=1
  if sub.get('payment_transaction_id'):cnt['subscription_refs']+=1
  if sub.get('created_id'):cnt['subscription_created_ids']+=1
 cnt['companies_safe_for_apply']+=1
 rows.append({'company_id':c.id,'legacy':legacy,'bl0001_id':loc1.get('id'),'company_fill_fields':sorted(fill),'cr_from_cache':bool(cr),'tax_from_cache':bool(tax),'mapped_subscription_rows':len(valid),'source_subscription_rows':len(srcsubs),'unmapped_source_subscriptions':max(0,len(srcsubs)-len(valid))})
print('COUNTS='+json.dumps(dict(sorted(cnt.items())),ensure_ascii=False))
print('PLAN_ROWS_BEGIN')
for r in rows:print(json.dumps(r,ensure_ascii=False))
print('PLAN_ROWS_END')
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],180)
except subprocess.TimeoutExpired:
 print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C ALL COMPANIES EXACT PLAN V2 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)

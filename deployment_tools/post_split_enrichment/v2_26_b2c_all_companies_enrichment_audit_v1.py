from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_all_companies_enrichment_audit_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=180):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C ALL COMPANIES ENRICHMENT AUDIT V1 =====",flush=True)
if not PAGE.exists() or sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail V4 baseline mismatch")
print("GUARDS=PASS",flush=True)
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Company,Branch
from subscriptions.models import CompanySubscription
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR

companies=list(Company.objects.order_by('id').values('id','company_code','name','commercial_registration','tax_number','owner_id','phone','city','address'))
company_by_id={x['id']:x for x in companies}
# Query only relevant map rows; do not materialize the multi-million-row map table.
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1',source_table__in=['business','business_locations','subscriptions','users']).values('company_id','source_table','legacy_id','legacy_company_id','target_object_id','metadata').iterator(chunk_size=2000))
by_company=collections.defaultdict(lambda:collections.defaultdict(list))
for m in maps:by_company[m['company_id']][m['source_table']].append(m)

stats=collections.Counter(); payment=collections.Counter(); findings=[]
for c in companies:
 cid=c['id']; group=by_company.get(cid,{})
 business=group.get('business',[])
 if not business:
  stats['companies_without_legacy_business_map']+=1
  continue
 stats['mapped_companies']+=1
 # Resolve source legacy company deterministically from business map.
 legacy_company=str(business[0]['legacy_id'])
 cache=SOURCE_CACHE_DIR/f'company_{legacy_company}.json'
 if not cache.exists():
  stats['cache_missing']+=1;findings.append({'company_id':cid,'legacy_company_id':legacy_company,'issue':'CACHE_MISSING'});continue
 try: payload=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
 except Exception as e:
  stats['cache_error']+=1;findings.append({'company_id':cid,'legacy_company_id':legacy_company,'issue':'CACHE_ERROR','error':type(e).__name__});continue
 branches=payload.get('branches') or []
 # Location1 contract: BL0001 first; fallback only reported, never applied.
 loc1=next((b for b in branches if str(b.get('location_id') or '').strip().upper()=='BL0001'),None)
 if loc1:stats['location1_found']+=1
 else:stats['location1_missing']+=1
 cr=(loc1 or {}).get('commercial_registration') or (loc1 or {}).get('business_registration') or (loc1 or {}).get('cr_number')
 tax=(loc1 or {}).get('tax_number') or (loc1 or {}).get('tax_no') or (loc1 or {}).get('vat_number')
 if cr:stats['location1_cr_in_cache']+=1
 if tax:stats['location1_tax_in_cache']+=1
 if not str(c.get('commercial_registration') or '').strip() and cr:stats['company_cr_fillable_from_cache']+=1
 if not str(c.get('tax_number') or '').strip() and tax:stats['company_tax_fillable_from_cache']+=1
 # Existing UI-verified provenance may carry legal identity even when cache omits fields.
 locmaps=group.get('business_locations',[])
 verified=[]
 for m in locmaps:
  v=(m.get('metadata') or {}).get('legal_identity_ui_verified')
  if isinstance(v,dict) and (v.get('commercial_registration') or v.get('tax_number')):verified.append(v)
 if verified:stats['companies_with_ui_verified_legal_identity']+=1

 srcsubs=payload.get('subscriptions') or []
 stats['legacy_subscription_rows']+=len(srcsubs)
 dbsubs=CompanySubscription.objects.filter(company_id=cid).count()
 stats['primey_subscription_rows']+=dbsubs
 submaps=group.get('subscriptions',[])
 mapped_legacy_ids={str(m['legacy_id']) for m in submaps}
 for sub in srcsubs:
  sid=str(sub.get('id') or '')
  if sid in mapped_legacy_ids:stats['legacy_subscriptions_mapped']+=1
  else:stats['legacy_subscriptions_unmapped']+=1
  via=str(sub.get('paid_via') or '').strip().lower() or 'missing'
  payment[via]+=1
  if sub.get('payment_transaction_id'):stats['subscriptions_with_transaction_reference']+=1
  if sub.get('created_id'):stats['subscriptions_with_created_id']+=1
 # Split safety: count companies whose source legacy company is shared by >1 current company.
 findings.append({'company_id':cid,'legacy_company_id':legacy_company,'company_code':c['company_code'],'location1':(loc1 or {}).get('id'),'location_code':(loc1 or {}).get('location_id'),'legacy_subscriptions':len(srcsubs),'primey_subscriptions':dbsubs,'subscription_maps':len(submaps),'cr_present':bool(c.get('commercial_registration')),'tax_present':bool(c.get('tax_number'))})

legacy_to_current=collections.defaultdict(list)
for row in findings:
 if row.get('legacy_company_id'):legacy_to_current[row['legacy_company_id']].append(row.get('company_id'))
shared={k:v for k,v in legacy_to_current.items() if len(v)>1}
stats['legacy_companies_shared_by_split_current_companies']=len(shared)
stats['current_companies_in_shared_split_groups']=sum(len(v) for v in shared.values())

print('TOTAL_CURRENT_COMPANIES='+str(len(companies)))
for k in sorted(stats):print(k.upper()+'='+str(stats[k]))
print('PAYMENT_CHANNELS='+json.dumps(dict(sorted(payment.items())),ensure_ascii=False))
print('SHARED_SPLIT_GROUPS='+json.dumps(shared,ensure_ascii=False))
print('FINDINGS_BEGIN')
for row in findings:print(json.dumps(row,ensure_ascii=False,default=str))
print('FINDINGS_END')
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],180)
except subprocess.TimeoutExpired:
 print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO",flush=True);sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C ALL COMPANIES ENRICHMENT AUDIT V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}",flush=True);print(f"SIZE={OUT.stat().st_size}",flush=True);print(f"SHA256={sha(OUT)}",flush=True);print("MUTATION_PERFORMED=NO",flush=True);print("RESULT="+("PASS" if rc==0 else "FAIL"),flush=True)
if rc:sys.exit(rc)

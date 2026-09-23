from pathlib import Path
import subprocess,sys,hashlib,json
R=Path.cwd();OUT=R/"v2_26_b2c_postsplit_enrichment_exact_plan_v3.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=120):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return p.returncode,p.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C POST-SPLIT PLAN V3 BATCHED =====",flush=True)
if not PAGE.exists() or sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: B2B page mismatch")
print("GUARDS=PASS",flush=True)
probe=r"""
import os,json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Company
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
print('PHASE=LOAD_MAPS',flush=True)
maps=list(LegacyObjectMap.objects.filter(source_system='mhamcloud_v1').values('company_id','source_table','legacy_id','legacy_company_id'))
print('MAPS='+str(len(maps)),flush=True)
by={}
for m in maps:
 if m['company_id'] is not None:by.setdefault(m['company_id'],[]).append(m)
ids=sorted(by)
print('COMPANY_IDS='+str(len(ids)),flush=True)
print('PHASE=LOAD_COMPANIES',flush=True)
companies={c.id:c for c in Company.objects.filter(id__in=ids).only('id','company_code','name','commercial_registration','tax_number','phone','mobile','city','address','national_address_line')}
print('COMPANIES='+str(len(companies)),flush=True)
print('PHASE=LOAD_CACHES',flush=True)
legacy_ids=sorted({str(m['legacy_company_id'] or '') for m in maps if m['legacy_company_id']})
caches={}
for n,lid in enumerate(legacy_ids,1):
 path=SOURCE_CACHE_DIR/f'company_{lid}.json';src={}
 if path.exists():
  try:src=json.loads(path.read_text(encoding='utf-8-sig')).get('payload',{})
  except Exception:src={}
 caches[lid]=src
 if n%50==0:print('CACHE_PROGRESS='+str(n),flush=True)
print('CACHES='+str(len(caches)),flush=True)
print('PHASE=BUILD_RECORDS',flush=True)
for n,cid in enumerate(ids,1):
 c=companies.get(cid)
 if not c:continue
 mm=by[cid]
 business=next((m for m in mm if m['source_table']=='business'),None)
 bm=[m for m in mm if m['source_table'] in ('business_locations','branches','locations')]
 lc=str((business['legacy_company_id'] if business else (bm[0]['legacy_company_id'] if bm else '')) or '')
 src=caches.get(lc,{})
 sb=src.get('branches',[]) if isinstance(src.get('branches'),list) else []
 ss=src.get('subscriptions',[]) if isinstance(src.get('subscriptions'),list) else []
 branch_ids={str(m['legacy_id']) for m in bm}
 matched=[b for b in sb if str(b.get('id')) in branch_ids]
 bl1=next((b for b in sb if str(b.get('location_id') or '').upper()=='BL0001'),None)
 rec={'company_id':c.id,'company_code':c.company_code,'company_name':c.name,'legacy_company_id':lc,'legacy_branch_ids':sorted(branch_ids),'matched_source_branches':[{'id':b.get('id'),'location_id':b.get('location_id'),'name':b.get('name')} for b in matched],'bl1':{'id':bl1.get('id'),'name':bl1.get('name')} if bl1 else None,'missing':{'cr':not bool(c.commercial_registration),'tax':not bool(c.tax_number),'phone':not bool(c.phone or c.mobile),'city':not bool(c.city),'address':not bool(c.address or c.national_address_line)},'legacy_subscriptions':[{'id':s.get('id'),'package_id':s.get('package_id'),'paid_via':s.get('paid_via'),'payment_transaction_id':s.get('payment_transaction_id'),'status':s.get('status')} for s in ss]}
 print('REC='+json.dumps(rec,ensure_ascii=False),flush=True)
 if n%50==0:print('BUILD_PROGRESS='+str(n),flush=True)
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],120)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO",flush=True);sys.exit(2)
if rc:print(data,flush=True);sys.exit("PROBE FAILED")
records=[json.loads(x[4:]) for x in data.splitlines() if x.startswith("REC=")]
single=sum(len(x["legacy_branch_ids"])==1 for x in records);multi=sum(len(x["legacy_branch_ids"])>1 for x in records)
nomap=sum(not x["legacy_branch_ids"] for x in records);amb=sum(bool(x["legacy_branch_ids"]) and not x["matched_source_branches"] for x in records)
bl1owned=sum(bool(x["bl1"]) and str(x["bl1"]["id"]) in set(x["legacy_branch_ids"]) for x in records)
out=["===== PRIMEYACC V2-26 B2C POST-SPLIT ENRICHMENT EXACT PLAN V3 =====",f"COMPANIES={len(records)}",f"SINGLE_BRANCH_MAPPED={single}",f"MULTI_BRANCH_MAPPED={multi}",f"NO_BRANCH_MAP={nomap}",f"BRANCH_MAP_NOT_IN_CACHE={amb}",f"BL0001_OWNED_BY_CURRENT_COMPANY={bl1owned}","MUTATION_PERFORMED=NO","RULES=Preserve split; enrich only proven mapped company/branch; existing Primey values win; offline stays offline/manual; no fabricated payments/docs.","===== RECORDS ====="]+[json.dumps(x,ensure_ascii=False) for x in records]
OUT.write_text("\n".join(out)+"\n",encoding="utf8")
print(f"REPORT={OUT.name}",flush=True);print(f"SIZE={OUT.stat().st_size}",flush=True);print(f"SHA256={sha(OUT)}",flush=True)
print(f"COMPANIES={len(records)}",flush=True);print(f"SINGLE_BRANCH_MAPPED={single}",flush=True);print(f"MULTI_BRANCH_MAPPED={multi}",flush=True);print(f"NO_BRANCH_MAP={nomap}",flush=True);print(f"BRANCH_MAP_NOT_IN_CACHE={amb}",flush=True);print(f"BL0001_OWNED_BY_CURRENT_COMPANY={bl1owned}",flush=True);print("MUTATION_PERFORMED=NO",flush=True);print("RESULT=PASS",flush=True)

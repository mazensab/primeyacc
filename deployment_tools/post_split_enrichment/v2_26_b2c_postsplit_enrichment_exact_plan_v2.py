from pathlib import Path
import subprocess,sys,hashlib,json,time
R=Path.cwd();OUT=R/"v2_26_b2c_postsplit_enrichment_exact_plan_v2.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=90):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return p.returncode,p.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C POST-SPLIT PLAN V2 =====",flush=True)
print("STEP=GUARDS",flush=True)
if not PAGE.exists() or sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: B2B page mismatch")
print("GUARDS=PASS",flush=True)
probe=r"""
import os,json
from pathlib import Path
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Company
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
qs=Company.objects.filter(legacy_object_maps__source_system='mhamcloud_v1').distinct().order_by('id')
print('COUNT='+str(qs.count()),flush=True)
for i,c in enumerate(qs.iterator(chunk_size=50),1):
 maps=list(LegacyObjectMap.objects.filter(company=c,source_system='mhamcloud_v1').only('source_table','legacy_id','legacy_company_id','metadata').order_by('id'))
 business=next((m for m in maps if m.source_table=='business'),None)
 bm=[m for m in maps if m.source_table in ('business_locations','branches','locations')]
 lc=str((business.legacy_company_id if business else (bm[0].legacy_company_id if bm else '')) or '')
 ids={str(m.legacy_id) for m in bm}
 cache=SOURCE_CACHE_DIR/f'company_{lc}.json'; src={}
 if cache.exists():
  try:src=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
  except Exception:src={}
 sb=src.get('branches',[]) if isinstance(src.get('branches'),list) else []
 ss=src.get('subscriptions',[]) if isinstance(src.get('subscriptions'),list) else []
 matched=[b for b in sb if str(b.get('id')) in ids]
 bl1=next((b for b in sb if str(b.get('location_id') or '').upper()=='BL0001'),None)
 rec={'company_id':c.id,'company_code':c.company_code,'legacy_company_id':lc,'legacy_branch_ids':sorted(ids),'matched':[{'id':b.get('id'),'location_id':b.get('location_id')} for b in matched],'bl1_id':bl1.get('id') if bl1 else None,'missing':{'cr':not bool(c.commercial_registration),'tax':not bool(c.tax_number),'phone':not bool(c.phone or c.mobile),'city':not bool(c.city),'address':not bool(c.address or c.national_address_line)},'subscriptions':[{'id':s.get('id'),'paid_via':s.get('paid_via'),'payment_transaction_id':s.get('payment_transaction_id')} for s in ss]}
 print('REC='+json.dumps(rec,ensure_ascii=False),flush=True)
 if i%25==0:print('PROGRESS='+str(i),flush=True)
"""
print("STEP=DATABASE_PROBE",flush=True)
try:
 rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],90)
except subprocess.TimeoutExpired:
 print("RESULT=TIMEOUT",flush=True);print("No mutation was performed.",flush=True);sys.exit(2)
if rc:
 print(data,flush=True);sys.exit("PROBE FAILED")
records=[json.loads(x[4:]) for x in data.splitlines() if x.startswith("REC=")]
single=sum(len(x["legacy_branch_ids"])==1 for x in records);multi=sum(len(x["legacy_branch_ids"])>1 for x in records)
nomap=sum(not x["legacy_branch_ids"] for x in records);amb=sum(bool(x["legacy_branch_ids"]) and not x["matched"] for x in records)
out=["===== PRIMEYACC V2-26 B2C POST-SPLIT ENRICHMENT EXACT PLAN V2 =====",f"COMPANIES={len(records)}",f"SINGLE_BRANCH_MAPPED={single}",f"MULTI_BRANCH_MAPPED={multi}",f"NO_BRANCH_MAP={nomap}",f"BRANCH_MAP_NOT_IN_CACHE={amb}","MUTATION_PERFORMED=NO","RULE=Preserve current split; enrich only by proven current-company legacy branch maps; BL0001 only for its owning mapped company; never infer offline=CASH.","===== RECORDS ====="]+[json.dumps(x,ensure_ascii=False) for x in records]
OUT.write_text("\n".join(out)+"\n",encoding="utf8")
print(f"REPORT={OUT.name}",flush=True);print(f"SIZE={OUT.stat().st_size}",flush=True);print(f"SHA256={sha(OUT)}",flush=True)
print(f"COMPANIES={len(records)}",flush=True);print(f"SINGLE_BRANCH_MAPPED={single}",flush=True);print(f"MULTI_BRANCH_MAPPED={multi}",flush=True);print(f"NO_BRANCH_MAP={nomap}",flush=True);print(f"BRANCH_MAP_NOT_IN_CACHE={amb}",flush=True);print("MUTATION_PERFORMED=NO",flush=True);print("RESULT=PASS",flush=True)

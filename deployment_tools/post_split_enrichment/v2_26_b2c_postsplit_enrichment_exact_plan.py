from pathlib import Path
import subprocess, sys, hashlib
R=Path.cwd()
OUT=R/"v2_26_b2c_postsplit_enrichment_exact_plan.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx"
EXPECTED="5B8A94F0BF5316CF0695A4C8A508D437B9A329DC940165F2582A9DECFC8ED770"
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 p=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t)
 return p.returncode,p.stdout.rstrip()
if not PAGE.exists() or sha(PAGE)!=EXPECTED: sys.exit("SAFETY STOP: B2B page mismatch")
probe = """import os,json
from pathlib import Path
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from companies.models import Company
from business_controls.models import LegacyObjectMap
from integrations.mham_legacy.sync_engine import SOURCE_CACHE_DIR
for c in Company.objects.order_by('id'):
 maps=list(LegacyObjectMap.objects.filter(company=c,source_system='mhamcloud_v1').order_by('source_table','legacy_id','id'))
 business=next((m for m in maps if m.source_table=='business'),None)
 branch_maps=[m for m in maps if m.source_table in ('business_locations','branches','locations')]
 if not business and not branch_maps: continue
 legacy_company=str((business.legacy_company_id if business else branch_maps[0].legacy_company_id) or '')
 cache=SOURCE_CACHE_DIR/f'company_{legacy_company}.json'
 src={}
 if cache.exists():
  try: src=json.loads(cache.read_text(encoding='utf-8-sig')).get('payload',{})
  except Exception: src={}
 source_branches=src.get('branches',[]) if isinstance(src.get('branches'),list) else []
 source_subs=src.get('subscriptions',[]) if isinstance(src.get('subscriptions'),list) else []
 ids={str(m.legacy_id) for m in branch_maps}
 matched=[b for b in source_branches if str(b.get('id')) in ids]
 bl1=next((b for b in source_branches if str(b.get('location_id') or '').upper()=='BL0001'),None)
 print(json.dumps({'company_id':c.id,'company_code':c.company_code,'company_name':c.name,'legacy_company_id':legacy_company,'legacy_branch_ids':sorted(ids),'matched_source_branches':[{'id':b.get('id'),'location_id':b.get('location_id'),'name':b.get('name')} for b in matched],'bl1':{'id':bl1.get('id'),'name':bl1.get('name')} if bl1 else None,'company_missing':{'cr':not bool(c.commercial_registration),'tax':not bool(c.tax_number),'phone':not bool(c.phone or c.mobile),'city':not bool(c.city),'address':not bool(c.address or c.national_address_line)},'legacy_subscriptions':[{'id':s.get('id'),'package_id':s.get('package_id'),'paid_via':s.get('paid_via'),'payment_transaction_id':s.get('payment_transaction_id'),'status':s.get('status')} for s in source_subs]},ensure_ascii=False))
"""
rc,data=run([str(R/"venv/Scripts/python.exe"),"-c",probe])
if rc: sys.exit("PROBE FAILED\n"+data)
import json
records=[json.loads(x) for x in data.splitlines() if x.strip().startswith("{")]
single=[x for x in records if len(x["legacy_branch_ids"])==1]
multi=[x for x in records if len(x["legacy_branch_ids"])>1]
nomap=[x for x in records if not x["legacy_branch_ids"]]
amb=[x for x in records if x["legacy_branch_ids"] and not x["matched_source_branches"]]
out=["===== PRIMEYACC V2-26 B2C POST-SPLIT ENRICHMENT EXACT PLAN =====",f"COMPANIES_WITH_LEGACY_CONTEXT={len(records)}",f"SINGLE_BRANCH_MAPPED={len(single)}",f"MULTI_BRANCH_MAPPED={len(multi)}",f"NO_BRANCH_MAP={len(nomap)}",f"BRANCH_MAP_NOT_IN_CACHE={len(amb)}","MUTATION_PERFORMED=NO","","RULES:","1) Local DB is already split. No sync_engine, no Company/Branch recreation, no split changes.","2) Company legal fallback uses BL0001 only when the current company still owns/maps that legacy BL0001 branch.","3) A split company mapped to another legacy branch uses that branch for contact/address fallback, never steals BL0001 identity.","4) Existing non-empty Primey fields are never overwritten.","5) Legacy subscription/payment facts remain historical provenance; offline is never converted to CASH.","6) No PlatformSubscriptionPayment/Invoice/Receipt is fabricated from legacy data.","","===== RECORDS ====="]
out += [json.dumps(x,ensure_ascii=False) for x in records]
OUT.write_text("\n".join(out)+"\n",encoding="utf8")
print("===== PRIMEYACC V2-26 B2C POST-SPLIT ENRICHMENT EXACT PLAN =====")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}")
print(f"COMPANIES_WITH_LEGACY_CONTEXT={len(records)}");print(f"SINGLE_BRANCH_MAPPED={len(single)}");print(f"MULTI_BRANCH_MAPPED={len(multi)}");print(f"NO_BRANCH_MAP={len(nomap)}");print(f"BRANCH_MAP_NOT_IN_CACHE={len(amb)}");print("MUTATION_PERFORMED=NO");print("RESULT=PASS")

from pathlib import Path
import subprocess,sys,hashlib
R=Path.cwd();OUT=R/"v2_26_b2c_split_partial_c8_exact_topology_audit_v1.txt"
PAGE=R/"primey_frontend_v2/app/system/companies/[id]/page.tsx";EXPECTED="29E76FC04A0512E8D62CAE9711B95C51E95909EE2C1227DC8E6887528FFB94F7"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def run(a,t=300):
 q=subprocess.run(a,cwd=R,text=True,encoding="utf8",errors="replace",stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=t);return q.returncode,q.stdout.rstrip()
print("===== PRIMEYACC V2-26 B2C SPLIT/PARTIAL C8 EXACT TOPOLOGY AUDIT V1 =====",flush=True)
if sha(PAGE)!=EXPECTED:sys.exit("SAFETY STOP: Company Detail baseline mismatch")
probe=r"""
import os,json,collections
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django;django.setup()
from companies.models import Company,Branch
from subscriptions.models import CompanySubscription
from business_controls.models import LegacyObjectMap
targets={'76':[92],'88':[106,752,107,751,108,753,735,739],'174':[197,207,208,209,210],'195':[227,228,229,230,231,232,416]}
all_branches={str(x) for v in targets.values() for x in v}
# Locate current companies by actual retained branch codes, independent of business-map assumptions.
rows=[];stats=collections.Counter()
for legacy,branch_ids in targets.items():
 found=[]
 for bid in branch_ids:
  qs=Branch.objects.filter(branch_code=f'LEGACY-BR-{bid}').select_related('company').values('id','branch_code','name','is_default','is_active','company_id','company__name','company__company_code')
  for x in qs:found.append({'legacy_branch_id':bid,**x})
 # Existing subscription lineage on every current company touched by these branch groups.
 company_ids=sorted({x['company_id'] for x in found})
 subs=[]
 for cid in company_ids:
  for s in CompanySubscription.objects.filter(company_id=cid).order_by('start_date','id').values('id','plan_id','start_date','end_date','status','action','billing_reference','previous_subscription_id','notes'):
   subs.append({'company_id':cid,**s})
 # Business/subscription/location maps for these companies.
 maps=list(LegacyObjectMap.objects.filter(company_id__in=company_ids,source_system='mhamcloud_v1',source_table__in=['business','business_locations','subscriptions']).values('company_id','source_table','legacy_id','legacy_company_id','target_object_id','metadata'))
 rows.append({'legacy_company_id':legacy,'decision_branch_ids':branch_ids,'current_branch_topology':found,'current_company_ids':company_ids,'existing_subscriptions':subs,'relevant_maps':maps})
 stats['legacy_groups']+=1;stats['current_companies_found']+=len(company_ids);stats['branches_found']+=len(found)
print('STATS='+json.dumps(dict(stats),ensure_ascii=False))
print('GROUPS_BEGIN')
for x in rows:print(json.dumps(x,ensure_ascii=False,default=str))
print('GROUPS_END')
"""
try:rc,data=run([str(R/"venv/Scripts/python.exe"),"-u","-c",probe],300)
except subprocess.TimeoutExpired:print("RESULT=TIMEOUT\nMUTATION_PERFORMED=NO");sys.exit(2)
OUT.write_text("===== PRIMEYACC V2-26 B2C SPLIT/PARTIAL C8 EXACT TOPOLOGY AUDIT V1 =====\n"+data+"\nMUTATION_PERFORMED=NO\nRESULT="+("PASS" if rc==0 else "FAIL")+"\n",encoding="utf8")
print(f"REPORT={OUT.name}");print(f"SIZE={OUT.stat().st_size}");print(f"SHA256={sha(OUT)}");print("MUTATION_PERFORMED=NO");print("RESULT="+("PASS" if rc==0 else "FAIL"))
if rc:sys.exit(rc)
